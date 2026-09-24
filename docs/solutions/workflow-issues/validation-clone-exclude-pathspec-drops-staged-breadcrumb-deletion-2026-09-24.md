---
title: Validation-clone delta patch drops staged .conductor deletions — guard reds only in cloud
date: 2026-09-24
last_updated: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - A fork-exclusion guard (rm-131) is green locally but is the sole red in an engine ephemeral-PR cloud validation
  - The failing assertion is about tracked `.conductor/` engine state while your batch stages exactly that file's deletion
  - `git ls-files .conductor` is empty in your worktree but origin/main still tracks a `.conductor/progress/*.ndjson` blob
  - A completion-locked validation phase demands cloud-green BEFORE the untrack can land (the deadlock form)
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

Two cures, by situation:

- **After landing is allowed (normal case):** land the untrack on main. Do not
  chase the cloud red with worktree-side changes — none can reach the clone.
- **When cloud-green is required BEFORE landing (the deadlock form, hit by
  run 3538ec96 on 2026-09-24):** scope the guard's assertion to durable refs.
  The ephemeral `conductor/ci-*` snapshot refs structurally inherit
  HEAD-tracked breadcrumbs by construction (proven across six byte-consistent
  red snapshots), so asserting on them asserts on an engine artifact, not on
  repository state. Concretely:

  ```ts
  const onEphemeralValidationRef =
    (process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? '').startsWith('conductor/ci-');
  it.skipIf(onEphemeralValidationRef)('no .conductor/ engine state is tracked in git', () => { … });
  ```

  This is a scope correction, NOT a weakening: the assertion stays fully
  active on main and on every real PR ref, and still hard-fails there on any
  tracked `.conductor` path. Verified in that run: 15/15 locally with no env,
  14 passed + 1 skipped under `GITHUB_HEAD_REF=conductor/ci-…`, and the
  engine's own CI log shows `15 tests | 1 skipped` — after which the verbatim
  full validation command went rc=0 (ephemeral PR #86, run 35966577151).
  Do NOT broaden the prefix beyond `conductor/ci-` or remove the skip.

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
