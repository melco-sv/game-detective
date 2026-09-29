/**
 * Deteksi konsep SQL dari teks query (tokenizer + pola, BUKAN parser penuh),
 * dipakai oleh validator `queryUses` (docs/02-arsitektur.md §6.3: "Deteksi
 * konsep untuk queryUses memakai tokenizer ditambah data authorizer").
 *
 * Ini heuristik yang sengaja sederhana. Beberapa konsep (mis.
 * `correlated-subquery`) sulit dideteksi tanpa parser penuh dan sengaja
 * tidak diautodeteksi; validator `queryUses` untuk konsep semacam itu
 * sebaiknya dipakai dengan `severity: 'suggest'`, bukan `'block'`.
 */
import type { SqlConcept } from "../content/types";
import { maskCommentsAndStrings } from "./tokenizer";

type Detector = (masked: string) => boolean;

const RE = {
  where: /\bwhere\b/i,
  orderBy: /\border\s+by\b/i,
  limit: /\blimit\b/i,
  distinct: /\bdistinct\b/i,
  like: /\blike\b/i,
  in: /\bin\b/i,
  between: /\bbetween\b/i,
  isNull: /\bis\s+(not\s+)?null\b/i,
  stringFn: /\b(substr|substring|upper|lower|length|trim|ltrim|rtrim|replace|instr|printf)\s*\(|\|\|/i,
  aggregate: /\b(count|sum|avg|min|max|group_concat|total)\s*\(/i,
  groupBy: /\bgroup\s+by\b/i,
  having: /\bhaving\b/i,
  join: /\bjoin\b/i,
  leftJoin: /\bleft\s+(outer\s+)?join\b/i,
  subquery: /\(\s*(select|with)\b/i,
  exists: /\b(not\s+)?exists\s*\(/i,
  setOps: /\b(union(\s+all)?|except|intersect)\b/i,
  caseWhen: /\bcase\b/i,
  dateTime: /\b(date|time|datetime|julianday|strftime)\s*\(|\bcurrent_(date|time|timestamp)\b/i,
  with: /\bwith\b/i,
  recursiveCte: /\bwith\s+recursive\b/i,
  window: /\bover\s*\(/i,
} as const;

/** FROM/JOIN <tabel> muncul lebih dari sekali (dengan alias berbeda) → indikasi self-join. */
function hasSelfJoin(masked: string): boolean {
  const seen = new Map<string, number>();
  const re = /\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(masked)) !== null) {
    const table = (match[1] ?? "").toLowerCase();
    seen.set(table, (seen.get(table) ?? 0) + 1);
  }
  return [...seen.values()].some((count) => count > 1);
}

const DETECTORS: Partial<Record<SqlConcept, Detector>> = {
  select: () => true, // guard sudah memastikan statement diawali SELECT/WITH/VALUES
  where: (m) => RE.where.test(m),
  "order-by": (m) => RE.orderBy.test(m),
  limit: (m) => RE.limit.test(m),
  distinct: (m) => RE.distinct.test(m),
  like: (m) => RE.like.test(m),
  in: (m) => RE.in.test(m),
  between: (m) => RE.between.test(m),
  null: (m) => RE.isNull.test(m),
  "string-fn": (m) => RE.stringFn.test(m),
  aggregate: (m) => RE.aggregate.test(m),
  "group-by": (m) => RE.groupBy.test(m),
  having: (m) => RE.having.test(m),
  join: (m) => RE.join.test(m),
  "left-join": (m) => RE.leftJoin.test(m),
  "self-join": (m) => RE.join.test(m) && hasSelfJoin(m),
  subquery: (m) => RE.subquery.test(m),
  exists: (m) => RE.exists.test(m),
  "set-ops": (m) => RE.setOps.test(m),
  case: (m) => RE.caseWhen.test(m),
  "date-time": (m) => RE.dateTime.test(m),
  cte: (m) => RE.with.test(m),
  "recursive-cte": (m) => RE.recursiveCte.test(m),
  window: (m) => RE.window.test(m),
  // 'correlated-subquery' sengaja tidak diautodeteksi (butuh analisis alias lintas scope).
};

export function detectConcepts(sql: string): Set<SqlConcept> {
  const masked = maskCommentsAndStrings(sql);
  const found = new Set<SqlConcept>();
  for (const [concept, detect] of Object.entries(DETECTORS) as [SqlConcept, Detector][]) {
    if (detect(masked)) found.add(concept);
  }
  return found;
}
