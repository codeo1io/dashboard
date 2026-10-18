import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-2061 (repository-maintenance cycle:1 run 10a9da0ab6f14c11a9a7a40199fa203b):
// fro-bot.yaml workflow-shape guard — the fork-local hardening must survive
// upstream adoption merges. The 2026.10.43 adoption merge (c51597ad) merge-resolved
// .github/workflows/fro-bot.yaml toward upstream and silently dropped four fork
// truths while keeping the read-only-invariant prompt wording: the FRO_BOT_PAT
// skip-gate, the rm-188 pinned runner image, the rm-603 per-job timeout, and the
// Dependabot-ownership note. This guard fails on any further drift of that class.
//
// Design (dual-mode, never silent-green):
// - If the checked-in file carries the skip-gate wiring (the restoration marker),
//   STRICT mode asserts all four clauses of the rm-2061 acceptance:
//   (a) secrets-presence skip-gate shape, (b) per-job timeout-minutes,
//   (c) pinned runs-on, (d) Dependabot-never-Renovate ownership text.
// - Otherwise INTERIM mode asserts the file matches the known c51597ad-regressed
//   shape EXACTLY (all four regression markers present, nothing partially
//   restored): the restoration batch (fog rm-2057 lineage, lane run-307aa78e56e5)
//   is still unlanded there, and any NEW drift — including a partial restoration
//   or a fresh adoption strip — turns this guard red instead of passing silently.
// Restored-shape oracle: the last pre-regression fork file (c51597ad^1), identical
// to the unlanded restoration lane's hunks (verified by content 2026-10-19).
//
// Adopted by content with attribution (per the rm-2061 selection rider): the
// skip-on-conductor/ci validation-route pattern comes from the terminal salvage
// estate guard (run-5723bb0a4d4d, base 2044334 — never an ancestor of main), in
// the in-repo precedent shape at test/fork-exclusion-guard.test.ts — synthetic
// validation PRs carry default-branch workflow blobs, so a live guard there
// reports substitution, not regression.

const WORKFLOW_PATH = join(import.meta.dirname, '..', '.github', 'workflows', 'fro-bot.yaml')

const RESTORED_MARKERS = {
  // eslint-disable-next-line no-template-curly-in-string -- GitHub Actions expression, not a JS template
  gateEnv: "HAS_FRO_BOT_PAT: ${{ secrets.FRO_BOT_PAT != '' }}",
  stepConditional: "env.HAS_FRO_BOT_PAT != 'true'",
  skipAnnotation: 'skipping the scheduled run',
  pinnedRunner: 'runs-on: ubuntu-24.04',
  pinComment: 'rm-188',
  timeoutComment: 'rm-603',
  dependabotOwns: 'Dependabot owns routine dependency and version bumps',
  renovateRetired: 'Renovate does not run here',
} as const

const REGRESSED_MARKERS = {
  renovateOwns: 'Renovate owns routine dependency and version bumps',
  bareRunner: 'runs-on: ubuntu-latest',
} as const

interface JobShape {
  name: string
  timeoutMinutes: boolean
  pinnedRunner: boolean
  bareRunner: boolean
}

function parseJobs(source: string): JobShape[] {
  const lines = source.split('\n')
  const jobs: JobShape[] = []
  let inJobs = false
  let current: JobShape | null = null
  for (const line of lines) {
    if (line.startsWith('jobs:')) {
      inJobs = true
      continue
    }
    if (!inJobs) continue
    if (/^ {2}[\w-]+:(?:\s|$)/.test(line)) {
      if (current) jobs.push(current)
      current = {
        name: line.trim().replace(/:$/, ''),
        timeoutMinutes: false,
        pinnedRunner: false,
        bareRunner: false,
      }
      continue
    }
    if (/^\S/.test(line)) break // jobs: block ended
    if (!current) continue
    if (/^\s{4}timeout-minutes:\s*\d+/.test(line)) current.timeoutMinutes = true
    if (/^\s{4}runs-on:\s*ubuntu-24\.04/.test(line)) current.pinnedRunner = true
    if (/^\s{4}runs-on:\s*ubuntu-latest/.test(line)) current.bareRunner = true
  }
  if (current) jobs.push(current)
  return jobs
}

function evaluateStrict(source: string) {
  const jobs = parseJobs(source)
  return {
    gateWired:
      source.includes(RESTORED_MARKERS.gateEnv) &&
      source.includes(RESTORED_MARKERS.stepConditional) &&
      source.includes(RESTORED_MARKERS.skipAnnotation),
    timeoutsBounded: jobs.length > 0 && jobs.every(job => job.timeoutMinutes),
    runnersPinned: jobs.length > 0 && jobs.every(job => job.pinnedRunner) && !jobs.some(job => job.bareRunner),
    pinCommentPresent: source.includes(RESTORED_MARKERS.pinComment),
    timeoutCommentPresent: source.includes(RESTORED_MARKERS.timeoutComment),
    dependabotOwnership: source.includes(RESTORED_MARKERS.dependabotOwns) && source.includes(RESTORED_MARKERS.renovateRetired) && !source.includes(REGRESSED_MARKERS.renovateOwns),
    jobs,
  }
}

function evaluateInterim(source: string) {
  return {
    gateAbsent: !source.includes('HAS_FRO_BOT_PAT'),
    timeoutsAbsent: !/^\s{4}timeout-minutes:/m.test(source),
    renovateOwnsPresent: source.includes(REGRESSED_MARKERS.renovateOwns),
    bareRunnerPresent: source.includes(REGRESSED_MARKERS.bareRunner),
  }
}

const RESTORED_FIXTURE = [
  'name: Fro Bot',
  'on:',
  '  schedule:',
  "    - cron: '0 0 * * *'",
  'jobs:',
  '  fro-bot:',
  '    name: Fro Bot',
  '    # rm-188 (cycle 13, 2026-09-25): pinned ubuntu-24.04 so the runner image',
  '    # cannot drift under a workflow that mints GitHub App installation tokens.',
  '    runs-on: ubuntu-24.04',
  '    # rm-603 (2026-10-04): bounded so a wedged agent run can never hold a runner.',
  '    timeout-minutes: 20',
  '    env:',
  // eslint-disable-next-line no-template-curly-in-string -- GitHub Actions expression, not a JS template
  "      HAS_FRO_BOT_PAT: ${{ secrets.FRO_BOT_PAT != '' }}",
  '    steps:',
  '      - name: ⚠️ Fro Bot skipped (FRO_BOT_PAT not configured)',
  "        if: github.event_name == 'schedule' && env.HAS_FRO_BOT_PAT != 'true'",
  '        run: >-',
  "          echo '::warning title=Fro Bot skipped::FRO_BOT_PAT is not configured in this repository — skipping the scheduled run'",
  '      - name: Checkout repository',
  "        if: github.event_name != 'schedule' || env.HAS_FRO_BOT_PAT == 'true'",
  '        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
  '      - name: Run Fro Bot',
  "        if: github.event_name != 'schedule' || env.HAS_FRO_BOT_PAT == 'true'",
  '        uses: fro-bot/agent@e59939d5df645ce0d7640f0c015f7f1e54b72dea # v0.123.1',
  '',
  '    DEPENDENCY OWNERSHIP',
  '    Dependabot owns routine dependency and version bumps on this fork (weekly',
  '    grouped PRs per .github/dependabot.yml).',
  '    Renovate does not run here — its workflow was retired during CI migration.',
  ''].join('\n')

const REGRESSED_FIXTURE = [
  'name: Fro Bot',
  'on:',
  '  schedule:',
  "    - cron: '0 0 * * *'",
  'jobs:',
  '  fro-bot:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - name: Run agent',
  '        run: run-agent',
  '',
  'Agent notes:',
  'Renovate owns routine dependency and version bumps; do not chase bumps here.',
  ''].join('\n')

describe('rm-2061 fro-bot.yaml workflow-shape guard', () => {
  it('detector: strict mode passes all four acceptance clauses on the restored shape', () => {
    const verdict = evaluateStrict(RESTORED_FIXTURE)
    expect(verdict.gateWired, 'clause (a): env + per-step conditional + skip annotation').toBe(true)
    expect(verdict.timeoutsBounded, 'clause (b): per-job timeout-minutes').toBe(true)
    expect(verdict.runnersPinned, 'clause (c): pinned runs-on, no bare ubuntu-latest').toBe(true)
    expect(verdict.pinCommentPresent, 'clause (c): rm-188 pin comment cites the def').toBe(true)
    expect(verdict.timeoutCommentPresent, 'clause (b): rm-603 timeout comment cites the def').toBe(true)
    expect(verdict.dependabotOwnership, 'clause (d): Dependabot owns, Renovate retired').toBe(true)
  })

  it('detector: strict mode rejects every clause of the c51597ad-regressed shape (mutation check)', () => {
    const verdict = evaluateStrict(REGRESSED_FIXTURE)
    expect(verdict.gateWired, 'clause (a) must fail without the gate').toBe(false)
    expect(verdict.timeoutsBounded, 'clause (b) must fail without timeout-minutes').toBe(false)
    expect(verdict.runnersPinned, 'clause (c) must fail on bare ubuntu-latest').toBe(false)
    expect(verdict.dependabotOwnership, 'clause (d) must fail on Renovate-owns text').toBe(false)
  })

  it('detector: interim matcher recognizes exactly the known regressed quartet', () => {
    const verdict = evaluateInterim(REGRESSED_FIXTURE)
    expect(verdict.gateAbsent).toBe(true)
    expect(verdict.timeoutsAbsent).toBe(true)
    expect(verdict.renovateOwnsPresent).toBe(true)
    expect(verdict.bareRunnerPresent).toBe(true)
    // a partially restored file must NOT satisfy the interim matcher
    const partial = REGRESSED_FIXTURE.replace('runs-on: ubuntu-latest', 'runs-on: ubuntu-24.04')
    expect(evaluateInterim(partial).bareRunnerPresent).toBe(false)
  })

  // conductor/ci-* validation snapshots carry default-branch workflow blobs; a
  // live read there would guard the substituted file, not this change (adopted
  // by content from run-5723bb0a4d4d per the rm-2061 selection rider; precedent
  // test/fork-exclusion-guard.test.ts).
  const ciRef = process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? ''

  it.skipIf(ciRef.startsWith('conductor/ci-'))(
    'live: checked-in fro-bot.yaml holds the restoration contract (strict) or the exact known regressed baseline (interim)',
    () => {
      const source = readFileSync(WORKFLOW_PATH, 'utf8')
      const hasGate = source.includes('HAS_FRO_BOT_PAT')
      if (hasGate) {
        const verdict = evaluateStrict(source)
        expect(verdict.gateWired, 'rm-2061 (a): env + per-step conditional + skip annotation must stay intact').toBe(true)
        expect(verdict.timeoutsBounded, 'rm-2061 (b): every fro-bot.yaml job needs timeout-minutes').toBe(true)
        expect(verdict.timeoutCommentPresent, 'rm-2061 (b): the timeout must carry its rm-603 decision comment').toBe(true)
        expect(verdict.runnersPinned, 'rm-2061 (c): runs-on must stay pinned (rm-188)').toBe(true)
        expect(verdict.pinCommentPresent, 'rm-2061 (c): the runner pin must carry its rm-188 decision comment').toBe(true)
        expect(verdict.dependabotOwnership, 'rm-2061 (d): ownership text must name Dependabot, never Renovate').toBe(true)
        return
      }
      // Interim (restoration fog rm-2057 lineage still unlanded on this base): the
      // file must match the c51597ad-regressed baseline EXACTLY. Any drift — a new
      // adoption strip, or a partial restoration — is a red, never a silent green.
      const interim = evaluateInterim(source)
      const baseline: [string, boolean][] = [
        ['gate wiring absent', interim.gateAbsent],
        ['timeouts absent', interim.timeoutsAbsent],
        ['Renovate-owns text present', interim.renovateOwnsPresent],
        ['bare ubuntu-latest present', interim.bareRunnerPresent],
      ]
      const drift = baseline.filter(([, holds]) => !holds).map(([label]) => label)
      if (drift.length > 0) {
        throw new Error(
          `rm-2061 interim baseline broken — fro-bot.yaml no longer matches the known regressed shape (expected-baseline markers that broke: ${drift.join('; ')}). ` +
          'Either the fog rm-2057 restoration landed partially (finish it: gate + rm-188 pin + rm-603 timeout + Dependabot note) ' +
          'or a new upstream adoption stripped further fork hunks. Paste-ready remediation: restore the four hunks verbatim from ' +
          'the rm-879 rider evidence (commit chain c01946ea -> c51597ad -> 5ab50da0).',
        )
      }

      console.warn(
        'rm-2061 interim mode: fro-bot.yaml still carries the c51597ad-regressed shape (no skip-gate, bare runner, no timeout, Renovate-owns). ' +
        'Strict mode arms automatically once the fog rm-2057 restoration (lane run-307aa78e56e5) lands.',
      )
    },
  )
})
