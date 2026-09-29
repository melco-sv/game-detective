/**
 * ContentSource untuk MVP: fetch dari public/generated/chapters/ (docs/
 * 02-arsitektur.md §3.5, §10). Situs statis, jadi ini murni `fetch()` biasa.
 */
import type { ChapterManifest } from "@/engine/content/manifest";
import type { ChapterId } from "@/engine/content/types";
import type { ChapterSummary, ContentSource } from "@/engine/ports";

async function fetchJson<T>(url: string, notFoundMessage: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${notFoundMessage} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

export class StaticContentSource implements ContentSource {
  async listChapters(): Promise<ChapterSummary[]> {
    return fetchJson<ChapterSummary[]>("/generated/chapters/index.json", "Gagal memuat katalog kasus");
  }

  async getManifest(chapterId: ChapterId): Promise<ChapterManifest> {
    const list = await this.listChapters();
    const entry = list.find((c) => c.id === chapterId);
    if (!entry) throw new Error(`Chapter '${chapterId}' tidak ditemukan di katalog.`);
    return fetchJson<ChapterManifest>(entry.manifestUrl, "Gagal memuat manifest kasus");
  }

  /** Kemudahan untuk rute `/kasus/[slug]`, di luar kontrak ContentSource. */
  async getManifestBySlug(slug: string): Promise<ChapterManifest> {
    const list = await this.listChapters();
    const entry = list.find((c) => c.slug === slug);
    if (!entry) throw new Error(`Kasus '${slug}' tidak ditemukan.`);
    return fetchJson<ChapterManifest>(entry.manifestUrl, "Gagal memuat manifest kasus");
  }
}

export const staticContentSource = new StaticContentSource();
