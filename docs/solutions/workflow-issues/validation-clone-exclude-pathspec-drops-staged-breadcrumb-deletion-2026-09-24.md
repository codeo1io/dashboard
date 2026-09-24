---
title: Validation-clone delta patch drops staged .conductor deletions — guard reds only in cloud
date: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - A fork-exclusion guard (rm-131) is green locally but is the sole red in an engine ephemeral-PR cloud validation
  - The failing assertion is about tracked `.conductor/` engine state while your batch stages exactly that file's deletion
  - `git ls-files .conductor` is empty in your worktree but origin/main still tracks a `.conductor/progress/*.ndjson` blob
tags:
  - conductor
  - validation
  - fork-exclusion
  - pathspec
  - bootstrap
---

# Validation-clone delta patch drops staged .conductor deletions

## Problem

Conductor run 04c7d9c2 (cycle-9 batch) staged `git rm --cached` of the
`.conductor/progress/70f231743fbd4e3a82afb82232a13c4d.ndjson` breadcrumb that
origin/main 763c1fa tracked (blob ec22d0cf). The fork-exclusion guard
(`test/fork-exclusion-guard.test.ts`, rm-131 — asserts `git ls-files
.conductor` is empty) went green locally through that staged deletion. The
engine's ephemeral-PR cloud validation still failed the guard: 31/32 test
files passed, exactly this one red, in runs 35940433458 and 35941123514.

## Mechanism

The validation clone starts at **source HEAD** (main), which still carries the
tracked residue. The engine applies the candidate's delta as a patch built
with the pathspec:

```
git diff --binary HEAD -- . ':(exclude).conductor/**'
```

A pathspec exclude drops **every** change under the excluded path —
modifications *and deletions*. The batch's staged deletion of the tracked
breadcrumb therefore never propagates into the clone, the clone keeps
tracking the residue, and the guard reds there while being green in the
worktree that actually carries the deletion.

This is a bootstrap deadlock, not a defect in the batch: cloud-green on the
full suite is structurally unreachable until the untrack lands on main — and
the untrack is the batch's own Unit C. The landing self-cures every
subsequent validation, because clones then start clean.

## Diagnosis (fast path)

1. The cloud red names the rm-131 guard and nothing else.
2. `git ls-files .conductor` in the worktree → empty (staged deletion holds).
3. `git ls-tree origin/main .conductor/progress/` → the residue blob still
   tracked at source HEAD.
4. The staged deletion is under `.conductor/**` → the exclude pathspec
   silently drops it from the clone patch.

## Cure and prevention

- **Cure:** land the untrack on main. Do not chase the cloud red with
  worktree-side changes — none can reach the clone.
- **Prevention:** never let `.conductor/` land tracked in the first place
  (the rm-131 guard fails such PRs; after any landing merge, re-run
  `git ls-files .conductor` and `git rm --cached` any hit before handing
  off).
- **Triage rule:** a red that appears ONLY in cloud validation, whose subject
  is an exclude-pathspec-excluded path present in your staged deletions, is
  this artifact — verify the three facts above before debugging the test.

Documented alongside the sibling wedge from the same run:
`ephemeral-ci-base-pr-excluded-by-branch-filters-2026-09-24.md` (why the
same validation route initially registered zero checks at all).
