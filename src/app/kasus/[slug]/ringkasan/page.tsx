"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildRingkasan, type RingkasanData } from "@/engine/progress/ringkasan";
import { staticContentSource } from "@/infra/content/static-content-source";
import { progressRepository } from "@/infra/storage/progress-repository";
import { clearDraftsForChapter } from "@/infra/storage/drafts";
import { RingkasanView } from "@/features/ringkasan/components/RingkasanView";

// Ringkasan Chapter — "Kasus Ditutup" (docs/03-design.md §4.9). Data dibaca
// langsung dari Dexie + manifest statis, bukan dari state sesi Zustand,
// supaya tautan langsung ("Lihat ringkasan" dari Papan Kasus) dan reload
// tetap berfungsi.

export default function RingkasanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [data, setData] = useState<RingkasanData>();
  const [nextChapterHref, setNextChapterHref] = useState<string>();
  const [notSolved, setNotSolved] = useState(false);
  const [chapterId, setChapterId] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [manifest, chapters] = await Promise.all([
        staticContentSource.getManifestBySlug(slug),
        staticContentSource.listChapters(),
      ]);
      const progress = await progressRepository.get(manifest.id);
      if (cancelled) return;
      if (progress?.status !== "solved") {
        setNotSolved(true);
        return;
      }
      setChapterId(manifest.id);
      setData(
        buildRingkasan(
          {
            order: manifest.order,
            title: manifest.title,
            steps: manifest.steps.map((s) => ({ id: s.id, title: s.title, points: s.points, concepts: s.concepts })),
            scoring: manifest.scoring,
          },
          progress
        )
      );
      const next = chapters.find((c) => c.order === manifest.order + 1);
      setNextChapterHref(next ? `/kasus/${next.slug}` : undefined);
    })().catch(() => {
      if (!cancelled) setNotSolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (notSolved) router.replace(`/kasus/${slug}/investigasi`);
  }, [notSolved, slug, router]);

  async function handleRestart() {
    if (!chapterId) return;
    await Promise.all([progressRepository.delete(chapterId), clearDraftsForChapter(chapterId)]);
    router.push(`/kasus/${slug}/investigasi`);
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center bg-bg-base text-text-secondary">Memuat ringkasan…</div>;
  }

  return <RingkasanView data={data} slug={slug} nextChapterHref={nextChapterHref} onRestart={handleRestart} />;
}
