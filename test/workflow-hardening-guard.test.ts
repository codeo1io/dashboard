import {existsSync, readFileSync, readdirSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'
import {parse} from 'yaml'

/**
 * rm-1450 / rm-1437 restoration guard (2026-10-18, repository-maintenance
 * cycle:2 run 5723bb0a).
 *
 * The 2026.10.43 upstream absorb (64cd2f6a) carried upstream's copies of
 * fro-bot.yaml and codeql.yaml over this fork's hardened shapes: the
 * FRO_BOT_PAT secret-presence gate was deleted while the cron `0 0 * * *`
 * stayed armed with zero repo secrets provisioned, so every scheduled fire
 * failed at input validation ("Input required and not supplied: token").
 * The same absorb reverted pinned runner images to ubuntu-latest, dropped the
 * timeout ceilings (rm-603), downgraded the checkout pins to the v6.x digest,
 * and stripped CodeQL's conductor/ci-base-** PR trigger + SEMMLE override +
 * pre-init dependency setup.
 *
 * None of those regressions were red anywhere — workflows are executable
 * surfaces that tests never see — which is exactly why this guard exists:
 * every restoration in that batch is now pinned here so the NEXT absorb
 * (rm-252's standing window) fails a check instead of silently regressing.
 */

const workflowsDir = join(process.cwd(), '.github', 'workflows')

/** Full-line comments are trap-documenting prose here; assertions target executable text. */
function stripCommentLines(text: string): string {
  return text
    .split('\n')
    .filter(line => !line.trimStart().startsWith('#'))
    .join('\n')
}

function readWorkflow(name: string): string {
  const path = join(workflowsDir, name)
  if (!existsSync(path)) throw new Error(`missing workflow file: ${path}`)
  return stripCommentLines(readFileSync(path, 'utf8'))
}

/** Split a workflow into top-level `steps:` entries (name-anchored, comment-stripped). */
function splitSteps(workflow: string): string[] {
  const stepsIndex = workflow.indexOf('    steps:')
  if (stepsIndex === -1) return []
  return workflow
    .slice(stepsIndex)
    .split('\n      - name: ')
    .slice(1)
}

const CHECKOUT_V7_0_1 = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1'
const SCHEDULE_GATE_IF = "if: github.event_name != 'schedule' || env.HAS_FRO_BOT_PAT == 'true'"

// rm-1450/rm-1437 scope: this guard pins THIS branch's workflow hardening.
// Conductor's ephemeral GitHub-hosted validation snapshots (conductor/ci-*)
// replace .github/workflows with the default branch's copies by construction
// (the route's workflow-substitution mechanism — GitHub-hosted runners
// only), so until this restoration batch
// lands on main those synthetic PRs carry the pre-restoration shapes and
// pinning there reports the route's substitution, not a regression.
// GITHUB_HEAD_REF is a conductor/ci-* ref only on those synthetic PRs (unset
// on push, a real branch name on every durable PR), so the guard stays
// strict everywhere it must never regress.
const ciRef = process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? ''
const describeWorkflowGuard = describe.skipIf(ciRef.startsWith('conductor/ci-'))

describeWorkflowGuard('workflow hardening guard — fro-bot.yaml (rm-1450 restoration)', () => {
  const text = readWorkflow('fro-bot.yaml')

  it('keeps the cron armed but gated: job-env defines HAS_FRO_BOT_PAT from secret presence', () => {
    expect(text).toMatch(/cron: '0 0 \* \* \*'/)
    expect(text).toMatch(/HAS_FRO_BOT_PAT: \$\{\{ secrets\.FRO_BOT_PAT != '' \}\}/)
  })

  it('warns (does not fail) when the scheduled fire runs without the secret', () => {
    expect(text).toMatch(
      /- name: ⚠️ Fro Bot skipped \(FRO_BOT_PAT not configured\)/,
    )
    expect(text).toMatch(
      /if: github\.event_name == 'schedule' && env\.HAS_FRO_BOT_PAT != 'true'/,
    )
  })

  it('gates EVERY step that consumes secrets.FRO_BOT_PAT (no raw ungated consumer)', () => {
    const steps = splitSteps(text)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    const consumers = steps.filter(step => step.includes('secrets.FRO_BOT_PAT'))
    // Checkout (token:) and Run Fro Bot (github-token:) at minimum.
    expect(consumers.length).toBeGreaterThanOrEqual(2)
    for (const step of consumers) {
      expect(step, `ungated FRO_BOT_PAT consumer step:\n${step.slice(0, 200)}`).toContain(
        SCHEDULE_GATE_IF,
      )
    }
  })

  it('runs the agent job on the pinned image with a bounded timeout (rm-188/rm-603)', () => {
    expect(text).toMatch(/runs-on: ubuntu-24\.04/)
    expect(text).not.toMatch(/runs-on: ubuntu-latest/)
    expect(text).toMatch(/timeout-minutes: 20/)
  })

  it(`pins checkout at the fork digest (${CHECKOUT_V7_0_1})`, () => {
    expect(text).toContain(`uses: ${CHECKOUT_V7_0_1}`)
    expect(text).not.toContain('actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803')
  })
})

describeWorkflowGuard('workflow hardening guard — codeql.yaml (rm-1437 restoration)', () => {
  const text = readWorkflow('codeql.yaml')

  it('analyses conductor/ci-base-** validation PRs, not just main', () => {
    expect(text).toMatch(/branches: \[main, 'conductor\/ci-base-\*\*'\]/)
  })

  it('runs on the pinned image with a bounded timeout (rm-188/rm-603)', () => {
    expect(text).toMatch(/runs-on: ubuntu-24\.04/)
    expect(text).not.toMatch(/runs-on: ubuntu-latest/)
    expect(text).toMatch(/timeout-minutes: 20/)
  })

  it('points CodeQL at the repo-installed typescript (SEMMLE override + pre-init Setup)', () => {
    expect(text).toMatch(/SEMMLE_TYPESCRIPT_HOME: \$\{\{ github\.workspace \}\}\/node_modules\/typescript/)
    expect(text.match(/- name: 📦 Setup\n {8}uses: \.\/\.github\/actions\/setup/)).not.toBeNull()
  })

  it(`pins checkout at the fork digest (${CHECKOUT_V7_0_1})`, () => {
    expect(text).toContain(`uses: ${CHECKOUT_V7_0_1}`)
    expect(text).not.toContain('actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803')
  })
})

// rm-2144 (2026-10-21, repository-maintenance cycle:4 run 18ef6d162e3f):
// scorecard.yaml carried the fleet's only unbounded jobs — the one workflow
// with zero `timeout-minutes` of all 13 — so a hang ate the runner until a
// human noticed. This pin reads every workflow file and fails if ANY job of
// ANY workflow lacks an execution budget (job-level `timeout-minutes`, or a
// workflow-level one covering all its jobs). New workflows land covered or
// this guard goes red; a regression to an unbounded fleet is impossible to
// land silently.
describeWorkflowGuard('workflow hardening guard — every workflow job bounded (rm-2144)', () => {
  const workflows = readdirSync(workflowsDir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort()

  it('covers the whole on-disk workflow fleet (new workflows must stay covered)', () => {
    expect(workflows.length, 'expected at least the 13-workflow fleet of 2026-10-21').toBeGreaterThanOrEqual(13)
  })

  for (const name of workflows) {
    it(`${name}: every job declares a timeout-minutes budget`, () => {
      const doc = parse(readWorkflow(name)) as Record<string, unknown>
      const jobs = (doc.jobs ?? {}) as Record<string, Record<string, unknown>>
      const jobNames = Object.keys(jobs)
      expect(jobNames.length, `${name}: no jobs found to bound`).toBeGreaterThan(0)
      const workflowTimeout = doc['timeout-minutes']
      const unbounded = jobNames.filter(job => {
        const jobTimeout = jobs[job]?.['timeout-minutes']
        return jobTimeout === undefined && workflowTimeout === undefined
      })
      expect(
        unbounded,
        `${name}: jobs without timeout-minutes — an unbounded job eats the runner until a human notices (rm-2144)`,
      ).toEqual([])
      for (const job of jobNames) {
        const timeout = jobs[job]?.['timeout-minutes'] ?? workflowTimeout
        if (timeout === undefined) continue
        expect(typeof timeout, `${name}.${job}: timeout-minutes must be a number`).toBe('number')
        expect(timeout, `${name}.${job}: timeout-minutes must be positive`).toBeGreaterThan(0)
      }
    })
  }
})
