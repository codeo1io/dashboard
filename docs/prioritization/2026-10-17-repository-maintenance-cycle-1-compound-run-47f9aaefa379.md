# Dashboard repository-maintenance cycle 1 compound record (2026-10-17, run 47f9aaefa379443ca6d54c68cf794a4d)

module: dashboard
tags: `[repository-maintenance, compound, validation, supersession, rebase]`
problem_type: compound-cycle-record

campaign: repository-maintenance d72b7d78d5594a8e9b374a31db9e3cd1 cycle: 1
status: cycle_compounded_pre_review (pre-review cycle evidence only)
base: 5d5f9be (run base) / f521ec783cab (rebased batch base)
attempts: compound 6d4f02551dbb47feae453acd2aba0fb6 (delivery-dead; work
adopted) -> re-dispatch 44f8b0ce91f1405f8c014c11b31c52c0 (verification +
rm-883 adoption-state cure + lint-shape cure)

Scope: pre-review cycle evidence only (assess/research/roadmap/prioritize/
stewardship/implement/targeted_tests/full_tests). Review and shipping outcomes
are the next cycle's assessment inputs. No test execution at compound.

## Phase chain

assess 6f27a309 (fresh adversarial review, tree pristine at 5d5f9be) ->
research 00c7281e (upstream/registry/image probes; candidates C1-C5) ->
roadmap 396916b8 (minted rm-881..883 + 5 evidence appends, spool-side) ->
prioritize 88a9f6ed (batch = rm-881+rm-882; redo of reaped 103dbea83, 429) ->
stewardship 784732115 (surfaces + must_remain_separate, no topology) ->
implement 2148019f/994cd7f7 (KTD13 re-attempt adopted intact prior work) ->
targeted_tests 4d7456e0 (local battery; remote leg refused at that scope) ->
full_tests 722d7f5f (authoritative PASS via ephemeral PR #811) ->
compound (this doc).

## Batch composition and journey

Selected: rm-881 visual-gate parity cure + rm-882 absorb upstream PR #641
(footer release-version chip). Ledger rider minted by this cycle's roadmap
phase. Final 6-file delta at REBASED base f521ec7 (run base 5d5f9be):
release.yaml (#641 hoist + 5-attempt retry-loop deletion, setup-node v7.1.0
949feb24 kept), Dockerfile (ARG DASHBOARD_VERSION -> VITE_DASHBOARD_VERSION),
AppShell.tsx + tests (calver chip -> codeo1io release URL),
build-output-no-tracking (+https://github.com as navigation origin),
ROADMAP.md (ledger extension + riders).

Mid-run origin/main advance 5d5f9be->f521ec7 (12+ sibling landings same day)
forced round-1 prepare conflict at full_tests; cured with the house rebase
pattern: snapshot batch to delegate spool, ff-merge tree, re-apply
semantically. Untracked new files do not ride the validation tool's git-diff
(tracked files only) — new test files need `git add -N` to ride.

## Supersession record (highest-value learning)

A sibling lane landed the playwright parity cure on main at 1.64.0 exact-pin +
v1.64.0-noble@06a9939e + test/visual-playwright-image-lockstep.test.ts
(triple guard) while this cycle was in flight. Resolution: my
test/visual-parity-guard.test.ts DROPPED (single-source rule — adopt the
landed richer guard), rm-881 closed ADOPTED-ON-MAIN, and NO churn to 1.64.1:
the pin/baseline/guard triple must stay paired. rm-883's dep window only
PARTIALLY adopted by main: hono 4.13.13 landed, but @hono/node-server 2.1.5,
react 19.3.1, @types/node 24.19.2 and @opencode-ai/plugin 1.19.1 remain open
(the all-landed claim in this doc's first draft was corrected at adoption
verification, re-dispatch 44f8b0ce — origin/main lockfile resolves 2.1.3 /
19.3.0 / 24.13.3 / 1.18.35). This
cycle's net new work is therefore rm-882 (#641 absorb) + the ledger.

## Validation record (recorded, not re-run)

- targeted 4d7456e0: engine mapping print-only verdict "shared build/test
  configuration changed; fallback=full" (package.json is FULL_IMPACT); remote
  leg refused (push/pr/ci prohibited at that phase + Actions outage live);
  local battery 10 suites/220 tests + 2 web suites/48 + check-types + eslint
  + actionlint all green; dispatch digest declared verbatim
  (validation:v1:1d25217bc8279a147d71366d1cfe89e2c31a334944966885fe8606787b7e747b
  — validation-only turn).
- full 722d7f5f: github_ci_validate.py VERBATIM ok=true; ephemeral PR #811
  (head 71f8dfc4, validation base b5e49d1b); ALL 10 executed checks SUCCESS
  incl. visual (against main's 1.64.0-paired baseline; no regen needed);
  Fro Bot SKIPPED (PAT gate); PR auto-closed + branch conductor/ci-71f8dfc47b9b
  auto-cleaned. Emission digest re-derived post-pass:
  validation:v1:2283441a237d12f41f4aa001df77bbdb9fc8d46a1c5e12e6c93703e749de6df1
  (executable surfaces changed mid-turn; markdown-only compound deltas do not
  move it).

## Prevention rules (this cycle's cures)

1. Mid-run base drift: expect origin/main to advance during long runs; the
   validation tool diffs against origin/main-at-prepare. Cure order: spool
   snapshot -> ff -> semantic re-apply; never hand-merge in the tool's clone.
2. Untracked files do not ride the delta: `git add -N` new files before any
   validation dispatch that must carry them.
3. Same-invariant guard duplication: before adding a guard, re-grep main for a
   landed sibling; adopt the richer one, drop yours (single source).
4. Pin/baseline/guard pairing: never bump one leg of a pinned-pair
   (lib/image/baseline) without the others; a "newer patch exists" is not a
   reason to churn a just-landed pairing.
5. minimumReleaseAge is a feature: defer riders whose target is inside the
   1440-minute window via the existing caret (pickup at next lockfile touch);
   do not mint excludes for dev-only scanners.
6. Emission-digest discipline: verbatim only in validation-only turns;
   re-derive after ANY executable change, including lint cures to tracked
   files (ROADMAP ws/backtick cures were content-free but the rebase was not).
7. Born-red lint baselines: remote full validation runs the Lint check on the
   candidate delta — a red base must be cured content-free BEFORE dispatch.
8. Reaped-attempt hygiene (429 at prioritize): a reaped attempt's artifact set
   is empty by definition; the redo re-derives selection from prior-phase
   artifacts rather than trusting memory of the reaped attempt.

## Next-cycle candidates (ranked, existing ids only)

1. rm-249 — push-SW wire-or-remove decision (pri 72; orphan deepened by the
   a385ca5 adoption; DEV Simulate Push is inert; 491-byte kill-switch sw.js).
2. rm-139 — Node-26 triple-bump at the 2026-10-28 LTS gate (engines + NODE_IMAGE
   digest re-derivation + @types/node 26.x; one reviewed change; not before the
   date).
3. rm-883 open window — @opencode-ai/plugin 1.18.35 -> 1.19.1 PLUS the three
   unlanded refreshes @hono/node-server -> 2.1.5, react/react-dom -> 19.3.1,
   @types/node -> 24.19.2 (one lockfile-only window; reconcile with in-flight
   pin riders; first-landed-wins).
4. Render-cure lane — mixed-shape def-line debris on f521ec7 ({rm-138, rm-1414,
   rm-1445} token-level dups) + rm-675 emitter obligations.
5. rm-252 — absorb-window re-measure (frontier 3dd78ee at cycle close; #641
   absorbed here; siblings may have moved it again).
6. Rider pickup — @axe-core/playwright ^4.13.0 caret takes 4.14.0 at the next
   lockfile touch (matured 2026-10-16T13:33Z).

## Fold map

Batch delta (6 files + this doc) is UNCOMMITTED in worktree
run-47f9aaefa379-47f9aaef at HEAD f521ec7; fold lands batch + ledger riders +
cycle doc together. Declared emission digest at fold time:
validation:v1:2283441a237d12f41f4aa001df77bbdb9fc8d46a1c5e12e6c93703e749de6df1
(markdown-only deltas since). Landing verification owns: rm-882 implemented
flip; census re-check (252 defs; render debris untouched); reconciliation with
the sibling 8ebc9eed compound family if their batch lands first (their doc +
ledger band touch the same week; disjoint ids).
