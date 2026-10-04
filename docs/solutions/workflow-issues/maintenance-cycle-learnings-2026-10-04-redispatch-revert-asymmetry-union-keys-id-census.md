---
module: 'dashboard'
tags: ['maintenance-cycle', 'conductor', 're-dispatch', 'reaped-session-forensics', 'id-space-census', 'roadmap-editing', 'aggregator', 'union-join']
problem_type: 'process'
---

# Maintenance-cycle learnings 2026-10-04: re-dispatch revert asymmetry, union-key uniformity, three-tier id census

Cycle 1 of run a86ee3dca324 (repository-maintenance 3f8c1e8050aa40b28b676e95dcf47a94), compound phase attempt
4bb978c883c545098e8287dad14d35ef, base 227375247 == origin/main. Pre-review evidence only — no tests or
validation commands were run in this phase. First-hand artifacts:
`/home/agent/.hermes/conductor-delegate-spool/delegate/4bb978c883c545098e8287dad14d35ef.json` (this pass),
`/home/agent/.hermes/conductor-delegate-spool/delegate/d132a31d659646aea00d68ae04db76ef.json` (the superseded
prior pass), `/home/agent/.hermes/conductor-delegate-spool/delegate/48cf7db51a8d469c81a0cf995f6f3e34-scratch/full-validation.log`
(the cycle's full-validation record).

## Lesson 1 — A re-dispatch reverts tracked folds but keeps untracked inserts

Mechanism. The prior compound pass (d132a31d) completed: typed artifact present, `delegate_turn_completed`
after `session_reaped`, and it recorded 22+1- ROADMAP edits in the worktree. The re-dispatch (4bb978c8) found
the worktree's ROADMAP back at the implement-phase state (10+1-) while the pass's untracked batch-doc section
had SURVIVED verbatim. Result: a worktree whose untracked doc narrated ledger state that did not exist, and a
prior typed artifact whose recorded numstat no longer matched the tree.

Prevention rule. On any re-dispatch, audit BOTH channels against the prior typed artifact before re-authoring:
compare `git diff HEAD --numstat` per file with the artifact's recorded numbers, and grep the batch doc for
sections the ledger no longer carries. Re-deliver the prior pass's folds (they are the authoritative batch
intent) instead of re-authoring, but re-verify every volatile datum live — in this cycle the conductor/ci-*
head count moved 51 → 47 between the two passes on the same day, and one of its premise claims (the validator
leaves branches behind per run) was false for the current release: release be15abcc tears down cleanly when a
validation completes, and the residue on origin comes from reaped/killed sessions plus older validator
behavior.

## Lesson 2 — Id-space census must sweep all three tiers

The ledger's id spaces (def ids `rm-N`, extension/compound comment numbers) are claimed across three tiers:
(1) the committed ledger; (2) per-worktree uncommitted diffs (`git diff HEAD -- ROADMAP.md` in every run
worktree — walk the conductor-worktrees roots; `git worktree list` from one checkout is registration-scoped,
and this cycle saw 37 entries where a filesystem walk found 50 dirty ROADMAPs); and (3) delivered-by-diff
scratch in the delegate spool (phase results that never touched a worktree).

Case. The prior pass's census covered tiers 1-2 only and numbered its extension comment #21 — colliding with
bccbd1f3's delivered-by-diff #21 (spool tier), a collision visible only by grepping the spool scratch. The
same pass minted above a "ceiling rm-642 in 764d81ac" whose worktree no longer exists and whose only mentions
are the pass's own files — an unreproducible attribution. The re-delivery census (all three tiers) found:
committed extension ceiling #10, worktree-diff ceiling #19, delivered-diff ceiling #21, all-lineage def
ceiling rm-641 (rm-639/640 e9201072, rm-641 bccbd1f3), and no rm-642 claimant anywhere — and minted nothing.

## Lesson 3 — Never anchor a ledger insertion on a partial-line prefix

Mechanism (this cycle's implement near-miss, recorded in the batch doc): a partial-line text match on a long
single-line bullet silently splits the line and glues the remainder onto the insertion's last line. The ledger
guard batteries (length, prose-residue, env-docs, fork-exclusion) do NOT catch a split rider — the failure
surface is a corrupted historical record, not a red test.

Prevention rule. Anchor edits on full unique lines (or insert programmatically by line index), and after every
ledger edit grep-verify that the target def block's line count matches expectation and that no evidence/rider
line gained a stray continuation. This cycle's split (rm-528's rider) was repaired byte-identical from
`git show HEAD:ROADMAP.md`.

## Lesson 4 — Aggregator membership predicates must share one identity derivation

Mechanism (the cycle's implemented fix, rm-633). The working-set union admitted installation rows by node_id
only, while the denylist (src/github/aggregator.ts:503) and the landed rm-255 auth-context join (:458/:477) are
dual-key. A node_id format skew between API surfaces (legacy `MDEwOlJlcG9zaXRvcnk...` vs `R_kgDO...`)
produced a phantom twin: the repo counted twice in `snap.repos` and walked twice per-repo in GraphQL, while
`driftCount` (:145-148 — count-only for repos NOT in public metadata) stayed 0 because the twin IS in public
metadata. The fix seeds a `unionByDatabaseId` admission index from rm-255's own conservative
`deriveDatabaseId` in the metadata loop, making admission dual-key like the denylist.

Prevention rule. Any future set-membership decision over repos (new denylist arms, new union admissions, new
join keys) must derive identity through the same conservative derivation in one place — a node_id-only
predicate anywhere in the pipeline is a latent format-skew bug. The regression test
('format-skew twin never double-counts' in test/aggregator.test.ts) pins the invariant; extend it rather than
parallel it when adding predicates.

## References

- ROADMAP.md riders dated `2026-10-04, compound d132a31d re-delivered by 4bb978c8` (rm-633, rm-194, rm-279,
  rm-159) and the `cycle-1 extension #22` comment.
- docs/prioritization/2026-10-04-repository-maintenance-cycle-1-batch-run-a86ee3dc.md — the compound section
  (re-delivery forensics + corrections of record) and the next-cycle context.
- Cousin doc (same day, 2026-10-03 lineage): docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-03-sigpipe-superseded-content-reanchor.md
  — its typed-artifact-or-redo rule is what this pass extends to the untracked-survivor case.
- Local web-vitest Node-26 recipe (sibling 86c2dd13's batch, referenced not duplicated):
  docs/solutions/test-issues/operator-runtime-loader-test-seam-and-web-localstorage-2026-10-04.md
