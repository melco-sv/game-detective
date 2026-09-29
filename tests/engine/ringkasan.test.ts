import { describe, expect, it } from "vitest";
import { buildRingkasan, type RingkasanManifest } from "@/engine/progress/ringkasan";
import { DEFAULT_SCORING } from "@/engine/content/types";
import { createEmptyStepProgress, type ChapterProgress, type StepProgress } from "@/engine/progress/types";

const manifest: RingkasanManifest = {
  order: 1,
  title: "Raibnya Batik Tulis Sang Maestro",
  steps: [
    { id: "step-1", title: "Buka arsip laporan", points: 250, concepts: ["select", "where"] },
    { id: "step-2", title: "Pintu samping", points: 250, concepts: ["where", "between"] },
    { id: "step-3", title: "Yang terakhir keluar", points: 250, concepts: ["order-by", "limit"] },
    { id: "step-4", title: "Dua Budi", points: 250, concepts: ["where"] },
  ],
  scoring: DEFAULT_SCORING,
};

function completedStep(overrides: Partial<StepProgress> = {}): StepProgress {
  return { ...createEmptyStepProgress(), status: "completed", points: 250, ...overrides };
}

function baseProgress(steps: Record<string, StepProgress>, overrides: Partial<ChapterProgress> = {}): ChapterProgress {
  return {
    chapterId: "ch01",
    contentVersion: "1.0.0",
    status: "solved",
    currentStepId: null,
    steps,
    report: { attempts: 1, wrongAttempts: 0, log: [{ id: "01", names: ["Budi Santosa"], at: 5000, correct: true }] },
    score: { current: 1000, best: 1000, max: 1000, stars: 3 },
    timeSpentMs: 5000,
    runs: 6,
    startedAt: 0,
    completedAt: 5000,
    updatedAt: 5000,
    ...overrides,
  };
}

describe("buildRingkasan", () => {
  it("skor penuh tanpa bantuan/salah tuduh: total == scoreBase, tanpa penalti", () => {
    const progress = baseProgress({
      "step-1": completedStep({ startedAt: 0, completedAt: 1000 }),
      "step-2": completedStep({ startedAt: 1000, completedAt: 2000 }),
      "step-3": completedStep({ startedAt: 2000, completedAt: 3000 }),
      "step-4": completedStep({ startedAt: 3000, completedAt: 5000 }),
    });
    const r = buildRingkasan(manifest, progress);
    expect(r.scoreBase).toBe(1000);
    expect(r.hintPenaltyTotal).toBe(0);
    expect(r.reportPenalty).toBe(0);
    expect(r.total).toBe(1000);
    expect(r.suspectNames).toEqual(["Budi Santosa"]);
    expect(r.stepsWithHintsCount).toBe(0);
    expect(r.steps[0]!.durationMs).toBe(1000);
  });

  it("penalti bantuan dihitung per step dari basePoints step tsb, dijumlah jadi hintPenaltyTotal", () => {
    const progress = baseProgress(
      {
        "step-1": completedStep({ hintsRevealed: 2 }), // 10% dari 250 = 25
        "step-2": completedStep({ hintsRevealed: 3 }), // 30% dari 250 = 75
        "step-3": completedStep(),
        "step-4": completedStep(),
      },
      { score: { current: 900, best: 900, max: 1000, stars: 2 } }
    );
    const r = buildRingkasan(manifest, progress);
    expect(r.hintPenaltyTotal).toBe(100); // 25 + 75
    expect(r.stepsWithHintsCount).toBe(2);
    expect(r.steps[0]!.hintPenalty).toBe(25);
    expect(r.steps[1]!.hintPenalty).toBe(75);
  });

  it("penalti laporan salah = wrongAttempts x 10% x maxScore", () => {
    const progress = baseProgress(
      {
        "step-1": completedStep(),
        "step-2": completedStep(),
        "step-3": completedStep(),
        "step-4": completedStep(),
      },
      { report: { attempts: 2, wrongAttempts: 1, log: [] }, score: { current: 900, best: 900, max: 1000, stars: 2 } }
    );
    const r = buildRingkasan(manifest, progress);
    expect(r.reportPenalty).toBe(100);
    expect(r.wrongAttempts).toBe(1);
  });

  it("step yang tidak selesai: 0 poin, tanpa durasi, tidak masuk daftar konsep", () => {
    const progress = baseProgress({
      "step-1": completedStep(),
      "step-2": createEmptyStepProgress(), // belum selesai
      "step-3": createEmptyStepProgress(),
      "step-4": createEmptyStepProgress(),
    });
    const r = buildRingkasan(manifest, progress);
    expect(r.steps[1]!.completed).toBe(false);
    expect(r.steps[1]!.points).toBe(0);
    expect(r.steps[1]!.durationMs).toBeUndefined();
    expect(r.concepts).toEqual(["select", "where"]); // hanya dari step-1
  });

  it("konsep digabung unik lintas step yang selesai, urutan kemunculan pertama", () => {
    const progress = baseProgress({
      "step-1": completedStep(),
      "step-2": completedStep(),
      "step-3": completedStep(),
      "step-4": completedStep(),
    });
    const r = buildRingkasan(manifest, progress);
    expect(r.concepts).toEqual(["select", "where", "between", "order-by", "limit"]);
  });

  it("total memakai progress.score.current apa adanya (bukan dihitung ulang)", () => {
    const progress = baseProgress(
      { "step-1": completedStep(), "step-2": completedStep(), "step-3": completedStep(), "step-4": completedStep() },
      { score: { current: 777, best: 777, max: 1000, stars: 1 } }
    );
    const r = buildRingkasan(manifest, progress);
    expect(r.total).toBe(777);
    expect(r.stars).toBe(1);
  });
});
