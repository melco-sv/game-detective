import { describe, expect, it } from "vitest";
import {
  canSubmitReport,
  formatCooldown,
  onWrongReport,
  WRONG_SUSPECT_ALERT_TEXT,
} from "@/engine/report/policy";
import { DEFAULT_SCORING } from "@/engine/content/types";

const NOW = 1_000_000;

describe("onWrongReport", () => {
  it("salah ke-1: alertLevel 1, tanpa catatan evaluatif, tanpa jeda", () => {
    const result = onWrongReport({ wrongAttempts: 0 }, NOW, DEFAULT_SCORING);
    expect(result.wrongAttempts).toBe(1);
    expect(result.alertLevel).toBe(1);
    expect(result.showEvaluativeNote).toBe(false);
    expect(result.cooldownUntil).toBeUndefined();
    expect(result.penaltyPct).toBe(10);
  });

  it("salah ke-2: alertLevel 2, dengan catatan evaluatif, tanpa jeda", () => {
    const result = onWrongReport({ wrongAttempts: 1 }, NOW, DEFAULT_SCORING);
    expect(result.wrongAttempts).toBe(2);
    expect(result.alertLevel).toBe(2);
    expect(result.showEvaluativeNote).toBe(true);
    expect(result.cooldownUntil).toBeUndefined();
  });

  it("salah ke-3: alertLevel 3, dengan catatan evaluatif DAN jeda 60 detik", () => {
    const result = onWrongReport({ wrongAttempts: 2 }, NOW, DEFAULT_SCORING);
    expect(result.wrongAttempts).toBe(3);
    expect(result.alertLevel).toBe(3);
    expect(result.showEvaluativeNote).toBe(true);
    expect(result.cooldownUntil).toBe(NOW + 60_000);
  });

  it("salah ke-4 dst tetap alertLevel 3 dengan jeda baru", () => {
    const result = onWrongReport({ wrongAttempts: 3, cooldownUntil: NOW - 1 }, NOW, DEFAULT_SCORING);
    expect(result.alertLevel).toBe(3);
    expect(result.cooldownUntil).toBe(NOW + 60_000);
  });

  it("penalti selalu 10% dari maxScore per percobaan salah", () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = onWrongReport({ wrongAttempts: attempt }, NOW, DEFAULT_SCORING);
      expect(result.penaltyPct).toBe(10);
    }
  });
});

describe("canSubmitReport", () => {
  it("bisa mengirim bila tidak ada jeda", () => {
    expect(canSubmitReport({ wrongAttempts: 0 }, NOW)).toEqual({ canSubmit: true });
  });

  it("tidak bisa mengirim selama masih dalam jeda", () => {
    const result = canSubmitReport({ wrongAttempts: 3, cooldownUntil: NOW + 5000 }, NOW);
    expect(result).toEqual({ canSubmit: false, remainingMs: 5000 });
  });

  it("bisa mengirim lagi setelah jeda lewat, bahkan setelah 'reload' (state dari penyimpanan)", () => {
    const result = canSubmitReport({ wrongAttempts: 3, cooldownUntil: NOW - 1 }, NOW);
    expect(result).toEqual({ canSubmit: true });
  });
});

describe("formatCooldown", () => {
  it("memformat mm:ss", () => {
    expect(formatCooldown(42_000)).toBe("0:42");
    expect(formatCooldown(90_000)).toBe("1:30");
    expect(formatCooldown(0)).toBe("0:00");
  });
});

describe("WRONG_SUSPECT_ALERT_TEXT", () => {
  it("teks persis sesuai B2", () => {
    expect(WRONG_SUSPECT_ALERT_TEXT).toBe("Kamu salah menentukan tersangka, silakan cari lagi.");
  });
});
