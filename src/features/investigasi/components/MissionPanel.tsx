"use client";

import type { CompiledStep } from "@/engine/content/manifest";
import type { StepRuntime } from "@/stores/investigation";
import { StoryMarkdown } from "@/components/story-markdown";

// Panel Misi (docs/03-design.md §3.5, §4.4): step berurutan; selesai/aktif/terkunci.

export interface MissionPanelProps {
  steps: CompiledStep[];
  runtimes: Record<string, StepRuntime>;
  completedStepIds: Set<string>;
  activeStepId: string | undefined;
  onSelectStep: (stepId: string) => void;
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return "";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function MissionPanel({ steps, runtimes, completedStepIds, activeStepId, onSelectStep }: MissionPanelProps) {
  const activeStep = steps.find((s) => s.id === activeStepId);
  const doneCount = completedStepIds.size;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Misi</h2>
        <div className="mt-2 h-1.5 w-full rounded-full bg-surface-3">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {doneCount} dari {steps.length} step selesai
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const completed = completedStepIds.has(step.id);
          const isActive = step.id === activeStepId;
          const locked = !completed && !isActive;
          const runtime = runtimes[step.id];

          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onSelectStep(step.id)}
                className={`w-full rounded-md border p-3 text-left transition-colors ${
                  isActive
                    ? "border-l-4 border-primary bg-surface-2 shadow-[0_0_0_1px_var(--primary),0_0_20px_rgba(242,184,75,0.2)]"
                    : completed
                      ? "border-border-subtle bg-transparent opacity-80 hover:bg-surface-1"
                      : "cursor-not-allowed border-border-subtle bg-transparent opacity-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${completed ? "text-text-secondary line-through" : "text-text-primary"}`}>
                    {i + 1} &middot; {step.title}
                  </span>
                  {completed ? <span className="shrink-0 text-xs text-success">Selesai</span> : null}
                  {locked ? <span className="shrink-0 text-xs text-text-muted">🔒</span> : null}
                </div>
                {completed && runtime ? (
                  <span className="mt-1 block font-mono text-xs text-text-muted tabular-nums">
                    {formatDuration(runtime.lastDurationMs)} &middot; {runtime.points} poin
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {activeStep ? (
        <div className="mt-2 rounded-md border border-border-subtle bg-surface-2 p-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {activeStep.concepts.map((c) => (
              <span key={c} className="rounded-full bg-surface-3 px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                {c}
              </span>
            ))}
          </div>
          <div className="prose prose-sm prose-invert max-w-none text-sm text-text-secondary">
            <StoryMarkdown text={activeStep.story} />
          </div>
          <p className="mt-3 text-sm font-semibold text-text-primary">Tugas: {activeStep.objective}</p>
        </div>
      ) : null}
    </div>
  );
}
