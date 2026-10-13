import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {test} from 'vitest'

import {PINNED_CONTRACT_VERSION} from '../public/operator-stream.js'
import {OPERATOR_CONTRACT_VERSION} from '../src/gateway/operator-contract/version.ts'

/**
 * rm-980 — agent-pin ↔ operator-contract cross-check.
 *
 * The Fro Bot workflow pins the gateway image by tag comment
 * (`uses: fro-bot/agent@<sha> # v<X.Y.Z>`), while the dashboard vendors the
 * gateway's operator contract in TWO places (the server copy in
 * src/gateway/operator-contract/ and the browser client pin in
 * public/operator-stream.js). Nothing upstream keeps those three in step: on
 * 2026-10-12 the pin was bumped to a gateway release that speaks contract
 * 1.10.0 while both vendored copies still said 1.9.0 — every operator stream
 * would have fail-closed on drift at the next deployment. This test is the
 * mechanical guard that makes the split un-landable in silence.
 *
 * Maintenance contract: when the workflow pin is bumped to a new gateway
 * release, add that release here with (a) its tag commit sha and (b) the
 * OPERATOR_CONTRACT_VERSION at that tag (read via
 * `gh api repos/fro-bot/agent/contents/packages/gateway/src/operator-contract/version.ts?ref=v<X.Y.Z>`),
 * and update the vendored contract if the gateway's version moved. If the
 * contract moved, the vendored copy + browser pin move with it in the same
 * change — never leave this table ahead or behind.
 */

/**
 * Verified gateway releases: release → {tag commit sha, operator contract
 * version AT THAT TAG}. Every entry was confirmed first-hand against the
 * fro-bot/agent tags and contents API at recording time; do not edit an
 * existing entry, only append.
 */
const AGENT_RELEASE_CONTRACT: Readonly<Record<string, {readonly sha: string; readonly contract: string}>> = {
  // 2026-10-12 (run 34b40ee1 research/roadmap phases): tag v0.121.0 → commit
  // 50b5dd4…, contents API at the tag reports OPERATOR_CONTRACT_VERSION '1.10.0'
  // (push trigger kinds #1787 + session push health #1788). Adopted by the fork
  // via upstream #612 (d42b978).
  'v0.121.0': {
    sha: '50b5dd41297f8a928914006b8f8c872c4ab3bb14',
    contract: '1.10.0',
  },
}

const WORKFLOW_PATH = fileURLToPath(new URL('../.github/workflows/fro-bot.yaml', import.meta.url))
const PIN_PATTERN = /^\s*uses:\s*fro-bot\/agent@([\da-f]{40})\s*#\s*(v\d+\.\d+\.\d+)\s*$/gm

test('fro-bot workflow pins fro-bot/agent exactly once, by sha with a release comment', async () => {
  const workflow = await readFile(WORKFLOW_PATH, 'utf8')
  const pins = [...workflow.matchAll(PIN_PATTERN)]
  assert.equal(pins.length, 1, 'expected exactly one fro-bot/agent pin line in fro-bot.yaml')
  const [, sha, release] = pins[0]!
  assert.ok(sha !== undefined && release !== undefined)
})

test('the pinned agent release is recorded with its tag sha, and the sha matches the workflow pin', async () => {
  const workflow = await readFile(WORKFLOW_PATH, 'utf8')
  const pins = [...workflow.matchAll(PIN_PATTERN)]
  const [, sha, release] = pins[0]!
  const recorded = AGENT_RELEASE_CONTRACT[release!]
  assert.ok(
    recorded !== undefined,
    `gateway release ${release} is not recorded in AGENT_RELEASE_CONTRACT — record its tag sha and the contract version at that tag (see the maintenance contract in this file's header)`,
  )
  assert.equal(recorded.sha, sha, 'workflow pin sha does not match the recorded tag sha for this release')
})

test('the pinned agent release speaks exactly the vendored operator contract version', async () => {
  const workflow = await readFile(WORKFLOW_PATH, 'utf8')
  const pins = [...workflow.matchAll(PIN_PATTERN)]
  const [, , release] = pins[0]!
  const recorded = AGENT_RELEASE_CONTRACT[release!]
  assert.equal(
    recorded?.contract,
    OPERATOR_CONTRACT_VERSION,
    `the fro-bot.yaml pin points at ${release} (contract ${recorded?.contract}) but the vendored server contract is ${OPERATOR_CONTRACT_VERSION} — bump the vendored contract (src/gateway/operator-contract/*) together with the pin, or pin back to a matching release`,
  )
})

test('the server contract version and the browser client pin are identical', () => {
  assert.equal(
    PINNED_CONTRACT_VERSION,
    OPERATOR_CONTRACT_VERSION,
    'public/operator-stream.js PINNED_CONTRACT_VERSION drifted from src/gateway/operator-contract/version.ts — the browser client and server reader must speak one version',
  )
})
