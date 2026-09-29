import { describe, expect, it } from "vitest";
import { buildResultSnapshot } from "@/engine/notes/snapshot";
import { NOTE_LIMITS } from "@/engine/notes/types";
import type { ResultColumn } from "@/engine/sql/types";

const columns: ResultColumn[] = [
  { name: "nik", declType: "TEXT" },
  { name: "nama", declType: "TEXT" },
];

describe("buildResultSnapshot", () => {
  it("menyalin kolom & baris apa adanya bila di bawah batas", () => {
    const snap = buildResultSnapshot(columns, [["001", "Budi"]], 1, false, 1000);
    expect(snap.columns).toEqual(columns);
    expect(snap.rows).toEqual([["001", "Budi"]]);
    expect(snap.totalRows).toBe(1);
    expect(snap.truncated).toBe(false);
    expect(snap.capturedAt).toBe(1000);
  });

  it("mengubah bigint jadi string", () => {
    const snap = buildResultSnapshot([{ name: "n", declType: "INTEGER" }], [[123n]], 1, false, 0);
    expect(snap.rows).toEqual([["123"]]);
  });

  it("mengubah blob jadi placeholder '[BLOB n byte]'", () => {
    const blob = new Uint8Array([1, 2, 3, 4]);
    const snap = buildResultSnapshot([{ name: "n", declType: "BLOB" }], [[blob]], 1, false, 0);
    expect(snap.rows).toEqual([["[BLOB 4 byte]"]]);
  });

  it("memotong teks sel yang melebihi maxSnapshotCellChars", () => {
    const longText = "a".repeat(NOTE_LIMITS.maxSnapshotCellChars + 50);
    const snap = buildResultSnapshot([{ name: "n", declType: "TEXT" }], [[longText]], 1, false, 0);
    const cell = snap.rows[0]![0] as string;
    expect(cell.length).toBe(NOTE_LIMITS.maxSnapshotCellChars);
    expect(cell.endsWith("…")).toBe(true);
  });

  it("memotong baris melebihi maxSnapshotRows dan menandai truncated", () => {
    const manyRows = Array.from({ length: NOTE_LIMITS.maxSnapshotRows + 10 }, (_, i) => ["x", `${i}`]);
    const snap = buildResultSnapshot(columns, manyRows, manyRows.length, false, 0);
    expect(snap.rows).toHaveLength(NOTE_LIMITS.maxSnapshotRows);
    expect(snap.truncated).toBe(true);
    expect(snap.totalRows).toBe(manyRows.length); // totalRows tetap jumlah asli, bukan yang dipotong
  });

  it("memotong kolom melebihi maxSnapshotColumns dan menandai truncated", () => {
    const manyCols: ResultColumn[] = Array.from({ length: NOTE_LIMITS.maxSnapshotColumns + 5 }, (_, i) => ({
      name: `c${i}`,
      declType: null,
    }));
    const row = manyCols.map((_, i) => i);
    const snap = buildResultSnapshot(manyCols, [row], 1, false, 0);
    expect(snap.columns).toHaveLength(NOTE_LIMITS.maxSnapshotColumns);
    expect(snap.rows[0]).toHaveLength(NOTE_LIMITS.maxSnapshotColumns);
    expect(snap.truncated).toBe(true);
  });

  it("truncated tetap true bila hasil query sendiri sudah truncated (mis. lastTruncated dari engine)", () => {
    const snap = buildResultSnapshot(columns, [["001", "Budi"]], 5000, true, 0);
    expect(snap.truncated).toBe(true);
  });

  it("meneruskan NULL apa adanya", () => {
    const snap = buildResultSnapshot(columns, [[null, "Budi"]], 1, false, 0);
    expect(snap.rows).toEqual([[null, "Budi"]]);
  });
});
