/**
 * Diagnosis hasil — bagian dari Asisten Otomatis, dijalankan otomatis
 * setiap kali query sukses tapi belum lolos validator (gratis, tidak
 * mengurangi skor, docs/02-arsitektur.md §6.4). Urutan pemeriksaan mengikuti
 * urutan di dokumen: jebakan -> urutan saja salah -> jumlah baris -> jumlah
 * kolom -> sheet belum disentuh -> peringatan umum -> pesan default.
 */
import type { CompiledStep } from "../content/manifest";
import type { ResultFingerprints } from "../sql/types";
import type { RunMeta } from "../validation/types";

export interface DiagnosisInput {
  step: CompiledStep;
  fp: ResultFingerprints;
  columnCount: number;
  rowCount: number; // totalRows dari RunResult
  meta: RunMeta;
  orderOnlyWrong?: boolean; // dari StepVerdict (resultEquals dengan rowOrder 'exact')
}

function formatCount(n: number): string {
  return n.toLocaleString("id-ID");
}

export function diagnoseWrongResult(input: DiagnosisInput): string {
  const { step, fp, columnCount, rowCount, meta, orderOnlyWrong } = input;

  // 1. Jebakan yang diantisipasi (mistakes ditulis penulis konten)
  const mistake = step.feedback.mistakes.find((m) => m.fingerprint === fp.ordered);
  if (mistake) return mistake.message;

  // 2. Urutan saja yang salah
  if (orderOnlyWrong) return "Barisnya sudah benar, urutannya belum.";

  // 3. Jumlah baris
  if (step.feedback.rowCount !== "none" && step.feedback.expectedRows !== undefined) {
    const expected = step.feedback.expectedRows;
    if (step.feedback.rowCount === "exact") {
      if (rowCount !== expected) {
        return `Hasilmu ${formatCount(rowCount)} baris, targetnya tepat ${formatCount(expected)} baris.`;
      }
    } else if (rowCount > expected * 1.3) {
      return `Hasilmu ${formatCount(rowCount)} baris; target jauh lebih sedikit.`;
    } else if (rowCount > expected) {
      return `Hasilmu ${formatCount(rowCount)} baris; targetnya sedikit lebih sedikit.`;
    } else if (rowCount < expected) {
      return `Hasilmu ${formatCount(rowCount)} baris; targetnya lebih banyak.`;
    }
  }

  // 4. Jumlah kolom
  if (step.feedback.expectedColumns !== undefined && columnCount !== step.feedback.expectedColumns) {
    return `Hasilmu ${columnCount} kolom, seharusnya ${step.feedback.expectedColumns}.`;
  }

  // 5. Sheet yang belum disentuh (authorizer vs relatedTables)
  const untouched = step.relatedTables.filter((t) => !meta.tablesRead.includes(t));
  if (untouched.length > 0) {
    return `Kamu belum memakai sheet \`${untouched[0]}\`.`;
  }

  // 6. Peringatan umum
  if (rowCount === 0) {
    return "Hasilnya kosong. Ingat, teks harus persis sama; coba LIKE, atau periksa lagi ejaan nilainya.";
  }
  if (/=\s*null\b/i.test(meta.sql)) {
    return "`= NULL` tidak pernah cocok di SQL. Gunakan `IS NULL`.";
  }

  // 7. Default
  return "Belum tepat. Periksa lagi syarat di tujuan langkah ini.";
}
