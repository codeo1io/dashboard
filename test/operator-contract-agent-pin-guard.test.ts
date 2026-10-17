import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

import {
  ACCEPTED_OPERATOR_CONTRACT_VERSIONS,
  OPERATOR_CONTRACT_VERSION,
} from '../src/gateway/operator-contract/version.ts'

// rm-873 rider (independent-review F5): the agent workflow pin and the accepted
// contract version set must move together. `.github/workflows/fro-bot.yaml`
// pins fro-bot/agent at a digest; that agent's gateway serves one operator
// contract version; this repo's reader accepts the 1.6.0..pin additive set.
// Nothing on the wire couples the pin to the set, so the coupling lives here:
// a pin bump that forgets to extend ACCEPTED_OPERATOR_CONTRACT_VERSIONS (or
// bump OPERATOR_CONTRACT_VERSION) recreates exactly the outage rm-873 cured —
// the reader failing closed against its own pinned gateway. The map below is
// hand-maintained per pin; an unmapped pin fails with instructions rather
// than passing silently.

const repoRoot = process.cwd()

/** fro-bot/agent version -> the operator contract version its gateway serves. */
const AGENT_PIN_CONTRACT_VERSIONS: Readonly<Record<string, string>> = {
  // The workflow pin. v0.122.2's gateway serves operator contract 1.11.0
  // (verified against the upstream tag at review 2026-10-17).
  '0.122.2': '1.11.0',
  // Verified-digest tag for the rm-879 rider whose pin bump is DEFERRED to
  // the landing gate (re-anchor fro-bot.yaml + AGENTS.md together). Its
  // gateway serves the same operator contract 1.11.0.
  '0.122.3': '1.11.0',
}

const AGENT_PIN_PATTERN =
  /^ *uses: fro-bot\/agent@(?<digest>[0-9a-f]{40}) # v(?<version>\d+\.\d+\.\d+)$/m

function readAgentPin(): {digest: string; version: string} {
  const workflow = readFileSync(resolve(repoRoot, '.github/workflows/fro-bot.yaml'), 'utf8')
  const match = AGENT_PIN_PATTERN.exec(workflow)
  if (match?.groups === undefined) {
    throw new Error(
      'fro-bot.yaml must pin the agent as `uses: fro-bot/agent@<sha1-digest> # v<version>` — this guard cannot read the pin',
    )
  }
  return {digest: match.groups.digest as string, version: match.groups.version as string}
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const delta = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (delta !== 0) return delta
  }
  return 0
}

function escapeRegExp(value: string): string {
  return value.replaceAll('.', String.raw`\.`)
}

describe('agent pin <-> accepted operator contract coupling (rm-873)', () => {
  const pin = readAgentPin()
  const served = AGENT_PIN_CONTRACT_VERSIONS[pin.version] ?? ''

  it('the pinned agent version is mapped to the contract version its gateway serves', () => {
    expect(
      served,
      `fro-bot.yaml pins agent v${pin.version} but AGENT_PIN_CONTRACT_VERSIONS has no entry — look up the contract version that agent's gateway serves, record it in the map, and extend ACCEPTED_OPERATOR_CONTRACT_VERSIONS if it is new`,
    ).not.toBe('')
  })

  it('the pinned agent contract version is inside the accepted set', () => {
    expect(
      ACCEPTED_OPERATOR_CONTRACT_VERSIONS.has(served),
      `the pinned agent (v${pin.version}) serves contract ${served}, which ACCEPTED_OPERATOR_CONTRACT_VERSIONS does not accept — the reader would fail closed against its own pinned gateway`,
    ).toBe(true)
  })

  it('the accepted-set top and OPERATOR_CONTRACT_VERSION both match the pinned agent', () => {
    const top = [...ACCEPTED_OPERATOR_CONTRACT_VERSIONS].sort(compareVersions).at(-1)
    expect(top, 'the accepted set must top out at the pinned agent contract version').toBe(served)
    expect(
      OPERATOR_CONTRACT_VERSION,
      'OPERATOR_CONTRACT_VERSION must move with the agent pin',
    ).toBe(served)
  })

  it('AGENTS.md records the workflow digest byte-for-byte (rm-880 re-derivation rule)', () => {
    const agents = readFileSync(resolve(repoRoot, 'AGENTS.md'), 'utf8')
    expect(
      agents,
      `AGENTS.md must restate the pinned agent digest ${pin.digest} exactly — a mistyped digest in the restated note silently rots (the 2026-10-17 review-fix pass caught exactly this digit-transposition class in ROADMAP.md)`,
    ).toMatch(new RegExp(String.raw`digest ${pin.digest}\)`))
  })

  it('AGENTS.md states the live pin and the contract it serves (rm-880 re-derivation rule)', () => {
    const agents = readFileSync(resolve(repoRoot, 'AGENTS.md'), 'utf8')
    expect(
      agents,
      'AGENTS.md Cloned Dependency Source must state the pinned agent version',
    ).toMatch(new RegExp(`pins the agent at v${escapeRegExp(pin.version)}[^0-9]`))
    expect(
      agents,
      'AGENTS.md must state the contract version the pin serves',
    ).toMatch(new RegExp(`gateway serves operator contract ${escapeRegExp(served)}`))
  })
})
