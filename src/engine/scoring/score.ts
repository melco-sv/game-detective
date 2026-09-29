/**
 * Rumus skor (B1, B2, B5; docs/02-arsitektur.md §9.2). Dipakai bersama oleh
 * klien dan, di v1, Edge Function `submit-score` (§6.6) — karena itu fungsi
 * di sini murni dan tidak bergantung pada state tersimpan.
 */
import type { HintLevelOpened } from "../hints/machine";
import type { ScoringSpec } from "../content/types";

/**
 * Poin dasar per step: 1000 dibagi rata ke N step, sisa dibagikan +1 ke
 * step-step TERAKHIR supaya totalnya tepat `maxScore`.
 * Contoh: 4 step -> 250·250·250·250; 7 step -> 142·143·143·143·143·143·143.
 */
export function basePointsPerStep(stepCount: number, maxScore: number): number[] {
  if (stepCount <= 0) return [];
  const base = Math.floor(maxScore / stepCount);
  const remainder = maxScore - base * stepCount; // jumlah step yang mendapat +1
  return Array.from({ length: stepCount }, (_, i) => base + (i >= stepCount - remainder ? 1 : 0));
}

/** Penalti bantuan (%) untuk jumlah petunjuk yang sudah dibuka. Petunjuk 1 gratis. */
export function hintPenaltyPctFor(hintsRevealed: HintLevelOpened, scoring: Pick<ScoringSpec, "hintPenaltyPct">): number {
  if (hintsRevealed === 0) return 0;
  return scoring.hintPenaltyPct[hintsRevealed - 1] ?? 0;
}

export function computeStepPoints(
  basePoints: number,
  hintsRevealed: HintLevelOpened,
  completed: boolean,
  scoring: Pick<ScoringSpec, "hintPenaltyPct">
): number {
  if (!completed) return 0;
  const penaltyPct = hintPenaltyPctFor(hintsRevealed, scoring);
  return Math.round(basePoints * (1 - penaltyPct / 100));
}

export interface StepScoreInput {
  completed: boolean;
  hintsRevealed: HintLevelOpened;
}

export type Stars = 0 | 1 | 2 | 3;

export interface ChapterScoreResult {
  stepPoints: number[]; // poin per step, urut sama dengan input
  totalStepPoints: number;
  reportPenalty: number;
  score: number; // max(0, totalStepPoints - reportPenalty)
  stars: Stars;
}

function starsFor(score: number, scoring: Pick<ScoringSpec, "maxScore" | "starsThresholdPct">): 1 | 2 | 3 {
  const pct = (score / scoring.maxScore) * 100;
  const [, tierTwo, tierThree] = scoring.starsThresholdPct;
  if (pct >= (tierThree ?? 90)) return 3;
  if (pct >= (tierTwo ?? 70)) return 2;
  return 1;
}

/**
 * Skor chapter. `solved` menandakan laporan polisi sudah benar (chapter
 * selesai); step yang belum diselesaikan pada saat itu bernilai 0 (B2).
 * Tanpa `solved`, tidak ada bintang (chapter belum "Kasus Ditutup").
 */
export function computeChapterScore(
  steps: StepScoreInput[],
  wrongAttempts: number,
  solved: boolean,
  scoring: Pick<
    ScoringSpec,
    "maxScore" | "hintPenaltyPct" | "wrongReportPenaltyPct" | "starsThresholdPct"
  >
): ChapterScoreResult {
  const base = basePointsPerStep(steps.length, scoring.maxScore);
  const stepPoints = steps.map((s, i) => computeStepPoints(base[i] ?? 0, s.hintsRevealed, s.completed, scoring));
  const totalStepPoints = stepPoints.reduce((sum, p) => sum + p, 0);
  const reportPenalty = wrongAttempts * (scoring.wrongReportPenaltyPct / 100) * scoring.maxScore;
  const score = Math.max(0, totalStepPoints - reportPenalty);
  const stars: Stars = solved ? starsFor(score, scoring) : 0;

  return { stepPoints, totalStepPoints, reportPenalty, score, stars };
}
