/**
 * Property-based suite for the aggregator's pure invariants (rm-144).
 *
 * Covers the three invariant-bearing helpers that were exported additively
 * as extraction seams (no behavior change):
 * - redactRepoIdentityFromText: the redaction boundary — a not-known-public
 *   repo's identity tokens never survive into logged text.
 * - parseRepoResponse: the fail-visible contract (rm-112) — repository:null
 *   must surface stale:true, never calm unknown.
 * - sortAttentionFirst: the snapshot ordering contract — attention-first,
 *   always a permutation of the input.
 */
import fc from 'fast-check'
import {describe, expect, it} from 'vitest'
import {
  parseRepoResponse,
  redactRepoIdentityFromText,
  sortAttentionFirst,
  type DashboardRepo,
  type RepoCiStatus,
} from '../src/github/aggregator.ts'

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const nameArb = fc.stringMatching(/^\w[\w.-]{1,30}$/)

const identityArb = fc.record({
  node_id: fc.stringMatching(/^R_[A-Za-z0-9]{8,20}$/),
  owner: nameArb,
  name: nameArb,
  discovery_channel: fc.constantFrom('collab', 'discovered'),
  installation_id: fc.nat({max: 100000}),
})

/** Independent restatement of the attention rule — the spec oracle. */
function needsAttention(status: RepoCiStatus): boolean {
  return (
    status.stale ||
    status.rollupState === 'red' ||
    status.failingChecks > 0 ||
    (status.openAlertCount !== null && status.openAlertCount > 0) ||
    status.openPrCount > 0
  )
}

const statusArb = (fetchedAt: number): fc.Arbitrary<RepoCiStatus> =>
  fc.record({
    rollupState: fc.constantFrom('green', 'red', 'pending', 'unknown'),
    failingChecks: fc.nat({max: 12}),
    openPrCount: fc.nat({max: 50}),
    openIssueCount: fc.nat({max: 500}),
    openAlertCount: fc.option(fc.nat({max: 30}), {nil: null}),
    stale: fc.boolean(),
    fetchedAt: fc.constant(fetchedAt),
  })

function makeRepo(n: number, status: RepoCiStatus, owner: string, name: string): DashboardRepo {
  return {
    node_id: `R_repo${n}`,
    owner,
    name,
    full_name: `${owner}/${name}`,
    discovery_channel: 'collab',
    status,
  }
}

const graphqlRepoArb = fc.record({
  rollup: fc.option(fc.constantFrom('SUCCESS', 'FAILURE', 'ERROR', 'PENDING', 'EXPECTED', 'WEIRD_STATE'), {nil: null}),
  failing: fc.array(fc.nat({max: 9}), {maxLength: 6}),
  openPrs: fc.nat({max: 99}),
  openIssues: fc.nat({max: 999}),
  alerts: fc.option(fc.nat({max: 20}), {nil: null}),
})

function buildResponse(r: {
  rollup: string | null
  failing: number[]
  openPrs: number
  openIssues: number
  alerts: number | null
}): unknown {
  return {
    repository: {
      defaultBranchRef: {
        target: {
          statusCheckRollup: r.rollup === null ? null : {state: r.rollup},
          checkSuites: {nodes: r.failing.map(totalCount => ({checkRuns: {totalCount}}))},
        },
      },
      pullRequests: {totalCount: r.openPrs},
      issues: {totalCount: r.openIssues},
      vulnerabilityAlerts: r.alerts === null ? null : {totalCount: r.alerts},
    },
  }
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('aggregator redaction invariants (rm-144)', () => {
  it('identity tokens never survive redaction, whatever surrounds them', () => {
    fc.assert(
      fc.property(identityArb, fc.array(fc.stringMatching(/^[a-z ]{0,20}$/), {maxLength: 5}), (entry, noise) => {
        const full = `${entry.owner}/${entry.name}`
        const text = [
          `Could not resolve to a Repository with the name '${full}'`,
          `${noise.join(' ')} ${entry.owner} alone ${entry.name} too`,
        ].join(' | ')
        const out = redactRepoIdentityFromText(text, entry)
        // Strip the redaction marker first: the marker string itself can
        // contain a short owner as a substring (e.g. owner 'ED' inside
        // '[REDACTED_REPO]') without any real identity leaking.
        const stripped = out.replaceAll('[REDACTED_REPO]', '')
        expect(stripped).not.toContain(entry.owner)
        expect(stripped).not.toContain(entry.name)
        expect(stripped).not.toContain(full)
      }),
      {numRuns: 200},
    )
  })

  it('redaction leaves unrelated text verbatim', () => {
    fc.assert(
      fc.property(
        identityArb,
        fc.stringMatching(/^[a-z0-9 ._/-]{1,60}$/).filter(s => !s.includes('REDACTED')),
        (entry, innocent) => {
          const out = redactRepoIdentityFromText(innocent, entry)
          expect(out).toBe(innocent)
        },
      ),
      {numRuns: 200},
    )
  })
})

describe('aggregator parseRepoResponse invariants (rm-144)', () => {
  it('repository:null/undefined ALWAYS fails visible: stale unknown, zero counts', () => {
    fc.assert(
      fc.property(fc.nat({max: 2000000000000}), fc.nat({max: 30}), (fetchedAt, alerts) => {
        for (const repo of [null, undefined]) {
          const status = parseRepoResponse({repository: repo}, fetchedAt, alerts)
          expect(status).toEqual({
            rollupState: 'unknown',
            failingChecks: 0,
            openPrCount: 0,
            openIssueCount: 0,
            openAlertCount: null,
            stale: true,
            fetchedAt,
          })
        }
      }),
      {numRuns: 200},
    )
  })

  it('well-formed responses map field-for-field with stale:false and the provided alert count winning', () => {
    fc.assert(
      fc.property(graphqlRepoArb, fc.nat({max: 2000000000000}), fc.nat({max: 30}), fc.option(fc.nat({max: 30}), {nil: null}), (r, fetchedAt, providedAlerts, _) => {
        const status = parseRepoResponse(buildResponse(r), fetchedAt, providedAlerts)
        expect(status.stale).toBe(false)
        expect(status.fetchedAt).toBe(fetchedAt)
        expect(status.failingChecks).toBe(r.failing.reduce((a, b) => a + b, 0))
        expect(status.openPrCount).toBe(r.openPrs)
        expect(status.openIssueCount).toBe(r.openIssues)
        expect(status.openAlertCount).toBe(providedAlerts)
        const expectedRollup =
          r.rollup === 'SUCCESS'
            ? 'green'
            : r.rollup === 'FAILURE' || r.rollup === 'ERROR'
              ? 'red'
              : r.rollup === 'PENDING' || r.rollup === 'EXPECTED'
                ? 'pending'
                : 'unknown'
        expect(status.rollupState).toBe(expectedRollup)
      }),
      {numRuns: 200},
    )
  })
})

describe('aggregator ordering invariants (rm-144)', () => {
  it('sortAttentionFirst returns a permutation with every attention repo before every healthy one', () => {
    const fetchedAt = 1_700_000_000_000
    const repoListArb = fc
      .array(statusArb(fetchedAt), {minLength: 0, maxLength: 25})
      .map(statuses =>
        statuses.map((status, i) => makeRepo(i, status, `owner${i % 7}`, `repo${i}`)),
      )
    fc.assert(
      fc.property(repoListArb, repos => {
        const sorted = sortAttentionFirst([...repos])
        // Permutation: same multiset of node_ids.
        expect(sorted.map(r => r.node_id).sort()).toEqual(repos.map(r => r.node_id).sort())
        // Attention-prefix: once a healthy repo appears, no attention repo follows.
        let seenHealthy = false
        for (const repo of sorted) {
          const attention = needsAttention(repo.status)
          if (!attention) seenHealthy = true
          if (seenHealthy) expect(attention).toBe(false)
        }
      }),
      {numRuns: 300},
    )
  })
})
