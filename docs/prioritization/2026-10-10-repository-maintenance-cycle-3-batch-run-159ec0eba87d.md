# Repository-maintenance cycle:3 batch — run 159ec0eba87d (implement)

- **Run**: `159ec0eba87d4f5b9b133dd228240255` (repository-maintenance `f8ae69de92b74891b4fe283699cca5b5` cycle:3)
- **Phase**: implement, attempt `01fadb0d57964ce19f9a091cd2db7381`
- **Base**: `88e423a` (== `origin/main` tip, re-probed)
- **Batch**: `ci-freshness truth + lint hygiene` = **rm-836** + **rm-837** (this run's own cycle:3 mints; ledger = cumulative patch `delegate/prioritize-159ec0eba87d-157172c0.patch`, which rides inside the deliverable below)
- **Deliverable**: ONE cumulative spool patch `delegate/implement-159ec0eba87d-01fadb0d.patch` — applies clean against pristine `88e423a`; tree handed back PRISTINE.

## rm-836 — per-repo CI-freshness signal (full vertical slice)

Research C1: the dashboard cannot distinguish a CI-silent repo from a quiet one (live proof class: the 2026-10-09 GitHub-side Actions disable, 0 runs since 01:59:31Z, board silent). Implemented:

| Layer | File | Change |
| --- | --- | --- |
| GraphQL | `src/github/query-registry.ts` | `startedAt` + `completedAt` on `workflowRun` in BOTH `REPO_STATUS` templates (additive scalar fields; page sizes and read-only shape untouched) |
| Server domain | `src/github/aggregator.ts` | `RepoCiStatus.lastRunAt: number \| null` + `extractLastRunAt` (max `workflowRun.startedAt` across the head commit's check suites, regardless of conclusion; unparsable/absent contribute nothing — never a fabricated clock). All five literal construction sites carry the key; every fail-visible/stale path yields `null`. |
| Boot bridge | `src/github/snapshot-store.ts` | `isValidSnapshotShape` row check extended (rm-156 pattern): a cache persisted by a pre-rm-836 build (status row without `lastRunAt`) fails the check and boots empty, instead of serving rows whose DTO omits the key and trips the client's contract-drift parse for the WHOLE `/api/monitoring` payload. Scoped to this field — broader inner-status pinning stays rm-865's item. |
| DTO | `src/routes/api.ts` | `lastRunAt` added to the `/api/monitoring` repo-status whitelist copy |
| Client parse | `web/src/api/monitoring.ts` | Required-key parse: absent key = contract drift (catches a pre-rm-836 server); `null` = unknown run-age; non-number = contract drift |
| View | `web/src/views/Monitoring.tsx` | `CI_SILENCE_THRESHOLD_MS` (48h floor) + `formatRunAge` (max-unit, min granularity) + `RepoCiFreshnessLine` sub-line on red AND stale cards (`monitoring-ci-age-fresh` / `-stale` / `-unknown` testids; muted color fresh, warning + "CI silence" marker past the floor, attention-unknown when `null`) + ONE enumeration-level `monitoring-ci-silence-banner` when every tracked repo is silent/unknown. Ages computed against the snapshot's own `refreshedAt` (a frozen board never shows drifting wall-clock ages); an empty fleet (fail-cold `{repos: [], staleBanner: true}`) is never silent — silence stays a per-repo claim. |

**Descope (recorded in the implement rider)**: the rolling-cadence median-interval half of the acceptance's attention heuristic — no snapshot-history run-interval data exists yet (rm-836 is the first run-timestamp carrier), so the 48h floor alone gates the silent state. Revisit once ≥2 refreshed snapshots carry `lastRunAt`.

**Coordination (unchanged)**: PR #479's pending `aggregator.ts` content overlaps the file but carries no run-timestamp fields — byte-convergent fold at integrate. The live GraphQL contract proof defers to the first post-lift Actions window (Actions still disabled at compose time).

## rm-837 — retire the 10 no-non-null-assertion lint warnings

All 10 sites in `test/listener-store-degradation.test.ts` (`:67-72`/`:88-90`/`:116-117` at 88e423a) replaced by ONE checked typed accessor `rowByTitle` (throws on a missing row — a wrong title is a test bug, not a nullable read). **Content adopted by shape from sibling `implement-8134eb2e6b13-29ef0e46.patch`'s rider** (the earlier same-content builder; identical signature and site mapping) so the lanes reconcile by content at integrate; 8134eb2e's rm-826 element-shape tests are NOT carried (not this batch's); 633717c2's in-place variant is superseded by this content-equivalent shape; sibling rm-839 folds into rm-837 per the selection rider.

## Verification (focused battery — how to re-verify)

```bash
pnpm install --frozen-lockfile          # fresh worktree only
git apply delegate/implement-159ec0eba87d-01fadb0d.patch   # from pristine 88e423a
pnpm check-types                        # green (server + web + .opencode)
pnpm lint                               # 0 errors, 0 warnings (was 0/10)
./node_modules/.bin/vitest run \
  test/ci-freshness.test.ts test/query-shape-guard.test.ts test/snapshot-store.test.ts \
  test/listener-store-degradation.test.ts test/listener-store.test.ts \
  test/aggregator.test.ts test/aggregator-invariants.property.test.ts \
  test/dashboard.test.ts test/server.test.ts                  # 257 passed
./node_modules/.bin/vitest run --config web/vitest.config.ts \
  src/api/monitoring.test.ts src/views/Monitoring.test.tsx    # 38 passed
node scripts/roadmap-census.ts && \
./node_modules/.bin/vitest run test/roadmap-integrity-guard.test.ts test/roadmap-length-guard.test.ts   # 249/0/837 healthy, 9 passed
```

New tests: `test/ci-freshness.test.ts` (5 — max-across-suites, running-run anchors freshness, fail-closed no-suite/no-run/absent, unparsable ≠ 0, `repository:null` stale+null); query-shape guard rm-836 template pin; 2 snapshot boot-window rejections; 4 web parse cases (incl. absent-key drift); 6 view cases (fresh/silent/unknown lines, banner on all-silent, no banner on mixed, no banner on empty fleet); fixture widening in aggregator/dashboard/server/property suites.

Repository-wide validation (`pnpm test` incl. `build:web`, actionlint, scripts-load, full CI mirror) is reserved for the later full_tests / merge-release gate per the phase budget.

## Ledger state after this patch

rm-836 + rm-837 status → `implemented 2026-10-10 … pending landing`, each with a dated implement rider (surfaces, adoption/descope notes, gates). Zero new mints — census `249 defs / 0 dups / max rm-837` unchanged, integrity-guard ceiling pin stays 837.
