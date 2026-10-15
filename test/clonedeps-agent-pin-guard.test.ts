/**
 * rm-1018: clonedeps / AGENTS.md / workflow-pin version-truth guard.
 *
 * Four places claim "which fro-bot/agent revision is this repo aligned with":
 *   1. `.slim/clonedeps.json` resolvedVersion/ref for the fro-bot/agent dependencies
 *   2. the `Cloned Dependency Source` prose in AGENTS.md
 *   3. the `fro-bot/agent@<sha> # vX` action pin in .github/workflows/fro-bot.yaml
 * They drifted 44 minors apart once (docs v0.78.0 vs pin v0.122.0, 2026-10-14);
 * this guard reddens the moment any two disagree again.
 *
 * Also pins the AGENTS.md Fro Bot workflow-state claim to the re-probed live
 * state (workflows active, 2026-10-14) instead of the stale `disabled_manually`
 * prose that sat uncorrected since 2026-09-19.
 */

import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

describe('clonedeps agent-pin version truth (rm-1018)', () => {
  it('.slim/clonedeps.json pins one fro-bot/agent revision across both dependency entries', () => {
    const manifest = JSON.parse(readRepoFile('.slim/clonedeps.json')) as {
      dependencies?: {name?: string; repoUrl?: string; resolvedVersion?: string; ref?: string}[]
    }
    const agentDeps = (manifest.dependencies ?? []).filter(dep => (dep.repoUrl ?? '').includes('fro-bot/agent'))
    expect(agentDeps.length).toBeGreaterThanOrEqual(2)
    const versions = new Set(agentDeps.flatMap(dep => [dep.resolvedVersion, dep.ref]))
    expect(versions.size).toBe(1)
  })

  it('the clonedeps version agrees with the AGENTS.md prose and the fro-bot.yaml pin', () => {
    const manifest = JSON.parse(readRepoFile('.slim/clonedeps.json')) as {
      dependencies?: {repoUrl?: string; resolvedVersion?: string}[]
    }
    const manifestVersion = (manifest.dependencies ?? []).find(dep => (dep.repoUrl ?? '').includes('fro-bot/agent'))
      ?.resolvedVersion
    expect(manifestVersion).toMatch(/^v\d+\.\d+\.\d+$/)

    const agents = readRepoFile('AGENTS.md')
    const proseMatch = agents.match(/fro-bot__agent\/` — `fro-bot\/agent` at `(v\d+\.\d+\.\d+)`/)
    expect(proseMatch).not.toBeNull()
    expect(proseMatch?.[1]).toBe(manifestVersion)

    const workflow = readRepoFile('.github/workflows/fro-bot.yaml')
    const pinMatches = [...workflow.matchAll(/fro-bot\/agent@[0-9a-f]+ # (v\d+\.\d+\.\d+)/g)].map(m => m[1])
    expect(pinMatches.length).toBeGreaterThanOrEqual(1)
    for (const pin of pinMatches) {
      expect(pin).toBe(manifestVersion)
    }
  })

  it('AGENTS.md no longer claims the Fro Bot workflow is disabled_manually (re-probed active 2026-10-14)', () => {
    const agents = readRepoFile('AGENTS.md')
    expect(agents).not.toMatch(/workflow[^.]*disabled_manually|`disabled_manually`[^.]*workflow/)
    // The replacement claim must carry a live re-probe date, not the stale 2026-09-19 one.
    const stateClaim = agents.match(/The `Fro Bot` workflow on this fork is[^.]*?\(re-probed (\d{4}-\d{2}-\d{2})\)/)
    expect(stateClaim).not.toBeNull()
    const reprobeDate = stateClaim?.[1] ?? ''
    expect(reprobeDate >= '2026-10-14').toBe(true)
    // The FRO_BOT_PAT provisioning warning must survive the correction: the repo
    // still has no secret provisioned, so an active workflow cannot actually run the
    // daily cron successfully until the secret exists.
    expect(agents).toContain('FRO_BOT_PAT')
  })
})
