---
title: Ephemeral ci-base validation PRs register zero checks when branch filters exclude them
date: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - A conductor validation command (`github_ci_validate.py --repo .`) polls for PR checks and never sees any register
  - A validator process sits at 0 CPU for many minutes after pushing a `conductor/ci-base-*` branch
  - `gh pr list` shows an open PR whose base is `conductor/ci-base-**` (head `conductor/ci-**`) with no checks attached
  - The error eventually reads "timed out without registering any PR checks" (3600s deadline)
tags:
  - github-actions
  - conductor
  - validation
  - branch-filters
  - ephemeral-pr
---

# Ephemeral ci-base validation PRs register zero checks

## Problem

The engine's full-validation route pushes the validation base to a
`conductor/ci-base-<sha>` branch and the candidate payload to a
`conductor/ci-<sha>` branch, then opens an ephemeral PR with **head
`conductor/ci-<sha>` → base `conductor/ci-base-<sha>`** (live shape verified
2026-09-24: PRs #44–#58 all carry head `conductor/ci-*`, base
`conductor/ci-base-*`) and polls for the PR's checks. GitHub's `pull_request`
`branches:` filter matches the PR's **base** branch — and these PRs never
base on `main`. At origin/main 763c1fa the three workflows with
`pull_request: branches:` filters — `main.yaml`, `codeql.yaml`,
`dependency-review.yaml` — filtered on `[main]` only, so **no workflow fired
for a validation PR whose base branch is `conductor/ci-base-**`**. The PR
opens, registers zero checks, and the validator polls its 3600s deadline away
at 0 CPU.

The failure looks like a hung process. It is not: the poll loop is doing
exactly nothing because there is literally nothing to observe. Observed
2026-09-24 in conductor run 04c7d9c2 (targeted_tests attempt 409ba5bb): the
dispatch escalated to this route (because `package.json` was in the changed
set), sat 20+ minutes at 0 CPU, and a first attempt (a84dada1) burned its
whole turn on the dead wait.

## Diagnosis (fast path)

1. `ps` shows the validator alive but with zero CPU over minutes — poll-wait,
   not compute.
2. `gh pr list --state open` shows the ephemeral PR with base
   `conductor/ci-base-**` / head `conductor/ci-**` and an empty check suite.
3. `grep -A2 'pull_request:' .github/workflows/*.yaml` — any workflow whose
   `branches:` filter does not include `conductor/ci-base-**` will never fire
   for it (the filter matches the PR's base branch).

## Fix

Add the validation base-branch pattern to every `pull_request` branch filter
(keep any existing entries):

```yaml
on:
  pull_request:
    branches: ['main', 'conductor/ci-base-**']
```

Applied in the cycle-9 batch to `main.yaml`, `codeql.yaml`, and
`dependency-review.yaml` (the only three filtered workflows at that base).
After the fix the ephemeral PR registers all 9 checks within ~5 minutes.

The filter fix existed upstream of main in an unlanded conductor run
(f4622d7e) — check whether it has landed before re-applying.

## Handling a validator stuck this way

- `kill -INT <pid>` exits it cleanly via KeyboardInterrupt in the poll loop.
- The engine's finally-cleanup escapes when interrupted this way, so the
  ephemeral PR and its `conductor/ci-*` / `conductor/ci-base-*` refs stay on
  origin — do not hand-clean them from a push-prohibited phase; queue them for
  a push-authorized residue sweep (see roadmap rm-159).
- Relaunch the command with `nohup … &` so no tool timeout can orphan it
  mid-run, then poll its log.

## Prevention rule

When a conductor validation command uses the ephemeral-PR route and shows
zero checks plus zero CPU, **check the pull_request branch filters first** —
before suspecting the runner, the Actions service, or the tree.
