/**
 * rm-836 — per-repo CI-freshness signal (server half).
 *
 * Pins the extraction contract that feeds the operator's last-CI-activity
 * line and the enumeration-level CI-silence banner:
 * - RepoCiStatus.lastRunAt = newest workflowRun.startedAt across the head
 *   commit's check suites (ms since epoch), max regardless of conclusion.
 * - Fail-closed: no suite, no workflowRun, absent/empty/unparsable startedAt
 *   all yield null (unknown run-age), never a fabricated clock.
 * - Every fail-visible/stale path carries lastRunAt: null (typed interface;
 *   this suite pins the parse-level ones; the literal construction sites are
 *   compile-pinned by RepoCiStatus requiring the key).
 */

import {describe, expect, it} from 'vitest'
import {extractLastPushedAt, parseRepoResponse} from '../src/github/aggregator.ts'

const FETCHED_AT = 1_700_000_000_000

/** Suite row with a workflow run that started at the given ISO timestamp. */
function suiteWithRun(startedAt: string | null | undefined, completedAt?: string | null) {
  const workflowRun =
    startedAt === undefined ? undefined : {displayTitle: 'CI', runAttempt: 1, startedAt, completedAt: completedAt ?? null}
  return {
    workflowRun,
    checkRuns: {totalCount: 0, nodes: []},
  }
}

/** Minimal full response around one default-branch head target. */
function responseWithSuites(suites: unknown[], extras: Record<string, unknown> = {}) {
  return {
    repository: {
      defaultBranchRef: {
        target: {
          checkSuites: {nodes: suites},
          ...extras,
        },
      },
      pullRequests: {totalCount: 0},
      issues: {totalCount: 0},
    },
  }
}

describe('rm-836 CI-freshness extraction (parseRepoResponse)', () => {
  it('lastRunAt = newest startedAt across suites (max regardless of conclusion)', () => {
    const status = parseRepoResponse(
      responseWithSuites([
        suiteWithRun('2023-11-14T21:00:00.000Z'), // older
        suiteWithRun('2023-11-14T22:30:00.000Z'), // newest
        suiteWithRun('2023-11-14T22:00:00.000Z'), // middle
      ]),
      FETCHED_AT,
      null,
    )
    expect(status.lastRunAt).toBe(Date.parse('2023-11-14T22:30:00.000Z'))
    expect(status.stale).toBe(false)
  })

  it('a running run (startedAt set, completedAt null) still anchors freshness', () => {
    const status = parseRepoResponse(
      responseWithSuites([suiteWithRun('2023-11-14T22:30:00.000Z', null)]),
      FETCHED_AT,
      null,
    )
    expect(status.lastRunAt).toBe(Date.parse('2023-11-14T22:30:00.000Z'))
  })

  it('fail-closed: no suites / no workflowRun / absent startedAt all yield null, never a clock', () => {
    expect(parseRepoResponse(responseWithSuites([]), FETCHED_AT, null).lastRunAt).toBeNull()
    expect(
      parseRepoResponse(responseWithSuites([{workflowRun: undefined, checkRuns: {totalCount: 0, nodes: []}}]), FETCHED_AT, null)
        .lastRunAt,
    ).toBeNull()
    expect(parseRepoResponse(responseWithSuites([suiteWithRun(undefined)]), FETCHED_AT, null).lastRunAt).toBeNull()
    expect(parseRepoResponse(responseWithSuites([suiteWithRun(null)]), FETCHED_AT, null).lastRunAt).toBeNull()
  })

  it('fail-closed: an unparsable startedAt contributes nothing (NaN is not 0)', () => {
    const status = parseRepoResponse(
      responseWithSuites([suiteWithRun('not-a-timestamp'), suiteWithRun('2023-11-14T22:30:00.000Z')]),
      FETCHED_AT,
      null,
    )
    // The parsable suite still wins; a lone unparsable one would yield null.
    expect(status.lastRunAt).toBe(Date.parse('2023-11-14T22:30:00.000Z'))
    expect(parseRepoResponse(responseWithSuites([suiteWithRun('not-a-timestamp')]), FETCHED_AT, null).lastRunAt).toBeNull()
  })

  it('repository:null (error/absent repo in GraphQL response) is stale with lastRunAt null', () => {
    const status = parseRepoResponse({repository: null}, FETCHED_AT, null)
    expect(status.stale).toBe(true)
    expect(status.lastRunAt).toBeNull()
  })
})

describe('rm-916 CI-freshness activity anchor (parseRepoResponse + extractLastPushedAt)', () => {
  it('lastPushedAt = tip committedDate; lastRunAtSource = fetched on the happy path', () => {
    const status = parseRepoResponse(
      responseWithSuites([suiteWithRun('2023-11-14T22:30:00.000Z')], {committedDate: '2023-11-14T21:00:00.000Z'}),
      FETCHED_AT,
      null,
    )
    expect(status.lastRunAtSource).toBe('fetched')
    expect(status.lastPushedAt).toBe(Date.parse('2023-11-14T21:00:00.000Z'))
    // run postdates tip -> healthy-by-anchor (web predicate consumes this)
    expect(status.lastRunAt !== null && status.lastPushedAt !== null && status.lastRunAt >= status.lastPushedAt).toBe(true)
  })

  it('absent/unparsable committedDate yields lastPushedAt null (fail-closed, never fabricated)', () => {
    expect(extractLastPushedAt(undefined)).toBeNull()
    expect(extractLastPushedAt({})).toBeNull()
    expect(extractLastPushedAt({committedDate: null})).toBeNull()
    expect(extractLastPushedAt({committedDate: ''})).toBeNull()
    expect(extractLastPushedAt({committedDate: 'not-a-date'})).toBeNull()
    const status = parseRepoResponse(responseWithSuites([suiteWithRun('2023-11-14T22:30:00.000Z')]), FETCHED_AT, null)
    expect(status.lastPushedAt).toBeNull()
    // Web predicate falls back to the absolute floor when the anchor is null.
    expect(status.lastRunAtSource).toBe('fetched')
  })

  it('queried-but-no-timestamp still says fetched (provenance drives the web copy split)', () => {
    const status = parseRepoResponse(responseWithSuites([suiteWithRun(null)]), FETCHED_AT, null)
    expect(status.lastRunAt).toBeNull()
    expect(status.lastRunAtSource).toBe('fetched')
    expect(status.lastPushedAt).toBeNull()
  })
})
