/**
 * rm-421 — curated security-floor guard for the pnpm-workspace.yaml
 * overrides block.
 *
 * Follows the fork-exclusion-guard pattern (rm-131): an override floor is a
 * RECORDED DECISION (advisory + minimum patched line), so regressing a floor
 * below its fixed line must be a red test at PR time, not silent lockfile
 * drift. The lockfile mirrors this block (pnpm-lock.yaml `overrides:`), but
 * the workspace file is the source of truth `pnpm install` re-derives it
 * from — this suite pins the source.
 */
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

const workspace = readFileSync(resolve(process.cwd(), 'pnpm-workspace.yaml'), 'utf8')

/** Extracts the value string of an overrides entry, e.g. `fast-uri@3`. */
function overrideFloor(selector: string): string | null {
  // Selectors are fixed literals from this suite ('.' is their only
  // regex-special character), so a targeted escape beats a full class.
  const pattern = selector.replaceAll('.', String.raw`\.`)
  const match = workspace.match(new RegExp(`^  ${pattern}: '([^']+)'`, 'm'))
  return match?.[1] ?? null
}

describe('curated override floors (rm-421)', () => {
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

  it('the overrides block names the advisory beside the fast-uri floor (house style)', () => {
    // The toml entry documents its GHSA inline; fast-uri must too, so the
    // floor's justification travels with the decision.
    expect(workspace).toContain('GHSA-58mr-gqgx-xq4g')
  })

  it('the curated block keeps its recorded selectors present (presence-only, values owned by their mints)', () => {
    // Presence pins only: each remaining floor's VALUE is owned by the item
    // that minted it (brace-expansion/undici/toml), so this suite does not
    // freeze their lines — it only fails if a selector disappears entirely.
    for (const selector of ['brace-expansion@2', 'brace-expansion@5', 'toml', 'undici@7']) {
      expect(overrideFloor(selector), `${selector} floor missing from the overrides block`).not.toBeNull()
    }
  })
})
