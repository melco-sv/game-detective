import { describe, expect, it } from "vitest";
import { noteSnapshotToCsv, noteSnapshotToTsv, notesToJsonBackup, notesToMarkdown, notesToSqlLog } from "@/engine/notes/export";
import { createNote } from "@/engine/notes/factory";
import { buildResultSnapshot } from "@/engine/notes/snapshot";
import type { ResultColumn } from "@/engine/sql/types";

const columns: ResultColumn[] = [
  { name: "nama", declType: "TEXT" },
  { name: "jam_keluar", declType: "TEXT" },
];
const snapshot = buildResultSnapshot(columns, [["Bambang Hartadi", "00:42"]], 1, false, 5000);

function makeNote(overrides: Partial<Parameters<typeof createNote>[0]> = {}) {
  return createNote({
    chapterId: "ch01",
    stepId: "step-1",
    title: "Kartu Bambang dipakai 00.42",
    sql: "SELECT nama, jam_keluar FROM buku_tamu WHERE nik = '123';",
    snapshot,
    tags: ["curiga"],
    source: "manual",
    contentVersion: "1.0.0",
    now: 5000,
    ...overrides,
  });
}

describe("noteSnapshotToCsv", () => {
  it("diawali BOM, header lalu baris, pemisah default koma", () => {
    const csv = noteSnapshotToCsv(makeNote());
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("nama,jam_keluar");
    expect(csv).toContain("Bambang Hartadi,00:42");
  });

  it("bisa pakai titik koma untuk locale Indonesia", () => {
    const csv = noteSnapshotToCsv(makeNote(), ";");
    expect(csv).toContain("nama;jam_keluar");
  });

  it("sel berisi pemisah/petik dua dibungkus & di-escape", () => {
    const withComma = makeNote({
      snapshot: buildResultSnapshot(columns, [["Hartadi, Bambang", 'ada "kutip"']], 1, false, 0),
    });
    const csv = noteSnapshotToCsv(withComma);
    expect(csv).toContain('"Hartadi, Bambang"');
    expect(csv).toContain('"ada ""kutip"""');
  });

  it("catatan tanpa snapshot -> string kosong", () => {
    expect(noteSnapshotToCsv(makeNote({ snapshot: null }))).toBe("");
  });
});

describe("noteSnapshotToTsv", () => {
  it("dipisah tab, tanpa BOM", () => {
    const tsv = noteSnapshotToTsv(makeNote());
    expect(tsv.startsWith("﻿")).toBe(false);
    expect(tsv).toBe("nama\tjam_keluar\nBambang Hartadi\t00:42");
  });
});

describe("notesToSqlLog", () => {
  it("tiap catatan jadi komentar judul+tag lalu query diakhiri titik koma", () => {
    const log = notesToSqlLog([makeNote()]);
    expect(log).toContain("-- Kartu Bambang dipakai 00.42");
    expect(log).toContain("-- tag: curiga");
    expect(log).toContain("SELECT nama, jam_keluar FROM buku_tamu WHERE nik = '123';");
  });

  it("query yang belum diakhiri ; ditambahkan otomatis", () => {
    const note = makeNote({ sql: "SELECT 1" });
    expect(notesToSqlLog([note])).toContain("SELECT 1;");
  });
});

describe("notesToMarkdown", () => {
  it("berisi judul bab, judul catatan, blok kode SQL, dan tabel hasil", () => {
    const md = notesToMarkdown([makeNote()], "Raibnya Batik Tulis Sang Maestro");
    expect(md).toContain("# Berkas Investigasi — Raibnya Batik Tulis Sang Maestro");
    expect(md).toContain("## Kartu Bambang dipakai 00.42");
    expect(md).toContain("```sql");
    expect(md).toContain("| nama | jam_keluar |");
    expect(md).toContain("| Bambang Hartadi | 00:42 |");
  });

  it("catatan tanpa snapshot tidak menyisipkan tabel", () => {
    const md = notesToMarkdown([makeNote({ snapshot: null })], "Bab");
    expect(md).not.toContain("| nama |");
  });
});

describe("notesToJsonBackup", () => {
  it("membungkus catatan dengan format & exportedAt", () => {
    const backup = notesToJsonBackup([makeNote()], 9999);
    expect(backup.format).toBe("detektif-sql-notes");
    expect(backup.exportedAt).toBe(9999);
    expect(backup.notes).toHaveLength(1);
  });
});
