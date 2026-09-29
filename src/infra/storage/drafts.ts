/**
 * Draf editor SQL per step (docs/02-arsitektur.md §9.3: "Draf editor
 * disimpan dengan debounce 500 ms"). Debounce dilakukan pemanggil
 * (src/stores/investigation.ts); modul ini hanya baca/tulis Dexie.
 */
import type { ChapterId, StepId } from "@/engine/content/types";
import { db, type DraftEntry } from "./db";

export async function listDraftsForChapter(chapterId: ChapterId): Promise<DraftEntry[]> {
  return db.drafts.where("chapterId").equals(chapterId).toArray();
}

export async function putDraft(chapterId: ChapterId, stepId: StepId, sql: string): Promise<void> {
  await db.drafts.put({ chapterId, stepId, sql, updatedAt: Date.now() });
}

/** "Ulangi Bab" (docs/03-design.md §4.9): buang draf lama supaya editor mulai bersih. */
export async function clearDraftsForChapter(chapterId: ChapterId): Promise<void> {
  await db.drafts.where("chapterId").equals(chapterId).delete();
}
