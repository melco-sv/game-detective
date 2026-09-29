import { readFileSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ChapterManifest, ChapterSummary } from "@/engine/content/manifest";
import { StoryMarkdown } from "@/components/story-markdown";

// Briefing Kasus (docs/03-design.md §4.3). Server Component: manifest dibaca
// langsung dari public/generated/ saat build (situs statis). Worker & DB
// baru mulai dimuat di /investigasi (client component).

function loadManifestBySlug(slug: string): ChapterManifest | undefined {
  const base = path.join(process.cwd(), "public", "generated", "chapters");
  try {
    const index = JSON.parse(readFileSync(path.join(base, "index.json"), "utf-8")) as ChapterSummary[];
    const entry = index.find((c) => c.slug === slug);
    if (!entry) return undefined;
    const manifestPath = path.join(base, entry.id, path.basename(entry.manifestUrl));
    return JSON.parse(readFileSync(manifestPath, "utf-8")) as ChapterManifest;
  } catch {
    return undefined;
  }
}

export default async function BriefingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const manifest = loadManifestBySlug(slug);
  if (!manifest) notFound();

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-8 py-12 lg:grid-cols-[3fr_2fr]">
        <section
          className="relative rounded bg-paper p-8 text-on-paper shadow-lg"
          style={{ borderRadius: "var(--r-paper)" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wide text-paper-muted">
              Bab {manifest.order} &middot; No. Berkas {String(manifest.order).padStart(2, "0")}/DID
            </span>
            {manifest.contentWarning ? (
              <span className="rounded bg-on-paper px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-paper">
                {manifest.contentWarning.label}
              </span>
            ) : null}
          </div>
          <h1 className="font-display text-3xl font-extrabold">{manifest.title}</h1>
          {manifest.contentWarning ? (
            <p className="mt-1 font-mono text-xs text-paper-muted">&bull; {manifest.contentWarning.note}</p>
          ) : null}
          <dl className="mt-4 space-y-1 font-mono text-sm text-paper-muted">
            <div>
              <dt className="inline font-semibold">Lokasi: </dt>
              <dd className="inline">
                {manifest.setting.district}, {manifest.setting.city}
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold">Tanggal: </dt>
              <dd className="inline">{manifest.setting.date}</dd>
            </div>
          </dl>

          <div className="prose prose-sm mt-6 max-w-none text-on-paper">
            <StoryMarkdown text={manifest.briefing} />
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <div className="rounded-lg border border-border-subtle bg-surface-2 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary">Sheet yang Tersedia</h2>
            <p className="mt-1 text-xs text-text-muted">Semua sheet terbuka sejak awal.</p>
            <ul className="mt-3 space-y-2">
              {manifest.database.tables.map((t) => (
                <li key={t.name} className="flex items-center justify-between font-mono text-sm">
                  <span className="text-text-primary">{t.name}</span>
                  <span className="text-text-muted">{t.columns.length} kolom</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border-subtle bg-surface-2 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary">Tokoh Terkait</h2>
            <ul className="mt-3 space-y-1 text-sm text-text-primary">
              {manifest.characters.map((c) => (
                <li key={c.id}>
                  <span className="font-semibold">{c.name}</span> &mdash; {c.role}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border-subtle bg-surface-2 p-5 text-sm text-text-secondary">
            <p>Tekan Ctrl + Enter untuk menjalankan query.</p>
            <p className="mt-1">Query yang gagal tidak mengurangi skor. Bereksperimenlah.</p>
            <p className="mt-1">Laporan bisa diajukan kapan saja, tapi step yang belum selesai tidak memberi poin.</p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={`/kasus/${manifest.slug}/investigasi`}
              className="rounded-md bg-primary px-6 py-3 text-center font-semibold text-on-primary transition-colors hover:bg-primary-hover"
            >
              Buka Ruang Investigasi
            </Link>
            <Link href="/kasus" className="text-center text-sm text-text-secondary hover:text-text-primary">
              Kembali ke Papan Kasus
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
