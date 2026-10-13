import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

import {OPERATOR_CONTRACT_VERSION} from '../src/gateway/operator-contract/version.ts'

// rm-1015 (cycle:2 batch, run b2edfd096e5d): the 2026-10-12 pin-advance PR #612
// bumped .github/workflows/fro-bot.yaml to fro-bot/agent v0.121.0 — a gateway
// that speaks operator contract 1.10.0 — while every parser pin in this repo
// still said 1.9.0. Nothing reddened: the workflow pin, the server-side
// OPERATOR_CONTRACT_VERSION, and the vendored browser PINNED_CONTRACT_VERSION
// drifted apart with no test watching. This tripwire asserts the triad is
// consistent via an OFFLINE fixture map (release tag -> contract version), so
// it never needs network access. A pin-advance PR is the map's only legitimate
// update path: when the workflow pin moves to a release whose gateway speaks a
// new contract version, the map and BOTH pins must move in the same change.

const repoRoot = process.cwd()

// Offline fixture map: fro-bot/agent release tag -> the gateway operator
// contract version it speaks (raw packages/gateway/src/operator-contract/
// version.ts at each tag, verified 2026-10-13). Old entries stay frozen so the
// map also documents the history a pin revert would re-enter.
const RELEASE_CONTRACT_MAP: Readonly<Record<string, string>> = {
  'v0.119.1': '1.9.0',
  'v0.120.0': '1.10.0',
  'v0.121.0': '1.10.0',
} as const

/** The `# vX.Y.Z` comment pin on the fro-bot/agent use in the CI workflow. */
function readWorkflowAgentPin(): string {
  const workflow = readFileSync(resolve(repoRoot, '.github/workflows/fro-bot.yaml'), 'utf8')
  const match = workflow.match(/fro-bot\/agent@[0-9a-f]{7,40}\s*#\s*(v\d+\.\d+\.\d+)/)
  if (match === null) {
    throw new Error('no fro-bot/agent pin comment found in .github/workflows/fro-bot.yaml')
  }
  return match[1] ?? ''
}

/** The vendored browser-client pin, extracted from source (no import: it is a plain script). */
function readVendoredPinnedContractVersion(): string {
  const vendored = readFileSync(resolve(repoRoot, 'public/operator-stream.js'), 'utf8')
  const match = vendored.match(/export const PINNED_CONTRACT_VERSION = '([^']+)'/)
  if (match === null) {
    throw new Error('no PINNED_CONTRACT_VERSION export found in public/operator-stream.js')
  }
  return match[1] ?? ''
}

describe('operator contract version truth (rm-987)', () => {
  it('workflow agent pin is present in the offline release->contract map', () => {
    const pin = readWorkflowAgentPin()
    expect(RELEASE_CONTRACT_MAP[pin], `update RELEASE_CONTRACT_MAP with ${pin} when advancing the pin`).toBeDefined()
  })

  it('server-side OPERATOR_CONTRACT_VERSION matches the pinned release contract', () => {
    expect(OPERATOR_CONTRACT_VERSION).toBe(RELEASE_CONTRACT_MAP[readWorkflowAgentPin()])
  })

  it('vendored PINNED_CONTRACT_VERSION matches the pinned release contract', () => {
    expect(readVendoredPinnedContractVersion()).toBe(RELEASE_CONTRACT_MAP[readWorkflowAgentPin()])
  })

  it('the two in-repo pins agree with each other', () => {
    expect(readVendoredPinnedContractVersion()).toBe(OPERATOR_CONTRACT_VERSION)
  })
})
