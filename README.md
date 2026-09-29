# Detektif SQL

Game web detektif berbahasa Indonesia, gratis penuh, untuk desktop. Pemain mencari tersangka dengan menulis query SQL, bab demi bab, dari `SELECT` sederhana hingga CTE rekursif. Target: mahasiswa, calon data analyst, dan gamer.

## Dokumen perencanaan

| File | Isi |
|---|---|
| [docs/00-keputusan.md](docs/00-keputusan.md) | **Sumber kebenaran.** Keputusan produk, konflik yang sudah diselesaikan, pertanyaan terbuka |
| [docs/01-riset.md](docs/01-riset.md) | Perbandingan 14 game sejenis, pola puzzle anti-tebak, kurikulum SQL, sistem bantuan, 8 bab di kota fiktif Wiralaga |
| [docs/02-arsitektur.md](docs/02-arsitektur.md) | Stack (Next.js + SQLite WASM di Web Worker), konten-sebagai-data, sandbox, validasi, skor, struktur folder, roadmap |
| [docs/03-design.md](docs/03-design.md) | Design system "Berkas Malam", spesifikasi layar, animasi penangkapan, **prompt Google Stitch** (bagian 7) + DESIGN.md (Lampiran A) |

## Menjalankan proyek

Prasyarat: Node.js ≥ 20.

```bash
npm install
npm run dev
```

Perintah lain:

```bash
npm test              # Vitest — domain/engine (157 test saat ini)
npm run typecheck      # tsc --noEmit
npm run lint            # ESLint (batas lapisan engine/ ditegakkan)
npm run content:build   # bangun content/chapters/* -> public/generated/
npm run content:verify  # sama, tanpa menulis berkas (dipakai CI)
npm run build            # next build (output: 'export')
```

## Status pengembangan

Mengikuti roadmap MVP di [docs/02-arsitektur.md §13.1](docs/02-arsitektur.md#131-mvp--bab-13-100-lokal-desktop-1024-px).

**Sudah ada, teruji:**
- Scaffold Next.js 16 (App Router) + TypeScript strict + Tailwind v4 dengan token desain dari 03-design §2.9, ESLint (`eslint-plugin-boundaries` menegakkan bahwa `src/engine` tidak boleh mengimpor React/Next/Dexie/infra), Vitest.
- **`src/engine/`** (domain TS murni, tanpa React/DOM): skema konten (§4.3-4.4), `QueryGuard` + tokenizer + `statementAtCursor` (§5.2 lapisan 1), deteksi konsep SQL (§6.3), kanonisasi & fingerprint hasil (§6.2), evaluator validator (`resultEquals`/`keyColumn`/`queryUses`/`all`/`any`/`custom`), validasi tersangka multi-slot dengan `group` (§6.5, B7), Asisten Otomatis (penerjemah error + diagnosis, §5.5/§6.4), mesin bantuan 4 level (§7), `ReportPolicy` (salah tuduh bertahap + jeda, §6.5), rumus skor (§9.2), penyamaran Petunjuk 4.
- **`scripts/build-content.ts`**: pipeline build konten penuh (parse+validasi Zod, bangun DB dengan `node:sqlite`, introspeksi skema, hitung fingerprint, jalankan `tests.yaml`, uji keunikan pelaku B2/B7, aturan label konten B6, kompresi gzip) → `public/generated/chapters/`.
- **`content/chapters/01-raibnya-batik-tulis-sang-maestro/`**: konten Bab 1 versi mini (4 step) dari 02-arsitektur §4.5, berhasil dibangun dan lolos semua `tests.yaml`.
- Beranda (`/`) dan Papan Kasus minimal (`/kasus`, membaca katalog hasil build) — `next build` menghasilkan situs statis yang benar-benar memuat data Bab 1 dari pipeline konten.

**Deviasi yang disengaja dari dokumen** (dicatat di komentar kode):
- `scripts/build-content.ts` memakai `node:sqlite` (bawaan Node) untuk membangun DB saat build, bukan `@sqlite.org/sqlite-wasm` seperti runtime browser (ADR-02 aslinya minta mesin yang sama persis). Keduanya SQLite standar; risikonya ada di perilaku sangat spesifik-implementasi.
- Font display "Big Shoulders Display" sudah digabung Google Fonts menjadi "Big Shoulders" (tanpa varian "Display" berdiri sendiri) dan tidak tersedia lewat `next/font/google` versi ini. Dipakai fallback yang sudah tertulis di 03-design §2.2 sendiri: **Barlow Condensed**.

**Belum ada (menyusul, lihat M0-M13 di 02-arsitektur §13.1):**
- Mesin SQL di Web Worker (`@sqlite.org/sqlite-wasm` + Comlink + authorizer + watchdog) — lapisan sandbox 2-6.
- Penyimpanan Dexie/IndexedDB (progres, catatan, riwayat, draf).
- Halaman Briefing, Ruang Investigasi (editor CodeMirror, tabel hasil, panel Bantuan/Buku Saku), Buku Catatan, Formulir Laporan, Animasi Penangkapan, Ringkasan, Pengaturan, `DesktopGate`.
- Bab 2-3 (untuk melengkapi MVP) dan konten penuh Bab 1 (7 step, bukan versi mini 4 step).
- v1 (akun, sinkronisasi, leaderboard) — memang dijadwalkan setelah MVP.
