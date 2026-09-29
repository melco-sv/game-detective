"use client";

import Link from "next/link";
import { useState } from "react";
import type { RingkasanData } from "@/engine/progress/ringkasan";

// Ringkasan Chapter — "Kasus Ditutup" (docs/03-design.md §4.9). Sistem
// "pangkat" (lencana "Detektif Senior" dst.) sengaja belum dibuat: itu butuh
// progres LINTAS BAB yang belum ada model datanya (baru 1 bab di MVP). Kutip
// Bu Laras memakai teks generik non-spoiler karena skema konten belum punya
// field "kutipan penutup" per bab.

function formatDuration(ms: number | undefined): string {
  if (!ms || ms <= 0) return "–";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDate(ms: number | undefined): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export interface RingkasanViewProps {
  data: RingkasanData;
  slug: string;
  nextChapterHref?: string;
  onRestart: () => void;
}

export function RingkasanView({ data, slug, nextChapterHref, onRestart }: RingkasanViewProps) {
  const [copied, setCopied] = useState(false);

  const shareText = `Aku menutup Bab ${data.chapterOrder} Detektif SQL dalam ${formatDuration(data.timeSpentMs)} dengan skor ${data.total}. Berani coba?`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // pemain membatalkan dialog berbagi — jatuh ke salin clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia (mis. konteks tidak aman) — abaikan diam-diam
    }
  }

  const hintLines = data.steps.filter((s) => s.hintPenalty > 0).map((s) => `Step ${s.order} · Petunjuk ${s.hintsRevealed}`);

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-12">
      {/* Header manila */}
      <div className="rounded-lg bg-paper p-8 text-on-paper" style={{ borderRadius: "var(--r-paper)" }}>
        <span className="inline-block w-fit rounded border-2 border-stamp-green px-3 py-1 font-display text-sm font-extrabold uppercase tracking-widest text-stamp-green">
          Kasus Ditutup
        </span>
        <h1 className="mt-3 font-display text-3xl font-extrabold">
          Bab {data.chapterOrder} &middot; {data.chapterTitle}
        </h1>
        <p className="mt-1 font-mono text-sm text-paper-muted">
          Pelaku: {data.suspectNames.join(" & ") || "—"}
          {data.solvedAt ? ` — ditangkap ${formatDate(data.solvedAt)}` : null}
        </p>
      </div>

      {/* Kartu statistik */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Skor</p>
          <p className="mt-1 font-display text-2xl font-bold text-text-primary">
            {data.total} <span className="text-base font-normal text-text-muted">/ {data.scoreBase}</span>
          </p>
        </div>
        <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Waktu</p>
          <p className="mt-1 font-display text-2xl font-bold text-text-primary">{formatDuration(data.timeSpentMs)}</p>
          <p className="mt-0.5 text-[11px] text-text-muted">tidak memengaruhi skor</p>
        </div>
        <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Bantuan Terpakai</p>
          <p className="mt-1 font-display text-2xl font-bold text-text-primary">{data.stepsWithHintsCount} step</p>
        </div>
        <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Query Dijalankan</p>
          <p className="mt-1 font-display text-2xl font-bold text-text-primary">{data.totalRuns}</p>
        </div>
      </div>

      {/* Dua kolom */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border-subtle bg-surface-1 p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-text-secondary">Rincian Skor</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            <li className="flex justify-between">
              <span>Skor dasar</span>
              <span className="font-mono tabular-nums">{data.scoreBase}</span>
            </li>
            {data.hintPenaltyTotal > 0 ? (
              <li className="flex justify-between gap-4">
                <span>Bantuan ({hintLines.join("; ")})</span>
                <span className="font-mono tabular-nums text-danger">−{data.hintPenaltyTotal}</span>
              </li>
            ) : null}
            {data.reportPenalty > 0 ? (
              <li className="flex justify-between">
                <span>Laporan salah ({data.wrongAttempts}&times;)</span>
                <span className="font-mono tabular-nums text-danger">−{data.reportPenalty}</span>
              </li>
            ) : null}
            <li className="flex justify-between border-t border-border-subtle pt-2 font-semibold text-text-primary">
              <span>Total</span>
              <span className="font-mono tabular-nums">{data.total}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-subtle bg-surface-1 p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-text-secondary">Jejak Penyelidikan</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {data.steps.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                {s.completed ? (
                  <>
                    <span className="text-text-secondary">
                      {s.order} &middot; {s.title}
                      {s.hintsRevealed > 0 ? (
                        <span className="ml-2 rounded bg-[#B99AFF]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#B99AFF]">
                          Petunjuk {s.hintsRevealed}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-text-muted">{formatDuration(s.durationMs)}</span>
                  </>
                ) : (
                  <span className="text-text-muted">
                    {s.order} &middot; {s.title} — Tidak diselesaikan &middot; 0 poin
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Konsep SQL */}
      {data.concepts.length > 0 ? (
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-text-secondary">Konsep SQL yang kamu kuasai</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.concepts.map((c) => (
              <span key={c} className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs uppercase text-text-secondary">
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Kutipan */}
      <blockquote className="mt-6 rounded-md border-l-4 border-primary bg-surface-1 p-4 text-sm italic text-text-secondary">
        &ldquo;Kerja rapi, Penyidik. Satu berkas lagi selesai — masih banyak arsip menunggu di meja.&rdquo;
        <footer className="mt-1 not-italic text-xs text-text-muted">— Bu Laras, Kepala Unit</footer>
      </blockquote>

      {/* CTA */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={nextChapterHref ?? "/kasus"}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover"
        >
          {nextChapterHref ? "Lanjut ke Bab Berikutnya" : "Kembali ke Papan Kasus"}
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-md border border-border-strong px-5 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary"
        >
          Ulangi Bab
        </button>
        <button type="button" onClick={handleShare} className="rounded-md px-5 py-2 text-sm font-semibold text-text-muted hover:text-text-primary">
          {copied ? "Disalin!" : "Bagikan Hasil"}
        </button>
        {!nextChapterHref ? <p className="w-full text-xs text-text-muted">Bab berikutnya segera hadir.</p> : null}
      </div>

      <p className="mt-4">
        <Link href={`/kasus/${slug}`} className="text-xs text-text-muted underline hover:text-text-secondary">
          Lihat berkas kasus ini lagi
        </Link>
      </p>
    </div>
  );
}
