import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-1984: `.env.example` documents the same environment-variable surface as
 * the README Configuration table (which test/env-docs-guard.test.ts already
 * pins to the code). Two file-level guards beat one: README ↔ src drift and
 * .env.example ↔ README drift are both caught before an operator copies a
 * stale template.
 *
 * Fails when a key is documented in `.env.example` but absent from the README
 * table, or present in the README table but missing from `.env.example`.
 */
const repoRoot = process.cwd()

/** Keys documented in .env.example (uncommented `NAME=` and `#NAME=` rows alike). */
function envExampleKeys(): Set<string> {
  const text = readFileSync(resolve(repoRoot, '.env.example'), 'utf8')
  const keys = new Set<string>()
  for (const line of text.split('\n')) {
    const match = /^#?\s*([A-Z][A-Z0-9_]*)\s*=/.exec(line)
    if (match?.[1] !== undefined) keys.add(match[1])
  }
  return keys
}

/** Keys listed as rows in the README "Environment variables" table. */
function readmeEnvTableKeys(): Set<string> {
  const text = readFileSync(resolve(repoRoot, 'README.md'), 'utf8')
  const start = text.indexOf('### Environment variables')
  expect(start).toBeGreaterThanOrEqual(0)
  const rest = text.slice(start)
  const end = rest.indexOf('\n### ', 1)
  const section = end === -1 ? rest : rest.slice(0, end)
  const keys = new Set<string>()
  for (const match of section.matchAll(/^\| `([A-Z][A-Z0-9_]*)` \|/gm)) {
    if (match?.[1] !== undefined) keys.add(match[1])
  }
  return keys
}

describe('.env.example ↔ README Configuration sync (rm-1984)', () => {
  it('documents exactly the README env table — no stale template rows', () => {
    const example = envExampleKeys()
    const table = readmeEnvTableKeys()
    expect(table.size).toBeGreaterThan(0)
    expect([...example].sort()).toEqual([...table].sort())
  })
})
