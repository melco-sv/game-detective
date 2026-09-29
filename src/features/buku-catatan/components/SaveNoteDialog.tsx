"use client";

import { useState } from "react";
import { NOTE_LIMITS, SUGGESTED_TAGS } from "@/engine/notes/types";

// Dialog "Simpan ke Catatan" (docs/02-arsitektur.md §8.3): judul (terisi
// otomatis), tag (saran: tersangka/bukti/alibi/laporan), catatan bebas.
// Field sql/snapshot TIDAK ditampilkan di sini — sudah ditentukan pemanggil
// (hasil query saat ini, atau catatan yang sedang diedit) sebelum dialog ini
// dibuka; komponen ini murni form judul/label/catatan pribadi.

export interface SaveNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: { title: string; body: string; tags: string[] }) => void;
  initialTitle: string;
  initialBody?: string;
  initialTags?: string[];
  heading?: string;
}

export function SaveNoteDialog(props: SaveNoteDialogProps) {
  if (!props.open) return null;
  return <SaveNoteDialogForm {...props} />;
}

function SaveNoteDialogForm({
  onClose,
  onSave,
  initialTitle,
  initialBody = "",
  initialTags = [],
  heading = "Simpan ke Catatan",
}: SaveNoteDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, NOTE_LIMITS.maxTags)));
  }

  function addCustomTag() {
    const tag = tagInput.trim().toLocaleLowerCase("id-ID").slice(0, NOTE_LIMITS.maxTagChars);
    if (tag && !tags.includes(tag) && tags.length < NOTE_LIMITS.maxTags) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ title, body, tags });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-md bg-surface-1 p-6 text-text-primary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold">{heading}</h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="note-title" className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Judul
            </label>
            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">Label</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    tags.includes(tag) ? "bg-primary text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-3"
                  }`}
                >
                  {tag}
                </button>
              ))}
              {tags
                .filter((t) => !(SUGGESTED_TAGS as readonly string[]).includes(t))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-on-primary"
                  >
                    {tag} &times;
                  </button>
                ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
              onBlur={addCustomTag}
              placeholder="Label lain, tekan Enter…"
              className="mt-1.5 w-full rounded-md border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="note-body" className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Catatan pribadi
            </label>
            <textarea
              id="note-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={NOTE_LIMITS.maxBodyChars}
              placeholder="Kenapa hasil ini penting?"
              className="mt-1 w-full resize-none rounded-md border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary"
            >
              Batal
            </button>
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover">
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
