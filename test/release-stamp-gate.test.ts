import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'
import {parse} from 'yaml'

// rm-1979 guard: no image may advertise a CalVer tag unless the same env that
// gates promote-side tag creation is true. A bare stamp links the footer chip
// to a release that will never exist — the fork shares upstream's CalVer tag
// namespace via adoption, so an ungated stamp names a phantom release (the
// chip's anchor 404s on every shipped image). If this test fails, the stamp
// and the tag-creation gate have diverged: re-key the stamp on env.HAS_RELEASE_APP.

const workflowPath = resolve(process.cwd(), '.github/workflows/release.yaml')
const workflow = parse(readFileSync(workflowPath, 'utf8')) as {
  jobs: {
    release: {
      env: Record<string, string>
      steps: {
        id?: string
        uses?: string
        if?: string
        with?: {['build-args']?: string}
      }[]
    }
  }
}

const release = workflow.jobs.release

// The exact stamped line (yaml block scalars keep a trailing newline — match
// the DASHBOARD_VERSION line itself, not the whole block).
const stampLines = release.steps
  .map(step => step.with?.['build-args'] ?? '')
  .filter(args => args.includes('DASHBOARD_VERSION='))
  .map(args => args.match(/^DASHBOARD_VERSION=.*$/m)?.[0] ?? '')

// GitHub Actions expression, composed to keep the literal out of a JS string
// (no-template-curly-in-string): gate on the same env promote keys, dev fallback.
const gatedStamp = ['DASHBOARD_VERSION=${{', "env.HAS_RELEASE_APP == 'true'", '&&', 'steps.version.outputs.tag', '||', "'dev'", '}}'].join(' ')

describe('release stamp gate (rm-1979)', () => {
  it('stages HAS_RELEASE_APP from release-secret presence at job level', () => {
    // The single source of gate truth: secret presence, evaluated once. The
    // stamp below and every promote-side gate must key THIS env, never a
    // duplicated presence condition (a duplicate can silently disagree).
    const staged = release.env.HAS_RELEASE_APP ?? ''
    expect(staged, 'HAS_RELEASE_APP must be staged from Application secret presence').toContain(
      "secrets.APPLICATION_ID != ''",
    )
    expect(staged).toContain("secrets.APPLICATION_PRIVATE_KEY != ''")
  })

  it('gates the image stamp on HAS_RELEASE_APP with a dev fallback', () => {
    // Exactly one build stamps DASHBOARD_VERSION; when no release App is
    // provisioned the expression must fall through to 'dev' so the Dockerfile
    // ARG default and the client's plain-text fallback carry it.
    expect(stampLines.length, 'exactly one DASHBOARD_VERSION build-args site').toBe(1)
    expect(stampLines[0]).toBe(gatedStamp)
  })

  it('keys tag creation on the same gate the stamp uses', () => {
    // Divergence-failure property: the app-token mint that authorizes tag
    // creation is gated by the SAME env key the stamp reads. If one side is
    // re-keyed alone, this pair of assertions goes red.
    const appToken = release.steps.find(step => step.id === 'app-token')
    expect(appToken?.if, 'app-token mint must be gated on env.HAS_RELEASE_APP').toContain(
      "env.HAS_RELEASE_APP == 'true'",
    )
    const tagCreating = release.steps.filter(
      step => step.if?.includes("steps.app-token.outcome == 'success'"),
    )
    expect(tagCreating.length, 'tag/release creation steps must consume the app-token outcome').toBeGreaterThan(0)
  })

  it("ships the neutral 'dev' path end to end", () => {
    // The fallback only works because both ends already treat 'dev' as a
    // non-release value: the Dockerfile default feeds the VITE_ env, and the
    // chip renders a plain span (no release-notes anchor) when the version
    // fails the CalVer shape test.
    const dockerfile = readFileSync(resolve(process.cwd(), 'Dockerfile'), 'utf8')
    expect(dockerfile).toMatch(/^ARG DASHBOARD_VERSION=dev$/m)

    const appShell = readFileSync(resolve(process.cwd(), 'web/src/shell/AppShell.tsx'), 'utf8')
    expect(appShell, 'client must fall back to a neutral version string').toMatch(/\|\| 'dev'/)
    expect(
      appShell,
      'release-notes link must be gated on the CalVer shape test',
    ).toMatch(/\/\^\\d\{4\}\\\.\\d\{2\}\\\.\\d\+\$\/\.test\(dashboardVersion\)/)
    expect(appShell, 'chip must render a plain span when there is no release notes URL').toMatch(
      /releaseNotesUrl \? \(/,
    )
  })
})
