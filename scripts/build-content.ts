#!/usr/bin/env -S npx tsx
/**
 * Pipeline build konten (docs/02-arsitektur.md §4.2). Menghasilkan
 * `public/generated/chapters/<id>/manifest.<hash>.json` +
 * `case.<hash>.db.gz` per chapter, plus katalog `index.json`.
 *
 * Deviasi dari dokumen yang disengaja (dicatat di README, bukan disembunyikan):
 * DB dibangun dengan `node:sqlite` (bawaan Node), BUKAN
 * `@sqlite.org/sqlite-wasm` seperti runtime browser (ADR-02: "engine build =
 * engine runtime"). Keduanya SQLite, jadi perilaku SQL standar identik;
 * risikonya ada di perilaku sangat spesifik-implementasi yang jarang dipakai
 * konten MVP. Menyamakan mesin build dengan WASM adalah pekerjaan lanjutan
 * (lihat design/README atau catatan proyek).
 *
 * Pemakaian: `npm run content:build` (dipanggil otomatis oleh `prebuild`/`predev`).
 * Tanpa argumen: build semua chapter di content/chapters/*, tulis ke public/.
 * `--check`: jalankan seluruh pipeline (termasuk tests.yaml) TANPA menulis
 * berkas keluaran — dipakai `npm run content:verify` (CI).
 */
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { parse as parseYaml } from "yaml";

import { chapterSourceSchema } from "../src/engine/content/schema.zod";
import {
  DEFAULT_HINT_OFFER,
  DEFAULT_NORMALIZE_OPTIONS,
  DEFAULT_SCORING,
  type Chapter,
  type Hint,
  type NormalizeOptions,
  type ScoringSpec,
  type Step,
  type Validator,
} from "../src/engine/content/types";
import type {
  ChapterManifest,
  ChapterSummary,
  CompiledHint,
  CompiledReport,
  CompiledStep,
  CompiledValidator,
} from "../src/engine/content/manifest";
import { canonicalColumn, canonicalResult } from "../src/engine/validation/canonical";
import { fingerprintOf, keyColumnFingerprintKey } from "../src/engine/validation/fingerprint";
import { evaluateValidator } from "../src/engine/validation/validators";
import { hashSuspectName, normalizeName, verifySuspectsLocal } from "../src/engine/validation/suspect";
import { basePointsPerStep } from "../src/engine/scoring/score";
import { obfuscateText } from "../src/engine/content/obfuscate";
import { sha256Hex } from "../src/lib/sha256";
import type { Cell } from "../src/engine/sql/types";
import type { RunMeta } from "../src/engine/validation/types";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content", "chapters");
const POLICY_PATH = path.join(ROOT, "content", "policy.yaml");
const OUT_DIR = path.join(ROOT, "public", "generated", "chapters");

const CHECK_ONLY = process.argv.includes("--check");
const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

class ContentBuildError extends Error {}
function fail(message: string): never {
  throw new ContentBuildError(message);
}

// ─────────────────────────── util: baca konten ───────────────────────────

function resolveRichText(rt: string | { file: string }, chapterDir: string): string {
  if (typeof rt === "string") return rt;
  const filePath = path.join(chapterDir, rt.file);
  if (!existsSync(filePath)) fail(`Berkas RichText tidak ditemukan: ${rt.file}`);
  return readFileSync(filePath, "utf-8").trim();
}

interface Policy {
  violenceFromOrder: number;
  maxRawDbBytesSmall: number;
  maxRawDbBytesLarge: number;
}

function loadPolicy(): Policy {
  const raw = parseYaml(readFileSync(POLICY_PATH, "utf-8")) as Policy;
  return raw;
}

// ─────────────────────────── util: SQLite (node:sqlite) ───────────────────────────

/**
 * `node:sqlite` di versi Node yang dipakai belum mengekspos
 * `serialize()`/`deserialize()` (ada di definisi tipe @types/node, tapi
 * tidak di runtime terpasang — lihat catatan deviasi di kepala berkas).
 * Sebagai gantinya, DB dibangun di berkas sementara lalu byte-nya dibaca
 * langsung dari disk.
 */
function buildDatabase(chapterDir: string, source: Chapter): { db: DatabaseSync; tmpPath: string } {
  const tmpPath = path.join(
    os.tmpdir(),
    `detektif-sql-build-${source.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  );
  const db = new DatabaseSync(tmpPath);
  const schemaPath = path.join(chapterDir, source.database.schema);
  db.exec(readFileSync(schemaPath, "utf-8"));
  for (const seedFile of source.database.seed) {
    if (!seedFile.endsWith(".sql")) {
      fail(`Format seed belum didukung untuk MVP: ${seedFile} (hanya .sql)`);
    }
    const seedPath = path.join(chapterDir, seedFile);
    db.exec(readFileSync(seedPath, "utf-8"));
  }
  return { db, tmpPath };
}

function introspectAndValidateTables(db: DatabaseSync, source: Chapter): void {
  for (const table of source.database.tables) {
    if (!IDENT_RE.test(table.name)) fail(`Nama tabel tidak valid: ${table.name}`);
    const cols = db.prepare(`PRAGMA table_info(${table.name})`).all() as { name: string }[];
    if (cols.length === 0) fail(`Tabel '${table.name}' dideklarasikan di chapter.yaml tapi tidak ada di schema.sql`);
    const actual = new Set(cols.map((c) => c.name));
    for (const col of table.columns) {
      if (!actual.has(col.name)) {
        fail(`Kolom '${col.name}' pada tabel '${table.name}' tidak ada di schema.sql (chapter.yaml tidak sinkron)`);
      }
    }
  }
}

interface QueryResult {
  columns: string[];
  rows: Cell[][];
}

function runQuery(db: DatabaseSync, sql: string): QueryResult {
  const stmt = db.prepare(sql);
  stmt.setReturnArrays(true);
  const columns = stmt.columns().map((c) => c.name);
  const rows = stmt.all() as unknown as Cell[][];
  return { columns, rows };
}

// ─────────────────────────── kompilasi validator/step ───────────────────────────

function findPrimarySolutionSql(v: Validator): string | undefined {
  switch (v.type) {
    case "resultEquals":
    case "keyColumn":
    case "singleValue":
      return v.solution;
    case "all":
    case "any":
      for (const sub of v.of) {
        const found = findPrimarySolutionSql(sub);
        if (found) return found;
      }
      return undefined;
    default:
      return undefined;
  }
}

function findPrimaryOptions(v: Validator): NormalizeOptions {
  switch (v.type) {
    case "resultEquals":
      return { ...DEFAULT_NORMALIZE_OPTIONS, ...v.options };
    case "keyColumn":
      return { ...DEFAULT_NORMALIZE_OPTIONS, ...v.options };
    case "singleValue":
      return {
        ...DEFAULT_NORMALIZE_OPTIONS,
        rowOrder: "exact",
        columnOrder: "exact",
        decimals: v.decimals ?? DEFAULT_NORMALIZE_OPTIONS.decimals,
      };
    case "all":
    case "any":
      for (const sub of v.of) {
        const found = findPrimarySolutionSql(sub);
        if (found) return findPrimaryOptions(sub);
      }
      return DEFAULT_NORMALIZE_OPTIONS;
    default:
      return DEFAULT_NORMALIZE_OPTIONS;
  }
}

async function compileValidator(
  db: DatabaseSync,
  stepId: string,
  salt: string,
  validator: Validator
): Promise<CompiledValidator> {
  switch (validator.type) {
    case "resultEquals": {
      const options = { ...DEFAULT_NORMALIZE_OPTIONS, ...validator.options };
      const { columns, rows } = runQuery(db, validator.solution);
      const canonical = canonicalResult(columns, rows, options);
      const fingerprint = await fingerprintOf(salt, stepId, canonical);
      let unorderedFingerprint: string | undefined;
      if (options.rowOrder === "exact") {
        const unordered = canonicalResult(columns, rows, { ...options, rowOrder: "any" });
        unorderedFingerprint = await fingerprintOf(salt, stepId, unordered);
      }
      return { type: "resultEquals", fingerprint, unorderedFingerprint, options };
    }
    case "keyColumn": {
      const columnOptions = {
        caseSensitive: DEFAULT_NORMALIZE_OPTIONS.caseSensitive,
        trimText: DEFAULT_NORMALIZE_OPTIONS.trimText,
        decimals: DEFAULT_NORMALIZE_OPTIONS.decimals,
        ...validator.options,
      };
      const compare = validator.compare ?? "set";
      const ignoreNulls = validator.ignoreNulls ?? true;
      const { columns, rows } = runQuery(db, validator.solution);
      const colIndex = columns.indexOf(validator.column);
      if (colIndex === -1) {
        fail(`Kolom '${validator.column}' tidak ada di hasil query solusi step '${stepId}' (keyColumn)`);
      }
      const values = rows.map((r) => r[colIndex] ?? null);
      const canonical = canonicalColumn(values, columnOptions, compare, ignoreNulls);
      const fingerprint = await fingerprintOf(salt, stepId, canonical);
      return { type: "keyColumn", fingerprint, compare, ignoreNulls, options: columnOptions };
    }
    case "singleValue": {
      // Gula sintaks (§4.3): dikompilasi menjadi resultEquals 1 baris x 1 kolom.
      const options: NormalizeOptions = {
        ...DEFAULT_NORMALIZE_OPTIONS,
        rowOrder: "exact",
        columnOrder: "exact",
        decimals: validator.decimals ?? DEFAULT_NORMALIZE_OPTIONS.decimals,
      };
      const { columns, rows } = runQuery(db, validator.solution);
      if (rows.length !== 1 || columns.length !== 1) {
        fail(
          `Validator singleValue step '${stepId}' harus 1 baris x 1 kolom (dapat ${rows.length}x${columns.length})`
        );
      }
      const canonical = canonicalResult(columns, rows, options);
      const fingerprint = await fingerprintOf(salt, stepId, canonical);
      return { type: "resultEquals", fingerprint, options };
    }
    case "queryUses":
      return {
        type: "queryUses",
        require: validator.require ?? [],
        forbid: validator.forbid ?? [],
        requireTables: validator.requireTables ?? [],
        severity: validator.severity,
        message: validator.message,
      };
    case "all":
      return { type: "all", of: await Promise.all(validator.of.map((v) => compileValidator(db, stepId, salt, v))) };
    case "any":
      return { type: "any", of: await Promise.all(validator.of.map((v) => compileValidator(db, stepId, salt, v))) };
    case "custom":
      return { type: "custom", name: validator.name, params: validator.params };
  }
}

async function compileHint(
  hint: Hint,
  chapterDir: string,
  salt: string,
  scoring: ScoringSpec
): Promise<CompiledHint> {
  const level = hint.level;
  const defaultOffer = DEFAULT_HINT_OFFER[level];
  const offer = { ...defaultOffer, ...hint.offer };
  const penaltyPct = level === 1 ? 0 : (scoring.hintPenaltyPct[level - 1] ?? 0);
  const bodyText = resolveRichText(hint.body, chapterDir);
  const obfuscated = level === 4;
  return {
    level,
    kind: hint.kind,
    penaltyPct,
    offer,
    body: obfuscated ? obfuscateText(bodyText, salt) : bodyText,
    insertSql: hint.insertSql ? (obfuscated ? obfuscateText(hint.insertSql, salt) : hint.insertSql) : undefined,
    obfuscated,
  };
}

async function compileStep(
  db: DatabaseSync,
  chapterDir: string,
  salt: string,
  scoring: ScoringSpec,
  step: Step,
  points: number
): Promise<CompiledStep> {
  const validator = await compileValidator(db, step.id, salt, step.validator);

  const primarySql = findPrimarySolutionSql(step.validator);
  const primaryOptions = findPrimaryOptions(step.validator);
  let expectedRows: number | undefined;
  let expectedColumns: number | undefined;
  if (primarySql) {
    const { columns, rows } = runQuery(db, primarySql);
    expectedRows = rows.length;
    expectedColumns = columns.length;
  }

  const mistakes: { fingerprint: string; message: string }[] = [];
  for (const m of step.feedback?.mistakes ?? []) {
    const { columns, rows } = runQuery(db, m.sql);
    const canonical = canonicalResult(columns, rows, primaryOptions);
    const fingerprint = await fingerprintOf(salt, step.id, canonical);
    mistakes.push({ fingerprint, message: m.message });
  }

  const hints = await Promise.all(step.hints.map((h) => compileHint(h, chapterDir, salt, scoring)));

  return {
    id: step.id,
    title: step.title,
    story: resolveRichText(step.story, chapterDir),
    objective: step.objective,
    concepts: step.concepts,
    relatedTables: step.relatedTables,
    starterSql: step.starterSql,
    points,
    onComplete: step.onComplete ? resolveRichText(step.onComplete, chapterDir) : undefined,
    suggestNote: step.suggestNote,
    replaces: step.replaces,
    validator,
    feedback: {
      rowCount: step.feedback?.rowCount ?? "relative",
      expectedRows,
      expectedColumns: step.feedback?.columnCount ? expectedColumns : undefined,
      mistakes,
    },
    hints,
  };
}

// ─────────────────────────── laporan & uji keunikan (tahap 6) ───────────────────────────

async function compileReport(
  chapterId: string,
  chapterDir: string,
  report: Chapter["report"]
): Promise<CompiledReport> {
  const suspects = [];
  for (const slot of report.suspects) {
    const hashes = await Promise.all(
      slot.answers.map((a) => hashSuspectName(chapterId, normalizeName(a)))
    );
    suspects.push({ id: slot.id, label: slot.label, group: slot.group, hashes });
  }
  const wrongNotes: Record<string, string> = {};
  for (const note of report.wrongSuspectNotes ?? []) {
    const hash = await hashSuspectName(chapterId, normalizeName(note.name));
    const key = note.slot ? `${note.slot}|${hash}` : hash;
    wrongNotes[key] = note.note;
  }
  return {
    suspects,
    lookup: report.lookup,
    wrongNotes,
    defaultWrongNote: report.defaultWrongNote,
    misplacedNote: report.misplacedNote,
    arrest: {
      scene: report.arrest.scene,
      suspectPortrait: report.arrest.suspectPortrait,
      epilogue: resolveRichText(report.arrest.epilogue, chapterDir),
    },
  };
}

/** Tahap 6 (§4.2): uji keunikan nama pelaku di semua slot laporan. */
function checkSuspectUniqueness(db: DatabaseSync, chapterId: string, source: Chapter): void {
  const identityMap = new Map<string, Set<string>>(); // normalizedName -> {kunci identitas}

  for (const src of source.report.identity) {
    for (const field of [src.table, src.key, src.name]) {
      if (!IDENT_RE.test(field)) fail(`report.identity memuat nama tidak valid: ${field}`);
    }
    const rows = db.prepare(`SELECT DISTINCT ${src.key} AS k, ${src.name} AS n FROM ${src.table}`).all() as {
      k: unknown;
      n: unknown;
    }[];
    for (const row of rows) {
      const key = String(row.k);
      const norm = normalizeName(String(row.n));
      if (!identityMap.has(norm)) identityMap.set(norm, new Set());
      identityMap.get(norm)?.add(key);
    }
  }

  const slotKeys: { slotId: string; key: string }[] = [];
  const slotAnswerNorms: { slotId: string; norms: string[] }[] = [];

  for (const slot of source.report.suspects) {
    const norms = slot.answers.map(normalizeName);
    slotAnswerNorms.push({ slotId: slot.id, norms });
    const resolvedKeys = new Set<string>();
    for (const norm of norms) {
      const keys = identityMap.get(norm);
      if (!keys || keys.size !== 1) {
        fail(
          `[${chapterId}] Nama jawaban '${norm}' pada slot '${slot.id}' cocok dengan ${keys ? keys.size : 0} kunci identitas (harus tepat 1).`
        );
      }
      for (const k of keys) resolvedKeys.add(k);
    }
    if (resolvedKeys.size !== 1) {
      fail(`[${chapterId}] Alias jawaban pada slot '${slot.id}' merujuk ke orang yang berbeda-beda.`);
    }
    slotKeys.push({ slotId: slot.id, key: [...resolvedKeys][0] as string });
  }

  for (let i = 0; i < slotKeys.length; i++) {
    for (let j = i + 1; j < slotKeys.length; j++) {
      if (slotKeys[i]?.key === slotKeys[j]?.key) {
        fail(`[${chapterId}] Slot '${slotKeys[i]?.slotId}' dan '${slotKeys[j]?.slotId}' menunjuk orang yang sama.`);
      }
    }
  }

  for (let i = 0; i < slotAnswerNorms.length; i++) {
    for (let j = i + 1; j < slotAnswerNorms.length; j++) {
      for (const a of slotAnswerNorms[i]?.norms ?? []) {
        if (slotAnswerNorms[j]?.norms.includes(a)) {
          fail(
            `[${chapterId}] Nama jawaban '${a}' ditulis di lebih dari satu slot (${slotAnswerNorms[i]?.slotId}, ${slotAnswerNorms[j]?.slotId}).`
          );
        }
      }
    }
  }

  const validSlotIds = new Set(source.report.suspects.map((s) => s.id));
  const allAnswerNorms = new Set(slotAnswerNorms.flatMap((s) => s.norms));
  for (const note of source.report.wrongSuspectNotes ?? []) {
    const norm = normalizeName(note.name);
    if (!identityMap.has(norm)) {
      fail(`[${chapterId}] Nama '${note.name}' di wrongSuspectNotes tidak ditemukan di data.`);
    }
    if (note.slot !== undefined && !validSlotIds.has(note.slot)) {
      fail(`[${chapterId}] wrongSuspectNotes untuk '${note.name}' merujuk slot '${note.slot}' yang tidak ada.`);
    }
    if (note.slot === undefined && allAnswerNorms.has(norm)) {
      fail(
        `[${chapterId}] wrongSuspectNotes untuk '${note.name}' ditulis tanpa 'slot', padahal itu jawaban benar di salah satu slot.`
      );
    }
  }
}

/** Tahap 6b (§4.2): aturan label konten (B6). */
function checkContentWarningPolicy(chapterId: string, source: Chapter, policy: Policy): void {
  if (source.violence === "offscreen" && source.order < policy.violenceFromOrder) {
    fail(
      `[${chapterId}] violence='offscreen' hanya diperbolehkan mulai Bab ${policy.violenceFromOrder} (content/policy.yaml).`
    );
  }
}

// ─────────────────────────── tests.yaml (tahap 5) ───────────────────────────

interface StepTestSpec {
  pass?: string[];
  fail?: string[];
  expectMistake?: { sql: string; mistake: number }[];
  expectOrderOnly?: string[];
}

interface ContentTestsSpec {
  steps?: Record<string, StepTestSpec>;
  report?: { pass?: unknown[]; fail?: unknown[] };
}

function runMetaFor(sql: string, tablesRead: string[] = []): RunMeta {
  return { sql, tablesRead, functionsUsed: [] };
}

async function runStepTests(
  db: DatabaseSync,
  chapterId: string,
  compiledStep: CompiledStep,
  spec: StepTestSpec,
  salt: string
): Promise<void> {
  const options =
    compiledStep.validator.type === "resultEquals" ? compiledStep.validator.options : DEFAULT_NORMALIZE_OPTIONS;

  async function fingerprintsFor(sql: string) {
    const { columns, rows } = runQuery(db, sql);
    const ordered = await fingerprintOf(salt, compiledStep.id, canonicalResult(columns, rows, options));
    let unordered: string | undefined;
    if (options.rowOrder === "exact") {
      unordered = await fingerprintOf(salt, compiledStep.id, canonicalResult(columns, rows, { ...options, rowOrder: "any" }));
    }
    const perColumn: Record<string, string> = {};
    for (let j = 0; j < columns.length; j++) {
      const values = rows.map((r) => r[j] ?? null);
      for (const compare of ["set", "multiset"] as const) {
        for (const ignoreNulls of [true, false]) {
          const canon = canonicalColumn(
            values,
            { caseSensitive: options.caseSensitive, trimText: options.trimText, decimals: options.decimals },
            compare,
            ignoreNulls
          );
          perColumn[keyColumnFingerprintKey(columns[j] as string, compare, ignoreNulls)] = await fingerprintOf(
            salt,
            compiledStep.id,
            canon
          );
        }
      }
    }
    return { ordered, unordered, perColumn, columns, rows };
  }

  for (const sql of spec.pass ?? []) {
    const fp = await fingerprintsFor(sql);
    const verdict = evaluateValidator(compiledStep.validator, fp, runMetaFor(sql));
    if (!verdict.correct) {
      fail(`[${chapterId}/${compiledStep.id}] tests.yaml 'pass' seharusnya BENAR tapi ditolak: ${sql}`);
    }
  }

  for (const sql of spec.fail ?? []) {
    const fp = await fingerprintsFor(sql);
    const verdict = evaluateValidator(compiledStep.validator, fp, runMetaFor(sql));
    if (verdict.correct) {
      fail(`[${chapterId}/${compiledStep.id}] tests.yaml 'fail' seharusnya SALAH tapi diterima: ${sql}`);
    }
  }

  for (const { sql, mistake } of spec.expectMistake ?? []) {
    const fp = await fingerprintsFor(sql);
    const expected = compiledStep.feedback.mistakes[mistake]?.fingerprint;
    if (fp.ordered !== expected) {
      fail(`[${chapterId}/${compiledStep.id}] expectMistake[${mistake}] tidak cocok untuk: ${sql}`);
    }
  }

  for (const sql of spec.expectOrderOnly ?? []) {
    const fp = await fingerprintsFor(sql);
    const verdict = evaluateValidator(compiledStep.validator, fp, runMetaFor(sql));
    if (verdict.correct || !verdict.orderOnlyWrong) {
      fail(`[${chapterId}/${compiledStep.id}] expectOrderOnly gagal untuk: ${sql}`);
    }
  }
}

async function runReportTests(
  chapterId: string,
  compiledReport: CompiledReport,
  spec: ContentTestsSpec["report"]
): Promise<void> {
  const toNameArray = (entry: unknown): string[] => (Array.isArray(entry) ? (entry as string[]) : [entry as string]);

  for (const entry of spec?.pass ?? []) {
    const names = toNameArray(entry);
    const verdict = await verifySuspectsLocal(chapterId, compiledReport, names);
    if (!verdict.correct) fail(`[${chapterId}] tests.yaml report.pass seharusnya BENAR: ${JSON.stringify(names)}`);
  }
  for (const entry of spec?.fail ?? []) {
    const names = toNameArray(entry);
    const verdict = await verifySuspectsLocal(chapterId, compiledReport, names);
    if (verdict.correct) fail(`[${chapterId}] tests.yaml report.fail seharusnya SALAH: ${JSON.stringify(names)}`);
    // SuspectVerdict tidak PERNAH punya field jumlah/indeks nama benar — dijamin
    // oleh tipe di src/engine/validation/types.ts, bukan dicek di runtime (B7).
  }
}

// ─────────────────────────── build satu chapter ───────────────────────────

async function buildOneChapter(
  dirName: string,
  policy: Policy
): Promise<{ manifest: ChapterManifest; dbBytesGz: Buffer; summary: ChapterSummary }> {
  const chapterDir = path.join(CONTENT_DIR, dirName);
  const yamlPath = path.join(chapterDir, "chapter.yaml");
  if (!existsSync(yamlPath)) fail(`chapter.yaml tidak ditemukan di ${dirName}`);

  const rawYaml = readFileSync(yamlPath, "utf-8");
  const parsed = chapterSourceSchema.parse(parseYaml(rawYaml));
  // Zod memvalidasi bentuknya saat runtime; untuk ergonomi TypeScript kita
  // percayakan sisanya ke tipe tulisan tangan di content/types.ts (keduanya
  // sengaja dijaga sinkron).
  const source = parsed as unknown as Chapter;

  if (!dirName.match(/^\d{2}-/)) fail(`Nama folder harus 'NN-slug': ${dirName}`);
  if (source.id !== `ch${dirName}`) {
    fail(`id ('${source.id}') tidak cocok dengan nama folder ('ch${dirName}' diharapkan)`);
  }

  const { db, tmpPath } = buildDatabase(chapterDir, source);
  introspectAndValidateTables(db, source);
  checkSuspectUniqueness(db, source.id, source);
  checkContentWarningPolicy(source.id, source, policy);

  const salt = await sha256Hex(`${source.id}|${source.version}`);
  const contentHash = (
    await sha256Hex(
      [rawYaml, readFileSync(path.join(chapterDir, source.database.schema), "utf-8"), ...source.database.seed.map((s) => readFileSync(path.join(chapterDir, s), "utf-8"))].join("\u0000")
    )
  ).slice(0, 8);

  const basePoints = basePointsPerStep(source.steps.length, DEFAULT_SCORING.maxScore);
  const steps: CompiledStep[] = [];
  for (let i = 0; i < source.steps.length; i++) {
    const step = source.steps[i] as Step;
    steps.push(await compileStep(db, chapterDir, salt, DEFAULT_SCORING, step, basePoints[i] as number));
  }

  const report = await compileReport(source.id, chapterDir, source.report);

  // Tahap 5: jalankan tests.yaml bila ada.
  const testsPath = path.join(chapterDir, "tests.yaml");
  if (existsSync(testsPath)) {
    const testsSpec = parseYaml(readFileSync(testsPath, "utf-8")) as ContentTestsSpec;
    for (const step of steps) {
      const spec = testsSpec.steps?.[step.id];
      if (spec) await runStepTests(db, source.id, step, spec, salt);
    }
    if (testsSpec.report) await runReportTests(source.id, report, testsSpec.report);
  }

  // Baca byte SETELAH semua query selesai (db masih terbuka di atas), lalu
  // tutup koneksi dan hapus berkas sementara sebelum lanjut.
  const dbBuffer = readFileSync(tmpPath);
  db.close();
  unlinkSync(tmpPath);

  const rawDbLimit = source.order <= 3 ? policy.maxRawDbBytesSmall : policy.maxRawDbBytesLarge;
  if (dbBuffer.byteLength > rawDbLimit) {
    fail(
      `[${source.id}] DB mentah ${dbBuffer.byteLength} byte melebihi batas ${rawDbLimit} byte (content/policy.yaml)`
    );
  }

  const dbBytesGz = zlib.gzipSync(dbBuffer);
  // sha256 byte mentah (BUKAN sha256Hex, yang mengasumsikan teks UTF-8).
  const dbSha256 = createHash("sha256").update(dbBuffer).digest("hex");

  const manifest: ChapterManifest = {
    formatVersion: source.formatVersion,
    id: source.id,
    slug: source.slug,
    order: source.order,
    version: source.version,
    locale: source.locale,
    title: source.title,
    tagline: source.tagline,
    synopsis: source.synopsis,
    difficulty: source.difficulty,
    estimatedMinutes: source.estimatedMinutes,
    concepts: source.concepts,
    engine: source.engine,
    cover: source.cover,
    violence: source.violence,
    contentWarning: source.contentWarning,
    unlock: source.unlock,
    setting: source.setting,
    characters: source.characters,
    display: source.display,
    credits: source.credits,
    build: { contentHash, builtAt: new Date().toISOString(), sqliteVersion: "node:sqlite", salt },
    database: {
      url: `/generated/chapters/${source.id}/case.${contentHash}.db.gz`,
      compressed: "gzip",
      bytes: dbBuffer.byteLength,
      sha256: dbSha256,
      tables: source.database.tables,
    },
    briefing: resolveRichText(source.briefing, chapterDir),
    scoring: { ...DEFAULT_SCORING, ...source.scoring },
    steps,
    report,
  };

  const summary: ChapterSummary = {
    id: source.id,
    slug: source.slug,
    order: source.order,
    version: source.version,
    title: source.title,
    tagline: source.tagline,
    difficulty: source.difficulty,
    estimatedMinutes: source.estimatedMinutes,
    concepts: source.concepts,
    cover: source.cover,
    unlock: source.unlock, // default (bab sebelumnya) diselesaikan di resolveDefaultUnlocks
    contentWarning: source.contentWarning,
    manifestUrl: `/generated/chapters/${source.id}/manifest.${contentHash}.json`,
  };

  return { manifest, dbBytesGz, summary };
}

function resolveDefaultUnlocks(summaries: ChapterSummary[]): void {
  const byOrder = new Map(summaries.map((s) => [s.order, s]));
  for (const s of summaries) {
    if (s.unlock === undefined && s.order > 1) {
      const prev = byOrder.get(s.order - 1);
      if (prev) s.unlock = { afterChapters: [prev.id] };
    }
  }
}

// ─────────────────────────── main ───────────────────────────

async function main(): Promise<void> {
  if (!existsSync(CONTENT_DIR)) {
    console.log("content:build — content/chapters/ belum ada, dilewati.");
    return;
  }
  const policy = loadPolicy();
  const dirs = readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_template")
    .map((d) => d.name)
    .sort();

  if (dirs.length === 0) {
    console.log("content:build — tidak ada chapter di content/chapters/, menulis index.json kosong.");
    if (!CHECK_ONLY) {
      mkdirSync(OUT_DIR, { recursive: true });
      writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify([], null, 2));
    }
    return;
  }

  const built: { manifest: ChapterManifest; dbBytesGz: Buffer; summary: ChapterSummary }[] = [];
  for (const dir of dirs) {
    console.log(`content:build — membangun ${dir}...`);
    const result = await buildOneChapter(dir, policy);
    built.push(result);
    console.log(`content:build — ${result.manifest.id} OK (${result.manifest.steps.length} step)`);
  }

  const summaries = built.map((b) => b.summary);
  resolveDefaultUnlocks(summaries);

  if (CHECK_ONLY) {
    console.log(`content:verify — ${built.length} chapter lolos semua pemeriksaan.`);
    return;
  }

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  for (const { manifest, dbBytesGz } of built) {
    const chapterOutDir = path.join(OUT_DIR, manifest.id);
    mkdirSync(chapterOutDir, { recursive: true });
    writeFileSync(
      path.join(chapterOutDir, `manifest.${manifest.build.contentHash}.json`),
      JSON.stringify(manifest, null, 2)
    );
    writeFileSync(path.join(chapterOutDir, `case.${manifest.build.contentHash}.db.gz`), dbBytesGz);
  }
  writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(summaries, null, 2));

  console.log(`content:build — selesai. ${built.length} chapter ditulis ke public/generated/chapters/.`);
}

main().catch((err: unknown) => {
  if (err instanceof ContentBuildError) {
    console.error(`\ncontent:build GAGAL — ${err.message}\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
