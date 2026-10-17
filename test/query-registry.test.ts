/**
 * rm-022 slice — direct module coverage for src/github/query-registry.ts.
 *
 * test/query-shape-guard.test.ts pins the templates' SAFETY properties (no
 * //-comments, registry completeness against the module source, read-only
 * roots, drill-down selections). This suite pins the module's own CONTRACT
 * directly and NON-circularly — the guard builds its query map from the
 * registry itself, so "registry entries are the exported constants" is only
 * provable from direct imports — plus the fallback delta, the declared
 * variable surface, the failing-check conclusion set, and the rm-288
 * import-free property the pristine-checkout canary depends on.
 */
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

import {
  REPO_STATUS_QUERY,
  REPO_STATUS_QUERY_NO_ALERTS,
  REPO_STATUS_QUERY_REGISTRY,
} from '../src/github/query-registry.ts'

const moduleSource = readFileSync(
  fileURLToPath(new URL('../src/github/query-registry.ts', import.meta.url)),
  'utf8',
)

const TEMPLATES = [REPO_STATUS_QUERY, REPO_STATUS_QUERY_NO_ALERTS] as const

describe('query-registry module contract (rm-022 direct coverage)', () => {
  it('registry entries ARE the exported template constants (non-circular identity)', () => {
    expect(REPO_STATUS_QUERY_REGISTRY).toEqual([
      {name: 'REPO_STATUS_QUERY', query: REPO_STATUS_QUERY},
      {name: 'REPO_STATUS_QUERY_NO_ALERTS', query: REPO_STATUS_QUERY_NO_ALERTS},
    ])
  })

  it('the NO_ALERTS fallback drops exactly the vulnerabilityAlerts selection', () => {
    expect(REPO_STATUS_QUERY.includes('vulnerabilityAlerts(states: OPEN)')).toBe(true)
    // The fallback must not mention the field at all — openAlertCount is
    // documented as null (not stale) when this variant runs.
    expect(REPO_STATUS_QUERY_NO_ALERTS.includes('vulnerabilityAlerts')).toBe(false)
  })

  it('both templates declare exactly the variables the aggregator supplies', () => {
    for (const query of TEMPLATES) {
      const declared = [...query.matchAll(/\$(\w+):/g)].map(match => match[1] ?? '')
      expect([...new Set(declared)].sort()).toEqual(['name', 'owner'])
    }
  })

  it('the failing-check filter keeps its conclusion set (the aggregator counts on it)', () => {
    const filter =
      'filterBy: { status: COMPLETED, conclusions: [FAILURE, TIMED_OUT, CANCELLED, ACTION_REQUIRED, STARTUP_FAILURE] }'
    for (const query of TEMPLATES) {
      expect(query.includes(filter)).toBe(true)
    }
  })

  it('the module stays import-free (rm-288: the canary runs from a pristine checkout)', () => {
    const importLines = moduleSource.split('\n').filter(line => /^import\b/.test(line))
    expect(importLines).toEqual([])
    expect(moduleSource.includes('require(')).toBe(false)
  })
})
