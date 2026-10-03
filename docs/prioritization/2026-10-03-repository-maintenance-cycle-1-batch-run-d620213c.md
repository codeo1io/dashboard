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

## Outcome (pre-review, compound 2b67cfdd)

All outcomes below are pre-review cycle evidence, recorded before the review
and shipping stages; the next cycle's assessment carries those forward.

- **B1 / rm-527 — implemented, validated pre-review.** Five sites carry
  `persist-credentials: false` (base-drift.yaml x2, canary.yaml,
  upstream-drift.yaml, visual.yaml); fro-bot.yaml's conditional block is
  compliant-by-design and deliberately untouched. Guard census 16/16 with the
  >=16-step liveness floor; negative control proven.
- **B2 / rm-528 — implemented, validated pre-review.** `createBoundedFetch`
  defaults `redirect: 'error'` after the init spread (caller override
  honored); `fetchGitHubUserLogin` carries `redirect: 'error'`. Fixture pins
  all four postures, 4/4.
- **B3 / rm-116 — deferred by scope, sequence-gated.** Filling branch
  protection is a live-API mutation outside an implement phase's authority;
  the six Main job names + CodeQL `Analyze` were verified from runs
  37064758373 / 37064758335 for the future fill body; the rm-116 rider
  records the unblock condition.
- **Targeted validation (redo).** The work order's exact targeted command
  routes to the full cloud-CI fallback because `package.json` sat in the
  changed-surface union; the first execution (attempt f79b1cbe, Main run
  37093541570, PR #358) failed Check Types (6 tsc: TS2345/TS2532/TS18048) and
  Lint (10 eslint) — defects in the new guard test, masked until then by
  cleared local-gate output. Cured in-worktree, then decomposed as policy
  requires: selector over the 11 testable surfaces = 13 suites / 611 tests
  green; both new suites direct = 2 files / 5 tests; `pnpm check-types` rc=0;
  full `pnpm lint` rc=0; actionlint (container 1.7.12) over touched
  workflows rc=0. Attempt 52199545 records the forensics; attempt 160856c2
  then executed the dispatch full command verbatim.
- **Full validation.** `github_ci_validate.py --repo .` (dispatch release
  52b4cd4f pinned) rc=0: ephemeral PR #362, Main run 37111930855 all 6 jobs
  SUCCESS (server 53 files / 2339 passed + 1 pre-existing conditional skip in
  the fork-exclusion guard; web 31 files / 1171 passed); PR and both
  `conductor/ci-*` refs reaped post-run; digest re-derived on the dispatch
  release == the dispatch's `validation:v1:26df71e4…`.
- **Ledger state after compounding.** ROADMAP.md at 187 defs / 0 dups /
  max rm-528 (disclosure `cycle-1 extension #8`): mints rm-527/rm-528 now
  read `implemented ... in-tree, validated pre-review`, with dated riders
  carrying the validation evidence and fix history; 9 assess/research riders
  materialized (the implement phase's rider script had crashed before
  writing — its mint placement hunted a heading after the file's last id
  line, which sits in Superseded with none after it; compound re-materialized
  at the ext-#5 end-of-Open-items marker per the roadmap composer's
  convention).

## Reusable lessons

1. Ask the selector before executing a targeted command: `--print-only`
   reveals the fallback=full escalation when a config surface is in the
   union.
2. Never read cleared gate output as green: persist stdout/stderr and grep
   the rc line (`cmd > log 2>&1; echo RC=$?`).
3. Adjudicate attempts from typed records and the Actions API, not prose.
4. Recover reaped attempts' in-tree product from scratch (md5-verified),
   adopt the product, never the missing result.
5. Record validation evidence byte-exactly, citing the dispatch's CURRENT
   release path.

Canonical write-up: `docs/solutions/workflow-issues/ephemeral-ci-fallback-routes-to-full-when-config-surfaces-change-2026-10-03.md`.

## Next-cycle candidates

1. **rm-116 fill** (security, live-API): require Main's six jobs + CodeQL
   `Analyze`, strict, admin-enforced; rulesets re-probed 0; unblocks once
   this batch lands.
2. **Reconcile-by-content folds:** rm-537 + fc7eda66-U1 into rm-527;
   rm-498/rm-519/rm-521 into rm-528; standing set ErrorBoundary
   rm-500/514/519, Docker VOLUME rm-496/513/523, logout rm-501/512/520,
   canary truth rm-508, If-None-Match rm-509/522.
3. **rm-279 mootness re-assessment:** two further green push-to-main Main
   runs since the paragraph-split cure (37053741900, Lint 49s; 37085464952)
   — weigh closing as cured-by-content instead of decomposing the Lint job.
4. **Research-carried edges (riders on record):** scorecard 7.6 deltas
   (rm-143, six open scorecard rules); Trivy 57-CVE node:24-slim freeze with
   the Node 26 LTS promotion ~2026-10-28 as the rebase window (rm-139);
   upstream absorb window low-risk, 24 dep-chore commits (rm-252).
5. **Id space:** ALL-LINEAGE next free rm-556 — corrected 2026-10-03 by
   compound attempt 0756d011's fleet re-census (the earlier rm-548 call was
   stale: sibling worktrees claim d0305cd7 rm-509..511 + rm-548, b72d9324
   rm-549..552, ff60e183 rm-553/554, 7a4d9070 rm-555; live main 28396ca9
   unmoved, committed 190 defs / max rm-501). Re-census at mint time via
   '^- id:' lines plus per-worktree 'git diff ROADMAP.md' — never a bare id
   grep over ROADMAP prose. This run's recorded claims are rm-527/rm-528,
   verified unclaimed elsewhere. Re-verified unchanged 2026-10-3T12:24Z by
   the re-dispatched compound attempt 9eb7ef95 (0756d011's session was
   reaped pre-adoption; product adopted after first-hand verification):
   ceiling still rm-555, rm-548 still claimed (d0305cd7), rm-556 still
   next free, live main still 28396ca9 — and one method upgrade: 2365e728's
   rm-512..517 moved from uncommitted diff to a LOCAL landing commit
   (493a61c6, conductor-landing 'terminal-salvage', branch
   conductor/run-2365e728d55e, on no origin ref), so the mint-time census
   must also walk per-worktree 'rev-list origin/main..HEAD' committed defs —
   a 'git diff' over the working tree alone is blind to committed-not-pushed
   claims.
