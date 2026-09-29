import { readFileSync } from "node:fs";
import path from "node:path";
import type { ChapterSummary } from "@/engine/content/manifest";

// `output: 'export'` mem-pre-render rute [slug] lewat generateStaticParams()
// dari index.json, dengan dynamicParams = false (docs/02-arsitektur.md §11).
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  const indexPath = path.join(process.cwd(), "public", "generated", "chapters", "index.json");
  try {
    const chapters = JSON.parse(readFileSync(indexPath, "utf-8")) as ChapterSummary[];
    return chapters.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
