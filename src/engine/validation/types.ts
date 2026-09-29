/** Tipe bersama untuk ValidationService (docs/02-arsitektur.md §3.5, §6). */
import type { SqlConcept } from "../content/types";

export interface RunMeta {
  sql: string;
  tablesRead: string[]; // dari authorizer (SQLITE_READ)
  functionsUsed: string[]; // dari authorizer (SQLITE_FUNCTION)
}

export interface StepVerdict {
  correct: boolean;
  /** resultEquals gagal, tapi baris/kolomnya cocok bila urutan diabaikan. */
  orderOnlyWrong?: boolean;
  /** Pesan dari validator queryUses severity 'suggest' yang belum terpenuhi (tidak memblokir). */
  suggestions?: string[];
  /** Pesan dari validator queryUses severity 'block' yang menggagalkan step meski hasil cocok. */
  blockedReason?: string;
}

/** Hasil laporan. Sengaja TIDAK memuat jumlah atau indeks nama yang benar (B7). */
export interface SuspectVerdict {
  correct: boolean;
  wrongNote?: string;
}

export type ConceptDetector = (sql: string) => Set<SqlConcept>;
