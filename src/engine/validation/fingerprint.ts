/**
 * Fingerprint hasil query: SHA-256 dari string kanonik, digarami per
 * chapter dan diberi `stepId` supaya fingerprint tidak bisa dipakai lintas
 * step (docs/02-arsitektur.md §6.2). Dihitung di Worker (dekat data);
 * dibandingkan di ValidationService, yang bisa diganti versi server (v1).
 */
import { sha256Hex } from "@/lib/sha256";
import type { Cell, FingerprintSpec, ResultColumn, ResultFingerprints } from "../sql/types";
import { canonicalColumn, canonicalResult } from "./canonical";

export const fingerprintOf = (salt: string, stepId: string, canonical: string): Promise<string> =>
  sha256Hex(`${salt}|${stepId}|${canonical}`);

export type { FingerprintSpec };

/**
 * Menghitung fingerprint hasil query pemain: `ordered` sesuai opsi validator
 * (dipakai `resultEquals`), `unordered` tambahan bila `rowOrder === 'exact'`
 * (untuk diagnosis "barisnya benar, urutannya belum"), dan `perColumn`
 * untuk setiap kolom hasil (dipakai `keyColumn`, dua varian `set`/`multiset`
 * per kolom, masing-masing dengan dan tanpa NULL).
 */
export async function computeFingerprints(
  columns: ResultColumn[],
  rows: Cell[][],
  spec: FingerprintSpec
): Promise<ResultFingerprints> {
  const names = columns.map((c) => c.name);
  const canonical = canonicalResult(names, rows, spec.options);
  const ordered = await fingerprintOf(spec.salt, spec.stepId, canonical);

  let unordered: string | undefined;
  if (spec.options.rowOrder === "exact") {
    const unorderedCanonical = canonicalResult(names, rows, { ...spec.options, rowOrder: "any" });
    unordered = await fingerprintOf(spec.salt, spec.stepId, unorderedCanonical);
  }

  const perColumn: Record<string, string> = {};
  const columnOptions = {
    caseSensitive: spec.options.caseSensitive,
    trimText: spec.options.trimText,
    decimals: spec.options.decimals,
  };
  for (let j = 0; j < names.length; j++) {
    const values = rows.map((row) => row[j] ?? null);
    for (const compare of ["set", "multiset"] as const) {
      for (const ignoreNulls of [true, false]) {
        const key = `${names[j]}|${compare}|${ignoreNulls ? "no-null" : "with-null"}`;
        const canon = canonicalColumn(values, columnOptions, compare, ignoreNulls);
        perColumn[key] = await fingerprintOf(spec.salt, spec.stepId, canon);
      }
    }
  }

  return { ordered, unordered, perColumn };
}

/** Kunci `perColumn` untuk validator `keyColumn` (lihat computeFingerprints). */
export function keyColumnFingerprintKey(
  columnName: string,
  compare: "set" | "multiset",
  ignoreNulls: boolean
): string {
  return `${columnName}|${compare}|${ignoreNulls ? "no-null" : "with-null"}`;
}
