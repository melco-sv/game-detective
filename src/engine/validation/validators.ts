/**
 * Mengevaluasi validator terkompilasi terhadap fingerprint hasil dan
 * metadata run. Fungsi murni & sinkron: fingerprint sudah dihitung di
 * Worker (§6.2); di sinilah hasilnya dibandingkan (§6.3), lapisan yang bisa
 * diganti versi server tanpa mengubah domain (P5, §6.6).
 */
import type { CompiledValidator } from "../content/manifest";
import { DEFAULT_NORMALIZE_OPTIONS, type NormalizeOptions } from "../content/types";
import type { ResultFingerprints } from "../sql/types";
import { detectConcepts } from "../sql/concepts";
import { getCustomValidator } from "./custom/registry";
import type { RunMeta, StepVerdict } from "./types";

/**
 * Opsi normalisasi yang harus dipakai Worker saat menghitung fingerprint
 * hasil pemain, diturunkan dari validator step aktif (dikirim lewat
 * `RunRequest.fingerprint`, §3.4). `queryUses`/`custom` tidak butuh
 * fingerprint hasil, jadi jatuh ke opsi default (tidak dipakai untuk
 * membandingkan apa pun).
 */
export function resolveFingerprintOptions(validator: CompiledValidator): NormalizeOptions {
  switch (validator.type) {
    case "resultEquals":
      return validator.options;
    case "keyColumn":
      return { ...DEFAULT_NORMALIZE_OPTIONS, ...validator.options };
    case "all":
    case "any":
      for (const sub of validator.of) {
        if (sub.type === "resultEquals" || sub.type === "keyColumn") return resolveFingerprintOptions(sub);
      }
      return DEFAULT_NORMALIZE_OPTIONS;
    default:
      return DEFAULT_NORMALIZE_OPTIONS;
  }
}

function evaluateQueryUses(
  validator: Extract<CompiledValidator, { type: "queryUses" }>,
  meta: RunMeta
): { ok: boolean; message?: string } {
  const concepts = detectConcepts(meta.sql);
  const missingRequire = validator.require.filter((c) => !concepts.has(c));
  const forbiddenPresent = validator.forbid.filter((c) => concepts.has(c));
  const missingTables = validator.requireTables.filter((t) => !meta.tablesRead.includes(t));
  const ok = missingRequire.length === 0 && forbiddenPresent.length === 0 && missingTables.length === 0;
  return { ok, message: ok ? undefined : validator.message };
}

export function evaluateValidator(
  validator: CompiledValidator,
  fp: ResultFingerprints,
  meta: RunMeta
): StepVerdict {
  switch (validator.type) {
    case "resultEquals": {
      if (fp.ordered === validator.fingerprint) return { correct: true };
      const orderOnlyWrong =
        validator.unorderedFingerprint !== undefined &&
        fp.unordered === validator.unorderedFingerprint;
      return { correct: false, orderOnlyWrong };
    }

    case "keyColumn": {
      const suffix = `|${validator.compare}|${validator.ignoreNulls ? "no-null" : "with-null"}`;
      const matched = Object.entries(fp.perColumn).some(
        ([key, hash]) => key.endsWith(suffix) && hash === validator.fingerprint
      );
      return { correct: matched };
    }

    case "queryUses": {
      const { ok, message } = evaluateQueryUses(validator, meta);
      if (validator.severity === "block") {
        return ok ? { correct: true } : { correct: false, blockedReason: message };
      }
      return { correct: true, suggestions: ok || !message ? [] : [message] };
    }

    case "all": {
      const results = validator.of.map((v) => evaluateValidator(v, fp, meta));
      return {
        correct: results.every((r) => r.correct),
        orderOnlyWrong: results.some((r) => r.orderOnlyWrong === true),
        blockedReason: results.find((r) => r.blockedReason !== undefined)?.blockedReason,
        suggestions: results.flatMap((r) => r.suggestions ?? []),
      };
    }

    case "any": {
      const results = validator.of.map((v) => evaluateValidator(v, fp, meta));
      return {
        correct: results.some((r) => r.correct),
        suggestions: results.flatMap((r) => r.suggestions ?? []),
      };
    }

    case "custom": {
      const fn = getCustomValidator(validator.name);
      if (!fn) {
        return { correct: false, blockedReason: `Validator kustom "${validator.name}" tidak terdaftar.` };
      }
      return fn(validator.params, { fp, meta });
    }
  }
}
