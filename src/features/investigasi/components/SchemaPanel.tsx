"use client";

import type { TableMeta } from "@/engine/content/types";

// Panel Skema/Sheet (docs/03-design.md §3.7): semua sheet terbuka sejak awal (A5).

export interface SchemaPanelProps {
  tables: TableMeta[];
  onInsertName: (name: string) => void;
}

export function SchemaPanel({ tables, onInsertName }: SchemaPanelProps) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Skema</h2>
      <p className="text-xs text-text-muted">{tables.length} sheet tersedia untuk bab ini.</p>

      {tables.map((table) => (
        <details key={table.name} className="rounded-md border border-border-subtle bg-surface-2" open>
          <summary className="cursor-pointer select-none px-3 py-2 font-mono text-sm text-text-primary">
            {table.name} <span className="ml-1 text-xs text-text-muted">&mdash; {table.description}</span>
          </summary>
          <ul className="border-t border-border-subtle px-3 py-2">
            {table.columns.map((col) => (
              <li key={col.name} className="flex items-center justify-between py-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => onInsertName(col.name)}
                  className="text-text-primary hover:text-primary"
                  title="Sisipkan ke editor"
                >
                  {col.name}
                  {col.key ? <span className="ml-1 text-hint">{col.key}</span> : null}
                </button>
                <span className="text-text-muted">{col.type}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
