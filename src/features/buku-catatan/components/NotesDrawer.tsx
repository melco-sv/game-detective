"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { ChapterId, StepId } from "@/engine/content/types";
import type { DetectiveNote } from "@/engine/notes/types";
import { updateNote } from "@/engine/notes/factory";
import { notesRepository } from "@/infra/storage/notes-repository";
import { NoteCard } from "./NoteCard";
import { NoteDetailPanel } from "./NoteDetailPanel";
import { SaveNoteDialog } from "./SaveNoteDialog";

// Drawer Buku Catatan dari Ruang Investigasi (docs/03-design.md §4.5, "Mode
// drawer"): lebar 560, hanya list kartu; klik kartu membukanya DI DALAM
// drawer yang sama (list <-> detail bergantian, bukan dua kolom). Hapus
// memakai undo optimistik (§8.3) — beda dari halaman /catatan yang memakai
// modal konfirmasi (§4.5), karena ini konteks cepat di tengah bermain.

const UNDO_MS = 5000;

export interface NotesDrawerProps {
  open: boolean;
  onClose: () => void;
  chapterId: ChapterId;
  chapterOrder: number;
  stepTitleById: Record<StepId, string>;
  onCopyToEditor: (sql: string) => void;
  onRerun: (sql: string) => void;
}

export function NotesDrawer({ open, onClose, chapterId, chapterOrder, stepTitleById, onCopyToEditor, onRerun }: NotesDrawerProps) {
  const notes = useLiveQuery(() => notesRepository.list(chapterId), [chapterId], [] as DetectiveNote[]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [editingNote, setEditingNote] = useState<DetectiveNote>();
  const [pendingDelete, setPendingDelete] = useState<{ note: DetectiveNote; timer: ReturnType<typeof setTimeout> }>();

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("id-ID");
    return notes
      .filter((n) => n.id !== pendingDelete?.note.id)
      .filter((n) => !q || n.title.toLocaleLowerCase("id-ID").includes(q) || n.tags.some((t) => t.includes(q)) || n.sql.toLocaleLowerCase("id-ID").includes(q))
      .sort((a, b) => (a.pinned === b.pinned ? b.updatedAt - a.updatedAt : a.pinned ? -1 : 1));
  }, [notes, search, pendingDelete]);

  const selected = notes.find((n) => n.id === selectedId);

  function requestDelete(note: DetectiveNote) {
    setSelectedId(undefined);
    const timer = setTimeout(() => {
      void notesRepository.softDelete(note.id);
      setPendingDelete(undefined);
    }, UNDO_MS);
    setPendingDelete({ note, timer });
  }

  function cancelDelete() {
    if (pendingDelete) clearTimeout(pendingDelete.timer);
    setPendingDelete(undefined);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-[560px] max-w-full flex-col border-l border-border-subtle bg-bg-base shadow-2xl">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h2 className="font-display text-base font-bold text-text-primary">Buku Catatan</h2>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Tutup">
          &times;
        </button>
      </div>

      {selected ? (
        <NoteDetailPanel
          note={selected}
          onClose={() => setSelectedId(undefined)}
          onCopyToEditor={() => onCopyToEditor(selected.sql)}
          onRerun={() => {
            onRerun(selected.sql);
            onClose();
          }}
        />
      ) : (
        <>
          <div className="border-b border-border-subtle p-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul, query, atau isi catatan…"
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-text-muted">
                <span className="text-3xl" aria-hidden>
                  &#128214;
                </span>
                <p className="text-sm">{notes.length === 0 ? "Buku catatanmu masih kosong." : "Tidak ada catatan yang cocok."}</p>
                {notes.length === 0 ? (
                  <p className="text-xs">Jalankan query, lalu tekan Simpan ke Catatan untuk menyimpan temuan pertamamu.</p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {visible.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    chapterOrder={chapterOrder}
                    stepTitle={note.stepId ? stepTitleById[note.stepId] : undefined}
                    onSelect={() => setSelectedId(note.id)}
                    onCopyToEditor={() => onCopyToEditor(note.sql)}
                    onTogglePin={() => void notesRepository.put(updateNote(note, { pinned: !note.pinned }, Date.now()))}
                    onEdit={() => setEditingNote(note)}
                    onDelete={() => requestDelete(note)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {pendingDelete ? (
        <div className="flex items-center justify-between border-t border-border-subtle bg-surface-2 px-4 py-2 text-sm">
          <span className="text-text-secondary">Catatan dihapus.</span>
          <button type="button" onClick={cancelDelete} className="font-semibold text-primary hover:underline">
            Batalkan
          </button>
        </div>
      ) : null}

      <SaveNoteDialog
        open={editingNote !== undefined}
        onClose={() => setEditingNote(undefined)}
        heading="Ubah Judul & Label"
        initialTitle={editingNote?.title ?? ""}
        initialBody={editingNote?.body}
        initialTags={editingNote?.tags}
        onSave={({ title, body, tags }) => {
          if (editingNote) {
            void notesRepository.put(updateNote(editingNote, { title, body, tags }, Date.now()));
          }
          setEditingNote(undefined);
        }}
      />
    </div>
  );
}
