/**
 * Web Worker yang menjalankan SQLite WASM resmi (ADR-02). Sandbox berlapis
 * sesuai docs/02-arsitektur.md §5.2-§5.3: DB `READONLY` di memori, authorizer
 * whitelist, `progress_handler` untuk batas waktu, dan `sqlite3_limit` untuk
 * batas ukuran. Diakses dari main thread lewat Comlink
 * (src/infra/sql/engine-client.ts).
 *
 * Header COOP/COEP TIDAK diperlukan: DB dimuat via `sqlite3_deserialize` ke
 * memori, bukan OPFS (§2.6 catatan spike).
 *
 * PENTING: `sqlite3InitModule()` TIDAK dipanggil di top level modul (bukan
 * top-level await). Jika Comlink.expose() ditunda sampai setelah await async,
 * pesan RPC pertama dari main thread (dikirim segera setelah Worker dibuat)
 * bisa tiba dan hilang sebelum listener "message" terpasang — race condition
 * nyata yang sempat membuat init() macet tanpa error. `sqlite3InitModule()`
 * kini dijalankan lazy di dalam `api.init()`, sehingga Comlink.expose(api)
 * berjalan sinkron di baris pertama evaluasi modul.
 */
import sqlite3InitModule, {
  type Database as Sqlite3Db,
  type PreparedStatement,
  type Sqlite3Static,
} from "@sqlite.org/sqlite-wasm";
import * as Comlink from "comlink";
import { checkQueryGuard } from "@/engine/sql/guard";
import { computeFingerprints } from "@/engine/validation/fingerprint";
import { sha256HexBytes } from "@/lib/sha256";
import type {
  Cell,
  EngineError,
  EngineErrorCode,
  QueryLimits,
  ResultColumn,
  RunOutcome,
  RunRequest,
  SqlEngine,
} from "@/engine/sql/types";

let sqlite3: Sqlite3Static | undefined;
let db: Sqlite3Db | undefined;
let dbBytes: Uint8Array = new Uint8Array(0);
let limits: QueryLimits;
let deadline = 0;

const ctx = {
  tablesRead: new Set<string>(),
  fns: new Set<string>(),
  trusted: false, // hanya true selama bootstrap internal (mis. listTables)
};

function authorize(_cbArg: number, action: number, a1: string | 0, a2: string | 0): number {
  const capi = sqlite3!.capi;
  if (ctx.trusted) return capi.SQLITE_OK;
  const allowed = new Set<number>([capi.SQLITE_SELECT, capi.SQLITE_READ, capi.SQLITE_FUNCTION, capi.SQLITE_RECURSIVE]);
  if (!allowed.has(action)) return capi.SQLITE_DENY; // tulis, PRAGMA, ATTACH, transaksi, ...
  if (action === capi.SQLITE_READ && a1) {
    const table = String(a1);
    if (table.startsWith("sqlite_")) return capi.SQLITE_DENY; // panel Sheet, bukan query ke sqlite_master
    ctx.tablesRead.add(table);
  }
  if (action === capi.SQLITE_FUNCTION && a2) ctx.fns.add(String(a2).toLowerCase());
  return capi.SQLITE_OK;
}

function openFromBytes(): void {
  const { capi, wasm } = sqlite3!;
  db?.close();
  db = new sqlite3!.oo1.DB(":memory:", "c");
  const dbPtr = db.pointer as number;
  const p = wasm.allocFromTypedArray(dbBytes);
  db.checkRc(
    capi.sqlite3_deserialize(
      dbPtr,
      "main",
      p,
      dbBytes.byteLength,
      dbBytes.byteLength,
      capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_READONLY
    )
  );
  capi.sqlite3_db_config(dbPtr, capi.SQLITE_DBCONFIG_DEFENSIVE, 1, 0);
  capi.sqlite3_db_config(dbPtr, capi.SQLITE_DBCONFIG_DQS_DML, 0, 0);
  capi.sqlite3_limit(dbPtr, capi.SQLITE_LIMIT_SQL_LENGTH, limits.maxSqlLength);
  capi.sqlite3_limit(dbPtr, capi.SQLITE_LIMIT_LENGTH, limits.maxValueBytes);
  capi.sqlite3_limit(dbPtr, capi.SQLITE_LIMIT_ATTACHED, 0);
  db.exec("PRAGMA query_only = 1; PRAGMA hard_heap_limit = 67108864;");
  capi.sqlite3_progress_handler(dbPtr, 1000, () => (performance.now() > deadline ? 1 : 0), 0);
  capi.sqlite3_set_authorizer(dbPtr, authorize, 0);
}

/** Daftar sheet sesungguhnya di DB (defense-in-depth; UI juga punya ini dari manifest). */
function listTables(): string[] {
  if (!db) return [];
  ctx.trusted = true;
  try {
    const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
    const names: string[] = [];
    try {
      while (stmt.step()) names.push(stmt.get(0) as string);
    } finally {
      stmt.finalize();
    }
    return names;
  } finally {
    ctx.trusted = false;
  }
}

async function fetchDb(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal memuat berkas database kasus (HTTP ${res.status}).`);
  const body = url.endsWith(".gz") && res.body ? res.body.pipeThrough(new DecompressionStream("gzip")) : res.body;
  const buf = await new Response(body).arrayBuffer();
  return new Uint8Array(buf);
}

function classify(e: unknown): EngineErrorCode {
  // `WasmAllocError` bukan named export modul (hanya `sqlite3.WasmAllocError`
  // di instance yang sudah diinisialisasi); deteksi lewat `.name` sesuai
  // yang dipasang konstruktornya sendiri, supaya tidak perlu impor kelasnya.
  if (e instanceof Error && e.name === "WasmAllocError") return "ENGINE_CRASH";
  const message = e instanceof Error ? e.message : String(e);
  if (/interrupt/i.test(message)) return "TIMEOUT";
  if (/not authorized|prohibited|readonly database|read-only/i.test(message)) return "NOT_AUTHORIZED";
  return "SQL_ERROR";
}

function fail(code: EngineErrorCode, rawMessage: string, offset?: number, sqliteCode?: number): RunOutcome {
  const error: EngineError = { code, rawMessage, offset, sqliteCode };
  return { ok: false, error };
}

const api: SqlEngine = {
  async init(opts) {
    if (!sqlite3) sqlite3 = await sqlite3InitModule();
    limits = opts.limits;
    dbBytes = await fetchDb(opts.dbUrl);
    const actualSha256 = await sha256HexBytes(dbBytes);
    if (actualSha256 !== opts.sha256) {
      throw new Error("Integritas berkas kasus gagal diverifikasi (sha256 tidak cocok). Coba muat ulang halaman.");
    }
    openFromBytes();
    return { sqliteVersion: sqlite3.capi.sqlite3_libversion(), tables: listTables() };
  },

  async run({ sql, fingerprint }: RunRequest): Promise<RunOutcome> {
    if (!db || !sqlite3) return fail("ENGINE_CRASH", "Mesin database belum siap.");
    const { capi } = sqlite3;

    const guard = checkQueryGuard(sql, limits);
    if (!guard.ok) return fail("GUARD_REJECTED", guard.rejection.message);

    ctx.tablesRead.clear();
    ctx.fns.clear();
    deadline = performance.now() + limits.timeoutMs;
    const t0 = performance.now();

    let stmt: PreparedStatement | undefined;
    try {
      stmt = db.prepare(sql);
      if (!capi.sqlite3_stmt_readonly(stmt.pointer as number)) {
        return fail("NOT_AUTHORIZED", "Statement bukan read-only.");
      }
      const columnNames = stmt.getColumnNames();
      const columns: ResultColumn[] = columnNames.map((name, i) => ({
        name,
        declType: capi.sqlite3_column_decltype(stmt?.pointer as number, i),
      }));

      const all: Cell[][] = [];
      let total = 0;
      let overCap = false;
      while (stmt.step()) {
        total++;
        if (total > limits.maxRowsValidate) {
          overCap = true;
          break;
        }
        all.push(stmt.get([]) as Cell[]);
      }

      const fingerprints =
        fingerprint && !overCap ? await computeFingerprints(columns, all, fingerprint) : undefined;

      return {
        ok: true,
        result: {
          columns,
          rows: all.slice(0, limits.maxRowsDisplay),
          totalRows: total,
          truncated: total > limits.maxRowsDisplay,
          overValidateCap: overCap,
          durationMs: performance.now() - t0,
          tablesRead: [...ctx.tablesRead],
          functionsUsed: [...ctx.fns],
          fingerprints,
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const offset = db ? capi.sqlite3_error_offset(db.pointer as number) : undefined;
      const sqliteCode = e && typeof e === "object" && "resultCode" in e ? (e as { resultCode: number }).resultCode : undefined;
      return fail(classify(e), message, offset && offset >= 0 ? offset : undefined, sqliteCode);
    } finally {
      stmt?.finalize();
    }
  },

  async reset() {
    openFromBytes();
  },

  dispose() {
    db?.close();
  },
};

Comlink.expose(api);
