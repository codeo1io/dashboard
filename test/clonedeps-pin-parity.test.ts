import {readFileSync} from 'node:fs'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-1521 (2026-10-18): standing pin-parity guard. The 2026.10.43 adoption merge left three
// artifacts disagreeing on the fro-bot/agent pin — fro-bot.yaml v0.122.3 (the real CI pin),
// .slim/clonedeps.json v0.78.0 (the machine-readable manifest tools trust), AGENTS.md v0.122.1
// (the human doc) — so any agent following the manifest cloned gateway/runtime code ~44 minors
// stale. This guard fails on any future three-way drift.
//
// rm-1518 companion tripwire: the same adoption merge silently reverted the Fro Bot
// secret-presence gate (the fork has no FRO_BOT_PAT secret, so scheduled runs fail red instead
// of skipping green). The gate was re-restored 2026-10-18; the second describe block trips if a
// future absorb drops it again — the exact silent-revert class this repo has now suffered
// twice (the 2026.10.43 adoption merge, and the 2026-10-15 tip-merge file drop of rm-877).

const repoRoot = process.cwd()

function read(path: string): string {
  return readFileSync(`${repoRoot}/${path}`, 'utf8')
}

describe('clonedeps pin parity (rm-1521)', () => {
  it('fro-bot.yaml, .slim/clonedeps.json, and AGENTS.md agree on the fro-bot/agent pin', () => {
    const workflow = read('.github/workflows/fro-bot.yaml')
    const workflowPin = /fro-bot\/agent@[0-9a-f]{40} # (v\d+\.\d+\.\d+)/.exec(workflow)?.[1]
    expect(workflowPin, 'fro-bot.yaml pins fro-bot/agent with a version comment').toBeDefined()

    const manifest = JSON.parse(read('.slim/clonedeps.json')) as {
      dependencies: {resolvedVersion: string}[]
    }
    expect(manifest.dependencies.length).toBeGreaterThan(0)
    for (const dependency of manifest.dependencies) {
      expect(dependency.resolvedVersion).toBe(workflowPin)
    }

    const agents = read('AGENTS.md')
    const agentsPin = /CI-pinned\s+tag `(v\d+\.\d+\.\d+)`/.exec(agents)?.[1]
    expect(agentsPin, 'AGENTS.md documents the CI-pinned tag').toBe(workflowPin)
  })
})

describe('fro-bot secret-presence gate (rm-1518)', () => {
  it('the 2026.10.43 adoption revert of the gate cannot silently recur', () => {
    // Writing a `${{ }}` expression literally in a normal string trips eslint's
    // no-template-curly-in-string; assemble the opener from unicode escapes instead.
    const ghaExprOpen = '\u0024\u007B\u007B'
    const workflow = read('.github/workflows/fro-bot.yaml')
    expect(workflow).toContain(`HAS_FRO_BOT_PAT: ${ghaExprOpen} secrets.FRO_BOT_PAT != '' }}`)
    expect(workflow).toContain("env.HAS_FRO_BOT_PAT == 'false'")
    const gatedSteps = workflow.match(/env\.HAS_FRO_BOT_PAT == 'true'/g) ?? []
    expect(gatedSteps.length).toBeGreaterThanOrEqual(3)
  })
})
