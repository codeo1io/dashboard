/**
 * rm-499 — curated security-floor guard for the package.json `overrides`
 * block (Bun form; the 2026.10.48 adoption of upstream #648 moved the
 * overrides source of truth from pnpm-workspace.yaml into package.json,
 * which `bun install` re-derives the lock from).
 *
 * Follows the fork-exclusion-guard pattern (rm-131): an override floor is a
 * RECORDED DECISION (advisory + minimum patched line), so regressing a floor
 * below its fixed line must be a red test at PR time, not silent lockfile
 * drift. bun.lock mirrors this block, but package.json is the source of
 * truth — this suite pins the source.
 */
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as {overrides?: Record<string, string>}

/** Extracts the value string of an overrides entry, e.g. `fast-uri@3`. */
function overrideFloor(selector: string): string | null {
  return pkg.overrides?.[selector] ?? null
}

describe('curated override floors (rm-499, Bun overrides block)', () => {
  it('the overrides block exists in package.json', () => {
    expect(pkg.overrides).toBeDefined()
  })

  it('fast-uri@3 floor is at least the GHSA-58mr-gqgx-xq4g parity line 3.1.8', () => {
    const floor = overrideFloor('fast-uri@3')
    expect(floor).not.toBeNull()
    const lower = floor?.match(/^>=\s*(\d+)\.(\d+)\.(\d+)\s+</)
    expect(lower, 'floor keeps the ">=x.y.z <major" curated form').not.toBeNull()
    const [maj = 0, min = 0, patch = 0] = (lower?.slice(1) ?? []).map(Number)
    // Tuple compare against (3, 1, 8): the floor may rise (3.1.9+ when
    // published) but must never regress below the advisory's fixed line.
    expect(maj * 1_000_000 + min * 1_000 + patch).toBeGreaterThanOrEqual(3_001_008)
    expect(floor).toContain('<4.0.0')
  })

  it('the curated block keeps its recorded selectors present (presence-only, values owned by their mints)', () => {
    // Presence pins only: each remaining floor's VALUE is owned by the item
    // that minted it (brace-expansion/undici/toml/katex), so this suite does
    // not freeze their lines — it only fails if a selector disappears entirely.
    for (const selector of ['brace-expansion@2', 'brace-expansion@5', 'toml@4', 'undici@7', 'katex@0']) {
      expect(overrideFloor(selector), `${selector} floor missing from the overrides block`).not.toBeNull()
    }
  })

  it('undici@7 floor stays at the published 7.x tip line the rm-499 decision recorded (>=7.30.0)', () => {
    const floor = overrideFloor('undici@7')
    expect(floor).not.toBeNull()
    const lower = floor?.match(/^>=\s*(\d+)\.(\d+)\.(\d+)\s+</)
    expect(lower).not.toBeNull()
    const [maj = 0, min = 0, patch = 0] = (lower?.slice(1) ?? []).map(Number)
    expect(maj * 1_000_000 + min * 1_000 + patch).toBeGreaterThanOrEqual(7_030_000)
  })

  it('brace-expansion@2 floor covers the binding GHSA-q2hr-2g5m-vwhr patched line 2.1.7', () => {
    const floor = overrideFloor('brace-expansion@2')
    expect(floor).not.toBeNull()
    const lower = floor?.match(/^>=\s*(\d+)\.(\d+)\.(\d+)\s+</)
    expect(lower).not.toBeNull()
    const [maj = 0, min = 0, patch = 0] = (lower?.slice(1) ?? []).map(Number)
    expect(maj * 1_000_000 + min * 1_000 + patch).toBeGreaterThanOrEqual(2_001_007)
  })
})
