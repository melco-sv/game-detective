import { readFileSync } from "node:fs";
import path from "node:path";
import type { ChapterSummary } from "@/engine/content/manifest";
import { ChapterGrid } from "@/features/papan-kasus/components/ChapterGrid";

// Pilih Chapter — "Papan Kasus" (docs/03-design.md §4.2). Server Component:
// daftar bab dari public/generated/chapters/index.json (hasil
// scripts/build-content.ts, statis pada build). Badge status progres per
// kartu (Selesai/Sedang Diselidiki/Terkunci) dibaca live dari Dexie di
// ChapterGrid ("use client") karena progres hanya ada di browser pemain.
// Peta Wiralaga, pin distrik, dan filter masih pekerjaan lanjutan.

function loadChapterIndex(): ChapterSummary[] {
  const indexPath = path.join(process.cwd(), "public", "generated", "chapters", "index.json");
  try {
    return JSON.parse(readFileSync(indexPath, "utf-8")) as ChapterSummary[];
  } catch {
    return [];
  }
}

export default function PapanKasusPage() {
  const chapters = loadChapterIndex().sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-12">
      <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-primary">
        Divisi Investigasi Data &middot; Arsip Kasus Resmi
      </p>
      <h1 className="mt-2 font-display text-4xl font-extrabold text-text-primary">Papan Kasus</h1>

      {chapters.length === 0 ? (
        <p className="mt-12 rounded-lg border border-dashed border-border-strong p-8 text-center text-text-muted">
          Belum ada berkas kasus yang dibangun. Jalankan{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm">npm run content:build</code>.
        </p>
      ) : (
        <ChapterGrid chapters={chapters} />
      )}
    </div>
  );
}
