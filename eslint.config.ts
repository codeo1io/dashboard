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
    // operator-runtime.test.ts and operator-launch-submit.test.ts live in test/ but require DOM types (jsdom environment).
    // They are excluded from the root tsconfig (no DOM lib) and covered by web/tsconfig.json.
    // Override the parser project for these files so ESLint resolves them correctly.
    files: ['test/operator-runtime.test.ts', 'test/operator-launch-submit.test.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: false,
        project: './web/tsconfig.json',
      },
    },
  },
)
