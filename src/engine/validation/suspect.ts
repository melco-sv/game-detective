/**
 * Validasi tersangka (laporan polisi, A4 + A6 + B2 + B7). Docs/02-arsitektur.md
 * §6.5. Fungsi murni, hanya bergantung pada `CompiledReport` (bukan seluruh
 * `ChapterManifest`) supaya mudah diuji terpisah.
 */
import { sha256Hex } from "@/lib/sha256";
import type { CompiledReport } from "../content/manifest";
import type { SuspectVerdict } from "./types";

const HONORIFICS = /\b(bapak|bpk|pak|ibu|bu|sdr|sdri|saudara|saudari|tuan|nyonya|ny)\b/g;

/** Menormalkan nama untuk pencocokan: tanpa diakritik, huruf kecil, tanpa sapaan/tanda baca. */
export function normalizeName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // buang diakritik
    .toLocaleLowerCase("id-ID")
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // tanda baca -> spasi
    .replace(HONORIFICS, " ") // sapaan umum
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hash nama tersangka bergaram per chapter. Dipakai di sini (runtime) dan
 * oleh `scripts/build-content.ts` (build time, untuk menghasilkan
 * `CompiledReport.suspects[].hashes`) — HARUS tetap sinkron.
 */
export const hashSuspectName = (chapterId: string, normalizedName: string): Promise<string> =>
  sha256Hex(`detektif-sql|${chapterId}|tersangka|${normalizedName}`);

/** Semua permutasi dari array indeks lokal 0..n-1 (n kecil, <= 3 slot per grup). */
function permutationsOf(indices: number[]): number[][] {
  if (indices.length <= 1) return [indices];
  const result: number[][] = [];
  for (let i = 0; i < indices.length; i++) {
    const rest = [...indices.slice(0, i), ...indices.slice(i + 1)];
    for (const tail of permutationsOf(rest)) {
      result.push([indices[i] as number, ...tail]);
    }
  }
  return result;
}

/**
 * Untuk satu grup slot yang saling dipertukarkan: cari apakah ada
 * pencocokan sempurna (bijeksi posisi -> slot di mana hash posisi ada di
 * `hashes` slot itu). Bila ada, grup sepenuhnya benar (`[]`). Bila tidak,
 * kembalikan posisi (indeks di `slots` keseluruhan) yang dianggap salah.
 */
function unmatchedInGroup(
  positions: number[],
  slots: CompiledReport["suspects"],
  hashes: string[]
): number[] {
  const groupSlots = positions.map((i) => slots[i] as CompiledReport["suspects"][number]);
  const local = positions.map((_, k) => k);

  for (const perm of permutationsOf(local)) {
    const isPerfectMatch = perm.every((slotLocalIdx, posLocalIdx) => {
      const slot = groupSlots[slotLocalIdx] as CompiledReport["suspects"][number];
      const hash = hashes[positions[posLocalIdx] as number] as string;
      return slot.hashes.includes(hash);
    });
    if (isPerfectMatch) return [];
  }

  const matchesSomeSlotInGroup = (pos: number) =>
    groupSlots.some((slot) => slot.hashes.includes(hashes[pos] as string));
  const clearlyWrong = positions.filter((pos) => !matchesSomeSlotInGroup(pos));
  return clearlyWrong.length > 0 ? clearlyWrong : positions;
}

/**
 * Bab 1-7: 1 slot. Bab 8: 'dalang' (tanpa group -> posisi tetap) +
 * 'perantara-1/2' (group -> boleh tertukar). Formulir sudah menolak field
 * kosong & nama ganda sebelum fungsi ini dipanggil (§6.5).
 */
export async function verifySuspectsLocal(
  chapterId: string,
  report: CompiledReport,
  inputs: string[]
): Promise<SuspectVerdict> {
  const slots = report.suspects;
  if (inputs.length !== slots.length) {
    throw new Error("jumlah input harus sama dengan jumlah slot");
  }
  const hashes = await Promise.all(
    inputs.map((input) => hashSuspectName(chapterId, normalizeName(input)))
  );

  const wrong: number[] = [];
  slots.forEach((slot, i) => {
    if (!slot.group && !slot.hashes.includes(hashes[i] as string)) wrong.push(i);
  });

  const groups = new Set(slots.flatMap((s) => (s.group ? [s.group] : [])));
  for (const group of groups) {
    const positions = slots.flatMap((s, i) => (s.group === group ? [i] : []));
    wrong.push(...unmatchedInGroup(positions, slots, hashes));
  }

  if (wrong.length === 0) return { correct: true };

  // Nama yang dibahas di salah ke-2 dipilih deterministik dari hash SELURUH
  // input, bukan dari urutan slot, supaya catatan tentang seorang Perantara
  // tidak membocorkan bahwa Dalang sudah benar.
  const seedHex = (await sha256Hex(hashes.join("|"))).slice(0, 8);
  const seed = parseInt(seedHex, 16);
  const i = wrong[seed % wrong.length] as number;
  const h = hashes[i] as string;
  const involvedElsewhere = slots.some((s, k) => k !== i && s.hashes.includes(h));

  const slotId = (slots[i] as CompiledReport["suspects"][number]).id;
  const wrongNote =
    report.wrongNotes[`${slotId}|${h}`] ??
    (involvedElsewhere ? report.misplacedNote : undefined) ??
    report.wrongNotes[h] ??
    report.defaultWrongNote;

  return { correct: false, wrongNote };
}
