import {defineConfig} from '@bfra.me/eslint-config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    name: '@fro-bot/dashboard',
    // AI-authored planning/solution docs (docs/plans, docs/solutions, docs/brainstorms)
    // are generated artifacts, not hand-authored source — exclude them from linting.
    // web/ is a Vite+React workspace with its own tsconfig — exclude it from the
    // backend's erasableSyntaxOnly config (full TS is valid there via Vite build).
    // .agents/ is a vendored shared-skill bundle (e.g. .agents/skills/impeccable) of
    // third-party .mjs/.md files — not our source; linting it reports tens of thousands
    // of errors.
    ignores: ['docs/plans/**', 'docs/solutions/**', 'docs/brainstorms/**', 'web/**', '.agents/**', '.opencode/**'],
    typescript: {
      tsconfigPath: './tsconfig.json',
      // Enforce Node 24 strip-only TypeScript compatibility: rejects parameter properties,
      // enums, namespaces, and import aliases at lint time, before they surface as
      // ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX at runtime.
      erasableSyntaxOnly: true,
    },
  },
  {
    // rm-682 (2026-10-06, cycle-1 batch): eslint-plugin-erasable-syntax-only
    // 0.6.0 added the export-aliases rule (flags CJS-style `export =`
    // assignments — a strip-only blind spot none of the four preset rules
    // cover). @bfra.me/eslint-config 0.54.0's erasableSyntaxOnly preset
    // predates it, so the rule is enabled HERE explicitly; proven present in
    // the resolved config via `pnpm exec eslint --print-config src/server.ts`.
    rules: {
      'erasable-syntax-only/export-aliases': 'error',
    },
  },
  {
    // rm-721 (2026-10-08, repository-maintenance cycle:1 run e0cd5af2ab82):
    // phantom-dependency lint for the shamefullyHoist workspace
    // (pnpm-workspace.yaml hoists every transitive to the root, so an
    // undeclared import resolves locally and breaks on any hoist-free
    // consumer). The import-x plugin is already registered by
    // @bfra.me/eslint-config 0.54.0 (proven via
    // `pnpm exec eslint --print-config src/server.ts`) but the preset leaves
    // this rule off, so it is enabled HERE explicitly, same pattern as
    // rm-682 above. Scope: every file this config lints (src/, test/,
    // scripts/, root config files — web/** is globally ignored by this config
    // and is type-checked via web/tsconfig.json in check-types instead).
    // Options: the defaults are correct for this single-package layout — the
    // nearest-package.json lookup resolves every linted file to the root
    // package.json (no nested package.json exists, verified), and devDeps are
    // allowed everywhere (the whole lint surface is dev surface); type-only
    // imports stay unchecked (includeTypes defaults off — runtime/value
    // imports are the phantom class shamefullyHoist masks). The rule's first
    // live catch fired RED on line 2 of THIS file: typescript-eslint was
    // imported since 2026-09 yet never declared (resolved only via the
    // hoist) — hence the paired devDep promotions in package.json:
    // eslint-plugin-import-x@4.17.1 (rule now load-bearing here) and
    // typescript-eslint@8.70.1 (the catch).
    rules: {
      'import-x/no-extraneous-dependencies': 'error',
    },
  },
  {
    // operator-runtime.test.ts lives in test/ but requires DOM types (jsdom environment).
    // It is excluded from the root tsconfig (no DOM lib) and covered by web/tsconfig.json.
    // Override the parser project for this file so ESLint resolves it correctly.
    files: ['test/operator-runtime.test.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: false,
        project: './web/tsconfig.json',
      },
    },
  },
)
