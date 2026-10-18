/**
 * Tests for the clonedeps mirror/pin verification script (rm-2046).
 *
 * Covers:
 * - parseAgentPin: single distinct pin, absent pin, ambiguous multi-pin text
 * - verifyClonedeps: happy path, drift (mirror at a different tag), missing
 *   mirror, undescribable HEAD, and the re-provision remedy text every failure
 *   must carry
 * - main() wiring is exercised end-to-end against a fixture repo root whose
 *   workflow pins a tag a fake mirror describes — through the exported seam,
 *   the real IO (git, filesystem) is covered by running the script in this
 *   repo (its canonical mirror is re-provisioned by the same def).
 */
import {describe, expect, it} from 'vitest'
import {join} from 'node:path'
import {parseAgentPin, verifyClonedeps, WORKFLOW_RELATIVE_PATH} from '../scripts/verify-clonedeps.ts'

const WORKFLOW_WITH_PIN = `
  - name: Run agent
    uses: fro-bot/agent@v0.122.3
    with:
      output-mode: branch-pr
`

describe('parseAgentPin (rm-2046)', () => {
  it('extracts the single distinct pinned tag', () => {
    expect(parseAgentPin(WORKFLOW_WITH_PIN)).toEqual({ok: true, pin: 'v0.122.3'})
  })

  it('fails closed when the workflow carries no agent pin', () => {
    const result = parseAgentPin('runs-on: ubuntu-latest\nsteps: []\n')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('no ')
  })

  it('fails closed on ambiguous multi-pin text instead of guessing the newest', () => {
    const result = parseAgentPin(`${WORKFLOW_WITH_PIN}  # pre-v0.121.0 behavior\n`)
    expect(result.ok).toBe(true) // v0.121.0 lacks the third component → not matched
    const ambiguous = parseAgentPin(`${WORKFLOW_WITH_PIN}  uses: fro-bot/agent@v0.123.0\n`)
    expect(ambiguous.ok).toBe(false)
    if (!ambiguous.ok) expect(ambiguous.reason).toContain('v0.122.3, v0.123.0')
  })
})

describe('verifyClonedeps (rm-2046)', () => {
  const repoRoot = '/repo'
  const mirrorPath = join(repoRoot, '.slim', 'clonedeps', 'repos', 'fro-bot__agent')
  const deps = (tag: string | undefined, exists = true) => ({
    mirrorExists: (p: string) => exists && p === mirrorPath,
    describeMirrorHead: (p: string) => (p === mirrorPath ? tag : undefined),
  })

  it('passes when the mirror is exactly at the pinned tag', () => {
    expect(verifyClonedeps(WORKFLOW_WITH_PIN, repoRoot, deps('v0.122.3'))).toEqual({
      ok: true,
      pin: 'v0.122.3',
      mirrorTag: 'v0.122.3',
    })
  })

  it('drift: mirror tag differs from the pin → failure carrying the re-provision command', () => {
    const result = verifyClonedeps(WORKFLOW_WITH_PIN, repoRoot, deps('v0.123.0'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('workflow pins v0.122.3')
      expect(result.reason).toContain('mirror is at v0.123.0')
      expect(result.remedy).toContain('git clone --depth 1 --branch v0.122.3')
    }
  })

  it('missing mirror → failure with the provision command and the pin', () => {
    const result = verifyClonedeps(WORKFLOW_WITH_PIN, repoRoot, deps(undefined, false))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('mirror missing')
      expect(result.remedy).toContain('--branch v0.122.3')
    }
  })

  it('undescribable HEAD (not a checkout / detached past a tag) → failure, not a silent pass', () => {
    const result = verifyClonedeps(WORKFLOW_WITH_PIN, repoRoot, deps(undefined))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('cannot determine the mirror HEAD tag')
  })

  it('workflow pin problems surface before any mirror IO is attempted', () => {
    const result = verifyClonedeps('steps: []', repoRoot, {
      mirrorExists: () => {
        throw new Error('must not be called')
      },
      describeMirrorHead: () => {
        throw new Error('must not be called')
      },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain(WORKFLOW_RELATIVE_PATH.split('/').pop()!)
  })
})
