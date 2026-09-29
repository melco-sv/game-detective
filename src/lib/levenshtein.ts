/**
 * Jarak Levenshtein sederhana, dipakai Asisten Otomatis untuk menyarankan
 * nama sheet/kolom terdekat saat pemain salah ketik (docs/02-arsitektur.md
 * §5.5: "Mungkin maksudmu Y?").
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  let currRow = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    currRow[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        (prevRow[j] ?? 0) + 1, // hapus
        (currRow[j - 1] ?? 0) + 1, // sisip
        (prevRow[j - 1] ?? 0) + cost // ganti
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }
  return prevRow[b.length] ?? 0;
}

/**
 * Kandidat terdekat dari `input` di antara `candidates`, atau `undefined`
 * bila tidak ada yang cukup dekat. `maxDistance` default longgar untuk kata
 * pendek (nama kolom/tabel biasanya singkat).
 */
export function closestMatch(
  input: string,
  candidates: readonly string[],
  maxDistance = 3
): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  const needle = input.toLowerCase();
  for (const candidate of candidates) {
    const distance = levenshteinDistance(needle, candidate.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return bestDistance <= maxDistance ? best : undefined;
}
