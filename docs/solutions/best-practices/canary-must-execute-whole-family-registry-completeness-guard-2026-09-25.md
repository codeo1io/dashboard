---
title: A live-execution canary must enumerate the whole family it guards — registry plus completeness guard
date: 2026-09-25
category: best-practices
module: dashboard
problem_type: best_practice
component: graphql-canary
severity: medium
applies_when:
  - A scheduled/live canary, golden test, or probe executes one representative of a family of exported constants (query templates, payload schemas, feature flags)
  - Structural tests verify the family's shape but nothing executes the other members against the real endpoint
---

> **Provenance (integrate 2026-09-25, conflict case 394d4abf):** this solution doc
> rode candidate be8a46e (run aaa84dff, PR #136) into main 828a1e6; its lineage id
> rm-184 renumbers to **rm-225** at that landing (main's landed rm-184 is the
> metadata private-flag fail-closed item) — all `rm-225` references below were
> authored as `rm-184`.

## Context

The rm-179 canary (landed 2026-09-24) executed the exact exported
`REPO_STATUS_QUERY` against the live GitHub GraphQL API and sha256-logged the
response — a deliberate "the canary must execute what ships" lattice. But the
aggregator ships **two** live-destined templates: `REPO_STATUS_QUERY` and
`REPO_STATUS_QUERY_NO_ALERTS` (the per-repo fallback when the alerts scope is
unavailable). The canary imported the primary directly, so the second template
never executed against the real API — a schema drift in `NO_ALERTS` alone would
have surfaced only as runtime per-repo failures, exactly the class the canary
was built to pre-empt. The structural guard (`test/query-shape-guard.test.ts`)
compared field lists inside each template and could not see the gap.

Fixed 2026-09-25 (cycle-13 batch B1, rm-225): `src/github/aggregator.ts` now
exports `REPO_STATUS_QUERY_REGISTRY` (each entry pairs a template `name` with
its exact `query` text) as the single family inventory; `scripts/graphql-canary.ts` iterates the registry
instead of importing a template directly; and two source-scan completeness tests
fail at author time if (a) any exported `REPO_STATUS_QUERY*` constant is missing
from the registry or (b) the canary goes back to importing template constants
directly.

## Guidance

- If a canary or golden test covers "what ships", enumerate what ships in a
  **registry the producer exports** and have the consumer iterate it — never
  import one family member directly.
- Add a completeness guard at the source level: a test that parses the producer
  module for every exported constant matching the family pattern and asserts
  each appears in the registry. New family members then fail CI the day they are
  added, not the day they drift.
- Also guard the consumer's discipline: assert the canary imports the registry
  (and nothing else from the template module), so the loop cannot be quietly
  bypassed.
- Structural/shape tests and live-execution canaries are complements, not
  substitutes: shape tests catch field-list drift inside a template; only
  execution catches schema errors the shape extraction cannot model.

## Why This Matters

Representative-member coverage is invisible in review: every file involved looks
intentional, the canary is green, and the uncovered sibling is live-destined.
The registry converts an open-ended obligation ("run what ships") into a
finite, author-time-checked inventory.

## Examples

```ts
// Registry as the single family inventory (producer side)
export const REPO_STATUS_QUERY_REGISTRY: readonly RegisteredQueryTemplate[] = [
  {name: 'REPO_STATUS_QUERY', query: REPO_STATUS_QUERY},
  {name: 'REPO_STATUS_QUERY_NO_ALERTS', query: REPO_STATUS_QUERY_NO_ALERTS},
]

// Canary iterates the registry — adding a template extends coverage automatically
for (const entry of REPO_STATUS_QUERY_REGISTRY) { await runTemplate(token, entry) }
```
