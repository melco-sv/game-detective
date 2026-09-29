/**
 * QueryGuard — lapisan pertahanan 1 dari 6 (docs/02-arsitektur.md §5.2).
 * Pemeriksaan teks di main thread, murni untuk UX (pesan ramah, cepat,
 * sebelum query dikirim ke Worker). Keamanan sesungguhnya ada di authorizer
 * SQLite (lapisan 2), karena `WITH x AS (...) DELETE ...` valid secara
 * sintaks SQLite meski lolos guard ini.
 */
import { DEFAULT_QUERY_LIMITS, type QueryLimits } from "./types";
import { firstKeyword, maskCommentsAndStrings, splitStatements } from "./tokenizer";

// §5.2: kata terlarang di luar string ditolak lebih awal dengan pesan ramah.
export const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "REPLACE",
  "DROP",
  "CREATE",
  "ALTER",
  "ATTACH",
  "DETACH",
  "PRAGMA",
  "VACUUM",
  "REINDEX",
  "ANALYZE",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "SAVEPOINT",
  "RELEASE",
  "EXPLAIN",
] as const;

// §5.2: kata pertama harus SELECT, WITH, atau VALUES.
export const ALLOWED_FIRST_KEYWORDS = ["SELECT", "WITH", "VALUES"] as const;

export type GuardErrorCode =
  | "EMPTY"
  | "TOO_LONG"
  | "MULTIPLE_STATEMENTS"
  | "NOT_READ_ONLY_START"
  | "FORBIDDEN_KEYWORD";

export interface GuardRejection {
  code: GuardErrorCode;
  message: string; // Bahasa Indonesia, ramah (P6)
  keyword?: string;
}

export type GuardResult = { ok: true } | { ok: false; rejection: GuardRejection };

function reject(code: GuardErrorCode, message: string, keyword?: string): GuardResult {
  return { ok: false, rejection: { code, message, keyword } };
}

export function checkQueryGuard(
  sql: string,
  limits: Pick<QueryLimits, "maxSqlLength"> = DEFAULT_QUERY_LIMITS
): GuardResult {
  const trimmed = sql.trim();
  if (trimmed.length === 0) {
    return reject("EMPTY", "Tulis query dulu, lalu tekan Ctrl + Enter.");
  }
  if (sql.length > limits.maxSqlLength) {
    return reject(
      "TOO_LONG",
      `Query-mu terlalu panjang (maks ${limits.maxSqlLength.toLocaleString("id-ID")} karakter).`
    );
  }

  const statements = splitStatements(trimmed);
  if (statements.length > 1) {
    return reject(
      "MULTIPLE_STATEMENTS",
      "Jalankan satu query saja setiap kali. Letakkan kursor di query yang ingin dijalankan."
    );
  }

  const masked = maskCommentsAndStrings(trimmed);
  const first = firstKeyword(masked);
  if (!(ALLOWED_FIRST_KEYWORDS as readonly string[]).includes(first)) {
    return reject(
      "NOT_READ_ONLY_START",
      "Detektif hanya boleh membaca barang bukti. Mulai query dengan SELECT atau WITH."
    );
  }

  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`, "i").test(masked)) {
      return reject(
        "FORBIDDEN_KEYWORD",
        `Kata "${keyword}" tidak diizinkan di sini. Detektif hanya boleh membaca data dengan SELECT.`,
        keyword
      );
    }
  }

  return { ok: true };
}
