/**
 * Pemetaan dua arah antara state sesi (Zustand, src/stores/investigation.ts)
 * dan `ChapterProgress` tersimpan (docs/02-arsitektur.md §9.1, §9.3). Fungsi
 * murni: modul ini tidak menyentuh Dexie sama sekali — pemanggil (store)
 * yang menulis/membaca lewat `ProgressRepository` (src/infra/storage).
 *
 * "best" belum dibedakan dari "current": fitur "mulai ulang" (replay) belum
 * ada, jadi skor tidak pernah turun lalu perlu dibandingkan dengan skor
 * lampau. Field `score.best` tetap ada di skema (sesuai dok) supaya tidak
 * perlu migrasi lagi begitu "mulai ulang" dibangun.
 */
import type { ChapterId, ScoringSpec, StepId } from "../content/types";
import type { HintState } from "../hints/machine";
import { computeChapterScore } from "../scoring/score";
import { createEmptyStepProgress, type ChapterProgress, type ChapterStatus, type ReportLogEntry, type StepProgress } from "./types";

export interface ManifestForSnapshot {
  id: ChapterId;
  version: string;
  steps: { id: StepId }[];
  scoring: Pick<ScoringSpec, "maxScore" | "hintPenaltyPct" | "wrongReportPenaltyPct" | "starsThresholdPct">;
}

export interface StepRuntimeSnapshotInput {
  completed: boolean;
  runs: number;
  failedRuns: number;
  errorRuns: number;
  hint: Pick<HintState, "revealed" | "hintOpenedAt" | "failedSinceLastHint">;
  points: number;
  solvedSql?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface ReportRuntimeSnapshotInput {
  attempts: number;
  wrongAttempts: number;
  cooldownUntil?: number;
  log: ReportLogEntry[];
  solvedAt?: number;
}

export interface BuildChapterProgressInput {
  manifest: ManifestForSnapshot;
  steps: Record<StepId, StepRuntimeSnapshotInput>;
  completedStepIds: ReadonlySet<StepId>;
  activeStepId: StepId | undefined;
  report: ReportRuntimeSnapshotInput;
  solved: boolean;
  startedAt: number;
  now: number;
}

function chapterStatusFor(solved: boolean, anyStarted: boolean): ChapterStatus {
  if (solved) return "solved";
  return anyStarted ? "in-progress" : "available";
}

/** Runtime -> tersimpan. Dipanggil setelah setiap aksi yang berdampak skor/penalti (§9.3). */
export function buildChapterProgress(input: BuildChapterProgressInput): ChapterProgress {
  const { manifest, steps, completedStepIds, activeStepId, report, solved, startedAt, now } = input;

  const stepEntries: Record<StepId, StepProgress> = {};
  let totalRuns = 0;
  for (const step of manifest.steps) {
    const runtime = steps[step.id];
    if (!runtime) {
      stepEntries[step.id] = createEmptyStepProgress();
      continue;
    }
    totalRuns += runtime.runs;
    stepEntries[step.id] = {
      status: runtime.completed ? "completed" : "active",
      runs: runtime.runs,
      failedRuns: runtime.failedRuns,
      errorRuns: runtime.errorRuns,
      hintsRevealed: runtime.hint.revealed,
      hintOpenedAt: runtime.hint.hintOpenedAt,
      failedSinceLastHint: runtime.hint.failedSinceLastHint,
      assisted: runtime.hint.revealed >= 4,
      points: runtime.points,
      solvedSql: runtime.solvedSql,
      startedAt: runtime.startedAt,
      completedAt: runtime.completedAt,
    };
  }

  const scoreResult = computeChapterScore(
    manifest.steps.map((s) => ({
      completed: completedStepIds.has(s.id),
      hintsRevealed: steps[s.id]?.hint.revealed ?? 0,
    })),
    report.wrongAttempts,
    solved,
    manifest.scoring
  );

  const anyStarted = completedStepIds.size > 0 || totalRuns > 0;

  return {
    chapterId: manifest.id,
    contentVersion: manifest.version,
    status: chapterStatusFor(solved, anyStarted),
    currentStepId: activeStepId ?? null,
    steps: stepEntries,
    report: {
      attempts: report.attempts,
      wrongAttempts: report.wrongAttempts,
      cooldownUntil: report.cooldownUntil,
      log: report.log,
      solvedAt: report.solvedAt,
    },
    score: {
      current: scoreResult.score,
      best: scoreResult.score,
      max: manifest.scoring.maxScore,
      stars: scoreResult.stars,
    },
    timeSpentMs: Math.max(0, now - startedAt),
    runs: totalRuns,
    startedAt,
    completedAt: solved ? (report.solvedAt ?? now) : undefined,
    updatedAt: now,
  };
}

/** Tersimpan -> HintState runtime. Field yang tidak dipersist (pacer tawaran) direset ke default aman. */
export function hintStateFromStepProgress(sp: Pick<StepProgress, "status" | "hintsRevealed" | "hintOpenedAt" | "failedSinceLastHint" | "startedAt">, now: number): HintState {
  return {
    status: sp.status === "completed" ? "done" : "idle",
    revealed: sp.hintsRevealed,
    hintOpenedAt: sp.hintOpenedAt,
    failedSinceLastHint: sp.failedSinceLastHint,
    consecutiveErrors: 0,
    stepStartedAt: sp.startedAt ?? now,
    lastActivityAt: now,
    offerCooldownUntil: 0,
  };
}
