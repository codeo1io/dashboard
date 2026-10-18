---
title: Landed-commit claims need object verification — remote-tracking ref reads are not stable evidence between phases
date: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
tags: [git, evidence, conductor, verification]
---

## Problem

During a multi-phase conductor run on the dashboard campaign, the stewardship
phase recorded a decisive repository fact from `git log --format origin/main`
plus `git show origin/main:package.json`: "upstream sync commits for
2026.10.43/.44/.45 have landed — react 19.3.1, markdown-it devDep, and a
markdown-output module are on main; the absorb batch is discharged."

The very next phase disproved every element of that claim:

- `git cat-file -t 7f96027d` / `aa814700` / `9a534903` → `error: Not a valid
  object` — the "landed" shas resolve to nothing in the local store.
- `git show origin/main:package.json | grep react` → `react 19.3.0` (not 19.3.1).
- `git grep markdown-it HEAD` → empty; no markdown-output module exists.
- The `origin/main` remote-tracking ref itself later vanished from the worktree
  entirely (see the companion solution doc on tracking-ref vanishing).

Root cause: remote-tracking refs and their object sets are NOT stable evidence
across phases of a long run. A ref can point somewhere different (or nowhere)
by the next phase, and objects reachable only through a transient ref can be
pruned. Reading `git log origin/main` tells you what the ref said *at that
instant* — it does not certify the commits exist now, existed durably, or match
what a later phase will see. Consequence here: a whole phase artifact (the
stewardship contract) was written against a false premise, and the next phase
had to issue a correction of record and re-plan the batch.

## Trap shape

Any of these reads can silently produce phase-unstable claims:

- `git log origin/<branch>` / `git log --format=... origin/<branch>`
- `git show origin/<branch>:<path>`
- `git rev-list --count HEAD..origin/<branch>`

None of them verify that the shas they print are durable objects, and all of
them depend on a ref that another process (engine fold, gc, fetch with changed
credentials) can move or delete between phases.

## Cure / prevention rule

When recording "X has landed on main" as phase evidence, verify objects at the
moment of the claim and record the exact evidence tuple:

1. `git rev-parse origin/main` — capture the ref sha you actually read.
2. `git cat-file -t <sha>` for every commit you cite as landed — it must be
   `commit`, and re-verify in the phase that CONSUMES the claim.
3. Prefer content reads over log-line reads: `git show <ref>:<path>` still needs
   the ref; stronger is `git cat-file blob <ref>:<path>` with the blob hash
   recorded, so a later phase can re-derive identity from the hash alone.
4. When a later phase consumes a prior phase's landed-commit claim, re-run
   step 2 before acting on it. A claim that fails re-verification is void;
   correct the record explicitly (name the false claim and its correction) in
   the consuming artifact rather than silently re-planning.

In the triggering run the correction was issued as an explicit "correction of
record" in the batch doc and a truth-carrying roadmap rider, and the ledger's
upstream-window def was updated to reflect that the window was still open.

## Detection

- A phase artifact cites landed shas that a later `git cat-file -t` rejects.
- Two consecutive phases read contradictory content from the same
  `origin/main:<path>` expression.
- `git for-each-ref refs/remotes` no longer lists the ref you read last phase.
