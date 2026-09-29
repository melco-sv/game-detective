/** Factory & validasi batas ukuran untuk `DetectiveNote` (docs/02-arsitektur.md §8.1-8.2). */
import { ulid } from "ulidx";
import type { ChapterId, StepId } from "../content/types";
import { NOTE_LIMITS, type DetectiveNote, type ResultSnapshot } from "./types";

export interface CreateNoteInput {
  chapterId: ChapterId;
  stepId?: StepId;
  title: string;
  body?: string;
  sql: string;
  snapshot: ResultSnapshot | null;
  tags: string[];
  pinned?: boolean;
  source: "manual" | "suggested";
  contentVersion: string;
  now: number;
}

function clampTag(tag: string): string {
  return tag.trim().toLocaleLowerCase("id-ID").slice(0, NOTE_LIMITS.maxTagChars);
}

/** UTC "HH:MM" — sengaja tanpa locale supaya deterministik & mudah diuji; UI boleh format ulang untuk tampilan. */
function fallbackTitle(now: number): string {
  return `Catatan ${new Date(now).toISOString().slice(11, 16)}`;
}

export function createNote(input: CreateNoteInput): DetectiveNote {
  const tags = Array.from(new Set(input.tags.map(clampTag).filter(Boolean))).slice(0, NOTE_LIMITS.maxTags);
  const title = input.title.trim().slice(0, 120);
  const body = input.body?.trim().slice(0, NOTE_LIMITS.maxBodyChars);

  return {
    id: ulid(),
    chapterId: input.chapterId,
    stepId: input.stepId,
    title: title || fallbackTitle(input.now),
    body: body ? body : undefined,
    sql: input.sql.slice(0, NOTE_LIMITS.maxSqlChars),
    snapshot: input.snapshot,
    tags,
    pinned: input.pinned ?? false,
    source: input.source,
    contentVersion: input.contentVersion,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
  tags?: string[];
  pinned?: boolean;
}

export function updateNote(note: DetectiveNote, patch: UpdateNoteInput, now: number): DetectiveNote {
  return {
    ...note,
    title: patch.title !== undefined ? patch.title.trim().slice(0, 120) || fallbackTitle(now) : note.title,
    body: patch.body !== undefined ? patch.body.trim().slice(0, NOTE_LIMITS.maxBodyChars) || undefined : note.body,
    tags:
      patch.tags !== undefined
        ? Array.from(new Set(patch.tags.map(clampTag).filter(Boolean))).slice(0, NOTE_LIMITS.maxTags)
        : note.tags,
    pinned: patch.pinned ?? note.pinned,
    updatedAt: now,
  };
}
