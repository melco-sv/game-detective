import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { canonicalColumn, canonicalResult, normCell } from "@/engine/validation/canonical";
import { fingerprintOf } from "@/engine/validation/fingerprint";
import { DEFAULT_NORMALIZE_OPTIONS } from "@/engine/content/types";
import type { NormalizeOptions } from "@/engine/content/types";

const OPTS_ANY_ANY: NormalizeOptions = { ...DEFAULT_NORMALIZE_OPTIONS };
const OPTS_EXACT: NormalizeOptions = {
  ...DEFAULT_NORMALIZE_OPTIONS,
  rowOrder: "exact",
  columnOrder: "exact",
};

describe("normCell", () => {
  it("null menjadi penanda NULL", () => {
    expect(normCell(null, OPTS_ANY_ANY)).toBe("␀");
  });

  it("angka dengan trailing zero disamakan (3.0 === 3)", () => {
    expect(normCell(3.0, OPTS_ANY_ANY)).toBe(normCell(3, OPTS_ANY_ANY));
  });

  it("teks angka aman disamakan dengan angka ('75000000' === 75000000)", () => {
    expect(normCell("75000000", OPTS_ANY_ANY)).toBe(normCell(75000000, OPTS_ANY_ANY));
  });

  it("NIK 16 digit TIDAK disamakan dengan angka (di atas 2^53, tetap teks)", () => {
    const nik = "3271021504920004";
    expect(normCell(nik, OPTS_ANY_ANY)).toBe("3271021504920004");
  });

  it("angka dengan nol di depan tetap teks ('0812...')", () => {
    expect(normCell("0812345678", OPTS_ANY_ANY)).toBe("0812345678");
  });

  it("tidak peka huruf besar-kecil secara default", () => {
    expect(normCell("Budi Santoso", OPTS_ANY_ANY)).toBe(normCell("budi santoso", OPTS_ANY_ANY));
  });

  it("peka huruf besar-kecil bila caseSensitive true", () => {
    const opts = { ...OPTS_ANY_ANY, caseSensitive: true };
    expect(normCell("Budi", opts)).not.toBe(normCell("budi", opts));
  });

  it("trim spasi secara default", () => {
    expect(normCell("  budi  ", OPTS_ANY_ANY)).toBe(normCell("budi", OPTS_ANY_ANY));
  });
});

describe("canonicalResult", () => {
  it("hasil identik menghasilkan string kanonik identik", () => {
    const cols = ["nama", "jam"];
    const rows = [
      ["Wulan", "22:15"],
      ["Ratna", "23:05"],
    ];
    expect(canonicalResult(cols, rows, OPTS_ANY_ANY)).toBe(canonicalResult(cols, rows, OPTS_ANY_ANY));
  });

  it("rowOrder 'any': urutan baris tidak memengaruhi hasil", () => {
    const cols = ["nama"];
    const a = canonicalResult(cols, [["Wulan"], ["Ratna"]], OPTS_ANY_ANY);
    const b = canonicalResult(cols, [["Ratna"], ["Wulan"]], OPTS_ANY_ANY);
    expect(a).toBe(b);
  });

  it("rowOrder 'exact': urutan baris memengaruhi hasil", () => {
    const cols = ["nama"];
    const a = canonicalResult(cols, [["Wulan"], ["Ratna"]], OPTS_EXACT);
    const b = canonicalResult(cols, [["Ratna"], ["Wulan"]], OPTS_EXACT);
    expect(a).not.toBe(b);
  });

  it("columnOrder 'any': urutan kolom tidak memengaruhi hasil", () => {
    const a = canonicalResult(["nama", "peran"], [["Wulan", "Panitia"]], OPTS_ANY_ANY);
    const b = canonicalResult(["peran", "nama"], [["Panitia", "Wulan"]], OPTS_ANY_ANY);
    expect(a).toBe(b);
  });

  it("mengubah satu nilai mengubah hasil kanonik", () => {
    const cols = ["nama"];
    const a = canonicalResult(cols, [["Wulan"]], OPTS_ANY_ANY);
    const b = canonicalResult(cols, [["Budi"]], OPTS_ANY_ANY);
    expect(a).not.toBe(b);
  });

  it("kapitalisasi berbeda menghasilkan kanonik sama (case-insensitive default)", () => {
    const cols = ["nama"];
    const a = canonicalResult(cols, [["WULAN"]], OPTS_ANY_ANY);
    const b = canonicalResult(cols, [["wulan"]], OPTS_ANY_ANY);
    expect(a).toBe(b);
  });
});

describe("canonicalResult — uji properti (fast-check)", () => {
  const cellArb = fc.oneof(
    fc.string({ minLength: 0, maxLength: 12 }),
    fc.integer({ min: -1000, max: 1000 }),
    fc.constant(null)
  );
  const rowArb = fc.array(cellArb, { minLength: 1, maxLength: 3 });
  const rowsArb = fc.array(rowArb, { minLength: 1, maxLength: 6 }).filter((rows) => {
    const width = rows[0]?.length ?? 0;
    return rows.every((r) => r.length === width);
  });

  it("mengacak urutan baris tidak mengubah kanonik saat rowOrder 'any'", () => {
    fc.assert(
      fc.property(rowsArb, (rows) => {
        const cols = rows[0]!.map((_, i) => `c${i}`);
        const shuffled = [...rows].reverse();
        const a = canonicalResult(cols, rows, OPTS_ANY_ANY);
        const b = canonicalResult(cols, shuffled, OPTS_ANY_ANY);
        expect(a).toBe(b);
      })
    );
  });

  it("mengubah satu sel pada baris pertama mengubah kanonik (kasus non-degenerate)", () => {
    fc.assert(
      fc.property(rowsArb, (rows) => {
        const cols = rows[0]!.map((_, i) => `c${i}`);
        const mutated = rows.map((r, i) => (i === 0 ? [...r.slice(0, -1), "___tanda_unik___"] : r));
        const a = canonicalResult(cols, rows, OPTS_EXACT);
        const b = canonicalResult(cols, mutated, OPTS_EXACT);
        // Hanya bandingkan bila baris pertama benar-benar berubah dan tidak
        // ada baris lain yang identik (yang bisa membuat multiset tetap sama
        // pada mode 'any'; di sini pakai OPTS_EXACT jadi urutan tetap).
        if (JSON.stringify(rows[0]) !== JSON.stringify(mutated[0])) {
          expect(a).not.toBe(b);
        }
      })
    );
  });
});

describe("fingerprintOf", () => {
  it("deterministik: input sama menghasilkan hash sama", async () => {
    const a = await fingerprintOf("salt1", "step1", "canonical-x");
    const b = await fingerprintOf("salt1", "step1", "canonical-x");
    expect(a).toBe(b);
  });

  it("salt berbeda menghasilkan hash berbeda (fingerprint tidak bisa ditebak lintas chapter)", async () => {
    const a = await fingerprintOf("salt1", "step1", "canonical-x");
    const b = await fingerprintOf("salt2", "step1", "canonical-x");
    expect(a).not.toBe(b);
  });

  it("stepId berbeda menghasilkan hash berbeda (fingerprint tidak bisa dipakai lintas step)", async () => {
    const a = await fingerprintOf("salt1", "step1", "canonical-x");
    const b = await fingerprintOf("salt1", "step2", "canonical-x");
    expect(a).not.toBe(b);
  });

  it("menghasilkan string hex 64 karakter (SHA-256)", async () => {
    const hash = await fingerprintOf("s", "x", "y");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("canonicalColumn (keyColumn)", () => {
  const colOpts = { caseSensitive: false, trimText: true, decimals: 6 };

  it("mode 'set': duplikat dibuang", () => {
    const withDup = canonicalColumn(["Wulan", "Wulan", "Ratna"], colOpts, "set");
    const noDup = canonicalColumn(["Wulan", "Ratna"], colOpts, "set");
    expect(withDup).toBe(noDup);
  });

  it("mode 'multiset': duplikat dipertahankan (jumlah berbeda menghasilkan kanonik berbeda)", () => {
    const withDup = canonicalColumn(["Wulan", "Wulan", "Ratna"], colOpts, "multiset");
    const noDup = canonicalColumn(["Wulan", "Ratna"], colOpts, "multiset");
    expect(withDup).not.toBe(noDup);
  });

  it("ignoreNulls membuang NULL dari perbandingan", () => {
    const withNull = canonicalColumn(["Wulan", null], colOpts, "set", true);
    const withoutNull = canonicalColumn(["Wulan"], colOpts, "set", true);
    expect(withNull).toBe(withoutNull);
  });

  it("urutan input tidak memengaruhi hasil (selalu diurutkan)", () => {
    const a = canonicalColumn(["Wulan", "Ratna"], colOpts, "set");
    const b = canonicalColumn(["Ratna", "Wulan"], colOpts, "set");
    expect(a).toBe(b);
  });
});
