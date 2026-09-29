import { describe, expect, it } from "vitest";
import { createNote, updateNote } from "@/engine/notes/factory";
import { NOTE_LIMITS } from "@/engine/notes/types";

const baseInput = {
  chapterId: "ch01",
  stepId: "step-1",
  title: "Kartu Bambang",
  sql: "SELECT * FROM buku_tamu;",
  snapshot: null,
  tags: [],
  source: "manual" as const,
  contentVersion: "1.0.0",
  now: 1_000,
};

describe("createNote", () => {
  it("mengisi id (ULID), createdAt/updatedAt dari `now`, dan pinned default false", () => {
    const note = createNote(baseInput);
    expect(note.id).toMatch(/^[0-9A-Z]{26}$/);
    expect(note.createdAt).toBe(1000);
    expect(note.updatedAt).toBe(1000);
    expect(note.pinned).toBe(false);
    expect(note.title).toBe("Kartu Bambang");
  });

  it("judul kosong -> fallback 'Catatan HH:MM' (UTC, deterministik)", () => {
    const note = createNote({ ...baseInput, title: "   " });
    expect(note.title).toMatch(/^Catatan \d{2}:\d{2}$/);
  });

  it("tag dinormalkan: huruf kecil, trim, unik, dibatasi maxTags", () => {
    const note = createNote({ ...baseInput, tags: [" Bukti ", "bukti", "Alibi", "a", "b", "c", "d", "e", "f", "g"] });
    expect(note.tags).toEqual(["bukti", "alibi", "a", "b", "c", "d", "e", "f"]);
    expect(note.tags.length).toBeLessThanOrEqual(NOTE_LIMITS.maxTags);
  });

  it("body/sql dipotong ke batas karakter", () => {
    const note = createNote({
      ...baseInput,
      body: "x".repeat(NOTE_LIMITS.maxBodyChars + 100),
      sql: "y".repeat(NOTE_LIMITS.maxSqlChars + 100),
    });
    expect(note.body!.length).toBe(NOTE_LIMITS.maxBodyChars);
    expect(note.sql.length).toBe(NOTE_LIMITS.maxSqlChars);
  });

  it("body kosong/spasi -> undefined, bukan string kosong", () => {
    const note = createNote({ ...baseInput, body: "   " });
    expect(note.body).toBeUndefined();
  });

  it("source 'suggested' tersimpan apa adanya", () => {
    const note = createNote({ ...baseInput, source: "suggested" });
    expect(note.source).toBe("suggested");
  });
});

describe("updateNote", () => {
  it("hanya field yang di-patch yang berubah, updatedAt selalu ikut `now`", () => {
    const note = createNote(baseInput);
    const updated = updateNote(note, { pinned: true }, 2000);
    expect(updated.pinned).toBe(true);
    expect(updated.title).toBe(note.title);
    expect(updated.updatedAt).toBe(2000);
    expect(updated.createdAt).toBe(note.createdAt); // tidak berubah
  });

  it("ubah judul jadi kosong -> fallback, bukan judul lama", () => {
    const note = createNote(baseInput);
    const updated = updateNote(note, { title: "  " }, 3000);
    expect(updated.title).toMatch(/^Catatan \d{2}:\d{2}$/);
  });

  it("ubah tags mengganti seluruh daftar (bukan menambah)", () => {
    const note = createNote({ ...baseInput, tags: ["lama"] });
    const updated = updateNote(note, { tags: ["baru"] }, 3000);
    expect(updated.tags).toEqual(["baru"]);
  });
});
