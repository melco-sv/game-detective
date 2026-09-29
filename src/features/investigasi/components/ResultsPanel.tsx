"use client";

import type { Cell, ResultColumn } from "@/engine/sql/types";
import type { RunFeedback } from "@/stores/investigation";

// Tabel Hasil + Asisten Otomatis (docs/03-design.md §3.4, §3.10). Header
// kolom TIDAK di-uppercase dan nama kolom persis seperti di DB (§2.2) —
// supaya pemain bisa menyalinnya langsung ke WHERE/ORDER BY.

export interface ResultsPanelProps {
  running: boolean;
  columns?: ResultColumn[];
  rows?: Cell[][];
  totalRows?: number;
  truncated?: boolean;
  durationMs?: number;
  feedback?: RunFeedback;
  onSaveNote?: () => void;
}

function formatCell(value: Cell): { text: string; isNull: boolean } {
  if (value === null || value === undefined) return { text: "NULL", isNull: true };
  if (value instanceof Uint8Array) return { text: `[BLOB ${value.byteLength} byte]`, isNull: false };
  return { text: String(value), isNull: false };
}

function isNumeric(value: Cell): boolean {
  return typeof value === "number" || typeof value === "bigint";
}

export function ResultsPanel({ running, columns, rows, totalRows, truncated, durationMs, feedback, onSaveNote }: ResultsPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-border-subtle bg-surface-1">
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <span className="font-mono text-xs text-text-secondary">
          {running
            ? "Menjalankan query…"
            : columns
              ? `Hasil · ${totalRows?.toLocaleString("id-ID")} baris · ${((durationMs ?? 0) / 1000).toFixed(2)} dtk`
              : "Hasil query akan muncul di sini. Tekan Jalankan Query atau Ctrl + Enter."}
        </span>
        {columns && rows && onSaveNote ? (
          <button
            type="button"
            onClick={onSaveNote}
            className="flex items-center gap-1 rounded px-2 py-1 font-mono text-xs text-text-secondary hover:bg-surface-2 hover:text-primary"
            title="Simpan ke catatan (Ctrl/Cmd+S)"
          >
            Simpan ke Catatan
          </button>
        ) : null}
      </div>

      {truncated ? (
        <div className="border-b border-border-subtle bg-primary/10 px-3 py-1.5 text-xs text-primary">
          Menampilkan {columns ? rows?.length : 0} dari {totalRows?.toLocaleString("id-ID")} baris. Tambahkan LIMIT
          atau filter WHERE.
        </div>
      ) : null}

      <div className="flex-1 overflow-auto">
        {columns && rows ? (
          <table className="w-full border-collapse text-left font-mono text-sm">
            <thead className="sticky top-0 bg-surface-2 text-text-secondary">
              <tr>
                <th className="w-10 px-3 py-2 text-right text-text-muted">#</th>
                {columns.map((c) => (
                  <th key={c.name} className="px-3 py-2 font-semibold">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border-subtle/50 hover:bg-surface-2">
                  <td className="px-3 py-1.5 text-right text-text-muted tabular-nums">{i + 1}</td>
                  {row.map((cell, j) => {
                    const { text, isNull } = formatCell(cell);
                    return (
                      <td
                        key={j}
                        className={`px-3 py-1.5 ${isNumeric(cell) ? "text-right tabular-nums" : ""} ${
                          isNull ? "italic text-text-muted" : "text-text-primary"
                        }`}
                      >
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {feedback ? (
        <div
          className={`border-t px-3 py-2 text-sm ${
            feedback.kind === "error"
              ? "border-danger/40 bg-danger/10 text-danger"
              : feedback.kind === "correct"
                ? "border-success/40 bg-success/10 text-success"
                : "border-primary/40 bg-primary/10 text-primary"
          }`}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          <span className="font-semibold">{feedback.kind === "error" ? "Asisten: " : feedback.kind === "correct" ? "" : "Asisten: "}</span>
          {feedback.message}
          {feedback.kind === "error" ? (
            <p className="mt-1 text-xs text-text-muted">Query gagal tidak mengurangi skor.</p>
          ) : null}
          {feedback.raw ? <p className="mt-1 font-mono text-xs text-text-muted">Detail teknis: {feedback.raw}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
