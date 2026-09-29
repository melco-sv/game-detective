"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

// Animasi Penangkapan (docs/03-design.md §4.7, §5.2). Storyboard 6 frame,
// ±3,4 dtk, bisa dilewati (tombol "Lewati" setelah 0,6 dtk, atau Esc/Spasi).
// Tanpa aset foto/ilustrasi (proyek ini belum punya aset karakter) — kartu
// tersangka memakai gaya kertas manila + stempel yang sudah dipakai di
// ReportModal, bukan potret.

type Phase = "form" | "verifying" | "spotlight" | "card" | "cuffs" | "stamp" | "result";

const TIMINGS: { phase: Phase; at: number }[] = [
  { phase: "form", at: 0 },
  { phase: "verifying", at: 250 },
  { phase: "spotlight", at: 700 },
  { phase: "card", at: 1300 },
  { phase: "cuffs", at: 1900 },
  { phase: "stamp", at: 2300 },
  { phase: "result", at: 2700 },
];

const VERIFYING_TEXT = "Memverifikasi laporan…";

function useTypewriter(text: string, active: boolean, charMs: number): string {
  // Semua setState terjadi di DALAM callback interval (async), tidak
  // pernah sinkron di badan efek — tik pertama (i=0) sengaja menaruh ""
  // sebelum maju ke karakter pertama, jadi efek ini juga otomatis mereset
  // teks tiap kali `active`/`text` berubah (termasuk saat "Putar Ulang
  // Animasi"), tanpa perlu ref atau setState terpisah di luar interval.
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!active) return undefined;
    let i = 0;
    const id = setInterval(() => {
      setShown(text.slice(0, i));
      i += 1;
      if (i > text.length) clearInterval(id);
    }, charMs);
    return () => clearInterval(id);
  }, [text, active, charMs]);
  return shown;
}

export interface CaptureSceneProps {
  suspectNames: string[];
  onViewSummary: () => void;
}

export function CaptureScene({ suspectNames, onViewSummary }: CaptureSceneProps) {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(prefersReducedMotion ? "result" : "form");
  const [canSkip, setCanSkip] = useState(prefersReducedMotion === true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [replayKey, setReplayKey] = useState(0);

  const suspectLabel = suspectNames.join(" & ").toLocaleUpperCase("id-ID");
  const nameTyped = useTypewriter(suspectLabel, phase === "card" || phase === "cuffs" || phase === "stamp" || phase === "result", 45);
  const verifyingTyped = useTypewriter(VERIFYING_TEXT, phase === "verifying", 30);

  useEffect(() => {
    // Tanpa gerakan: frame akhir sudah jadi nilai awal `useState` di atas,
    // dan tombol "Putar Ulang Animasi" disembunyikan (tidak ada apa pun
    // untuk diputar ulang) — efek ini tidak pernah perlu jalan untuknya.
    if (prefersReducedMotion) return undefined;

    timers.current.forEach(clearTimeout);
    timers.current = [];
    timers.current.push(setTimeout(() => setCanSkip(false), 0));
    // TIMINGS dimulai dari { phase: "form", at: 0 } — itu sendiri sudah
    // menjadwalkan ulang fase pertama lewat setTimeout di bawah.
    for (const { phase: p, at } of TIMINGS) {
      timers.current.push(setTimeout(() => setPhase(p), at));
    }
    timers.current.push(setTimeout(() => setCanSkip(true), 600));
    return () => timers.current.forEach(clearTimeout);
  }, [replayKey, prefersReducedMotion]);

  function skip() {
    timers.current.forEach(clearTimeout);
    setPhase("result");
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "Escape" || e.key === " ") && phase !== "result") {
        e.preventDefault();
        skip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const past = (p: Phase) => TIMINGS.findIndex((t) => t.phase === p) <= TIMINGS.findIndex((t) => t.phase === phase);
  const isResult = phase === "result";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-base">
      {/* Vignette + sapuan lampu merah/biru */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 0%, #05080F 90%)" }} />
      {!prefersReducedMotion && past("spotlight") && !isResult ? (
        <>
          <motion.div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
            style={{ background: "linear-gradient(90deg, rgba(255,90,95,0.12), transparent)" }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.2, repeat: 1 }}
          />
          <motion.div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/3"
            style={{ background: "linear-gradient(270deg, rgba(106,165,255,0.12), transparent)" }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.2, repeat: 1 }}
          />
        </>
      ) : null}

      {/* Lampu sorot amber */}
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{ background: "radial-gradient(circle, rgba(242,184,75,0.18) 0%, transparent 70%)" }}
        initial={{ width: 0, height: 0 }}
        animate={past("spotlight") ? { width: isResult ? 700 : 520, height: isResult ? 700 : 520 } : { width: 0, height: 0 }}
        transition={isResult ? { duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } : { duration: 0.6, ease: "easeOut" }}
      />

      {/* F0: kertas formulir naik & memudar */}
      {phase === "form" ? (
        <motion.div
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute rounded bg-paper px-8 py-6 font-mono text-sm text-on-paper"
        >
          LAPORAN POLISI — TERKIRIM
        </motion.div>
      ) : null}

      {/* F1: teks verifikasi */}
      {phase === "verifying" ? (
        <p className="absolute font-mono text-lg text-text-secondary">
          {verifyingTyped}
          <span className="animate-pulse">▌</span>
        </p>
      ) : null}

      {/* F3-F6: kartu tersangka */}
      {past("card") ? (
        <div className="relative flex flex-col items-center">
          <motion.div
            key={replayKey}
            initial={prefersReducedMotion ? { opacity: 0 } : { y: 120, rotate: 4, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, rotate: -2, opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 0.5, ease: "easeOut" }}
            className="relative w-72 rounded bg-paper p-6 text-center text-on-paper shadow-2xl"
            style={{ borderRadius: "var(--r-paper)" }}
          >
            <div className="mb-3 h-28 rounded border border-on-paper/20 bg-on-paper/5" aria-hidden />
            <p className="font-mono text-sm font-semibold tracking-wide">{nameTyped || " "}</p>
            <p className="mt-1 font-mono text-[10px] text-paper-muted">
              {String(new Date().getDate()).padStart(2, "0")}/DID/{new Date().getFullYear()}
            </p>

            {/* F4: borgol */}
            {past("cuffs") ? (
              <motion.div
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scaleX: 0.7 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-4 flex items-center justify-center gap-2"
                aria-hidden
              >
                <span className="h-3 w-10 rounded-full border-2 border-on-paper/60" />
                <span className="h-3 w-10 rounded-full border-2 border-on-paper/60" />
              </motion.div>
            ) : null}

            {/* F5: stempel DITANGKAP */}
            {past("stamp") ? (
              <motion.div
                initial={prefersReducedMotion ? { opacity: 0 } : { scale: 2.4, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: -12, opacity: 1 }}
                transition={{ duration: 0.35, ease: "backOut" }}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 select-none"
              >
                <span className="mx-auto block w-fit rounded border-4 border-stamp-red px-4 py-1 font-display text-2xl font-extrabold uppercase tracking-widest text-stamp-red">
                  Ditangkap
                </span>
              </motion.div>
            ) : null}
          </motion.div>
        </div>
      ) : null}

      {/* F6: hasil */}
      {isResult ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative z-10 mt-8 flex flex-col items-center gap-4 text-center"
        >
          <div>
            <h1 className="font-display text-3xl font-extrabold text-text-primary">Tersangka Berhasil Ditangkap!</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
              Kartu akses boleh dipinjam, tapi kamera tidak bisa dibohongi. Kerja bagus, Penyidik.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onViewSummary}
              className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover"
            >
              Lihat Ringkasan Kasus
            </button>
            {!prefersReducedMotion ? (
              <button
                type="button"
                onClick={() => setReplayKey((k) => k + 1)}
                className="rounded-md px-5 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary"
              >
                Putar Ulang Animasi
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : null}

      {!isResult && canSkip ? (
        <button
          type="button"
          onClick={skip}
          className="absolute right-6 top-6 rounded px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary"
        >
          Lewati
        </button>
      ) : null}
    </div>
  );
}
