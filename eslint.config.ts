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
    // ROADMAP.md is a bot-managed generated artifact — the hermes-autonomy
    // roadmap-sync renderer rewrites it wholesale (same class as the doc trees
    // above). Renders carry trailing whitespace and pruned def lines by
    // construction, so repo-side lint demands regress on every render (48
    // chronic errors at 2026-10-15 HEAD), and markdownlint's paragraph-length
    // pass on this one file has pushed a single file past the CI Lint job's
    // 35-min ceiling. The render censuses eslint would carry are frozen
    // instead in test/roadmap-render-guard.test.ts.
    ignores: [
      'docs/plans/**',
      'docs/solutions/**',
      'docs/brainstorms/**',
      'web/**',
      '.agents/**',
      '.opencode/**',
      'ROADMAP.md',
    ],
    typescript: {
      tsconfigPath: './tsconfig.json',
      // Enforce Node 24 strip-only TypeScript compatibility: rejects parameter properties,
      // enums, namespaces, and import aliases at lint time, before they surface as
      // ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX at runtime.
      erasableSyntaxOnly: true,
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
