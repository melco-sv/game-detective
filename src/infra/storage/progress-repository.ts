/** Implementasi `ProgressRepository` (src/engine/ports.ts) di atas Dexie. */
import type { ChapterId } from "@/engine/content/types";
import type { ChapterProgress } from "@/engine/progress/types";
import type { ProgressRepository } from "@/engine/ports";
import { db } from "./db";

export class DexieProgressRepository implements ProgressRepository {
  async get(id: ChapterId): Promise<ChapterProgress | undefined> {
    return db.progress.get(id);
  }

  async put(p: ChapterProgress): Promise<void> {
    await db.progress.put(p);
  }

  async list(): Promise<ChapterProgress[]> {
    return db.progress.toArray();
  }

  async delete(id: ChapterId): Promise<void> {
    await db.progress.delete(id);
  }
}

export const progressRepository = new DexieProgressRepository();
