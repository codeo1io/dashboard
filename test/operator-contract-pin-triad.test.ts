import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'
import {PINNED_CONTRACT_VERSION} from '../public/operator-stream.js'
import {OPERATOR_CONTRACT_VERSION} from '../src/gateway/operator-contract/version.ts'

/**
 * Contract-pin triad guard (rm-1015): the three places that each carry their own
 * copy of the operator-contract truth must agree before a batch can land green.
 *
 *   1. src/gateway/operator-contract/version.ts  — OPERATOR_CONTRACT_VERSION (server)
 *   2. public/operator-stream.js                 — PINNED_CONTRACT_VERSION (browser, fail-closed compare)
 *   3. .github/workflows/fro-bot.yaml:347        — the fro-bot/agent pin, whose deployed
 *      gateway speaks the published contract of that release
 *
 * PR #612 (d42b978) bumped leg 3 to v0.121.0 while legs 1–2 stayed '1.9.0': the pin
 * spoke 1.10.0, the repo parsed 1.9.0. Nothing tied the three together, so the split
 * landed green. This test is that tie: flipping any one leg fails the suite, so a
 * half-landed adoption is unmergeable.
 *
 * The tag -> published-contract map is an offline fixture (no network in CI). It is
 * seeded with the values probed by the 2026-10-13 assessment (run 6f039c58ed8d):
 *
 *   v0.119.1 -> 1.9.0    v0.120.0 -> 1.10.0    v0.121.0 -> 1.10.0
 *
 * When the workflow pin advances past the map, re-derive the new entry before
 * updating the pin: fetch the gateway's version.ts at that tag, e.g.
 *   gh api 'repos/fro-bot/agent/contents/packages/gateway/src/operator-contract/version.ts?ref=vX.Y.Z' \
 *     --jq '.content' | base64 -d
 * and add the probed literal here. An unknown tag fails this suite with that
 * instruction — the map is never guessed.
 */

const TEST_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(TEST_DIR, '..')
const WORKFLOW_PATH = join(REPO_ROOT, '.github', 'workflows', 'fro-bot.yaml')

/** Probed published OPERATOR_CONTRACT_VERSION per fro-bot/agent release tag. */
const TAG_TO_PUBLISHED_CONTRACT: Readonly<Record<string, string>> = Object.freeze({
  'v0.119.1': '1.9.0',
  'v0.120.0': '1.10.0',
  'v0.121.0': '1.10.0',
})

const WORKFLOW_AGENT_PIN_RE = /fro-bot\/agent@([0-9a-f]{40})\s*#\s*(v\d+\.\d+\.\d+)/
const WORKFLOW_AGENT_PIN_COUNT_RE = /fro-bot\/agent@[0-9a-f]{40}\s*#\s*v\d+\.\d+\.\d+/g

function readWorkflowAgentPin(): {sha: string; tag: string} {
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8')
  const match = WORKFLOW_AGENT_PIN_RE.exec(workflow)
  if (match === null) {
    throw new Error(
      'fro-bot.yaml carries no fro-bot/agent@<40-hex> # vX.Y.Z pin — the workflow pin leg cannot be checked',
    )
  }
  const sha = match[1]
  const tag = match[2]
  if (sha === undefined || tag === undefined) {
    throw new Error('fro-bot.yaml agent pin matched but its sha/tag captures are missing')
  }
  return {sha, tag}
}

describe('operator contract pin triad (rm-1015)', () => {
  it('the workflow pins exactly one fro-bot/agent release with a tag comment', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8')
    const pins = [...workflow.matchAll(WORKFLOW_AGENT_PIN_COUNT_RE)]
    expect(pins.length).toBe(1)
  })

  it('server literal, browser literal, and the pinned agent release all speak one contract', () => {
    const {tag} = readWorkflowAgentPin()
    const published: string | undefined = TAG_TO_PUBLISHED_CONTRACT[tag]

    if (published === undefined) {
      throw new Error(
        `fro-bot.yaml pins ${tag}, which is absent from TAG_TO_PUBLISHED_CONTRACT — probe the gateway's ` +
        'version.ts at that tag (see the header of this file) and seed the map before advancing the pin',
      )
    }

    expect(OPERATOR_CONTRACT_VERSION).toBe(published)
    expect(PINNED_CONTRACT_VERSION).toBe(published)
  })

  it('the server and browser literals agree with each other even before the pin leg is consulted', () => {
    expect(PINNED_CONTRACT_VERSION).toBe(OPERATOR_CONTRACT_VERSION)
  })
})
