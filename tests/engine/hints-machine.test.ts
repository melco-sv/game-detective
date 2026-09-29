import { describe, expect, it } from "vitest";
import {
  createInitialHintState,
  hintReducer,
  isGateOpen,
  shouldOffer,
  type HintState,
} from "@/engine/hints/machine";
import { DEFAULT_HINT_OFFER, DEFAULT_SCORING } from "@/engine/content/types";
import type { CompiledHint } from "@/engine/content/manifest";

const HINTS: CompiledHint[] = [
  { level: 1, kind: "direction", penaltyPct: 0, offer: DEFAULT_HINT_OFFER[1], body: "Arah 1", obfuscated: false },
  { level: 2, kind: "tables", penaltyPct: 10, offer: DEFAULT_HINT_OFFER[2], body: "Sheet 2", obfuscated: false },
  { level: 3, kind: "skeleton", penaltyPct: 30, offer: DEFAULT_HINT_OFFER[3], body: "Kerangka 3", obfuscated: false },
  { level: 4, kind: "solution", penaltyPct: 60, offer: DEFAULT_HINT_OFFER[4], body: "Solusi 4", obfuscated: false },
];

const T0 = 1_000_000;

function baseState(overrides: Partial<HintState> = {}): HintState {
  return { ...createInitialHintState(T0), ...overrides };
}

describe("isGateOpen", () => {
  it("Petunjuk 1 selalu terbuka", () => {
    expect(isGateOpen(baseState(), 1, T0, DEFAULT_SCORING.hintGate)).toBe(true);
  });

  it("Petunjuk 2 terbuka setelah Petunjuk 1 dibuka", () => {
    expect(isGateOpen(baseState({ revealed: 0 }), 2, T0, DEFAULT_SCORING.hintGate)).toBe(false);
    expect(isGateOpen(baseState({ revealed: 1 }), 2, T0, DEFAULT_SCORING.hintGate)).toBe(true);
  });

  it("Petunjuk 3 terkunci sebelum Petunjuk 2 dibuka", () => {
    expect(isGateOpen(baseState({ revealed: 1 }), 3, T0, DEFAULT_SCORING.hintGate)).toBe(false);
  });

  it("Petunjuk 3 terbuka setelah 1 query gagal sejak Petunjuk 2 dibuka", () => {
    const state = baseState({ revealed: 2, hintOpenedAt: [T0, T0], failedSinceLastHint: 1 });
    expect(isGateOpen(state, 3, T0, DEFAULT_SCORING.hintGate)).toBe(true);
  });

  it("Petunjuk 3 terbuka setelah 120 detik sejak Petunjuk 2 dibuka, walau tanpa query gagal", () => {
    const state = baseState({ revealed: 2, hintOpenedAt: [T0, T0], failedSinceLastHint: 0 });
    expect(isGateOpen(state, 3, T0 + 120_000, DEFAULT_SCORING.hintGate)).toBe(true);
    expect(isGateOpen(state, 3, T0 + 119_000, DEFAULT_SCORING.hintGate)).toBe(false);
  });
});

describe("hintReducer", () => {
  it("REQUEST Petunjuk 1 langsung menampilkan (gratis, tanpa konfirmasi)", () => {
    const state = hintReducer(baseState(), { type: "REQUEST", now: T0 }, HINTS, DEFAULT_SCORING);
    expect(state.status).toBe("showing");
    expect(state.revealed).toBe(1);
    expect(state.hintOpenedAt[0]).toBe(T0);
  });

  it("REQUEST Petunjuk 2 (berbayar, gerbang terbuka) masuk status 'confirming'", () => {
    const afterHint1 = hintReducer(baseState(), { type: "REQUEST", now: T0 }, HINTS, DEFAULT_SCORING);
    const requested = hintReducer(afterHint1, { type: "REQUEST", now: T0 + 1 }, HINTS, DEFAULT_SCORING);
    expect(requested.status).toBe("confirming");
    expect(requested.revealed).toBe(1); // belum naik sampai CONFIRM
  });

  it("REQUEST Petunjuk 3 sebelum gerbang terbuka masuk status 'locked'", () => {
    let state = baseState({ revealed: 2, hintOpenedAt: [T0, T0] });
    state = hintReducer(state, { type: "REQUEST", now: T0 + 1000 }, HINTS, DEFAULT_SCORING);
    expect(state.status).toBe("locked");
    expect(state.revealed).toBe(2); // tidak naik
  });

  it("CONFIRM menaikkan level dan mereset penghitung gagal/error sejak petunjuk", () => {
    let state = baseState({ status: "confirming", revealed: 1, failedSinceLastHint: 5, consecutiveErrors: 3 });
    state = hintReducer(state, { type: "CONFIRM", now: T0 + 2000 }, HINTS, DEFAULT_SCORING);
    expect(state.status).toBe("showing");
    expect(state.revealed).toBe(2);
    expect(state.failedSinceLastHint).toBe(0);
    expect(state.consecutiveErrors).toBe(0);
  });

  it("CANCEL dari 'confirming' kembali ke 'idle' tanpa menaikkan level", () => {
    const state = hintReducer(
      baseState({ status: "confirming", revealed: 1 }),
      { type: "CANCEL", now: T0 },
      HINTS,
      DEFAULT_SCORING
    );
    expect(state.status).toBe("idle");
    expect(state.revealed).toBe(1);
  });

  it("Petunjuk 4 ditutup masuk status 'exhausted' (step ditandai dibantu)", () => {
    const state = hintReducer(
      baseState({ status: "showing", revealed: 4, hintOpenedAt: [T0, T0, T0, T0] }),
      { type: "CLOSE", now: T0 },
      HINTS,
      DEFAULT_SCORING
    );
    expect(state.status).toBe("exhausted");
  });

  it("Petunjuk < 4 ditutup kembali ke 'idle' dan mereset penghitung gagal", () => {
    const state = hintReducer(
      baseState({ status: "showing", revealed: 2, failedSinceLastHint: 3 }),
      { type: "CLOSE", now: T0 },
      HINTS,
      DEFAULT_SCORING
    );
    expect(state.status).toBe("idle");
    expect(state.failedSinceLastHint).toBe(0);
  });

  it("menutup tawaran yang diabaikan memasang cooldown 60 detik", () => {
    const state = hintReducer(
      baseState({ status: "offering" }),
      { type: "CLOSE", now: T0 },
      HINTS,
      DEFAULT_SCORING
    );
    expect(state.status).toBe("idle");
    expect(state.offerCooldownUntil).toBe(T0 + 60_000);
  });

  it("RUN_WRONG menambah failedSinceLastHint dan mereset consecutiveErrors", () => {
    const state = hintReducer(
      baseState({ consecutiveErrors: 2 }),
      { type: "RUN_WRONG", at: T0 },
      HINTS,
      DEFAULT_SCORING
    );
    expect(state.failedSinceLastHint).toBe(1);
    expect(state.consecutiveErrors).toBe(0);
  });

  it("RUN_ERROR menambah consecutiveErrors", () => {
    const state = hintReducer(baseState(), { type: "RUN_ERROR", at: T0 }, HINTS, DEFAULT_SCORING);
    expect(state.consecutiveErrors).toBe(1);
  });

  it("RUN_CORRECT selalu berakhir di status 'done', dari status apa pun", () => {
    for (const status of ["idle", "offering", "showing", "locked"] as const) {
      const state = hintReducer(baseState({ status }), { type: "RUN_CORRECT" }, HINTS, DEFAULT_SCORING);
      expect(state.status).toBe("done");
    }
  });

  it("bantuan tidak pernah terbuka sendiri: TICK tidak pernah menaikkan `revealed`", () => {
    const offered = hintReducer(
      baseState({ failedSinceLastHint: 5, lastActivityAt: T0 - 600_000 }),
      { type: "TICK", now: T0 },
      HINTS,
      DEFAULT_SCORING
    );
    expect(offered.revealed).toBe(0);
  });
});

describe("shouldOffer", () => {
  it("tidak menawarkan sebelum minSecondsOnStep terlampaui", () => {
    const state = baseState({ stepStartedAt: T0, failedSinceLastHint: 5 });
    expect(shouldOffer(state, T0 + 1000, HINTS, DEFAULT_SCORING)).toBe(false);
  });

  it("menawarkan Petunjuk 1 setelah >= 2 query salah dan sudah 90 detik di step", () => {
    const state = baseState({ stepStartedAt: T0, lastActivityAt: T0, failedSinceLastHint: 2 });
    expect(shouldOffer(state, T0 + 90_000, HINTS, DEFAULT_SCORING)).toBe(true);
  });

  it("menawarkan Petunjuk 1 setelah idle 60 detik (walau tanpa query salah)", () => {
    const state = baseState({ stepStartedAt: T0 - 100_000, lastActivityAt: T0 - 60_000 });
    expect(shouldOffer(state, T0, HINTS, DEFAULT_SCORING)).toBe(true);
  });

  it("tidak menawarkan Petunjuk 3/4 sebelum gerbangnya terbuka, walau syarat lain terpenuhi", () => {
    const state = baseState({
      revealed: 2,
      hintOpenedAt: [T0, T0],
      stepStartedAt: T0 - 200_000,
      lastActivityAt: T0 - 200_000, // idle sangat lama
      failedSinceLastHint: 0,
    });
    expect(shouldOffer(state, T0, HINTS, DEFAULT_SCORING)).toBe(false);
  });

  it("tidak menawarkan lagi setelah semua 4 petunjuk terbuka", () => {
    const state = baseState({ revealed: 4, lastActivityAt: T0 - 600_000 });
    expect(shouldOffer(state, T0, HINTS, DEFAULT_SCORING)).toBe(false);
  });

  it("menghormati offerCooldownUntil setelah tawaran diabaikan", () => {
    const state = baseState({
      stepStartedAt: T0 - 200_000,
      lastActivityAt: T0 - 200_000,
      offerCooldownUntil: T0 + 30_000,
    });
    expect(shouldOffer(state, T0, HINTS, DEFAULT_SCORING)).toBe(false);
  });
});
