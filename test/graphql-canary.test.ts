/**
 * Test suite for scripts/graphql-canary.ts (ledger rm-1973, cycle-18 batch
 * run 743f2e47 — the canary credential-parity half).
 *
 * Two contracts, both born as review findings and pinned here offline:
 *
 * 1. classifyGraphqlErrors: a run whose EVERY GraphQL error is a
 *    vulnerability-alerts permission denial is scope-limited (WARN — the
 *    aggregator serves those targets via the NO_ALERTS fallback, rm-171),
 *    anything else is query-drift (red). The raw `errors[]` entries arrive
 *    as plain objects, not Error instances — the classifier wraps them.
 *
 * 2. Direct-invocation guard: importing this module from a test must NOT
 *    fire the live run. The mere fact that this suite imports the script
 *    and survives (no GITHUB_TOKEN demanded, no process.exit) IS the guard
 *    proof — before the guard, an import executed `await main()`, which
 *    exits(1) on a missing token and would have killed the whole test
 *    process before a single assertion ran.
 */

import {describe, expect, it} from 'vitest'
import {classifyGraphqlErrors} from '../scripts/graphql-canary.ts'

describe('graphql canary — classifyGraphqlErrors (rm-1973)', () => {
  it('classifies all-alerts-denial error sets as scope-limited', () => {
    expect(
      classifyGraphqlErrors([
        {message: 'Must have push access to view vulnerability alerts.', type: 'FORBIDDEN'},
        {message: 'Resource not accessible by integration', type: 'FORBIDDEN'},
      ]),
    ).toBe('scope-limited')
  })

  it('classifies raw (non-Error) GraphQL error objects, wrapping their message', () => {
    expect(
      classifyGraphqlErrors([{message: "Field 'vulnerabilityAlerts' doesn't exist on type 'Repository'"}]),
    ).toBe('scope-limited')
  })

  it('classifies mixed error sets as query-drift (one real defect poisons the run)', () => {
    expect(
      classifyGraphqlErrors([
        {message: 'Resource not accessible by integration', type: 'FORBIDDEN'},
        {message: "Field 'statusCheckRollup' doesn't exist on type 'Commit'", type: 'INVALID'},
      ]),
    ).toBe('query-drift')
  })

  it('classifies a non-alerts denial alone as query-drift', () => {
    expect(classifyGraphqlErrors([{message: "Field 'failingCheckDetails' doesn't exist on type 'CheckRollupType'"}])).toBe('query-drift')
  })

  it('classifies Error instances by their message', () => {
    expect(classifyGraphqlErrors([new Error('Must have push access to view vulnerability alerts.')])).toBe('scope-limited')
    expect(classifyGraphqlErrors([new Error('Bad credentials')])).toBe('query-drift')
  })

  it('treats an empty error set as query-drift — absence is not evidence of a scope limit', () => {
    expect(classifyGraphqlErrors([])).toBe('query-drift')
  })
})
