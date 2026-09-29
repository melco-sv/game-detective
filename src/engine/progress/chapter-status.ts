/**
 * Status kartu bab di Papan Kasus (docs/03-design.md §4.2, B4: "Bab N+1
 * terbuka setelah Bab N selesai"). Fungsi murni: menggabungkan metadata
 * statis bab (urutan, `unlock`) dengan `ChapterProgress` tersimpan (Dexie)
 * untuk memutuskan apakah kartu terkunci/terbuka/berjalan/selesai.
 */
import type { ChapterId } from "../content/types";
import type { ChapterStatus } from "./types";

export type ChapterCardStatus = "locked" | "available" | "in-progress" | "solved";

export interface ChapterForStatus {
  id: ChapterId;
  order: number;
  unlock?: { afterChapters?: ChapterId[] };
}

/**
 * Bab lain yang harus SELESAI sebelum `chapter` terbuka. Tanpa `unlock`
 * eksplisit, defaultnya bab dengan `order` tepat satu sebelumnya (komentar
 * `unlock` di content/types.ts: "default: bab sebelumnya"). Bab pertama
 * (tidak ada bab dengan order lebih kecil) tidak butuh syarat apa pun.
 */
export function requiredChaptersFor(chapter: ChapterForStatus, allChapters: readonly ChapterForStatus[]): ChapterId[] {
  if (chapter.unlock?.afterChapters) return chapter.unlock.afterChapters;
  return allChapters.filter((c) => c.order === chapter.order - 1).map((c) => c.id);
}

/**
 * `ownStatus`: `ChapterProgress.status` milik bab ini sendiri bila sudah
 * pernah disentuh (tidak pernah benar-benar "locked" dalam praktik — itu
 * murni turunan lintas-bab di sini — tapi diterima apa adanya supaya
 * pemanggil tidak perlu menyempitkan tipe secara manual).
 * `solvedChapterIds`: id bab lain yang `ChapterProgress.status === "solved"`.
 */
export function computeChapterCardStatus(
  chapter: ChapterForStatus,
  allChapters: readonly ChapterForStatus[],
  ownStatus: ChapterStatus | undefined,
  solvedChapterIds: ReadonlySet<ChapterId>
): ChapterCardStatus {
  if (ownStatus === "solved") return "solved";
  if (ownStatus === "in-progress") return "in-progress";

  const required = requiredChaptersFor(chapter, allChapters);
  const unlocked = required.every((id) => solvedChapterIds.has(id));
  return unlocked ? "available" : "locked";
}
