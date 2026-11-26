import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * AGENTS.md ↔ workflow tool-pin parity guard (docs-truth guard family,
 * 2026-11-26, scoped-autonomy run a5638cbe35ec — "reconcile README/ROADMAP
 * with shipped behavior").
 *
 * The drift class this pins: AGENTS.md's CI Design Check bullet claimed
 * `impeccable@4.6.0` while `.github/workflows/main.yaml` actually pinned
 * 4.9.0, then 4.9.2, then 4.10.0 across absorb cycles — re-discovered by
 * three repository-maintenance assess runs without a cure, because nothing
 * failed when only one side moved. Same family as env-docs-guard
 * (rm-214/rm-287), endpoint-parity-guard (rm-556), and
 * workflow-hardening-guard (rm-1450/rm-1437): docs drift is bidirectional,
 * so this guard fails when either surface's pin set moves alone.
 *
 * The comparator runs on explicit inputs, so the mismatch proof below is the
 * same code path the live-direction assertions use: a deliberate fixture
 * pair — the exact 4.6.0-vs-4.10.0 drift that minted this guard — is proven
 * to trip it in both directions.
 */
const agentsPath = join(process.cwd(), 'AGENTS.md')
const workflowPath = join(process.cwd(), '.github', 'workflows', 'main.yaml')

/** Every `impeccable@<major.minor.patch>` pin a surface names. */
function pinsOf(text: string): string[] {
  return text.match(/impeccable@\d+\.\d+\.\d+/g) ?? []
}

/** One line per pin one surface names and the other does not (both directions). */
function pinDiff(agentsPins: string[], workflowPins: string[]): string[] {
  const workflowSet = new Set(workflowPins)
  const agentsSet = new Set(agentsPins)
  return [
    ...agentsPins.filter(pin => !workflowSet.has(pin)).map(pin => `AGENTS.md names ${pin} but .github/workflows/main.yaml does not`),
    ...workflowPins.filter(pin => !agentsSet.has(pin)).map(pin => `.github/workflows/main.yaml pins ${pin} but AGENTS.md does not`),
  ]
}

function readSurface(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`tool-pin surface missing: ${path} — surface renamed or moved; update this guard`)
  }
  return readFileSync(path, 'utf8')
}

describe('toolpin-parity-guard (AGENTS.md ↔ workflow impeccable pins)', () => {
  it('AGENTS.md pin claims match the CI Design Check pins they document', () => {
    const diff = pinDiff(pinsOf(readSurface(agentsPath)), pinsOf(readSurface(workflowPath)))
    expect(
      diff.join('\n'),
      'AGENTS.md and .github/workflows/main.yaml disagree on the impeccable pin — bump them together (AGENTS.md CI Design Check bullet + the Design Check step)',
    ).toBe('')
  })

  it('both surfaces name at least one impeccable pin (the guard cannot go vacuous)', () => {
    expect(
      pinsOf(readSurface(agentsPath)).length,
      'AGENTS.md no longer names any impeccable@ pin — the CI Design Check bullet moved or the tool was replaced; update this guard',
    ).toBeGreaterThan(0)
    expect(
      pinsOf(readSurface(workflowPath)).length,
      '.github/workflows/main.yaml no longer pins impeccable@ anywhere — the Design Check step moved or dropped the pin; update this guard',
    ).toBeGreaterThan(0)
  })

  it('the comparator trips on the historical mismatch, in both directions (red-first proof)', () => {
    // The exact drift that minted this guard: AGENTS.md stuck on 4.6.0
    // while the workflow had moved to 4.10.0.
    const diff = pinDiff(['impeccable@4.6.0'], ['impeccable@4.10.0'])
    expect(diff).toHaveLength(2)
    expect(diff[0]).toBe('AGENTS.md names impeccable@4.6.0 but .github/workflows/main.yaml does not')
    expect(diff[1]).toBe('.github/workflows/main.yaml pins impeccable@4.10.0 but AGENTS.md does not')
  })
})
