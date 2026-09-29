# Ekspor Google Stitch

Sumber: proyek Stitch **"Design System UI Kit"** (`projects/13669955892467371948`), diambil 28 September 2026 lewat MCP Stitch.
Acuan pencocokan: [`docs/00-keputusan.md`](../../docs/00-keputusan.md) (sumber kebenaran) dan [`docs/03-design.md`](../../docs/03-design.md).

## Berkas

File di folder ini adalah **kondisi Stitch saat ini**, yaitu setelah design system baru diterapkan (lihat bagian "Penerapan ke layar"). Ekspor awal sebelum penerapan ada di [sebelum-apply/](sebelum-apply/), dan hasil pencocokan di bawah mengacu ke versi itu.

| Layar di Stitch | ID layar sekarang | ID sebelum apply | HTML | Gambar | Acuan |
|---|---|---|---|---|---|
| Papan Kasus — Detektif SQL | `63b5c90aedcb4eef84a4ed6d25b1df1d` | `2d95577a0e6a4e59acb2201bcef7640f` | [papan-kasus.html](papan-kasus.html) | [papan-kasus.png](papan-kasus.png) | 03 §4.2 |
| Ruang Investigasi — Detektif SQL | `ec1c3f63be0042ef8e36d6abf59500aa` | `068b499aedc34d9c978cbf5c7cf494b3` | [ruang-investigasi.html](ruang-investigasi.html) | [ruang-investigasi.png](ruang-investigasi.png) | 03 §4.4 |
| Formulir Laporan Polisi — Detektif SQL | `8953f1f72e4447f89fbaffc64b025fc3` | `0446167a8d1d46abb9d7fa83f7d8cdbd` | [formulir-laporan-polisi.html](formulir-laporan-polisi.html) | [formulir-laporan-polisi.png](formulir-laporan-polisi.png) | 03 §4.6 |
| Emblem DID Wiralaga | `82c346195bf94c8dbacd182179a4b216` | `8c239f3acd3b425f8fb8ffb5fbbcaf39` | [emblem-did-wiralaga.html](emblem-did-wiralaga.html) | [emblem-did-wiralaga.png](emblem-did-wiralaga.png) | 03 §1.5 |
| Detektif SQL - Kota Wiralaga Prototype | `1f3c9ace29974f818d5a1adc8bd86394` | `16a914a3744447feaa10d8d13fae780e` | [prototype-kota-wiralaga.html](prototype-kota-wiralaga.html) | [prototype-kota-wiralaga.png](prototype-kota-wiralaga.png) | duplikat Papan Kasus |

- **Prototype:** HTML-nya identik byte-per-byte dengan `papan-kasus.html`, baik sebelum maupun sesudah apply. Di ekspor awal, Stitch tidak menyediakan screenshot, jadi `sebelum-apply/prototype-kota-wiralaga.png` dirender lokal (Chrome headless, 1280 px @2x).
- **Emblem:** SVG-nya sama persis, tetapi setelah apply Stitch membungkusnya menjadi halaman HTML 1280×1024.

Proyek itu juga memuat salinan `03-design.md` (identik dengan `docs/03-design.md`, tidak disimpan ulang) dan design system "Night Dossier".

## Design system (diperbarui 28 September 2026)

Design system yang dipakai sekarang adalah **"Berkas Malam — Detektif SQL"**, `assets/f39f0e44d1c844a99ffa320da9b8a54c`. Isinya diimpor dari [DESIGN.stitch.md](DESIGN.stitch.md), yaitu isi Lampiran A yang ditulis ulang dalam format front matter yang dikenali Stitch.

Lampiran A tidak bisa diimpor apa adanya, karena dua hal:

- Stitch mengabaikan key `version`, `description`, dan `components`.
- Stitch menurunkan ulang `primary` dari warna seed menjadi `#ffd898`.

Karena itu nilai warna ditulis langsung di front matter, dan token komponen dipindah ke badan teks.

**Hasil impor:**

- `primary` `#F2B84B` dan semua token warna Lampiran A (paper, stamp-red/green, danger, success, info, hint, editor, surface-raised, dll.) sudah tersimpan.
- Font sudah sesuai: Big Shoulders Display (display, badge), Plus Jakarta Sans (UI), dan JetBrains Mono (code, data).

**Keterbatasan Stitch:**

- **Radius mengikuti preset `ROUND_EIGHT`:** 4 / 8 / 12 / 16 / 24 px. Tombol dan kartu jadi 8–12 px, bukan tepat 10 px.
- **Teks panduan (Overview, Do's and Don'ts) tidak ikut tersimpan.** Stitch hanya menyimpan token. Aturan konten tetap harus dibawa oleh prompt di 03-design.md Bagian 7.
- **Token M3 turunan bernama garis bawah** (mis. `surface_container` `#241f17`) masih ada di samping token kita yang bernama tanda hubung. Kalau layar hasil apply berwarna kecokelatan, penyebabnya ada di sini.

**Aset lain di proyek (belum bisa dihapus lewat MCP, hapus manual di Stitch):**

- **"Night Dossier"** (`assets/21f7508363f34ce293adea1e0c8f914a`): design system lama, sudah setengah diubah oleh update (font Plus Jakarta Sans, seed amber). Belum memakai Big Shoulders Display, dan panduannya masih menyuruh header tabel uppercase.
- **"Berkas Malam — Detektif SQL"** (`assets/77040c64a464489ca80bca58815998c1`): percobaan pertama. Warna `primary`-nya `#ffd898` dan token warna khususnya hilang. Jangan dipakai.
- **Dua layar "DESIGN.md"** di kanvas (`7794133788137991435`, `14134628490197308527`): sisa proses impor.

## Penerapan ke layar (28 September 2026): hasilnya rusak

**1. `apply_design_system`** (design system `f39f0e44…` ke kelima layar)

- Stitch mengganti setiap layar dengan ID baru. Tetapi satu-satunya perubahan di HTML adalah tautan Google Fonts, yang sekarang hanya memuat Plus Jakarta Sans.
- Konfigurasi Tailwind **tidak berubah**:
  - `fontFamily` masih Domine, Manrope, dan JetBrains Mono;
  - `primary` masih `#fffaf7`;
  - radius masih 2/4/8/12 px.
- Karena Domine, Manrope, dan JetBrains Mono tidak dimuat lagi, **semua teks (termasuk editor SQL) jatuh ke font serif bawaan browser**. Lihat `ruang-investigasi.png`.

**2. `edit_screens`** (satu perubahan: token font, warna primary, dan radius)

- Stitch melaporkan berhasil, tetapi setelah ditunggu ±2 menit HTML di server tetap tidak berubah.
- Operasi DOM yang dikirim juga hanya mengganti tautan font dan menambah beberapa kelas `rounded-[…]`. Konfigurasi `fontFamily` tetap tidak diubah.

**Cara memulihkan:**

- **Kembalikan versi lama:** pakai riwayat versi tiap layar di Stitch web (tidak tersedia lewat MCP). Salinan HTML dan PNG versi lama ada di [sebelum-apply/](sebelum-apply/).
- **Atau buat ulang layar:** pakai prompt 03-design.md Bagian 7 dengan design system `f39f0e44…`, sekalian memperbaiki temuan audit.

## Hasil pencocokan

### Masalah global (semua layar)

1. **Font salah.** Semua layar memakai Domine (serif) untuk judul dan Manrope untuk UI. Seharusnya Big Shoulders Display dan Plus Jakarta Sans (03 §2.2). JetBrains Mono sudah benar. Penyebabnya design system "Night Dossier" di Stitch, jadi layar baru juga akan salah font sampai design system itu diganti dengan Lampiran A.
2. **Radius terlalu kecil.** Config Tailwind: DEFAULT 2 px, `lg` 4 px, `xl` 8 px, `full` 12 px. Seharusnya tombol/kartu 10 px, panel/modal 16 px, chip 9999 px (03 §2.4).
3. **Token `primary` salah.** Di design system Stitch, `primary` = `#fffaf7` dan CTA utama = kertas manila. Di dokumen, `primary` = amber `#F2B84B`. Tombol utama di layar yang ada sudah amber (`accent-amber`), tetapi layar baru berisiko mengikuti token yang salah. Hex palet lain (bg, surface, paper, stamp) sudah sesuai.
4. **Footer tidak ada di spesifikasi:** "© 2024 …" (seharusnya 2026) dan teks Inggris "TERMINAL SECURE V2.4 · KLASIFIKASI: A-1".
5. **Top bar** menambah tab "Ruang Investigasi" dan chip "Lokal / Aman". Spesifikasi 03 §3.13 hanya berisi "Papan Kasus", "Buku Catatan", dan "Pengaturan".
6. Ikon memakai Material Symbols **Outlined**, bukan **Rounded** (03 §2.6). Masalah minor.

### Papan Kasus (juga berlaku untuk Prototype)

- **Badge Tema Dewasa:** teks (Bab 5–8) dan warna badge (`#E9EDF5` / `#0D1220`) sudah benar, dan Bab 1–4 tanpa badge. Yang belum sesuai:
  - badge diletakkan di atas judul, padahal seharusnya di bawah judul sebelum baris distrik;
  - font mono 10 px, seharusnya Big Shoulders Display 13/16 dengan tinggi 22;
  - keterangan berwarna merah stempel `#B3261E` dengan prefiks "•". Seharusnya `#A9B2C6` caption 12/16. Kontras saat ini hanya ±2,4–2,9:1, di bawah batas WCAG 4,5:1.
- **Lokasi nyata (melanggar B3):** "KOORDINAT: 06°48'S 110°50'E · PESISIR UTARA JAWA" menunjuk ke Kudus, Jawa Tengah.
- **Teks Inggris:** "SQL Syntax Engine", "Aliases (AS)", "Subqueries", "Window Functions", "NULL checks", "Audit Log", "Kompleks Multi-Join".
- **Konsep SQL Bab 5–8 salah** (bandingkan dengan B4):
  - Bab 5 tertulis GROUP BY/HAVING (seharusnya Subquery, NOT EXISTS, anti-join, UNION/EXCEPT);
  - Bab 6 tertulis LEFT JOIN/COALESCE (seharusnya CASE, fungsi tanggal, CTE);
  - Bab 7 dicampur Subqueries/CASE;
  - Bab 8 kurang self-join dan multi-CTE.
- **Sinopsis kartu tidak ada di spesifikasi, dan sebagian bertentangan dengan 01-riset §5.3:**
  - Bab 5 menyebut "kamar kos mahasiswa", padahal korbannya pemilik kos yang tewas di kantornya;
  - Bab 3 menyebut "restoran rival", padahal pelakunya tim pesaing festival;
  - Bab 8 menyebut "sosok berkuasa di puncak pemerintahan kota". Ini menyesatkan karena Dalang adalah pemilik galeri.
- **Nomor berkas** "2024-WIR-001" seharusnya berformat `01/DID/VIII/2026`. Tab map seharusnya berisi "BAB n".
- **Progres tidak konsisten:** "6 Terkunci" bertentangan dengan filter "Belum Terbuka (5)" (1 terkunci + 4 segera hadir). Bab 4 "Tingkat: Menengah" seharusnya memakai chip "Sedang".
- **Banner bawah salah fitur:** menyebut "Buku Catatan Lapangan untuk contekan klausa JOIN". Contekan sintaks ada di **Buku Saku SQL**, sedangkan Buku Catatan berisi hasil query tersimpan. Label "Petunjuk ditemukan: 3/5" juga mudah tertukar dengan sistem Petunjuk berbiaya.

### Ruang Investigasi

- **Header tabel hasil di-uppercase** (`NAMA`, `PERAN`). Spesifikasi eksplisit melarangnya: nama kolom harus tampil persis seperti di DB (03 §2.2, §3.4).
- **Membocorkan jawaban:** baris Bambang Hartadi disorot merah dengan tanda "!" dan tooltip "Pintu belakang di luar jam resmi". Asisten juga menulis kesimpulannya. Spesifikasi meminta data tampil mentah.
- **Toast bermasalah:** "Temuan Tersinkron" menyiratkan sinkronisasi cloud, padahal MVP tidak punya akun (B8). Posisinya di kanan bawah menutupi baris Asisten. Seharusnya di kanan atas, di bawah top bar.
- **Top bar ganda + footer** (top bar global di atas top bar investigasi) memakan tinggi layar. Spesifikasi 03 §3.13 hanya memakai top bar investigasi.
- **Step selesai** dicoret dan diberi label "SELESAI". Seharusnya judul `#A9B2C6` + waktu ("02:05", "03:12", "03:40").
- **Copy kecil yang berbeda dari spesifikasi:**
  - "Daftar Langkah Analisis" → "Misi";
  - "SQLite v3.41" (di Papan Kasus tertulis v3.42) → "SQLite";
  - "Semua kendala terpenuhi" tidak ada di spesifikasi.
- **Sudah sesuai:** tab Skema/Bantuan/Buku Saku, "6 sheet tersedia", daftar sheet, step aktif dan target hasil, pesan Bu Laras, tombol "Ajukan Laporan" yang selalu tampil, dan warna sintaks.

### Formulir Laporan Polisi (Bab 3)

- **Istilah kepolisian nyata (melanggar 03 §1.5):**
  - alamat "Gedung Presisi …, Jl. **Bhayangkara** Cyber" (kata "Bhayangkara" dilarang eksplisit);
  - "Unit Tindak Pidana Siber";
  - "Tanda Bukti Laporan".
- Label "NAMA TERSANGKA **UTAMA**" seharusnya "NAMA TERSANGKA". "Kembali Menyelidiki" seharusnya tombol ghost.
- **Latar blur berisi data karangan yang tidak cocok dengan Bab 3:** "Warung Bu Tedjo", tabel `log_kehadiran`/`transaksi_toko`, dan NIK berkode wilayah nyata 3271.
- **Sudah sesuai:**
  - hanya 2 field;
  - `autocomplete="off"` dan `spellcheck="false"` tanpa saran;
  - kop dan emblem, nomor LP, dua catatan, tanda tangan;
  - tombol di luar kertas, kertas miring dengan klip.

### Emblem DID

Sudah sesuai: segel ganda, kaca pembesar berisi 3 garis, teks melingkar, amber di atas `#0D1220`. Penyimpangan minor: garis lensa berwarna toska dan biru (seharusnya amber saja), dan stroke 2,5–3,5 px (seharusnya line art 2 px).

### Layar yang belum ada di Stitch

- **MVP:** Beranda (4.1), Briefing (4.3), Buku Catatan (4.5), Animasi Penangkapan (4.7), Alert Salah Tersangka (4.8), Ringkasan (4.9), Pengaturan (4.10), Layar Terlalu Kecil (4.11).
- **Pasca-MVP:** Briefing Tema Dewasa (4.3.1), **Formulir Bab 8 tiga nama** (4.6.1), Penangkapan tiga tersangka (4.7.1), Alert Bab 8 (4.8.1).
- **v1:** **Masuk** (4.12), Papan Peringkat (4.13), Profil (4.14), Fitur Online Tidak Tersedia (4.15).

Karena itu, "login hanya Google" dan "form 3 nama Bab 8" belum bisa dicek di desain. Tidak ada layar yang menampilkan login email.
