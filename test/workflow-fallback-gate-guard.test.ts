import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

// rm-1961 fallback-gate executed-work recency guard (run 42466e744796 cycle:4
// implement, batch U1; defect found by this run's assess as MED#1 — the
// hollow-success chain).
//
// The fallback gates in canary.yaml, audit.yaml and base-drift.yaml decide
// whether a workflow_run re-arm fire skips ("already covered by a success in
// the recency window"). The landed shape counted RUN-LEVEL conclusions:
//
//   gh run list --workflow <wf>.yaml --status success --created A..B \
//     --json databaseId --jq 'length'
//
// A skip-path fire concludes SUCCESS at the run level (the gate job succeeds,
// the real jobs are skipped), so the old count treated its own hollow fires as
// coverage: one PR-branch skip fire in the window suppresses every later
// main-branch fire for six days, and main-branch skips self-perpetuate —
// exactly in the schedule-darkness scenario the rm-1961 re-arm exists to cure.
//
// The cure this guard pins: the gate counts only EXECUTED-work successes —
// run-list candidates are restricted to the main branch, and each candidate
// must show a non-gate job that concluded success (gh run view --json jobs)
// before it counts as coverage. This test was written RED-FIRST against the
// pre-cure tree (see the implement batch carrier doc for the red run).

const WORKFLOWS = [
  '.github/workflows/canary.yaml',
  '.github/workflows/audit.yaml',
  '.github/workflows/base-drift.yaml',
] as const

const GATE_JOB_NAME = 'fallback-gate'

/**
 * Extract the `fallback-gate:` job block (top-level key to the next
 *  top-level key of the same indent or end of file).
 */
function gateBlock(text: string): string | null {
  const start = text.indexOf(`  ${GATE_JOB_NAME}:`)
  if (start === -1) return null
  const rest = text.slice(start + 2 + GATE_JOB_NAME.length + 1)
  // The block ends at the next line indented 2 spaces (next job key) that is
  // not a deeper-indented continuation. Job bodies indent by 4+.
  const nextJob = rest.match(/^ {2}[\w-]+:/m)
  const end = nextJob && nextJob.index !== undefined ? nextJob.index : rest.length
  return rest.slice(0, end)
}

describe('workflow fallback-gate executed-work recency (rm-1961 hollow-success cure)', () => {
  for (const path of WORKFLOWS) {
    describe(path, () => {
      const text = readFileSync(path, 'utf8')
      const block = gateBlock(text)

      it('has a fallback-gate job', () => {
        expect(block, `no ${GATE_JOB_NAME} job in ${path}`).not.toBeNull()
      })

      it('recency candidates are restricted to the main branch', () => {
        expect(block ?? '', 'expected --branch main on the recency run list').toContain(
          '--branch main',
        )
      })

      it('counts only executed-work successes (job-level check, not run-level conclusions)', () => {
        const blockText = block ?? ''
        expect(
          blockText,
          'expected a gh run view job-level probe of candidate runs',
        ).toContain('gh run view')
        expect(blockText, 'expected the job-level probe to inspect jobs').toContain(
          '--json jobs',
        )
        expect(
          blockText,
          'expected a selector that requires a non-gate job to have concluded success',
        ).toMatch(/jobs\[\]\s*;\s*\.name\s*!=\s*['"]fallback-gate['"]/)
      })

      it('no bare run-level success count remains (hollow-success regression pin)', () => {
        expect(
          block ?? '',
          'run-level conclusion counting reintroduced the hollow-success chain',
        ).not.toMatch(/--json databaseId --jq 'length'/)
      })
    })
  }
})
