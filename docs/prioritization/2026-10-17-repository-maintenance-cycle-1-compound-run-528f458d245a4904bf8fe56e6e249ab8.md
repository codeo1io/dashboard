---
module: dashboard
tags: [repository-maintenance, cycle-1, compound, rm-873, rm-874, playwright-lockstep]
problem_type: maintenance-compound
---

# Repository-maintenance cycle 1 — compound record (2026-10-17, run 528f458d245a)

Pre-review compounding of the whole cycle, using only pre-review evidence:
assess `8b4d1b41` → research `92472c58` → roadmap `349b9132` → prioritize
`dacfec67` → stewardship `4024aab5` → implement `1724e837`/`c6cd24ea` →
targeted_tests `5454d00b`/`e013cc7e` → full_tests `ab33ec6b`. Review and shipping
outcomes land after this step; the next cycle's assessment carries them forward.

## Batch record — "Detection & ledger truth"

Base 5d5f9be (origin/main advanced to 3e3664c mid-cycle; ledger re-derived there
for mints). Seven files salvaged as commit 252525d by the engine, plus the
full_tests lockstep cure left uncommitted on top:

- NEW scripts/actions-darkness-watch.ts — read-only gh probe; live verdict DARK
  (6 commits newer than the newest workflow-run creation 2026-10-09T01:59:31Z,
  beyond the 900s grace window); dry-run mode, zero mutation.
- NEW test/actions-darkness-watch.test.ts — 9 unit tests on verdict logic.
- NEW test/gql-template-guard.test.ts — rm-177 negative guard (no // line inside
  any src/github GraphQL template; 2 templates, 0 violations at this base).
- rm-131's invariants (zero wiki-writer across the six named files, pnpm@11.28.5
  pin, no renovate.yaml) were verified through the PRE-EXISTING
  test/fork-exclusion-guard.test.ts, modernized to the live pin — no new guard
  file was created (review-fix: an earlier bullet here named a phantom
  test/merge-residue-guard.test.ts that never existed).
- NEW .github/workflows/actions-darkness-watch.yaml — workflow_dispatch-only,
  dormant by design; actionlint 1.7.12 container clean.
- AGENTS.md:99-105 — clonedep staleness recorded (v0.78.0 vs gateway v0.122.3,
  refresh command included) — rm-874 doc-branch acceptance.
- web/src/push/sw-notification.ts:2 — header truth ("imported by sw.ts" claim
  corrected; zero non-test importers at this base).
- ROADMAP.md — mints rm-873/rm-874 above all unlanded spool claims (857-872),
  rm-249/rm-271 acceptance appends, status flips rm-131/rm-177/rm-251/rm-285
  (all four were landed-but-unflipped; the ladder lied to triage), and the two
  compound flips below.

Compound flips this phase: rm-873 → implemented (validated via ephemeral PR #810,
all 11 executed checks SUCCESS incl visual; enable decision deferred to a
post-Actions-resume gate); rm-874 → implemented (doc-branch; mirror refresh
remains optional follow-up).

## Validation record (consumed, not re-run)

- Targeted: run_repo_impacted_tests.py derived node targeted=1 →
  test/actions-darkness-watch.test.ts 9/9 (multiple attempts, exit 0).
- Full: github_ci_validate.py ephemeral PR #810, commit 57b9ce7e,
  validation_base_commit 0b7027cd, ok=true, ALL 11 checks SUCCESS incl visual
  (run 38983780628); Fro Bot SKIPPED via HAS_FRO_BOT_PAT gate; PR + refs
  auto-cleaned.
- Emission digest chain: dispatch 8aa97405 re-derived byte-equal pre-edit
  (adoption proof); post-lockstep-cure digest e589e22d declared at full_tests.
- Local battery pre-review: check-types rc 0; lint rc 0 after the bracket-escape
  cure adopted from dead-attempt forensics; focused vitest 6 files/101 + 4
  files/50; actionlint clean; probe dry-run exits 1 DARK by design.

## full_tests cures adopted this cycle

1. Playwright image/npm lockstep (round-2 red → green): candidate carried
   @playwright/test 1.63.0 while main's visual.yaml image is
   mcr.microsoft.com/playwright:v1.64.0-noble@06a9939e (rm-142 lockstep repair,
   2026-10-17); ephemeral validation PRs run MAIN's workflow files, so the npm
   pin must match main's image or every visual test dies at browser launch
   (browserType.launch chromium_headless_shell-1243 missing, all 3 tests).
   Cure: adopt main's pin + lock specifier + operator-dark baseline together,
   byte-identical (md5 e397a0539cf3fc84cd5129a5675d766a, 316204 bytes).
2. Stale-baseline forensics (round-1 red): the 5d5f9be-lineage operator-dark
   baseline (4ca21a0c, 86215B, 1280x966) is born-red against the actual DOM
   (1280x3178); listener/privacy baselines were fine. Never regenerate locally —
   adopt main's baseline byte-for-byte; keep pin + baseline + image paired.

## Prevention rules

1. Ephemeral-PR validation uses main's .github/workflows, not the candidate's:
   any npm pin that must pair with a CI image (playwright) must match MAIN's
   current image tag, and the triple pin/specifier/baseline moves together or
   not at all.
2. Visual baselines are lineage-bound artifacts; a stale ancestor's PNG is a
   born-red test, not a flake — diff expected-vs-actual geometry before
   debugging the app.
3. run_repo_impacted_tests.py builds its test list from git ls-files (tracked
   only): untracked new tests force fallback=full. Cure: git add -N before the
   run, git reset after (index-only, no content change).
4. Conductor worktrees can lose node_modules between sessions while pnpm exec
   still resolves vitest from outside the repo; npm exec then fails config-load
   (Could not resolve vitest/config). Cure: pnpm install --frozen-lockfile
   (store-backed, seconds).
5. Implement PhaseResults must carry validation_evidence.changed_surfaces (all
   changed paths, not just testable ones) — the fold gate rejects otherwise and
   a re-attestation attempt is pure overhead (happened this cycle).
6. Dead attempts' scratch dirs hold finished diagnosis; adopt-with-verification
   (digest byte-equality proof) beats redoing the work — the lint cure and the
   round-1 visual forensics both came from attempt 85610ec8's spool.
7. Flip ledger statuses the moment evidence exists: rm-131/177/251/285 sat
   landed-but-unflipped at the top of the priority ladder and distorted two
   cycles of triage before this one flipped them.

## Next-cycle candidates (existing ids only, ranked)

1. rm-873 enable decision — UNBLOCKED: Actions resumed 2026-10-16T17:12Z (live
   probe bright 2026-10-17T01:53:41Z; Main lane green same day — the resume
   burst covered the old uncovered backlog). First dispatch is a deliberate
   gate decision, not blocked on anything. Also note the same-path collision
   with main's rm-1411 watchdog — disposition in the fold map below.
2. rm-874 mirror refresh (optional follow-up): clone to v0.122.3+ and update
   .slim/clonedeps.json ref/resolvedVersion (tracked change).
3. rm-271 majors — one major per landing; registry snapshot this cycle: TS
   7.0.2, vitest 5.0.4 (engines compatible with host v22), vite-plugin-pwa
   2.0.0, jest-dom 7.0.1, @types/node 26.6.5; add vpp 2 + jest-dom 7 to the
   evaluated set.
4. rm-139 Node 26 gate — opens 2026-10-28 (LTS promotion); go/no-go in rm-108's
   matrix.
5. rm-178 + rm-166 — local extraction fix is ready; digest readback proof rides
   the first post-resume dispatch.
6. rm-249 push disposition — upstream sw.ts is a workbox deny-by-default router
   with push/notificationclick handlers vs this fork's kill-switch; workbox-*
   deps absent here; upstream #638 is a clean full-skip under the kill-switch
   constraint.
7. Spool collision reconciliation — unlanded families claim rm-857..872
   (684f48e4's rm-866..872 and 75ed4efe's double-claimed rm-866/867 with
   different semantics); first-landed-wins, renumber the losers at the gate.
8. rm-873 follow-up hardening (limitations disclosed at review): workflow
   enumeration is a single per_page=100 page (repos with >100 workflows
   silently under-watch), and the gh transport has no spawnSync timeout —
   local stalls are unbounded, CI bounded by the job's timeout-minutes.

## Fold map

- Digest: e589e22d stands (declared at full_tests; this compound phase edited
  only .md surfaces — non-executable, digest unchanged).
- Risk class for the compound delta: low (documentation-only turn); the batch
  itself is medium (executable surfaces changed: new probe + workflow + tests +
  playwright pin triplet) but fully validated at PR #810.
- Same-path collision disposition (review F1, disclosed 2026-10-17): main has
  carried scripts/actions-darkness-watch.ts + test/actions-darkness-watch.test.ts
  since 2026-10-15T14:20Z (rm-1411, sibling lane a79dc204, salvage 2694f89) —
  a different implementation (env-var REST probe, GREEN/DARK/UNKNOWN exits
  0/3/1, no CI lane) vs this batch's (gh-CLI transport, embedded snapshot +
  grace window, dormant dispatch workflow). Pre-decided fold disposition: keep
  THIS batch's script+test+workflow as one coherent PR-#810-validated unit;
  supersede main's variant with that rationale (superset: offline-verifiable
  verdict model + dormant dispatch lane + live-proven gh transport); main's
  runbook at docs/runbooks/actions-darkness-watch.md (distinct path) survives
  and should be updated to the superseding variant's CLI at fold; rm-1411's def
  on main stays implemented — the supersession is recorded here and in rm-873's
  rider, not by rewriting main's ledger.
- Merge legs vs CURRENT main (re-derived 2026-10-17, origin/main c01946e):
  ONLY the playwright pin pair (@playwright/test 1.64.0 in package.json + lock
  specifier) is still merge-neutral. Two legs DIVERGE and must be re-derived
  at fold, not collapsed: (a) @opencode-ai/plugin — main carries 1.19.0
  (since 1c7f74a, 2026-10-16) vs our 1.18.35 — adopt main's; (b) operator-dark
  baseline PNG — main's is a6211623 (341452B, regenerated 2026-10-17T01:47Z
  after 55086dd) vs our e397a053 (316204B, matches OUR base's DOM) — adopt
  MAIN's at fold (the folded web/src is main's; keeping ours against main's
  web/src is a born-red visual). The compound-phase claim that all three lock
  legs were byte-identical-to-main and merge-neutral was written against
  55086dd-era bytes and was already false for the plugin and PNG legs at
  review time — corrected per review F2. The pin + baseline + image PAIRING
  rule stands: all three adopt main's current values together.
- ROADMAP fold composition (review F7): our in-tree ledger (237 defs) is 16
  defs behind current main (253 at c01946e); rm-285 and rm-131 def-lines were
  flipped on main 2026-10-15 (salvage 5a4862, run 4dc4697d cycle:3) BEFORE our
  2026-10-16 flips — the fold must UNION by content (main's def-line base,
  including main's track fields — main's rm-285 is track: security while ours
  said reliability — with our evidence riders appended), never overwrite.
- Tree at compound end (HEAD 252525d on 5d5f9be; review-fix edits in-place,
  same file set): working tree = ROADMAP.md + package.json + pnpm-lock.yaml +
  operator-dark baseline PNG (M) + this doc (untracked).
