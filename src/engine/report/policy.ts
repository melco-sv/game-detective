/**
 * ReportPolicy — aturan salah tuduh bertahap & jeda laporan (A4, B2, B7;
 * docs/02-arsitektur.md §6.5). Fungsi murni: state dibaca/ditulis oleh
 * pemanggil (Repository IndexedDB) SEBELUM UI menampilkan hasil, sehingga
 * reload di tengah jalan tidak bisa menghindari penalti atau jeda (§9.3).
 */
import type { ScoringSpec } from "../content/types";

export const WRONG_SUSPECT_ALERT_TEXT = "Kamu salah menentukan tersangka, silakan cari lagi.";

export interface ReportProgressSnapshot {
  wrongAttempts: number; // sebelum percobaan salah yang sedang diproses
  cooldownUntil?: number;
}

export type AlertLevel = 1 | 2 | 3; // 3 = salah ke-3 dan seterusnya

export interface ReportWrongOutcome {
  wrongAttempts: number; // setelah percobaan salah ini
  alertLevel: AlertLevel;
  /** Teks selalu WRONG_SUSPECT_ALERT_TEXT; ditambah petunjuk evaluatif mulai level 2. */
  showEvaluativeNote: boolean;
  cooldownUntil: number | undefined;
  penaltyPct: number; // persentase dari maxScore untuk SATU percobaan salah ini
}

export type SubmitGate = { canSubmit: true } | { canSubmit: false; remainingMs: number };

/** Bisakah laporan diajukan sekarang, atau masih dalam jeda (tahan reload)? */
export function canSubmitReport(progress: ReportProgressSnapshot, now: number): SubmitGate {
  if (progress.cooldownUntil !== undefined && now < progress.cooldownUntil) {
    return { canSubmit: false, remainingMs: progress.cooldownUntil - now };
  }
  return { canSubmit: true };
}

/** Dipanggil setelah laporan diajukan dan ternyata SALAH. */
export function onWrongReport(
  progress: ReportProgressSnapshot,
  now: number,
  scoring: Pick<
    ScoringSpec,
    "wrongReportPenaltyPct" | "wrongReportCooldownFromAttempt" | "wrongReportCooldownSeconds"
  >
): ReportWrongOutcome {
  const wrongAttempts = progress.wrongAttempts + 1;
  const alertLevel: AlertLevel = wrongAttempts >= 3 ? 3 : wrongAttempts === 2 ? 2 : 1;
  const cooldownUntil =
    wrongAttempts >= scoring.wrongReportCooldownFromAttempt
      ? now + scoring.wrongReportCooldownSeconds * 1000
      : progress.cooldownUntil;

  return {
    wrongAttempts,
    alertLevel,
    showEvaluativeNote: wrongAttempts >= 2,
    cooldownUntil,
    penaltyPct: scoring.wrongReportPenaltyPct,
  };
}

/** "0:42" — dipakai UI untuk hitung mundur tombol "Ajukan Laporan". */
export function formatCooldown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
