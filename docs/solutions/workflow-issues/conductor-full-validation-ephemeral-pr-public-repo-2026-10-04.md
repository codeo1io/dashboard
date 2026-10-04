---
title: Full-validation ephemeral PR route for this public repo (conductor/ci-* refs)
date: 2026-10-04
category: workflow-issues
module: dashboard
component: ci-validation
problem_type: tooling_behavior
severity: low
applies_when:
  - 'A conductor full_tests work order says `github_ci_validate.py --repo .` and you need to know what it will actually do to this repository'
  - 'You see short-lived `conductor/ci-*` / `conductor/ci-base-*` branches, a draft PR, and a Main+CodeQL+Dependency Review run burst on a branch you did not create'
  - 'Deciding whether full validation can run locally instead'
tags: [conductor, ephemeral-pr, full-validation, public-repo, force-push-refs]
related:
  - '.github/workflows/main.yaml (jobs the route exercises)'
  - 'docs/solutions/workflow-issues/mid-run-fast-forward-preserve-uncommitted-deliverables-2026-10-04.md'
---

## Problem

The conductor full-validation command behaves differently by repository
visibility, and its side effects (force-pushed refs, a draft PR, Actions runs)
look alarming if you do not know the mechanism.

## Solution — what actually happens (observed 2026-10-04, run b528f707)

`github_ci_validate.py --repo .` on **codeo1io/dashboard (public, ADMIN)**:

1. Builds a throwaway clone; the validation commit is the worktree HEAD **plus
   every uncommitted change including untracked files** (`git add -A` in the
   clone) — new test files DO run in this validation. Observed: validation
   commit `64a250961bf9` = HEAD 227375247 + 6 modified + 2 untracked files.
2. Force-pushes two refs: `conductor/ci-base-<sha12>` (the comparison base) and
   `conductor/ci-<sha12>` (the tree), then opens a **draft PR** between them
   (here PR #367). Your campaign branch is never touched; no commit lands
   anywhere durable.
3. Waits for the PR's checks (this repo: CodeQL, Analyze, Dependency Review,
   and the Main workflow's Lint / Design Check / Check Types / Test / Check
   Workflows / Test Scripts Load — 9/9 SUCCESS observed), polling up to its
   timeout.
4. Teardown always runs: closes the PR and deletes BOTH refs. A closed
   `conductor/ci-*` PR with a deleted head is a completed validation, not a
   failure.

For a **private** repo the same script errors out
(`remote-CI route is only enabled for public repositories`) — full validation
then has to run locally via the repo's own gates; do not "fix" the script.

## Prevention

- Never hand-delete `conductor/ci-*` refs mid-wait — the validator's teardown
  owns them; a killed validator (timeout) may leave the draft PR behind, which
  is safe to close by hand afterward.
- The validation commit contains your untracked files: never leave secrets or
  scratch in the worktree root, they would be pushed to the ephemeral ref on a
  public repo.
- Treat this route as covering the COMPLETE dirty tree (including untracked);
  it is strictly stronger than a clean-checkout CI run for pre-landing review.
