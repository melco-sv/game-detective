/** Model data Buku Catatan (docs/02-arsitektur.md §8.1). */
import type { ChapterId, StepId } from "../content/types";

export interface ResultSnapshot {
  columns: { name: string; declType: string | null }[];
  rows: (string | number | null)[][]; // bigint -> string, blob -> '[BLOB n byte]'
  totalRows: number;
  truncated: boolean;
  capturedAt: number;
  approxBytes: number;
}

export type NoteTag = string; // <= 24 karakter, huruf kecil

export interface DetectiveNote {
  id: string; // ULID: urut waktu, aman untuk sinkronisasi
  chapterId: ChapterId;
  stepId?: StepId;
  title: string; // default: judul saran step, atau "Catatan 21.38"
  body?: string; // catatan bebas (Markdown ringan), maks 2000 karakter
  sql: string; // maks 5000 karakter
  snapshot: ResultSnapshot | null;
  tags: NoteTag[]; // maks 8 tag
  pinned: boolean;
  source: "manual" | "suggested";
  contentVersion: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number; // soft delete (undo & sinkronisasi)
}

export const NOTE_LIMITS = {
  maxBodyChars: 2000,
  maxSqlChars: 5000,
  maxTags: 8,
  maxTagChars: 24,
  maxSnapshotRows: 200,
  maxSnapshotColumns: 20,
  maxSnapshotCellChars: 500,
  maxNoteBytes: 64_000,
  maxNotesPerChapter: 300,
} as const;

export const SUGGESTED_TAGS = ["tersangka", "bukti", "alibi", "laporan"] as const;
