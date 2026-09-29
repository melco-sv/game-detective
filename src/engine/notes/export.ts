/** Ekspor Buku Catatan (docs/02-arsitektur.md §8.4): CSV, TSV, .sql, Markdown, JSON. */
import type { DetectiveNote } from "./types";

function cellText(cell: string | number | null): string {
  return cell === null ? "" : String(cell);
}

function escapeCsvField(value: string, separator: "," | ";"): string {
  if (value.includes(separator) || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Snapshot satu catatan sebagai CSV (UTF-8 + BOM supaya Excel membaca diakritik dengan benar). */
export function noteSnapshotToCsv(note: DetectiveNote, separator: "," | ";" = ","): string {
  if (!note.snapshot) return "";
  const header = note.snapshot.columns.map((c) => escapeCsvField(c.name, separator)).join(separator);
  const rows = note.snapshot.rows.map((row) => row.map((c) => escapeCsvField(cellText(c), separator)).join(separator));
  return "﻿" + [header, ...rows].join("\r\n");
}

/** Snapshot satu catatan sebagai TSV, siap tempel ke Google Sheets/Excel. */
export function noteSnapshotToTsv(note: DetectiveNote): string {
  if (!note.snapshot) return "";
  const header = note.snapshot.columns.map((c) => c.name).join("\t");
  const rows = note.snapshot.rows.map((row) => row.map(cellText).join("\t"));
  return [header, ...rows].join("\n");
}

/** Semua query catatan sebagai satu berkas .sql, tiap catatan diberi komentar judul/tag (gaya log ala Fiftyville). */
export function notesToSqlLog(notes: DetectiveNote[]): string {
  return notes
    .map((n) => {
      const lines = [`-- ${n.title}`];
      if (n.tags.length > 0) lines.push(`-- tag: ${n.tags.join(", ")}`);
      if (n.body) lines.push(...n.body.split("\n").map((l) => `-- ${l}`));
      const sql = n.sql.trimEnd();
      lines.push(sql.endsWith(";") ? sql : `${sql};`);
      return lines.join("\n");
    })
    .join("\n\n");
}

const MAX_MARKDOWN_ROWS = 50;

/** Seluruh buku sebagai satu berkas Markdown ("Berkas Investigasi") untuk dibagikan. */
export function notesToMarkdown(notes: DetectiveNote[], chapterTitle: string): string {
  const parts = [`# Berkas Investigasi — ${chapterTitle}`, ""];
  for (const n of notes) {
    parts.push(`## ${n.title}`);
    if (n.tags.length > 0) parts.push(`*Label: ${n.tags.join(", ")}*`, "");
    parts.push("```sql", n.sql.trimEnd(), "```", "");
    if (n.body) parts.push(n.body, "");
    if (n.snapshot && n.snapshot.rows.length > 0) {
      const header = n.snapshot.columns.map((c) => c.name);
      const rows = n.snapshot.rows.slice(0, MAX_MARKDOWN_ROWS);
      parts.push(`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`);
      for (const row of rows) parts.push(`| ${row.map(cellText).join(" | ")} |`);
      if (n.snapshot.rows.length > MAX_MARKDOWN_ROWS) {
        parts.push(`*(dipotong, menampilkan ${MAX_MARKDOWN_ROWS} dari ${n.snapshot.rows.length} baris)*`);
      }
      parts.push("");
    }
  }
  return parts.join("\n");
}

export interface NotesJsonBackup {
  format: "detektif-sql-notes";
  exportedAt: number;
  notes: DetectiveNote[];
}

/** Backup penuh sebagai JSON — impor (v1) menggabungkan per `id`, last-write-wins berdasar `updatedAt`. */
export function notesToJsonBackup(notes: DetectiveNote[], now: number): NotesJsonBackup {
  return { format: "detektif-sql-notes", exportedAt: now, notes };
}
