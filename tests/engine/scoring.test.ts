import { describe, expect, it } from "vitest";
import { basePointsPerStep, computeChapterScore, computeStepPoints, hintPenaltyPctFor } from "@/engine/scoring/score";
import { DEFAULT_SCORING } from "@/engine/content/types";

describe("basePointsPerStep", () => {
  it("4 step: 250 masing-masing (total 1000)", () => {
    expect(basePointsPerStep(4, 1000)).toEqual([250, 250, 250, 250]);
  });

  it("7 step: 142 lalu enam kali 143 (total 1000)", () => {
    const points = basePointsPerStep(7, 1000);
    expect(points).toEqual([142, 143, 143, 143, 143, 143, 143]);
    expect(points.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it("total selalu tepat maxScore untuk N step berapa pun (1..20)", () => {
    for (let n = 1; n <= 20; n++) {
      const points = basePointsPerStep(n, 1000);
      expect(points.reduce((a, b) => a + b, 0)).toBe(1000);
      expect(points).toHaveLength(n);
    }
  });

  it("array kosong untuk 0 step", () => {
    expect(basePointsPerStep(0, 1000)).toEqual([]);
  });
});

describe("hintPenaltyPctFor", () => {
  it("0 petunjuk dibuka -> 0% penalti", () => {
    expect(hintPenaltyPctFor(0, DEFAULT_SCORING)).toBe(0);
  });
  it("Petunjuk 1 (gratis) -> 0% penalti", () => {
    expect(hintPenaltyPctFor(1, DEFAULT_SCORING)).toBe(0);
  });
  it("Petunjuk 2 -> 10% penalti", () => {
    expect(hintPenaltyPctFor(2, DEFAULT_SCORING)).toBe(10);
  });
  it("Petunjuk 3 -> 30% penalti", () => {
    expect(hintPenaltyPctFor(3, DEFAULT_SCORING)).toBe(30);
  });
  it("Petunjuk 4 -> 60% penalti", () => {
    expect(hintPenaltyPctFor(4, DEFAULT_SCORING)).toBe(60);
  });
});

describe("computeStepPoints", () => {
  it("step belum selesai selalu 0 poin, berapa pun petunjuknya", () => {
    expect(computeStepPoints(250, 0, false, DEFAULT_SCORING)).toBe(0);
    expect(computeStepPoints(250, 4, false, DEFAULT_SCORING)).toBe(0);
  });

  it("step selesai tanpa petunjuk mendapat poin penuh", () => {
    expect(computeStepPoints(250, 0, true, DEFAULT_SCORING)).toBe(250);
  });

  it("step selesai dengan Petunjuk 1 (gratis) tetap poin penuh", () => {
    expect(computeStepPoints(250, 1, true, DEFAULT_SCORING)).toBe(250);
  });

  it("step selesai dengan Petunjuk 4 mendapat 40% poin (round)", () => {
    expect(computeStepPoints(250, 4, true, DEFAULT_SCORING)).toBe(100); // 250 * 0.4
  });
});

describe("computeChapterScore", () => {
  it("chapter 4 step, semua selesai tanpa bantuan, tanpa salah tuduh -> skor 1000, 3 bintang", () => {
    const steps = Array.from({ length: 4 }, () => ({ completed: true, hintsRevealed: 0 as const }));
    const result = computeChapterScore(steps, 0, true, DEFAULT_SCORING);
    expect(result.score).toBe(1000);
    expect(result.stars).toBe(3);
  });

  it("belum solved -> 0 bintang meski skor tinggi", () => {
    const steps = Array.from({ length: 4 }, () => ({ completed: true, hintsRevealed: 0 as const }));
    const result = computeChapterScore(steps, 0, false, DEFAULT_SCORING);
    expect(result.stars).toBe(0);
  });

  it("satu salah tuduh mengurangi 100 poin (10% dari 1000)", () => {
    const steps = Array.from({ length: 4 }, () => ({ completed: true, hintsRevealed: 0 as const }));
    const result = computeChapterScore(steps, 1, true, DEFAULT_SCORING);
    expect(result.score).toBe(900);
    expect(result.reportPenalty).toBe(100);
  });

  it("skor tidak pernah di bawah 0 walau salah tuduh berkali-kali", () => {
    const steps = Array.from({ length: 4 }, () => ({ completed: true, hintsRevealed: 0 as const }));
    const result = computeChapterScore(steps, 50, true, DEFAULT_SCORING);
    expect(result.score).toBe(0);
  });

  it("step yang belum selesai saat solved tidak memberi poin (B2)", () => {
    const steps = [
      { completed: true, hintsRevealed: 0 as const },
      { completed: false, hintsRevealed: 0 as const },
    ];
    const result = computeChapterScore(steps, 0, true, DEFAULT_SCORING);
    expect(result.stepPoints[1]).toBe(0);
  });

  it("bintang: 1 bintang jika selesai < 70%, 2 bintang jika >= 70%, 3 bintang jika >= 90%", () => {
    const scoring = DEFAULT_SCORING;
    // 65% -> pakai petunjuk 4 (poin 40%) di beberapa step untuk turunkan persentase.
    const lowSteps = [
      { completed: true, hintsRevealed: 4 as const }, // 40% poin
      { completed: true, hintsRevealed: 4 as const },
      { completed: true, hintsRevealed: 4 as const },
      { completed: true, hintsRevealed: 0 as const },
    ];
    const low = computeChapterScore(lowSteps, 0, true, scoring);
    expect(low.score).toBeLessThan(scoring.maxScore * 0.7);
    expect(low.stars).toBe(1);

    const highSteps = Array.from({ length: 4 }, () => ({ completed: true, hintsRevealed: 0 as const }));
    const high = computeChapterScore(highSteps, 0, true, scoring);
    expect(high.stars).toBe(3);
  });
});
