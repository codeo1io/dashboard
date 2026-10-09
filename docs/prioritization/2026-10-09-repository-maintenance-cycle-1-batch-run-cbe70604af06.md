---
module: dashboard
tags: [repository-maintenance, cycle-1, batch, rm-780, rm-187]
problem_type: maintenance-batch
---

# Dashboard maintenance batch (2026-10-09, run cbe70604af06)

Repository-maintenance cycle:1 batch **'Degradation truth surfaced — monitoring view + listener
store'** (selected at prioritize 3b41dc6e67da418f99476abeed738e3c from this run's assess
efc44cef + research 61867321; base 559642a == origin/main). Two units, both implemented in
this run's worktree.

## U1 — rm-780 (operator-experience): Monitoring/Listener stale-state surfacing

The aggregator already SHIPPED degradation truth (`stale:true` rows, `rollupState:'unknown'`,
`failingChecks:0`) but the views dropped it on the floor; no aggregator/DTO change was owed.

- `web/src/views/Monitoring.tsx` — stale-but-not-red repos now render as attention-first
  `monitoring-stale-repo` cards with per-repo notes (behind red, ahead of the green count);
  the footer separates `monitoring-stale-count` from "not failing"; `postReadyFailures`
  counts consecutive post-ready refresh failures and drives a `monitoring-view-stale-banner`
  ("Showing the last known state — refreshes are failing (N failures in a row)"); the
  all-clear empty state is suppressed while any row is stale/unknown OR the view is
  post-failure, replaced by `monitoring-all-clear-suppressed`.
- `web/src/views/Listener.tsx` — same `postReadyFailures` + `listener-view-stale-banner`
  treatment for the listener board.
- `web/src/api/fetch-timeout.ts` (new) — `withGetSeamTimeout` races both GET seams at
  `GET_SEAM_TIMEOUT_MS = 15_000` (parity with rm-501's ack bound; fetch + body read inside
  the race). Wired into `fetchMonitoring` (`web/src/api/monitoring.ts`) and
  `fetchListenerMessages` (`web/src/api/listener.ts`) — any direct caller (App's rm-487
  focus re-probe) can no longer hang on a dead transport.

## U2 — rm-187 (reliability): listener store corrupt-links guard

- `src/listener/store.ts` — `parseLinksCell()` replaces the bare `JSON.parse(row.links)` in
  `rowToMessage`: corrupt/non-array cells degrade to empty links with every other field
  intact, one `console.warn` per degraded read (observable, not silent). The messages
  endpoint stays 200 with the healthy rows (twin of the landed snapshot-store guard,
  rm-186 family).

## Verification ledger (focused/impacted only, per implement-phase budget)

- `pnpm check-types` rc=0 (server + web + .opencode tsc projects).
- `./node_modules/.bin/eslint` rc=0 on every touched file (src/listener/store.ts,
  test/listener-store-degradation.test.ts, web api x3, views x2, tests x3).
- Targeted vitest: `test/listener-routes.test.ts`, `test/listener-store-degradation.test.ts`,
  `test/listener-ingest-auth.test.ts` → 3 files / 32 tests passed (server);
  `web/src/views/Monitoring.test.tsx`, `web/src/views/Listener.test.tsx`,
  `web/src/api/fetch-timeout.test.ts` → 3 files / 35 tests passed (web, incl. all
  pre-existing suites in the touched view files — no regressions).
- New coverage: rm-780 describe (4 tests — invisible rows render attention-first + footer
  separation; red > stale ordering; failure banner + all-clear swap + recovery; healthy
  board unchanged), Listener failure-banner test, fetch-timeout race tests (value /
  rejection / timeout), rm-187 endpoint 200 + degraded-links + null/string variants +
  no-false-positive warning assertion.
- Engine-derived executable delta at the implement tree (release 0a4b2d5a, workspace_base
  559642aa…): `changed_surfaces(...).testable_surfaces == ['src/listener/store.ts']`;
  validation digest `validation:v1:f55f734ecf31bd78866d1f4023037e50f95640e48e7283b78398c0e29a014757`.
- Repository-wide validation is reserved for the later full_tests / merge-release gate.

## Contentions honored

- f266ce30's unlanded rm-751 `Monitoring.test.tsx` describe: distinct testids, separate
  describe block, union at integrate.
- The run's own ledger delta (ROADMAP.md selection flips + guard pin) rides the same
  worktree untouched.

## Deliberately not in this batch

- rm-779 (cve-tripwire NODE_IMAGE reconciliation): passed over at prioritize — three
  unlanded sibling builds (8521c80a / 89ebbf49 / 9fd8bcad) already carry the literal fix.
  INTEGRATE must land one before Mon 2026-10-12 06:53Z (first scheduled fire would be
  born-red via the resolve step's exit 1).
- rm-112's server-side DTO half stays with rm-112 (no aggregator change owed here).
