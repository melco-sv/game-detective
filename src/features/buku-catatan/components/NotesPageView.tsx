"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { ChapterSummary } from "@/engine/content/manifest";
import type { DetectiveNote } from "@/engine/notes/types";
import { SUGGESTED_TAGS } from "@/engine/notes/types";
import { notesToJsonBackup, notesToMarkdown, notesToSqlLog } from "@/engine/notes/export";
import { updateNote } from "@/engine/notes/factory";
import { notesRepository } from "@/infra/storage/notes-repository";
import { downloadTextFile } from "@/lib/download";
import { NoteCard } from "./NoteCard";
import { NoteDetailPanel } from "./NoteDetailPanel";
import { SaveNoteDialog } from "./SaveNoteDialog";

// Halaman penuh Buku Catatan — /catatan (docs/03-design.md §4.5): grid kartu
// 2-3 kolom + panel detail di kanan, filter bab/label, urutan, ekspor
// seluruh buku, hapus lewat modal konfirmasi (bukan undo — beda dari drawer
// investigasi, lihat catatan di NotesDrawer.tsx).

type SortOrder = "terbaru" | "terlama" | "per-step";

export interface NotesPageViewProps {
  chapters: ChapterSummary[];
}

export function NotesPageView({ chapters }: NotesPageViewProps) {
  const notes = useLiveQuery(() => notesRepository.list(), [], [] as DetectiveNote[]);
  const chapterById = useMemo(() => new Map(chapters.map((c) => [c.id, c])), [chapters]);

  const [search, setSearch] = useState("");
  const [filterChapter, setFilterChapter] = useState<string>("semua");
  const [filterTag, setFilterTag] = useState<string>("semua");
  const [sortOrder, setSortOrder] = useState<SortOrder>("terbaru");
  const [selectedId, setSelectedId] = useState<string>();
  const [editingNote, setEditingNote] = useState<DetectiveNote>();
  const [deleteTarget, setDeleteTarget] = useState<DetectiveNote>();

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("id-ID");
    let result = notes.filter((n) => {
      if (filterChapter !== "semua" && n.chapterId !== filterChapter) return false;
      if (filterTag !== "semua" && !n.tags.includes(filterTag)) return false;
      if (!q) return true;
      return n.title.toLocaleLowerCase("id-ID").includes(q) || n.tags.some((t) => t.includes(q)) || n.sql.toLocaleLowerCase("id-ID").includes(q) || n.body?.toLocaleLowerCase("id-ID").includes(q);
    });
    result = [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortOrder === "terlama") return a.updatedAt - b.updatedAt;
      if (sortOrder === "per-step") return `${a.chapterId}:${a.stepId ?? ""}`.localeCompare(`${b.chapterId}:${b.stepId ?? ""}`);
      return b.updatedAt - a.updatedAt;
    });
    return result;
  }, [notes, search, filterChapter, filterTag, sortOrder]);

  const selected = notes.find((n) => n.id === selectedId);

  function exportChapterTitle(): string {
    if (filterChapter === "semua") return "Semua Bab";
    return chapterById.get(filterChapter)?.title ?? filterChapter;
  }

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-12">
      <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-primary">Divisi Investigasi Data</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold text-text-primary">Buku Catatan</h1>
      <p className="mt-2 text-text-secondary">Hasil query yang kamu simpan. Pakai untuk menyusun kesimpulan sebelum melapor.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul, query, atau isi catatan…"
          className="min-w-[240px] flex-1 rounded-md border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
        <select
          value={filterChapter}
          onChange={(e) => setFilterChapter(e.target.value)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
        >
          <option value="semua">Semua Bab</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              Bab {c.order} &middot; {c.title}
            </option>
          ))}
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
        >
          <option value="terbaru">Terbaru</option>
          <option value="terlama">Terlama</option>
          <option value="per-step">Per Step</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilterTag("semua")}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${filterTag === "semua" ? "bg-primary text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-3"}`}
        >
          Semua
        </button>
        {SUGGESTED_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setFilterTag(tag)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${filterTag === tag ? "bg-primary text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-3"}`}
          >
            {tag}
          </button>
        ))}
      </div>

      {notes.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-muted">
          <span>Ekspor {filtered.length} catatan yang tampil:</span>
          <button type="button" onClick={() => downloadTextFile(`buku-catatan-${filterChapter}.sql`, notesToSqlLog(filtered))} className="underline hover:text-text-primary">
            .sql
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(`berkas-investigasi-${filterChapter}.md`, notesToMarkdown(filtered, exportChapterTitle()))}
            className="underline hover:text-text-primary"
          >
            Markdown
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(`buku-catatan-backup.json`, JSON.stringify(notesToJsonBackup(filtered, Date.now()), null, 2), "application/json")}
            className="underline hover:text-text-primary"
          >
            JSON (backup)
          </button>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong py-16 text-center text-text-muted">
              <span className="text-3xl" aria-hidden>
                &#128214;
              </span>
              <p className="text-sm">{notes.length === 0 ? "Buku catatanmu masih kosong." : "Tidak ada catatan yang cocok."}</p>
              {notes.length === 0 ? (
                <p className="text-xs">Jalankan query, lalu tekan Simpan ke Catatan untuk menyimpan temuan pertamamu.</p>
              ) : null}
            </div>
          ) : (
            <div className="columns-1 gap-4 sm:columns-2">
              {filtered.map((note) => (
                <div key={note.id} className="mb-4 break-inside-avoid">
                  <NoteCard
                    note={note}
                    chapterOrder={chapterById.get(note.chapterId)?.order}
                    onSelect={() => setSelectedId(note.id)}
                    onCopyToEditor={() => setSelectedId(note.id)}
                    onTogglePin={() => void notesRepository.put(updateNote(note, { pinned: !note.pinned }, Date.now()))}
                    onEdit={() => setEditingNote(note)}
                    onDelete={() => setDeleteTarget(note)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-border-subtle bg-surface-1">
          {selected ? (
            <NoteDetailPanel
              note={selected}
              onCopyToEditor={() => {
                /* halaman ini tidak attach ke editor manapun; tautan di bawah mengarah ke Ruang Investigasi */
              }}
            />
          ) : (
            <p className="p-4 text-sm text-text-muted">Pilih catatan untuk melihat detailnya.</p>
          )}
          {selected ? (
            <div className="border-t border-border-subtle p-4">
              <Link
                href={`/kasus/${chapterById.get(selected.chapterId)?.slug ?? ""}/investigasi`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Buka Bab Ini di Ruang Investigasi &rarr;
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <SaveNoteDialog
        open={editingNote !== undefined}
        onClose={() => setEditingNote(undefined)}
        heading="Ubah Judul & Label"
        initialTitle={editingNote?.title ?? ""}
        initialBody={editingNote?.body}
        initialTags={editingNote?.tags}
        onSave={({ title, body, tags }) => {
          if (editingNote) void notesRepository.put(updateNote(editingNote, { title, body, tags }, Date.now()));
          setEditingNote(undefined);
        }}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-md bg-surface-1 p-6 text-text-primary shadow-2xl">
            <h2 className="font-display text-lg font-bold">Hapus catatan ini?</h2>
            <p className="mt-2 text-sm text-text-secondary">Catatan yang dihapus tidak bisa dikembalikan.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(undefined)} className="rounded-md px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary">
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  void notesRepository.softDelete(deleteTarget.id);
                  if (selectedId === deleteTarget.id) setSelectedId(undefined);
                  setDeleteTarget(undefined);
                }}
                className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
