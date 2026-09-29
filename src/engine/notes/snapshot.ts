/** Membangun `ResultSnapshot` dari hasil query, dipotong sesuai NOTE_LIMITS (§8.2). */
import type { Cell, ResultColumn } from "../sql/types";
import { NOTE_LIMITS, type ResultSnapshot } from "./types";

function cellToSnapshotValue(cell: Cell): string | number | null {
  if (cell === null) return null;
  if (typeof cell === "bigint") return cell.toString();
  if (cell instanceof Uint8Array) return `[BLOB ${cell.byteLength} byte]`;
  if (typeof cell === "string" && cell.length > NOTE_LIMITS.maxSnapshotCellChars) {
    return cell.slice(0, NOTE_LIMITS.maxSnapshotCellChars - 1) + "…";
  }
  return cell;
}

export function buildResultSnapshot(
  columns: ResultColumn[],
  rows: Cell[][],
  totalRows: number,
  truncated: boolean,
  now: number
): ResultSnapshot {
  const limitedColumns = columns.slice(0, NOTE_LIMITS.maxSnapshotColumns);
  const colCount = limitedColumns.length;
  const limitedRows = rows
    .slice(0, NOTE_LIMITS.maxSnapshotRows)
    .map((row) => row.slice(0, colCount).map(cellToSnapshotValue));

  const wasTruncated = truncated || rows.length > NOTE_LIMITS.maxSnapshotRows || columns.length > NOTE_LIMITS.maxSnapshotColumns;

  return {
    columns: limitedColumns,
    rows: limitedRows,
    totalRows,
    truncated: wasTruncated,
    capturedAt: now,
    approxBytes: JSON.stringify({ columns: limitedColumns, rows: limitedRows }).length,
  };
}
