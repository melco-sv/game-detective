/**
 * Data turunan untuk layar Ringkasan Chapter (docs/03-design.md §4.9).
 * Fungsi murni: menggabungkan bagian statis manifest (judul step, poin
 * dasar, konsep) dengan `ChapterProgress` tersimpan untuk menghasilkan
 * rincian skor, timeline step, dan konsep yang "dikuasai".
 */
import type { ScoringSpec, StepId, SqlConcept } from "../content/types";
import type { HintLevelOpened } from "../hints/machine";
import { hintPenaltyPctFor, type Stars } from "../scoring/score";
import type { ChapterProgress } from "./types";

export interface RingkasanManifestStep {
  id: StepId;
  title: string;
  points: number; // poin dasar step (sebelum penalti bantuan)
  concepts: SqlConcept[];
}

export interface RingkasanManifest {
  order: number;
  title: string;
  steps: RingkasanManifestStep[];
  scoring: Pick<ScoringSpec, "hintPenaltyPct" | "maxScore" | "wrongReportPenaltyPct">;
}

export interface RingkasanStepRow {
  order: number;
  id: StepId;
  title: string;
  completed: boolean;
  durationMs?: number;
  points: number;
  hintsRevealed: HintLevelOpened;
  hintPenalty: number; // poin yang hilang di step ini karena bantuan
}

export interface RingkasanData {
  chapterOrder: number;
  chapterTitle: string;
  suspectNames: string[];
  solvedAt: number | undefined;
  scoreBase: number;
  hintPenaltyTotal: number;
  reportPenalty: number;
  wrongAttempts: number;
  total: number;
  stars: Stars;
  timeSpentMs: number;
  totalRuns: number;
  stepsWithHintsCount: number;
  steps: RingkasanStepRow[];
  concepts: SqlConcept[];
}

/** `progress.score.current` dipakai apa adanya sebagai "Total" (angka resmi yang sudah tersimpan), bukan dihitung ulang di sini. */
export function buildRingkasan(manifest: RingkasanManifest, progress: ChapterProgress): RingkasanData {
  const steps: RingkasanStepRow[] = manifest.steps.map((step, i) => {
    const sp = progress.steps[step.id];
    const completed = sp?.status === "completed";
    const hintsRevealed = sp?.hintsRevealed ?? 0;
    const penaltyPct = hintPenaltyPctFor(hintsRevealed, manifest.scoring);
    const hintPenalty = completed ? Math.round(step.points * (penaltyPct / 100)) : 0;
    const hasDuration = sp?.startedAt !== undefined && sp?.completedAt !== undefined;
    return {
      order: i + 1,
      id: step.id,
      title: step.title,
      completed,
      durationMs: hasDuration ? sp!.completedAt! - sp!.startedAt! : undefined,
      points: sp?.points ?? 0,
      hintsRevealed,
      hintPenalty,
    };
  });

  const scoreBase = manifest.steps.reduce((sum, s) => sum + s.points, 0);
  const hintPenaltyTotal = steps.reduce((sum, s) => sum + s.hintPenalty, 0);
  const reportPenalty = progress.report.wrongAttempts * (manifest.scoring.wrongReportPenaltyPct / 100) * manifest.scoring.maxScore;
  const correctLog = progress.report.log.find((l) => l.correct);
  const concepts = Array.from(
    new Set(manifest.steps.filter((s) => progress.steps[s.id]?.status === "completed").flatMap((s) => s.concepts))
  );

  return {
    chapterOrder: manifest.order,
    chapterTitle: manifest.title,
    suspectNames: correctLog?.names ?? [],
    solvedAt: progress.report.solvedAt,
    scoreBase,
    hintPenaltyTotal,
    reportPenalty,
    wrongAttempts: progress.report.wrongAttempts,
    total: progress.score.current,
    stars: progress.score.stars,
    timeSpentMs: progress.timeSpentMs,
    totalRuns: progress.runs,
    stepsWithHintsCount: steps.filter((s) => s.hintsRevealed > 0).length,
    steps,
    concepts,
  };
}
