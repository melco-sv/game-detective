/** Padanan fungsi dialek lain -> SQLite, dipakai SqlErrorTranslator (§5.5) dan Buku Saku (§K2). */
export const FUNCTION_DIALECT_HINTS: Record<string, string> = {
  now: "datetime('now')",
  getdate: "datetime('now')",
  year: "strftime('%Y', kolom)",
  month: "strftime('%m', kolom)",
  day: "strftime('%d', kolom)",
  extract: "strftime('%Y'/'%m'/'%d'/'%H', kolom)",
  date_format: "strftime(format, kolom)",
  len: "length(teks)",
  isnull: "IFNULL(kolom, nilai) atau COALESCE(kolom, nilai)",
  nvl: "IFNULL(kolom, nilai) atau COALESCE(kolom, nilai)",
  ilike: "LIKE (di SQLite, LIKE sudah tidak peka huruf besar-kecil untuk huruf ASCII)",
  concat: "kolom1 || kolom2 (operator gabung teks)",
  curdate: "date('now')",
  current_timestamp_ms: "strftime('%Y-%m-%d %H:%M:%f', 'now')",
};
