"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import type { ChapterSummary } from "@/engine/content/manifest";
import { computeChapterCardStatus, requiredChaptersFor, type ChapterCardStatus } from "@/engine/progress/chapter-status";
import type { ChapterProgress } from "@/engine/progress/types";
import { db } from "@/infra/storage/db";

// Papan Kasus (docs/03-design.md §4.2): badge status progres per kartu bab,
// dibaca live dari Dexie (IndexedDB). Peta Wiralaga dengan pin distrik dan
// filter "Semua/Sedang Diselidiki/Selesai/Belum Terbuka" masih pekerjaan
// lanjutan (band peta + interaksi hover) — di sini fokusnya status kartu.

const DIFFICULTY_LABEL: Record<string, string> = {
  pemula: "Mudah",
  menengah: "Sedang",
  mahir: "Sulit",
};

function starsText(stars: 0 | 1 | 2 | 3): string {
  return "★".repeat(stars) + "☆".repeat(3 - stars);
}

function lockedCaption(chapter: ChapterSummary, chapters: ChapterSummary[]): string {
  const requiredId = requiredChaptersFor(chapter, chapters)[0];
  const requiredChapter = chapters.find((c) => c.id === requiredId);
  return requiredChapter ? `Selesaikan Bab ${requiredChapter.order} untuk membuka` : "Belum terbuka";
}

interface CardBadge {
  status: ChapterCardStatus;
  progress?: ChapterProgress;
}

function StatusBadge({ status, progress }: CardBadge) {
  if (status === "solved" && progress) {
    return (
      <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded bg-success/10 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-success">
        Selesai &middot; {starsText(progress.score.stars)} &middot; Skor {progress.score.best}
      </span>
    );
  }
  if (status === "in-progress" && progress) {
    const total = Object.keys(progress.steps).length;
    const done = Object.values(progress.steps).filter((s) => s.status === "completed").length;
    return (
      <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
        Sedang Diselidiki &middot; Step {done}/{total}
      </span>
    );
  }
  return null;
}

export interface ChapterGridProps {
  chapters: ChapterSummary[];
}

export function ChapterGrid({ chapters }: ChapterGridProps) {
  const progressList = useLiveQuery(() => db.progress.toArray(), [], [] as ChapterProgress[]);
  const progressById = new Map(progressList.map((p) => [p.chapterId, p]));
  const solvedIds = new Set(progressList.filter((p) => p.status === "solved").map((p) => p.chapterId));

  return (
    <>
      <p className="mt-2 text-text-secondary">
        {solvedIds.size} dari {chapters.length} bab selesai. Bab berikutnya terbuka setelah kasus sebelumnya ditutup.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {chapters.map((c) => {
          const progress = progressById.get(c.id);
          const status = computeChapterCardStatus(c, chapters, progress?.status, solvedIds);
          const locked = status === "locked";

          return (
            <article
              key={c.id}
              className={`flex flex-col rounded-lg bg-paper p-5 text-on-paper ${locked ? "opacity-50" : ""}`}
              style={{ borderRadius: "var(--r-paper)" }}
            >
              <span className="font-mono text-xs uppercase tracking-wide text-paper-muted">
                Bab {c.order} &middot; {DIFFICULTY_LABEL[c.difficulty] ?? c.difficulty}
              </span>
              <h2 className="mt-2 font-display text-xl font-bold">{c.title}</h2>
              <p className="mt-2 flex-1 text-sm">{c.tagline}</p>
              {c.contentWarning ? (
                <span className="mt-3 inline-block w-fit rounded bg-on-paper px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-paper">
                  {c.contentWarning.label}
                </span>
              ) : null}
              <StatusBadge status={status} progress={progress} />

              {locked ? (
                <span className="mt-4 inline-block rounded-md bg-on-paper/10 px-4 py-2 text-center text-sm font-semibold text-paper-muted">
                  {lockedCaption(c, chapters)}
                </span>
              ) : (
                <Link
                  href={`/kasus/${c.slug}`}
                  className="mt-4 inline-block rounded-md bg-bg-base px-4 py-2 text-center text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2"
                >
                  {status === "solved" ? "Main Lagi" : status === "in-progress" ? "Lanjutkan" : "Buka Berkas"}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
