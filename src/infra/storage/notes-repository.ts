/** Implementasi `NotesRepository` (src/engine/ports.ts) di atas Dexie. */
import type { ChapterId } from "@/engine/content/types";
import type { DetectiveNote } from "@/engine/notes/types";
import type { NotesRepository } from "@/engine/ports";
import { db } from "./db";

export class DexieNotesRepository implements NotesRepository {
  /** Tidak menyertakan catatan yang sudah soft-delete (`deletedAt` terisi). */
  async list(chapterId?: ChapterId): Promise<DetectiveNote[]> {
    const all = chapterId ? await db.notes.where("chapterId").equals(chapterId).toArray() : await db.notes.toArray();
    return all.filter((n) => n.deletedAt === undefined);
  }

  async put(n: DetectiveNote): Promise<void> {
    await db.notes.put(n);
  }

  async softDelete(id: string): Promise<void> {
    await db.notes.update(id, { deletedAt: Date.now() });
  }
}

export const notesRepository = new DexieNotesRepository();
