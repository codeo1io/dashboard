import {existsSync, readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

// rm-1510: clonedeps mirror lockstep. `.slim/clonedeps.json` is the manifest
// of the opt-in read-only dependency-source mirror (AGENTS.md "Cloned
// Dependency Source"). The manifest itself is TRACKED (the only tracked file
// under `.slim/` — every checkout carries it); the mirror clone under
// `.slim/clonedeps/repos/` is machine-local and exists only where it was
// provisioned. The tracked manifest's `resolvedVersion`/`ref` for
// `fro-bot__agent` must match the fro-bot.yaml CI pin; a silent drift
// (v0.78.0 manifest vs v0.122.2 pin stood from June 2026-06-26 to
// 2026-10-17 — the founding case) makes gateway-source inspection read a
// stale mirror.

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')
const manifestPath = join(repoRoot, '.slim', 'clonedeps.json')
const workflowPath = join(repoRoot, '.github', 'workflows', 'fro-bot.yaml')

const workflowYaml = readFileSync(workflowPath, 'utf8')
// The fork pins the agent by full commit sha with the release tag as a
// trailing comment: `uses: fro-bot/agent@<40-hex> # vX.Y.Z`.
const pinMatch = workflowYaml.match(
  /uses:\s*fro-bot\/agent@([0-9a-f]{40})(?:\s*#\s*(v\d+\.\d+\.\d+))?/,
)

const manifestExists = existsSync(manifestPath)

function readManifestAgentEntry(): {resolvedVersion: string | null; ref: string | null; pinCommit: unknown} {
  const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown
  if (parsed === null || typeof parsed !== 'object') {
    return {resolvedVersion: null, ref: null, pinCommit: undefined}
  }
  const deps = (parsed as {dependencies?: unknown}).dependencies
  if (!Array.isArray(deps)) {
    return {resolvedVersion: null, ref: null, pinCommit: undefined}
  }
  const entry = deps.find(
    (dep): dep is Record<string, unknown> =>
      typeof dep === 'object' && String((dep as {path?: unknown}).path ?? '').includes('fro-bot__agent'),
  )
  if (entry === undefined) {
    return {resolvedVersion: null, ref: null, pinCommit: undefined}
  }
  const version = entry.resolvedVersion
  const ref = entry.ref
  return {
    resolvedVersion: typeof version === 'string' ? version : null,
    ref: typeof ref === 'string' ? ref : null,
    pinCommit: entry.pinCommit,
  }
}

describe('clonedeps mirror lockstep (rm-1510)', () => {
  it('fro-bot.yaml pins a parseable agent tag + commit sha', () => {
    expect(
      pinMatch,
      'expected .github/workflows/fro-bot.yaml to carry uses: fro-bot/agent@<40-hex> # vX.Y.Z',
    ).not.toBeNull()
    expect(pinMatch?.[1]).toMatch(/^[0-9a-f]{40}$/)
    expect(pinMatch?.[2]).toMatch(/^v\d+\.\d+\.\d+$/)
  })

  it.skipIf(!manifestExists)(
    'manifest resolvedVersion matches the fro-bot.yaml pin (re-provision on drift)',
    () => {
      const {resolvedVersion, ref, pinCommit} = readManifestAgentEntry()
      expect(
        resolvedVersion,
        '.slim/clonedeps.json has no fro-bot__agent dependency entry with resolvedVersion — fix the manifest shape or update this lockstep test',
      ).not.toBeNull()
      if (resolvedVersion === null) return
      if (resolvedVersion !== pinMatch?.[2] || ref !== pinMatch?.[2]) {
        throw new Error(
          `.slim/clonedeps.json resolvedVersion ${resolvedVersion}/ref ${ref} != fro-bot.yaml pin ${pinMatch?.[2]} — the dependency-source mirror is stale. Re-provision it:\n` +
          '    rm -rf .slim/clonedeps/repos/fro-bot__agent\n' +
          `    git clone --depth 1 --branch ${pinMatch?.[2]} https://github.com/fro-bot/agent .slim/clonedeps/repos/fro-bot__agent\n` +
          'then update resolvedVersion/ref (and updatedAt) in .slim/clonedeps.json to match.',
        )
      }
      expect(resolvedVersion).toBe(pinMatch?.[2])
      expect(ref).toBe(pinMatch?.[2])
      // rm-1510 acceptance: the manifest carries provenance naming the pin
      // commit it mirrors.
      expect(
        pinCommit,
        '.slim/clonedeps.json fro-bot__agent entry is missing pinCommit provenance (the workflow sha it mirrors)',
      ).toBe(pinMatch?.[1])
    },
  )

  it.skipIf(manifestExists)('absent manifest is a valid opt-out state', () => {
    // Defensive branch: the manifest is tracked, so a checkout always has it —
    // but a hand-deleted manifest (which porcelain surfaces as drift) must
    // not hard-fail the suite either. The preflight doctor runs this check as
    // warning-class for exactly this reason (scripts/preflight.ts).
    expect(existsSync(manifestPath)).toBe(false)
  })
})
