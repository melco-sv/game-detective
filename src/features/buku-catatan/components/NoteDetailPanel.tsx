"use client";

import { useState } from "react";
import type { DetectiveNote } from "@/engine/notes/types";
import { noteSnapshotToCsv, noteSnapshotToTsv } from "@/engine/notes/export";
import { downloadTextFile } from "@/lib/download";

// Panel detail catatan (docs/03-design.md §4.5): query lengkap, tabel hasil
// snapshot, catatan pribadi, "Jalankan Ulang" (hanya tersedia bila ada mesin
// SQL aktif — lihat NotesDrawer) dan "Salin ke Editor".

export interface NoteDetailPanelProps {
  note: DetectiveNote;
  onCopyToEditor: () => void;
  onRerun?: () => void;
  onClose?: () => void;
}

export function NoteDetailPanel({ note, onCopyToEditor, onRerun, onClose }: NoteDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  async function copyTsv() {
    try {
      await navigator.clipboard.writeText(noteSnapshotToTsv(note));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia — abaikan diam-diam
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      {onClose ? (
        <button type="button" onClick={onClose} className="mb-2 self-start text-xs text-text-muted hover:text-text-primary">
          &larr; Kembali ke daftar
        </button>
      ) : null}

      <h2 className="font-display text-lg font-bold text-text-primary">{note.title}</h2>
      {note.tags.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {note.tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-text-secondary">
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <section className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Query</h3>
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-surface-3 p-2 font-mono text-xs text-text-primary">{note.sql}</pre>
      </section>

      {note.snapshot ? (
        <section className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">
            Hasil (snapshot {new Date(note.snapshot.capturedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })})
          </h3>
          <div className="mt-1 overflow-x-auto rounded border border-border-subtle">
            <table className="w-full border-collapse font-mono text-xs">
              <thead className="bg-surface-2 text-text-secondary">
                <tr>
                  {note.snapshot.columns.map((c) => (
                    <th key={c.name} className="px-2 py-1 text-left font-semibold">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {note.snapshot.rows.map((row, i) => (
                  <tr key={i} className="border-t border-border-subtle/50">
                    {row.map((cell, j) => (
                      <td key={j} className={`px-2 py-1 ${cell === null ? "italic text-text-muted" : "text-text-primary"}`}>
                        {cell === null ? "NULL" : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {note.snapshot.truncated ? (
            <p className="mt-1 text-[11px] text-text-muted">
              Snapshot dipotong ke {note.snapshot.rows.length} baris (hasil asli {note.snapshot.totalRows} baris).
            </p>
          ) : null}
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={() => downloadTextFile(`${note.title}.csv`, noteSnapshotToCsv(note))}
              className="text-[11px] text-text-muted hover:text-text-primary"
            >
              Unduh CSV
            </button>
            <button type="button" onClick={copyTsv} className="text-[11px] text-text-muted hover:text-text-primary">
              {copied ? "Disalin!" : "Salin sebagai TSV"}
            </button>
          </div>
        </section>
      ) : null}

      {note.body ? (
        <section className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Catatan pribadi</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{note.body}</p>
        </section>
      ) : null}

      <div className="mt-4 flex gap-2">
        {onRerun ? (
          <button type="button" onClick={onRerun} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:bg-primary-hover">
            Jalankan Ulang
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCopyToEditor}
          className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-surface-2"
        >
          Salin ke Editor
        </button>
      </div>
    </div>
  );
}
