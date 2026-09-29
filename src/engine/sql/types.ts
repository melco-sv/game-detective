/**
 * Kontrak Worker SQL (docs/02-arsitektur.md §3.4). Diakses lewat Comlink
 * (RPC berbasis postMessage) dari src/infra/sql/engine-client.ts.
 */
import type { NormalizeOptions } from "../content/types";

export type Cell = string | number | bigint | null | Uint8Array;

export interface QueryLimits {
  timeoutMs: number; // default 2000 (progress handler)
  watchdogMs: number; // default 5000 (main thread -> terminate Worker)
  maxSqlLength: number; // default 5000 karakter
  maxRowsDisplay: number; // default 1000 baris dikirim ke UI (bisa diturunkan per chapter)
  maxRowsValidate: number; // default 10000 baris diproses untuk fingerprint
  maxValueBytes: number; // default 1_000_000 (SQLITE_LIMIT_LENGTH)
  maxCellCharsDisplay: number; // default 500
}

export const DEFAULT_QUERY_LIMITS: QueryLimits = {
  timeoutMs: 2000,
  watchdogMs: 5000,
  maxSqlLength: 5000,
  maxRowsDisplay: 1000,
  maxRowsValidate: 10000,
  maxValueBytes: 1_000_000,
  maxCellCharsDisplay: 500,
};

export interface FingerprintSpec {
  stepId: string;
  salt: string;
  /** Opsi normalisasi dari validator step aktif (resultEquals/keyColumn). */
  options: NormalizeOptions;
}

export type RunPurpose = "player" | "peek" | "internal";

export interface RunRequest {
  sql: string; // SATU statement (editor memilih query di posisi kursor)
  purpose: RunPurpose; // 'peek' = intip 5 baris sheet, tidak dihitung percobaan
  fingerprint?: FingerprintSpec; // diturunkan dari validator step aktif
}

export interface ResultColumn {
  name: string;
  declType: string | null;
}

export interface ResultFingerprints {
  ordered: string;
  unordered?: string;
  perColumn: Record<string, string>; // untuk validator keyColumn: fingerprint per kolom hasil
}

export interface RunResult {
  columns: ResultColumn[];
  rows: Cell[][]; // <= maxRowsDisplay
  totalRows: number; // <= maxRowsValidate
  truncated: boolean;
  overValidateCap: boolean; // hasil > maxRowsValidate (tidak divalidasi)
  durationMs: number;
  tablesRead: string[]; // dari authorizer (SQLITE_READ)
  functionsUsed: string[]; // dari authorizer (SQLITE_FUNCTION)
  fingerprints?: ResultFingerprints;
}

export type EngineErrorCode =
  | "GUARD_REJECTED" // bukan SELECT/WITH/VALUES, lebih dari satu statement, terlalu panjang
  | "NOT_AUTHORIZED" // ditolak authorizer (tulis, PRAGMA, ATTACH, sqlite_*)
  | "SQL_ERROR" // error sintaks/semantik dari SQLite
  | "TIMEOUT" // SQLITE_INTERRUPT dari progress handler
  | "ENGINE_CRASH"; // Worker di-terminate watchdog / out of memory

export interface EngineError {
  code: EngineErrorCode;
  sqliteCode?: number;
  rawMessage: string; // pesan asli (tombol "Detail teknis")
  offset?: number; // posisi karakter error (sqlite3_error_offset)
}

export type RunOutcome = { ok: true; result: RunResult } | { ok: false; error: EngineError };

export interface SqlEngine {
  init(opts: { dbUrl: string; sha256: string; limits: QueryLimits }): Promise<{
    sqliteVersion: string;
    tables: string[];
  }>;
  run(req: RunRequest): Promise<RunOutcome>;
  reset(): Promise<void>; // deserialize ulang dari byte asli
  dispose(): void;
}
