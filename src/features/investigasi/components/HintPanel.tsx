"use client";

import type { CompiledStep } from "@/engine/content/manifest";
import type { HintState } from "@/engine/hints/machine";
import { deobfuscateText } from "@/engine/content/obfuscate";
import { StoryMarkdown } from "@/components/story-markdown";

// Sistem Bantuan 4 level (docs/02-arsitektur.md §7; docs/03-design.md §3.6).
// Gerbang vs tawaran: panel ini hanya menampilkan gerbang (kapan BOLEH
// dibuka); tawaran (kapan tombol berdenyut) menyusul di iterasi berikutnya.

export interface HintPanelProps {
  step: CompiledStep | undefined;
  hintState: HintState | undefined;
  salt: string;
  onRequest: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onInsertSql: (sql: string) => void;
}

const LEVEL_LABELS = ["Arah", "Sheet & Kolom", "Kerangka", "Query Lengkap"];

export function HintPanel({ step, hintState, salt, onRequest, onConfirm, onCancel, onInsertSql }: HintPanelProps) {
  if (!step || !hintState) {
    return <div className="p-4 text-sm text-text-muted">Pilih step untuk melihat petunjuk.</div>;
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-4">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Bantuan</h2>
        <p className="mt-1 text-xs text-text-muted">
          Buka petunjuk satu per satu. Potongan dihitung dari poin step ini.
        </p>
      </div>

      {step.hints.map((hint, idx) => {
        const level = hint.level;
        const revealed = hintState.revealed >= level;
        const isNext = hintState.revealed + 1 === level;
        const isNextConfirming = isNext && hintState.status === "confirming";
        const isNextLocked = isNext && hintState.status === "locked";
        const canRequestNow = isNext && !revealed && !isNextConfirming && !isNextLocked;

        const body = hint.obfuscated && revealed ? deobfuscateText(hint.body, salt) : hint.body;
        const insertSql = hint.insertSql
          ? hint.obfuscated && revealed
            ? deobfuscateText(hint.insertSql, salt)
            : hint.insertSql
          : undefined;

        return (
          <div
            key={level}
            className={`rounded-md border p-3 ${
              revealed ? "border-hint/40 bg-hint/10" : "border-border-subtle bg-surface-2"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">
                Petunjuk {level} &middot; {LEVEL_LABELS[idx]}
              </span>
              <span className="font-mono text-xs text-hint">
                {hint.penaltyPct === 0 ? "Gratis" : `Dipakai · −${hint.penaltyPct}%`}
              </span>
            </div>

            {revealed ? (
              <div className="mt-2 text-sm text-text-secondary">
                <StoryMarkdown text={body} className="prose prose-sm prose-invert max-w-none" />
                {insertSql ? (
                  <button
                    type="button"
                    onClick={() => onInsertSql(insertSql)}
                    className="mt-2 rounded border border-border-strong px-2 py-1 font-mono text-xs text-text-primary hover:bg-surface-3"
                  >
                    Salin ke editor
                  </button>
                ) : null}
              </div>
            ) : isNextConfirming ? (
              <div className="mt-2 text-sm">
                <p className="text-text-secondary">
                  Buka Petunjuk {level}? Poin step ini berkurang {hint.penaltyPct}%.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded border border-border-strong px-3 py-1 text-xs text-text-secondary hover:bg-surface-3"
                  >
                    Nanti Saja
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="rounded bg-hint px-3 py-1 text-xs font-semibold text-on-hint hover:opacity-90"
                  >
                    Buka Petunjuk {level}
                  </button>
                </div>
              </div>
            ) : isNextLocked ? (
              <p className="mt-2 text-xs text-text-muted">
                Coba 1 query lagi, atau tunggu beberapa saat sebelum bisa membuka petunjuk ini.
              </p>
            ) : canRequestNow ? (
              <button
                type="button"
                onClick={onRequest}
                className="mt-2 rounded border border-hint/60 px-3 py-1.5 text-sm font-semibold text-hint hover:bg-hint/10"
              >
                {hint.penaltyPct === 0 ? "Buka Petunjuk (gratis)" : "Buka Petunjuk"}
              </button>
            ) : (
              <p className="mt-2 text-xs text-text-muted">Terkunci.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
