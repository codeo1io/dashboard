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
    // wiki-writer is excluded from this fork entirely (never-absorb doctrine,
    // rm-252/259): its directory does not exist, so nothing needs an ignore.
    // '.slim/**' (rm-1510): .slim/ holds the opt-in cloned dependency-source
    // mirrors (.slim/clonedeps/repos/*), each carrying its OWN eslint config
    // needing plugins this repo does not install — without this ignore, any
    // provisioned mirror derails `bun run lint` with an unrelated "could not
    // find plugin" configuration error. The one tracked file under .slim/
    // (clonedeps.json) is JSON, so the ignore costs no lint coverage.
    ignores: [
      'docs/plans/**',
      'docs/solutions/**',
      'docs/brainstorms/**',
      'web/**',
      '.agents/**',
      '.opencode/**',
      '.slim/**',
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
