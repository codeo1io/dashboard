---
module: dashboard
tags: [repository-maintenance, cycle-1, batch, rm-1967, rm-1968]
problem_type: maintenance-batch
---

# Repository-maintenance cycle 1 — batch record (2026-10-18, run abad829d)

Batch "monitoring board truth pass": [rm-1967, rm-1968], selected by prioritize
`698583f1` from this run's ledger. Cycle lineage: assess `38c9667f` (gates
RC0 ×4 at base `54ea2657`, 36 files / 1428 tests) → research `a9cb3bba` →
roadmap `bb8f3e23` (minted rm-1967/1968/1969; spool postimage census
271 defs / 0 dups / max rm-1969) → prioritize `698583f1` → stewardship
`cf08c352` → implement `c3b310c9` (this record's phase).

## Provenance — salvage adoption (read before reviewing the diff)

The first implement attempt(s) died to provider-family infra failures before
any PhaseResult could be written (event log `4b4ab394…` dies at
message-count 2). The landing fleet preserved their tree state as
`conductor-salvage` commit `22f8a07a` (15 paths, +616/−15) directly on base
`54ea2657`. This attempt verified that delta line-by-line against the
prioritize/stewardship acceptance before adopting it: every leg of rm-1967
and rm-1968 described below was already present and complete in the salvage;
nothing was redone. This attempt's own increments: the
`web/src/api/monitoring.test.ts` client-parse characterization legs and this
batch doc (both were absent from the salvage).

## rm-1967 — render openAlertCount (operator-experience 44.0)

The Dependabot posture was fetched, parsed, and transported end-to-end but
rendered nowhere (sole consumer: the needsAttention sort). Render-only close
of the loop — no query, DTO, or aggregator change for this leg.

- `web/src/views/Monitoring.tsx` — RedRepoCard gains a warning chip
  (`data-testid="repo-alert-count"`, `aria-label="Open Dependabot alerts: N"`,
  singular/plural) rendered only when the count is known and non-zero: null
  (security_events grant absent) renders nothing, never a fake zero.
- `web/src/views/Monitoring.test.tsx` — pins the rendered value for a 7-alert
  fixture, singularization for 1, absence for a known zero, and absence for
  null.

## rm-1968 — pushedAt + isArchived lifecycle fields (reliability 38.0)

Cures archived-repo permanent-red board noise AND the per-cycle API budget
spent re-querying frozen repos; `pushedAt` fills the no-CI dormancy hole.
Both fields ride the existing metadata:read subset — read-only invariant
untouched.

- `src/github/query-registry.ts` — `pushedAt` + `isArchived` added to BOTH
  templates (`REPO_STATUS_QUERY` and the `NO_ALERTS` fallback — the archived
  verdict must not depend on which permission path answered).
- `src/github/installations.ts` — `RepoRecord.archived` from the REST
  enumeration (`GET /installation/repositories` carries it natively);
  absent flag coerces **false** (fail-open: a live repo is never frozen).
- `src/github/aggregator.ts` — `RepoCiStatus.pushedAt/isArchived`;
  archived working-set repos skip the per-repo GraphQL loop entirely
  (enumeration flag is the live authority — a repo that un-archives
  re-enters the loop next cycle; the frozen row can never veto that), a
  never-seen archived repo gets a synthesized muted `unknown` row, a
  previously-queried one reuses its frozen facts; `archivedExcludedCount`
  on the snapshot + the structured `Aggregator refresh complete` log line.
- `src/github/snapshot-store.ts` — `archivedExcludedCount` is OPTIONAL in
  `isValidSnapshotShape` (legacy caches load; present-but-wrong-type is
  corruption).
- `src/routes/api.ts` — DTO carries `pushedAt`, `isArchived`,
  `archivedExcludedCount` (counter defaults 0 on degraded/legacy snapshots).
- `web/src/api/monitoring.ts` — strict-parse mirror: repo lifecycle fields
  optional on the wire (absent → null/false; present-but-malformed →
  `contract-drift`), counter optional (absent → 0; malformed → drift).
- `web/src/views/Monitoring.tsx` — archived repos are excluded from the red
  list and rendered in a muted "Archived repositories" section (count in the
  footer); `Last push …` dormancy line on red cards when known.
- Tests: `test/query-shape-guard.test.ts` (both templates select both
  fields), `test/aggregator.test.ts` (field carry, pre-rm-1968 response
  parse, enumeration-flagged exclusion + zero GraphQL spend + counter,
  frozen-fact reuse with no second query, un-archive re-entry),
  `test/aggregator-invariants.property.test.ts` (lifecycle arbitrary with
  bounded no-invalid dates; null-repository oracle mirror),
  `test/snapshot-store.test.ts` (counter round-trip / legacy-load /
  malformed-reject), `test/installations.test.ts` + `test/make-enumerate-result.ts`
  (fail-open coercion), `test/dashboard.test.ts` (DTO fixtures),
  `web/src/views/Monitoring.test.tsx` (muting, archived section, dormancy
  line), `web/src/api/monitoring.test.ts` (client parse characterization,
  added by this attempt).

## Verification

Focused (this phase): server suites
`test/{aggregator,aggregator-invariants.property,query-shape-guard,snapshot-store,installations,dashboard}.test.ts`
via `vitest run`, web suites
`web/src/{views/Monitoring.test.tsx,api/monitoring.test.ts}` via
`vitest run --config web/vitest.config.ts`, plus `pnpm lint` and
`pnpm check-types`. Full battery is deferred to the full_tests gate per the
phase budget.

## Fold notes

- All batch CODE surfaces are byte-identical between base `54ea2657` and
  origin/main `64cd2f6a` (verified first-hand this phase) — the delta is
  content-fold-clean with zero rework.
- Compose by content with the unlanded snapshot-validation sibling legs
  (43cf6bc3 platformStatus validation; ed8f47e0 in-flight): both extend
  `isValidSnapshotShape`/`DashboardRepo` — first-landed-wins, renumber-free
  merge expected since the branches are disjoint.
- `web/dist` must be rebuilt at fold (`pnpm test` pretest does this) — the
  checked-in dist predates the Monitoring.tsx change.
