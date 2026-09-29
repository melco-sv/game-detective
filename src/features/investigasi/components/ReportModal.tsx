"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChapterManifest } from "@/engine/content/manifest";
import { normalizeName } from "@/engine/validation/suspect";
import { canSubmitReport, formatCooldown, WRONG_SUSPECT_ALERT_TEXT } from "@/engine/report/policy";
import { useInvestigationStore } from "@/stores/investigation";

// Formulir Laporan Polisi (docs/03-design.md §4.6; A4, A6, B2, B7). Field
// SELALU tanpa autocomplete/datalist agar daftar kandidat tidak bocor.

export interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  manifest: ChapterManifest;
  onSolved: () => void;
}

/**
 * Pembungkus tipis: `ReportModalForm` di-mount ulang setiap kali `open`
 * berubah dari false -> true, sehingga state internalnya (nama, error
 * validasi) selalu bersih tanpa perlu efek yang me-reset state (React
 * menganjurkan remount lewat unmount/mount, bukan setState di efek).
 */
export function ReportModal(props: ReportModalProps) {
  if (!props.open) return null;
  return <ReportModalForm {...props} />;
}

function ReportModalForm({ onClose, manifest, onSolved }: ReportModalProps) {
  const report = useInvestigationStore((s) => s.report);
  const solved = useInvestigationStore((s) => s.solved);
  const submitReport = useInvestigationStore((s) => s.submitReport);

  const slots = manifest.report.suspects;
  const [names, setNames] = useState<string[]>(() => slots.map(() => ""));
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!report.cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [report.cooldownUntil]);

  const gate = useMemo(() => canSubmitReport(report, now), [report, now]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (names.some((n) => n.trim().length === 0)) {
      setValidationError(slots.length > 1 ? "Ketiga nama wajib diisi." : "Nama tersangka wajib diisi.");
      return;
    }
    if (slots.length > 1) {
      const normalized = names.map(normalizeName);
      const hasDuplicate = normalized.some((n, i) => normalized.indexOf(n) !== i);
      if (hasDuplicate) {
        setValidationError("Satu orang hanya boleh ditulis sekali.");
        return;
      }
    }
    setValidationError(undefined);
    setSubmitting(true);
    try {
      const result = await submitReport(names);
      if (result.correct) {
        onSolved();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || !gate.canSubmit || solved;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-lg -rotate-[0.5deg] rounded bg-paper p-8 text-on-paper shadow-2xl"
        style={{ borderRadius: "var(--r-paper)" }}
      >
        <p className="font-mono text-xs uppercase tracking-wide text-paper-muted">Divisi Investigasi Data</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold">LAPORAN POLISI</h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-paper-muted">Nomor Kasus</label>
            <p className="border-b-2 border-on-paper/40 pb-1 font-mono text-lg">
              {String(manifest.order).padStart(2, "0")}/DID &middot; Bab {manifest.order} &mdash; {manifest.title}
            </p>
          </div>

          {slots.map((slot, i) => (
            <div key={slot.id}>
              <label
                className="block font-mono text-xs uppercase tracking-wide text-paper-muted"
                htmlFor={`suspect-${slot.id}`}
              >
                {slot.label}
              </label>
              <input
                id={`suspect-${slot.id}`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={names[i] ?? ""}
                onChange={(e) => setNames((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))}
                placeholder={slots.length > 1 ? `Nama ${slot.label.toLowerCase()}…` : "Tulis nama lengkap tersangka…"}
                className="w-full border-b-2 border-on-paper/40 bg-transparent pb-1 font-mono text-xl focus:border-on-paper focus:outline-none"
                disabled={solved}
              />
            </div>
          ))}

          <p className="text-xs text-paper-muted">Tulis sesuai kolom nama di tabel penduduk.</p>

          {validationError ? <p className="text-sm font-semibold text-stamp-red">{validationError}</p> : null}

          {!validationError && report.lastAlert ? (
            <div className="rounded border border-stamp-red/50 bg-stamp-red/10 p-3 text-sm">
              <p className="font-semibold text-stamp-red">{WRONG_SUSPECT_ALERT_TEXT}</p>
              {report.lastAlert.note ? <p className="mt-1 text-on-paper">{report.lastAlert.note}</p> : null}
            </div>
          ) : null}

          {!gate.canSubmit ? (
            <p className="text-sm font-semibold text-stamp-red">
              Kamu bisa melapor lagi dalam {formatCooldown(gate.remainingMs)}.
            </p>
          ) : null}

          {solved ? (
            <div className="rounded border border-stamp-green/50 bg-stamp-green/10 p-3 text-sm font-semibold text-stamp-green">
              Tepat sasaran! Kasus ditutup.
            </div>
          ) : (
            <p className="text-xs text-paper-muted">
              Laporan yang salah mengurangi 100 poin. Step yang belum selesai tidak memberi poin.
            </p>
          )}

          <div className="flex justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-semibold text-on-paper/70 hover:text-on-paper"
            >
              Kembali Menyelidiki
            </button>
            {!solved ? (
              <button
                type="submit"
                disabled={disabled}
                className="rounded-md bg-bg-base px-6 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-50"
              >
                {submitting ? "Mengirim laporan…" : "Ajukan Laporan"}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
