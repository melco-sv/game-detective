import { describe, expect, it } from "vitest";
import { translateSqlError } from "@/engine/assistant/error-translator";

const CTX = {
  tables: ["penduduk", "kartu_akses", "log_akses_dapur"],
  columns: ["nik", "nama", "nik_pemilik", "id_kartu", "waktu"],
};

describe("translateSqlError", () => {
  it("no such table: menyertakan nama dan sheet yang tersedia", () => {
    const result = translateSqlError("no such table: pendudk", CTX);
    expect(result.message).toContain("pendudk");
    expect(result.message).toContain("penduduk"); // saran terdekat
  });

  it("no such column: menyarankan nama kolom terdekat", () => {
    const result = translateSqlError("no such column: nma", CTX);
    expect(result.message).toContain("nma");
    expect(result.message).toContain("nama");
  });

  it("no such column tanpa kandidat dekat menyarankan kutip tunggal", () => {
    const result = translateSqlError("no such column: xyzxyzxyz", CTX);
    expect(result.message).toContain("kutip tunggal");
  });

  it("ambiguous column name", () => {
    const result = translateSqlError("ambiguous column name: nik", CTX);
    expect(result.message).toContain("nik");
    expect(result.message).toContain("alias");
  });

  it("near ... syntax error menyebutkan urutan klausa", () => {
    const result = translateSqlError('near "FORM": syntax error', CTX);
    expect(result.message).toContain("FORM");
    expect(result.message).toContain("SELECT");
  });

  it("incomplete input", () => {
    const result = translateSqlError("incomplete input", CTX);
    expect(result.message).toMatch(/belum selesai/i);
  });

  it("no such function menyertakan padanan dialek bila dikenal", () => {
    const result = translateSqlError("no such function: YEAR", CTX);
    expect(result.message).toContain("YEAR");
    expect(result.message).toContain("strftime");
  });

  it("misuse of aggregate function", () => {
    const result = translateSqlError("misuse of aggregate function COUNT()", CTX);
    expect(result.message).toContain("HAVING");
  });

  it("misuse of window function", () => {
    const result = translateSqlError("misuse of window function ROW_NUMBER()", CTX);
    expect(result.message).toMatch(/window function/i);
  });

  it("sub-select returns N columns", () => {
    const result = translateSqlError("sub-select returns 3 columns - expected 1", CTX);
    expect(result.message).toContain("3");
  });

  it("UNION jumlah kolom tidak sama", () => {
    const result = translateSqlError(
      "SELECTs to the left and right of UNION do not have the same number of result columns",
      CTX
    );
    expect(result.message).toMatch(/UNION/);
  });

  it("readonly database -> pesan 'hanya boleh membaca'", () => {
    const result = translateSqlError("attempt to write a readonly database", CTX);
    expect(result.message).toMatch(/membaca/i);
  });

  it("pesan tidak dikenal jatuh ke default, tetap menyertakan pesan asli", () => {
    const result = translateSqlError("some obscure sqlite internal error xyz", CTX);
    expect(result.message).toContain("xyz");
  });

  it("selalu menyertakan pesan mentah untuk 'Detail teknis'", () => {
    const result = translateSqlError("no such table: x", CTX);
    expect(result.raw).toBe("no such table: x");
  });
});
