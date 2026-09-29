"use client";

import { useEffect, useMemo, useRef } from "react";
import CodeMirror, { keymap, type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { sql, SQLite, type SQLNamespace } from "@codemirror/lang-sql";
import type { TableMeta } from "@/engine/content/types";

// Editor SQL (docs/03-design.md §2.3, §3.3): CodeMirror 6, autocomplete
// semua sheet chapter, Ctrl/Cmd+Enter menjalankan query.

export interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  tables: TableMeta[];
  editorRef?: React.Ref<ReactCodeMirrorRef>;
}

export function SqlEditor({ value, onChange, onRun, tables, editorRef }: SqlEditorProps) {
  // `onRun` via ref supaya keymap tidak perlu dibuat ulang setiap render
  // (yang akan mereset posisi kursor/histori CodeMirror), tapi tetap
  // memanggil handler TERBARU, bukan closure basi dari render pertama.
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const schema: SQLNamespace = useMemo(
    () => Object.fromEntries(tables.map((t) => [t.name, t.columns.map((c) => c.name)])),
    [tables]
  );

  const extensions = useMemo(
    () => [
      sql({ dialect: SQLite, schema, upperCaseKeywords: true }),
      // Pola "ref ke callback terbaru": run() di bawah hanya membaca
      // onRunRef.current saat CodeMirror memanggilnya (keypress Ctrl/Cmd+Enter),
      // bukan saat render/memo dihitung.
      // eslint-disable-next-line react-hooks/refs
      keymap.of([
        {
          key: "Mod-Enter",
          run: () => {
            onRunRef.current();
            return true;
          },
        },
      ]),
    ],
    [schema]
  );

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      height="240px"
      theme="dark"
      placeholder="-- Tulis query-mu di sini, lalu tekan Ctrl + Enter"
      extensions={extensions}
      onChange={onChange}
      basicSetup={{ tabSize: 2 }}
      className="font-mono text-sm"
    />
  );
}
