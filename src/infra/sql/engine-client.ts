/**
 * Klien Worker SQL di main thread: Comlink + watchdog (docs/02-arsitektur.md
 * §5.2 lapisan 6). Bila Worker tidak merespons dalam `watchdogMs`, Worker
 * di-terminate dan dibuat ulang, lalu DB dimuat ulang dari byte yang sama.
 *
 * Worker dimuat dari path string literal ke berkas PRA-BUNDEL
 * (public/workers/sqlite.worker.js, dihasilkan `npm run worker:build` via
 * esbuild — lihat scripts/build-worker.ts), BUKAN
 * `new Worker(new URL("./sqlite.worker.ts", import.meta.url))`. Turbopack
 * punya penanganan statis untuk pola itu yang tidak konsisten antara dev
 * server dan `next build`, dan @sqlite.org/sqlite-wasm sendiri punya
 * dead-code path internal yang membuat Turbopack gagal build sama sekali
 * begitu ia mencoba membundel file itu (detail di scripts/build-worker.ts).
 */
import * as Comlink from "comlink";
import { DEFAULT_QUERY_LIMITS, type QueryLimits, type RunOutcome, type RunRequest, type SqlEngine } from "@/engine/sql/types";

export interface EngineClientOptions {
  dbUrl: string;
  sha256: string;
  limits?: Partial<QueryLimits>;
  onWatchdogRestart?: () => void;
}

export interface EngineReadyInfo {
  sqliteVersion: string;
  tables: string[];
}

export class SqlEngineClient {
  private worker?: Worker;
  private remote?: Comlink.Remote<SqlEngine>;
  private readonly limits: QueryLimits;
  private readonly opts: EngineClientOptions;

  constructor(opts: EngineClientOptions) {
    this.opts = opts;
    this.limits = { ...DEFAULT_QUERY_LIMITS, ...opts.limits };
  }

  private spawnWorker(): void {
    this.worker = new Worker("/workers/sqlite.worker.js", { type: "module" });
    this.remote = Comlink.wrap<SqlEngine>(this.worker);
  }

  async init(): Promise<EngineReadyInfo> {
    this.spawnWorker();
    if (!this.remote) throw new Error("Worker gagal dibuat.");
    return this.remote.init({ dbUrl: this.opts.dbUrl, sha256: this.opts.sha256, limits: this.limits });
  }

  private async restart(): Promise<void> {
    this.worker?.terminate();
    this.spawnWorker();
    if (!this.remote) throw new Error("Worker gagal dibuat ulang.");
    await this.remote.init({ dbUrl: this.opts.dbUrl, sha256: this.opts.sha256, limits: this.limits });
    this.opts.onWatchdogRestart?.();
  }

  async run(req: RunRequest): Promise<RunOutcome> {
    if (!this.remote) throw new Error("SqlEngineClient belum di-init().");
    const remote = this.remote;
    let timedOut = false;
    const watchdog = new Promise<RunOutcome>((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve({
          ok: false,
          error: { code: "ENGINE_CRASH", rawMessage: "Mesin query dimulai ulang (tidak merespons)." },
        });
      }, this.limits.watchdogMs);
    });
    const result = await Promise.race([remote.run(req), watchdog]);
    if (timedOut) await this.restart();
    return result;
  }

  async reset(): Promise<void> {
    await this.remote?.reset();
  }

  dispose(): void {
    this.remote?.dispose();
    this.worker?.terminate();
  }
}
