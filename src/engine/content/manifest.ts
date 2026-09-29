/**
 * Skema manifest terkompilasi — yang dikirim ke browser setelah
 * `pnpm content:build` (docs/02-arsitektur.md §4.4). Query kunci, teks
 * jawaban, dan `tests.yaml` TIDAK pernah muncul di sini: hanya fingerprint
 * dan hash bergaram (§4.2, §6.5).
 */
import type {
  Chapter,
  ChapterId,
  ContentWarning,
  Difficulty,
  Hint,
  HintLevel,
  HintOfferTrigger,
  NormalizeOptions,
  ScoringSpec,
  SqlConcept,
  Step,
  StepId,
  Validator,
} from "./types";

export interface ChapterSummary {
  // isi generated/chapters/index.json
  id: ChapterId;
  slug: string;
  order: number;
  version: string;
  title: string;
  tagline: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  concepts: SqlConcept[];
  cover?: string;
  unlock?: { afterChapters?: ChapterId[] };
  contentWarning?: ContentWarning; // badge "Tema Dewasa" di kartu kasus tanpa memuat manifest (B6)
  manifestUrl: string;
}

// ChapterManifest mewarisi `violence` & `contentWarning` dari Chapter -> badge yang sama di Briefing.
export interface ChapterManifest
  extends Omit<Chapter, "database" | "steps" | "report" | "briefing" | "scoring"> {
  build: { contentHash: string; builtAt: string; sqliteVersion: string; salt: string };
  database: {
    url: string;
    compressed: "gzip" | null;
    bytes: number;
    sha256: string;
    tables: Chapter["database"]["tables"];
  };
  briefing: string;
  scoring: ScoringSpec; // default + override sudah digabung
  steps: CompiledStep[]; // poin per step sudah dihitung (1000 dibagi rata)
  report: CompiledReport;
}

export interface CompiledStep
  extends Omit<Step, "validator" | "feedback" | "hints" | "story" | "onComplete"> {
  points: number; // hasil pembagian rata, jumlah seluruh step = maxScore
  story: string;
  onComplete?: string;
  validator: CompiledValidator;
  feedback: {
    rowCount: "none" | "relative" | "exact";
    expectedRows?: number; // untuk diagnosis relatif/eksak
    expectedColumns?: number;
    mistakes: { fingerprint: string; message: string }[];
  };
  hints: CompiledHint[];
}

export type CompiledValidator =
  | {
      type: "resultEquals";
      fingerprint: string;
      unorderedFingerprint?: string;
      options: NormalizeOptions;
    }
  | {
      type: "keyColumn";
      fingerprint: string;
      compare: "set" | "multiset";
      ignoreNulls: boolean;
      options: Pick<NormalizeOptions, "caseSensitive" | "trimText" | "decimals">;
    }
  | {
      type: "queryUses";
      require: SqlConcept[];
      forbid: SqlConcept[];
      requireTables: string[];
      severity: "block" | "suggest";
      message: string;
    }
  | { type: "all" | "any"; of: CompiledValidator[] }
  | { type: "custom"; name: string; params?: Record<string, unknown> };
// unorderedFingerprint: hanya untuk rowOrder 'exact' -> "Barisnya sudah benar, urutannya belum."

export interface CompiledHint {
  level: HintLevel;
  kind: Hint["kind"];
  penaltyPct: number; // kumulatif: 0, 10, 30, 60
  offer: HintOfferTrigger;
  body: string; // level 4: disamarkan (lihat §6.5)
  insertSql?: string; // level 4: disamarkan
  obfuscated: boolean;
}

export interface CompiledReport {
  suspects: { id: string; label: string; group?: string; hashes: string[] }[];
  lookup?: { table: string; column: string };
  /** Kunci: hash nama tertuduh, atau `${slotId}|${hash}` untuk catatan khusus slot. */
  wrongNotes: Record<string, string /* petunjuk evaluatif */>;
  defaultWrongNote: string;
  misplacedNote?: string; // ada bila > 1 slot
  arrest: { scene: string; suspectPortrait?: string; epilogue: string };
}
// Sengaja TIDAK ada field jumlah-benar atau mode umpan balik parsial (B7).

// Dipakai internal saat build untuk mengaitkan validator sumber -> compiled (bukan bagian kontrak publik).
export type { Validator, StepId };
