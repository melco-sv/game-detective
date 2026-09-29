import { describe, expect, it } from "vitest";
import { buildChapterProgress, hintStateFromStepProgress, type ManifestForSnapshot } from "@/engine/progress/snapshot";
import { DEFAULT_SCORING } from "@/engine/content/types";
import { createEmptyStepProgress } from "@/engine/progress/types";

const manifest: ManifestForSnapshot = {
  id: "ch01-raibnya-batik-tulis-sang-maestro",
  version: "1.0.0",
  steps: [{ id: "step-1" }, { id: "step-2" }],
  scoring: DEFAULT_SCORING,
};

function emptyRuntime() {
  return {
    completed: false,
    runs: 0,
    failedRuns: 0,
    errorRuns: 0,
    hint: { revealed: 0 as const, hintOpenedAt: [], failedSinceLastHint: 0 },
    points: 0,
  };
}

describe("buildChapterProgress", () => {
  it("status 'available' saat belum ada step yang dimulai/selesai", () => {
    const progress = buildChapterProgress({
      manifest,
      steps: {},
      completedStepIds: new Set(),
      activeStepId: "step-1",
      report: { attempts: 0, wrongAttempts: 0, log: [] },
      solved: false,
      startedAt: 1000,
      now: 1000,
    });
    expect(progress.status).toBe("available");
    expect(progress.chapterId).toBe(manifest.id);
    expect(progress.contentVersion).toBe("1.0.0");
    expect(progress.currentStepId).toBe("step-1");
    expect(progress.steps["step-1"]).toEqual(createEmptyStepProgress());
  });

  it("status 'in-progress' begitu satu step punya run, walau belum selesai", () => {
    const progress = buildChapterProgress({
      manifest,
      steps: { "step-1": { ...emptyRuntime(), runs: 1, failedRuns: 1 } },
      completedStepIds: new Set(),
      activeStepId: "step-1",
      report: { attempts: 0, wrongAttempts: 0, log: [] },
      solved: false,
      startedAt: 1000,
      now: 2000,
    });
    expect(progress.status).toBe("in-progress");
    expect(progress.timeSpentMs).toBe(1000);
    expect(progress.runs).toBe(1);
  });

  it("menghitung poin & bintang lewat computeChapterScore yang sama dengan skor live", () => {
    const progress = buildChapterProgress({
      manifest,
      steps: {
        "step-1": { ...emptyRuntime(), completed: true, points: 500 },
        "step-2": { ...emptyRuntime(), completed: true, points: 500 },
      },
      completedStepIds: new Set(["step-1", "step-2"]),
      activeStepId: "step-2",
      report: { attempts: 1, wrongAttempts: 0, log: [] },
      solved: true,
      startedAt: 0,
      now: 5000,
    });
    expect(progress.status).toBe("solved");
    expect(progress.score.current).toBe(1000);
    expect(progress.score.best).toBe(1000);
    expect(progress.score.stars).toBe(3);
    expect(progress.completedAt).toBe(5000);
  });

  it("penalti salah tuduh mengurangi skor tersimpan", () => {
    const progress = buildChapterProgress({
      manifest,
      steps: {
        "step-1": { ...emptyRuntime(), completed: true, points: 500 },
        "step-2": { ...emptyRuntime(), completed: true, points: 500 },
      },
      completedStepIds: new Set(["step-1", "step-2"]),
      activeStepId: "step-2",
      report: { attempts: 2, wrongAttempts: 1, log: [] },
      solved: true,
      startedAt: 0,
      now: 5000,
    });
    // wrongReportPenaltyPct default 10% dari maxScore 1000 = 100
    expect(progress.score.current).toBe(900);
  });

  it("hintsRevealed & hintOpenedAt step dipetakan apa adanya dari HintState runtime", () => {
    const progress = buildChapterProgress({
      manifest,
      steps: {
        "step-1": {
          ...emptyRuntime(),
          hint: { revealed: 2, hintOpenedAt: [100, 200], failedSinceLastHint: 3 },
        },
      },
      completedStepIds: new Set(),
      activeStepId: "step-1",
      report: { attempts: 0, wrongAttempts: 0, log: [] },
      solved: false,
      startedAt: 0,
      now: 0,
    });
    const step1 = progress.steps["step-1"]!;
    expect(step1.hintsRevealed).toBe(2);
    expect(step1.hintOpenedAt).toEqual([100, 200]);
    expect(step1.failedSinceLastHint).toBe(3);
    expect(step1.assisted).toBe(false); // hanya true bila Petunjuk 4 dibuka
  });
});

describe("hintStateFromStepProgress", () => {
  it("merekonstruksi field yang dipersist, mereset field sesi (pacer tawaran)", () => {
    const sp = {
      status: "active" as const,
      hintsRevealed: 3 as const,
      hintOpenedAt: [10, 20, 30],
      failedSinceLastHint: 1,
      startedAt: 500,
    };
    const hint = hintStateFromStepProgress(sp, 9999);
    expect(hint.status).toBe("idle");
    expect(hint.revealed).toBe(3);
    expect(hint.hintOpenedAt).toEqual([10, 20, 30]);
    expect(hint.failedSinceLastHint).toBe(1);
    expect(hint.stepStartedAt).toBe(500);
    expect(hint.consecutiveErrors).toBe(0);
    expect(hint.offerCooldownUntil).toBe(0);
  });

  it("status 'done' bila step sudah completed", () => {
    const hint = hintStateFromStepProgress(
      { status: "completed", hintsRevealed: 1, hintOpenedAt: [10], failedSinceLastHint: 0 },
      1000
    );
    expect(hint.status).toBe("done");
    expect(hint.stepStartedAt).toBe(1000); // fallback ke `now` bila startedAt tak ada
  });
});
