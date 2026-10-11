# Cycle 2 Implementation Batch — CI-Freshness Completion (rm-913 + rm-916 + rm-917)

- date: 2026-10-11
- campaign: repository-maintenance e585dc507a3e4c7e924ee3dff81d5fac cycle:2
- run: a9e473cf983a49638e1d27c16d33b0c8 (implement attempt e7c17c650ef64db88d838bcb89358027)
- base: 843d081 (post rm-836/rm-837 landing)
- lineage: cycle-2

## Scope and disposition

The batch completes the CI-freshness capability landed by rm-836/rm-837
(159ec0eba87d cycle 3): it makes the silence signal activity-anchored (true),
surfaces mixed-fleet silence (complete), and annotates platform incidents
(contextual). Items:

- rm-916 — CI-silence activity anchor (reliability 39.0). Dormant-but-healthy
  repos (a run postdating the default-branch tip) no longer read as silently
  failing; silence now requires either no run on the current tip or run age
  exceeding max(48h, tip age + 24h grace). Tip `committedDate` is fetched as an
  additive scalar on the already-selected Commit node in both REPO_STATUS
  query fragments (no page sizes or node classes changed; the query-shape
  guard moved in lockstep). `RepoCiStatus` gains required
  `lastRunAtSource: 'absent' | 'fetched'` (provenance for null run-age: the
  web copy now distinguishes "not fetched this cycle" from "no workflow run
  carried a timestamp") and `lastPushedAt: number | null` (the anchor,
  fail-closed null). The snapshot-store boot-shape check rejects
  pre-rm-916 caches (fail-closed boot), and the client strict parse treats
  absent/non-conforming keys as contract drift (whole payload, never silent
  row drops).
- rm-913 — mixed-fleet CI-silence carrier (operator-experience 41.0;
  continuation of dead sibling run ce0c77c7's selected-but-unimplemented
  batch). The enumeration-level banner keeps its pinned every-silent
  semantics (the "no banner on mixed" test still passes verbatim); the new
  `monitoring-ci-silence-carrier` panel names silent repositories when some
  but not all are silent — the only visibility surface for silent GREEN repos,
  which render no card. Card tiers and rm-780 attention ordering untouched.
  Empty fleets light nothing.
- rm-917 — Statuspage platform-incident annotation (operator-experience 25.0).
  New server-only module `src/github/statuspage.ts` reads
  `https://www.githubstatus.com/api/v2/components.json` (Actions component)
  with a 4s bound, 5-minute TTL cache, in-flight fan-out, and fail-open null
  on any failure (failures are not cached). The snapshot carries it as
  optional `actionsStatus`; the client shape-validates it (required-nullable,
  non-object = drift); the banner renders a chip only when state is present
  AND non-operational. Precedence is documented at both code sites: banner
  truth comes from run data; the annotation can add context but never
  suppress or replace the banner. Known limitation (recorded in the mint):
  repo-scoped enforcement (the 2026-10-09 run-creation disable) stays green on
  githubstatus — this catches the platform-incident class only.
- rm-259 rider — AGENTS.md invariant 1's upstream-divergence disposition now
  names the never-absorb surface by path (`wiki-writer/**` — verified
  in-tree upstream at 270820b, implemented but undeployed, no runtime
  authority) instead of citing the package description.

## Sequencing and verification

Implemented rm-916 → rm-913 → rm-917 → rider, red-first: the new
`cycle:2 ci-freshness completion` describe (8 cases) plus the copy-split pair
failed on the pre-change tree (8 failed / 25 passed captured in
/tmp/assess-a9e4/red-run.log) before the cure.

Focused gates at the implement budget (repository-wide reserved for
full_tests):

- `corepack pnpm check-types` rc=0 (server + web + .opencode).
- `corepack pnpm lint` rc=0, zero warnings.
- Server: ci-freshness, query-shape-guard, snapshot-store, statuspage,
  dashboard, aggregator, aggregator-invariants — 200 passed.
- Web: Monitoring view + monitoring api — 54 passed (all rm-836/rm-780 pins
  intact, including "no banner on mixed" and empty-fleet never-silent).

## Files

- src/github/query-registry.ts — `committedDate` added to both Commit
  fragments.
- src/github/aggregator.ts — `lastRunAtSource`/`lastPushedAt` on
  `RepoCiStatus` (fetched rows, stale rows, absence rows),
  `extractLastPushedAt`, `actionsStatus` on the snapshot (empty, cold-start,
  and success paths).
- src/github/statuspage.ts — NEW, annotation-only Statuspage reader.
- src/routes/api.ts — (no edit needed: the DTO builder spreads the status
  row; verified by the passing dashboard suite.)
- web/src/api/monitoring.ts — contract: required provenance/anchor keys,
  shape-validated `actionsStatus` (required-nullable).
- web/src/views/Monitoring.tsx — activity-anchored `isCiSilent` (with
  seam-normalization for direct mocks), provenance-split unknown copy,
  mixed-fleet carrier panel, platform chip.
- Tests: Monitoring.test.tsx (cycle:2 describe + copy pins),
  monitoring.test.ts (drift + mapping pins), snapshot-store.test.ts (boot
  rejection twins), ci-freshness.test.ts (rm-916 describe), statuspage.test.ts
  (NEW, 8 cases), dashboard.test.ts + aggregator.test.ts +
  aggregator-invariants.property.test.ts (fixture/arbitrary widening + null
  repo literal).
- AGENTS.md — rm-259 wording rider.

ROADMAP status flips for rm-913/916/917 ride the landing patch (the worktree
ROADMAP.md is wall-rendered; do not hand-edit).
