---
title: Ephemeral CI validation on a shared box — verify by your own run ids, never by the aggregator's verdict
date: 2026-09-29
last_updated: 2026-09-29
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - 'A full-validation phase runs `github_ci_validate.py` (or any ephemeral `conductor/ci-*` PR validator) while other conductor sessions validate against the same repository'
  - 'The validator script exits with `ok: false` on a check whose run link predates your own workflows, or dies silently with a zero-byte log, or your CI run is cancelled without any code change'
tags:
  - ci
  - github
  - conductor
---

## Problem

`github_ci_validate.py` pushes a tree-derived ephemeral branch (`conductor/ci-<sha12>`) and a
shared base ref, opens a throwaway PR, waits for checks, then closes the PR and deletes the
branch. Two sessions validating the SAME tree (for example, a delegate and an independent
review of the same candidate) derive the SAME branch name and base ref, and collide:

- One session's cleanup deletes the shared base ref out from under the other's in-flight
  run — the script can die with a zero-byte log (python's redirect buffering flushes only at
  exit).
- Closing an ephemeral PR auto-cancels its in-progress workflows, so a concurrent sweep
  cancels your `Main`/`Lint` mid-run.
- The aggregator's check buckets are matched by NAME, not by run id: it can mix another
  window's runs into your verdict. In cycle 18 (run 11121ee89bf3, 2026-09-29) run 3 printed
  `ok: false` over a `Lint (cancelled)` link pointing at run `36532005929` — a window ~4
  minutes BEFORE the batch's own workflows (`3653237xxxx`), all of which were green.

## Solution

Trust only checks you can attribute to your own run ids:

1. Capture the branch name the script reports (or `git ls-remote` while it runs) and list
   `gh run list --branch conductor/ci-<sha12>` — your workflows start at a known timestamp.
2. For each workflow run, enumerate jobs directly:
   `gh api repos/codeo1io/dashboard/actions/runs/<run_id>/jobs --jq '.jobs[] | [.name,.conclusion] | @tsv'`
   A `Main` workflow run with conclusion `success` implies every job inside it — including
   `Lint` — passed; a cancelled job inside another window's run says nothing about your tree.
3. If your script died silently, the GitHub-side evidence still stands: the branch's runs
   continue after the local process is gone. Poll them, then clean up the orphaned branch
   and PR yourself (the dead script's `finally` never ran).

Also note: this script prints no validation digest; the engine-level digest is derived from
the changed-surface list, so it stays stable across attempts that do not alter the listed
surfaces.

## Prevention

Before launching a full validation on this box, count live validators
(`pgrep -af github_ci_validate`). If others are mid-flight, expect one collision per
overlap and budget a re-run. On `ok: false`, ALWAYS diff the aggregated run links against
your own branch's run list before treating the verdict as a regression.
