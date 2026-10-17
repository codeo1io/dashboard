# Dashboard maintenance — cycle 1 batch (2026-10-07, run 3ff5a80c)

module: dashboard
tags: `[upstream-absorb, operator-experience, push-handoff, generation-guard, read-only-invariant, ledger-riders, repository-maintenance]`
problem_type: batch-record
base: 5b8a88f8 (work-order base; origin/main at dispatch 25d32beb — 2 landing merges ahead, normal drift, reconcile at integrate)

## Frame

Repository-maintenance cycle 1, run `3ff5a80cc58c408285dbcf53084d6d5c`, campaign
`35f60ac9d96a4f37a6fa28398abeaf07`. Phase lineage: assess `6786a095`
(adversarial pass at 5b664ce — F1 push key-rotation seam, F2 dead-instance
reset hazard, F3 stranded-SW header), research `1cc17e94` (upstream tip
83e4f31, 879cb2d = PR #570 launch-card anatomy fix identified as the one
substantive commit), roadmap `f6485efa` (mint rm-681 + 11 riders, spool patch
delivery), prioritize `7b1b004f` (batch B1-B5 selected from the 83-item live
pool, ranked by impact/risk/effort), stewardship `c36a3de4` (contract
established; canonical `/work/projects/dashboard` clean at 3d07cf9, run
worktree carrying the standing ledger composition), implement `9b04bb45`
(this batch).

## Selected batch (B1-B5, from 7b1b004f-batch-selection.md)

| id | element | why in-cycle |
| --- | --- | --- |
| rm-681 | B1: absorb upstream 879cb2d (#570) — launch cards keep repo/time/expansion until adoption | only LIVE user-visible defect in the pool; upstream-authored + upstream-tested |
| rm-283 | B2: generation-guard the dead-instance reset trio in `defaultRuntimeLoader` | assess F2; decisive synergy — #570 makes `resetRunIndexState` more load-bearing (clears retained `_onSelectRun`) |
| rm-600 | B3: fold `currentKeyVersion` into `runReconcileSweep`'s unchanged predicate | assess F1 (the cycle's only MEDIUM); lands the wire correct ahead of the rm-249 unblock decision |
| rm-249 | B4: strand-truth the `sw-notification.ts` header (docs-level) | assess F3; 1 line, zero risk |
| rm-649 | B5: static read-only-invariant guard suite over `src/` | armors the first substantive upstream CODE absorb since rm-125 by making invariant #1 CI-enforced |

## Outcome (all five landed in-tree, uncommitted)

- **B1 byte-identical absorb.** Pre-apply verification collapsed the planned
  3-way: `git diff c1f760e 5b8a88f8 --` the four files is EMPTY (zero fork
  drift since merge-base) and every upstream pre-image blob
  (`9c98d05`/`6f5c941`/`5f60830`/`1b4a00d`) equals the fork's file. The patch
  `git diff c1f760e 879cb2d --` applied clean; post-image parity with
  `879cb2d` verified by blob sha on all four files. Residual vs
  `upstream/main` over these files is exactly `a82871d` (operator contract
  1.8.0 checkout-details, PR #573) — rm-157's deferred lane, absorb-nil here.
- **B2 generation guard.** `_runtimeModuleGeneration` captured synchronously
  at loader entry; the returned cleanup's module-level resets
  (`resetBootstrapState`/`resetLaunchState`/`resetRunIndexState`) run only
  while that instance is still the latest generation. The instance-scoped
  `streamOwner.close()` stays unconditional. Tests: deferred-loader
  async-interleaving behavioral test + source-contract test on the guard's
  presence (the production loader can't run under vitest — no `/static` alias
  by design).
- **B3 predicate fold.** `getCurrentKeyVersion()` read before the guards,
  compared in the skip predicate, threaded into `nextCache.keyVersion`.
  Regression test drives granted+present through a rotation with an advancing
  clock (skip holds while stable, voids exactly on rotation, → `resubscribe`
  without reload).
- **B4 header truth.** `sw-notification.ts` header states the module is
  intentionally stranded pending rm-249's unblock decision.
- **B5 guard suite.** `test/read-only-invariant-guard.test.ts` — static
  `src/` scan for the wiki-writer family (names grounded in upstream's tree),
  mutating REST verbs (including the `request(octokit, 'POST …')` wrapper
  shape), octokit write method families (get-/list-prefixed exempt), graphql
  mutations; workspace-absence legs; red proven on 11 seeded violations,
  green on the live tree + 8 sanctioned shapes; comment-tolerance pinned
  (listener.ts prose survives).

## Verification

- Root vitest: `operator-run-index-core` + `operator-launch-core` +
  `read-only-invariant-guard` → 273 tests passed (268 upstream-absorbed + 5
  guard).
- Web vitest: `src/operator/runtime.test.ts` 50/50 (incl. 2 new),
  `src/push/subscribe.test.ts` 57/57 (incl. 1 new).
- `pnpm lint` rc=0; `pnpm check-types` rc=0 (server + web + .opencode).
- Ledger: `node scripts/roadmap-census.ts` → 228 defs / 0 dups / max rm-681,
  census healthy; roadmap integrity + length guards 9/9.
- Ledger edits: 3 status-token flips (rm-102 tail, rm-649 → implemented,
  rm-681 → implemented) + 8 riders (rm-102/116/249/279/283/600 evidence and
  implementation notes, rm-649/681 absorb-vehicle notes); census count
  unchanged (no new mints) so the 2026-10-07 header census record stays
  truthful.

## Deferred (not this batch; owners recorded)

- rm-116 branch-protection fill — push-stage (9-for-10 green Main since
  2026-10-06T08:22Z; context set proven).
- rm-249 + rm-138 push unblock / vite-plugin-pwa 2.0.0 — product decision.
- rm-157 operator contract 1.8.0 — rides upstream PR #573 landing (a82871d
  residual is exactly this lane).

## Pre-review validation outcomes (compound, 2026-10-08)

- Targeted tests `4980eaf4` (attempt): root vitest 4 files / 281 tests +
  web 3 files / 117 tests green; digest `validation:v1:b940252a…` matched
  the dispatch stamp pre- and post-run (verified twice).
- Full tests `d9124700` (attempt): local pre-flight caught and cured one
  real regression before the cloud route — implement's NEW rm-649 guard
  tripped the tree-wide rm-164 prose-residue guard (20 wiki-writer-family
  mentions in its own machinery; cured by the designed EXCLUDED_FILES
  precedent, +2 lines in `test/prose-residue-guard.test.ts`). Then `pnpm
  test` rc=0: root 60 files / 2418 tests + web 31 files / 1183 tests.
  Authoritative `github_ci_validate.py --repo .` → ephemeral validation PR
  **#432** (head `74b4767`, validation_base `fb054e90`), **all 11 checks
  SUCCESS**; PR closed and both `conductor/ci-*` refs deleted (cleanup
  verified). Digest stable at the same stamp across all four verification
  points. (Pre-flight also re-anchored two infrastructure classes: engine
  release `7cc76f58`→`82f2a2e1` with policy files diffed byte-identical, and
  a host-side `node_modules/` sweep restored via `pnpm install
  --frozen-lockfile` — prevention rules written up in
  `docs/solutions/workflow-issues/fulltest-preflight-engine-drift-node-sweep-cross-guard-exclusions-2026-10-08.md`.)
- Compound (this phase, attempt `00fe27ec`): status flips were already made
  at implement (rm-649, rm-681 → implemented 2026-10-07); this phase
  appended the pre-review outcome riders to rm-681 and rm-649, added the
  cycle-1 compound ledger comment (owns the newest census claim: 228 defs /
  0 dups / max rm-681, unchanged — no mints), this section, and the
  prevention doc above. All markdown → digest-invariant (engine
  `classify_surface`: `.md` = non-executable; digest recomputed post-edit
  equals the dispatch stamp). **No tests executed at compound.**
- Prior-attempt forensics: compound attempt `36976bd8` was provider-reaped
  pre-work (event log: turn-started + one progress tick + reap; no typed
  artifact; zero durable delta anywhere — ROADMAP diff carried no
  post-full_tests markers, this doc carried no compound sections). Phase
  redone first-hand and declared.

## Next-cycle context

- **rm-116** branch-protection fill — FIRST post-landing action
  (protection re-probed empty 2026-10-07: no required checks,
  admins unenforced).
- **rm-249 + rm-138** — the standing product decision (push unblock vs
  strip; vite-plugin-pwa 2.0.0). B4 only truthed the stranded header; the
  sw-notification orphan state is untouched.
- **rm-157** — operator contract 1.8.0; rides upstream PR #573 / `a82871d`
  (the exact residual the B1 absorb left on those four files).
- **rm-102** — dependabot majors window: next scheduled version check
  2026-10-09.
- **rm-285** — audit re-proof cadence; last live green 2026-10-07.
- **rm-139** — node v24 maintenance starts 2026-10-20; v26 LTS 2026-10-28
  (image-digest watch already tracked).
- Fleet housekeeping (from full_tests `d9124700`): 48 stale
  `conductor/ci-*` refs on origin — one-shot sweep candidate.
- Landing reconcile: this ledger tops at rm-681 (next free rm-682) while
  unlanded sibling lineages have minted beyond it (bounded host scan
  2026-10-08: tops at rm-683/685/689/692/702/709/711) — reconcile by
  content at integrate per the d00d095 convention, never by bare id.
