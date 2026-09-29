/**
 * SqlErrorTranslator — bagian dari Asisten Otomatis (gratis, selalu aktif,
 * docs/02-arsitektur.md §5.5). Menerjemahkan pesan error SQLite mentah
 * menjadi pesan ramah berbahasa Indonesia, dengan saran nama terdekat
 * (Levenshtein) untuk sheet/kolom yang salah ketik. Pesan asli tetap bisa
 * dilihat lewat "Detail teknis" di UI (tidak dibuang di sini).
 */
import { closestMatch } from "@/lib/levenshtein";
import { FUNCTION_DIALECT_HINTS } from "./messages.id";

export interface TranslatorContext {
  tables: readonly string[]; // semua sheet chapter (untuk saran nama)
  columns: readonly string[]; // semua kolom chapter, gabungan seluruh sheet
}

export interface TranslatedError {
  message: string; // Bahasa Indonesia, ramah (P6)
  raw: string; // pesan asli mesin, untuk tombol "Detail teknis"
}

interface Rule {
  pattern: RegExp;
  build: (match: RegExpMatchArray, ctx: TranslatorContext) => string;
}

function bold(text: string): string {
  return `**${text}**`;
}

const RULES: Rule[] = [
  {
    pattern: /no such table:\s*(\S+)/i,
    build: (m, ctx) => {
      const name = (m[1] ?? "").replace(/^main\./, "");
      const suggestion = closestMatch(name, ctx.tables);
      const list = ctx.tables.length > 0 ? ` Sheet yang tersedia: ${ctx.tables.join(", ")}.` : "";
      const hint = suggestion ? ` Mungkin maksudmu ${bold(suggestion)}?` : "";
      return `Sheet ${bold(name)} tidak ada di berkas kasus ini.${list}${hint}`;
    },
  },
  {
    pattern: /no such column:\s*(\S+)/i,
    build: (m, ctx) => {
      const name = m[1] ?? "";
      const bareName = name.includes(".") ? (name.split(".").pop() ?? name) : name;
      const suggestion = closestMatch(bareName, ctx.columns);
      if (suggestion) {
        return `Kolom ${bold(name)} tidak ditemukan. Mungkin maksudmu ${bold(suggestion)}?`;
      }
      return `Kolom ${bold(name)} tidak ditemukan. Kalau itu teks, jangan lupa kutip tunggal: '${bareName}'.`;
    },
  },
  {
    pattern: /ambiguous column name:\s*(\S+)/i,
    build: (m) =>
      `Kolom ${bold(m[1] ?? "")} ada di lebih dari satu sheet. Tulis lengkap dengan alias, misalnya \`b.${m[1] ?? ""}\`.`,
  },
  {
    pattern: /near\s+"([^"]+)":\s*syntax error/i,
    build: (m) =>
      `Ada salah tulis di sekitar ${bold(m[1] ?? "")}. Cek koma, tanda kutip, dan urutan klausa: SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT.`,
  },
  {
    pattern: /incomplete input/i,
    build: () => "Query-mu belum selesai. Mungkin ada kurung atau tanda kutip yang belum ditutup.",
  },
  {
    pattern: /unrecognized token:\s*"([^"]+)"/i,
    build: (m) =>
      `Ada karakter yang tidak dikenali: ${bold(m[1] ?? "")}. Teks harus diapit kutip tunggal '…'.`,
  },
  {
    pattern: /no such function:\s*(\S+)/i,
    build: (m) => {
      const name = (m[1] ?? "").toLowerCase();
      const hint = FUNCTION_DIALECT_HINTS[name];
      const base = `Fungsi ${bold(m[1] ?? "")} tidak tersedia di SQLite.`;
      return hint ? `${base} Coba: ${hint}.` : `${base} Cek Buku Saku SQL untuk padanannya.`;
    },
  },
  {
    pattern: /misuse of aggregate (?:function\s*)?(\S+?)\(\)/i,
    build: (m) =>
      `Fungsi agregat ${bold(`${m[1] ?? ""}()`)} tidak boleh dipakai di WHERE. Gunakan HAVING setelah GROUP BY.`,
  },
  {
    pattern: /misuse of window function\s*(\S+?)\(\)/i,
    build: () =>
      "Window function hanya boleh di SELECT atau ORDER BY, bukan di WHERE. Bungkus dengan subquery atau CTE.",
  },
  {
    pattern: /sub-select returns (\d+) columns? - expected 1/i,
    build: (m) =>
      `Subquery di dalam \`IN (…)\` hanya boleh mengembalikan 1 kolom, tapi punyamu mengembalikan ${m[1] ?? "?"}.`,
  },
  {
    pattern: /SELECTs to the left and right of UNION do not have the same number of result columns/i,
    build: () => "Jumlah kolom di kedua sisi UNION harus sama.",
  },
  {
    pattern: /ORDER BY term out of range/i,
    build: () => "Nomor kolom di ORDER BY melebihi jumlah kolom hasil.",
  },
  {
    pattern: /circular reference:\s*(\S+)/i,
    build: (m) => `CTE ${bold(m[1] ?? "")} merujuk dirinya sendiri. Untuk itu, gunakan \`WITH RECURSIVE\`.`,
  },
  {
    pattern: /not authorized|access to .*sqlite_.* is prohibited/i,
    build: () => "Struktur tabel bisa dilihat di panel Sheet, bukan lewat query ke sqlite_master.",
  },
  {
    pattern: /attempt to write a readonly database|readonly database/i,
    build: () => "Detektif hanya boleh **membaca** barang bukti. Gunakan SELECT atau WITH.",
  },
];

/** Menerjemahkan pesan error SQLite mentah menjadi pesan ramah berbahasa Indonesia. */
export function translateSqlError(rawMessage: string, ctx: TranslatorContext): TranslatedError {
  for (const rule of RULES) {
    const match = rawMessage.match(rule.pattern);
    if (match) return { message: rule.build(match, ctx), raw: rawMessage };
  }
  return {
    message: `SQLite berkata: ${rawMessage}. Cek Buku Saku SQL untuk contoh sintaksnya.`,
    raw: rawMessage,
  };
}
