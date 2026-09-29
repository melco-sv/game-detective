/**
 * Dexie (IndexedDB) — sumber kebenaran lokal untuk progres, draf editor, dan
 * Buku Catatan (docs/02-arsitektur.md §9.3, §8.1, ADR-06). Belum pernah
 * dirilis ke pengguna nyata, jadi tabel baru masih ditambahkan langsung ke
 * `version(1)` alih-alih lewat migrasi `version(2)` — migrasi formal baru
 * perlu begitu ada skema yang sudah "beredar". `history`/`outbox`/`runEvents`
 * menyusul saat fitur riwayat query & sinkronisasi (v1) dibangun.
 */
import Dexie, { type Table } from "dexie";
import type { ChapterId, StepId } from "@/engine/content/types";
import type { DetectiveNote } from "@/engine/notes/types";
import type { ChapterProgress } from "@/engine/progress/types";

export interface DraftEntry {
  chapterId: ChapterId;
  stepId: StepId;
  sql: string;
  updatedAt: number;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}

export class DetektifDB extends Dexie {
  progress!: Table<ChapterProgress, ChapterId>;
  drafts!: Table<DraftEntry, [ChapterId, StepId]>;
  meta!: Table<MetaEntry, string>;
  notes!: Table<DetectiveNote, string>;

  constructor() {
    super("detektif-sql");
    this.version(1).stores({
      progress: "chapterId, status, updatedAt",
      drafts: "[chapterId+stepId], chapterId",
      meta: "key",
      notes: "id, chapterId, [chapterId+updatedAt], *tags, pinned, deletedAt",
    });
  }
}

export const db = new DetektifDB();
