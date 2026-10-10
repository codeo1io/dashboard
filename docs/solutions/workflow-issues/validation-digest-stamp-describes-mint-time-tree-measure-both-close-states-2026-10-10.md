---
title: Validation-digest stamps describe the mint-time tree — measure both close states, never assume
date: 2026-10-10
category: workflow-issues
module: dashboard
tags:
  - conductor
  - validation-policy
  - full-tests
  - fold-gate
problem_type: workflow_issue
component: development_workflow
severity: high
---

## Problem

A conductor full-suite phase can fold-reject with "stale validation evidence
(R5)" even when every suite ran green, because the dispatch-time
`validation_digest` is minted over **whichever tree was live when the engine
stamped the dispatch** — not reliably over the batch, and not reliably over
pristine. The fold re-derives the digest over the worktree *at fold time* and
requires the declared digest to equal it. Two same-day runs on this repo
produced the two opposite failure shapes:

- **Run 633717c2 (stamp = batch-applied):** the engine stamped dispatch over a
  dead attempt's applied batch. Closing pristine and declaring the (pristine)
  dispatch digest was a guaranteed R5 rejection; the phase had to close on the
  applied batch.
- **Run 4c0ec7a5 (stamp = pristine):** the prior phase restored the worktree
  before dispatch, so the stamp described pristine `cb4da55`
  (`validation:v1:6e448c9a…`). Closing applied would have rejected; the phase
  closed pristine with the stamp declared verbatim.

Neither shape is visible from the work order text — both stamps look
identical in the validation block.

## Root cause

`apply_validation_gates` computes `validation_digest(base_sha, repo)` over the
run worktree at fold time and compares it to the evidence's declared digest.
The dispatch stamp is a snapshot of one moment; anything that changed the tree
after it (a prior phase's apply, a dead attempt's dirt, a restore) inverts
which close state the stamp supports.

## Cure — measure, don't assume

1. Before declaring, derive the digest **first-hand on both trees**:
   `python3 -c "…sys.path.insert(0, <dispatch release>/src); from
   hermes_conductor.validation_policy import validation_digest;
   print(validation_digest('<base_sha>', '.'))"` once at pristine and once with
   the carrier applied (a throwaway `git worktree add --detach` copy keeps the
   run worktree clean).
2. Close on the tree whose digest equals the dispatch stamp, and declare that
   digest verbatim. If the emission-time note applies (executable surfaces
   changed this turn), declare the digest the tree you close on digests — the
   fold compares against the closing tree, not the stamp, for re-declared
   digests; for a no-net-delta turn the verbatim stamp is the exact answer.
3. Prove the choice with a fold simulation against the dispatch release's
   `apply_validation_gates`: positive control (written evidence vs closing
   tree) must ACCEPT; a negative control against the *other* tree must REJECT
   on R5. If the negative control accepts, you have no protection at all.
4. Record the digest map (pristine and applied digests) in the phase evidence
   so the next phase (final_validation) knows exactly which tree its
   release-integrity stamp must be measured over.

## Verification (2026-10-10, run 4c0ec7a5)

Pristine `cb4da55` → `validation:v1:6e448c9a6681…309d` == dispatch stamp;
carrier-applied → `validation:v1:a617a7be0305…7d6b7`. Fold-sim: ACCEPT on
pristine, four tamper probes (command/digest/scope/outcome) REJECT,
patched-tree negative control REJECTs "stale validation evidence … (R5)".
The phase folded clean.

Related: `docs/solutions/workflow-issues/stale-dispatch-base-and-parallel-lineage-mint-collision-2026-09-25.md`
(dispatch-base staleness, the sibling failure family).
