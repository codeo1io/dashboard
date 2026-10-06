/**
 * rm-499 + rm-684 — curated security-floor guard for the pnpm-workspace.yaml
 * overrides block.
 *
 * rm-499 (fork-exclusion-guard pattern, rm-131): an override floor is a
 * RECORDED DECISION (advisory + minimum patched line), so regressing a floor
 * below its fixed line must be a red test at PR time, not silent lockfile
 * drift. The lockfile mirrors this block (pnpm-lock.yaml `overrides:`), but
 * the workspace file is the source of truth `pnpm install` re-derives it
 * from — this suite pins the source.
 *
 * rm-684 (2026-10-07, run 07fb9042 cycle:2 implement 01eaae87): coverage is
 * STRUCTURAL, not hand-listed. The rm-499 suite froze a four-selector
 * presence loop plus one value pin, so the floors the 2026-10-06 landing
 * added — source-map-js (GHSA-68fv-2mgg-jv7q, HIGH) and katex
 * (GHSA-238p-pmpm-9mq7, LOW) — sat in no list: deleting both left the suite
 * green (assess 8f0354d4 red-proof, reproduced at this anchor before the
 * rewrite). This suite parses the live overrides block with the yaml
 * dependency and checks it against the ADVISORY_FLOORS spec, so the guard
 * cannot go stale again:
 *   - the selector set must match the spec exactly: deleting a registered
 *     floor is red, and landing a NEW floor is red until its advisory
 *     minimum joins the spec (auto-arming — unregistered floors are refused);
 *   - every live value must keep the `>=x.y.z` curated form at or above its
 *     advisory patched line (floors may rise with the resolution tip, never
 *     sink below the line that patches every recorded advisory);
 *   - every floor with a recorded resolution ceiling must keep exactly that
 *     bound (an out-of-range force like katex 0.18 is a recorded decision).
 * Floor VALUES stay owned by their minting items (rm-276 convention): the
 * spec pins advisory lines and ceilings, not the current resolution tips.
 */
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'
import {parse} from 'yaml'

const workspace = readFileSync(resolve(process.cwd(), 'pnpm-workspace.yaml'), 'utf8')

interface WorkspaceShape {
  overrides?: Record<string, string>
}

/** One recorded advisory decision: patched line + optional resolution ceiling. */
interface AdvisoryFloor {
  /** Minimum version that patches every recorded advisory for the selector. */
  readonly min: readonly [number, number, number]
  /** Recorded resolution ceiling (the `<M.m.p` bound); absent = unbounded. */
  readonly ceiling?: readonly [number, number, number]
  /** Binding GHSA id documented beside the floor in the overrides block. */
  readonly advisory: string
}

/**
 * The advisory-floor spec. Sources: the GHSA rationale comments beside each
 * floor in pnpm-workspace.yaml. brace-expansion@5's comment cross-references
 * @2's advisories ("same three advisories on the v5 line"), so both lines
 * register the moderate that binds them.
 */
const ADVISORY_FLOORS: Readonly<Record<string, AdvisoryFloor>> = {
  // GHSA-q2hr-2g5m-vwhr (moderate) patched 2.1.7; highs 2.1.6/2.1.5 covered.
  'brace-expansion@2': {min: [2, 1, 7], ceiling: [3, 0, 0], advisory: 'GHSA-q2hr-2g5m-vwhr'},
  // Same advisory family on the v5 line; 5.0.12 is the line that covers all.
  'brace-expansion@5': {min: [5, 0, 12], ceiling: [6, 0, 0], advisory: 'GHSA-q2hr-2g5m-vwhr'},
  // GHSA-hrr3-gc8f-f4qj (moderate) forces 3.1.8; both highs patch at 3.1.7.
  'fast-uri@3': {min: [3, 1, 8], ceiling: [4, 0, 0], advisory: 'GHSA-hrr3-gc8f-f4qj'},
  // GHSA-82x6-q7mm-w9cf; >=4.2.0 is the patched line; no ceiling recorded.
  toml: {min: [4, 2, 0], advisory: 'GHSA-82x6-q7mm-w9cf'},
  // All ten npm-DB undici advisories patch at >=7.29.1 (highs
  // GHSA-rfgv-xxqx-mfg5 + GHSA-w293-vg96-wgc3); the live floor deliberately
  // sits at the 7.x tip 7.30.0 — the spec pins the advisory line, not the tip.
  'undici@7': {min: [7, 29, 1], ceiling: [8, 0, 0], advisory: 'GHSA-rfgv-xxqx-mfg5'},
  // GHSA-68fv-2mgg-jv7q (HIGH, event-loop DoS); 1.2.2 is the patched line.
  'source-map-js': {min: [1, 2, 2], ceiling: [2, 0, 0], advisory: 'GHSA-68fv-2mgg-jv7q'},
  // GHSA-238p-pmpm-9mq7 (LOW); 0.18.2 patched, and the <0.19.0 bound is the
  // recorded out-of-range force past micromark-extension-math's ^0.16 range.
  katex: {min: [0, 18, 2], ceiling: [0, 19, 0], advisory: 'GHSA-238p-pmpm-9mq7'},
}

/** Curated floor form: `>=x.y.z` with an optional ` <M.m.p` resolution bound. */
const FLOOR_FORM = /^>=(\d+)\.(\d+)\.(\d+)(?:\s+<(\d+)\.(\d+)\.(\d+))?$/

interface ParsedFloor {
  readonly min: readonly [number, number, number]
  readonly ceiling?: readonly [number, number, number]
}

function parseFloorValue(value: string): ParsedFloor | null {
  const match = value.match(FLOOR_FORM)
  if (!match) return null
  const min: [number, number, number] = [Number(match[1]), Number(match[2]), Number(match[3])]
  if (match[4] === undefined || match[5] === undefined || match[6] === undefined) return {min}
  return {min, ceiling: [Number(match[4]), Number(match[5]), Number(match[6])]}
}

/** Tuple weight (major, minor, patch) for ordered version compares. */
function weight([major = 0, minor = 0, patch = 0]: readonly [number, number, number]): number {
  return major * 1_000_000 + minor * 1_000 + patch
}

const parsedWorkspace = parse(workspace) as WorkspaceShape
const liveFloors = new Map(Object.entries(parsedWorkspace.overrides ?? {}))

describe('curated override floors (rm-499, rm-684)', () => {
  it('the overrides block carries exactly the registered advisory floors', () => {
    // Set equality in BOTH directions: a registered floor may not be deleted,
    // and a floor may not land unregistered — a fresh selector arms this
    // guard red until its advisory minimum joins ADVISORY_FLOORS.
    const liveSelectors = [...liveFloors.keys()].sort()
    const registered = Object.keys(ADVISORY_FLOORS).sort()
    expect(liveSelectors, 'live overrides selectors vs registered advisory floors').toEqual(registered)
  })

  it('every floor keeps the curated form at or above its advisory patched line', () => {
    for (const [selector, value] of liveFloors) {
      const spec = ADVISORY_FLOORS[selector]
      expect(spec, `${selector} is not registered in the advisory-floor spec`).toBeDefined()
      if (!spec) continue
      const floor = parseFloorValue(value)
      expect(floor, `${selector} floor '${value}' must keep the '>=x.y.z <M.m.p' curated form`).not.toBeNull()
      if (!floor) continue
      // Floors may rise with the resolution tip but never sink below the
      // advisory's patched line (the line that patches every recorded GHSA).
      expect(
        weight(floor.min),
        `${selector} floor may not sink below ${spec.min.join('.')}`,
      ).toBeGreaterThanOrEqual(weight(spec.min))
    }
  })

  it('every bounded floor keeps its recorded resolution ceiling', () => {
    for (const [selector, spec] of Object.entries(ADVISORY_FLOORS)) {
      if (!spec.ceiling) continue
      const floor = parseFloorValue(liveFloors.get(selector) ?? '')
      expect(floor, `${selector} floor is missing or malformed`).not.toBeNull()
      if (!floor) continue
      expect(floor.ceiling, `${selector} floor must keep an upper bound`).toBeDefined()
      if (!floor.ceiling) continue
      expect(weight(floor.ceiling), `${selector} ceiling must stay <${spec.ceiling.join('.')}`).toBe(weight(spec.ceiling))
    }
  })

  it('every registered advisory is documented beside the floors (house style)', () => {
    // rm-276 convention: the floor's justification travels with the decision.
    for (const spec of Object.values(ADVISORY_FLOORS)) {
      expect(workspace, `${spec.advisory} rationale must stay in the overrides block`).toContain(spec.advisory)
    }
  })
})
