# 01 — Riset: Game Sejenis, Pola Desain, Kurikulum & Konsep Chapter "Detektif SQL"

> Status: draf riset v3 (disesuaikan dengan `00-keputusan.md`, termasuk jawaban A6–A8 → B6–B8) · Tanggal: 28 September 2026
> **Jika isi dokumen ini bertentangan dengan `00-keputusan.md`, file keputusan yang berlaku.** Temuan riset dipertahankan; yang disesuaikan adalah *rekomendasi*. Rekomendasi yang gugur karena keputusan user ditandai ~~dicoret~~ atau dipindah ke catatan "Tidak dipakai".
> Cakupan: analisis game "belajar SQL lewat misteri" + inspirasi desain dari game detektif non-SQL + riset sistem hint + konteks pasar Indonesia.
> Catatan metodologi: sebagian situs (mystery.knightlab.com, ResearchGate, beberapa artikel Medium, ACM DL) menolak akses langsung (HTTP 403), sehingga informasinya diambil dari repositori GitHub resmi, walkthrough pihak ketiga, dan diskusi Hacker News. Beberapa daftar "game SQL terbaik" (SQLMaxx, SQL Protocol, SQL Case Files) ditulis oleh pembuat game pesaing — dipakai sebagai data pendukung, bukan penilaian netral.

---

## Daftar Isi

0. [Ringkasan Eksekutif](#0-ringkasan-eksekutif)
1. [Lanskap Game Sejenis](#1-lanskap-game-sejenis)
2. [Pola Desain Puzzle yang Baik](#2-pola-desain-puzzle-yang-baik)
3. [Kurikulum SQL Bertahap](#3-kurikulum-sql-bertahap)
4. [Desain Sistem Bantuan Bertingkat](#4-desain-sistem-bantuan-bertingkat)
5. [Rekomendasi 8 Chapter Berlatar Indonesia](#5-rekomendasi-8-chapter-berlatar-indonesia)
6. [Peluang Diferensiasi Pasar Indonesia](#6-peluang-diferensiasi-pasar-indonesia)
7. [Implikasi Teknis dari Riset](#7-implikasi-teknis-dari-riset)
8. [Sumber](#8-sumber)

---

## 0. Ringkasan Eksekutif

- **Target (keputusan A1–A3):** mahasiswa, calon data analyst, dan gamer penyuka misteri/puzzle; **desktop-first**; **gratis penuh** tanpa paywall.
- **Genre ini sudah terbukti diminati.** SQL Murder Mystery (Knight Lab) jadi rujukan klasik; SQL Noir mendapat puluhan ribu pengunjung di hari peluncuran; *Database Detective: Minor Crimes Division* (Steam, Juli 2026) meraih ~97% ulasan positif. Tapi **belum ditemukan game detektif SQL yang berbahasa Indonesia penuh** dengan konteks lokal — celah yang jelas. Pesaing yang paling rapi memasang paywall (SQL Noir, SQLPD, Database Detective), sehingga "gratis penuh + bahasa Indonesia" menjadi pembeda.
- **Kelemahan berulang game pesaing:** (a) terlalu pendek / berhenti di JOIN, (b) bisa ditebak tanpa SQL (brute-force 2–3 nama, `LIKE '%kill%'` di tabel pengakuan), (c) skema harus bolak-balik tab, (d) teks soal tidak konsisten dengan data, (e) validasi longgar (solusi setengah jadi lolos), (f) hint yang langsung memberi jawaban.
- **Pola terbaik yang layak ditiru:** validasi berbasis *hasil query* (bukan teks SQL), jawaban akhir disimpan sebagai hash (jangan di DB yang bisa di-query), batas tampilan baris ala *Her Story*, dan catatan detektif yang otomatis tersimpan (SQL Noir, Fiftyville `log.sql`). Karena laporan polisi Bab 1–7 **cukup nama** (A4), perlindungan anti-tebak dipindah ke desain data (nama pelaku unik, tanpa autocomplete nama) dan penanganan salah tuduh bertahap dengan penalti (B2). **Bab 8 meminta 3 nama sekaligus** (Dalang + Perantara 1 + Perantara 2; A6, B7), yaitu penerapan temuan Obra Dinn/Fiftyville bahwa menuntut lebih dari satu jawaban membuat tebakan hampir mustahil.
- **Riset hint menunjukkan bahaya "loncat ke jawaban":** siswa sering melompati hint level awal untuk langsung ke jawaban; bahkan pada 50.000 pemain game edukasi, sistem hint konvensional menurunkan performa. Solusi yang dipakai (B1): **4 level petunjuk** dengan *gate* (Arah gratis → Sheet & Kolom −10% → Kerangka −30% → Query Lengkap −60%), ditambah **Asisten Otomatis** dan **Buku Saku SQL** yang gratis di luar level.
- **Usulan:** 8 chapter (±73 step, **MVP = Bab 1–3**) dengan satu benang merah "Sang Dalang", dari `SELECT *` sampai window function & recursive CTE. Semua sheet chapter terbuka sejak awal (A5).
- **Kurva intensitas tema (A8, B6):** Bab 1–3 (MVP) tetap kejahatan non-kekerasan sebagai pengenalan. Bab 4 lebih gelap tanpa kekerasan (penipuan dana bantuan banjir). Pembunuhan mulai muncul di Bab 5 (motif pribadi), lalu naik ke pembunuhan petugas pelabuhan oleh jaringan penyelundup (Bab 6) dan pembungkaman pelapor pinjol (Bab 7). Bab 8 menjadi puncak tergelap: jaringan yang memerintahkan semua pembunuhan itu membunuh saksi di rumah aman dan menjebak analis DID. Kekerasan selalu terjadi **di luar layar** (lewat data, laporan, dan dialog). Bab 5–8 diberi badge **"Tema Dewasa"** + keterangan satu baris. Batas tetap berlaku: tanpa kekerasan seksual, kekerasan terhadap anak, bunuh diri sebagai alat plot, SARA, atau rujukan ke tokoh/tempat/peristiwa nyata.
- **Akun & leaderboard (A7, B8, v1):** main tetap tanpa login. Login opsional hanya untuk sinkronisasi dan ikut **leaderboard per bab** dengan tab **"Tanpa Bantuan"**; nama tampilan opt-in; skor divalidasi ulang di server; semuanya di free tier (tetap gratis penuh).
- **Untuk calon data analyst:** step bergaya studi kasus kerja nyata, catatan dialek PostgreSQL/MySQL/BigQuery di Buku Saku, dan "portofolio" query tersimpan yang bisa diekspor.

---

## 1. Lanskap Game Sejenis

### 1.1 Tabel Perbandingan Utama

| Game | Format & cerita | Skema DB | Validasi jawaban | Sistem hint | Progresi | Harga / engine |
|---|---|---|---|---|---|---|
| **SQL Murder Mystery** (Knight Lab, Northwestern) | Satu kasus pembunuhan di "SQL City" (15 Jan 2018) + bonus "dalang" | ±9 tabel: `crime_scene_report`, `person`, `drivers_license`, `interview`, `get_fit_now_member`, `get_fit_now_check_in`, `facebook_event_checkin`, `income`, `solution`; ERD tersedia; ribuan baris | `INSERT INTO solution` → trigger mengecek (jawaban tersimpan ter-*hex* di trigger) | Walkthrough terpisah untuk pemula; tidak ada hint in-game; 2 tingkat kesulitan prompt | 1 kasus, ±7 langkah, 10–30 menit | Gratis, SQLite, MIT + CC BY-SA |
| **CS50 Fiftyville** (Harvard) | Pencurian "CS50 Duck", pelaku kabur naik pesawat dibantu kaki tangan | 10 tabel: `crime_scene_reports`, `interviews`, `bakery_security_logs`, `atm_transactions`, `bank_accounts`, `phone_calls`, `people`, `airports`, `flights`, `passengers` | 3 jawaban (pelaku, kota tujuan, kaki tangan) di `answers.txt`, dicek `check50` | Hanya petunjuk titik awal; wajib `log.sql` berisi semua query + komentar | 1 kasus (tugas kuliah) | Gratis, SQLite CLI |
| **SQL Noir** (sqlnoir.com) | Agensi detektif noir era 80-an; 6+ kasus (pencurian → pembunuhan) | Tiap kasus punya DB & skema sendiri | Kotak "Your Answer" berisi nama pelaku | Tidak ada hint eksplisit; objektif per kasus, halaman bantuan, Discord | Beginner/Intermediate/Advanced, XP per kasus (50–1000 XP) | Kasus pemula gratis (situs menyebut 3); sisanya "Detective License" sekali bayar; Next.js + Supabase, SQL di browser (WASM) |
| **SQL Noir – Devgarh** (RayArena, open source) | Inspektur Kulkarni membongkar jaringan pencucian uang di kota fiktif India | Per kasus, di-seed dari string SQL | **Objektif memeriksa baris hasil**, bukan teks SQL (jumlah baris, urutan, distinct, nilai skalar) | "SQL Academy" 16 konsep + latihan terverifikasi | 8 kasus, tiap kasus 2 konsep kumulatif, terbuka berurutan | Gratis, sql.js (WASM), hanya metadata progres ke server |
| **SQL Island** (RPTU Kaiserslautern) | Selamat dari kecelakaan pesawat, hidup di pulau yang warganya "bicara SQL" | 3 tabel: `inhabitant`, `village`, `item` | Query dijalankan, hasil dibandingkan target | Instruksi naratif per langkah | ±1 jam, 5 babak cerita; satu-satunya yang mengajarkan INSERT/UPDATE/DELETE | Gratis, multi-bahasa (asal Jerman) |
| **SQL Police Department** (sqlpd.com) | Detektif naik pangkat dengan memecahkan kasus | Tabel sederhana per kasus | Hasil query dieksekusi; pemain "menandai" baris hasil di Mission Brief | Tab "Guide" berisi materi; pesan "periksa kembali kondisi" | Pangkat + ujian kenaikan pangkat | Freemium, lisensi ±US$20/6 bulan; query bisa dirakit dari potongan (klik), engine SQL buatan sendiri |
| **Lost at SQL** | Kapten kapal selam yang tenggelam, komunikasi hanya via terminal | Berbeda per chapter | Output dibandingkan dengan target | Tombol "Learn" (teori) + "slide to get the answer" → ditandai *Skip*; hint mengurangi skor | 20 chapter, 2 ending, mode Story & Challenge; leaderboard | Gratis, SQLite |
| **QueryCase** | 54 kasus detektif di dataset nyata (musik, olahraga, film) | Beragam; investigasi berwaktu dengan 6 tabel | Tuduhan tunggal pada investigasi berwaktu | Hint dari "Chief Fox"; investigasi berwaktu **tanpa hint** | 4–5 pangkat, 12 drill, 4 ujian, sertifikat | Freemium |
| **SQL Detective** (CS++) | Pencurian bebek karet — versi "ramah sekolah" dari Murder Mystery | ±49.000 baris, jalan di browser | Nama pelaku | Primer konsep bertahap + hint bertingkat | SELECT → CTE | Gratis; **pelaku diacak per siswa** (anti-contek) |
| **Station Zero** (SQLMaxx) | Stasiun luar angkasa sekarat; AI "CORA" hanya mengerti SQL | Per babak | Umpan balik menjelaskan *kenapa* query salah | Bantuan makin detail makin lama pemain macet | 3 babak, sampai window function & recursive CTE; lanjut ke jalur 66 konsep | Gratis, hanya SELECT |
| **SQL Squid Game** (DataLemur) | Parodi Squid Game, pertanyaan bisnis | Skema per level + contoh query | Output dibandingkan solusi | Tutorial terpisah | 9 level, CTE & subquery | Gratis |
| **Database Detective: Minor Crimes Division** (Steam) | 10 kasus di kepolisian fiktif "Los Zorangeles", suasana 1998 | Banyak DB + 40+ "situs web" dalam game | Mengidentifikasi pelaku | Buku panduan ±20 hlm, asisten in-game, pesan error lengkap | 8–10 jam, 34 achievement | Rp 72.499; UI **hanya Inggris**; 97% dari 925 ulasan positif |
| **SQL Case Files** | 100+ level bertema detektif | — | Cek jawaban instan | Hint dasar | Sampai window function & CTE | Gratis, wajib username |
| **Schemaverse** | Strategi luar angkasa multipemain sepenuhnya di PostgreSQL | Skema game | Kompetisi | — | Terbuka | Gratis; server dilaporkan tidak bisa diakses pertengahan 2026 |

Rujukan kurikulum (bukan game detektif): **SQLBolt** (18 pelajaran interaktif, JOIN sebelum agregasi, ditutup DML/DDL), **Select Star SQL** (buku interaktif 5 bab dengan dataset nyata), dan **Command Line Murders** (`clmystery`, inspirasi Knight Lab: 8 file hint bernomor).

### 1.2 Catatan per Game (yang relevan untuk kita)

**SQL Murder Mystery (Knight Lab).** Kekuatan utamanya: rantai petunjuk yang rapi — laporan TKP → dua saksi → transkrip wawancara → petunjuk parsial (nomor member gym, sebagian plat nomor) → irisan dua jalur bukti → pelaku → bonus "siapa yang menyuruh" (maks. 2 query). Titik macet umum: kolom tanggal berupa integer `20180115` (bukan `'2018-01-15'`), arah foreign key yang "terbalik", penempatan wildcard `LIKE`, baris ganda akibat JOIN ke riwayat check-in, dan filter terlalu longgar. Kelemahan: hanya satu kasus, bisa ditebak dengan mencoba 2–3 nama, dan jawaban bocor lewat `sqlite_master`/trigger. Pemeriksa jawaban berbasis `INSERT` juga gagal di hosting yang hanya mengizinkan SELECT.

**CS50 Fiftyville.** Paling mirip dengan konsep kita (CCTV parkir, ATM, rekening bank, log telepon, penerbangan). Dua ide penting: (1) **tiga jawaban sekaligus** (pelaku + kota + kaki tangan) membuat tebakan acak hampir mustahil; (2) **`log.sql` wajib** — setiap query dicatat dengan komentar alasan, persis fungsi "buku catatan detektif".

**SQL Noir (sqlnoir.com).** UI paling rapi di genre ini: tab *Case Brief / SQL Workspace / Schema / Notes*, catatan tersimpan otomatis, kotak jawaban nama. Umpan balik HN: pemain bisa "curang" dengan mencari kata seperti `%kill%` atau `%i did%` di tabel pengakuan; skema harus berpindah tab (minta tampilan berdampingan); penamaan tabel tunggal/jamak tidak konsisten; tidak jelas harus mengisi nama atau ID; komentar `--` merusak query; minta tombol "salin ke catatan", riwayat query, dan menjalankan beberapa query sekaligus.

**SQL Noir – Devgarh (RayArena).** Preseden lokalisasi yang sangat relevan: kota fiktif, nama tokoh lokal, mata uang rupee, dan **tidak ada orang/perusahaan nyata yang dikaitkan dengan kejahatan**. Secara teknis patut ditiru: validator memeriksa *hasil* (jumlah baris, urutan, distinct, nilai), sehingga `SELECT *` gagal pada objektif yang menuntut filter; seluruh SQL berjalan di browser dengan sql.js.

**SQL Island.** Bukti riset: pembuatnya melaporkan satu jam bermain memberi pemahaman lebih baik dibanding satu jam membaca buku; studi lain (56 mahasiswa, model MEEGA+) melaporkan pengalaman dan persepsi belajar yang positif. Unik karena mengajarkan DML (relevan untuk kurikulum SMK/mata kuliah Basis Data — bukan fokus kita, lihat A1).

**SQL Police Department.** Mekanik "rakit query dari potongan" cocok untuk layar sentuh/pemula, tetapi dikritik karena engine-nya bukan database sungguhan. Sistem pangkat + ujian kenaikan pangkat memberi rasa progres yang kuat.

**Lost at SQL.** Kurikulum terpanjang (SELECT → window function → DELETE dalam 20 chapter). Keluhan HN: efek ketik terlalu lambat, skema sulit dilihat, **teks soal tidak konsisten dengan data** ("Recovered" vs "Returned"), **test case kurang ketat sehingga solusi tidak lengkap lolos**, penyimpanan gagal diam-diam di mode private, tidak minta izin sebelum memasang skor di leaderboard, dan beberapa chapter terasa lebih "teka-teki logika" daripada SQL.

**QueryCase.** Model bisnis & progresi paling matang: pangkat (Recruit → Chief), drill, ujian kenaikan pangkat dengan sertifikat, dan investigasi berwaktu tanpa hint untuk pemain mahir. Prinsipnya: konsep baru muncul saat cerita membutuhkannya ("JOIN muncul ketika tersangka dan alibi tidak cocok lagi").

**CS++ SQL Detective.** Dua ide untuk pasar sekolah: tema tanpa kekerasan (lolos filter konten sekolah) dan **pelaku berbeda untuk tiap siswa**. Untuk kita (target dewasa), ide pertama hanya dipakai di bab pembuka (Bab 1–3 non-kekerasan, B6) agar MVP tetap mudah dibagikan. Ide kedua hanya relevan bila mode kelas untuk dosen dibuat (v2).

**Database Detective (Steam).** Menunjukkan bahwa game SQL premium bisa laku (±8–10 jam, ulasan sangat positif). Blogger Indonesia memuji detail kasus & humornya, tapi mengeluhkan **lonjakan kesulitan** dan **tidak bisa mengulang level tertentu**. UI tidak tersedia dalam Bahasa Indonesia.

### 1.3 Inspirasi dari Game Detektif Non-SQL

| Game | Mekanik | Pelajaran untuk Detektif SQL |
|---|---|---|
| **Her Story** | Pencarian database video hanya menampilkan 5 hasil pertama, tapi selalu memberi tahu total hasil | Batasi baris yang ditampilkan + tampilkan total → memaksa query yang lebih spesifik, mencegah "SELECT * lalu baca manual" |
| **Return of the Obra Dinn** | "Rule of three": nasib awak baru dikonfirmasi setelah 3 jawaban benar sekaligus | Temuan: meminta >1 fakta sekaligus membuat tebakan hampir mustahil. **Tidak dipakai di Bab 1–7** karena laporan cukup nama (A4). **Dipakai di Bab 8:** laporan 3 nama (Dalang + Perantara 1 + Perantara 2) yang dinilai sekaligus, semua-atau-tidak (A6, B7) |
| **Professor Layton** | Tiap puzzle punya 3 hint + "super hint", dibeli dengan koin hint yang ditemukan dengan menjelajah; hint terbuka berurutan; tidak mengurangi skor | Alternatif penalti skor: mata uang hint yang didapat dari eksplorasi (tidak dipilih; B1 memakai penalti persentase) |

### 1.4 Apa yang Disukai vs Dikeluhkan Pemain (Sintesis)

| Tema | Disukai | Dikeluhkan | Implikasi untuk kita |
|---|---|---|---|
| Narasi | Cerita membuat pemain "tidak sadar sedang belajar" (pembuat SQL Noir); premis kuat | Terlalu pendek (Knight Lab selesai 10–30 menit) | Banyak chapter + benang merah antar-chapter |
| Kesulitan | Langkah dipecah kecil tapi pemain mahir boleh menulis satu query besar | Lonjakan kesulitan (Database Detective), berhenti di JOIN, terlalu sulit untuk pemula absolut (SQL Noir, Squid Game) | Kurva bertahap per step; konsep baru diperkenalkan 1–2 per chapter |
| Kecurangan | — | Tebak 2–3 nama; cari kata kunci di teks pengakuan; jawaban bocor via `sqlite_master` | Nama pelaku unik + tanpa autocomplete nama, salah tuduh bertahap dengan penalti & jeda (B2), jawaban di-hash, teks bebas tidak memuat "pengakuan" |
| Skema | ERD Knight Lab membantu | Harus bolak-balik tab; penamaan tidak konsisten | Panel skema berdampingan, konvensi nama konsisten |
| Validasi | Umpan balik instan | Nama vs ID ambigu; test case longgar; teks vs data tidak konsisten | Validasi berbasis hasil yang ketat + QA konsistensi naratif |
| Editor | — | Komentar `--` merusak query, satu query saja, autocomplete mengganggu, tanpa riwayat | Editor berbasis CodeMirror/Monaco, dukung komentar & multi-statement, riwayat query |
| Catatan | Notes panel auto-save (SQL Noir), notepad (Database Detective) | Tidak ada "salin hasil ke catatan" | Fitur inti: **pin hasil query ke Buku Catatan** |
| Teknis | Jalan di browser tanpa instalasi | Gagal di Safari Lockdown Mode (WASM), penyimpanan gagal diam-diam di mode private, mobile kurang nyaman | Deteksi & peringatkan kegagalan storage; fallback non-WASM tidak realistis → tampilkan pesan jelas; desktop-first (A2), mobile ditunda |
| Hint | "Learn" button, walkthrough | Hint mengurangi skor terasa menghukum; tanpa hint pemula berhenti | 4 level petunjuk dengan level awal gratis (lihat §4, B1) |

---

## 2. Pola Desain Puzzle yang Baik

### 2.1 Rantai Petunjuk (Clue Chain)

Setiap hasil query harus **berisi "kait" untuk query berikutnya** — ini pola inti Knight Lab dan Fiftyville. Kait bisa berupa:

1. **Nilai yang harus dipakai lagi** — ID laporan, NIK saksi, nomor rekening, `device_id`.
2. **Deskripsi parsial** — "plat nomornya diawali `D 12` dan diakhiri `K`", "membawa tas bertuliskan *Gym Sehat* member emas".
3. **Rentang waktu/lokasi** — "sekitar 10 menit setelah kejadian", "lewat gerbang tol Cikara Timur".
4. **Kontradiksi** — "katanya naik ojek, tapi tidak ada transaksi ojek atas namanya" (memicu LEFT JOIN / NOT EXISTS).

Anatomi satu step yang disarankan:

```
Narasi singkat (2–4 kalimat) → Objektif jelas (1 kalimat, tetap terlihat saat mengetik)
→ Pemain menulis query → Validator memeriksa HASIL
→ "Temuan" (fakta kunci) otomatis masuk Buku Catatan → Kait menuju step berikutnya
```

### 2.2 Struktur Corong (Funnel) Kandidat

Desain data sehingga kandidat menyempit secara terukur di setiap step, dan **tidak ada satu tabel pun yang langsung menunjuk pelaku**:

```
Semua penduduk (10.000) → hadir di lokasi pada hari itu (±300)
→ dalam rentang jam kejadian (±40) → cocok deskripsi saksi (±6)
→ cocok bukti kedua dari tabel lain (2) → cocok bukti ketiga (1)
```

Aturan praktis: pelaku akhir harus membutuhkan **irisan minimal 2–3 jalur bukti independen** (mis. CCTV + transaksi + telepon), seperti irisan "member gym × plat nomor" di Knight Lab.

### 2.3 Red Herring yang Adil

Red herring bagus = **tampak mencurigakan secara naratif, tetapi dapat dibantah dengan data**. Jenis yang cocok:

| Jenis | Contoh lokal | Cara membantah via SQL |
|---|---|---|
| Nama mirip | "Budi Santoso" vs "Budi Santosa" (nama pasaran, beda satu huruf) | Bedakan dengan NIK / JOIN ke alamat; nama pelaku tetap **unik** di seluruh dataset chapter (B2) |
| Motif kuat, bukti lemah | Juri yang anaknya ikut lomba | Log akses menunjukkan ia di luar gedung |
| Near-miss | Plat mirip beda kode wilayah | Filter `LIKE` yang lebih tepat |
| Salah tafsir zona waktu | Kapal "tiba 14.00" WITA ≠ 14.00 WIB | Konversi waktu / CASE per zona |
| Data kotor | `"B1234XYZ"` vs `"B 1234 XYZ"`, spasi & huruf kapital | `REPLACE`, `UPPER`, `TRIM` |
| Pelaku tampak "dominan" | Rekening dengan transaksi terbesar ternyata toko grosir | Pola waktu (LAG) atau agregat yang lebih tepat |
| Alibi palsu | HP terhubung ke WiFi kos padahal orangnya pergi | Tidak ada aktivitas lain di jam yang sama |

Aturan: red herring pada chapter awal maksimal 1; chapter akhir 2–3. Setiap red herring harus punya *query pembantah* yang didokumentasikan di file desain kasus.

### 2.4 Mencegah Jawaban Ditebak Tanpa SQL

1. **Ukuran data memadai.** Tabel utama: Bab 1 ±1.000–3.000 baris; Bab 4+ ±10.000–100.000 baris; finale sampai ±200.000 baris (log telepon/transaksi). Knight Lab memakai ribuan baris; CS++ ±49.000 baris dan tetap jalan di browser.
2. **Batas tampilan hasil (ala Her Story).** Tampilkan maksimal N baris (mis. 100) + total baris: "Menampilkan 100 dari 18.432 baris — coba persempit dengan WHERE". Step Bab 1 boleh sengaja memakai tabel kecil agar `SELECT *` terasa aman.
3. **Teks bebas tidak boleh berisi pengakuan.** Transkrip wawancara ditulis netral; kata-kata "mencurigakan" juga muncul pada banyak tokoh tak bersalah (menjawab eksploit `LIKE '%kill%'` di SQL Noir).
4. **Laporan cukup nama — anti-tebak lewat desain data (A4, B2).** Form hanya berisi Nomor Kasus (otomatis) dan Nama Tersangka, **tanpa autocomplete nama** agar daftar kandidat tidak bocor. Konsekuensinya bagi penulis kasus: **nama pelaku harus unik di seluruh dataset chapter**, dan red herring memakai nama *mirip* (mis. "Budi Santoso" vs "Budi Santosa"), bukan identik. Temuan Obra Dinn/Fiftyville (menuntut >1 fakta) tidak dipakai untuk Bab 1–7. **Bab 8 memakai 3 field (B7):** Dalang (harus tepat di slotnya) serta Perantara 1 dan Perantara 2 (urutan bebas). Laporan benar hanya jika ketiganya benar, dan salah ke-1 tidak menyebut berapa nama yang benar supaya nama tidak bisa ditebak satu per satu. Ketiga nama wajib unik di dataset Bab 8.
5. **Salah tuduh bertahap (B2).** Salah ke-1 → alert persis *"Kamu salah menentukan tersangka, silakan cari lagi."*; salah ke-2 → alert yang sama + petunjuk evaluatif (mis. "Orang ini tidak berada di lokasi pada jam kejadian"); salah ke-3 dst. → alert + jeda 60 detik. Setiap salah tuduh −10% skor maksimum chapter (−100 dari 1.000), skor tidak di bawah 0. Menjawab keluhan "saya coba 2–3 nama saja". Di Bab 8 aturan yang sama berlaku untuk laporan 3 nama; petunjuk evaluatif di salah ke-2 membahas satu nama yang keliru (B7).
6. **Validasi step berbasis hasil, bukan teks SQL** (RayArena) — cek kolom kunci, jumlah baris, urutan bila relevan, dan keberadaan baris target. Sediakan toleransi: nama kolom/alias bebas, urutan kolom bebas, kecuali step yang memang mengajarkan ORDER BY.
7. **Jawaban tidak disimpan di DB yang bisa di-query.** Hindari pola trigger Knight Lab yang bocor lewat `sqlite_master` (authorizer memblokir `sqlite_*` — lihat C/A5 di `00-keputusan.md`). Simpan hash nama yang dinormalisasi (huruf besar/kecil, spasi, tanda baca) di konfigurasi kasus.
8. ~~Pelaku diacak per pemain/kelas~~ — temuan CS++ tetap dicatat, tetapi **ditunda** ke mode kelas untuk dosen (v2). Untuk pemain umum, hash jawaban sudah cukup; spoiler komunitas diterima sebagai risiko wajar game gratis.
9. **Tombol "Ajukan Laporan" selalu tersedia (B2)** — karena itu desain data harus memastikan pelaku *tidak bisa* ditemukan tanpa melalui corong bukti (§2.2); step yang dilewati tidak memberi poin, sehingga jalan pintas tetap "mahal".

### 2.5 Checklist QA Kasus

- [ ] Setiap istilah di narasi persis sama dengan nilai di data (status, nama kolom, ejaan).
- [ ] Setiap step punya ≥1 solusi referensi + ≥2 solusi alternatif yang juga lolos validasi.
- [ ] Solusi "hampir benar" yang umum (filter kurang satu) **gagal** dengan pesan diagnosis.
- [ ] Setiap red herring punya query pembantah.
- [ ] Pelaku tidak bisa ditemukan dengan 1 query `LIKE` ke kolom teks bebas.
- [ ] **Nama pelaku unik** di seluruh dataset chapter (cek otomatis `COUNT(*) = 1` di semua sheet yang memuat nama); red herring memakai nama mirip, bukan identik.
- [ ] Pelaku tidak bisa ditemukan dengan satu query ke satu sheet mana pun, walaupun semua sheet terbuka sejak awal.
- [ ] Setiap petunjuk evaluatif salah tuduh (B2) sudah ditulis untuk tersangka "palsu" yang paling mungkin dituduh.
- [ ] **Bab 8:** ketiga nama jawaban (Dalang, Perantara 1, Perantara 2) unik, milik tiga orang berbeda (NIK berbeda), dan masing-masing punya ≥2 jalur bukti SQL independen yang query referensinya lolos CI (§5.3 Bab 8).
- [ ] Nama tokoh dan nama perusahaan/merek fiktif dicek terhadap daftar tokoh publik dan pencarian umum (hindari kemiripan dengan orang atau badan usaha nyata).
- [ ] **Bab dengan kekerasan (Bab 5–8):** badge "Tema Dewasa" + keterangan satu baris ada di kartu kasus dan briefing; teks lolos batas B6 (kekerasan di luar layar, tanpa deskripsi luka atau cara membunuh, tanpa kekerasan seksual, tanpa korban/pelaku/saksi anak, tanpa bunuh diri, tanpa SARA, tanpa rujukan nyata).
- [ ] Semua query referensi dijalankan otomatis di CI terhadap DB kasus.

### 2.6 Konsekuensi "Semua Sheet Terbuka Sejak Awal" (A5)

Pada game riset di atas, Knight Lab dan Fiftyville juga memberi akses ke seluruh tabel sejak awal — dan tetap berhasil karena rantai petunjuknya kuat. Keputusan kita sama: **semua sheet chapter terbuka dan ada di autocomplete sejak step 1**. Implikasi desain:

- **Arah datang dari cerita, bukan dari sheet yang "diserahkan".** Setiap step harus menyebut (atau mengisyaratkan) sheet yang relevan lewat narasi/objektif; Petunjuk 2 "Sheet & Kolom" (B1) menjadi jaring pengaman bila pemain bingung memilih sheet.
- **Sheet pengecoh diperbolehkan.** Karena semua sheet terlihat, sheet yang relevan untuk step akhir juga terlihat sejak awal — ini wajar dan justru memberi rasa "ruang arsip" yang nyata. Pastikan sheet akhir tidak bisa dipakai sendirian untuk menemukan pelaku (§2.2).
- **Pemain penjelajah dihargai, bukan dihukum.** Pemain yang melompat ke sheet lain tidak diblokir; validator step hanya memeriksa hasil query yang relevan untuk step aktif.
- **Skema panel harus rapi dari awal.** Dengan 4–8 sheet sekaligus, panel skema berdampingan (keluhan SQL Noir) dan penamaan konsisten menjadi lebih penting; urutkan sheet sesuai kira-kira urutan pemakaian dalam cerita.

---

## 3. Kurikulum SQL Bertahap

### 3.1 Perbandingan Urutan Kurikulum Referensi

| Sumber | Urutan ringkas |
|---|---|
| SQLBolt | SELECT → WHERE (2 bagian) → ORDER BY/LIMIT → **JOIN** → OUTER JOIN → NULL → ekspresi → **agregat** → urutan eksekusi → INSERT/UPDATE/DELETE → DDL |
| Lost at SQL | SELECT → WHERE/AND/OR/NOT → **GROUP BY** → ORDER BY → CASE → **CTE** → **JOIN**/LEFT/FULL → LIKE → **window** → tanggal + multi-CTE → UNION → DELETE |
| SQL Island | SELECT → WHERE → LIKE → IN → IS NULL → UPDATE → INSERT → JOIN → DELETE → ORDER BY |
| SQL Noir Devgarh | SELECT/WHERE → ORDER BY/LIMIT → DISTINCT/agregat → GROUP BY → JOIN → subquery → CTE → window |
| QueryCase (pangkat) | Rookie: SELECT/WHERE/logika → Detective: agregat/NULL/casting → Senior: JOIN/subquery/CTE → Chief: window |
| CP SMK PPLG Fase F (Kurikulum Merdeka) | DDL, DML, DCL, **perintah bertingkat** (subquery), function & stored procedure, trigger, backup/restore, replikasi |

**Keputusan:** JOIN diajarkan **sebelum** agregasi (seperti SQLBolt). Alasannya: menghubungkan bukti antar-tabel adalah "fantasi inti" detektif dan sudah dibutuhkan di kasus sederhana (Knight Lab butuh JOIN di kasus pertamanya), sementara agregasi paling natural untuk kasus penipuan pola (bab tengah).

### 3.2 Tingkatan Konsep & Pemetaan ke Chapter

| Tingkat | Konsep | Contoh kebutuhan detektif | Bab |
|---|---|---|---|
| T0 Orientasi | `SELECT *`, `LIMIT`, pilih kolom, alias `AS`, membaca skema | "Buka arsip laporan" | 1 |
| T1 Filter dasar | `WHERE` (`=`, `<>`, `>`, `<`), `AND`/`OR`/`NOT`, `ORDER BY`, tipe teks vs angka | "Siapa yang keluar setelah galeri tutup?" | 1 |
| T2 Filter lanjut & data kotor | `LIKE` + `%`/`_`, `IN`, `BETWEEN`, `IS NULL`, `DISTINCT`, `UPPER`/`LOWER`/`TRIM`/`REPLACE`, filter tanggal-jam | Plat nomor parsial, jam lewat gerbang tol | 2 |
| T3 Relasi | `INNER JOIN` 2→3 tabel, alias tabel, JOIN multi-kondisi, primary/foreign key | Kartu akses ↔ penduduk ↔ CCTV | 3 |
| T4 Agregasi | `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `GROUP BY`, `HAVING`, `COUNT(DISTINCT)`, agregat + JOIN | Alamat dengan puluhan "penerima bantuan"; rekening yang menampung dana banyak penerima fiktif | 4 |
| T5 Bertingkat & himpunan | Subquery (`IN`, skalar, berkorelasi), `EXISTS`/`NOT EXISTS`, `LEFT JOIN … IS NULL` (anti-join), `UNION`/`INTERSECT`/`EXCEPT` | "Mengaku naik ojek, tapi tak ada transaksinya" | 5 |
| T6 Transformasi | `CASE WHEN`, `COALESCE`, fungsi string & tanggal, aritmetika waktu, **CTE** (`WITH`) | Konversi WIB/WITA/WIT, menyusun kronologi | 6 |
| T7 Analitik | Window: `ROW_NUMBER`, `RANK`/`DENSE_RANK`, `LAG`/`LEAD`, `SUM() OVER`, `PARTITION BY`, frame | Uang masuk lalu keluar < 5 menit; transaksi ke-n | 7 |
| T8 Mahir | Self-join, multi-CTE, **recursive CTE**, kombinasi semua | Rantai perantara telepon/kepemilikan perusahaan cangkang | 8 |
| Opsional (pasca-MVP) | `INSERT`, `UPDATE`, `DELETE`, `CREATE VIEW` | "Tugas administrasi": mengarsip laporan, memperbaiki data | Misi sampingan, bukan jalur utama |

Catatan: game inti hanya membaca data (authorizer memblokir operasi selain baca, lihat `00-keputusan.md` C/A5), jadi DML hanya mungkin sebagai mode terpisah. Stored procedure, trigger, DCL, backup/replikasi (bagian CP SMK) **di luar cakupan**; pemetaan ke Capaian Pembelajaran SMK tidak lagi prioritas (paling cepat v2, untuk dosen).

### 3.3 Pola Kurva di Dalam Chapter

Setiap chapter dimulai dengan 1–2 step "pemanasan" memakai konsep lama (retensi), lalu 1 step pengenalan konsep baru dengan contoh di Buku Saku, 2–4 step penerapan, dan 1 step "puncak" yang menggabungkan konsep baru + lama. Chapter tidak memperkenalkan lebih dari ±3 konsep baru (menghindari lonjakan ala Database Detective). Pemain mahir boleh melewati step dengan satu query besar asalkan hasilnya memenuhi validator step-step tersebut (dihargai lencana "Satu Tembakan").

**Step bergaya studi kasus kerja (untuk calon data analyst).** Di setiap chapter, sisipkan 1–2 step yang dibingkai seperti permintaan kerja nyata dari Gilang (Analis Data) atau Bu Laras (Kepala Unit), mis. "Buatkan rekap jumlah transaksi per distrik untuk rapat besok, urutkan dari terbesar" — bentuk yang mirip soal tes/wawancara SQL data analyst (gaya SQL Squid Game/QueryCase), tetapi hasilnya tetap dipakai sebagai petunjuk kasus.

### 3.4 Catatan Dialek untuk Buku Saku (SQLite → dunia kerja)

Engine game adalah SQLite, sedangkan data analyst di dunia kerja memakai PostgreSQL, MySQL, atau BigQuery. Buku Saku menampilkan catatan singkat saat sintaks berbeda:

| Topik | SQLite (di game) | PostgreSQL | MySQL | BigQuery |
|---|---|---|---|---|
| Gabung teks | `a \|\| b` | `a \|\| b`, `CONCAT()` | `CONCAT(a, b)` (`\|\|` = OR secara default) | `a \|\| b`, `CONCAT()` |
| `LIKE` & huruf besar/kecil | Tidak peka huruf besar/kecil untuk ASCII | Peka; pakai `ILIKE` | Tergantung collation (umumnya tidak peka) | Peka; pakai `LOWER()` |
| Tanggal/waktu | `date()`, `strftime()`, `julianday()` | `DATE_TRUNC`, `EXTRACT`, `+ INTERVAL '1 hour'` | `DATE_FORMAT`, `DATE_ADD`, `TIMESTAMPDIFF` | `DATE_TRUNC`, `TIMESTAMP_DIFF`, `FORMAT_TIMESTAMP` |
| Zona waktu (Bab 6) | Tidak ada dukungan zona; simpan offset di kolom | `AT TIME ZONE 'Asia/Makassar'` | `CONVERT_TZ()` (butuh tabel zona) | `DATETIME(ts, 'Asia/Makassar')` |
| Pembagian bilangan bulat | `7/2 = 3` | `7/2 = 3` | `7/2 = 3.5000` | `7/2 = 3.5` (`DIV()` untuk bulat) |
| `FULL OUTER JOIN` | Ada (SQLite ≥3.39) | Ada | Tidak ada; pakai `UNION` dua `LEFT JOIN` | Ada |
| `INTERSECT`/`EXCEPT` | Ada | Ada | Ada sejak 8.0.31 | Wajib `INTERSECT DISTINCT`/`EXCEPT DISTINCT` |
| Filter hasil window | Pakai subquery/CTE | Pakai subquery/CTE | Pakai subquery/CTE | Bisa `QUALIFY` |
| CTE rekursif (Bab 8) | `WITH RECURSIVE` | `WITH RECURSIVE` | `WITH RECURSIVE` (8.0+) | `WITH RECURSIVE` |

*Tabel ini disusun dari pengetahuan umum dokumentasi masing-masing engine; perlu diverifikasi ulang terhadap versi terbaru sebelum masuk konten Buku Saku.*

---

## 4. Desain Sistem Bantuan Bertingkat

### 4.1 Temuan Riset tentang Hint

- **Penyalahgunaan hint "bottom-out":** pada tutor geometri, siswa melewati level hint awal dan langsung ke jawaban pada 82–89% langkah; 68% level hint sebelum terakhir dilihat < 1 detik (Aleven & Koedinger).
- **Hint bisa menurunkan performa di game edukasi:** studi 50.000 pemain (Refraction & Treefrog Treasure, O'Rourke dkk., 2014) menemukan keempat varian sistem hint menurunkan performa dibanding tanpa hint; hint konkret lebih membantu daripada hint abstrak.
- **Kualitas hint pertama menentukan kepercayaan:** kualitas beberapa hint pertama berkorelasi dengan penggunaan hint berikutnya dan kemungkinan penyalahgunaan (Price dkk., 2017).
- **Masalahnya ada di cara penyajian:** studi LAK 2026 (999 siswa) — meminta hint terlalu cepat dan membaca hint sekilas konsisten terkait hasil belajar lebih buruk; penulis menyarankan merancang ulang *affordance* tombol hint agar mendukung "productive struggle".
- **Praktik game SQL:** Lost at SQL menandai *Skip* & mengurangi skor; Station Zero makin membantu makin lama pemain macet; QueryCase menghapus hint di mode berwaktu; Knight Lab menyediakan walkthrough terpisah.

### 4.2 Tangga Bantuan: 4 Level + 2 Fitur Gratis (mengikuti B1)

**Fitur gratis di luar level (tidak dihitung sebagai petunjuk):**

| Fitur | Isi | Kapan |
|---|---|---|
| **Asisten Otomatis** | Error SQL diterjemahkan ke bahasa Indonesia + diagnosis hasil: "Hasilmu 1.204 baris, target jauh lebih sedikit — filter tanggal sudah dipakai?" (terinspirasi CORA di Station Zero) | Selalu aktif, otomatis |
| **Buku Saku SQL** | Kamus sintaks + contoh 1 baris + catatan beda dialek SQLite vs PostgreSQL/MySQL/BigQuery (§3.4) — setara tab Guide SQLPD/buku panduan Database Detective | Kapan saja |

**Petunjuk bertingkat (biaya kumulatif dari poin step itu):**

| Level | Nama | Isi | Kapan bisa dibuka | Biaya |
|---|---|---|---|---|
| 1 | **Arah** | Arah investigasi tanpa menyebut sintaks: "Saksi menyebut pintu samping. Catatan apa yang merekam pintu keluar?" | Kapan saja | **Gratis** |
| 2 | **Sheet & Kolom** | Sheet dan kolom mana yang relevan — penting karena semua sheet terbuka sejak awal (A5) | Setelah Petunjuk 1 dibuka | **−10%** |
| 3 | **Kerangka** | Query dengan bagian kosong: `SELECT nama FROM ___ WHERE plat LIKE '___' AND …` | Setelah Petunjuk 2 + (1 query gagal **atau** 2 menit) | **−30%** |
| 4 | **Query Lengkap** | Query jawaban + penjelasan per baris; step ditandai "dibantu" | Setelah Petunjuk 3 + (1 query gagal **atau** 2 menit) | **−60%** |

Mekanik pendukung (sesuai B1/B2):
- **Gate berbasis percobaan/waktu** mencegah klik beruntun ke jawaban (menjawab temuan bottom-out abuse & LAK26).
- **Bantuan hanya *ditawarkan* otomatis** setelah beberapa kali gagal atau diam lama — tidak pernah terbuka sendiri, sehingga pemain yang ingin berjuang tidak "dimanjakan".
- **Penalti tidak bisa di-reset dengan reload.**
- **Petunjuk salah tuduh terpisah dari petunjuk step:** pada salah tuduh ke-2, pemain mendapat petunjuk evaluatif yang tidak membocorkan nama, melainkan menunjuk ketidakcocokan ("Orang ini tidak berada di lokasi pada jam kejadian").
- **Ditunda:** "Tantangan Kembar" (mengembalikan sebagian poin setelah Petunjuk 4) → v1. Mode Latihan tanpa skor & Mode Tantangan tanpa petunjuk (ala investigasi berwaktu QueryCase) → kandidat pasca-MVP.

*Catatan desain dari riset:* versi awal dokumen ini mengusulkan level "Konsep SQL" (contoh mini di tabel lain). Di B1 fungsi itu dipindah ke Buku Saku yang gratis, sehingga Petunjuk 2 fokus pada "di mana mencari" (sheet & kolom) — lebih konkret, sejalan dengan temuan O'Rourke bahwa hint konkret lebih membantu daripada hint abstrak.

### 4.3 Trade-off Model Biaya Hint

| Model | Contoh | Kelebihan | Kekurangan |
|---|---|---|---|
| Penalti skor | Lost at SQL | Sederhana, adil untuk leaderboard | Mendorong *help avoidance*; pemula frustrasi lalu berhenti |
| Mata uang hint hasil eksplorasi | Professor Layton | Menghargai eksplorasi, tidak terasa menghukum | Perlu ekonomi seimbang; bisa kehabisan koin saat macet |
| Gratis tanpa batas | Walkthrough Knight Lab | Ramah pemula | Penyalahgunaan bottom-out; belajar dangkal |
| Gate waktu/percobaan | Station Zero, saran LAK26 | Mendorong berpikir dulu | Bisa terasa menghambat pemain yang benar-benar buntu |
| Hint AI kontekstual | Asisten in-game Database Detective | Relevan dengan query pemain | Biaya API, risiko membocorkan jawaban/halusinasi |

**Rekomendasi (selaras B1):** hibrida — Asisten Otomatis, Buku Saku, dan Petunjuk 1 gratis (hindari *help avoidance*); Petunjuk 2–4 berbiaya persentase poin + gate. Leaderboard v1 (A7, B8) memisahkan skor lewat tab **"Tanpa Bantuan"**, sehingga penalti petunjuk tidak perlu diperberat demi keadilan papan skor (lihat §6.4 butir 17). Data penggunaan petunjuk untuk dosen hanya relevan di mode kelas v2. Hint AI ditunda dan, bila dibuat, dibatasi setara Petunjuk 1–2 (sekaligus harus muat biaya ≈ Rp0 — A3).

---

## 5. Rekomendasi 8 Chapter Berlatar Indonesia

### 5.1 Kerangka Dunia

- **Setting (B3):** Kota fiktif **Wiralaga** (kota pesisir menengah) dengan distrik/kelurahan fiktif; tidak memakai kota nyata sebagai lokasi kejahatan. Pemain adalah detektif di **Divisi Investigasi Data (DID)** — instansi fiktif — bersama tokoh tetap **Bu Laras** (Kepala Unit) dan **Gilang** (Analis Data). Hindari logo/atribut resmi kepolisian nyata. Papan Kasus memakai peta kota Wiralaga bergaya titik dengan pin per distrik: Sekar Arum (Bab 1), Gerbang Timur (2), Candrawati (3), Kembangsari (4), Wiyatapura (5), Pesisir Baruna (6), Niagaraya (7), Wiralaga Tengah (8), mengikuti `03-design.md` §1.5.
- **Benang merah:** tiap kasus tampak berdiri sendiri, tetapi potongan kecil (nomor telepon, rekening, perusahaan cangkang, KTP curian) berulang dan mengarah ke **"Sang Dalang"** di Bab 8. Struktur jaringannya: Dalang tidak pernah menghubungi pelaku secara langsung. Perintah turun lewat **Perantara 1**, yang memegang kasus harta (Bab 1–4), dan **Perantara 2**, yang memegang kasus yang butuh "pembungkaman" (Bab 5–7). Tiap bab meninggalkan satu remah yang kelak terkumpul di sheet `arsip_kasus` Bab 8.
- **Pedoman konten & kurva intensitas (A1, A8, B3, B6):**
  - **Kurva.** Bab 1–3 (MVP) tetap kejahatan non-kekerasan sebagai pengenalan (pencurian karya seni, pencurian muatan truk, pencurian resep), sehingga MVP bisa dibagikan luas tanpa peringatan konten. "Truk dibajak" di Bab 2 ditulis tanpa penodongan dan tanpa korban luka. Bab 4 lebih gelap tanpa kekerasan: penipuan yang memangsa korban bencana. Bab 5–7 boleh memuat kekerasan termasuk pembunuhan, dengan taruhan yang naik dari motif pribadi (Bab 5) ke kejahatan terorganisasi (Bab 6–7). Bab 8 puncak tergelap: jaringan di balik semua kematian itu membunuh saksi dan menjebak orang dalam DID.
  - **Kekerasan di luar layar.** Kekerasan diceritakan lewat data (laporan kejadian dan forensik yang hanya memuat lokasi serta perkiraan jendela waktu kematian), laporan, dan dialog. Tidak ada deskripsi luka, senjata, atau cara membunuh; tidak ada gore atau jenazah di ilustrasi maupun animasi; animasi penangkapan tetap sama. Kalimat baku: "ditemukan tewas", "diperkirakan meninggal antara pukul … dan …".
  - **Batas yang tidak dilanggar.** (1) Kekerasan seksual, termasuk ancaman atau sindiran bernada seksual. (2) Kekerasan terhadap anak: semua korban, pelaku, dan saksi berusia dewasa, dan anak tidak pernah dipakai sebagai sandera atau alat ancaman. (3) Bunuh diri sebagai alat plot, termasuk pembunuhan yang direkayasa seolah bunuh diri. Di Bab 7 (pinjol), penderitaan korban tagihan digambarkan lewat kerugian dan teror penagihan, tidak pernah lewat melukai diri. (4) SARA: motif tidak pernah berbasis suku, agama, ras, atau golongan, dan nama tokoh baik maupun jahat tersebar merata dari berbagai daerah. (5) Tokoh, tempat, atau peristiwa nyata: bencana, pelabuhan, pulau, perusahaan, dan merek semuanya fiktif (mis. "OjekKita", "DompetRia", "Bank Nusa Wiralaga", "PinjamSekejap").
  - **Label konten.** Bab yang memuat kekerasan (Bab 5–8) diberi badge **"Tema Dewasa"** di kartu kasus dan briefing, dengan keterangan satu baris (lihat tabel di akhir §5.2). Bab 4 tidak diberi badge karena tidak ada kekerasan.
  - **Kasus ekonomi/data tetap tulang punggung.** Kekerasan menaikkan taruhan cerita, tetapi buktinya tetap transaksi, log, dan rekaman akses. Ini paling cocok dengan kerja data analyst dan paling kaya pola SQL.
  - **Nada untuk pemain dewasa.** Dialog tajam, moral abu-abu (korban tidak selalu bersih, penyidik pun menyimpan rahasia), pengkhianatan, dan twist berlapis; tidak kekanak-kanakan. Semua NIK, plat, dan nomor HP fiktif dan dicek agar tidak menyerupai tokoh publik.
- **Kekayaan konteks lokal yang sekaligus jadi materi SQL:** NIK 16 digit, kode plat wilayah, WIB/WITA/WIT, rupiah, RT/RW & kelurahan, e-wallet fiktif, ojek online, posko bantuan bencana, kos-kosan, mudik, pasar malam, festival kuliner.
- **Laporan polisi (A4, B2, B7):** di Bab 1–7 laporan **hanya satu nama tersangka**. Informasi pendukung (kaki tangan, rekening, kapal, `device_id`) tetap ditemukan pemain sebagai *temuan step*, bukan isian laporan. **Bab 8 memakai 3 field: Dalang, Perantara 1, Perantara 2.** Slot Dalang harus tepat, dua slot Perantara boleh dalam urutan apa pun, dan laporan benar hanya jika ketiganya benar. Salah ke-1 tidak menyebut berapa nama yang benar, dan aturan salah tuduh bertahap B2 tetap berlaku.

### 5.2 Ringkasan Chapter

| Bab | Judul | Konsep SQL utama | Tabel (perkiraan baris) | Step |
|---|---|---|---|---|
| 1 | Raibnya Batik Tulis Sang Maestro | SELECT, kolom, LIMIT, WHERE, AND/OR, ORDER BY | `laporan_kejadian` (50), `buku_tamu` (1.200), `pegawai_galeri` (40), `penduduk` (2.000) | 7 |
| 2 | Kurir Hantu di Gerbang Tol | LIKE, IN, BETWEEN, IS NULL, DISTINCT, fungsi string, filter waktu | `kendaraan` (8.000), `log_gerbang_tol` (20.000), `laporan_ekspedisi` (300), `penduduk` (10.000) | 8 |
| 3 | Sambal Juara yang Dicuri | INNER JOIN 2–3 tabel, alias, JOIN multi-kondisi | `peserta_lomba`, `kartu_akses`, `log_akses_dapur` (5.000), `cctv_dapur` (3.000), `log_telepon` (15.000), `penduduk` | 8 |
| 4 | Bantuan Banjir yang Tak Pernah Sampai | COUNT/SUM/AVG/MIN/MAX, GROUP BY, HAVING, COUNT DISTINCT, agregat setelah JOIN | `posko_bantuan` (40), `donasi_masuk` (25.000), `penerima_bantuan` (4.000), `penyaluran` (12.000), `rekening` (6.000), `nota_logistik` (1.500), `penduduk` (10.000) | 9 |
| 5 | Alibi Palsu di Kos Mawar | Subquery, EXISTS/NOT EXISTS, LEFT JOIN anti-join, UNION/INTERSECT/EXCEPT | `laporan_kejadian`, `penghuni_kos` (60, + tunggakan), `keterangan_saksi` (40), `akses_gerbang_kos` (10.000), `login_wifi` (40.000), `order_ojekkita` (25.000), `cctv_wiyatapura` (12.000), `transaksi_dompetria` (30.000), `penduduk` | 9 |
| 6 | Selisih Satu Jam di Pelabuhan | CASE WHEN, COALESCE, fungsi tanggal/waktu, zona waktu, CTE | `laporan_kejadian`, `pelabuhan` (+zona waktu), `jadwal_kapal` (2.000), `manifes_penumpang` (30.000), `manifes_kargo` (20.000), `shift_petugas` (3.000), `akses_gudang` (15.000), `cctv_pelabuhan` (18.000), `penduduk` | 10 |
| 7 | Rekening Bayangan Pinjol Gelap | Window function: ROW_NUMBER, RANK, LAG/LEAD, SUM OVER, PARTITION BY | `aduan_warga` (900), `aplikasi_pinjaman` (15.000), `rekening` (20.000), `transaksi` (100.000), `perangkat` (8.000), `log_login` (60.000), `kartu_sim` (20.000), `penduduk` | 10 |
| 8 | Sang Dalang | Self-join, multi-CTE, recursive CTE, INTERSECT, gabungan semua konsep | `arsip_kasus` (7), `log_telepon_besar` (200.000), `bts` (60), `kartu_sim` (25.000), `perangkat_sim` (40.000), `perusahaan` (300), `kepemilikan_perusahaan` (900), `penduduk` (20.000) | 12 |

Total ±73 step. **MVP = Bab 1–3**; bab terbuka berurutan (Bab N+1 setelah Bab N selesai), sedangkan semua sheet di dalam satu bab terbuka sejak awal (A5). Skor maksimum 1.000 per chapter dibagi rata ke step (B5). Misi sampingan opsional (mis. DML) adalah kandidat pasca-MVP.

#### Tabel ringkas 8 bab (final, untuk disalin ke `00-keputusan.md` B4)

| Bab | Judul | Konsep SQL | Step | Tema Dewasa |
|---|---|---|---|---|
| 1 | Raibnya Batik Tulis Sang Maestro | SELECT, WHERE, ORDER BY, LIMIT | 7 | Tidak (pencurian karya seni, tanpa kekerasan) |
| 2 | Kurir Hantu di Gerbang Tol | LIKE, IN, BETWEEN, IS NULL, DISTINCT, fungsi string | 8 | Tidak (pencurian muatan truk, tanpa korban luka) |
| 3 | Sambal Juara yang Dicuri | INNER JOIN 2–3 tabel | 8 | Tidak (pencurian resep, tanpa kekerasan) |
| 4 | Bantuan Banjir yang Tak Pernah Sampai | Agregasi, GROUP BY, HAVING | 9 | Tidak (lebih gelap: penipuan dana korban banjir, tanpa kekerasan) |
| 5 | Alibi Palsu di Kos Mawar | Subquery, NOT EXISTS, anti-join, UNION/EXCEPT | 9 | **Ya** · "Mengandung pembunuhan." |
| 6 | Selisih Satu Jam di Pelabuhan | CASE, fungsi tanggal, CTE | 10 | **Ya** · "Mengandung pembunuhan dan penyelundupan." |
| 7 | Rekening Bayangan Pinjol Gelap | Window function | 10 | **Ya** · "Mengandung pembunuhan dan teror penagihan utang." |
| 8 | Sang Dalang | Self-join, multi-CTE, recursive CTE | 12 | **Ya** · "Mengandung beberapa pembunuhan dan kejahatan terorganisasi." |

Total 73 step. Teks dalam tanda kutip adalah keterangan satu baris yang tampil bersama badge "Tema Dewasa" di kartu kasus dan briefing. Keterangan dalam kurung untuk bab tanpa badge hanya catatan desain, tidak ditampilkan.

### 5.3 Detail per Chapter

#### Bab 1 — Raibnya Batik Tulis Sang Maestro
- **Sinopsis:** Sehari sebelum pameran, kain batik tulis karya maestro fiktif hilang dari Galeri Sekar Arum. CCTV sempat mati 40 menit. Buku tamu digital mencatat semua yang masuk-keluar.
- **Konsep:** tutorial antarmuka, `SELECT *`, pilih kolom, `LIMIT`, `WHERE` teks & angka, `AND`/`OR`, `ORDER BY`.
- **Twist/red herring:** di buku tamu ada **"Budi Santoso"** (kurir paket, keluar lewat pintu depan sebelum CCTV mati) dan **"Budi Santosa"** (pegawai galeri yang seharusnya libur, keluar paling akhir lewat pintu samping). Nama yang nyaris sama menjebak pemain yang membaca sekilas; NIK dan sheet `pegawai_galeri` memastikan siapa yang benar. Nama pelaku **"Budi Santosa" unik** di seluruh dataset chapter; "Budi Santoso" sengaja dibuat nama pasaran (muncul beberapa kali di `penduduk`) — pelajaran bahwa nama tidak bisa jadi kunci, NIK yang bisa.
- **Petunjuk evaluatif bila salah tuduh "Budi Santoso" (B2):** "Orang ini sudah keluar lewat pintu depan sebelum CCTV mati."
- **Laporan:** nama tersangka.

#### Bab 2 — Kurir Hantu di Gerbang Tol
- **Sinopsis:** Truk ekspedisi berisi ponsel baru dibajak. Saksi hanya ingat sebagian plat nomor dan bahwa truk lewat gerbang tol dalam rentang jam tertentu.
- **Konsep:** `LIKE` dengan `%` dan `_`, `IN`, `BETWEEN`, `IS NULL` (kendaraan tanpa pemilik terdaftar), `DISTINCT`, `UPPER`/`REPLACE` untuk plat yang ditulis tidak seragam.
- **Twist:** plat pelaku ternyata milik kendaraan yang **dilaporkan hilang** — pemilik terdaftar bukan pelaku; pemain harus beralih ke log parkir untuk menemukan siapa yang mengemudikan.
- **Red herring:** plat mirip dengan kode wilayah berbeda.
- **Laporan:** nama tersangka.

#### Bab 3 — Sambal Juara yang Dicuri
- **Sinopsis:** Resep rahasia peserta favorit Festival Kuliner Wiralaga bocor ke pesaing sehari sebelum final.
- **Konsep:** `INNER JOIN` dua lalu tiga tabel, alias tabel, JOIN dengan dua kondisi (mis. kartu + rentang waktu).
- **Twist:** kartu akses dapur yang dipakai milik juri, tapi CCTV menunjukkan orang lain — kartu dipinjam. JOIN ke log telepon menghubungkan peminjam kartu dengan pesaing.
- **Red herring:** juri yang anaknya ikut lomba (motif kuat) terbukti berada di panggung.
- **Laporan:** nama pelaku (peminjam kartu). Identitas pemberi perintah terungkap di epilog setelah laporan benar dan menjadi kait ke Bab 8.
- **Misi sampingan (pasca-MVP):** `INSERT` catatan barang bukti ke arsip.

#### Bab 4 — Bantuan Banjir yang Tak Pernah Sampai
- **Label konten:** tanpa badge "Tema Dewasa" karena tidak ada kekerasan. Nadanya lebih gelap dari Bab 1–3: penipuan yang memangsa korban bencana.
- **Sinopsis:** Banjir besar merendam distrik Kembangsari dan ribuan warga mengungsi (tanpa korban jiwa). Posko relawan mengumpulkan donasi miliaran rupiah, tetapi warga mengaku hanya menerima mi instan dan selimut. Koordinator relawan, wajah posko di media lokal, menuding bendahara posko yang kini menghilang.
- **Konsep:** agregat, `GROUP BY`, `HAVING`, `COUNT(DISTINCT)`, agregat setelah JOIN.
- **Twist:** sang pahlawan posko adalah pelakunya. `GROUP BY alamat HAVING COUNT(*) > 20` membuka ratusan "penerima" fiktif yang terdaftar di empat alamat saja. `COUNT(DISTINCT penerima)` per rekening tujuan menunjukkan dana mereka bermuara ke tiga rekening atas nama kerabat koordinator. Potongan "biaya distribusi" juga rutin mengalir ke CV Tirta Arunika.
- **Red herring:** bendahara posko, yang total tarik tunainya terbesar lalu menghilang. `SUM` penarikannya per hari cocok dengan `SUM` nota logistik: ia menalangi belanja saat dana tak kunjung cair, lalu bersembunyi karena takut dijadikan kambing hitam.
- **Benang merah:** donatur perorangan terbesar adalah Anjani Rukmasari, pemilik Galeri Sekar Arum yang melaporkan kehilangan di Bab 1, yang tampil sebagai dermawan. CV Tirta Arunika dan nomor yang rutin menelepon koordinator muncul lagi di Bab 8.
- **Laporan:** nama pelaku (nomor rekening penampung adalah temuan step, bukan isian laporan).

#### Bab 5 — Alibi Palsu di Kos Mawar
- **Tema Dewasa:** ya · "Mengandung pembunuhan."
- **Sinopsis:** Pak Harun Sasmita, pemilik Kos Mawar di Wiyatapura, ditemukan tewas di ruang kantornya di lantai dasar. Laporan forensik hanya memberi perkiraan waktu kematian: pukul 22.00–23.30. Ia dikenal keras (menahan deposit, menagih denda seenaknya), sehingga hampir semua penghuni punya alasan membencinya. Lima penghuni punya urusan dengannya malam itu, dan kelimanya mengaku berada di luar kos. Semua penghuni berusia dewasa (mahasiswa pascasarjana dan pekerja muda).
- **Konsep:** subquery (`IN`, skalar, berkorelasi), `NOT EXISTS`, `LEFT JOIN … IS NULL`, `UNION`/`EXCEPT`.
- **Twist:** alibi yang paling meyakinkan justru palsu. HP seorang penghuni tersambung WiFi sebuah coworking space sepanjang malam, tetapi `NOT EXISTS` tidak menemukan satu pun aktivitas lain atas namanya di sana (CCTV, transaksi DompetRia). Padahal subquery berkorelasi menunjukkan setiap pengguna WiFi lain di jam itu punya minimal satu aktivitas. HP-nya sengaja ditinggal. `EXCEPT` (semua tersangka dikurangi yang keberadaannya terbukti dari ≥2 sumber) menyisakan satu nama.
- **Red herring:** penghuni dengan tunggakan terbesar mengaku pulang naik OjekKita, dan anti-join membuktikan tidak ada ordernya. Ia memang berbohong: malam itu ia menarik ojek pangkalan, pekerjaan sampingan yang ia sembunyikan. `UNION` semua sumber keberadaan menunjukkan ia terekam CCTV minimarket di pangkalan sepanjang jendela waktu. Pelajarannya: berbohong tidak sama dengan membunuh.
- **Benang merah:** Pak Harun memergoki pelaku memotret arsip salinan KTP penghuni, data yang kelak dipakai membuka rekening bayangan di Bab 7. Nomor yang menghubungi pelaku sehari sebelum dan satu jam sesudah malam itu muncul lagi di Bab 8.
- **Laporan:** nama pelaku. (Bukti yang membantah alibi cukup disimpan pemain di Buku Catatan; tidak diminta di laporan.)

#### Bab 6 — Selisih Satu Jam di Pelabuhan
- **Tema Dewasa:** ya · "Mengandung pembunuhan dan penyelundupan."
- **Sinopsis:** Di puncak arus mudik antarpulau, seorang petugas pemeriksa kargo Pelabuhan Baruna ditemukan tewas di gudang kontainer, sehari setelah ia menahan satu kontainer "kopi spesial". Pagi harinya kontainer itu keluar pelabuhan dengan dokumen yang sudah diteken ulang. Semua tersangka mengaku masih di atas kapal pada jam kematian.
- **Konsep:** `CASE WHEN`, `COALESCE`, fungsi tanggal/waktu, aritmetika durasi, **CTE** untuk menyusun kronologi.
- **Twist:** jadwal kapal dari Pulau Lunggara (fiktif, zona WITA) dicatat dalam waktu lokal pelabuhan asal, sedangkan CCTV dan kartu akses gudang Pelabuhan Baruna memakai WIB. Setelah dikonversi dengan `CASE` per zona, kapal yang ditumpangi seorang agen forwarder ternyata sandar satu jam lebih awal dari "alibi berlayar"-nya. CTE kronologi (kedatangan terkonversi + CCTV gerbang + akses gudang) menempatkannya di area gudang saat kartu akses milik korban dipakai membuka kontainer, 20 menit setelah perkiraan waktu kematian.
- **Red herring:** buruh bongkar muat yang bertengkar hebat dengan korban siang itu (motif kuat). `CASE` untuk memetakan shift dan `COALESCE` untuk jam keluar yang kosong menunjukkan ia bertugas di terminal penumpang sepanjang malam. Jebakan datanya: pemain yang lupa mengonversi zona waktu akan mengira pelaku masih di laut.
- **Benang merah:** isi kontainer ternyata benda seni curian, termasuk batik tulis dari Bab 1. Forwarder-nya, PT Lintas Baruna Logistik, adalah perusahaan cangkang yang ditelusuri di Bab 8.
- **Laporan:** nama pelaku (nama kapal dan nomor kontainer adalah temuan step).

#### Bab 7 — Rekening Bayangan Pinjol Gelap
- **Tema Dewasa:** ya · "Mengandung pembunuhan dan teror penagihan utang."
- **Sinopsis:** Ratusan warga Niagaraya menerima tagihan dari aplikasi pinjaman ilegal PinjamSekejap untuk pinjaman yang tak pernah mereka ajukan, disusul teror penagihan ke seluruh kontak mereka. Data mereka disalahgunakan untuk membuka rekening bayangan. Seorang analis data internal PinjamSekejap diam-diam menghubungi DID dan berjanji menyerahkan bukti, tetapi tidak pernah datang. Ia ditemukan tewas di mobilnya di lahan parkir gudang kosong, dengan perkiraan waktu kematian pukul 21.00–22.30. Sejak briefing, kematiannya jelas disebut pembunuhan.
- **Konsep:** `ROW_NUMBER`, `RANK`, `LAG`/`LEAD` (jeda antar-kejadian), `SUM() OVER` (saldo berjalan), `PARTITION BY`.
- **Twist:** akun kerja korban masih login pukul 23.40, setelah ia meninggal, dan menghapus ribuan baris log. `LAG`/`LEAD` pada `log_login` (`PARTITION BY` akun) menyingkap sesi "hantu" itu, dan `device_id`-nya sama dengan perangkat yang login ke puluhan rekening bayangan. Pola "uang masuk lalu keluar < 5 menit" (`LAG`) dan saldo berjalan (`SUM() OVER`) memastikan perangkat itu milik operator.
- **Red herring:** (1) rekening dengan volume terbesar (peringkat 1 di `RANK`) ternyata toko grosir sah, dengan jeda antar-transaksi yang wajar; (2) atasan korban yang bertengkar dengannya sore itu. `ROW_NUMBER` atas sesi dan transaksinya menunjukkan rangkaian aktivitas tanpa putus di acara kantor di distrik lain sepanjang jendela waktu.
- **Batas konten:** penderitaan korban tagihan digambarkan lewat ringkasan `aduan_warga` (kerugian, rasa takut, kontak yang diteror), tanpa kutipan ancaman utuh. Bab ini tidak menyinggung melukai diri atau bunuh diri sama sekali.
- **Benang merah:** sebagian rekening bayangan dibuka dengan KTP curian dari Kos Mawar (Bab 5). Operator menerima perintah dari nomor yang sama dengan pelaku Bab 5 dan Bab 6. Induk usaha PinjamSekejap, PT Sekejap Dana Niaga, ditelusuri di Bab 8.
- **Nilai edukasi tambahan:** literasi digital — cara kerja penyalahgunaan data pribadi (semua data fiktif).
- **Laporan:** nama operator (`device_id` adalah temuan step).

#### Bab 8 — Sang Dalang
- **Tema Dewasa:** ya · "Mengandung beberapa pembunuhan dan kejahatan terorganisasi."
- **Sinopsis:** Malam sebelum bersaksi, koordinator relawan dari Bab 4, yang setuju menjadi saksi pelaku yang bekerja sama, ditemukan tewas di rumah aman DID di Wiralaga Tengah. Lokasi rumah aman hanya diketahui tim. Log operator seluler menunjukkan nomor Gilang menelepon nomor asing malam itu. Bu Laras membekukan akses Gilang dan menyerahkan seluruh arsip Bab 1–7 kepada pemain. Nomor telepon dan perusahaan cangkang yang muncul samar di tiap kasus ternyata satu jaringan: pencurian dan penipuan membiayai, pembunuhan membungkam. Siapa di puncaknya, dan siapa dua tangan kanannya?
- **Konsep:** self-join (estafet telepon, "ponsel kembar", SIM kloning, IMEI bersama), multi-CTE, **recursive CTE** (rantai estafet dan rantai kepemilikan perusahaan), `INTERSECT`, gabungan window + subquery.
- **Twist:** Dalang adalah **Anjani Rukmasari**, pemilik Galeri Sekar Arum yang melaporkan kehilangan di Bab 1 dan donatur terbesar dana banjir di Bab 4 — tokoh netral yang terlihat sejak awal. Ia tidak pernah menelepon pelaku mana pun. Perintah turun lewat dua perantara yang membagi wilayah: **Satria Pranadipa** (Perantara 1, kasus harta Bab 1–4; ia juga "pemberi perintah" yang namanya terungkap di epilog Bab 3) dan **Rizal Hadinata** (Perantara 2, kasus pembungkaman Bab 5–7 serta malam kematian saksi). Jaringan ini yang memerintahkan kematian di Bab 5, 6, dan 7.
- **Red herring (3, sesuai batas bab akhir):**
  1. **Heru Gunadi**, "calo" yang nomornya menyentuh pelaku di ketujuh bab. Self-join estafet menunjukkan setiap kontaknya diteruskan ke hotline DID: ia informan Bu Laras, yang selama ini merahasiakannya dari tim (moral abu-abu).
  2. **Gilang.** Nomornya aktif di dua distrik berjauhan dalam 3 menit yang sama: SIM-nya dikloning jaringan untuk menyadap lokasi rumah aman sekaligus menjebaknya.
  3. **Wagino Prasetyo**, sopir galeri yang tercatat sebagai direktur perusahaan pemegang nomor puncak. Ia direktur di atas kertas tanpa saham; rantai kepemilikan harus ditelusuri sampai pemilik mayoritas terakhir.
- **Catatan UX:** selama Gilang dibekukan (step 1–7), panel Bantuan "ditulis" oleh Bu Laras. Gilang kembali setelah dibersihkan di step 7.
- **Laporan (A6, B7):** form 3 field **Dalang**, **Perantara 1**, **Perantara 2**. Jawaban: Dalang = Anjani Rukmasari; Perantara = Satria Pranadipa dan Rizal Hadinata (urutan bebas). Laporan benar hanya jika ketiganya benar. Salah ke-1 hanya menampilkan alert B2 tanpa menyebut berapa nama yang benar.

**Rincian step Bab 8 (12 step):**

| # | Objektif pemain | Konsep | Inti query referensi | Temuan/kait |
|---|---|---|---|---|
| 1 | Kumpulkan nomor HP dan tanggal kejadian pelaku Bab 1–7 | Pemanasan: `SELECT`, `ORDER BY` | `SELECT bab, nama_pelaku, nomor_hp, tanggal_kejadian FROM arsip_kasus ORDER BY bab;` | 7 nomor pelaku |
| 2 | Nomor mana yang berhubungan dengan pelaku di ≥3 bab berbeda? | CTE, `UNION`, `COUNT(DISTINCT)`, `HAVING` | CTE `kontak` (panggilan masuk dan keluar tiap nomor pelaku) → `GROUP BY nomor HAVING COUNT(DISTINCT bab) >= 3` | Tepat 3 nomor: N-A, N-B, N-C |
| 3 | Bab mana yang disentuh tiap nomor, dan kapan relatif terhadap kejadian? | Multi-CTE, `CASE`, fungsi tanggal | CTE `kontak` → CTE `selisih` (`julianday(waktu) - julianday(tanggal_kejadian)`) → `CASE WHEN selisih < 0 THEN 'sebelum' ELSE 'sesudah' END` | N-A: Bab 1–7 tanpa pola waktu. N-B: Bab 1–4, N-C: Bab 5–7, selalu 1–3 hari sebelum dan ≤2 jam sesudah kejadian (pola "perintah" dan "lapor") |
| 4 | Ke mana ketiga nomor meneruskan kabar? | Self-join (estafet ≤10 menit) | `log_telepon_besar a JOIN log_telepon_besar b ON b.nomor_asal = a.nomor_tujuan AND b.waktu BETWEEN a.waktu AND datetime(a.waktu, '+10 minutes')` | N-A selalu meneruskan ke hotline DID (informan, red herring 1). N-B dan N-C meneruskan ke nomor sekali pakai: rantai belum berakhir |
| 5 | Siapa pemegang N-B? | Self-join `perangkat_sim` (IMEI sama, nomor beda) | Lihat query P1 di bawah | N-B terdaftar atas KTP curian salah satu korban Bab 7, tetapi ponsel yang sama pernah memuat SIM atas NIK **Satria Pranadipa** → Perantara 1 |
| 6 | Siapa pemegang N-C? | Self-join "ponsel kembar" (BTS sama, ≤5 menit) | Lihat query P2 di bawah | Satu nomor pribadi selalu berpindah BTS bersama N-C, terdaftar atas **Rizal Hadinata** → Perantara 2. N-C juga tercatat di BTS dekat rumah aman pada malam kematian saksi |
| 7 | Benarkah Gilang membocorkan rumah aman? | Self-join (nomor sama, BTS beda distrik, ≤3 menit) | `… ON a.nomor_asal = b.nomor_asal AND a.id < b.id AND b.waktu BETWEEN a.waktu AND datetime(a.waktu, '+3 minutes')` + JOIN `bts` dua kali, `WHERE ba.distrik <> bb.distrik` | Nomor Gilang aktif di dua tempat sekaligus → SIM dikloning (red herring 2). Gilang kembali ke tim |
| 8 | Ke mana rantai estafet N-B dan N-C bermuara? | Recursive CTE atas sisi estafet (CTE dari step 4) | CTE `estafet(dari, ke)` → `WITH RECURSIVE naik(nomor, level)` mulai dari N-B dan N-C, batas `level < 6` | Rantai 2–3 lapis dari kedua perantara bermuara di satu nomor **X** yang tidak pernah meneruskan kabar ke siapa pun. X terdaftar atas **PT Cahaya Arunika Sentosa** |
| 9 | Siapa pemilik sebenarnya PT Cahaya Arunika Sentosa? | Recursive CTE kepemilikan (mayoritas >50%) + pengaman siklus | Lihat query Dalang di bawah (satu titik awal) | PT Cahaya Arunika Sentosa → PT Pilar Tujuh Samudra → PT Anggrek Delapan → **Anjani Rukmasari**. Direktur tercatat (Wagino Prasetyo) bukan pemilik (red herring 3). Kepemilikan silang 10% antara dua CV menjebak query tanpa filter mayoritas atau batas level |
| 10 | Konfirmasi: siapa pemilik akhir semua cangkang di Bab 4, 6, dan 7? | Multi-CTE + recursive CTE + `INTERSECT` | Lihat query Dalang di bawah (empat titik awal) | Hanya **Anjani Rukmasari**: tiga jalur uang yang independen bertemu di orang yang sama dengan pemilik X |
| 11 | Studi kasus kerja: berkas perkara ringkas untuk Bu Laras | Multi-CTE + window (`SUM() OVER (ORDER BY bab)`, `ROW_NUMBER`) | Per bab: pelaku, perantara, cangkang terkait, dan kerugian berjalan dari `arsip_kasus` (kolom `cangkang_terkait`, `nilai_kerugian`) | Menegaskan pembagian wilayah (Bab 1–4 / Bab 5–7) dan aliran dana ke puncak |
| 12 | Ajukan laporan 3 nama | — | Form B7: Dalang, Perantara 1, Perantara 2 | Benar → epilog + animasi penangkapan; salah → alert B2 |

**Query referensi untuk ketiga nama** (nomor dalam `'<…>'` diisi dari temuan step sebelumnya; query alternatif yang hasilnya sama juga lolos validator):

```sql
-- P1 (step 5): siapa lagi yang memakai ponsel pemegang N-B?
SELECT DISTINCT p.nama, p.nik
FROM perangkat_sim a
JOIN perangkat_sim b ON b.imei = a.imei AND b.nomor <> a.nomor
JOIN kartu_sim k     ON k.nomor = b.nomor
JOIN penduduk p      ON p.nik = k.nik_terdaftar
WHERE a.nomor = '<N-B>';

-- P2 (step 6): nomor yang selalu "berjalan bersama" N-C
SELECT k.nomor, p.nama, COUNT(*) AS kali_bersama, COUNT(DISTINCT a.bts_id) AS jml_bts
FROM log_telepon_besar a
JOIN log_telepon_besar b
  ON b.bts_id = a.bts_id
 AND b.nomor_asal <> a.nomor_asal
 AND b.waktu BETWEEN datetime(a.waktu, '-5 minutes') AND datetime(a.waktu, '+5 minutes')
JOIN kartu_sim k ON k.nomor = b.nomor_asal
JOIN penduduk p  ON p.nik = k.nik_terdaftar
WHERE a.nomor_asal = '<N-C>'
GROUP BY k.nomor, p.nama
HAVING COUNT(*) >= 10 AND COUNT(DISTINCT a.bts_id) >= 5;

-- Dalang (step 9–10): pemilik mayoritas akhir dari perusahaan pemegang X dan cangkang Bab 4, 6, 7
WITH RECURSIVE
awal AS (
  SELECT nama AS asal, id AS perusahaan_id FROM perusahaan
  WHERE nama IN ('PT Cahaya Arunika Sentosa', 'CV Tirta Arunika',
                 'PT Lintas Baruna Logistik', 'PT Sekejap Dana Niaga')
),
naik(asal, pemilik_tipe, pemilik_id, level) AS (
  SELECT a.asal, k.pemilik_tipe, k.pemilik_id, 1
  FROM awal a JOIN kepemilikan_perusahaan k ON k.perusahaan_id = a.perusahaan_id
  WHERE k.persen > 50
  UNION ALL
  SELECT n.asal, k.pemilik_tipe, k.pemilik_id, n.level + 1
  FROM naik n JOIN kepemilikan_perusahaan k
    ON n.pemilik_tipe = 'perusahaan' AND k.perusahaan_id = n.pemilik_id
  WHERE k.persen > 50 AND n.level < 10          -- pengaman siklus
),
akhir AS (
  SELECT DISTINCT n.asal, p.nama
  FROM naik n JOIN penduduk p ON n.pemilik_tipe = 'orang' AND p.nik = n.pemilik_id
)
SELECT nama FROM akhir WHERE asal = 'PT Cahaya Arunika Sentosa'
INTERSECT SELECT nama FROM akhir WHERE asal = 'CV Tirta Arunika'
INTERSECT SELECT nama FROM akhir WHERE asal = 'PT Lintas Baruna Logistik'
INTERSECT SELECT nama FROM akhir WHERE asal = 'PT Sekejap Dana Niaga';
-- Alternatif yang juga lolos: SELECT nama FROM akhir GROUP BY nama HAVING COUNT(DISTINCT asal) = 4;
```

**Jalur bukti per nama:**

| Slot | Nama | Jalur bukti utama | Jalur bukti kedua (independen) | Jebakan yang harus dibantah |
|---|---|---|---|---|
| Dalang | Anjani Rukmasari | Puncak semua rantai estafet adalah X (step 8, recursive CTE); pemilik mayoritas akhir perusahaan pemegang X (step 9, recursive CTE) | Irisan pemilik akhir cangkang Bab 4, 6, dan 7 (step 10, multi-CTE + `INTERSECT`) | Wagino Prasetyo (direktur boneka), Heru Gunadi (informan), dan kedua perantara yang terlihat "berkuasa" |
| Perantara 1 | Satria Pranadipa | N-B menyentuh pelaku Bab 1–4 dengan pola perintah/lapor (step 2–3, CTE) | IMEI N-B pernah memuat SIM atas NIK-nya (step 5, self-join) | Ditaruh di slot Dalang (step 4 dan 8 membuktikan ia meneruskan kabar ke atas); pemilik KTP curian yang dipakai N-B; nama mirip "Satria Pradipta" |
| Perantara 2 | Rizal Hadinata | N-C menyentuh pelaku Bab 5–7 dengan pola yang sama (step 2–3) | Nomor pribadinya "berjalan bersama" N-C di ≥5 BTS, termasuk dekat rumah aman pada malam kematian saksi (step 6, self-join) | Gilang (SIM kloning, step 7) |

**Aturan build untuk ketiga nama (B7):**
- Tiap nama jawaban `COUNT(*) = 1` di setiap sheet yang memuat nama, dan ketiganya punya NIK berbeda. "Satria Pradipta" sengaja dibuat nama pasaran (≥3 orang di `penduduk`), seperti pola "Budi Santoso" di Bab 1.
- Tiap jalur bukti punya query referensi di CI yang menghasilkan **tepat satu** nama. Query "hampir benar" harus gagal dengan diagnosis Asisten Otomatis, mis. berhenti di direktur, tanpa batas level rekursi, atau lupa `b.nomor <> a.nomor` (hasilnya pemilik KTP curian).
- Tidak ada satu sheet pun yang bisa dipakai sendirian untuk menemukan salah satu dari tiga nama (§2.2).
- `log_telepon_besar` hanya mencakup periode sebelum penangkapan tiap pelaku, sehingga nomor resmi DID tidak ikut lolos filter step 2. Generator juga memastikan nomor jaringan tidak punya sisi estafet ke nomor warga biasa, sehingga rekursi step 8 tetap kecil dan berujung di X.
- Indeks `(nomor_asal, waktu)`, `(nomor_tujuan)`, `(bts_id, waktu)`, `(imei)`, dan `(perusahaan_id)` disiapkan di DB kasus agar query referensi selesai < 2 detik di laptop kelas menengah (SQLite WASM).

**Petunjuk evaluatif salah ke-2 (B7, membahas satu nama yang keliru):**
- Perantara ditaruh di slot Dalang: "Nama di slot Dalang selalu meneruskan kabar ke nomor lain. Ia bukan puncak rantai."
- Heru Gunadi: "Salah satu nama di laporanmu selalu meneruskan kabar ke hotline DID."
- Gilang: "Salah satu nama di laporanmu memakai nomor yang aktif di dua distrik berjauhan dalam 3 menit yang sama."
- Wagino Prasetyo: "Salah satu nama di laporanmu hanya direktur di atas kertas. Ia tidak memegang saham di perusahaan mana pun."
- Pemilik KTP curian: "Salah satu nama di laporanmu adalah korban pencurian identitas. KTP-nya dipakai orang lain."
- Pelaku Bab 1–7: "Salah satu nama di laporanmu menerima perintah, bukan memberinya."
- "Satria Pradipta": "Salah satu nama di laporanmu tidak pernah memegang ponsel yang terhubung ke jaringan ini. Periksa NIK-nya."

### 5.4 Contoh Rincian Step (Bab 1)

| # | Objektif pemain | Konsep | Contoh query referensi | Temuan/kait |
|---|---|---|---|---|
| 1 | Lihat isi arsip laporan | `SELECT *`, `LIMIT` | `SELECT * FROM laporan_kejadian LIMIT 10;` | Mengenal kolom tanggal, lokasi, deskripsi |
| 2 | Temukan laporan kasus galeri | `WHERE` + `AND` | `SELECT * FROM laporan_kejadian WHERE tanggal = '2025-06-14' AND lokasi = 'Galeri Sekar Arum';` | CCTV mati 21.00–21.40; saksi melihat orang keluar lewat pintu samping |
| 3 | Lihat pengunjung hari itu (hanya kolom penting) | Pilih kolom | `SELECT nama, nik, jam_masuk, jam_keluar, pintu FROM buku_tamu WHERE tanggal = '2025-06-14';` | ±180 baris — terlalu banyak (dorongan untuk memfilter) |
| 4 | Persempit ke pintu samping & jam kejadian | `AND`, perbandingan | `… AND pintu = 'samping' AND jam_keluar BETWEEN …` *(atau `>=` dan `<=`)* | 6 orang |
| 5 | Siapa yang terakhir keluar? | `ORDER BY … DESC`, `LIMIT` | `… ORDER BY jam_keluar DESC LIMIT 3;` | Muncul "Budi Santoso" dan "Budi Santosa" — nama nyaris sama, NIK berbeda |
| 6 | Pastikan identitas lewat NIK | `WHERE` + `OR` | `SELECT nama, nik, jabatan, jadwal_hari_ini FROM pegawai_galeri WHERE nik = '…' OR nik = '…';` | Hanya **Budi Santosa** yang pegawai galeri, dan hari itu jadwalnya libur; Budi Santoso tidak ada di daftar pegawai (kurir) |
| 7 | Ajukan laporan polisi | — | Form: Nomor Kasus (otomatis) + Nama Tersangka | Benar ("Budi Santosa") → animasi penangkapan; salah → alert B2 |

Validasi tiap step: kolom kunci ada, jumlah baris sesuai (±toleransi), baris target termasuk; step 5 juga memeriksa urutan. Temuan step 6 otomatis masuk Buku Catatan **dengan ejaan nama yang persis**, sehingga pemain yang teliti tidak dirugikan oleh kemiripan nama. Semua sheet (`laporan_kejadian`, `buku_tamu`, `pegawai_galeri`, `penduduk`) terlihat sejak step 1; narasi tiap step yang mengarahkan sheet mana yang dipakai. Tombol "Ajukan Laporan" tersedia sejak awal, tetapi step yang dilewati tidak memberi poin (B2).

---

## 6. Peluang Diferensiasi Pasar Indonesia

Target (A1): **mahasiswa, calon data analyst, dan gamer** penyuka misteri/puzzle. Model (A3): **gratis penuh**, biaya operasional ≈ Rp0.

### 6.1 Pembeda Inti

1. **Bahasa Indonesia penuh — celah yang nyata.** Game detektif SQL populer (SQL Noir, Knight Lab, Database Detective) berbahasa Inggris; Database Detective dijual dalam rupiah di Steam tetapi UI-nya tetap Inggris. Kata kunci SQL tetap bahasa Inggris, namun narasi, error, Buku Saku, dan glosarium berbahasa Indonesia.
2. **Gratis penuh tanpa paywall.** Pesaing yang paling rapi memasang paywall (SQL Noir: lisensi sekali bayar; SQLPD: ±US$20/6 bulan; Database Detective: Rp 72.499). "Semua bab gratis, main tanpa login" adalah pesan pemasaran yang kuat dan mudah disebarkan. Akun di v1 hanya opsional untuk sinkronisasi dan leaderboard (B8), jadi pesan ini tetap utuh.
3. **Konteks lokal yang sekaligus mengajar.** Format NIK & plat nomor untuk `LIKE`, WIB/WITA/WIT untuk fungsi waktu, posko donasi bencana & e-wallet untuk agregasi, ojek online untuk anti-join — relevansi yang tidak dimiliki game Barat.
4. **Cerita untuk orang dewasa.** Nada tajam, twist berlapis, dan benang merah "Sang Dalang" lintas 8 bab, dengan tema yang makin gelap secara bertahap: bab pembuka non-kekerasan, pembunuhan mulai Bab 5 dengan badge "Tema Dewasa", dan Bab 8 sebagai puncak (B6). Ini menjawab keluhan "terlalu pendek" (Knight Lab) dan menarik bagi gamer misteri, bukan hanya pelajar. Game SQL "ramah sekolah" (CS++) sengaja tidak masuk ke wilayah ini, sementara SQL Noir dan Knight Lab sudah membuktikan bahwa kasus pembunuhan diminati.

### 6.2 Untuk Calon Data Analyst

Kebutuhan talenta digital Indonesia tinggi (perkiraan kesenjangan jutaan talenta hingga 2030; SQL disebut dibutuhkan di sebagian besar lowongan data analyst menurut DQLab). Fitur yang membuat game terasa "berguna untuk karier":

5. **Step bergaya studi kasus kerja nyata** (§3.3): permintaan rekap/analisis dari Gilang atau Bu Laras yang mirip soal tes SQL data analyst, tetapi hasilnya tetap jadi petunjuk kasus.
6. **Catatan dialek PostgreSQL/MySQL/BigQuery** di Buku Saku (§3.4) — menjembatani SQLite di game dengan engine yang dipakai di tempat kerja; juga membantu mahasiswa yang belajar MySQL (XAMPP) di kampus.
7. **Portofolio query yang bisa diekspor.** Buku Catatan bisa diekspor sebagai `.sql` berkomentar (terinspirasi `log.sql` Fiftyville) dan/atau Markdown berisi query + ringkasan temuan, siap diunggah ke GitHub sebagai bukti latihan.
8. **Peta keterampilan.** Ringkasan konsep yang sudah dikuasai per bab (terinspirasi "Detective Dossier" SQL Noir Devgarh), bisa ditampilkan di kartu hasil.

### 6.3 Untuk Gamer

9. **Achievement & lencana** (mis. "Satu Tembakan", "Tanpa Petunjuk", "Tak Pernah Salah Tuduh") dan **waktu penyelesaian** yang ditampilkan (tidak memengaruhi skor di MVP — B5), cocok untuk komunitas speedrun/kompetisi santai. Di v1, waktu menjadi penentu seri di leaderboard per bab (butir 17).
10. **Replay per step/chapter** (keluhan Database Detective) dan cerita bercabang kecil di epilog tiap bab.

### 6.4 Strategi Pertumbuhan Tanpa Monetisasi

11. **Kartu hasil kasus tanpa spoiler** (skor, waktu, jumlah petunjuk, lencana, bab, dan peringkat leaderboard bila pemain ikut) untuk dibagikan ke X, Instagram, LinkedIn, dan TikTok — satu klik, dengan tautan ke game.
12. **Komunitas.** Server Discord/grup Telegram untuk diskusi tanpa spoiler (kanal terpisah per bab), kolaborasi dengan komunitas data & himpunan mahasiswa, dan sesi "main bareng" daring.
13. **Kasus buatan komunitas (pasca-MVP).** Format kasus terbuka (satu DB + satu cerita, seperti ajakan pembuat SQL Noir) sehingga komunitas bisa menyumbang kasus; kurasi tetap oleh tim.
14. **Konten kreator & streamer.** Game detektif cocok untuk siaran langsung; sediakan "mode streamer" yang menyembunyikan jawaban referensi dan menampilkan tampilan editor yang besar.
15. **SEO & artikel edukasi berbahasa Indonesia** (mis. "belajar JOIN lewat kasus detektif") yang menautkan ke bab terkait.
16. **Rilis bertahap bab** (MVP Bab 1–3, lalu Bab 4–8) sebagai momen pengumuman berulang; event bertema netral (mis. HUT RI 17 Agustus, Hari Batik Nasional) yang hanya dikaitkan dengan bab tanpa badge "Tema Dewasa".
17. **Leaderboard per bab & akun opsional (v1 — A7, B8), tetap gratis.**
    - **Main tetap tanpa login.** Progres dan Buku Catatan tersimpan di browser. Login (Google saja lewat Supabase Auth, A9) hanya untuk sinkronisasi antar-perangkat dan ikut leaderboard.
    - **Satu papan per bab:** skor tertinggi, lalu waktu sebagai penentu seri (waktu tetap tidak menambah skor, B5). Bab 8 masuk papan hanya bila ketiga nama benar.
    - **Dua tab: "Semua" dan "Tanpa Bantuan".** Tab "Tanpa Bantuan" berisi penyelesaian tanpa membuka Petunjuk apa pun. Usulan riset: Petunjuk 1 yang gratis pun dihitung sebagai bantuan, sedangkan Asisten Otomatis dan Buku Saku tidak (keduanya selalu tersedia bagi semua orang). Ini menjawab trade-off §4.3: penalti petunjuk tidak perlu diperberat demi keadilan papan, dan pemain yang memakai petunjuk tidak "dihukum" dua kali.
    - **Nama tampilan opt-in.** Pemain memilih nama tampilan sendiri dan baru muncul di papan setelah menyetujuinya secara eksplisit; default-nya tidak tampil. Ini menjawab keluhan Lost at SQL yang memasang skor tanpa izin. Nama tampilan disaring dari kata kasar dan ujaran SARA, dan bisa dilaporkan.
    - **Anti-curang:** skor dihitung ulang di server (Edge Function menjalankan ulang jawaban), bukan dipercaya dari browser.
    - **Tetap gratis:** Supabase free tier + ping keep-alive terjadwal yang gratis (GitHub Actions atau Cloudflare Workers cron). Bila kuota habis, fitur online dimatikan sementara dan game tetap bisa dimainkan offline. Tidak ada upgrade berbayar, iklan, atau hadiah uang.
    - **Nilai pertumbuhan:** papan per bab memberi alasan untuk replay (butir 10), bahan tantangan bagi konten kreator/streamer (butir 14), dan bahan obrolan komunitas (butir 12) tanpa monetisasi.

### 6.5 Hal Lain

18. **Literasi digital & privasi.** Kasus pinjol, penipuan dana bencana, dan penyalahgunaan data pribadi relevan dengan isu sehari-hari; sertakan catatan singkat soal perlindungan data pribadi (UU PDP) dan penegasan bahwa semua data fiktif.
19. **Perangkat — desktop-first (A2).** MVP menargetkan lebar layar ≥1024 px; di bawahnya tampil layar "Detektif SQL paling nyaman dimainkan di laptop atau PC" dengan tombol "Tetap Lanjutkan". Desain mobile ditunda (pasca-MVP, opsional). Data pendukung: Statcounter (Agustus 2026) mencatat page view Indonesia 60,6% desktop vs 39,0% mobile (angka berfluktuasi), dan menulis query jauh lebih nyaman dengan keyboard fisik — sesuai kebiasaan mahasiswa & analis yang bekerja di laptop.
20. **Ringan & bisa offline.** SQL berjalan di browser (SQLite WASM ±400 KB gzip) sehingga hosting statis gratis cukup dan game tetap jalan di koneksi lambat.
21. **Mode kelas untuk dosen — prioritas rendah (v2).** Kode kelas, dasbor progres & penggunaan petunjuk, ekspor nilai, pelaku diacak per mahasiswa (CS++). Pemetaan ke CP SMK tidak lagi prioritas.

### 6.6 Rekomendasi v1 yang Tidak Dipakai (karena keputusan A1/A3)

- ~~Freemium (Bab 1–2 gratis, sisanya berbayar), pembayaran e-wallet/QRIS, harga institusi~~ → digantikan "gratis penuh" (A3).
- ~~Kemitraan B2B/B2G & lisensi institusi~~ → tidak ada lisensi (A3); kolaborasi dengan komunitas/kampus tetap boleh selama gratis.
- ~~Mode Kelas SMK sebagai prioritas, LKPD, pemetaan CP SMK~~ → target dewasa (A1); mode kelas untuk dosen menjadi v2.
- ~~Responsif penuh untuk HP dengan "chip" kata kunci~~ → desktop-first (A2); chip kata kunci ala SQLPD hanya relevan bila desain mobile dibuat kelak.
- ~~Sertifikat berbasis pangkat~~ → diganti kartu hasil & portofolio yang bisa dibagikan. Akun v1 (B8) hanya untuk sinkronisasi dan leaderboard; sertifikat terverifikasi tetap tidak diprioritaskan.

---

## 7. Implikasi Teknis dari Riset

| Keputusan | Rekomendasi | Alasan dari riset |
|---|---|---|
| Engine SQL | SQLite WASM (resmi atau sql.js) di browser | Ringan, dipakai RayArena/CS++; mendukung window function & CTE; PGlite (Postgres) & DuckDB-WASM lebih berat |
| Data kasus | Generator data ber-seed + baris cerita "tertanam" yang ditulis manual; cek otomatis bahwa nama pelaku unik | Dataset besar tanpa file raksasa; syarat B2 (nama pelaku unik); pengacakan pelaku per mahasiswa tetap mungkin untuk mode kelas v2 |
| Validasi step | Berbasis hasil (kolom kunci, jumlah baris, urutan bila perlu, baris target) | Teks SQL bebas; `SELECT *` tidak lolos step filter |
| Jawaban akhir | Hanya **nama** (Bab 8: 3 slot Dalang/Perantara 1/Perantara 2, slot Perantara urutan bebas, semua-atau-tidak — B7); dinormalisasi (huruf besar/kecil, spasi, tanda baca) lalu dicocokkan dengan hash; tanpa autocomplete nama | Mencegah bocor via `sqlite_master`; label field "Nama Tersangka" yang eksplisit menjawab ambiguitas "nama atau ID" di SQL Noir (A4, B2) |
| Akses sheet | Semua sheet chapter terbuka & ada di autocomplete sejak awal; authorizer memblokir `sqlite_*` dan semua operasi selain baca | A5 dan turunan teknis C |
| Hosting & akun | Situs statis (free tier). v1: Supabase free tier untuk login opsional, sinkronisasi, dan leaderboard; ping keep-alive terjadwal gratis; bila kuota habis, fitur online mati sementara dan game tetap jalan offline | A3, A7, B8 — biaya ≈ Rp0 |
| Leaderboard | Per bab; skor dihitung ulang di server (Edge Function menjalankan ulang jawaban); tab "Tanpa Bantuan"; nama tampilan opt-in + filter nama | Keluhan Lost at SQL (skor dipasang tanpa izin); skor lokal mudah dipalsukan lewat devtools |
| Label konten | Metadata bab memuat status kekerasan + keterangan satu baris; badge "Tema Dewasa" dirender otomatis di kartu kasus & briefing | B6 |
| Query rekursif | Batas waktu/iterasi eksekusi (mis. progress handler SQLite) agar recursive CTE tanpa pengaman tidak membekukan tab; Asisten Otomatis menjelaskan "rekursi tidak berhenti — tambahkan batas level" | Jebakan kepemilikan silang di Bab 8 (§5.3) |
| Batas hasil | Tampilkan maks. ±100 baris + total | Pola Her Story; mencegah baca manual |
| Editor | Dukungan komentar `--`, multi-statement, riwayat query, pintasan keyboard, autocomplete yang tidak agresif | Keluhan SQL Noir & Lost at SQL |
| Layout | Desktop ≥1024 px: objektif + skema + editor + hasil terlihat bersamaan | Keluhan "bolak-balik tab"; A2 |
| Buku Catatan | Pin hasil query (snapshot tabel + query + waktu + label), catatan bebas, papan tersangka (dicurigai/tereliminasi), ekspor `.sql`/Markdown sebagai portofolio | Fiftyville `log.sql`, notes SQL Noir, permintaan "salin ke catatan"; kebutuhan calon data analyst (§6.2) |
| Penyimpanan | Auto-save + deteksi storage gagal (mode private) dengan peringatan jelas | Keluhan Lost at SQL |
| Replay | Setiap step/chapter bisa diulang | Keluhan Database Detective |

---

## 8. Sumber

**Game & dokumentasi resmi**
- SQL Murder Mystery — https://mystery.knightlab.com/ · walkthrough: https://mystery.knightlab.com/walkthrough.html · repo: https://github.com/NUKnightLab/sql-mysteries
- CS50 Fiftyville — https://cs50.yale.edu/2024/summer/psets/6/fiftyville/ · https://cs50.harvard.edu/x/2024/psets/7/fiftyville/
- SQL Noir — https://www.sqlnoir.com/ · https://www.sqlnoir.com/cases · https://www.sqlnoir.com/cases/001-The-Vanishing-Briefcase · repo: https://github.com/hristo2612/SQLNoir
- SQL Noir (Devgarh) — https://github.com/RayArena/sql-noir
- SQL Island — https://sql-island.informatik.uni-kl.de/ · walkthrough: https://github.com/Kshitij1141/SQL-Island-Game-Walkthrough · paper: https://www.researchgate.net/publication/267094856_SQL_Island_An_Adventure_Game_to_Learn_the_Database_Language_SQL · studi kasus: https://www.researchgate.net/publication/361620762_The_Use_of_Educational_Games_in_Programming_Assignments_SQL_Island_as_a_Case_Study
- SQL Police Department — https://sqlpd.com/ · https://www.producthunt.com/products/sql-police-department
- Lost at SQL — https://lost-at-sql.therobinlord.com/ · https://www.i-programmer.info/news/150-training-a-education/16316-lost-at-sql-the-game.html · https://learnsql.com/blog/lost-at-sql-full-solution/
- QueryCase — https://querycase.com/sql · https://querycase.com/blog/sql-murder-mystery-walkthrough
- SQL Detective (CS++) — https://csplusplus.com/sql-detective/
- SQL Detective (dual-screen, itch.io) — https://ofekcofman98.itch.io/sql-detective-real
- SQL Squid Game (DataLemur) — https://datalemur.com/sql-game · https://datalemur.com/blog/games-to-learn-sql
- Database Detective: Minor Crimes Division — https://store.steampowered.com/app/3950130/Database_Detective_Minor_Crimes_Division/ · ulasan berbahasa Indonesia: https://obturadorearen.wordpress.com/2026/07/19/review-game-database-database-minor-crimes-division/
- SQL Case Files — https://sqlcasefiles.com/
- SQLBolt — https://sqlbolt.com/
- Select Star SQL — https://selectstarsql.com/
- Command Line Murders — https://github.com/veltman/clmystery

**Diskusi & ulasan pemain**
- Show HN: SQL Noir — https://news.ycombinator.com/item?id=43041827
- Show HN: Lost at SQL — https://news.ycombinator.com/item?id=35665142
- HN: SQL Murder Mystery — https://news.ycombinator.com/item?id=21799988
- DEV: pembuat SQL Noir — https://dev.to/hristo2612/i-made-a-detective-game-that-teaches-you-sql-njd
- HackerNoon: SQL Noir — https://hackernoon.com/this-detective-game-helps-beginners-master-sql-and-database-logic
- Robopenguins (pengalaman Knight Lab) — https://www.robopenguins.com/sql-murder-mystery/
- Daftar game (ditulis pembuat game pesaing): https://sqlmaxx.com/sql-games/ · https://sqlprotocol.com/learn/best-sql-games

**Inspirasi desain non-SQL**
- Her Story — https://en.wikipedia.org/wiki/Her_Story_(video_game) · https://intermittentmechanism.blog/2020/06/13/we-had-a-list-of-rules-an-analysis-of-her-story/
- Return of the Obra Dinn (rule of three) — https://wireframe.raspberrypi.com/articles/obra-dinn-the-rule-of-three
- Professor Layton (hint coins) — https://layton.fandom.com/wiki/Hints

**Riset hint & pembelajaran**
- Aleven & Koedinger, help-seeking & bottom-out hint (ringkasan): https://link.springer.com/article/10.1007/s40593-015-0089-1
- O'Rourke dkk. 2014, *Hint systems may negatively impact performance in educational games* — https://dl.acm.org/doi/10.1145/2556325.2566248 · http://eleanorourke.com/papers/hints_las.pdf
- Price, Zhi & Barnes 2017, *Hint Generation Under Uncertainty: The Effect of Hint Quality on Help-Seeking Behavior* — https://link.springer.com/chapter/10.1007/978-3-319-61425-0_26
- LAK 2026, *Revisiting the Hint Button* — https://doi.org/10.1145/3785022.3785040

**Teknologi**
- SQLite WASM — https://sqlite.org/wasm
- Perbandingan PGlite / SQLite WASM / DuckDB WASM — https://kanopylabs.com/blog/pglite-vs-sqlite-wasm-vs-duckdb-wasm

**Konteks Indonesia**
- CP Rekayasa Perangkat Lunak Fase F — https://guru.kemdikbud.go.id/kurikulum/referensi-penerapan/capaian-pembelajaran/smk/rekayasa-perangkat-lunak/fase-f/
- Game RPG untuk materi basis data SMK (Unesa) — https://ejournal.unesa.ac.id/index.php/it-edu/article/download/25428/23309/29771
- DQLab (belajar SQL berbasis alur cerita) — https://dqlab.id/ · https://dqlab.id/belajar-data-analyst-mulai-dari-sql
- Dicoding, Belajar Dasar SQL — https://www.dicoding.com/academies/600
- Kekurangan talenta digital — https://katadata.co.id/digital/teknologi/62451ee00178f/indonesia-kekurangan-500-ribu-talenta-digital-per-tahun · https://www.kodingakademi.id/indonesia-butuh-12-juta-talenta-digital-2030/
- Statcounter platform Indonesia — https://gs.statcounter.com/platform-market-share/desktop-mobile-tablet/indonesia/
- DataReportal Digital 2025 Indonesia — https://datareportal.com/reports/digital-2025-indonesia
- Statista, pengguna smartphone Indonesia — https://www.statista.com/statistics/558642/number-of-mobile-internet-user-in-indonesia/
