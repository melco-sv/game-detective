import { describe, expect, it } from "vitest";
import { evaluateValidator } from "@/engine/validation/validators";
import { computeFingerprints, keyColumnFingerprintKey } from "@/engine/validation/fingerprint";
import { DEFAULT_NORMALIZE_OPTIONS } from "@/engine/content/types";
import { registerCustomValidator, clearCustomValidators } from "@/engine/validation/custom/registry";
import type { CompiledValidator } from "@/engine/content/manifest";
import type { RunMeta } from "@/engine/validation/types";
import type { ResultColumn } from "@/engine/sql/types";

const COLS: ResultColumn[] = [
  { name: "nama", declType: "TEXT" },
  { name: "nik", declType: "TEXT" },
];
const ROWS = [
  ["Wulan Pratiwi", "3271011"],
  ["Ratna Sari", "3271012"],
];

async function meta(sql: string, tablesRead: string[] = [], functionsUsed: string[] = []): Promise<RunMeta> {
  return { sql, tablesRead, functionsUsed };
}

describe("evaluateValidator — resultEquals", () => {
  it("benar ketika fingerprint ordered cocok", async () => {
    const fp = await computeFingerprints(COLS, ROWS, {
      stepId: "s1",
      salt: "salt",
      options: DEFAULT_NORMALIZE_OPTIONS,
    });
    const validator: CompiledValidator = {
      type: "resultEquals",
      fingerprint: fp.ordered,
      options: DEFAULT_NORMALIZE_OPTIONS,
    };
    const verdict = evaluateValidator(validator, fp, await meta("SELECT nama, nik FROM t"));
    expect(verdict.correct).toBe(true);
  });

  it("salah dan orderOnlyWrong=true ketika hanya urutan yang beda (rowOrder exact)", async () => {
    const exactOpts = { ...DEFAULT_NORMALIZE_OPTIONS, rowOrder: "exact" as const };
    const solutionFp = await computeFingerprints(COLS, ROWS, { stepId: "s1", salt: "salt", options: exactOpts });
    const playerFp = await computeFingerprints(COLS, [...ROWS].reverse(), {
      stepId: "s1",
      salt: "salt",
      options: exactOpts,
    });
    const validator: CompiledValidator = {
      type: "resultEquals",
      fingerprint: solutionFp.ordered,
      unorderedFingerprint: solutionFp.unordered,
      options: exactOpts,
    };
    const verdict = evaluateValidator(validator, playerFp, await meta("SELECT nama, nik FROM t"));
    expect(verdict.correct).toBe(false);
    expect(verdict.orderOnlyWrong).toBe(true);
  });

  it("salah tanpa orderOnlyWrong ketika datanya benar-benar berbeda", async () => {
    const solutionFp = await computeFingerprints(COLS, ROWS, {
      stepId: "s1",
      salt: "salt",
      options: DEFAULT_NORMALIZE_OPTIONS,
    });
    const playerFp = await computeFingerprints(COLS, [["Budi", "999"]], {
      stepId: "s1",
      salt: "salt",
      options: DEFAULT_NORMALIZE_OPTIONS,
    });
    const validator: CompiledValidator = {
      type: "resultEquals",
      fingerprint: solutionFp.ordered,
      options: DEFAULT_NORMALIZE_OPTIONS,
    };
    const verdict = evaluateValidator(validator, playerFp, await meta("x"));
    expect(verdict.correct).toBe(false);
    expect(verdict.orderOnlyWrong).toBeFalsy();
  });
});

describe("evaluateValidator — keyColumn", () => {
  it("benar bila SATU kolom cocok, kolom lain bebas", async () => {
    const solutionFp = await computeFingerprints(
      [{ name: "nik", declType: "TEXT" }],
      [["3271011"], ["3271012"]],
      { stepId: "s2", salt: "salt", options: DEFAULT_NORMALIZE_OPTIONS }
    );
    const solutionHash = solutionFp.perColumn[keyColumnFingerprintKey("nik", "set", true)];

    // Pemain mengembalikan kolom TAMBAHAN (nama) selain nik yang harus cocok.
    const playerFp = await computeFingerprints(COLS, ROWS, {
      stepId: "s2",
      salt: "salt",
      options: DEFAULT_NORMALIZE_OPTIONS,
    });
    const validator: CompiledValidator = {
      type: "keyColumn",
      fingerprint: solutionHash as string,
      compare: "set",
      ignoreNulls: true,
      options: { caseSensitive: false, trimText: true, decimals: 6 },
    };
    const verdict = evaluateValidator(validator, playerFp, await meta("x"));
    expect(verdict.correct).toBe(true);
  });
});

describe("evaluateValidator — queryUses", () => {
  it("severity 'block': gagal bila konsep wajib tidak dipakai", async () => {
    const validator: CompiledValidator = {
      type: "queryUses",
      require: ["join"],
      forbid: [],
      requireTables: [],
      severity: "block",
      message: "Pakai JOIN untuk step ini.",
    };
    const fp = { ordered: "x", perColumn: {} };
    const verdict = evaluateValidator(validator, fp, await meta("SELECT * FROM t"));
    expect(verdict.correct).toBe(false);
    expect(verdict.blockedReason).toBe("Pakai JOIN untuk step ini.");
  });

  it("severity 'block': lolos bila konsep wajib dipakai dan tidak ada yang dilarang", async () => {
    const validator: CompiledValidator = {
      type: "queryUses",
      require: ["join"],
      forbid: ["subquery"],
      requireTables: [],
      severity: "block",
      message: "x",
    };
    const fp = { ordered: "x", perColumn: {} };
    const verdict = evaluateValidator(validator, fp, await meta("SELECT * FROM a JOIN b ON a.id=b.id"));
    expect(verdict.correct).toBe(true);
  });

  it("severity 'suggest': tidak pernah memblokir, hanya menambahkan saran", async () => {
    const validator: CompiledValidator = {
      type: "queryUses",
      require: ["join"],
      forbid: [],
      requireTables: [],
      severity: "suggest",
      message: "Coba juga versi dengan JOIN.",
    };
    const fp = { ordered: "x", perColumn: {} };
    const verdict = evaluateValidator(validator, fp, await meta("SELECT * FROM t"));
    expect(verdict.correct).toBe(true);
    expect(verdict.suggestions).toContain("Coba juga versi dengan JOIN.");
  });

  it("memeriksa requireTables terhadap authorizer (tablesRead)", async () => {
    const validator: CompiledValidator = {
      type: "queryUses",
      require: [],
      forbid: [],
      requireTables: ["pegawai_galeri"],
      severity: "block",
      message: "Kamu belum memakai sheet pegawai_galeri.",
    };
    const fp = { ordered: "x", perColumn: {} };
    const failing = evaluateValidator(validator, fp, await meta("SELECT * FROM penduduk", ["penduduk"]));
    expect(failing.correct).toBe(false);
    const passing = evaluateValidator(
      validator,
      fp,
      await meta("SELECT * FROM pegawai_galeri", ["pegawai_galeri"])
    );
    expect(passing.correct).toBe(true);
  });
});

describe("evaluateValidator — all / any", () => {
  const fp = { ordered: "x", unordered: "y", perColumn: {} };
  const alwaysTrue: CompiledValidator = {
    type: "queryUses",
    require: [],
    forbid: [],
    requireTables: [],
    severity: "suggest",
    message: "",
  };
  const alwaysFalse: CompiledValidator = {
    type: "resultEquals",
    fingerprint: "tidak-akan-pernah-cocok",
    options: DEFAULT_NORMALIZE_OPTIONS,
  };

  it("'all' benar hanya bila semua anggota benar", async () => {
    const m = await meta("x");
    expect(evaluateValidator({ type: "all", of: [alwaysTrue, alwaysTrue] }, fp, m).correct).toBe(true);
    expect(evaluateValidator({ type: "all", of: [alwaysTrue, alwaysFalse] }, fp, m).correct).toBe(false);
  });

  it("'any' benar bila salah satu anggota benar", async () => {
    const m = await meta("x");
    expect(evaluateValidator({ type: "any", of: [alwaysFalse, alwaysTrue] }, fp, m).correct).toBe(true);
    expect(evaluateValidator({ type: "any", of: [alwaysFalse, alwaysFalse] }, fp, m).correct).toBe(false);
  });
});

describe("evaluateValidator — custom", () => {
  it("memanggil validator terdaftar berdasarkan nama", async () => {
    clearCustomValidators();
    registerCustomValidator("selalu-benar", () => ({ correct: true }));
    const verdict = evaluateValidator(
      { type: "custom", name: "selalu-benar" },
      { ordered: "x", perColumn: {} },
      await meta("x")
    );
    expect(verdict.correct).toBe(true);
    clearCustomValidators();
  });

  it("gagal dengan pesan jelas bila validator kustom tidak terdaftar", async () => {
    clearCustomValidators();
    const verdict = evaluateValidator(
      { type: "custom", name: "tidak-ada" },
      { ordered: "x", perColumn: {} },
      await meta("x")
    );
    expect(verdict.correct).toBe(false);
    expect(verdict.blockedReason).toContain("tidak-ada");
  });
});
