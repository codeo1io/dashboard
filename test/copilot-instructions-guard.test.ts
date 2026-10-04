import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-612: .github/copilot-instructions.md must describe the real two-part
 * architecture — a strip-only Hono server under `src/` PLUS the Vite +
 * React 19 + Tailwind v4 PWA client under `web/`, built via `pnpm build:web`.
 *
 * The file carried the pre-PWA "a single Hono + JSX SSR Node 24 process, no
 * build step" claim for months after the PWA rebuild (db74679, 2026-06-24),
 * steering every Copilot suggestion away from the documented pretest
 * web/dist-404 trap. This guard makes that staleness class machine-checked:
 * the architecture markers below must stay present, and the stale single-
 * process claim must stay absent.
 */
const repoRoot = process.cwd()

describe('copilot instructions architecture truth (rm-612)', () => {
  const text = readFileSync(resolve(repoRoot, '.github/copilot-instructions.md'), 'utf8')

  it('describes the web/ client as part of the repo', () => {
    expect(text).toMatch(/`web\/`/)
  })

  it('names the client build entrypoint pnpm build:web', () => {
    expect(text).toContain('pnpm build:web')
  })

  it('no longer claims a single SSR process with no build step', () => {
    expect(text).not.toContain('JSX SSR')
    expect(text).not.toMatch(/no\s+build step/i)
  })
})
