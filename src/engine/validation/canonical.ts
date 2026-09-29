/**
 * Kanonisasi hasil query — dasar dari validasi berbasis hasil, bukan teks
 * query (docs/02-arsitektur.md §6.1-6.2). Dua query berbeda bentuk (BETWEEN
 * vs >=/<=, JOIN vs subquery, alias berbeda) yang mengembalikan data yang
 * "sama" secara semantik harus menghasilkan string kanonik yang identik.
 */
import type { Cell } from "../sql/types";
import type { NormalizeOptions } from "../content/types";
import { bytesToHex } from "@/lib/sha256";

// Hanya teks angka yang "aman" yang disamakan dengan angka: tanpa nol di
// depan & <= 15 digit. NIK (16 digit, di atas 2^53), nomor HP ('0812...'),
// dan jam ('21:38') tetap diperlakukan sebagai teks.
const SAFE_NUMERIC = /^-?(0|[1-9]\d{0,14})(\.\d+)?$/;

export const NULL_MARKER = "␀"; // ␀

function cmp(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normNumber(value: number | bigint, decimals: number): string {
  if (typeof value === "bigint") return value.toString();
  if (Number.isNaN(value)) return "NaN";
  if (!Number.isFinite(value)) return value > 0 ? "Infinity" : "-Infinity";
  const places = Math.max(0, Math.min(decimals, 100));
  let fixed = value.toFixed(places);
  if (fixed.includes(".")) {
    fixed = fixed.replace(/0+$/, "").replace(/\.$/, "");
  }
  return fixed === "-0" ? "0" : fixed;
}

/** Satu sel hasil query -> representasi teks kanonik, sesuai opsi normalisasi. */
export function normCell(value: Cell, options: NormalizeOptions): string {
  if (value === null || value === undefined) return NULL_MARKER;
  if (value instanceof Uint8Array) return "x" + bytesToHex(value);

  let v: Cell = value;
  if (typeof v === "string" && SAFE_NUMERIC.test(v.trim())) {
    v = Number(v);
  }
  if (typeof v === "number" || typeof v === "bigint") {
    return normNumber(v, options.decimals);
  }

  let s = (v as string).normalize("NFC");
  if (options.trimText) s = s.trim();
  if (!options.caseSensitive) s = s.toLocaleLowerCase("id-ID");
  return s;
}

export interface CanonicalPayload {
  n: number; // jumlah kolom
  c?: string[]; // nama kolom, hanya bila columnNames === 'exact'
  r: string[][]; // baris, setiap sel sudah dinormalisasi
}

/**
 * Kanonisasi hasil query lengkap (untuk validator `resultEquals`).
 * `columnOrder`/`rowOrder` 'any' membuat susunan kolom/baris tidak relevan;
 * 'exact' mempertahankan susunan apa adanya dari hasil query.
 */
export function canonicalResult(
  columnNames: string[],
  rows: Cell[][],
  options: NormalizeOptions
): string {
  let names = columnNames.map((c) => c.toLowerCase());
  let data = rows.map((row) => row.map((v) => normCell(v, options)));

  if (options.columnOrder === "any") {
    const signature = (j: number): string => {
      const prefix = options.columnNames === "exact" ? names[j] + "\u0001" : "";
      const values = data
        .map((row) => row[j] ?? "")
        .slice()
        .sort(cmp)
        .join("\u0002");
      return prefix + values;
    };
    const order = names.map((_, j) => j).sort((a, b) => cmp(signature(a), signature(b)));
    names = order.map((j) => names[j] ?? "");
    data = data.map((row) => order.map((j) => row[j] ?? ""));
  }

  if (options.rowOrder === "any") {
    data = data.slice().sort((a, b) => cmp(JSON.stringify(a), JSON.stringify(b)));
  }

  const payload: CanonicalPayload = {
    n: names.length,
    ...(options.columnNames === "exact" ? { c: names } : {}),
    r: data,
  };
  return JSON.stringify(payload);
}

/**
 * Kanonisasi SATU kolom hasil (untuk validator `keyColumn`): himpunan atau
 * multiset nilai satu kolom, terlepas dari kolom lain dan urutan baris.
 */
export function canonicalColumn(
  values: Cell[],
  options: Pick<NormalizeOptions, "caseSensitive" | "trimText" | "decimals">,
  compare: "set" | "multiset" = "set",
  ignoreNulls = true
): string {
  const full: NormalizeOptions = {
    rowOrder: "any",
    columnOrder: "any",
    columnNames: "ignore",
    ...options,
  };
  let normalized = values.map((v) => normCell(v, full));
  if (ignoreNulls) normalized = normalized.filter((v) => v !== NULL_MARKER);
  if (compare === "set") normalized = Array.from(new Set(normalized));
  normalized.sort(cmp);
  return JSON.stringify(normalized);
}
