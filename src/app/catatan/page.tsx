import { readFileSync } from "node:fs";
import path from "node:path";
import type { ChapterSummary } from "@/engine/content/manifest";
import { NotesPageView } from "@/features/buku-catatan/components/NotesPageView";

// Halaman Buku Catatan lintas-bab — /catatan (docs/02-arsitektur.md §8.3,
// docs/03-design.md §4.5). Server Component murni untuk daftar bab (statis,
// sama seperti /kasus); NotesPageView ("use client") yang membaca catatan
// live dari Dexie, karena catatan hanya ada di browser pemain.

function loadChapterIndex(): ChapterSummary[] {
  const indexPath = path.join(process.cwd(), "public", "generated", "chapters", "index.json");
  try {
    return JSON.parse(readFileSync(indexPath, "utf-8")) as ChapterSummary[];
  } catch {
    return [];
  }
}

export default function CatatanPage() {
  const chapters = loadChapterIndex().sort((a, b) => a.order - b.order);
  return <NotesPageView chapters={chapters} />;
}
