# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-03, run d620213c)

module: dashboard
tags: `[security, workflow, ci, batch-record]`
problem_type: batch-record

Frame: base `b23057ec` (== origin/main, re-probed live at implement time
— the 1000d222 frame of the prioritize phase advanced one landing via the
23d39aa7 sibling integrate; the run worktree was re-anchored from the stale
2130050 frame to b23057ec before editing, porcelain-clean except this doc). Run
`d620213c17734b18bddec98e7db07c7f`, repository-maintenance cycle:1. Phases:
assess `f50d2980464244f186b5377fe654bdfc` (frame 2130050), research
`bf54c1f004e24f5d887e2d623e288606` (floor-cure aftermath measured at
1000d222), roadmap `6b8ae35462c04a84af11895694e2df9d` (spool-only extension —
mints rm-527/rm-528 + 9 riders, apply-checked green vs pristine 1000d222),
prioritize attempt `d29394ffe03c44049ee03177d4f16731` (this document).

## The cycle's mandate

One theme: **close the credential-bearing surfaces this run caught open, then
make green-by-construction the enforcement floor for everyone after us.** The
two code members are this run's own fresh mints — small, mechanical,
independently red-before-green, zero external dependencies, zero time gates,
and zero collision with the 484-526 unlanded sibling lanes (they sit above the
all-lineage ceiling; the only content adjacency, rm-528 vs unlanded rm-521 on
the oauth seam, is reconciled by content with 528 as the superset). The third
member is the strategic capstone the ledger has carried since cycle 1 and
which is unblocked *precisely now* by the landed floors/lint cures: branch
protection with real required checks.

## Why not the ledger's top-priority candidates (grounded, not hand-waved)

- `rm-104` (98.0) and `rm-279` (96.0) — the Main-Lint/ROADMAP-pathology saga:
  cured in practice (run 37064758373: 6/6 green, Lint 49s; this run's rider on
  rm-107 records it), status fields stale, and the surface is
  content-claimed by multiple live lanes. Re-attacking it this cycle would
  race siblings on a cured symptom.
- `rm-103` (85.0) upstream-absorb cadence automation and `rm-252` (80.0)
  gateway absorb window — window UNMOVED (upstream 24 dep-chore commits
  ahead, no agent release past v0.117.0), multi-cycle scope.
- `rm-139` node:24-slim rebase (57 Trivy CVEs) — real impact, but the
  rebasable edge is Node v26 LTS ~2026-10-28; selecting it now forfeits the
  window's payoff. Watch item, not a batch member.
- LICENSE (rm-147) — blocked-external (owner decision; license null on both
  repos, re-probed). web-lint coverage (rm-257) — uncertain blast radius,
  needs a dedicated cycle. Stale-PR sweep — ops, non-tree, rides integrate.
- ErrorBoundary / Docker VOLUME+HEALTHCHECK / logout hardening / canary
  comment truth — every one carries 2-3 unlanded sibling claims (rm-496..526);
  this run deliberately does not race them.

## B1 — rm-527: complete `persist-credentials: false` on the unhardened checkouts

- **Scope corrected at implement** (stewardship de8a9b81 full-tree census): FIVE
  live sites, not three — `base-drift.yaml:52` and `:160`, `canary.yaml:47`,
  `upstream-drift.yaml:37`, `visual.yaml:73`. `fro-bot.yaml:317` needs no edit:
  it already manages credentials deliberately (conditional persist-credentials —
  withhold on review paths, keep on schedule/dispatch for branch-pr delivery).
- **Change.** Add `with: persist-credentials: false` at each of the five sites
  (appended into `upstream-drift`'s existing `with:` block; new `with:` block
  at the other four).
- **Acceptance (landed).** Structural guard
  `test/workflow-persist-credentials-guard.test.ts`: fails if any
  `actions/checkout` step in `.github/workflows/` lacks the key, with a
  scan-liveness floor (≥16 checkout steps) against vacuous passes; census
  16/16; negative control proven (removing `canary.yaml:47`'s key fails the
  guard); workflows otherwise unchanged.

## B2 — rm-528: refuse redirects on server-side GitHub fetches at the transport seam

- **Change (landed at b23057ec).** `src/github/app-client.ts:60-72`
  `createBoundedFetch` now defaults `redirect: 'error'` (spread places
  `init.redirect` after the default, so caller overrides stay honored) — this
  covers EVERY installation-token Octokit call via the injected
  `request.fetch` seam. `src/auth/oauth.ts` `fetchGitHubUserLogin`
  (`:123-133`) carries `redirect: 'error'` explicitly (its sibling
  access-token fetch already does).
- **Acceptance (landed).** `test/bounded-fetch-redirect.test.ts`: a real
  302-responding local fixture (302 → 200 route, so a *following* fetch
  resolves and the assertions are red exactly while the seam follows)
  pins four postures — default rejection, caller override
  (`redirect: 'manual'`) honored, installation-token Octokit request
  rejection, unchanged non-redirecting behavior. 4/4 green; zero production
  behavior change on api.github.com (defense in depth, per the landed oauth
  precedent).

## B3 — rm-116: fill branch protection with real required checks (sequence-gated)

- **Change.** AFTER B1+B2 land and Main is green on the new tip: `gh api -X
  PUT /repos/codeo1io/dashboard/branches/main/protection` with the existing
  object preserved and `required_status_checks` = the six Main job names
  (`Design Check`, `Lint`, `Test`, `Test Scripts Load`, `Check Types`,
  `Check Workflows`) + CodeQL's `Analyze` check, strict, `enforce_admins:
  true`. Never delete the protection object (recreating drops the list; a
  body-less recreate reproduces today's all-empty shell).
- **Acceptance.** Live probe shows `required_checks` populated and
  `enforce_admins: true`; rulesets stay 0 (no divergence introduced); the
  hotfix override path (temporarily disable admin enforcement with the full
  body preserved, land, re-enable in-session) is documented in the runbook
  before flipping. Verified check names come from this phase's probes: Main
  run `37064758373` (6/6 success) and CodeQL run `37064758335` (`Analyze`
  success).

## Handoff notes for implement

- The roadmap phase's spool diff (`delegate/6b8ae35462c04a84af11895694e2df9d-scratch/roadmap-extension.diff`,
  apply-check PASS vs pristine 1000d222) carries rm-527/rm-528's mint blocks
  and this run's nine riders — ride it in the landing per the INTEGRATE
  convention (content-reconcile, never bare-id, if a 496-526 sibling
  integrates first).
- PR #345 (undici 7.30.0 lockfile-only) is already CLOSED — this run's
  rm-117/rm-282 rider disposition is satisfied; nothing to do.
- B3 is a live-infra mutation, not a tree edit: sequence it after the code
  batch's green Main run, and re-probe the protection object immediately
  before the PUT (another lane could have filled it — if so, only reconcile
  the check list).
