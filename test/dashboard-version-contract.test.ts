import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, it} from 'vitest'

/**
 * Version-pipeline contract guard (rm-882 / rm-1483 lineage).
 *
 * Pins the two halves of the DASHBOARD_VERSION pipeline that exist at every
 * base this test can run against:
 *
 *   1. The client consumer — web/src/shell/AppShell.tsx reads
 *      VITE_DASHBOARD_VERSION and falls back to 'dev' (so local dev and
 *      un-parameterized builds show 'dev', while release builds that baked
 *      the env show their CalVer tag).
 *   2. The CI producer — .github/workflows/release.yaml passes
 *      DASHBOARD_VERSION as a build-arg into the image build.
 *
 * The Dockerfile sink (ARG DASHBOARD_VERSION + ENV VITE_DASHBOARD_VERSION)
 * landed on main as rm-1483 and is intentionally NOT pinned here: this test
 * must stay green on bases that predate it and on the tip that carries it.
 * If either pinned half drifts, this guard goes red before a release image
 * can silently regress to 'dev' footers again.
 */

const repoRoot = resolve(import.meta.dirname, '..')

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8')
}

describe('DASHBOARD_VERSION pipeline contract', () => {
  it('AppShell consumes VITE_DASHBOARD_VERSION with a dev fallback', () => {
    const appShell = read('web/src/shell/AppShell.tsx')
    assert.match(
      appShell,
      /import\.meta\.env\.VITE_DASHBOARD_VERSION/,
      'AppShell must read import.meta.env.VITE_DASHBOARD_VERSION',
    )
    assert.match(
      appShell,
      /VITE_DASHBOARD_VERSION[^\n]*\|\|\s*'dev'|VITE_DASHBOARD_VERSION[^\n]*\?\?\s*'dev'/,
      "AppShell must fall back to 'dev' when the env is absent",
    )
  })

  it('release.yaml passes DASHBOARD_VERSION as a build-arg', () => {
    const releaseWorkflow = read('.github/workflows/release.yaml')
    assert.match(
      releaseWorkflow,
      /build-args:[\s\S]{0,200}DASHBOARD_VERSION=/,
      'release.yaml must pass DASHBOARD_VERSION=<tag> to the image build',
    )
  })

  it('AppShell gates release links on the CalVer shape, not on any string', () => {
    const appShell = read('web/src/shell/AppShell.tsx')
    // The consumer must distinguish a real CalVer tag from 'dev' so release
    // URLs are only rendered for real releases (no permanent-404 links).
    // Base-portable on purpose — the same contract holds at bases that
    // predate the rm-1483 Dockerfile sink and at the folded tip: the gate is
    // spelled either as a named helper (isCalVer & friends) or as the inline
    // ^\d{4}\.\d{2}\.\d+$ shape test. Any other spelling fails here so a
    // raw-string release link cannot ship silently.
    assert.match(
      appShell,
      /isCalVer|calver|\\d\{4\}\\.\\d\{2\}\\.\\d\+/i,
      'AppShell must test the version for a CalVer shape before linking releases',
    )
    // And the gate must actually gate: a non-CalVer version (e.g. 'dev')
    // yields no release URL at all, never a link built from the raw string.
    assert.match(
      appShell,
      /releaseNotesUrl[\s\S]{0,220}:\s*undefined/,
      "a non-CalVer version must leave releaseNotesUrl undefined (no 'dev' release links)",
    )
  })
})
