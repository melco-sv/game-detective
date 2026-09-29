"use client";

/**
 * investigationStore (Zustand) — chapter aktif, step aktif, teks editor per
 * step, hasil terakhir, status run (docs/02-arsitektur.md §2.5). Progres
 * (poin, petunjuk dibuka, laporan salah) dipersist ke Dexie (IndexedDB)
 * lewat `progressRepository` supaya "tahan reload" (§9.3); hasil query
 * (`lastColumns`/`lastRows`/dst.) sengaja TIDAK dipersist (§9.3, hasil besar
 * tidak disimpan). Draf editor per step dipersist terpisah dengan debounce
 * 500 ms lewat `putDraft`.
 */
import { create } from "zustand";
import { ulid } from "ulidx";
import type { ChapterManifest, CompiledStep } from "@/engine/content/manifest";
import type { Cell, ResultColumn, RunOutcome } from "@/engine/sql/types";
import { evaluateValidator } from "@/engine/validation/validators";
import { diagnoseWrongResult } from "@/engine/assistant/diagnosis";
import { translateSqlError } from "@/engine/assistant/error-translator";
import { createInitialHintState, hintReducer, type HintEvent, type HintState } from "@/engine/hints/machine";
import { onWrongReport } from "@/engine/report/policy";
import { verifySuspectsLocal } from "@/engine/validation/suspect";
import { computeChapterScore, computeStepPoints, type ChapterScoreResult } from "@/engine/scoring/score";
import { buildChapterProgress, hintStateFromStepProgress } from "@/engine/progress/snapshot";
import type { ReportLogEntry } from "@/engine/progress/types";
import { progressRepository } from "@/infra/storage/progress-repository";
import { listDraftsForChapter, putDraft } from "@/infra/storage/drafts";

export interface RunFeedback {
  kind: "error" | "wrong" | "correct";
  message: string;
  raw?: string;
}

export interface StepRuntime {
  sql: string;
  runs: number;
  failedRuns: number;
  errorRuns: number;
  completed: boolean;
  hintsRevealed: 0 | 1 | 2 | 3 | 4;
  hint: HintState;
  points: number;
  running: boolean;
  feedback?: RunFeedback;
  lastColumns?: ResultColumn[];
  lastRows?: Cell[][];
  lastTotalRows?: number;
  lastTruncated?: boolean;
  lastDurationMs?: number;
  solvedSql?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface ReportRuntimeState {
  attempts: number;
  wrongAttempts: number;
  cooldownUntil?: number;
  lastAlert?: { level: 1 | 2 | 3; note?: string };
  log: ReportLogEntry[];
  solvedAt?: number;
}

interface InvestigationState {
  manifest?: ChapterManifest;
  activeStepId?: string;
  completedStepIds: Set<string>;
  steps: Record<string, StepRuntime>;
  report: ReportRuntimeState;
  solved: boolean;
  finalScore?: ChapterScoreResult;
  /** Epoch ms saat chapter ini PERTAMA kali dimulai (tahan reload; §9.1 ChapterProgress.startedAt). */
  startedAt?: number;
}

interface InvestigationActions {
  loadChapter: (manifest: ChapterManifest) => Promise<void>;
  setActiveStep: (stepId: string) => void;
  setSql: (stepId: string, sql: string) => void;
  beginRun: (stepId: string) => void;
  applyRunOutcome: (stepId: string, outcome: RunOutcome) => void;
  dispatchHint: (stepId: string, event: HintEvent) => void;
  submitReport: (names: string[]) => Promise<{ correct: boolean; note?: string }>;
}

type InvestigationStore = InvestigationState & InvestigationActions;

function firstIncompleteStepId(steps: CompiledStep[], completed: Set<string>): string {
  const found = steps.find((s) => !completed.has(s.id));
  return (found ?? steps[steps.length - 1])!.id;
}

/** Timer debounce draf per (chapterId, stepId) — modul-scope, sengaja tidak masuk state Zustand. */
const draftDebounce = new Map<string, ReturnType<typeof setTimeout>>();
const DRAFT_DEBOUNCE_MS = 500;

export const useInvestigationStore = create<InvestigationStore>()((set, get) => {
  /** Bangun ChapterProgress dari state TERKINI dan tulis ke Dexie (fire-and-forget, lihat catatan §9.3 di header modul). */
  function persistProgress(overrides?: { report?: ReportRuntimeState; solved?: boolean }) {
    const state = get();
    if (!state.manifest || state.startedAt === undefined) return;
    const report = overrides?.report ?? state.report;
    const solved = overrides?.solved ?? state.solved;
    const progress = buildChapterProgress({
      manifest: state.manifest,
      steps: state.steps,
      completedStepIds: state.completedStepIds,
      activeStepId: state.activeStepId,
      report,
      solved,
      startedAt: state.startedAt,
      now: Date.now(),
    });
    void progressRepository.put(progress);
  }

  return {
    manifest: undefined,
    activeStepId: undefined,
    completedStepIds: new Set(),
    steps: {},
    report: { attempts: 0, wrongAttempts: 0, log: [] },
    solved: false,
    finalScore: undefined,
    startedAt: undefined,

    async loadChapter(manifest) {
      const now = Date.now();
      const [persisted, drafts] = await Promise.all([
        progressRepository.get(manifest.id),
        listDraftsForChapter(manifest.id),
      ]);
      const draftByStep = new Map(drafts.map((d) => [d.stepId, d.sql]));

      const steps: Record<string, StepRuntime> = {};
      const completedStepIds = new Set<string>();
      for (const step of manifest.steps) {
        const sp = persisted?.steps[step.id];
        const draftSql = draftByStep.get(step.id);
        if (sp) {
          if (sp.status === "completed") completedStepIds.add(step.id);
          steps[step.id] = {
            sql: draftSql ?? sp.solvedSql ?? step.starterSql ?? "",
            runs: sp.runs,
            failedRuns: sp.failedRuns,
            errorRuns: sp.errorRuns,
            completed: sp.status === "completed",
            hintsRevealed: sp.hintsRevealed,
            hint: hintStateFromStepProgress(sp, now),
            points: sp.points,
            running: false,
            solvedSql: sp.solvedSql,
            startedAt: sp.startedAt,
            completedAt: sp.completedAt,
          };
        } else {
          steps[step.id] = {
            sql: draftSql ?? step.starterSql ?? "",
            runs: 0,
            failedRuns: 0,
            errorRuns: 0,
            completed: false,
            hintsRevealed: 0,
            hint: createInitialHintState(now),
            points: 0,
            running: false,
          };
        }
      }

      const solved = persisted?.status === "solved";
      const report: ReportRuntimeState = persisted
        ? {
            attempts: persisted.report.attempts,
            wrongAttempts: persisted.report.wrongAttempts,
            cooldownUntil: persisted.report.cooldownUntil,
            log: persisted.report.log,
            solvedAt: persisted.report.solvedAt,
          }
        : { attempts: 0, wrongAttempts: 0, log: [] };

      set({
        manifest,
        steps,
        completedStepIds,
        activeStepId: persisted?.currentStepId ?? firstIncompleteStepId(manifest.steps, completedStepIds),
        report,
        solved,
        startedAt: persisted?.startedAt ?? now,
        finalScore: solved
          ? computeChapterScore(
              manifest.steps.map((s) => ({
                completed: completedStepIds.has(s.id),
                hintsRevealed: steps[s.id]?.hintsRevealed ?? 0,
              })),
              report.wrongAttempts,
              true,
              manifest.scoring
            )
          : undefined,
      });
    },

    setActiveStep(stepId) {
      set({ activeStepId: stepId });
      persistProgress();
    },

    setSql(stepId, sql) {
      set((state) => ({ steps: { ...state.steps, [stepId]: { ...state.steps[stepId]!, sql } } }));
      const manifest = get().manifest;
      if (!manifest) return;
      const key = `${manifest.id}:${stepId}`;
      const existing = draftDebounce.get(key);
      if (existing) clearTimeout(existing);
      draftDebounce.set(
        key,
        setTimeout(() => {
          draftDebounce.delete(key);
          void putDraft(manifest.id, stepId, sql);
        }, DRAFT_DEBOUNCE_MS)
      );
    },

    beginRun(stepId) {
      set((state) => ({
        steps: {
          ...state.steps,
          [stepId]: { ...state.steps[stepId]!, running: true, startedAt: state.steps[stepId]!.startedAt ?? Date.now() },
        },
      }));
    },

    applyRunOutcome(stepId, outcome) {
      const state = get();
      const manifest = state.manifest;
      const step = manifest?.steps.find((s) => s.id === stepId);
      const runtime = state.steps[stepId];
      if (!manifest || !step || !runtime) return;

      if (!outcome.ok) {
        const translated = translateSqlError(outcome.error.rawMessage, {
          tables: manifest.database.tables.map((t) => t.name),
          columns: manifest.database.tables.flatMap((t) => t.columns.map((c) => c.name)),
        });
        const hint = hintReducer(runtime.hint, { type: "RUN_ERROR", at: Date.now() }, step.hints, manifest.scoring);
        set((s) => ({
          steps: {
            ...s.steps,
            [stepId]: {
              ...runtime,
              running: false,
              runs: runtime.runs + 1,
              errorRuns: runtime.errorRuns + 1,
              hint,
              feedback: { kind: "error", message: translated.message, raw: translated.raw },
              lastColumns: undefined,
              lastRows: undefined,
            },
          },
        }));
        persistProgress();
        return;
      }

      const result = outcome.result;
      const verdict = result.fingerprints
        ? evaluateValidator(step.validator, result.fingerprints, {
            sql: runtime.sql,
            tablesRead: result.tablesRead,
            functionsUsed: result.functionsUsed,
          })
        : { correct: false };

      if (verdict.correct) {
        const hint = hintReducer(runtime.hint, { type: "RUN_CORRECT" }, step.hints, manifest.scoring);
        const completedStepIds = new Set(state.completedStepIds);
        completedStepIds.add(stepId);
        const nextActive = firstIncompleteStepId(manifest.steps, completedStepIds);
        const earnedPoints = computeStepPoints(step.points, hint.revealed, true, manifest.scoring);
        set((s) => ({
          completedStepIds,
          activeStepId: nextActive,
          steps: {
            ...s.steps,
            [stepId]: {
              ...runtime,
              running: false,
              runs: runtime.runs + 1,
              completed: true,
              hintsRevealed: hint.revealed,
              points: earnedPoints,
              hint,
              feedback: { kind: "correct", message: step.onComplete ?? "Step selesai." },
              lastColumns: result.columns,
              lastRows: result.rows,
              lastTotalRows: result.totalRows,
              lastTruncated: result.truncated,
              lastDurationMs: result.durationMs,
              solvedSql: runtime.sql,
              completedAt: Date.now(),
            },
          },
        }));
        persistProgress();
        return;
      }

      const message = diagnoseWrongResult({
        step,
        fp: result.fingerprints ?? { ordered: "", perColumn: {} },
        columnCount: result.columns.length,
        rowCount: result.totalRows,
        meta: { sql: runtime.sql, tablesRead: result.tablesRead, functionsUsed: result.functionsUsed },
        orderOnlyWrong: verdict.orderOnlyWrong,
      });
      const hint = hintReducer(runtime.hint, { type: "RUN_WRONG", at: Date.now() }, step.hints, manifest.scoring);
      set((s) => ({
        steps: {
          ...s.steps,
          [stepId]: {
            ...runtime,
            running: false,
            runs: runtime.runs + 1,
            failedRuns: runtime.failedRuns + 1,
            hint,
            feedback: { kind: "wrong", message },
            lastColumns: result.columns,
            lastRows: result.rows,
            lastTotalRows: result.totalRows,
            lastTruncated: result.truncated,
            lastDurationMs: result.durationMs,
          },
        },
      }));
      persistProgress();
    },

    dispatchHint(stepId, event) {
      const state = get();
      const manifest = state.manifest;
      const step = manifest?.steps.find((s) => s.id === stepId);
      const runtime = state.steps[stepId];
      if (!manifest || !step || !runtime) return;
      const hint = hintReducer(runtime.hint, event, step.hints, manifest.scoring);
      set((s) => ({
        steps: { ...s.steps, [stepId]: { ...runtime, hint, hintsRevealed: hint.revealed } },
      }));
      // Penalti bantuan tahan reload (§9.3): tulis segera, tidak menunggu aksi lain.
      persistProgress();
    },

    async submitReport(names) {
      const state = get();
      const manifest = state.manifest;
      if (!manifest) throw new Error("Manifest belum dimuat.");

      const verdict = await verifySuspectsLocal(manifest.id, manifest.report, names);
      const now = Date.now();
      const logEntry: ReportLogEntry = { id: ulid(), names, at: now, correct: verdict.correct };

      if (verdict.correct) {
        const stepInputs = manifest.steps.map((s) => ({
          completed: state.steps[s.id]?.completed ?? false,
          hintsRevealed: state.steps[s.id]?.hintsRevealed ?? (0 as const),
        }));
        const score = computeChapterScore(stepInputs, state.report.wrongAttempts, true, manifest.scoring);
        const nextReport: ReportRuntimeState = {
          ...state.report,
          attempts: state.report.attempts + 1,
          log: [...state.report.log, logEntry],
          solvedAt: now,
        };
        // Tulis SEBELUM UI menampilkan "kasus ditutup" (§9.3).
        persistProgress({ report: nextReport, solved: true });
        set({ report: nextReport, solved: true, finalScore: score });
        return { correct: true };
      }

      const outcome = onWrongReport(state.report, now, manifest.scoring);
      const note = outcome.showEvaluativeNote ? verdict.wrongNote : undefined;
      const nextReport: ReportRuntimeState = {
        attempts: state.report.attempts + 1,
        wrongAttempts: outcome.wrongAttempts,
        cooldownUntil: outcome.cooldownUntil,
        lastAlert: { level: outcome.alertLevel, note },
        log: [...state.report.log, logEntry],
        solvedAt: state.report.solvedAt,
      };
      // Tulis SEBELUM UI menampilkan hasil (§9.3): jeda/penalti tidak bisa
      // dihindari dengan reload tepat setelah salah tuduh.
      persistProgress({ report: nextReport });
      set({ report: nextReport });
      return { correct: false, note };
    },
  };
});
