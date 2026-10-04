import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'

import {
  EXCLUDED_SCHEDULED_WORKFLOWS,
  GUARD_WORKFLOWS,
  RED_CONCLUSIONS,
  selectVerdictRun,
  verdictFor,
  type WorkflowRun,
} from '../scripts/guard-watchdog.ts'

// rm-289 (run 7e6ab9da cycle:1 B2): the scheduled-guard watchdog. Two guard
// halves live here:
//   1. the detection predicate — pure functions over Actions-API run shapes,
//      pinned against the historical 2026-09-28 canary failure (the run that
//      sat unobserved and motivated the watchdog);
//   2. the guard census — every workflow file carrying a schedule trigger
//      must be watched by the watchdog script or appear (with a reason) in
//      its exclusion list, and every entry in both lists must be a real
//      scheduled workflow file. No silent drift in either direction.

function run(overrides: Partial<WorkflowRun>): WorkflowRun {
  return {
    id: 1,
    name: 'run',
    event: 'schedule',
    status: 'completed',
    conclusion: 'success',
    created_at: '2026-10-01T00:00:00Z',
    html_url: 'https://example.invalid/runs/1',
    ...overrides,
  }
}

describe('guard-watchdog detection predicate (rm-289)', () => {
  it('selects the 2026-09-28 canary failure as RED — the run that motivated the watchdog', () => {
    // Shaped from the live Actions run list (assess 2026-10-04): canary's
    // latest run stayed the 2026-09-28 failure for days with nothing watching.
    const canaryFailure = [
      run({
        id: 6823819758,
        name: 'GraphQL canary',
        event: 'workflow_dispatch',
        conclusion: 'failure',
        created_at: '2026-09-28T11:46:01Z',
        html_url: 'https://api.github.com/repos/codeo1io/dashboard/actions/runs/6823819758',
      }),
    ]
    expect(verdictFor(canaryFailure)).toBe('red')
    expect(selectVerdictRun(canaryFailure)?.id).toBe(6823819758)
  })

  it('treats every red conclusion class as red', () => {
    for (const conclusion of RED_CONCLUSIONS) {
      expect(verdictFor([run({conclusion})]), `conclusion=${conclusion}`).toBe('red')
    }
    // The four classes the ledger names, spelled out so a regression in
    // RED_CONCLUSIONS itself cannot hide behind this loop.
    expect(RED_CONCLUSIONS).toEqual(['failure', 'cancelled', 'startup_failure', 'timed_out'])
  })

  it('treats success and non-verdict conclusions as not-red', () => {
    expect(verdictFor([run({conclusion: 'success'})])).toBe('green')
    // skipped/neutral are not alerts; the report table still names the actual
    // conclusion so the operator can see the guard did not truly run.
    expect(verdictFor([run({conclusion: 'skipped'})])).toBe('green')
    expect(verdictFor([run({conclusion: 'neutral'})])).toBe('green')
  })

  it('falls through an in-progress newest run to the newest COMPLETED run (CodeQL mid-run case)', () => {
    const runs = [
      run({id: 2, status: 'in_progress', conclusion: null}),
      run({id: 1, conclusion: 'failure'}),
    ]
    // The in-progress run is NOT a verdict — neither red (false page) nor a
    // mask over the last real failure underneath it.
    expect(verdictFor(runs)).toBe('red')
    expect(selectVerdictRun(runs)?.id).toBe(1)
    expect(selectVerdictRun(runs)?.conclusion).toBe('failure')
  })

  it('classifies no-runs and all-in-progress guard lists as non-alerts', () => {
    expect(verdictFor([])).toBe('no-runs')
    expect(verdictFor([run({status: 'queued', conclusion: null})])).toBe('no-completed-run')
    expect(verdictFor([run({status: 'in_progress', conclusion: null})])).toBe('no-completed-run')
  })

  it('never reads a null conclusion on a completed run as a verdict', () => {
    // status=completed with conclusion=null (API edge around cancellation
    // reporting) must not be selected as the verdict run.
    const runs = [run({status: 'completed', conclusion: null}), run({id: 9, conclusion: 'success'})]
    expect(selectVerdictRun(runs)?.id).toBe(9)
  })
})

describe('guard-watchdog census (rm-289)', () => {
  const workflowsDir = join(import.meta.dirname, '..', '.github', 'workflows')
  const workflowFiles = readdirSync(workflowsDir).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
  const scheduled = workflowFiles.filter(file =>
    /^\s*schedule:/m.test(readFileSync(join(workflowsDir, file), 'utf8')),
  )

  it('the census scan sees the workflow tree (guard against a vacuous pass)', () => {
    expect(workflowFiles.length).toBeGreaterThan(5)
    expect(scheduled).toContain('canary.yaml')
    expect(scheduled).toContain('audit.yaml')
  })

  it('every scheduled workflow is watched or explicitly excluded', () => {
    const covered = new Set([...GUARD_WORKFLOWS, ...EXCLUDED_SCHEDULED_WORKFLOWS])
    expect(
      scheduled.filter(file => !covered.has(file)),
      'scheduled workflows neither watched nor excluded — pick a side and document it',
    ).toEqual([])
  })

  it('every watched or excluded entry is a real scheduled workflow file', () => {
    for (const file of [...GUARD_WORKFLOWS, ...EXCLUDED_SCHEDULED_WORKFLOWS]) {
      expect(existsSync(join(workflowsDir, file)), `${file} does not exist`).toBe(true)
      expect(scheduled, `${file} carries no schedule trigger — remove it from the watchdog lists`).toContain(file)
    }
  })

  it('fro-bot stays excluded (disabled_manually, permanently non-green) and the watchdog never watches itself (echo loop)', () => {
    expect(EXCLUDED_SCHEDULED_WORKFLOWS).toContain('fro-bot.yaml')
    expect(EXCLUDED_SCHEDULED_WORKFLOWS).toContain('watchdog.yaml')
    expect(GUARD_WORKFLOWS).not.toContain('watchdog.yaml')
  })
})
