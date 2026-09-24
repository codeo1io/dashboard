/**
 * rm-177 structural guard — the exported GraphQL query templates must be
 * live-API-safe by construction.
 *
 * Origin: 2026-09-24, run 6fe26972 assess. Both status templates carried a
 * `//`-prefixed comment INSIDE the template literal; GitHub's GraphQL parser
 * rejects the query verbatim (`Expected NAME, actual: UNKNOWN_CHAR ("/")`,
 * proven live via `gh api graphql`), so every per-repo fetch failed into the
 * catch and the whole board rendered stale/unknown with zeroed counts — for
 * four days, with CI green, because every aggregator test fakes the transport
 * and nothing ever sends the real string to the real API.
 *
 * This guard is the offline half of the fix's defense-in-depth (the runtime
 * half is the weekly canary workflow, rm-179): any future `//`-style comment
 * line inside a query template fails HERE, at author time, instead of
 * silently at the API boundary. Negatively verified at introduction by
 * re-injecting a `//` line into REPO_STATUS_QUERY and observing this suite
 * red (then reverting) — see docs/prioritization/2026-09-24-cycle-12-batch.md.
 *
 * Note the guard is deliberately about COMMENT SYNTAX, not full GraphQL
 * validation: full validation happens against the real API in the canary.
 */
import {describe, expect, it} from 'vitest'

import {REPO_STATUS_QUERY, REPO_STATUS_QUERY_NO_ALERTS} from '../src/github/aggregator.ts'

const QUERIES: Record<string, string> = {
  REPO_STATUS_QUERY,
  REPO_STATUS_QUERY_NO_ALERTS,
}

describe('GraphQL query-shape guard (rm-177)', () => {
  it('no //-style comment lines inside any query template (live GraphQL rejects them)', () => {
    for (const [name, query] of Object.entries(QUERIES)) {
      const offenders = query
        .split('\n')
        .filter(line => line.trimStart().startsWith('//'))
      expect(
        offenders,
        `${name}: //-comments are invalid GraphQL (UNKNOWN_CHAR) — use # comments`,
      ).toEqual([])
    }
  })

  it('each template is a parameterized repo query (shape sanity, not full validation)', () => {
    for (const [name, query] of Object.entries(QUERIES)) {
      expect(query.trimStart().startsWith('query '), `${name}: missing root operation`).toBe(true)
      expect(query.includes('repository(owner: $owner, name: $name)'), `${name}: missing repo alias`).toBe(true)
      expect(query.includes('$owner: String!'), `${name}: missing owner variable`).toBe(true)
    }
  })

  it('both templates agree on every field parseRepoResponse depends on', () => {
    // A field selected by exactly one template is how alertCount-null gaps
    // happen (vulnerabilityAlerts is the sanctioned exception — see
    // REPO_STATUS_QUERY_NO_ALERTS's doc comment). Compare every parameterized
    // selection in each template, ignoring the root operation line (whose
    // operation NAME legitimately differs between the two variants).
    const fields = (query: string) =>
      new Set([...query.replace(/^\s*query\s+\w+/, '').matchAll(/([a-z]+\()/gi)].map(m => (m[1] ?? '').slice(0, -1)))
    const a = fields(REPO_STATUS_QUERY)
    const b = fields(REPO_STATUS_QUERY_NO_ALERTS)
    const symmetricDiff = [...a].filter(f => !b.has(f)).concat([...b].filter(f => !a.has(f)))
    expect(symmetricDiff).toEqual(['vulnerabilityAlerts'])
  })
})
