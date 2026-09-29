"use client";

import { useMemo, useState } from "react";
import type { SqlConcept } from "@/engine/content/types";
import { BUKU_SAKU_ENTRIES, BUKU_SAKU_TOPICS, type BukuSakuTopic } from "../data/entries";

// Buku Saku SQL (docs/03-design.md §3.16): kamus sintaks gratis, tidak
// memengaruhi skor. Tab ketiga panel kanan Ruang Investigasi, juga bisa
// dibuka lewat Ctrl/Cmd+K (lihat page.tsx).

export interface BukuSakuPanelProps {
  onInsert: (sql: string) => void;
  /** Konsep yang dipakai bab yang sedang dimainkan — menyorot chip topik terkait. */
  activeConcepts?: SqlConcept[];
}

function normalize(text: string): string {
  return text.toLocaleLowerCase("id-ID");
}

export function BukuSakuPanel({ onInsert, activeConcepts = [] }: BukuSakuPanelProps) {
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState<BukuSakuTopic | null>(null);

  const relevantTopics = useMemo(() => {
    const conceptSet = new Set(activeConcepts);
    return new Set(BUKU_SAKU_ENTRIES.filter((e) => e.concepts.some((c) => conceptSet.has(c))).map((e) => e.topic));
  }, [activeConcepts]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return BUKU_SAKU_ENTRIES.filter((e) => {
      if (activeTopic && e.topic !== activeTopic) return false;
      if (!q) return true;
      return normalize(e.title).includes(q) || normalize(e.description).includes(q) || normalize(e.example).includes(q);
    });
  }, [query, activeTopic]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border-subtle p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Buku Saku SQL</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari perintah SQL…"
          className="rounded-md border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTopic(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              activeTopic === null ? "bg-primary text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-3"
            }`}
          >
            Semua
          </button>
          {BUKU_SAKU_TOPICS.map((t) => {
            const selected = activeTopic === t.id;
            const relevant = relevantTopics.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTopic(selected ? null : t.id)}
                title={relevant ? "Dipakai di bab ini" : undefined}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  selected
                    ? "bg-primary text-on-primary"
                    : relevant
                      ? "bg-surface-2 text-primary ring-1 ring-primary/50 hover:bg-surface-3"
                      : "bg-surface-2 text-text-secondary hover:bg-surface-3"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-text-muted">Tidak ada entri yang cocok.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((entry) => (
              <details key={entry.id} className="rounded-md border border-border-subtle bg-surface-2">
                <summary className="cursor-pointer select-none px-3 py-2">
                  <span className="font-mono text-sm font-semibold text-text-primary">{entry.title}</span>
                  <span className="ml-2 text-xs text-text-muted">{entry.description}</span>
                </summary>
                <div className="border-t border-border-subtle px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <code className="flex-1 overflow-x-auto whitespace-pre rounded bg-surface-3 px-2 py-1.5 font-mono text-xs text-text-primary">
                      {entry.example}
                    </code>
                    <button
                      type="button"
                      onClick={() => onInsert(entry.example)}
                      className="shrink-0 rounded border border-border-strong px-2 py-1.5 font-mono text-xs text-text-primary hover:bg-surface-3"
                    >
                      Sisipkan
                    </button>
                  </div>

                  {entry.dialect ? (
                    <div className="mt-3 rounded border-l-2 border-info bg-info/10 px-3 py-2 text-xs">
                      <p className="mb-1 flex items-center gap-1 font-semibold text-info">Beda dialek</p>
                      <ul className="space-y-0.5 text-text-secondary">
                        <li>
                          <span className="text-text-muted">SQLite:</span> {entry.dialect.sqlite}
                        </li>
                        {entry.dialect.postgresql ? (
                          <li>
                            <span className="text-text-muted">PostgreSQL:</span> {entry.dialect.postgresql}
                          </li>
                        ) : null}
                        {entry.dialect.mysql ? (
                          <li>
                            <span className="text-text-muted">MySQL:</span> {entry.dialect.mysql}
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border-subtle p-3 text-[11px] text-text-muted">
        Detektif SQL memakai SQLite. Di tempat kerja, kamu mungkin memakai PostgreSQL, MySQL, atau BigQuery. Catatan
        dialek membantu memindahkan kebiasaanmu.
      </div>
    </div>
  );
}
