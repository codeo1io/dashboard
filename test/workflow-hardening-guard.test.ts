import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

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

describe('workflow hardening guard — fro-bot.yaml (rm-1450 restoration)', () => {
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

describe('workflow hardening guard — codeql.yaml (rm-1437 restoration)', () => {
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
    expect(text.match(/- name: 📦 Setup\n{8}uses: \.\/\.github\/actions\/setup/)).not.toBeNull()
  })

  it(`pins checkout at the fork digest (${CHECKOUT_V7_0_1})`, () => {
    expect(text).toContain(`uses: ${CHECKOUT_V7_0_1}`)
    expect(text).not.toContain('actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803')
  })
})
