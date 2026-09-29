/**
 * Registry validator kustom (docs/02-arsitektur.md §6.3: `custom` dipakai
 * untuk kasus khusus, didaftarkan dengan nama dari konten — P2: kode tidak
 * boleh berisi `if (chapter === 'ch01')`, jadi perilaku khusus per chapter
 * lewat validator bernama yang didaftarkan di sini, dirujuk lewat
 * `chapter.yaml`).
 */
import type { ResultFingerprints } from "../../sql/types";
import type { RunMeta, StepVerdict } from "../types";

export interface CustomValidatorContext {
  fp: ResultFingerprints;
  meta: RunMeta;
}

export type CustomValidatorFn = (
  params: Record<string, unknown> | undefined,
  ctx: CustomValidatorContext
) => StepVerdict;

const registry = new Map<string, CustomValidatorFn>();

export function registerCustomValidator(name: string, fn: CustomValidatorFn): void {
  registry.set(name, fn);
}

export function getCustomValidator(name: string): CustomValidatorFn | undefined {
  return registry.get(name);
}

export function clearCustomValidators(): void {
  registry.clear();
}
