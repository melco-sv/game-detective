"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import type { ChapterManifest } from "@/engine/content/manifest";
import { staticContentSource } from "@/infra/content/static-content-source";
import { SqlEngineClient, type EngineReadyInfo } from "@/infra/sql/engine-client";
import { resolveFingerprintOptions } from "@/engine/validation/validators";
import { createNote } from "@/engine/notes/factory";
import { buildResultSnapshot } from "@/engine/notes/snapshot";
import { notesRepository } from "@/infra/storage/notes-repository";
import { useInvestigationStore } from "@/stores/investigation";
import { SqlEditor } from "@/features/investigasi/components/SqlEditor";
import { ResultsPanel } from "@/features/investigasi/components/ResultsPanel";
import { MissionPanel } from "@/features/investigasi/components/MissionPanel";
import { SchemaPanel } from "@/features/investigasi/components/SchemaPanel";
import { HintPanel } from "@/features/investigasi/components/HintPanel";
import { ReportModal } from "@/features/investigasi/components/ReportModal";
import { BukuSakuPanel } from "@/features/buku-saku/components/BukuSakuPanel";
import { NotesDrawer } from "@/features/buku-catatan/components/NotesDrawer";
import { SaveNoteDialog } from "@/features/buku-catatan/components/SaveNoteDialog";

type RightTab = "skema" | "bantuan" | "buku-saku";

function useElapsedTimer(startedAt: number | undefined): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return "00:00";
  // `now` di-set saat mount, SEBELUM `startedAt` (dari Dexie, async) tersedia
  // — tanpa Math.max, tick pertama bisa negatif ("-1:-1") sampai interval
  // pertama jalan sedetik kemudian.
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function RuangInvestigasiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [manifest, setManifest] = useState<ChapterManifest>();
  const [loadError, setLoadError] = useState<string>();
  const [engineInfo, setEngineInfo] = useState<EngineReadyInfo>();
  const [engineError, setEngineError] = useState<string>();
  const [rightTab, setRightTab] = useState<RightTab>("skema");
  const [reportOpen, setReportOpen] = useState(false);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [saveNoteOpen, setSaveNoteOpen] = useState(false);
  const [suggestedStepId, setSuggestedStepId] = useState<string>();

  const engineRef = useRef<SqlEngineClient>(undefined);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const noteCount = useLiveQuery(
    () => (manifest ? notesRepository.list(manifest.id).then((n) => n.length) : 0),
    [manifest?.id],
    0
  );

  const loadChapter = useInvestigationStore((s) => s.loadChapter);
  const activeStepId = useInvestigationStore((s) => s.activeStepId);
  const completedStepIds = useInvestigationStore((s) => s.completedStepIds);
  const steps = useInvestigationStore((s) => s.steps);
  const solved = useInvestigationStore((s) => s.solved);
  const startedAt = useInvestigationStore((s) => s.startedAt);
  const setActiveStep = useInvestigationStore((s) => s.setActiveStep);
  const setSql = useInvestigationStore((s) => s.setSql);
  const beginRun = useInvestigationStore((s) => s.beginRun);
  const applyRunOutcome = useInvestigationStore((s) => s.applyRunOutcome);
  const dispatchHint = useInvestigationStore((s) => s.dispatchHint);

  // Muat manifest, lalu mulai Worker & DB (docs/03-design.md §4.3: "Worker &
  // DB mulai dimuat di sini" — untuk MVP dimulai di Ruang Investigasi, bukan
  // Briefing, supaya Briefing tetap Server Component murni).
  useEffect(() => {
    let cancelled = false;
    staticContentSource
      .getManifestBySlug(slug)
      .then(async (m) => {
        if (cancelled) return;
        setManifest(m);
        await loadChapter(m);
        if (cancelled) return;
        const client = new SqlEngineClient({ dbUrl: m.database.url, sha256: m.database.sha256 });
        engineRef.current = client;
        return client.init();
      })
      .then((info) => {
        if (!cancelled && info) setEngineInfo(info);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        if (!manifest) setLoadError(message);
        else setEngineError(message);
      });
    return () => {
      cancelled = true;
      engineRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya jalan sekali per slug
  }, [slug]);

  const activeStep = manifest?.steps.find((s) => s.id === activeStepId);
  const activeRuntime = activeStepId ? steps[activeStepId] : undefined;
  const timer = useElapsedTimer(startedAt);

  // Step sumber untuk dialog Simpan ke Catatan: biasanya sama dengan step
  // aktif, TAPI begitu step selesai lewat tawaran otomatis, `activeStepId`
  // sudah berpindah ke step berikutnya (§9 "maju ke step belum selesai
  // berikutnya") — hasil yang ditawarkan harus tetap diambil dari step yang
  // BARU SAJA selesai (`suggestedStepId`), bukan step aktif yang baru.
  const noteStepId = suggestedStepId ?? activeStep?.id;
  const noteStep = manifest?.steps.find((s) => s.id === noteStepId);
  const noteRuntime = noteStepId ? steps[noteStepId] : undefined;

  // Ctrl/Cmd+K membuka Buku Saku SQL (§3.16); Ctrl/Cmd+S menyimpan hasil
  // aktif ke catatan (§8.3), hanya bila ada hasil untuk disimpan.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setRightTab("buku-saku");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && activeRuntime?.lastColumns && activeRuntime.lastRows) {
        e.preventDefault();
        setSaveNoteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeRuntime?.lastColumns, activeRuntime?.lastRows]);

  const handleRun = useCallback((sqlOverride?: string) => {
    if (!manifest || !activeStep || !activeRuntime || !engineRef.current) return;
    const sql = sqlOverride ?? activeRuntime.sql;
    const wasCompleted = activeRuntime.completed;
    beginRun(activeStep.id);
    const fingerprint = {
      stepId: activeStep.id,
      salt: manifest.build.salt,
      options: resolveFingerprintOptions(activeStep.validator),
    };
    engineRef.current
      .run({ sql, purpose: "player", fingerprint })
      .then((outcome) => {
        applyRunOutcome(activeStep.id, outcome);
        // Tawarkan simpan-ke-catatan hanya persis saat step INI baru saja
        // selesai lewat run ini (§8.3 "tawaran"), bukan tiap render/hidrasi
        // progres lama.
        if (!wasCompleted && useInvestigationStore.getState().steps[activeStep.id]?.completed) {
          setSuggestedStepId(activeStep.id);
        }
      })
      .catch((err: unknown) => {
        applyRunOutcome(activeStep.id, {
          ok: false,
          error: { code: "ENGINE_CRASH", rawMessage: err instanceof Error ? err.message : String(err) },
        });
      });
  }, [manifest, activeStep, activeRuntime, beginRun, applyRunOutcome]);

  function handleSaveNote(input: { title: string; body: string; tags: string[] }) {
    if (!manifest || !noteStep || !noteRuntime) return;
    const now = Date.now();
    const snapshot =
      noteRuntime.lastColumns && noteRuntime.lastRows
        ? buildResultSnapshot(
            noteRuntime.lastColumns,
            noteRuntime.lastRows,
            noteRuntime.lastTotalRows ?? noteRuntime.lastRows.length,
            noteRuntime.lastTruncated ?? false,
            now
          )
        : null;
    const note = createNote({
      chapterId: manifest.id,
      stepId: noteStep.id,
      title: input.title,
      body: input.body,
      sql: noteRuntime.sql,
      snapshot,
      tags: input.tags,
      source: suggestedStepId ? "suggested" : "manual",
      contentVersion: manifest.version,
      now,
    });
    void notesRepository.put(note);
    setSaveNoteOpen(false);
    setSuggestedStepId(undefined);
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base p-8 text-center text-danger">
        <p>{loadError}</p>
      </div>
    );
  }

  if (!manifest || !activeStep || !activeRuntime) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base text-text-secondary">
        Memuat berkas kasus…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-bg-base">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-4">
        <div className="flex items-center gap-4">
          <Link href="/kasus" className="text-sm text-text-secondary hover:text-text-primary">
            &larr; Papan Kasus
          </Link>
          <span className="font-display text-lg font-bold text-text-primary">
            Bab {manifest.order} &middot; {manifest.title}
          </span>
          <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs text-text-secondary">
            Step {completedStepIds.size + (completedStepIds.has(activeStep.id) ? 0 : 1)}/{manifest.steps.length}
          </span>
          <span className="font-mono text-xs tabular-nums text-text-muted">{timer}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNotesDrawerOpen(true)}
            className="rounded-md border border-border-strong px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          >
            Buku Catatan{noteCount > 0 ? ` (${noteCount})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover"
          >
            Ajukan Laporan
          </button>
        </div>
      </header>

      {engineError ? (
        <div className="border-b border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger" role="alert">
          Mesin database gagal dimuat: {engineError}
        </div>
      ) : !engineInfo ? (
        <div className="border-b border-border-subtle bg-surface-1 px-4 py-2 text-sm text-text-secondary">
          Menyiapkan mesin database kasus…
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-[320px_1fr_320px] overflow-hidden">
        <aside className="overflow-hidden border-r border-border-subtle">
          <MissionPanel
            steps={manifest.steps}
            runtimes={steps}
            completedStepIds={completedStepIds}
            activeStepId={activeStepId}
            onSelectStep={setActiveStep}
          />
        </aside>

        <main className="flex flex-col gap-2 overflow-hidden p-3">
          <div className="flex items-center justify-between">
            <span className="rounded bg-surface-2 px-3 py-1 font-mono text-xs text-text-secondary">query_1.sql</span>
            <button
              type="button"
              onClick={() => handleRun()}
              disabled={!engineInfo || activeRuntime.running}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50"
            >
              {activeRuntime.running ? "Menjalankan…" : "Jalankan Query"}
              <kbd className="rounded bg-on-primary/10 px-1.5 py-0.5 font-mono text-[10px]">Ctrl ↵</kbd>
            </button>
          </div>

          <SqlEditor
            editorRef={editorRef}
            value={activeRuntime.sql}
            onChange={(value) => setSql(activeStep.id, value)}
            onRun={handleRun}
            tables={manifest.database.tables}
          />

          <div className="border-b border-border-subtle py-1 font-mono text-xs text-text-muted">
            {engineInfo ? `SQLite ${engineInfo.sqliteVersion} · Mode baca saja` : "…"}
          </div>

          <div className="flex-1 overflow-hidden">
            <ResultsPanel
              running={activeRuntime.running}
              columns={activeRuntime.lastColumns}
              rows={activeRuntime.lastRows}
              totalRows={activeRuntime.lastTotalRows}
              truncated={activeRuntime.lastTruncated}
              durationMs={activeRuntime.lastDurationMs}
              feedback={activeRuntime.feedback}
              onSaveNote={() => setSaveNoteOpen(true)}
            />
          </div>
        </main>

        <aside className="flex flex-col overflow-hidden border-l border-border-subtle">
          <div className="flex border-b border-border-subtle">
            {(["skema", "bantuan", "buku-saku"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setRightTab(tab)}
                className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                  rightTab === tab ? "border-b-2 border-primary text-primary" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {tab === "skema" ? "Skema" : tab === "bantuan" ? "Bantuan" : "Buku Saku"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {rightTab === "skema" ? (
              <SchemaPanel
                tables={manifest.database.tables}
                onInsertName={(name) =>
                  setSql(activeStep.id, activeRuntime.sql + (activeRuntime.sql.endsWith(" ") || activeRuntime.sql === "" ? "" : " ") + name)
                }
              />
            ) : rightTab === "bantuan" ? (
              <HintPanel
                step={activeStep}
                hintState={activeRuntime.hint}
                salt={manifest.build.salt}
                onRequest={() => dispatchHint(activeStep.id, { type: "REQUEST", now: Date.now() })}
                onConfirm={() => dispatchHint(activeStep.id, { type: "CONFIRM", now: Date.now() })}
                onCancel={() => dispatchHint(activeStep.id, { type: "CANCEL", now: Date.now() })}
                onInsertSql={(sql) => setSql(activeStep.id, sql)}
              />
            ) : (
              <BukuSakuPanel
                onInsert={(sql) => setSql(activeStep.id, sql)}
                activeConcepts={manifest.steps.flatMap((s) => s.concepts)}
              />
            )}
          </div>
        </aside>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        manifest={manifest}
        onSolved={() => router.push(`/kasus/${slug}/penangkapan`)}
      />
      {solved && !reportOpen ? (
        <div className="fixed bottom-4 right-4 rounded-md border border-success/40 bg-surface-2 px-4 py-3 text-sm text-success shadow-lg">
          Kasus ditutup!{" "}
          <Link href={`/kasus/${slug}/ringkasan`} className="underline">
            Lihat ringkasan
          </Link>
        </div>
      ) : null}

      {suggestedStepId && !saveNoteOpen ? (
        <div className="fixed bottom-4 left-4 flex items-center gap-3 rounded-md border border-primary/40 bg-surface-2 px-4 py-3 text-sm text-text-primary shadow-lg">
          <span>Step selesai! Simpan hasil ini ke catatan?</span>
          <button type="button" onClick={() => setSaveNoteOpen(true)} className="font-semibold text-primary hover:underline">
            Simpan
          </button>
          <button type="button" onClick={() => setSuggestedStepId(undefined)} className="text-text-muted hover:text-text-secondary">
            Nanti
          </button>
        </div>
      ) : null}

      <SaveNoteDialog
        open={saveNoteOpen}
        onClose={() => {
          setSaveNoteOpen(false);
          setSuggestedStepId(undefined);
        }}
        onSave={handleSaveNote}
        initialTitle={noteStep?.suggestNote?.title ?? noteStep?.title ?? ""}
        initialTags={noteStep?.suggestNote?.tags ?? []}
      />

      <NotesDrawer
        open={notesDrawerOpen}
        onClose={() => setNotesDrawerOpen(false)}
        chapterId={manifest.id}
        chapterOrder={manifest.order}
        stepTitleById={Object.fromEntries(manifest.steps.map((s) => [s.id, s.title]))}
        onCopyToEditor={(sql) => setSql(activeStep.id, sql)}
        onRerun={(sql) => {
          setSql(activeStep.id, sql);
          handleRun(sql);
        }}
      />
    </div>
  );
}
