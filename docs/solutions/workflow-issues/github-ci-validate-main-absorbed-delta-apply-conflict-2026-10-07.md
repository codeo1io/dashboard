---
title: github_ci_validate base-reconstruction conflict when main absorbs the cycle's delta
date: 2026-10-07
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - running the full-validation command (github_ci_validate.py) from a long-lived dispatch worktree while origin/main is advancing
  - any delegated fix/test phase that re-runs validation after other runs may have landed the same content
tags: [ci, validation, base-reconstruction, double-claim, delegation]
---

# github_ci_validate base-reconstruction conflict when main absorbs the cycle's delta

## Problem

The full-validation command
`python3 .../scripts/github_ci_validate.py --repo .` does not validate the
worktree against its dispatch HEAD. It reconstructs an ephemeral validation
base as **dispatch-HEAD code + origin/main's CURRENT workflow files**, then
applies the worktree delta onto that base with `git apply --3way`. When
another fleet run lands, on main, the same content this cycle's implement
phase wrote (the "double-claim" convergence), the 3-way apply conflicts
textually — even when the landed and local changes are functionally
identical — and validation fails in ~8s with:

```
{ok: false, ... 'git apply --3way --binary - failed (1): ... Applied patch to
.github/workflows/release.yaml with conflicts. U .github/workflows/release.yaml'}
```

Observed 2026-10-07 (run edaa50e0, full_tests 9c695bcc): this cycle's B1 wrote
the `awk END`-block SIGPIPE cure in `release.yaml` with its own comments;
origin/main advanced 25d32be -> 5aab7c7 mid-cycle (merge of run b2a3ae9b)
landing the byte-same cure lines as rm-691 with different comments. Function
identical, comments different -> textual conflict at base reconstruction.

## Resolution recipe (first-landed-wins)

1. Diagnose with `git diff <dispatch-HEAD> origin/main -- <conflicting file>`:
   if the divergence is exactly the landed twin of your delta, it is a
   double-claim, not a regression.
2. Adopt main's blob verbatim (`git checkout origin/main -- <file>` then
   `git restore --staged <file>` to keep it an uncommitted worktree delta),
   verify `git hash-object <file>` == `git rev-parse origin/main:<file>`.
3. Keep what was UNIQUELY yours: guard fences/tests. Check uniqueness against
   main first — `git show origin/main:<test file> | grep '<your marker>'` —
   if main has no fence, your tests remain the surviving contribution and are
   still green against main's blob (they assert structure, not comments).
4. Re-run the SAME full-validation command; declare the re-derived digest
   (an executable surface's content changed this turn, so the dispatch-time
   digest is stale).

## Prevention

- Before full-validation in a moving-main fleet, probe
  `git diff <HEAD> origin/main -- <changed files>`; if main already carries
  the cure, adopt it instead of re-deriving a third text variant.
- Write guard tests that assert structural properties (forms present/absent),
  never comment wording — double-claims converge on code, diverge on comments.
- Run the validator detached (`nohup ... > spool-scratch.log 2>&1 &`) with a
  durable log and PID file: provider-reaped attempts (three this cycle:
  +32s, +5-heartbeat, +225s) leave an adoptable trail instead of nothing,
  and the detached process survives the session reap.
- After a reap, before re-running: `gh pr list --state open` and
  `git ls-remote origin 'refs/heads/conductor/ci-*'` — no orphaned validation
  means a clean re-dispatch (known stale `conductor/ci[-base]-*` litter is
  inert).

## Adjacent lessons from the same cycle

- **node_modules is externally wiped between phases**: `npm exec` then
  resolves vitest from the npx cache (5.0.3) against the repo's pinned 4.1.11
  -> `ERR_MODULE_NOT_FOUND 'vitest/config'`. Cure: `corepack pnpm install
  --frozen-lockfile` before any local run; prefer `corepack pnpm exec` over
  `npm exec`.
- **Never anchor edits on recalled text**: a memory-reconstructed `oldText`
  can fabricate a phantom anchor that silently fails (or worse, reports
  success). Pull anchor lines verbatim from the file (uncut) immediately
  before editing, or locate them by regex inside the editing script itself.
