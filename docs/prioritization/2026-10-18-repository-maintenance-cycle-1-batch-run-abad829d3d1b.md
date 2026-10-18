---
module: dashboard
tags: `[repository-maintenance, cycle-1, batch, rm-1967, rm-1968]`
problem_type: maintenance-batch
---

# Repository-maintenance cycle 1 — batch record (2026-10-18, run abad829d)

Batch "monitoring board truth pass": legs `rm-1967` + `rm-1968`, selected by prioritize
`698583f1` from this run's ledger. Cycle lineage: assess `38c9667f` (gates
RC0 ×4 at base `54ea2657`, 36 files / 1428 tests) → research `a9cb3bba` →
roadmap `bb8f3e23` (minted rm-1967/1968/1969; spool postimage census
271 defs / 0 dups / max rm-1969) → prioritize `698583f1` → stewardship
`cf08c352` → implement `c3b310c9` (salvaged; see provenance) → implement
`8f92f8f4` (this record's phase: salvage verification, focused gates, lint
cures, doc truing).

## Provenance — salvage adoption (read before reviewing the diff)

The first implement attempts died to provider-family infra failures before
any PhaseResult could be written. The landing fleet preserved their tree
state as TWO `conductor-salvage` commits directly on base `54ea2657`:
`22f8a07a` (15 paths, +616/−15, 2026-10-17 23:28Z — every code leg and test
below) and `43ff4a9` (3 paths, 2026-10-18 07:11Z — the
`web/src/api/monitoring.test.ts` client-parse legs, a scoping fix in
`Monitoring.test.tsx`, and this batch doc). Neither salvage carries a
validation claim ("content preservation only"). Attempt `8f92f8f4` verified
both deltas line-by-line against the prioritize/stewardship acceptance
before adopting them: every leg of rm-1967 and rm-1968 described below was
already present and complete; nothing was redone. That attempt's own
increments: running the focused gate battery the salvages never had (initial
`pnpm lint` was RED with 5 errors carried in the salvage), curing them —
`@stylistic/operator-linebreak` ×2 in `src/github/aggregator.ts` (ternary →
if/else, behavior-identical), `unicorn/no-negated-condition` ×2 in
`test/aggregator.test.ts` (inverted fixture conditions), and
`markdown/no-missing-label-refs` ×1 in this doc's frontmatter (house
backticked-tags form) — plus the doc corrections below.

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

Results (attempt `8f92f8f4`, post-lint-cure): server focused battery 6 files /
246 tests passed; web focused battery 2 files / 34 tests passed; `pnpm lint`
RC0; `pnpm check-types` RC0 (server + `web/` + `.opencode`).

## Fold notes

- All batch CODE surfaces are byte-identical between base `54ea2657` and
  origin/main — verified first-hand by attempt `c3b310c9` at `64cd2f6a` and
  re-verified by attempt `8f92f8f4` at `c02f90d` (744 commits ahead of base;
  the drift landed entirely outside these files) — the delta is
  content-fold-clean with zero rework.
- Compose by content with the unlanded snapshot-validation sibling legs
  (43cf6bc3 platformStatus validation; ed8f47e0 in-flight): both extend
  `isValidSnapshotShape`/`DashboardRepo` — first-landed-wins, renumber-free
  merge expected since the branches are disjoint.
- `web/dist` is NOT tracked (gitignored build artifact) — nothing to fold
  there; `pnpm test`'s pretest builds it fresh in every environment that
  needs it.
