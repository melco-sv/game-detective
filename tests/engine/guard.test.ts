import { describe, expect, it } from "vitest";
import { checkQueryGuard } from "@/engine/sql/guard";
import { splitStatements } from "@/engine/sql/tokenizer";
import { statementAtCursor } from "@/engine/sql/statement-at-cursor";

describe("checkQueryGuard", () => {
  it("menerima SELECT sederhana", () => {
    expect(checkQueryGuard("SELECT * FROM penduduk")).toEqual({ ok: true });
  });

  it("menerima WITH (CTE)", () => {
    const result = checkQueryGuard("WITH x AS (SELECT 1) SELECT * FROM x");
    expect(result.ok).toBe(true);
  });

  it("menerima VALUES", () => {
    expect(checkQueryGuard("VALUES (1), (2)").ok).toBe(true);
  });

  it("menolak query kosong", () => {
    const result = checkQueryGuard("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rejection.code).toBe("EMPTY");
  });

  it("menolak query yang terlalu panjang", () => {
    const long = "SELECT " + "1,".repeat(3000) + "1";
    const result = checkQueryGuard(long, { maxSqlLength: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rejection.code).toBe("TOO_LONG");
  });

  it("menolak lebih dari satu statement", () => {
    const result = checkQueryGuard("SELECT 1; SELECT 2;");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rejection.code).toBe("MULTIPLE_STATEMENTS");
  });

  it("mengizinkan titik koma tunggal di akhir", () => {
    expect(checkQueryGuard("SELECT 1;").ok).toBe(true);
  });

  it("tidak salah mendeteksi ; di dalam string sebagai pemisah statement", () => {
    const result = checkQueryGuard("SELECT 'a; b' AS x");
    expect(result.ok).toBe(true);
  });

  it("menolak kata pertama selain SELECT/WITH/VALUES", () => {
    const result = checkQueryGuard("EXPLAIN SELECT 1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rejection.code).toBe("NOT_READ_ONLY_START");
  });

  for (const keyword of ["INSERT", "UPDATE", "DELETE", "DROP", "PRAGMA", "ATTACH"]) {
    it(`menolak kata terlarang ${keyword} di luar string`, () => {
      const result = checkQueryGuard(`SELECT 1; -- placeholder\n${keyword} x`);
      expect(result.ok).toBe(false);
    });
  }

  it("tidak salah mendeteksi kata terlarang sebagai substring identifier", () => {
    // "drop_column" bukan keyword DROP; harus lolos.
    const result = checkQueryGuard("SELECT drop_column FROM t");
    expect(result.ok).toBe(true);
  });

  it("tidak terpengaruh kata terlarang di dalam komentar atau string", () => {
    const result = checkQueryGuard("SELECT 'DROP TABLE x' AS a -- DROP everything\nFROM t");
    expect(result.ok).toBe(true);
  });

  it("mendeteksi WITH ... DELETE sebagai kata terlarang (guard hanya UX, keamanan di authorizer)", () => {
    const result = checkQueryGuard("WITH x AS (SELECT 1) DELETE FROM t");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rejection.code).toBe("FORBIDDEN_KEYWORD");
  });
});

describe("splitStatements", () => {
  it("memecah dua statement dipisah titik koma", () => {
    const spans = splitStatements("SELECT 1; SELECT 2;");
    expect(spans).toHaveLength(2);
    expect(spans[0]?.text.trim()).toBe("SELECT 1");
    expect(spans[1]?.text.trim()).toBe("SELECT 2");
  });

  it("mengabaikan titik koma di dalam string", () => {
    const spans = splitStatements("SELECT 'a;b' FROM t");
    expect(spans).toHaveLength(1);
  });

  it("mengabaikan titik koma di dalam komentar", () => {
    const spans = splitStatements("SELECT 1 -- ; bukan pemisah\nFROM t");
    expect(spans).toHaveLength(1);
  });

  it("mengembalikan array kosong untuk teks kosong", () => {
    expect(splitStatements("   ")).toHaveLength(0);
  });
});

describe("statementAtCursor", () => {
  const text = "SELECT 1;\nSELECT 2;\nSELECT 3";

  it("memilih statement pertama saat kursor di dalamnya", () => {
    expect(statementAtCursor(text, 3)).toBe("SELECT 1");
  });

  it("memilih statement kedua saat kursor di dalamnya", () => {
    const idx = text.indexOf("SELECT 2") + 2;
    expect(statementAtCursor(text, idx)).toBe("SELECT 2");
  });

  it("memilih statement terakhir saat kursor di akhir teks", () => {
    expect(statementAtCursor(text, text.length)).toBe("SELECT 3");
  });

  it("memakai seleksi bila ada, mengabaikan posisi kursor", () => {
    const result = statementAtCursor(text, 0, { start: text.indexOf("SELECT 2"), end: text.indexOf("SELECT 2") + 8 });
    expect(result).toBe("SELECT 2");
  });

  it("mengembalikan undefined untuk editor kosong", () => {
    expect(statementAtCursor("", 0)).toBeUndefined();
  });
});
