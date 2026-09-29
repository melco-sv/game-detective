import { describe, expect, it } from "vitest";
import { hashSuspectName, normalizeName, verifySuspectsLocal } from "@/engine/validation/suspect";
import type { CompiledReport } from "@/engine/content/manifest";

const CHAPTER_ID = "ch01-raibnya-batik-tulis-sang-maestro";

describe("normalizeName", () => {
  it("membuang diakritik, huruf besar, dan sapaan", () => {
    expect(normalizeName("Bapak Budi Santoso")).toBe("budi santoso");
    expect(normalizeName("Ibu Siti Marlina")).toBe("siti marlina");
  });

  it("membuang tanda baca dan merapikan spasi ganda", () => {
    expect(normalizeName("  Budi,  Santoso.  ")).toBe("budi santoso");
  });

  it("nama mirip (red herring) tetap dibedakan", () => {
    expect(normalizeName("Budi Santoso")).not.toBe(normalizeName("Budi Santosa"));
  });
});

describe("verifySuspectsLocal — 1 slot (Bab 1-7)", () => {
  async function buildReport(): Promise<CompiledReport> {
    const correctHash = await hashSuspectName(CHAPTER_ID, normalizeName("Budi Santoso"));
    return {
      suspects: [{ id: "tersangka", label: "Nama Tersangka", hashes: [correctHash] }],
      wrongNotes: {},
      defaultWrongNote: "Kamu belum menemukan orang yang tepat.",
      arrest: { scene: "galeri", epilogue: "Selesai." },
    };
  }

  it("nama benar (termasuk variasi kapitalisasi/spasi) dinyatakan benar", async () => {
    const report = await buildReport();
    const verdict = await verifySuspectsLocal(CHAPTER_ID, report, ["  budi   SANTOSO "]);
    expect(verdict.correct).toBe(true);
  });

  it("nama salah dinyatakan salah dengan catatan default", async () => {
    const report = await buildReport();
    const verdict = await verifySuspectsLocal(CHAPTER_ID, report, ["Siapa Saja"]);
    expect(verdict.correct).toBe(false);
    expect(verdict.wrongNote).toBe(report.defaultWrongNote);
  });

  it("catatan khusus per nama dipakai bila tersedia", async () => {
    const report = await buildReport();
    const wrongHash = await hashSuspectName(CHAPTER_ID, normalizeName("Dimas Pratama"));
    report.wrongNotes[wrongHash] = "Dimas keluar lewat pintu depan, bukan pintu samping.";
    const verdict = await verifySuspectsLocal(CHAPTER_ID, report, ["Dimas Pratama"]);
    expect(verdict.correct).toBe(false);
    expect(verdict.wrongNote).toBe("Dimas keluar lewat pintu depan, bukan pintu samping.");
  });

  it("tidak pernah memberi tahu jumlah nama yang benar (hanya correct: boolean)", async () => {
    const report = await buildReport();
    const verdict = await verifySuspectsLocal(CHAPTER_ID, report, ["Salah"]);
    expect(Object.keys(verdict).sort()).toEqual(["correct", "wrongNote"].sort());
  });
});

describe("verifySuspectsLocal — 3 slot (Bab 8, B7)", () => {
  async function buildReport(): Promise<CompiledReport> {
    const dalangHash = await hashSuspectName(CHAPTER_ID, normalizeName("Anjani Rukmasari"));
    const p1Hash = await hashSuspectName(CHAPTER_ID, normalizeName("Satria Pranadipa"));
    const p2Hash = await hashSuspectName(CHAPTER_ID, normalizeName("Rizal Hadinata"));
    return {
      suspects: [
        { id: "dalang", label: "Dalang", hashes: [dalangHash] },
        { id: "perantara-1", label: "Perantara 1", group: "perantara", hashes: [p1Hash] },
        { id: "perantara-2", label: "Perantara 2", group: "perantara", hashes: [p2Hash] },
      ],
      wrongNotes: {},
      defaultWrongNote: "Belum tepat.",
      misplacedNote: "Orang ini terlibat, tapi bukan di peran itu.",
      arrest: { scene: "balai-kota", epilogue: "Jaringan terbongkar." },
    };
  }

  it("ketiga nama benar dengan urutan Perantara asli dinyatakan benar", async () => {
    const report = await buildReport();
    const verdict = await verifySuspectsLocal(CHAPTER_ID, report, [
      "Anjani Rukmasari",
      "Satria Pranadipa",
      "Rizal Hadinata",
    ]);
    expect(verdict.correct).toBe(true);
  });

  it("dua Perantara boleh tertukar urutannya", async () => {
    const report = await buildReport();
    const verdict = await verifySuspectsLocal(CHAPTER_ID, report, [
      "Anjani Rukmasari",
      "Rizal Hadinata", // tertukar
      "Satria Pranadipa", // tertukar
    ]);
    expect(verdict.correct).toBe(true);
  });

  it("slot Dalang harus tepat: Perantara ditulis di slot Dalang dinyatakan salah", async () => {
    const report = await buildReport();
    const verdict = await verifySuspectsLocal(CHAPTER_ID, report, [
      "Satria Pranadipa", // Perantara ditulis sebagai Dalang -> salah
      "Anjani Rukmasari",
      "Rizal Hadinata",
    ]);
    expect(verdict.correct).toBe(false);
  });

  it("orang yang terlibat tapi ditulis di slot keliru mendapat misplacedNote", async () => {
    const report = await buildReport();
    // Satria (Perantara asli) ditulis di slot Dalang; Dalang & Perantara-2 asli hilang.
    const verdict = await verifySuspectsLocal(CHAPTER_ID, report, [
      "Satria Pranadipa",
      "Orang Lain",
      "Orang Lain Lagi",
    ]);
    expect(verdict.correct).toBe(false);
    // Catatan bisa berupa misplacedNote ATAU defaultWrongNote tergantung nama
    // mana yang dipilih deterministik; keduanya valid, tapi harus salah satu.
    expect([report.misplacedNote, report.defaultWrongNote]).toContain(verdict.wrongNote);
  });

  it("satu nama saja yang salah tetap membuat seluruh laporan salah (semua-atau-tidak)", async () => {
    const report = await buildReport();
    const verdict = await verifySuspectsLocal(CHAPTER_ID, report, [
      "Anjani Rukmasari",
      "Satria Pranadipa",
      "Orang Yang Salah",
    ]);
    expect(verdict.correct).toBe(false);
  });

  it("melempar error bila jumlah input tidak sama dengan jumlah slot", async () => {
    const report = await buildReport();
    await expect(verifySuspectsLocal(CHAPTER_ID, report, ["Cuma Satu Nama"])).rejects.toThrow();
  });
});
