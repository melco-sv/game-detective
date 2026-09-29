"use client";

import { useState } from "react";
import type { DetectiveNote } from "@/engine/notes/types";

// Kartu catatan (docs/03-design.md §4.5): judul, meta bab/step/waktu, label,
// mini tabel snapshot (maks 3 baris), aksi cepat + menu (Sematkan/Edit/Hapus).

const TAG_BORDER: Record<string, string> = {
  tersangka: "border-l-danger",
  bukti: "border-l-primary",
  alibi: "border-l-info",
  laporan: "border-l-text-muted",
};

function tagBorderClass(tags: string[]): string {
  const known = tags.find((t) => t in TAG_BORDER);
  return known ? TAG_BORDER[known]! : "border-l-border-strong";
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export interface NoteCardProps {
  note: DetectiveNote;
  chapterOrder?: number;
  stepTitle?: string;
  onSelect: () => void;
  onCopyToEditor: () => void;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function NoteCard({ note, chapterOrder, stepTitle, onSelect, onCopyToEditor, onTogglePin, onEdit, onDelete }: NoteCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const previewRows = note.snapshot?.rows.slice(0, 3) ?? [];

  return (
    <div className={`rounded-md border-l-[3px] border-y border-r border-border-subtle bg-surface-1 ${tagBorderClass(note.tags)}`}>
      <button type="button" onClick={onSelect} className="w-full p-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-text-primary">{note.title}</span>
          {note.pinned ? (
            <span className="shrink-0 text-xs text-primary" title="Disematkan" aria-label="Disematkan">
              &#128204;
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 font-mono text-xs text-text-muted">
          {chapterOrder ? `Bab ${chapterOrder}` : null}
          {stepTitle ? ` · ${stepTitle}` : null} · {formatTime(note.updatedAt)}
        </p>
        {note.tags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {note.tags.map((t) => (
              <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-text-secondary">
                {t}
              </span>
            ))}
          </div>
        ) : null}

        {previewRows.length > 0 ? (
          <table className="mt-2 w-full border-collapse font-mono text-[11px] text-text-muted">
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-t border-border-subtle/50">
                  {row.slice(0, 4).map((cell, j) => (
                    <td key={j} className="truncate px-1 py-0.5">
                      {cell === null ? "NULL" : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </button>

      <div className="flex items-center justify-between border-t border-border-subtle px-3 py-1.5">
        <button type="button" onClick={onCopyToEditor} className="font-mono text-xs text-text-secondary hover:text-primary">
          Salin ke Editor
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded px-2 py-1 text-text-muted hover:bg-surface-2 hover:text-text-primary"
            aria-label="Menu catatan"
          >
            &#8942;
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border border-border-subtle bg-surface-2 py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onTogglePin();
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:bg-surface-3"
              >
                {note.pinned ? "Lepas Sematan" : "Sematkan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:bg-surface-3"
              >
                Ubah Judul & Label
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-danger hover:bg-surface-3"
              >
                Hapus
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
