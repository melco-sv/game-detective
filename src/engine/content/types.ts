/**
 * Skema konten chapter — sumber (yang ditulis penulis kasus di `content/`).
 * Lihat docs/02-arsitektur.md §4.3. TS murni, tanpa React/DOM/Dexie (P5).
 */

export const CONTENT_FORMAT_VERSION = 1 as const;

export type ChapterId = string; // 'ch01-raibnya-batik-tulis-sang-maestro' — stabil selamanya
export type StepId = string; // 'pintu-samping' — stabil, unik dalam chapter
export type EngineKind = "sqlite" | "postgres";
export type Difficulty = "pemula" | "menengah" | "mahir";

export type SqlConcept =
  | "select"
  | "where"
  | "order-by"
  | "limit"
  | "distinct"
  | "like"
  | "in"
  | "between"
  | "null"
  | "string-fn"
  | "aggregate"
  | "group-by"
  | "having"
  | "join"
  | "left-join"
  | "self-join"
  | "subquery"
  | "correlated-subquery"
  | "exists"
  | "set-ops"
  | "case"
  | "date-time"
  | "cte"
  | "recursive-cte"
  | "window";

/** Markdown inline, atau rujukan ke file .md relatif terhadap folder chapter. */
export type RichText = string | { file: string };

// ───────────────────────── Chapter ─────────────────────────
export interface Chapter {
  formatVersion: typeof CONTENT_FORMAT_VERSION;
  id: ChapterId;
  slug: string; // URL: /kasus/raibnya-batik-tulis-sang-maestro
  order: number; // nomor bab; Bab N+1 terbuka setelah Bab N selesai (B4)
  version: string; // semver ISI chapter
  locale: "id-ID";
  title: string;
  tagline: string;
  synopsis: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  concepts: SqlConcept[];
  engine: EngineKind; // MVP: selalu 'sqlite'
  cover?: string;
  violence: "none" | "offscreen"; // B6: kekerasan selalu di luar layar; 'offscreen' hanya untuk order >= 5
  contentWarning?: ContentWarning; // B6: WAJIB bila violence = 'offscreen', dilarang bila 'none'
  unlock?: { afterChapters?: ChapterId[] }; // default: bab sebelumnya
  setting: { city: "Wiralaga"; district: string; date: string; timezone?: "WIB" | "WITA" | "WIT" };
  characters: Character[]; // JANGAN cantumkan pelaku asli di sini
  database: DatabaseSpec;
  display?: { maxRows?: number }; // batas baris tampil (default 1000)
  briefing: RichText;
  steps: Step[]; // urut dari mudah ke sulit
  report: ReportSpec;
  scoring?: Partial<ScoringSpec>; // override default global (jarang dipakai)
  credits?: { writers: string[]; artists?: string[]; reviewers?: string[] };
}

export interface Character {
  id: string;
  name: string;
  role: string;
  portrait?: string;
}

/** Label konten (B6). Tampil sebagai badge di kartu kasus (Papan Kasus) dan di kepala Briefing. */
export interface ContentWarning {
  label: "Tema Dewasa"; // satu-satunya label saat ini; union dibiarkan agar mudah ditambah
  note: string; // SATU baris, 8-80 karakter, tanpa Markdown, mis. "Mengandung pembunuhan."
}

// ───────────────────────── Database / sheet ─────────────────────────
// Semua sheet terbuka sejak awal chapter (A5): tidak ada field "reveal".
export interface DatabaseSpec {
  schema: string; // 'schema.sql'
  seed: string[]; // ['seed/01_laporan_kejadian.sql', 'seed/penduduk.csv', ...]
  tables: TableMeta[]; // metadata panel sheet & autocomplete
}

export interface TableMeta {
  name: string; // nama tabel SQL (snake_case Indonesia)
  label: string; // label sheet di UI, mis. 'Buku Tamu Digital'
  icon?: "dokumen" | "orang" | "kendaraan" | "kamera" | "bank" | "telepon" | "peta" | "buku";
  description: string;
  columns: ColumnMeta[];
}

export interface ColumnMeta {
  name: string;
  type: "INTEGER" | "REAL" | "TEXT" | "NUMERIC" | "BLOB";
  description: string;
  example?: string;
  key?: "PK" | "FK";
  references?: string; // 'penduduk.nik'
}

// ───────────────────────── Step ─────────────────────────
// Poin TIDAK ditulis per step: skor maksimum chapter (1000) dibagi rata ke step (B5).
export interface Step {
  id: StepId;
  title: string;
  story: RichText;
  objective: string; // instruksi tugas yang eksplisit & terukur
  concepts: SqlConcept[];
  relatedTables: string[]; // dipakai diagnosis Asisten Otomatis
  starterSql?: string;
  validator: Validator;
  feedback?: FeedbackSpec;
  hints: [Hint, Hint, Hint, Hint]; // tepat 4: direction, tables, skeleton, solution (B1)
  onComplete?: RichText; // narasi "temuan" setelah berhasil
  suggestNote?: { title: string; tags?: string[] };
  replaces?: StepId[]; // ID lama bila step diganti nama (migrasi progres)
}

// ───────────────────────── Petunjuk (B1) ─────────────────────────
export type HintLevel = 1 | 2 | 3 | 4;

export interface Hint {
  level: HintLevel;
  kind:
    | "direction" // 1 · Arah: tanpa menyebut sintaks · gratis
    | "tables" // 2 · Sheet & Kolom · -10% kumulatif
    | "skeleton" // 3 · Kerangka dengan bagian kosong · -30% kumulatif
    | "solution"; // 4 · Query Lengkap + penjelasan per baris · -60% kumulatif, step "dibantu"
  body: RichText;
  insertSql?: string; // tombol "Sisipkan ke editor" (level 3-4)
  offer?: Partial<HintOfferTrigger>; // override kapan petunjuk ini DITAWARKAN (bukan kapan boleh dibuka)
}

/** Kapan tombol Bantuan berdenyut menawarkan petunjuk berikutnya. Tidak pernah membuka otomatis. */
export interface HintOfferTrigger {
  minFailedRuns: number;
  minConsecutiveErrors: number;
  idleSeconds: number;
  minSecondsOnStep: number;
}

// ───────────────────────── Validator ─────────────────────────
export interface NormalizeOptions {
  rowOrder: "any" | "exact"; // 'exact' untuk step yang mengajarkan ORDER BY
  columnOrder: "any" | "exact";
  columnNames: "ignore" | "exact"; // 'exact' bila step meminta alias tertentu
  caseSensitive: boolean; // default false
  trimText: boolean; // default true
  decimals: number; // default 6
}

export type Validator =
  /** Hasil sama persis (setelah normalisasi) dengan hasil query kunci. */
  | { type: "resultEquals"; solution: string; options?: Partial<NormalizeOptions> }
  /** Ada SATU kolom di hasil pemain yang himpunan nilainya = kolom `column` dari query kunci. Kolom lain bebas. */
  | {
      type: "keyColumn";
      solution: string;
      column: string;
      compare?: "set" | "multiset";
      ignoreNulls?: boolean;
      options?: Partial<Pick<NormalizeOptions, "caseSensitive" | "trimText" | "decimals">>;
    }
  /** Gula sintaks: hasil 1 baris x 1 kolom. Dikompilasi menjadi resultEquals. */
  | { type: "singleValue"; solution: string; decimals?: number }
  /** Syarat bentuk query (token + instrumentasi authorizer). */
  | {
      type: "queryUses";
      require?: SqlConcept[];
      forbid?: SqlConcept[];
      requireTables?: string[];
      severity: "block" | "suggest";
      message: string;
    }
  | { type: "all"; of: Validator[] }
  | { type: "any"; of: Validator[] }
  | { type: "custom"; name: string; params?: Record<string, unknown> };

/** Bahan diagnosis Asisten Otomatis (gratis) saat hasil belum cocok. */
export interface FeedbackSpec {
  rowCount?: "none" | "relative" | "exact"; // default 'relative': "target jauh lebih sedikit"
  columnCount?: boolean; // "Hasilmu 1 kolom, seharusnya 3"
  mistakes?: { sql: string; message: string }[]; // jebakan yang diantisipasi -> pesan khusus
}

// ───────────────────────── Laporan polisi (A4, A6, B2, B7) ─────────────────────────
// Hasil laporan SELALU semua-atau-tidak. Tidak ada opsi umpan balik jumlah nama benar (B7).
export interface ReportSpec {
  /**
   * Slot nama, 1-3 slot, urut sesuai tampilan formulir.
   * Bab 1-7: tepat 1 slot ('tersangka').
   * Bab 8 (B7): 'dalang' (tanpa group -> harus tepat di slot ini)
   *           + 'perantara-1' & 'perantara-2' (group 'perantara' -> boleh tertukar).
   */
  suspects: SuspectSlot[];
  /** Sumber identitas untuk uji keunikan saat build. */
  identity: { table: string; key: string; name: string }[];
  /** Cek "nama tidak ada di data" (bukan autocomplete; tidak dihitung salah tuduh). */
  lookup?: { table: string; column: string };
  /**
   * Petunjuk evaluatif untuk salah tuduh ke-2 dan seterusnya, per orang yang dituduh.
   * `slot` opsional: catatan hanya berlaku bila nama itu ditulis di slot tersebut
   * (dipakai untuk orang yang terlibat tetapi ditulis di slot yang keliru).
   */
  wrongSuspectNotes?: { name: string; note: string; slot?: string }[];
  defaultWrongNote: string;
  /** Wajib bila > 1 slot: catatan umum untuk nama jawaban yang ditulis di slot yang keliru. */
  misplacedNote?: string;
  arrest: { scene: string; suspectPortrait?: string; epilogue: RichText };
}

export interface SuspectSlot {
  id: string; // 'tersangka' | 'dalang' | 'perantara-1' | 'perantara-2'
  label: string; // 'Nama Tersangka' | 'Dalang' | 'Perantara 1' | 'Perantara 2'
  /** Slot dengan group sama saling dipertukarkan (dicocokkan tanpa urutan). Tanpa group = posisi tetap.
   *  Aturan build: setiap group berisi >= 2 slot. */
  group?: string;
  answers: string[]; // HANYA di sumber; di-hash saat build; biasanya 1 nama (alias boleh)
}

// ───────────────────────── Skor (B2, B5) ─────────────────────────
export interface ScoringSpec {
  maxScore: number; // default 1000, dibagi rata ke step
  hintPenaltyPct: [0, number, number, number]; // kumulatif per level 1..4, default [0, 10, 30, 60]
  hintGate: { afterFailedRuns: number; orAfterSeconds: number }; // untuk Petunjuk 3 & 4, default {1, 120}
  wrongReportPenaltyPct: number; // default 10 (% dari maxScore per salah tuduh)
  wrongReportCooldownFromAttempt: number; // default 3 (salah ke-3 dst.)
  wrongReportCooldownSeconds: number; // default 60
  starsThresholdPct: [number, number, number]; // default [0, 70, 90]
}

export const DEFAULT_SCORING: ScoringSpec = {
  maxScore: 1000,
  hintPenaltyPct: [0, 10, 30, 60],
  hintGate: { afterFailedRuns: 1, orAfterSeconds: 120 },
  wrongReportPenaltyPct: 10,
  wrongReportCooldownFromAttempt: 3,
  wrongReportCooldownSeconds: 60,
  starsThresholdPct: [0, 70, 90],
};

export const DEFAULT_NORMALIZE_OPTIONS: NormalizeOptions = {
  rowOrder: "any",
  columnOrder: "any",
  columnNames: "ignore",
  caseSensitive: false,
  trimText: true,
  decimals: 6,
};

export const DEFAULT_HINT_OFFER: Record<HintLevel, HintOfferTrigger> = {
  1: { minFailedRuns: 2, minConsecutiveErrors: 3, idleSeconds: 60, minSecondsOnStep: 90 },
  2: { minFailedRuns: 2, minConsecutiveErrors: 99, idleSeconds: 90, minSecondsOnStep: 90 },
  3: { minFailedRuns: 2, minConsecutiveErrors: 99, idleSeconds: 120, minSecondsOnStep: 90 },
  4: { minFailedRuns: 3, minConsecutiveErrors: 99, idleSeconds: 480, minSecondsOnStep: 90 },
};
