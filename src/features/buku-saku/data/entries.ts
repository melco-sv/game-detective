/**
 * Data Buku Saku SQL (docs/03-design.md §3.16, docs/01-riset.md §3.4).
 * Kamus sintaks statis, gratis dan tidak memengaruhi skor — bukan bagian
 * dari pipeline konten bab (tidak perlu dibangun/di-hash), jadi cukup
 * modul TS biasa, bukan YAML+build-content.
 */
import type { SqlConcept } from "@/engine/content/types";

export type BukuSakuTopic =
  | "dasar"
  | "filter"
  | "join"
  | "agregasi"
  | "subquery"
  | "cte"
  | "window"
  | "tanggal-waktu"
  | "teks";

export const BUKU_SAKU_TOPICS: { id: BukuSakuTopic; label: string }[] = [
  { id: "dasar", label: "Dasar" },
  { id: "filter", label: "Filter" },
  { id: "join", label: "JOIN" },
  { id: "agregasi", label: "Agregasi" },
  { id: "subquery", label: "Subquery" },
  { id: "cte", label: "CTE" },
  { id: "window", label: "Window" },
  { id: "tanggal-waktu", label: "Tanggal & Waktu" },
  { id: "teks", label: "Teks" },
];

export interface DialectNote {
  sqlite: string;
  postgresql?: string;
  mysql?: string;
}

export interface BukuSakuEntry {
  id: string;
  title: string;
  topic: BukuSakuTopic;
  concepts: SqlConcept[];
  description: string;
  example: string;
  dialect?: DialectNote;
}

export const BUKU_SAKU_ENTRIES: BukuSakuEntry[] = [
  // ── Dasar ──────────────────────────────────────────────────────────
  {
    id: "select",
    title: "SELECT",
    topic: "dasar",
    concepts: ["select"],
    description: "Memilih kolom yang ingin ditampilkan dari sebuah tabel.",
    example: "SELECT nama, umur FROM penduduk;",
  },
  {
    id: "where",
    title: "WHERE",
    topic: "dasar",
    concepts: ["where"],
    description: "Menyaring baris berdasarkan syarat tertentu.",
    example: "SELECT * FROM penduduk WHERE umur >= 18;",
  },
  {
    id: "order-by",
    title: "ORDER BY",
    topic: "dasar",
    concepts: ["order-by"],
    description: "Mengurutkan hasil berdasarkan satu atau lebih kolom.",
    example: "SELECT * FROM penduduk ORDER BY umur DESC;",
  },
  {
    id: "limit",
    title: "LIMIT",
    topic: "dasar",
    concepts: ["limit"],
    description: "Membatasi jumlah baris yang dikembalikan.",
    example: "SELECT * FROM penduduk LIMIT 10;",
  },
  {
    id: "distinct",
    title: "DISTINCT",
    topic: "dasar",
    concepts: ["distinct"],
    description: "Menghapus baris duplikat dari hasil.",
    example: "SELECT DISTINCT distrik FROM penduduk;",
  },
  {
    id: "alias-kolom",
    title: "AS (alias)",
    topic: "dasar",
    concepts: ["select"],
    description: "Memberi nama sementara pada kolom atau tabel supaya hasil lebih mudah dibaca.",
    example: "SELECT nama AS nama_lengkap FROM penduduk p;",
  },
  {
    id: "case",
    title: "CASE WHEN",
    topic: "dasar",
    concepts: ["case"],
    description: "Membuat kolom baru berdasarkan syarat kondisional, seperti if/else di SQL.",
    example: "SELECT nama, CASE WHEN umur >= 18 THEN 'dewasa' ELSE 'anak' END FROM penduduk;",
  },

  // ── Filter ─────────────────────────────────────────────────────────
  {
    id: "like",
    title: "LIKE",
    topic: "filter",
    concepts: ["like"],
    description: "Mencocokkan pola teks; % mewakili sembarang karakter (0 atau lebih).",
    example: "SELECT * FROM penduduk WHERE nama LIKE 'Budi%';",
    dialect: {
      sqlite: "Tidak peka huruf besar/kecil untuk huruf ASCII.",
      postgresql: "Peka huruf besar/kecil; pakai ILIKE untuk mengabaikan.",
      mysql: "Tergantung collation kolom (bawaan umumnya tidak peka).",
    },
  },
  {
    id: "in",
    title: "IN",
    topic: "filter",
    concepts: ["in"],
    description: "Memeriksa apakah nilai ada di dalam daftar.",
    example: "SELECT * FROM penduduk WHERE distrik IN ('Kota Lama', 'Pelabuhan');",
  },
  {
    id: "between",
    title: "BETWEEN",
    topic: "filter",
    concepts: ["between"],
    description: "Memeriksa apakah nilai berada dalam rentang (inklusif di kedua ujung).",
    example: "SELECT * FROM laporan_kejadian WHERE tanggal BETWEEN '2026-06-01' AND '2026-06-30';",
  },
  {
    id: "is-null",
    title: "IS NULL",
    topic: "filter",
    concepts: ["null"],
    description: "Memeriksa apakah kolom kosong (NULL). Tidak bisa memakai = NULL.",
    example: "SELECT * FROM penduduk WHERE alamat IS NULL;",
  },
  {
    id: "and-or-not",
    title: "AND / OR / NOT",
    topic: "filter",
    concepts: ["where"],
    description: "Menggabungkan beberapa syarat di WHERE. Gunakan tanda kurung bila mencampur AND dan OR.",
    example: "SELECT * FROM penduduk WHERE distrik = 'Kota Lama' AND umur >= 18;",
  },

  // ── JOIN ───────────────────────────────────────────────────────────
  {
    id: "inner-join",
    title: "INNER JOIN",
    topic: "join",
    concepts: ["join"],
    description: "Menggabungkan baris dari dua tabel yang nilainya cocok di kedua sisi.",
    example: "SELECT * FROM a JOIN b ON a.id = b.a_id;",
    dialect: { sqlite: "JOIN … ON dan USING (kolom) sama di SQLite, PostgreSQL, dan MySQL." },
  },
  {
    id: "left-join",
    title: "LEFT JOIN",
    topic: "join",
    concepts: ["left-join"],
    description: "Mengambil semua baris tabel kiri, walau tidak ada pasangan di tabel kanan (kolom kanan jadi NULL).",
    example: "SELECT * FROM a LEFT JOIN b ON a.id = b.a_id;",
  },
  {
    id: "full-outer-join",
    title: "FULL OUTER JOIN",
    topic: "join",
    concepts: ["set-ops"],
    description: "Mengambil semua baris dari kedua tabel, cocok atau tidak.",
    example: "SELECT * FROM a FULL OUTER JOIN b ON a.id = b.a_id;",
    dialect: {
      sqlite: "Ada sejak versi 3.39.",
      postgresql: "Ada.",
      mysql: "Tidak ada — gabungkan LEFT JOIN dan RIGHT JOIN dengan UNION.",
    },
  },
  {
    id: "alias-tabel",
    title: "Alias tabel",
    topic: "join",
    concepts: ["join"],
    description: "Memberi nama pendek pada tabel supaya query dengan banyak JOIN lebih ringkas dibaca.",
    example: "SELECT p.nama, l.jenis FROM penduduk p JOIN laporan_kejadian l ON p.nik = l.nik;",
  },
  {
    id: "using",
    title: "USING",
    topic: "join",
    concepts: ["join"],
    description: "Menyingkat ON saat nama kolom penghubung di kedua tabel sama persis.",
    example: "SELECT * FROM a JOIN b USING (id);",
  },
  {
    id: "self-join",
    title: "Self JOIN",
    topic: "join",
    concepts: ["self-join"],
    description: "Menggabungkan tabel dengan dirinya sendiri — biasa dipakai untuk data berjenjang seperti atasan-bawahan.",
    example: "SELECT a.nama, b.nama AS atasan FROM pegawai a JOIN pegawai b ON a.atasan_id = b.id;",
  },

  // ── Agregasi ───────────────────────────────────────────────────────
  {
    id: "count",
    title: "COUNT",
    topic: "agregasi",
    concepts: ["aggregate"],
    description: "Menghitung jumlah baris.",
    example: "SELECT COUNT(*) FROM penduduk;",
  },
  {
    id: "sum-avg-min-max",
    title: "SUM / AVG / MIN / MAX",
    topic: "agregasi",
    concepts: ["aggregate"],
    description: "Menjumlah, merata-rata, atau mencari nilai ekstrem dari sebuah kolom.",
    example: "SELECT AVG(umur) FROM penduduk;",
  },
  {
    id: "group-by",
    title: "GROUP BY",
    topic: "agregasi",
    concepts: ["group-by"],
    description: "Mengelompokkan baris sebelum diagregasi — satu baris hasil per kelompok.",
    example: "SELECT distrik, COUNT(*) FROM penduduk GROUP BY distrik;",
  },
  {
    id: "having",
    title: "HAVING",
    topic: "agregasi",
    concepts: ["having"],
    description: "Menyaring hasil SETELAH agregasi — WHERE tidak bisa memakai hasil agregat seperti COUNT(*).",
    example: "SELECT distrik, COUNT(*) AS jumlah FROM penduduk GROUP BY distrik HAVING COUNT(*) > 100;",
  },

  // ── Subquery ───────────────────────────────────────────────────────
  {
    id: "subquery",
    title: "Subquery",
    topic: "subquery",
    concepts: ["subquery"],
    description: "Query di dalam query — hasilnya dipakai sebagai masukan oleh query luar.",
    example: "SELECT * FROM penduduk WHERE nik IN (SELECT nik FROM laporan_kejadian);",
  },
  {
    id: "exists",
    title: "EXISTS",
    topic: "subquery",
    concepts: ["exists"],
    description: "Memeriksa apakah subquery mengembalikan minimal satu baris, tanpa peduli isinya.",
    example: "SELECT * FROM penduduk p WHERE EXISTS (SELECT 1 FROM laporan_kejadian l WHERE l.nik = p.nik);",
  },
  {
    id: "correlated-subquery",
    title: "Correlated subquery",
    topic: "subquery",
    concepts: ["correlated-subquery"],
    description: "Subquery yang merujuk kolom dari query luar, sehingga dijalankan ulang untuk setiap baris.",
    example: "SELECT nama FROM pegawai p WHERE gaji > (SELECT AVG(gaji) FROM pegawai WHERE distrik = p.distrik);",
  },

  // ── CTE ────────────────────────────────────────────────────────────
  {
    id: "cte",
    title: "WITH (CTE)",
    topic: "cte",
    concepts: ["cte"],
    description: "Memberi nama sementara pada subquery supaya query utama lebih mudah dibaca dan dipakai berkali-kali.",
    example: "WITH aktif AS (SELECT * FROM penduduk WHERE status = 'aktif') SELECT * FROM aktif;",
  },
  {
    id: "recursive-cte",
    title: "WITH RECURSIVE",
    topic: "cte",
    concepts: ["recursive-cte"],
    description: "CTE yang memanggil dirinya sendiri — dipakai untuk data hierarkis/berjenjang seperti struktur organisasi.",
    example:
      "WITH RECURSIVE turunan AS (SELECT id FROM pegawai WHERE id = 1 UNION ALL SELECT p.id FROM pegawai p JOIN turunan t ON p.atasan_id = t.id) SELECT * FROM turunan;",
  },

  // ── Window ─────────────────────────────────────────────────────────
  {
    id: "window-over",
    title: "OVER (window function)",
    topic: "window",
    concepts: ["window"],
    description: "Menghitung nilai lintas baris tanpa menyatukannya menjadi satu baris seperti GROUP BY.",
    example: "SELECT nama, gaji, RANK() OVER (ORDER BY gaji DESC) FROM pegawai;",
  },
  {
    id: "row-number",
    title: "ROW_NUMBER",
    topic: "window",
    concepts: ["window"],
    description: "Memberi nomor urut unik ke tiap baris dalam hasil, opsional per kelompok dengan PARTITION BY.",
    example: "SELECT nama, ROW_NUMBER() OVER (ORDER BY nama) FROM pegawai;",
  },

  // ── Tanggal & Waktu ────────────────────────────────────────────────
  {
    id: "strftime",
    title: "strftime",
    topic: "tanggal-waktu",
    concepts: ["date-time"],
    description: "Mengambil atau memformat bagian dari tanggal/waktu, mis. tahun, bulan, atau jam.",
    example: "SELECT strftime('%Y', tanggal) FROM laporan_kejadian;",
    dialect: {
      sqlite: "strftime('%Y', tanggal)",
      postgresql: "EXTRACT(YEAR FROM tanggal)",
      mysql: "YEAR(tanggal)",
    },
  },
  {
    id: "date-now",
    title: "date('now')",
    topic: "tanggal-waktu",
    concepts: ["date-time"],
    description: "Mengambil tanggal hari ini (waktu UTC secara bawaan).",
    example: "SELECT date('now');",
    dialect: { sqlite: "date('now')", postgresql: "CURRENT_DATE", mysql: "CURDATE()" },
  },
  {
    id: "julianday",
    title: "julianday",
    topic: "tanggal-waktu",
    concepts: ["date-time"],
    description: "Mengubah tanggal jadi angka hari, berguna untuk menghitung selisih hari antar dua tanggal.",
    example: "SELECT julianday(tanggal_keluar) - julianday(tanggal_masuk) FROM buku_tamu;",
  },

  // ── Teks ───────────────────────────────────────────────────────────
  {
    id: "concat",
    title: "Gabung teks ( || )",
    topic: "teks",
    concepts: ["string-fn"],
    description: "Menggabungkan dua teks atau lebih menjadi satu.",
    example: "SELECT nama || ' - ' || distrik FROM penduduk;",
    dialect: {
      sqlite: "nama || ' ' || kota",
      postgresql: "nama || ' ' || kota, atau CONCAT()",
      mysql: "CONCAT(nama, ' ', kota) — || berarti OR secara bawaan",
    },
  },
  {
    id: "upper-lower",
    title: "UPPER / LOWER",
    topic: "teks",
    concepts: ["string-fn"],
    description: "Mengubah teks menjadi huruf besar atau kecil semua.",
    example: "SELECT UPPER(nama) FROM penduduk;",
  },
  {
    id: "length",
    title: "LENGTH",
    topic: "teks",
    concepts: ["string-fn"],
    description: "Menghitung panjang sebuah teks.",
    example: "SELECT nama FROM penduduk WHERE LENGTH(nik) != 16;",
  },
  {
    id: "substr",
    title: "SUBSTR",
    topic: "teks",
    concepts: ["string-fn"],
    description: "Mengambil sebagian teks mulai dari posisi tertentu.",
    example: "SELECT SUBSTR(nik, 1, 4) AS kode_wilayah FROM penduduk;",
  },
];
