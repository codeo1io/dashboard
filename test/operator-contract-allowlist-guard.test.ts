import type {OperatorWebStatus} from '../src/gateway/operator-contract/run-status.ts'
/**
 * rm-884: single-sourcing guard for the operator-contract status allowlists.
 *
 * The batch's root finding: three independent declarations of "which statuses a
 * run summary may carry" had drifted apart across the 1.9.0 → 1.11.0 window —
 *
 *   1. the vendored server-side allowlist (src/gateway/operator-contract/run-summary.ts
 *      RUN_SUMMARY_STATUSES) rejected the waiting pair,
 *   2. the browser run-index parser (public/operator-run-index.js
 *      VALID_RUN_SUMMARY_STATUSES) rejected them too, while
 *   3. the browser stream module (public/operator-stream.js) already overlaid them,
 *
 * so a gateway running 1.10+ produced runs the dashboard's own summary surfaces
 * refused to render. This guard locks every declaration to the contract's set
 * in BOTH directions, so no surface can move alone again:
 *
 *   - contract RUN_SUMMARY_STATUSES == browser index VALID_RUN_SUMMARY_STATUSES
 *   - contract RUN_SUMMARY_STATUSES == web runtime SUMMARY_STATUSES mirror
 *     (pinned from web/src/operator/runtime.test.ts, same family)
 *   - summary statuses ⊂ OperatorWebStatus (the stream-status union is the superset;
 *     `blocked` is stream-only and must stay out of the summary set)
 *
 * Root test/ (not web/src/) because web/src must never import src/ — the
 * contract↔index comparison runs from here where both sides are importable. The
 * web runtime's SUMMARY_STATUSES mirror is pinned from the web side instead
 * (web/src/operator/runtime.test.ts) for the same reason: importing runtime.ts
 * here would drag DOM-dependent code into the root strip-only tsc project.
 */
import {describe, expect, it} from 'vitest'
import {VALID_RUN_SUMMARY_STATUSES} from '../public/operator-run-index.js'
import {RUN_SUMMARY_STATUSES, type RunSummaryStatus} from '../src/gateway/operator-contract/run-summary.ts'

type RunSummaryStatusesAreWebStatuses = Record<RunSummaryStatus, OperatorWebStatus>

/** Compile-time: every summary status is a member of the stream-status union. */
const summaryStatusesAreWebStatuses: RunSummaryStatusesAreWebStatuses = {
  queued: 'queued',
  running: 'running',
  waiting_for_approval: 'waiting_for_approval',
  waiting_for_question: 'waiting_for_question',
  succeeded: 'succeeded',
  failed: 'failed',
  cancelled: 'cancelled',
} satisfies RunSummaryStatusesAreWebStatuses

describe('operator-contract status allowlist single-sourcing (rm-884)', () => {
  it('the vendored contract set is exactly the seven statuses of 1.11.0', () => {
    expect([...RUN_SUMMARY_STATUSES].toSorted()).toEqual([
      'cancelled',
      'failed',
      'queued',
      'running',
      'succeeded',
      'waiting_for_approval',
      'waiting_for_question',
    ])
  })

  it('the browser run-index allowlist equals the contract set (both directions)', () => {
    expect(new Set<string>(VALID_RUN_SUMMARY_STATUSES)).toEqual(new Set<string>(RUN_SUMMARY_STATUSES))
    expect(VALID_RUN_SUMMARY_STATUSES).toHaveLength(RUN_SUMMARY_STATUSES.length)
  })

  it('the summary table covering the compile-time union cannot drift from the contract set', () => {
    expect(Object.keys(summaryStatusesAreWebStatuses).toSorted()).toEqual([...RUN_SUMMARY_STATUSES].toSorted())
  })

  it('the stream-only status blocked stays out of every summary surface', () => {
    expect(RUN_SUMMARY_STATUSES).not.toContain('blocked')
    expect(VALID_RUN_SUMMARY_STATUSES.has('blocked')).toBe(false)
  })
})
