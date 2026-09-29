/**
 * HintMachine — mesin bantuan bertingkat (B1; docs/02-arsitektur.md §7).
 * Reducer murni: dipanggil oleh hook `useHintMachine` (src/features/bantuan),
 * dengan state yang di-persist ke IndexedDB (StepProgress) setelah setiap
 * transisi berdampak (§7.1: "penalti tidak bisa di-reset dengan reload").
 *
 * Catatan implementasi: `CLOSE` dan `CANCEL` di §7.4 tidak membawa `now`,
 * tapi transisi "Menawarkan -> Diam" butuh menetapkan `offerCooldownUntil`
 * dengan jam saat itu. Di sini kedua event tersebut diberi `now` agar
 * reducer tetap murni (tidak membaca `Date.now()` sendiri) — deviasi kecil
 * dan disengaja dari sketsa tipe di dokumen.
 */
import type { CompiledHint } from "../content/manifest";
import type { HintLevel, ScoringSpec } from "../content/types";

export type HintLevelOpened = 0 | 1 | 2 | 3 | 4;

export type HintStatus =
  | "idle"
  | "offering"
  | "confirming"
  | "locked"
  | "showing"
  | "exhausted"
  | "done";

export interface HintState {
  status: HintStatus;
  revealed: HintLevelOpened; // dipersist sebagai StepProgress.hintsRevealed
  hintOpenedAt: number[]; // timestamp per level (dipersist) -> gerbang 2 menit tahan reload
  failedSinceLastHint: number; // dipersist -> gerbang "1 query gagal"
  consecutiveErrors: number;
  stepStartedAt: number;
  lastActivityAt: number;
  offerCooldownUntil: number;
}

export type HintEvent =
  | { type: "RUN_WRONG"; at: number }
  | { type: "RUN_ERROR"; at: number }
  | { type: "RUN_CORRECT" }
  | { type: "ACTIVITY"; at: number }
  | { type: "TICK"; now: number }
  | { type: "REQUEST"; now: number }
  | { type: "CONFIRM"; now: number }
  | { type: "CANCEL"; now: number }
  | { type: "CLOSE"; now: number };

export const OFFER_DISMISS_COOLDOWN_MS = 60_000;

export function createInitialHintState(now: number): HintState {
  return {
    status: "idle",
    revealed: 0,
    hintOpenedAt: [],
    failedSinceLastHint: 0,
    consecutiveErrors: 0,
    stepStartedAt: now,
    lastActivityAt: now,
    offerCooldownUntil: 0,
  };
}

/**
 * Gerbang: kapan level `next` BOLEH dibuka. Petunjuk 1 selalu boleh;
 * Petunjuk 2 boleh setelah Petunjuk 1 dibuka; Petunjuk 3/4 butuh level
 * sebelumnya terbuka DAN (>= 1 query gagal sejak level itu dibuka ATAU
 * >= `orAfterSeconds` detik berlalu) — §7.2.
 */
export function isGateOpen(
  state: HintState,
  next: HintLevel,
  now: number,
  gate: ScoringSpec["hintGate"]
): boolean {
  if (next === 1) return true;
  if (next === 2) return state.revealed >= 1;
  const prevOpenedAt = state.hintOpenedAt[next - 2];
  if (prevOpenedAt === undefined) return false;
  return (
    state.revealed >= next - 1 &&
    (state.failedSinceLastHint >= gate.afterFailedRuns ||
      now - prevOpenedAt >= gate.orAfterSeconds * 1000)
  );
}

/** Tombol Bantuan berdenyut menawarkan level berikutnya? Tidak pernah membuka sendiri (B1). */
export function shouldOffer(
  state: HintState,
  now: number,
  hints: readonly CompiledHint[],
  scoring: ScoringSpec
): boolean {
  if (state.revealed >= 4) return false;
  if (now < state.offerCooldownUntil) return false;
  const nextLevel = (state.revealed + 1) as HintLevel;
  const compiledHint = hints[nextLevel - 1];
  if (!compiledHint) return false;
  const trigger = compiledHint.offer;

  const onStepSeconds = (now - state.stepStartedAt) / 1000;
  if (onStepSeconds < trigger.minSecondsOnStep) return false;

  if (nextLevel >= 3 && !isGateOpen(state, nextLevel, now, scoring.hintGate)) return false;

  const idleSeconds = (now - state.lastActivityAt) / 1000;
  return (
    state.failedSinceLastHint >= trigger.minFailedRuns ||
    state.consecutiveErrors >= trigger.minConsecutiveErrors ||
    idleSeconds >= trigger.idleSeconds
  );
}

function openHint(state: HintState, level: HintLevel, now: number): HintState {
  const hintOpenedAt = [...state.hintOpenedAt];
  hintOpenedAt[level - 1] = now;
  return {
    ...state,
    status: "showing",
    revealed: level,
    hintOpenedAt,
    failedSinceLastHint: 0,
    consecutiveErrors: 0,
  };
}

export function hintReducer(
  state: HintState,
  event: HintEvent,
  hints: readonly CompiledHint[],
  scoring: ScoringSpec
): HintState {
  switch (event.type) {
    case "RUN_WRONG":
      return {
        ...state,
        failedSinceLastHint: state.failedSinceLastHint + 1,
        consecutiveErrors: 0,
        lastActivityAt: event.at,
      };

    case "RUN_ERROR":
      return {
        ...state,
        consecutiveErrors: state.consecutiveErrors + 1,
        lastActivityAt: event.at,
      };

    case "RUN_CORRECT":
      return { ...state, status: "done" };

    case "ACTIVITY":
      return { ...state, lastActivityAt: event.at };

    case "TICK": {
      if (state.status === "idle" && shouldOffer(state, event.now, hints, scoring)) {
        return { ...state, status: "offering" };
      }
      return state;
    }

    case "REQUEST": {
      if (state.revealed >= 4) return state;
      const nextLevel = (state.revealed + 1) as HintLevel;
      if (nextLevel === 1) return openHint(state, 1, event.now);
      if (!isGateOpen(state, nextLevel, event.now, scoring.hintGate)) {
        return { ...state, status: "locked" };
      }
      return { ...state, status: "confirming" };
    }

    case "CONFIRM": {
      const nextLevel = (state.revealed + 1) as HintLevel;
      if (nextLevel > 4) return state;
      return openHint(state, nextLevel, event.now);
    }

    case "CANCEL":
      return { ...state, status: "idle" };

    case "CLOSE": {
      if (state.status === "showing" && state.revealed >= 4) {
        return { ...state, status: "exhausted" };
      }
      if (state.status === "showing") {
        return {
          ...state,
          status: "idle",
          failedSinceLastHint: 0,
          consecutiveErrors: 0,
        };
      }
      if (state.status === "offering") {
        return {
          ...state,
          status: "idle",
          offerCooldownUntil: event.now + OFFER_DISMISS_COOLDOWN_MS,
        };
      }
      return { ...state, status: "idle" }; // dari 'locked'
    }

    default:
      return state;
  }
}
