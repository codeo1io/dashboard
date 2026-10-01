/**
 * Floors guard (rm-284, run 4334b758, 2026-10-01): pins the
 * pnpm-workspace.yaml override LOWER bounds at or above the first patched
 * line for the four advisory-stricken transitives —
 *
 * - brace-expansion (recursion-DoS pair GHSA-qhr7-859c-m2p7 /
 *   GHSA-6j4f-fj2g-mc7p, patched 2.1.6/2.1.5 + 5.0.11/5.0.10)
 * - fast-uri (GHSA-qw65-cvwx-89v3 / GHSA-58mr-gqgx-xq4g, patched 3.1.7+)
 * - undici (GHSA-8436-99hf-9mmv + the CRLF/header set, patched 7.29.1)
 *
 * This pins SECURITY, not currency: the guard fails if a floor drops below
 * the first patched line, and passes any raise above it. That is exactly the
 * regression that matters here — the upstream Renovate dashboard (issue #8)
 * was, at research time, proposing cap-widening merges that keep the
 * vulnerable lower bounds (2.1.2 / 5.0.7 / 3.1.5 / 7.29.0), and an absorb of
 * such a merge would otherwise silently re-admit all 19 audited advisories.
 * A deliberate floor move edits this table in the same commit.
 */
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'
import {parse} from 'yaml'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

interface WorkspaceShape {
  overrides?: Record<string, unknown>
}

const workspace = parse(readFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'utf8')) as WorkspaceShape
const overrides = workspace.overrides ?? {}

/** First patched line per advisory-stricken transitive (the floor, not the pin). */
const PATCHED_FLOORS: Readonly<Record<string, string>> = {
  'brace-expansion@2': '2.1.7',
  'brace-expansion@5': '5.0.12',
  'fast-uri@3': '3.1.8',
  'undici@7': '7.29.1',
}

/** Extract the `>=x.y.z` lower bound of an override range like `'>=2.1.7 <3.0.0'`. */
function overrideLowerBound(range: unknown): string | null {
  if (typeof range !== 'string') return null
  const match = /^>=\s*(\d+(?:\.\d+)*)/.exec(range.trim())
  return match?.[1] ?? null
}

/** Numeric dotted-version compare (no semver syntax needed for these floors). */
function compareDotted(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const delta = (left[i] ?? 0) - (right[i] ?? 0)
    if (delta !== 0) return delta
  }
  return 0
}

describe('pnpm-workspace override floors (rm-284 security floors)', () => {
  it('declares an override for every advisory-stricken transitive', () => {
    for (const key of Object.keys(PATCHED_FLOORS)) {
      expect(overrides[key], `override ${key} must exist in pnpm-workspace.yaml`).toBeDefined()
    }
  })

  it('every floor is a bounded `>=lower <cap` range string, not a bare pin', () => {
    for (const [key, value] of Object.entries(overrides)) {
      if (!(key in PATCHED_FLOORS)) continue
      expect(typeof value, `override ${key} must be a string range`).toBe('string')
      expect((value as string).trim(), `override ${key} must be a bounded range`).toMatch(/^>=\d[\d.]*\s*<\d[\d.]*$/)
    }
  })

  for (const [key, patched] of Object.entries(PATCHED_FLOORS)) {
    it(`floor for ${key} stays at or above the first patched line ${patched}`, () => {
      const lower = overrideLowerBound(overrides[key])
      expect(lower, `override ${key} must carry a '>=x.y.z' lower bound`).not.toBeNull()
      expect(
        compareDotted(lower as string, patched),
        `${key} floor ${lower} must be >= ${patched} (first patched line)`,
      ).toBeGreaterThanOrEqual(0)
    })
  }
})
