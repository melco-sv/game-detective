/** Model data progres & skor (docs/02-arsitektur.md §9.1). Dipersist lewat Dexie (src/infra/storage). */
import type { HintLevelOpened } from "../hints/machine";
import type { ChapterId, StepId } from "../content/types";

export const SAVE_SCHEMA_VERSION = 1;

export type ChapterStatus = "locked" | "available" | "in-progress" | "solved";

export interface ReportLogEntry {
  id: string; // ULID
  names: string[];
  at: number;
  correct: boolean;
}

export interface ChapterProgress {
  chapterId: ChapterId;
  contentVersion: string;
  status: ChapterStatus;
  currentStepId: StepId | null;
  steps: Record<StepId, StepProgress>;
  report: {
    attempts: number;
    wrongAttempts: number;
    cooldownUntil?: number; // epoch ms; jeda salah tuduh ke-3 dst., tahan reload
    lastWrongHash?: string; // untuk analitik & petunjuk evaluatif
    log: ReportLogEntry[]; // urut waktu; bukti untuk submit-score (v1)
    solvedAt?: number;
  };
  score: { current: number; best: number; max: number; stars: 0 | 1 | 2 | 3 };
  timeSpentMs: number; // dicatat & ditampilkan, TIDAK memengaruhi skor (B5)
  runs: number;
  startedAt?: number;
  completedAt?: number;
  updatedAt: number;
  ranked?: {
    // v1: hanya bila run dimulai saat login & online (§6.6)
    runId: string;
    serverStartedAt: string; // ISO, dari jam server
    submit: "none" | "queued" | "verified" | "rejected" | "flagged";
    serverScore?: number; // skor resmi dari submit-score
  };
}

export interface StepProgress {
  status: "active" | "completed"; // semua step bisa dikerjakan; urutan disarankan
  runs: number;
  failedRuns: number;
  errorRuns: number;
  hintsRevealed: HintLevelOpened; // jumlah petunjuk dibuka (B1)
  hintOpenedAt: number[]; // timestamp per level -> gerbang tahan reload
  failedSinceLastHint: number;
  assisted: boolean; // true bila Petunjuk 4 dibuka ("dibantu")
  points: number; // poin didapat setelah penalti; 0 bila belum selesai
  solvedSql?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  reduceMotion: "system" | "on" | "off";
  editorFontSize: number; // 12-20 (03-design)
  autocomplete: boolean;
  csvSeparator: "," | ";";
  sound: boolean;
  analyticsOptIn: boolean;
  shareQueryText: boolean; // opt-in kirim teks query anonim untuk perbaikan soal
  cloudSyncNotes: boolean; // v1: sinkronkan Buku Catatan saat login (default true)
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  reduceMotion: "system",
  editorFontSize: 15,
  autocomplete: true,
  csvSeparator: ",",
  sound: true,
  analyticsOptIn: false,
  shareQueryText: false,
  cloudSyncNotes: true,
};

export function createEmptyStepProgress(): StepProgress {
  return {
    status: "active",
    runs: 0,
    failedRuns: 0,
    errorRuns: 0,
    hintsRevealed: 0,
    hintOpenedAt: [],
    failedSinceLastHint: 0,
    assisted: false,
    points: 0,
  };
}
