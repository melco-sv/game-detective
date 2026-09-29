/**
 * Tokenizer ringan (bukan parser SQL penuh) yang membuang isi komentar dan
 * literal string/identifier, sambil mempertahankan panjang teks supaya
 * offset karakter tetap valid. Dipakai oleh QueryGuard (§5.2 lapisan 1) dan
 * `statementAtCursor` untuk menentukan batas antar-statement dengan aman,
 * tanpa salah mendeteksi `;` di dalam string sebagai pemisah statement.
 *
 * Ini HANYA untuk UX (editor multi-query, pesan guard yang ramah). Keamanan
 * sesungguhnya ada di authorizer SQLite di Worker (§5.2 lapisan 2-5), karena
 * `WITH x AS (...) DELETE ...` valid secara sintaks SQLite.
 */

/** Ganti rentang [start, end) dengan spasi, mempertahankan panjang string. */
function blank(out: string[], start: number, end: number): void {
  for (let i = start; i < end; i++) out[i] = " ";
}

/**
 * Mengembalikan salinan `sql` dengan sepanjang komentar (`-- ...`, `/* ... *\/`)
 * dan literal (string `'...'`, identifier berkutip ganda `"..."`) diganti
 * spasi. Panjang string tidak berubah, sehingga index karakter tetap sama
 * dengan `sql` asli.
 */
export function maskCommentsAndStrings(sql: string): string {
  const out = sql.split("");
  const n = sql.length;
  let i = 0;
  while (i < n) {
    const c = sql[i];
    const next = sql[i + 1];

    if (c === "-" && next === "-") {
      let j = i;
      while (j < n && sql[j] !== "\n") j++;
      blank(out, i, j);
      i = j;
      continue;
    }

    if (c === "/" && next === "*") {
      let j = i + 2;
      while (j < n && !(sql[j] === "*" && sql[j + 1] === "/")) j++;
      j = Math.min(j + 2, n);
      blank(out, i, j);
      i = j;
      continue;
    }

    if (c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) {
            j += 2; // kutip ganda literal ('' di dalam string) berarti satu kutip
            continue;
          }
          j += 1;
          break;
        }
        j++;
      }
      blank(out, i, j);
      i = j;
      continue;
    }

    i++;
  }
  return out.join("");
}

export interface StatementSpan {
  text: string; // teks statement APA ADANYA (belum di-mask), sudah di-trim
  start: number; // offset di teks asli (sebelum trim)
  end: number; // offset akhir (eksklusif), sebelum ';' pemisah
}

/**
 * Memecah teks editor menjadi beberapa statement berdasarkan `;` di level
 * atas (bukan di dalam string/komentar). Statement kosong (hanya spasi)
 * dibuang.
 */
export function splitStatements(sql: string): StatementSpan[] {
  const masked = maskCommentsAndStrings(sql);
  const spans: StatementSpan[] = [];
  let start = 0;
  for (let i = 0; i < masked.length; i++) {
    if (masked[i] === ";") {
      spans.push({ text: sql.slice(start, i), start, end: i });
      start = i + 1;
    }
  }
  if (start <= sql.length) {
    spans.push({ text: sql.slice(start), start, end: sql.length });
  }
  return spans.filter((s) => s.text.trim().length > 0);
}

/** Kata pertama non-spasi dari teks yang sudah di-mask, huruf besar semua. */
export function firstKeyword(maskedSql: string): string {
  const match = maskedSql.trimStart().match(/^[A-Za-z_][A-Za-z0-9_]*/);
  return (match?.[0] ?? "").toUpperCase();
}
