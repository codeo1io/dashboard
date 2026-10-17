# Repository maintenance cycle 2 compound — run 181d6e242f1b

module: roadmap
tags: repository-maintenance, compound, validation-evidence
problem_type: process

Scope: campaign repository-maintenance 4ffd3546 cycle:2 at worktree base 3e3664c, worktree
run-181d6e242f1b-181d6e24. This record compounds pre-review cycle evidence only — the
assessment, research, roadmap, prioritization, stewardship, implementation, and the
recorded targeted/full validation outcomes. Review and shipping outcomes belong to later
gates and are carried forward by the next cycle's assessment.

## Batch

Selected batch (prioritize artifact df0959b69bf4412eb1d9324cc1f959d9): estate truth-up and
signal restoration under the Actions suspension — five legs on the managed ledger and two
estate pins:

- rm-1463 ledger integrity: the 45 empty-acceptance defs (post-delta) swept — 21 flipped to
  implemented on tree-verified artifact evidence, 23 filled with re-derived acceptance,
  1 (rm-759) reconstructed in place; together with the roadmap delta's rm-251/497/498
  trues the whole ledger diff carries 24 flips (re-derived 2026-10-17 by id-line census
  of HEAD-vs-worktree, independent_review:fix; this line originally said 22); new guard
  test/roadmap-acceptance-guard.test.ts pins the invariant (no empty acceptance
  on in_progress defs).
- rm-1464 Dockerfile base-digest refresh: ARG NODE_IMAGE moved from sha256:173f1258... to
  sha256:7f486cab... (node 24.22.0) with a live registry digest proof.
- rm-1465 watch-class local mirror while Actions suspension persists:
  docs/solutions/workflow-issues/actions-suspension-local-watch-mirror-2026-10-16.md.
- rm-1461 gateway action pin to v0.122.3 (security release) — re-scoped mid-cycle when
  origin/main landed a competing bump of the same pin line (55086dd: v0.122.1 →
  06469674, comment v0.122.2; the batch's patch carried 7d273ac6, comment v0.122.3):
  the worktree byte-adopted main's file (git diff origin/main zero lines), the landing
  is main's, the residual v0.122.2 → v0.122.3 hop rides the landing gate as a 1-line
  re-anchor, and the supersession is recorded in the def.
- rm-1462 upstream absorb window (contract 1.11.0 anchor) stays open with an explicit
  dependency-blocked rider: the deployed gateway v0.119.2 speaks contract 1.9.0; absorbing
  the 1.11.0 parser would fail-close the operator stream — a gateway-side estate verdict
  gates this, not code readiness.

Adoption forensics across the cycle: reaped attempts 02a91dc2 (prioritize), 8143f032
(stewardship), 550cccd0 (implement, provider death after 8 messages, md5-proven
zero-drift), and dde9c1b1 (full_tests) left nothing durable; the durable work came from
attempt c510d39b (implement, completed without a typed envelope) and was verified-then-
repaired by 37747abd, and full_tests was completed by 8db4ef15. Nothing was redone that
existed; every adoption was verified against the live tree first.

## Validation outcomes (recorded, not re-run here)

- targeted_tests, round 1: github_ci_validate.py ephemeral PR 30d1b6ee judged FAILURE with
  exactly one red job — Lint. Cause: the rm-1463 sweep had cured 47 of the 50 frozen
  ROADMAP lint errors but left the 3 markdown/no-missing-label-refs errors (lines 19, 878,
  880); CI's Lint gate enforces a frozen-zero baseline while local lint tolerated the
  50-error baseline. Cure: three bracket escapes, content-free. Local eslint ROADMAP.md
  then exited 0.
- targeted_tests, round 2: same command verbatim, ephemeral PR #801 (base e1de49b2) — all
  executed checks SUCCESS including Lint; PR and branch auto-removed (404 verified).
- full_tests: run 1 collided with a just-landed origin/main workflow change (main commit
  55086dd landed the v0.122.2 pin 06469674; the batch patch carried v0.122.3 7d273ac6
  over base v0.122.1 15dc1d9d — this line originally attributed v0.122.3 to main) — the
  validator's 3-way apply could not reconcile three values on one line. Cure: byte-adopt main's file (re-scope, zero diff) and re-run.
  Run 3: ephemeral PR #835, commit dbb4884b, ok=true, all checks green; digest parity
  proven before work (validation:v1:acf6d476... == work order) and re-derived after the
  re-scope (final validation:v1:42f172448651e670a42b64cc5cf3a4f478f71c).

## Learning themes (reusable)

1. Local-versus-CI lint-baseline asymmetry: a batch that partially cures a frozen lint
   baseline goes green locally and red in CI. Rule: any ledger-touching batch must leave
   ROADMAP.md eslint-clean (local exit 0), not merely improved — or must not touch the
   baseline at all. The roadmap-acceptance-guard now pins the acceptance invariant, but
   nothing yet pins lint-clean locally; see the next-cycle candidate below.
2. Validator 3-way collision on just-landed workflow drift: when the batch carries a
   workflow-file delta and origin/main lands a competing change to the same line mid-run,
   the validation clone cannot reconcile it. Cure pattern: byte-adopt main's landed file,
   record the supersession in the ledger, defer your own delta to the landing gate. A
   throwaway-dir rehearsal of the validator's exact git apply --3way reproduces the
   conflict before any CI run is spent.
3. Verify-then-adopt beats redo: a completed attempt with a missing typed envelope is not
   a lost attempt — forensics (typed JSON parse, event log, md5 identity of claimed files)
   establish the durable work; repair the envelope, never re-implement.
4. Ledger truth-up discipline: flip a def to implemented only on tree-verified artifacts
   (git grep marker lines); when no artifact cites the id, fill the acceptance from the
   title and leave the status honest. The sweep's 21-flip/23-fill/1-reconstruct split
   (24 flips across the whole ledger diff once the roadmap delta's trues are counted;
   corrected 2026-10-17, this line originally said 22) is the reference census method.

## Next cycle candidate work

- Unify the lint baselines: ROADMAP.md is now eslint-clean; re-freeze the local frozen
  baseline from 50 to 0 so local pnpm lint matches the CI gate and the asymmetry class
  dies permanently.
- rm-1462 absorb window with the gateway estate verdict rider (contract 1.9.0 deployed vs
  1.11.0 parser upstream) — needs a gateway-side decision before any code.
- rm-1466 registry patch-drift refresh (hono/node-server 2.1.5, playwright 1.64.x,
  plugin 1.19.x, react 19.3.1) as one frozen-lockfile window.
- rm-139 Node 26 adoption gate is time-ripe: v26 LTS promotion 2026-10-28, v24 maintenance
  2026-10-20 (live nodejs/Release schedule).
- rm-1467 runner-image horizon: Ubuntu2604 images are published; plan the pinned
  ubuntu-24.04 retirement rather than an alias-flip watch.

## Output tree

- ROADMAP.md: rm-1463/1464/1465 implemented; rm-1461 re-scoped supersession (status +
  evidence, authored by full_tests); rm-1462 dependency-blocked rider — all landed by
  this cycle's earlier phases; the compound turn's own ROADMAP insertions were a no-op
  (zero net bytes, no record comment exists at the mint-header — caught by independent
  review 2026-10-17; corrected in this fix).
- docs/solutions/workflow-issues/actions-suspension-local-watch-mirror-2026-10-16.md (new).
- test/roadmap-acceptance-guard.test.ts (new).
- .github/workflows/fro-bot.yaml: byte-adopted origin/main 55086dd (v0.122.2 pin 06469674;
  the residual v0.122.2 → v0.122.3 hop rides the landing gate as a 1-line re-anchor).
- Dockerfile: ARG NODE_IMAGE digest 7f486cab... (node 24.22.0).
- This document.
