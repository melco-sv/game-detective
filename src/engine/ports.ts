/**
 * Port (interface) untuk ekstensi — domain bergantung pada abstraksi ini,
 * bukan pada infrastruktur konkret (P5, P9; docs/02-arsitektur.md §3.5).
 * Implementasi dipilih di satu tempat (`src/infra/container.ts`).
 */
import type { ChapterId, HintLevel, StepId } from "./content/types";
import type { ChapterManifest, ChapterSummary } from "./content/manifest";
import type { DetectiveNote } from "./notes/types";
import type { ChapterProgress } from "./progress/types";
import type { RunMeta, StepVerdict, SuspectVerdict } from "./validation/types";
import type { ResultFingerprints } from "./sql/types";

// Re-exported so infra/features can depend on ports.ts as a single entry point.
export type { ChapterManifest, ChapterSummary };

export interface ContentSource {
  // MVP: StaticContentSource (fetch /generated)
  listChapters(): Promise<ChapterSummary[]>; // v2: SupabaseContentSource (chapter buatan dosen)
  getManifest(chapterId: ChapterId): Promise<ChapterManifest>;
}

export interface ValidationServicePort {
  // selalu lokal saat bermain (offline-first)
  validateStep(stepId: StepId, fp: ResultFingerprints, meta: RunMeta): Promise<StepVerdict>;
  verifySuspects(chapterId: ChapterId, names: string[]): Promise<SuspectVerdict>; // §6.5
}

export interface ProgressRepository {
  get(id: ChapterId): Promise<ChapterProgress | undefined>;
  put(p: ChapterProgress): Promise<void>;
  list(): Promise<ChapterProgress[]>;
  /** "Ulangi Bab" (docs/03-design.md §4.9): hapus progres tersimpan untuk mulai bab dari awal. */
  delete(id: ChapterId): Promise<void>;
}

export interface NotesRepository {
  list(chapterId?: ChapterId): Promise<DetectiveNote[]>;
  put(n: DetectiveNote): Promise<void>;
  softDelete(id: string): Promise<void>;
}

// ── v1 (A7, B8). Implementasi MVP: Noop* (semua mengembalikan "offline"),
// jadi UI tidak perlu cabang khusus (lihat src/infra/supabase, pasca-MVP).

export interface Player {
  id: string;
  displayName: string | null;
  showOnLeaderboard: boolean;
}

export interface AuthService {
  current(): Promise<Player | null>;
  signInWithGoogle(): Promise<void>; // redirect OAuth (PKCE) -> /masuk?code=...
  signOut(opts: { wipeLocal: boolean }): Promise<void>;
  onChange(cb: (p: Player | null) => void): () => void;
}

export interface SyncReport {
  pushed: number;
  pulled: number;
  conflicts: number;
}

export type SyncStatusValue = "idle" | "syncing" | "error";

export interface SyncService {
  syncNow(): Promise<SyncReport>;
  status(): SyncStatusValue;
}

export interface RunEventHint {
  id: string; // ULID
  kind: "hint_opened";
  stepId: StepId;
  level: HintLevel;
  clientAt: number;
}

export interface RunEventReport {
  id: string;
  kind: "report_submitted";
  names: string[]; // 1 atau 3, urut slot
  clientAt: number;
}

export type RunEvent = RunEventHint | RunEventReport;

export interface RankedRun {
  runId: string;
  chapterId: ChapterId;
  contentVersion: string;
  startedAt: string; // ISO, jam server
}

export type ScoreVerdict =
  | { status: "verified"; score: number; rank?: number }
  | { status: "rejected"; reason: string }
  | { status: "flagged" };

export interface RankedRunService {
  // §6.6
  start(chapterId: ChapterId, contentVersion: string): Promise<RankedRun | null>; // null bila offline/nonaktif
  logEvent(runId: string, e: RunEvent): Promise<void>; // outbox dulu, lalu kirim
  submit(runId: string): Promise<ScoreVerdict | "queued">;
}

export interface LeaderboardRow {
  rank: number;
  displayName: string;
  score: number;
  timeMs: number;
  isSelf: boolean;
}

export interface MyRank {
  rank: number;
  score: number;
  timeMs: number;
  verified: boolean;
}

export type LeaderboardBoard = "umum" | "tanpa-bantuan";

export interface LeaderboardService {
  top(chapterId: ChapterId, board: LeaderboardBoard, page: number): Promise<LeaderboardRow[]>;
  myRank(chapterId: ChapterId, board: LeaderboardBoard): Promise<MyRank | null>;
}

export type CloudStatusValue = "ok" | "degraded" | "offline" | "disabled";

export interface CloudStatus {
  current(): CloudStatusValue;
  subscribe(cb: (s: CloudStatusValue) => void): () => void;
}

export interface AnalyticsEvent {
  name: string;
  props?: Record<string, string | number | boolean>;
}

export interface AnalyticsSink {
  track(event: AnalyticsEvent): void;
}
