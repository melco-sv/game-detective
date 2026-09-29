/**
 * Editor SQL boleh berisi beberapa query; Ctrl/Cmd+Enter menjalankan hanya
 * query di posisi kursor atau teks yang diseleksi, sehingga Worker tetap
 * menerima satu statement (docs/02-arsitektur.md §2.3, §3.4).
 */
import { splitStatements } from "./tokenizer";

export interface CursorSelection {
  start: number;
  end: number;
}

/**
 * Menentukan statement mana yang dijalankan:
 * 1. Bila ada seleksi non-kosong, pakai teksnya apa adanya (di-trim).
 * 2. Selain itu, cari statement yang mengandung posisi kursor.
 * 3. Bila kursor berada setelah statement terakhir (spasi/baris kosong di
 *    akhir), pakai statement terakhir.
 *
 * Mengembalikan `undefined` bila editor kosong.
 */
export function statementAtCursor(
  fullText: string,
  cursor: number,
  selection?: CursorSelection
): string | undefined {
  if (selection && selection.end > selection.start) {
    const selected = fullText.slice(selection.start, selection.end).trim();
    if (selected.length > 0) return selected;
  }

  const statements = splitStatements(fullText);
  if (statements.length === 0) return undefined;

  for (const s of statements) {
    if (cursor >= s.start && cursor <= s.end) return s.text.trim();
  }

  return statements[statements.length - 1]?.text.trim();
}
