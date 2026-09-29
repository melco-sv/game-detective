import { describe, expect, it } from "vitest";
import { computeChapterCardStatus, requiredChaptersFor, type ChapterForStatus } from "@/engine/progress/chapter-status";

const ch01: ChapterForStatus = { id: "ch01", order: 1 };
const ch02: ChapterForStatus = { id: "ch02", order: 2 };
const ch03: ChapterForStatus = { id: "ch03", order: 3, unlock: { afterChapters: ["ch01"] } };
const all = [ch01, ch02, ch03];

describe("requiredChaptersFor", () => {
  it("bab pertama tidak butuh syarat apa pun", () => {
    expect(requiredChaptersFor(ch01, all)).toEqual([]);
  });

  it("default: bab dengan order tepat satu sebelumnya", () => {
    expect(requiredChaptersFor(ch02, all)).toEqual(["ch01"]);
  });

  it("unlock eksplisit menang atas default urutan", () => {
    expect(requiredChaptersFor(ch03, all)).toEqual(["ch01"]); // bukan ch02
  });
});

describe("computeChapterCardStatus", () => {
  it("'solved' menang atas segalanya, termasuk syarat unlock", () => {
    expect(computeChapterCardStatus(ch02, all, "solved", new Set())).toBe("solved");
  });

  it("'in-progress' dipakai apa adanya dari progress sendiri", () => {
    expect(computeChapterCardStatus(ch02, all, "in-progress", new Set())).toBe("in-progress");
  });

  it("bab pertama selalu 'available' bila belum pernah disentuh", () => {
    expect(computeChapterCardStatus(ch01, all, undefined, new Set())).toBe("available");
  });

  it("'locked' bila bab syarat belum selesai", () => {
    expect(computeChapterCardStatus(ch02, all, undefined, new Set())).toBe("locked");
    expect(computeChapterCardStatus(ch02, all, undefined, new Set(["ch03"]))).toBe("locked");
  });

  it("'available' begitu semua bab syarat sudah 'solved'", () => {
    expect(computeChapterCardStatus(ch02, all, undefined, new Set(["ch01"]))).toBe("available");
  });

  it("unlock eksplisit dipakai untuk menentukan status juga", () => {
    expect(computeChapterCardStatus(ch03, all, undefined, new Set())).toBe("locked");
    expect(computeChapterCardStatus(ch03, all, undefined, new Set(["ch02"]))).toBe("locked"); // ch02 bukan syarat ch03
    expect(computeChapterCardStatus(ch03, all, undefined, new Set(["ch01"]))).toBe("available");
  });
});
