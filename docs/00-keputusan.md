# 00 — Keputusan Produk (Sumber Kebenaran)

> Jika dokumen 01/02/03 bertentangan dengan file ini, **file ini yang berlaku**.
> Terakhir diperbarui: 28 September 2026.

## A. Keputusan dari user

| # | Topik | Keputusan |
|---|---|---|
| A1 | Target pemain | **Mahasiswa, calon data analyst, dan gamer** yang suka game misteri/puzzle. Bukan fokus SMK/SMA. |
| A2 | Perangkat | **Desktop-first.** |
| A3 | Model bisnis | **Gratis penuh.** Tanpa paywall, tanpa freemium, tanpa pembayaran (QRIS dsb.), tanpa lisensi institusi. |
| A4 | Laporan polisi | **Cukup nama tersangka.** Tanpa field motif atau bukti. |
| A5 | Sheet/tabel | **Semua sheet terbuka sejak awal chapter.** Tidak ada sheet yang "diserahkan" bertahap. |
| A6 | Laporan Bab 8 | **3 nama sekaligus** (dalang + dua perantara). |
| A7 | Akun & leaderboard | **Boleh ada**, asalkan hosting tetap gratis. |
| A8 | Tema kejahatan | **Boleh lebih gelap** (termasuk pembunuhan). |
| A9 | Metode login | **Google saja.** Tanpa login email/magic link, agar benar-benar Rp0 (tanpa domain & layanan email). |

## B. Konflik antar-dokumen yang diselesaikan (default, bisa diubah user)

### B1. Sistem bantuan: 4 level + asisten otomatis

| Level | Nama | Isi | Biaya (kumulatif, dari poin step itu) | Kapan bisa dibuka |
|---|---|---|---|---|
| — | Asisten Otomatis | Error SQL diterjemahkan ke bahasa Indonesia + diagnosis hasil ("Hasilmu 1.204 baris, target jauh lebih sedikit") | Gratis, selalu aktif | Otomatis |
| — | Buku Saku SQL | Kamus sintaks + contoh 1 baris + catatan beda dialek SQLite vs PostgreSQL/MySQL | Gratis | Kapan saja |
| 1 | Arah | Arah investigasi tanpa menyebut sintaks | **Gratis** | Kapan saja |
| 2 | Sheet & Kolom | Sheet dan kolom mana yang relevan | **−10%** | Setelah Petunjuk 1 dibuka |
| 3 | Kerangka | Kerangka query dengan bagian kosong | **−30%** | Setelah Petunjuk 2 + (1 query gagal **atau** 2 menit) |
| 4 | Query Lengkap | Query jawaban + penjelasan per baris; step ditandai "dibantu" | **−60%** | Setelah Petunjuk 3 + (1 query gagal **atau** 2 menit) |

- Bantuan hanya **ditawarkan** otomatis (setelah beberapa kali gagal atau diam lama), tidak pernah dibuka sendiri.
- Penalti tidak bisa di-reset dengan reload.
- "Tantangan Kembar" (mengembalikan poin setelah Petunjuk 4) ditunda ke v1.

### B2. Laporan polisi & salah tuduh

- Form hanya berisi **Nomor Kasus** (terisi otomatis) dan **Nama Tersangka**. Tanpa autocomplete nama (agar tidak membocorkan daftar kandidat).
- Tombol "Ajukan Laporan" **selalu tersedia** di Ruang Investigasi. Chapter selesai saat tersangka benar; step yang belum diselesaikan tidak memberi poin.
- Nama dinormalisasi (huruf besar/kecil, spasi, tanda baca) lalu dicocokkan dengan hash.
- Salah tuduh ditangani bertahap:
  1. Salah ke-1: alert dengan teks persis **"Kamu salah menentukan tersangka, silakan cari lagi."**
  2. Salah ke-2: alert yang sama + petunjuk evaluatif tentang kenapa orang itu tidak cocok (mis. "Orang ini tidak berada di lokasi pada jam kejadian").
  3. Salah ke-3 dst.: alert + jeda 60 detik sebelum bisa melapor lagi.
- Setiap salah tuduh: **−10% dari skor maksimum chapter** (1.000 → −100 poin). Skor tidak turun di bawah 0.
- Konsekuensi untuk penulisan kasus: **nama pelaku harus unik** di seluruh dataset chapter. Red herring memakai nama yang mirip (mis. "Budi Santoso" vs "Budi Santosa"), bukan nama yang identik.

### B3. Latar cerita

- Semua kasus berlatar **kota fiktif Wiralaga** dengan distrik/kelurahan fiktif. Tidak memakai kota nyata (Semarang, Braga, Surabaya, dll.) sebagai lokasi kejahatan.
- Papan Kasus memakai **peta kota Wiralaga** (bergaya titik) dengan pin per distrik, bukan peta kepulauan Indonesia.
- Instansi fiktif: **Divisi Investigasi Data (DID)**. Tokoh tetap: Bu Laras (Kepala Unit) dan Gilang (Analis Data).
- Nada cerita untuk pemain dewasa: tajam, moral abu-abu, banyak twist, tidak kekanak-kanakan. Aturan tema gelap ada di B6.

### B4. Daftar chapter (acuan dari riset)

| Bab | Judul | Konsep SQL | Step | Badge "Tema Dewasa" |
|---|---|---|---|---|
| 1 | Raibnya Batik Tulis Sang Maestro | SELECT, WHERE, ORDER BY, LIMIT | 7 | — |
| 2 | Kurir Hantu di Gerbang Tol | LIKE, IN, BETWEEN, IS NULL, DISTINCT, fungsi string | 8 | — |
| 3 | Sambal Juara yang Dicuri | INNER JOIN 2–3 tabel | 8 | — |
| 4 | Bantuan Banjir yang Tak Pernah Sampai | Agregasi, GROUP BY, HAVING | 9 | — (lebih gelap, tanpa kekerasan) |
| 5 | Alibi Palsu di Kos Mawar | Subquery, NOT EXISTS, anti-join, UNION/EXCEPT | 9 | "Mengandung pembunuhan." |
| 6 | Selisih Satu Jam di Pelabuhan | CASE, fungsi tanggal, CTE | 10 | "Mengandung pembunuhan dan penyelundupan." |
| 7 | Rekening Bayangan Pinjol Gelap | Window function | 10 | "Mengandung pembunuhan dan teror penagihan utang." |
| 8 | Sang Dalang | Self-join, multi-CTE, recursive CTE | 12 | "Mengandung beberapa pembunuhan dan kejahatan terorganisasi." |

Detail cerita tiap bab ada di 01-riset.md §5.3.

- **MVP = Bab 1–3.**
- Bab terbuka berurutan (Bab N+1 terbuka setelah Bab N selesai). Ini soal urutan chapter, bukan soal sheet.

### B5. Skor

- Skor maksimum per chapter 1.000, dibagi rata ke step.
- Waktu dicatat dan ditampilkan, tapi **tidak** memengaruhi skor di MVP (tidak ada "bonus waktu").
- Salah menjalankan query tidak mengurangi skor.

### B6. Tema gelap (turunan A8)

- **Kurva intensitas:** Bab 1–3 (MVP) tetap kejahatan non-kekerasan sebagai pengenalan. Intensitas naik mulai Bab 4. Kasus kekerasan, termasuk pembunuhan, boleh dipakai mulai Bab 5, dan Bab 8 menjadi puncak tergelap.
- **Kekerasan terjadi di luar layar.** Diceritakan lewat data, laporan, dan dialog. Tidak ada gore atau jenazah di ilustrasi maupun animasi. Animasi penangkapan tetap sama.
- **Batas yang tidak dilanggar:** kekerasan seksual, kekerasan terhadap anak, bunuh diri sebagai alat plot, konflik SARA, serta tokoh, tempat, atau peristiwa nyata.
- **Label konten:** bab dengan kekerasan diberi badge **"Tema Dewasa"** di kartu kasus dan briefing, dengan keterangan satu baris (mis. "Mengandung pembunuhan").

### B7. Laporan Bab 8 (turunan A6)

- Form berisi 3 field: **Dalang**, **Perantara 1**, **Perantara 2**.
- Slot Dalang harus tepat. Dua slot Perantara boleh dalam urutan apa pun.
- Laporan benar hanya jika **ketiganya benar**. Salah ke-1 tidak memberi tahu berapa nama yang benar (supaya tidak bisa ditebak satu per satu).
- Aturan salah tuduh bertahap (B2) tetap berlaku. Petunjuk evaluatif di salah ke-2 membahas satu nama yang keliru.
- Tiap nama wajib unik di dataset (aturan build yang sama dengan B2).

### B8. Akun & leaderboard (turunan A7)

- **Main tetap tanpa login.** Progres dan Buku Catatan tersimpan di browser. Login hanya untuk sinkronisasi antar-perangkat dan ikut leaderboard.
- **Login: hanya Google** lewat Supabase Auth (free tier). Tanpa login email, jadi tidak perlu layanan kirim email maupun domain berbayar (A9).
- **Leaderboard per bab:** skor tertinggi, lalu waktu sebagai penentu seri. Skor divalidasi di server (Edge Function menjalankan ulang jawaban), bukan dipercaya dari browser. Ada tab terpisah "Tanpa Bantuan": tidak membuka petunjuk apa pun, termasuk Petunjuk 1 yang gratis. Asisten Otomatis dan Buku Saku SQL tidak dihitung sebagai bantuan.
- **Privasi:** nama tampilan dipilih pemain dan ikut leaderboard hanya jika pemain setuju (opt-in).
- **Tetap gratis:** Supabase free tier. Proyek free tier dijeda setelah 7 hari tidak aktif, jadi dipasang ping keep-alive terjadwal (GitHub Actions atau Cloudflare Workers cron, gratis). Kalau kuota free tier habis, fitur online dimatikan sementara dan game tetap bisa dimainkan offline. Tidak ada upgrade berbayar.
- **Jadwal:** v1 (setelah MVP).

## C. Turunan teknis dari keputusan user

| Dari | Dampak |
|---|---|
| A1 | Kurikulum & copy ditujukan untuk orang dewasa. Mode kelas/SMK dan pemetaan Capaian Pembelajaran SMK tidak lagi prioritas (paling cepat v2, untuk dosen). Buku Saku menjelaskan beda dialek karena data analyst memakai PostgreSQL/MySQL/BigQuery di dunia kerja. |
| A2 | MVP menargetkan lebar ≥1024 px. Di bawah 1024 px tampil layar "Detektif SQL paling nyaman dimainkan di laptop atau PC" dengan tombol "Tetap Lanjutkan". Desain mobile ditunda (pasca-MVP, opsional). |
| A3 | Biaya operasional harus ≈ Rp0: situs statis di Cloudflare Pages/Vercel free tier. Akun & leaderboard (v1) hanya jika muat di free tier Supabase. Tidak ada iklan. |
| A4 | Field motif & bukti dihapus dari form, model data, dan validasi. |
| A5 | Hapus `revealAtStep`, `setVisibleTables`, dan pemblokiran sheet tersembunyi. Authorizer tetap memblokir `sqlite_*` dan semua operasi selain baca. Autocomplete editor langsung memuat semua sheet chapter. |

## D. Pertanyaan terbuka

Semua pertanyaan sebelumnya sudah dijawab:
- D1 (3 nama di Bab 8) → A6, B7.
- D2 (akun & leaderboard) → A7, B8.
- D3 (tema gelap) → A8, B6.
