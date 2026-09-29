#!/usr/bin/env -S npx tsx
/**
 * Bundel src/infra/sql/sqlite.worker.ts + seluruh dependensinya (termasuk
 * @sqlite.org/sqlite-wasm, comlink, engine domain) menjadi satu berkas ES
 * module mandiri di public/workers/sqlite.worker.js.
 *
 * KENAPA berkas terpisah, bukan `new Worker(new URL("./sqlite.worker.ts",
 * import.meta.url))` yang dibundel Turbopack sendiri: Turbopack punya
 * penanganan statis khusus untuk pola `new Worker(new URL(x, import.meta.url))`
 * (dan bahkan `new URL(x, import.meta.url)` sendirian) yang tidak konsisten
 * antara dev server dan `next build` (output: export) — di dev pola ini
 * dibundel jadi chunk JS yang benar, tapi di build produksi Turbopack hanya
 * MENYALIN berkas sumber .ts mentah sebagai media asset (tidak pernah
 * ditranspile). @sqlite.org/sqlite-wasm juga punya dead-code path internal
 * (`sqlite3Worker1Promiser`, tidak pernah kita panggil) yang berisi
 * `new Worker(new URL(variabel, import.meta.url))` — argumen dinamis yang
 * bikin Turbopack gagal build sama sekali ("Can't resolve <dynamic>") begitu
 * Turbopack mencoba membundelnya sebagai worker chunk.
 *
 * Solusinya: keluarkan seluruhnya dari graf modul Turbopack. esbuild
 * membundel worker ini di luar Next.js/Turbopack sepenuhnya (esbuild tidak
 * punya logika spesial untuk `new Worker(new URL(...))` — pola itu jadi kode
 * runtime biasa baginya, jadi dead-code path sqlite-wasm tadi TIDAK bermasalah
 * di sini). Main-thread (src/infra/sql/engine-client.ts) lalu memuat hasilnya
 * lewat path string literal ("/workers/sqlite.worker.js"), bukan
 * `new URL(..., import.meta.url)`, supaya Turbopack juga tidak pernah
 * mengenali app-nya sendiri sebagai referensi worker.
 *
 * Pemakaian: `npm run worker:build` (dipanggil otomatis oleh `prebuild`/`predev`).
 */
import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function main() {
  const outDir = path.join(rootDir, "public/workers");
  mkdirSync(outDir, { recursive: true });

  const result = await build({
    entryPoints: [path.join(rootDir, "src/infra/sql/sqlite.worker.ts")],
    outfile: path.join(outDir, "sqlite.worker.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: true,
    tsconfig: path.join(rootDir, "tsconfig.json"),
    logLevel: "info",
    metafile: true,
  });

  // @sqlite.org/sqlite-wasm mencari sqlite3.wasm relatif ke import.meta.url
  // berkas yang dimuat browser — setelah dibundel, itu berarti relatif ke
  // public/workers/sqlite.worker.js, jadi sqlite3.wasm harus ada di folder
  // yang sama.
  copyFileSync(
    path.join(rootDir, "node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm"),
    path.join(outDir, "sqlite3.wasm")
  );

  const outputs = Object.keys(result.metafile.outputs);
  console.log(`worker:build — selesai. Berkas: ${outputs.join(", ")}, sqlite3.wasm`);
}

main().catch((err: unknown) => {
  console.error("worker:build — gagal:", err);
  process.exit(1);
});
