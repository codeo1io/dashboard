---
module: dashboard
tags: [release-channel, calver, repository-maintenance, cycle-1, rm-1932, rm-714]
problem_type: batch-record
base: edf948de8901d608d45f3775c4d3adebe056e457
date: 2026-10-17
run: b1949a6acc5249eaa16311589c8f64c4
---

# Cycle-1 batch record — release-channel truth (rm-1932 + rider rm-1451)

## Selection context

Selected by prioritize 6cedbb27 (batch-selection.md) for run
`b1949a6acc5249eaa16311589c8f64c4` (repository-maintenance cycle 1). Inputs
consumed: assess 5f8bb7e9 (gates 4782/4782 green at edf948de), research
ddd3cf1a, roadmap band 2730cfbb (mint rm-1932), stewardship request cda41ebe.

Compose base `edf948de` (== assess base; tree porcelain-clean except the
adopted roadmap-phase `M ROADMAP.md` band, carried forward untouched).

## Batch

One batch, two units:

- **Unit A — gate truth.** `scripts/release-channel-staleness.ts`: the third
  calver component parsed as a per-month RELEASE COUNTER (day>31 rejection
  removed; 2026.10.43 outranks 2026.10.31 numerically); verdict scoped via
  `scopeToChannel` (tier 1 = tags reachable from `--base-ref`, default
  `origin/main`; tier 2 = additionally exclude `--upstream-ref`-reachable
  tags); unresolvable scoping refs AND an empty scope are extraction errors
  (fail closed — never an unscoped or empty-healthy verdict, rm-166 lesson);
  the summary names the scope counts; `parseDormancyDecision` reads this
  decision file. Test additions in `test/release-channel-staleness.test.ts`.
- **Unit B — footer version.** `scripts/compute-release-tag.ts --current`
  (imports the SAME `scopeToChannel`/`selectNewestCalverTag` — one selection,
  two consumers, never a second parser) → release.yaml build-arg
  `RELEASE_CHANNEL_TAG` → Dockerfile `ARG`/`ENV` → `src/routes/api.ts` clamps
  calver-shaped-or-null onto the `/api/monitoring` DTO as `releaseVersion` →
  client strict-parses (absent/null/malformed-safe) → App boot-fetches once →
  `AppShell` footer renders `release <version>` or hides the element — never a
  `dev`/`unknown` placeholder.
- **Rider rm-1451.** `.github/workflows/release-channel.yaml` setup-node pin
  `8207627…` (v7.0.0) → `949feb2…` (v7.1.0); digest verified first-hand via
  `git ls-remote actions/setup-node refs/tags/v7.1.0`.

## THE DECISIONS (fog resolutions — authoritative)

### fog rm-714: branch-b — channel-of-record = the ABSORBED upstream stream

Recorded in `docs/runbooks/release-channel-decision.json` (ownerDefId
`rm-714`, recordedAt `2026-10-17`):

- `retired: false` — the channel is LIVE; the age verdict stands. A future
  red means the absorb stream itself stalled past the threshold (not
  undecided noise — red-while-undecided ended with this record).
- Branch-b scoping: the gate (tier 1) measures tags reachable from the base
  ref — foreign upstream tags in this repo's namespace (164 excluded at the
  2026-10-17 probe; zero-counter `*.0` start tags additionally rejected by
  the parser) never feed the verdict, and ABSORBED upstream releases DO:
  this fork mints no releases of its own (`actions/secrets` empty →
  `HAS_RELEASE_APP` false → release.yaml never creates a tag), so the newest
  reachable absorbed release IS the channel's newest output. Census
  2026-10-17: ZERO fork-only calver tags (every base-reachable tag is also
  upstream-reachable) — branch-a (tier-2) wiring would empty the scope into a
  PERMANENT extraction-error red (weekly rc=2) with a footer version that
  never renders.
- Tier 2 (`--upstream-ref`) remains a TESTED, UNWIRED capability — the flip
  path for the day a fork-authored channel exists. Re-litigation bar: a
  fork-minted calver tag reachable from origin/main, or release App secrets
  provisioned.

### fog rm-1468: reconcile duplicate-scoping work — NONE to adopt

Verified live: exactly ONE selection implementation exists
(`scripts/release-channel-staleness.ts` `scopeToChannel`/`parseCalverTag`/
`selectNewestCalverTag`), imported (not duplicated) by
`scripts/compute-release-tag.ts`; `src/routes/api.ts`'s `CALVER_TAG_SHAPE` is
a wire clamp (validation-only), not a parser. The fog's feared duplicate
never landed anywhere.

## Considered and deferred

- **Tier-2 wiring** (branch-a) — rejected on the census above; kept as a
  tested capability (CLI flag on both scripts, unit-tested at the
  `scopeToChannel` and CLI seams).
- **Footer from a predicted next tag** (upstream #641's Vite-env shape) —
  rejected: a not-yet-minted tag can never exist by render time (release App
  absent fork-side); the footer always names a real ancestor release.
- **Retired flip** — not applicable; recorded `retired: false`.

## Verification record (focused, this phase)

- Gate BEFORE (at mint base): `git show edf948de:…staleness.ts` → healthy,
  newest `2026.10.31` — a tag that is NOT an ancestor of this fork's main
  (foreign) — the false-healthy this batch kills.
- Gate AFTER (tier 1, base `origin/main`): rc=0 healthy, newest
  `2026.10.43` (age 3d), scope line `26 considered / 164 foreign / 0
  absorbed (tier 1 — rm-714 branch-b)`, decision file parsed and reported.
- `compute-release-tag --current`: base `HEAD` (edf948de) → rc=1 skip NOTE
  (ZERO calver tags reachable — the absorbed-release adoption commits are in
  main's drift, not this base; honest skip, footer hides); base `origin/main`
  (landed state) → `2026.10.43` rc=0.
- Tier-2 escape hatch: `--upstream-ref` probe → rc=2 extraction error exactly
  as documented (empty scope is never a healthy verdict).
- Focused tests: `vitest run test/release-channel-staleness.test.ts
  test/compute-release-tag.test.ts test/dashboard.test.ts` → 98 passed;
  `vitest run --config web/vitest.config.ts web/src/App.test.tsx
  web/src/api/monitoring.test.ts web/src/shell/AppShell.test.tsx
  web/src/views/Monitoring.test.tsx` → 112 passed (incl. new App boot-seam
  test and 6 new `--current` CLI tests).
- `pnpm lint` rc=0; `pnpm check-types` rc=0; actionlint (container
  `rhysd/actionlint:1.7.12`) rc=0 on both workflows.

## Base-race note (for the merge phase)

`origin/main` moved `edf948de → 64cd2f6a` (47 commits) WHILE this run was in
flight — 64cd2f6a is the #641 union-resolve landing touching this batch's
Unit-B files (`release.yaml` create-tag precomputed-tag flow; `AppShell`
footer carries a Vite-env release link that never renders fork-side —
Dockerfile has no `DASHBOARD_VERSION` ARG at either base). Unit-A surfaces
are untouched by main. The merge phase reconciles: keep #641's precomputed
create-tag flow for tag creation; the footer renders the DTO channel version
(this batch); the dead Vite-env link leg should be dropped or cured (its
`ARG` never exists).

## Prior-attempt forensics (attempt c610e6dc — ADOPTED then REVISED)

Attempt `c610e6dcc66a43ae97dff77c1fc918e6` was reaped mid-turn by a provider
infrastructure failure after ~40 messages of real work; typed artifact and
scratch dir absent. Its tree work (15 modified files) was verified against
THIS work order (same run/branch/base lineage, tests green at adoption time)
and ADOPTED. Revision applied by this attempt: tier-2→tier-1 rewiring per the
recorded rm-714 branch-b decision (their workflows fetched upstream main and
passed `--upstream-ref` on both scripts — the permanently-red configuration;
removed the fetch steps and flags, kept the capability + tests), added the
missing decision JSON, this batch record, the App boot-seam test, and the 6
`--current` CLI tests; corrected the header census number (164, not 168 —
zero-counter `*.0` tags parse-rejected). Their stale narrative strings
("red while undecided is BY DESIGN", "workflows always pass tier 2") were
rewritten to the post-decision truth.

## Next-cycle entry points

- Merge-phase collision reconciliation with 64cd2f6a (#641 shapes) — see the
  base-race note above.
- `--current` at CI: after landing, the build's HEAD contains the adoption
  commits → 26 reachable tags → footer live; no code change needed.
- Tier-2 flip path and retired flip path live in the decision file + script
  header (re-litigation bar documented above).
