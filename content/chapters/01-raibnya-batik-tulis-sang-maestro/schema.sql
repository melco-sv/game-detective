-- Bab 1 — Raibnya Batik Tulis Sang Maestro (contoh mini 4 step)
-- Latar: Kota Wiralaga (fiktif). Semua data FIKTIF. NIK berawalan 99.

CREATE TABLE laporan_kejadian (
  id          INTEGER PRIMARY KEY,
  tanggal     TEXT NOT NULL,                 -- 'YYYY-MM-DD'
  distrik     TEXT NOT NULL,
  lokasi      TEXT NOT NULL,
  jenis       TEXT NOT NULL,
  keterangan  TEXT NOT NULL
);

CREATE TABLE penduduk (
  nik            TEXT PRIMARY KEY,           -- 16 digit, fiktif (awalan 99)
  nama           TEXT NOT NULL,
  jenis_kelamin  TEXT NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
  tanggal_lahir  TEXT NOT NULL,              -- 'YYYY-MM-DD'
  pekerjaan      TEXT,
  alamat         TEXT,
  kelurahan      TEXT NOT NULL
);

CREATE TABLE buku_tamu (
  id          INTEGER PRIMARY KEY,
  tanggal     TEXT NOT NULL,                 -- 'YYYY-MM-DD'
  nama        TEXT NOT NULL,
  nik         TEXT NOT NULL REFERENCES penduduk(nik),
  keperluan   TEXT NOT NULL,
  jam_masuk   TEXT NOT NULL,                 -- 'HH:MM' (WIB)
  jam_keluar  TEXT NOT NULL,                 -- 'HH:MM' (WIB)
  pintu       TEXT NOT NULL CHECK (pintu IN ('depan', 'samping'))   -- pintu keluar
);

CREATE TABLE pegawai_galeri (
  nik         TEXT PRIMARY KEY REFERENCES penduduk(nik),
  nama        TEXT NOT NULL,
  jabatan     TEXT NOT NULL,
  hari_libur  TEXT NOT NULL                  -- 'Senin' ... 'Minggu'
);
