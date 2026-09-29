/**
 * Validasi runtime skema konten sumber (Zod 4), dipakai
 * `scripts/build-content.ts` tahap 1 (docs/02-arsitektur.md §4.2). Cermin
 * dari `types.ts`; keduanya harus tetap sinkron.
 */
import { z } from "zod";
import { CONTENT_FORMAT_VERSION } from "./types";

const richTextSchema = z.union([z.string(), z.object({ file: z.string() })]);

const sqlConceptSchema = z.enum([
  "select",
  "where",
  "order-by",
  "limit",
  "distinct",
  "like",
  "in",
  "between",
  "null",
  "string-fn",
  "aggregate",
  "group-by",
  "having",
  "join",
  "left-join",
  "self-join",
  "subquery",
  "correlated-subquery",
  "exists",
  "set-ops",
  "case",
  "date-time",
  "cte",
  "recursive-cte",
  "window",
]);

const contentWarningSchema = z.object({
  label: z.literal("Tema Dewasa"),
  note: z.string().min(8).max(80),
});

const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  portrait: z.string().optional(),
});

const columnMetaSchema = z.object({
  name: z.string(),
  type: z.enum(["INTEGER", "REAL", "TEXT", "NUMERIC", "BLOB"]),
  description: z.string(),
  example: z.string().optional(),
  key: z.enum(["PK", "FK"]).optional(),
  references: z.string().optional(),
});

const tableMetaSchema = z.object({
  name: z.string(),
  label: z.string(),
  icon: z.enum(["dokumen", "orang", "kendaraan", "kamera", "bank", "telepon", "peta", "buku"]).optional(),
  description: z.string(),
  columns: z.array(columnMetaSchema).min(1),
});

const databaseSpecSchema = z.object({
  schema: z.string(),
  seed: z.array(z.string()).min(1),
  tables: z.array(tableMetaSchema).min(1),
});

const normalizeOptionsSchema = z.object({
  rowOrder: z.enum(["any", "exact"]).optional(),
  columnOrder: z.enum(["any", "exact"]).optional(),
  columnNames: z.enum(["ignore", "exact"]).optional(),
  caseSensitive: z.boolean().optional(),
  trimText: z.boolean().optional(),
  decimals: z.number().int().min(0).max(15).optional(),
});

const validatorSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("resultEquals"), solution: z.string(), options: normalizeOptionsSchema.optional() }),
    z.object({
      type: z.literal("keyColumn"),
      solution: z.string(),
      column: z.string(),
      compare: z.enum(["set", "multiset"]).optional(),
      ignoreNulls: z.boolean().optional(),
      options: normalizeOptionsSchema.pick({ caseSensitive: true, trimText: true, decimals: true }).optional(),
    }),
    z.object({ type: z.literal("singleValue"), solution: z.string(), decimals: z.number().optional() }),
    z.object({
      type: z.literal("queryUses"),
      require: z.array(sqlConceptSchema).optional(),
      forbid: z.array(sqlConceptSchema).optional(),
      requireTables: z.array(z.string()).optional(),
      severity: z.enum(["block", "suggest"]),
      message: z.string(),
    }),
    z.object({ type: z.literal("all"), of: z.array(validatorSchema).min(1) }),
    z.object({ type: z.literal("any"), of: z.array(validatorSchema).min(1) }),
    z.object({ type: z.literal("custom"), name: z.string(), params: z.record(z.string(), z.unknown()).optional() }),
  ])
);

const feedbackSpecSchema = z.object({
  rowCount: z.enum(["none", "relative", "exact"]).optional(),
  columnCount: z.boolean().optional(),
  mistakes: z.array(z.object({ sql: z.string(), message: z.string() })).optional(),
});

const hintOfferTriggerSchema = z.object({
  minFailedRuns: z.number().int().min(0),
  minConsecutiveErrors: z.number().int().min(0),
  idleSeconds: z.number().min(0),
  minSecondsOnStep: z.number().min(0),
});

const hintSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  kind: z.enum(["direction", "tables", "skeleton", "solution"]),
  body: richTextSchema,
  insertSql: z.string().optional(),
  offer: hintOfferTriggerSchema.partial().optional(),
});

const stepSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  story: richTextSchema,
  objective: z.string().min(1),
  concepts: z.array(sqlConceptSchema),
  relatedTables: z.array(z.string()),
  starterSql: z.string().optional(),
  validator: validatorSchema,
  feedback: feedbackSpecSchema.optional(),
  hints: z.tuple([hintSchema, hintSchema, hintSchema, hintSchema]),
  onComplete: richTextSchema.optional(),
  suggestNote: z.object({ title: z.string(), tags: z.array(z.string()).optional() }).optional(),
  replaces: z.array(z.string()).optional(),
});

const suspectSlotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  group: z.string().optional(),
  answers: z.array(z.string().min(1)).min(1),
});

const reportSpecSchema = z
  .object({
    suspects: z.array(suspectSlotSchema).min(1).max(3),
    identity: z.array(z.object({ table: z.string(), key: z.string(), name: z.string() })).min(1),
    lookup: z.object({ table: z.string(), column: z.string() }).optional(),
    wrongSuspectNotes: z
      .array(z.object({ name: z.string(), note: z.string(), slot: z.string().optional() }))
      .optional(),
    defaultWrongNote: z.string().min(1),
    misplacedNote: z.string().optional(),
    arrest: z.object({
      scene: z.string(),
      suspectPortrait: z.string().optional(),
      epilogue: richTextSchema,
    }),
  })
  .refine((r) => r.suspects.length <= 1 || r.misplacedNote !== undefined, {
    message: "misplacedNote wajib diisi bila report.suspects punya lebih dari 1 slot (§4.2).",
    path: ["misplacedNote"],
  });

const scoringSpecSchema = z.object({
  maxScore: z.number().int().positive().optional(),
  hintPenaltyPct: z.tuple([z.literal(0), z.number(), z.number(), z.number()]).optional(),
  hintGate: z.object({ afterFailedRuns: z.number().int().min(0), orAfterSeconds: z.number().min(0) }).optional(),
  wrongReportPenaltyPct: z.number().min(0).max(100).optional(),
  wrongReportCooldownFromAttempt: z.number().int().min(1).optional(),
  wrongReportCooldownSeconds: z.number().min(0).optional(),
  starsThresholdPct: z.tuple([z.number(), z.number(), z.number()]).optional(),
});

export const chapterSourceSchema = z
  .object({
    formatVersion: z.literal(CONTENT_FORMAT_VERSION),
    id: z.string().regex(/^ch\d{2}-[a-z0-9-]+$/, "id harus berformat 'chNN-slug'"),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    order: z.number().int().positive(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "version harus semver, mis. 1.0.0"),
    locale: z.literal("id-ID"),
    title: z.string().min(1),
    tagline: z.string().min(1),
    synopsis: z.string().min(1),
    difficulty: z.enum(["pemula", "menengah", "mahir"]),
    estimatedMinutes: z.number().positive(),
    concepts: z.array(sqlConceptSchema).min(1),
    engine: z.enum(["sqlite", "postgres"]),
    cover: z.string().optional(),
    violence: z.enum(["none", "offscreen"]),
    contentWarning: contentWarningSchema.optional(),
    unlock: z.object({ afterChapters: z.array(z.string()).optional() }).optional(),
    setting: z.object({
      city: z.literal("Wiralaga"),
      district: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      timezone: z.enum(["WIB", "WITA", "WIT"]).optional(),
    }),
    characters: z.array(characterSchema),
    database: databaseSpecSchema,
    display: z.object({ maxRows: z.number().int().positive().optional() }).optional(),
    briefing: richTextSchema,
    steps: z.array(stepSchema).min(1),
    report: reportSpecSchema,
    scoring: scoringSpecSchema.optional(),
    credits: z
      .object({
        writers: z.array(z.string()),
        artists: z.array(z.string()).optional(),
        reviewers: z.array(z.string()).optional(),
      })
      .optional(),
  })
  // B6: violence 'offscreen' wajib contentWarning; 'none' dilarang punya contentWarning.
  // Batas nomor bab (order >= 5) sengaja TIDAK dicek di sini: itu kebijakan
  // global dari content/policy.yaml, dicek di scripts/build-content.ts tahap
  // 6b, bukan konstanta di kode (P2).
  .refine((c) => (c.violence === "offscreen") === (c.contentWarning !== undefined), {
    message: "contentWarning wajib bila violence='offscreen', dan dilarang bila violence='none' (B6).",
    path: ["contentWarning"],
  });

export type ChapterSource = z.infer<typeof chapterSourceSchema>;
