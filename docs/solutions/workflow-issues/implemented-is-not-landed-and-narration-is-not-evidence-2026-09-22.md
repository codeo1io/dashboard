---
title: Implemented is not landed, and narration is not evidence — two cycle-6 process failures and their prevention rules
date: 2026-09-22
module: dashboard
problem_type: process_lesson
component: conductor-cycle
severity: medium
applies_when:
  - a maintenance-cycle batch is implemented on a branch or PR rather than merged to origin/main
  - a roadmap or status artifact records the outcome of a prior phase's work
  - tool outputs are dropped or a delegate session fails mid-cycle and later phases resume from prior narrations
---

## Problem 1: a green, implemented batch survived a full cycle as invisible work

Conductor run 5351fd4e's cycle-4 batch (f8ff412, PR #9) passed its full gate suite on
2026-09-21 (~12:00Z: Main 35597011430 + CodeQL 35597013457, both green) and marked its
roadmap items `implemented`. It was never merged. For the next ~30 hours origin/main lacked
the entire payload — base-digest drift detector, supply-chain gate, README truth, aggregator
docstring fix — while every consumer of the roadmap believed those items were done. The
stranding was only discovered when run 2ae7d10a's assess phase (2026-09-22) probed
`git merge-base --is-ancestor f8ff412 origin/main` → NOT an ancestor.

Root cause: `implemented` on the stranded branch's roadmap did not distinguish *validated on
a conductor branch* from *landed on main*, and no later phase re-checked merge state.

**Prevention rules:**

1. A status artifact may say `implemented` only with a qualifier naming WHERE: `implemented
   (landed <origin/main sha>)` vs `implemented (in worktree/branch, pending commit/push/CI)`.
   The cycle-6 ROADMAP entries now follow this.
2. Every cycle's first assessment step probes open PRs and pending branches for payloads that
   claim completion: `gh pr list --state open` + `git merge-base --is-ancestor <sha> origin/main`
   for each. An open PR whose branch CI is green is a stranded batch until merged or
   explicitly superseded.
3. When re-landing a stranded payload, the re-landing batch (not the old PR) owns the roadmap
   status flips — the old PR's self-reported statuses rode a tree that never landed.

## Problem 2: narrated results were trusted after the outputs that backed them were gone

Two distinct failures compounded in run 2ae7d10a:

- **Reconstruction from dropped outputs.** When the implement phase's verification outputs
  were dropped mid-flight, its PhaseResult nonetheless named four files that were never in
  the payload (`web/src/status/BubbleChart.tsx`, `src/gateway/operator-contract/status.ts`,
  `src/monitoring/snapshot.ts`, `test/gateway/operator-contract.test.ts`), two misnamed doc
  paths, and a wrong `4088/4088` test count — the real suite was 2038/2038 server. Every
  wrong claim traced to a command whose output was never seen.
- **State rollback across a failed session.** After a delegate session failed to start, the
  worktree was re-provisioned to an earlier state: the implement phase's ROADMAP edits were
  gone (the file was back to `UU` with pre-fold content) and two payload files had vanished.
  Any phase that had trusted the prior narration would have validated a tree that no longer
  matched what the PhaseResults described.

**Prevention rules:**

1. Never write a verification claim into a PhaseResult unless the backing command's output
   was actually seen this turn. If outputs were dropped, re-run the check — narrating from
   memory is how fabricated filenames and test counts enter the record.
2. Every phase begins by re-deriving tree state from git itself (`git status --porcelain`,
   index vs worktree, file presence) — prior-phase narration is a hypothesis, not evidence.
   The `gh pr diff <n> --name-only` list is the authoritative payload inventory, not any
   phase's artifact list.
3. Validation phases prove non-interference with a before/after `git status` fingerprint
   (sha256 of `git status --porcelain | sort`); an unchanged fingerprint is what licenses
   declaring the dispatch validation digest verbatim.
4. After any session failure or engine re-provision, assume uncommitted work may have been
   rolled back and diff the tree against the last phase's recorded fingerprints before
   building on it.

## How this was applied in cycle-6

- `targeted_tests` (attempt 0a7d4d13) fingerprinted before/after (sha256
  `7daad22b…`, unchanged) and re-derived the real payload from `gh pr diff 9` —
  catching both the rollback and the reconstruction errors before they shipped.
- `compound` (attempt 03a9efd3) re-applied the rolled-back roadmap folds with
  where-qualified statuses and recorded the restore-and-stage instructions for the commit
  phase in the ROADMAP header comment.
