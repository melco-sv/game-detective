"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { staticContentSource } from "@/infra/content/static-content-source";
import { progressRepository } from "@/infra/storage/progress-repository";
import { CaptureScene } from "@/features/penangkapan/components/CaptureScene";

// Animasi Penangkapan (docs/03-design.md §4.7). Layar transisi antara
// Formulir Laporan Polisi dan Ringkasan Kasus — hanya bisa diakses setelah
// kasus benar-benar "solved" (dibaca dari progres tersimpan, bukan state
// sesi, supaya tautan langsung/reload tetap berfungsi).

export default function PenangkapanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [suspectNames, setSuspectNames] = useState<string[]>();
  const [notSolved, setNotSolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    staticContentSource
      .getManifestBySlug(slug)
      .then(async (manifest) => {
        const progress = await progressRepository.get(manifest.id);
        if (cancelled) return;
        if (progress?.status !== "solved") {
          setNotSolved(true);
          return;
        }
        const names = progress.report.log.find((l) => l.correct)?.names ?? [];
        setSuspectNames(names);
      })
      .catch(() => {
        if (!cancelled) setNotSolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (notSolved) router.replace(`/kasus/${slug}/investigasi`);
  }, [notSolved, slug, router]);

  if (!suspectNames) {
    return <div className="flex min-h-screen items-center justify-center bg-bg-base text-text-secondary">Memuat…</div>;
  }

  return <CaptureScene suspectNames={suspectNames} onViewSummary={() => router.push(`/kasus/${slug}/ringkasan`)} />;
}
