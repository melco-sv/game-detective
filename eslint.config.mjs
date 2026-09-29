import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

/**
 * Aturan batas lapisan (docs/02-arsitektur.md §10, prinsip P5):
 * `engine/` (domain, TS murni) tidak boleh bergantung pada React, Next.js,
 * Dexie, atau `infra/`. Ini menjaga domain bisa diuji di Node dan dipakai
 * ulang di server (Edge Function `submit-score`, v1).
 */
const boundariesConfig = {
  plugins: { boundaries },
  settings: {
    "boundaries/include": ["src/**/*.ts", "src/**/*.tsx"],
    "boundaries/elements": [
      { type: "engine", pattern: "src/engine/*" },
      { type: "infra", pattern: "src/infra/*" },
      { type: "stores", pattern: "src/stores/*" },
      { type: "features", pattern: "src/features/*" },
      { type: "app", pattern: "src/app/*" },
      { type: "components", pattern: "src/components/*" },
    ],
  },
  rules: {
    "boundaries/dependencies": [
      "error",
      {
        default: "allow",
        policies: [
          {
            from: { element: { type: "engine" } },
            disallow: {
              to: { element: { types: { anyOf: ["infra", "stores", "features", "app", "components"] } } },
            },
            message:
              "src/engine adalah domain TS murni: tidak boleh mengimpor infra/stores/features/app/components (lihat 02-arsitektur §10, P5).",
          },
        ],
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        paths: [
          { name: "react", message: "src/engine tidak boleh bergantung pada React (P5)." },
          { name: "next", message: "src/engine tidak boleh bergantung pada Next.js (P5)." },
          { name: "dexie", message: "src/engine tidak boleh bergantung pada Dexie (P5)." },
        ],
      },
    ],
  },
};

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "public/generated/**",
      "public/workers/**",
      "playwright-report/**",
      "test-results/**",
      ".secrets/**",
    ],
  },
  ...nextCoreWebVitals,
  ...tseslint.configs.recommended,
  {
    files: ["src/engine/**/*.ts"],
    ...boundariesConfig,
  },
];

export default eslintConfig;
