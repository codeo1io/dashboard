/**
 * Restored-critical-files presence guard (rm-887 rider, 2026-10-16).
 *
 * The 3e3664c integrate merge silently dropped ~60 files from the integrated
 * run's tree — including an error boundary, the read-only-invariant guard,
 * five other guard tests, a lockfile tripwire workflow, and two docs — while
 * the merge diff itself looked clean. Nothing in the tree failed, because the
 * dropped files WERE the checks. This rider converts "the restore happened"
 * into an in-tree assertion: every file the rm-887 batch restored must exist,
 * and the dual invariant-guard spelling that the drop left behind must stay
 * canonicalized (exactly one spelling in-tree).
 *
 * This is deliberately NOT a census/roadmap floor guard (those are owned
 * separately) — it pins the presence of the restored self-maintenance
 * surfaces themselves.
 */
import {existsSync} from 'node:fs'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Files restored by the rm-887 batch (run 1a261b63, 2026-10-16). */
const RESTORED_PATHS: {path: string; why: string}[] = [
  {
    path: 'web/src/shell/ErrorBoundary.tsx',
    why: 'only error boundary in web production code — without it any render throw white-screens the operator PWA (rm-514)',
  },
  {
    path: 'web/src/shell/ErrorBoundary.test.tsx',
    why: 'boundary regression coverage (rm-514)',
  },
  {
    path: 'test/read-only-invariant-guard.test.ts',
    why: 'critical security invariant #1 (read-only by construction) enforced in-tree (rm-649)',
  },
  {
    path: 'test/server-entry-point.test.ts',
    why: 'entry-point gate regression coverage (rm-702)',
  },
  {
    path: 'test/robots-wellknown.test.ts',
    why: 'public-path allowlist exact-match coverage for robots.txt + security.txt (rm-713)',
  },
  {
    path: 'test/operator-contract-window.test.ts',
    why: 'vendored operator-stream contract pin + failure-kind bijection (rm-157)',
  },
  {
    path: '.github/workflows/lockfile-guard.yaml',
    why: 'lockfile-consistency tripwire (rm-285 wall family)',
  },
  {
    path: 'docs/runbooks/release.md',
    why: 'release-pipeline institutional memory',
  },
  {
    path: 'docs/solutions/security-issues/zlib1g-cve-2023-45853-standing-critical-2026-10-07.md',
    why: 'standing-CVE posture documentation',
  },
]

describe('restored-critical-files guard (rm-887 rider)', () => {
  it('every file restored by the rm-887 batch exists', () => {
    const missing = RESTORED_PATHS.filter(
      entry => !existsSync(path.join(repoRoot, entry.path)),
    )
    expect(
      missing.map(entry => entry.path),
      'a restored self-maintenance surface went missing again — this is the integrate-drop class recurring',
    ).toEqual([])
  })

  it('exactly one read-only invariant guard spelling exists (canonicalized)', () => {
    // The 06396b4 tree carried TWO divergent spellings of the invariant
    // guard; the restore canonicalized to the hyphenated one. Both existing
    // again would silently fork detector coverage.
    const canonical = existsSync(path.join(repoRoot, 'test/read-only-invariant-guard.test.ts'))
    const alternate = existsSync(path.join(repoRoot, 'test/readonly-invariant-guard.test.ts'))
    expect(canonical, 'canonical spelling must exist').toBe(true)
    expect(alternate, 'alternate spelling must NOT coexist (detector fork)').toBe(false)
  })

  it('the error boundary is wired into the app root', async () => {
    const mainTsx = await readFile(path.join(repoRoot, 'web/src/main.tsx'), 'utf8')
    expect(mainTsx, 'main.tsx must import the boundary').toContain(
      "from './shell/ErrorBoundary.tsx'",
    )
    expect(mainTsx, 'main.tsx must render App inside the boundary').toMatch(/<ErrorBoundary>/)
  })
})
