---
title: Fast-forwarding a conductor run worktree mid-run with uncommitted deliverables
date: 2026-10-04
category: workflow-issues
module: dashboard
component: conductor-worktree
problem_type: branch_management
severity: low
applies_when:
  - 'A multi-phase conductor run spans hours and origin/main moved past the run''s base between phases (here 28396ca9 → 227375247 during the roadmap→implement gap)'
  - 'The worktree carries UNCOMMITTED phase deliverables (a ROADMAP.md +39 extension, an untracked prioritization doc) that must survive the base move un-degraded'
  - 'Later phases validate against origin/main content (e.g. sibling-landed riders in the same ledger entries)'
tags: [conductor, fast-forward, stash-pop, rider-conflicts, uncommitted-deliverables]
related:
  - 'ROADMAP.md (ledger invariants below)'
  - 'docs/prioritization/2026-10-03-cycle-3-batch-run-b528f707.md'
---

## Problem

A conductor run's phases can outlive the freshness of its checked-out base:
assess/research/roadmap ran at 28396ca9, and by the implement phase origin/main
had advanced (a sibling's landing added dated riders to the very ledger entries
this run had edited). Implementing on the stale base would have produced a
conflicting diff; discarding the dirty tree would have destroyed the run's own
deliverables.

## Solution

Fast-forward the worktree WITH the dirty deliverables in tow (run b528f707):

1. `git fetch origin main`, confirm the new tip and that the run branch has no
   commits of its own (`git rev-parse HEAD` vs `origin/main` — a pure
   fast-forward is only valid when the run branch never diverged).
2. `git stash push` (tracked modifications; **untracked files ride untouched** —
   the prioritization doc and the new test file never entered the stash).
3. `git merge --ff-only origin/main`.
4. `git stash pop`. Ledger rider blocks conflict where the sibling landing and
   this run's mint both appended to the same entry — resolve **keep-both**
   (dated riders from different runs are complementary records, never
   either/or).
5. Re-assert the ledger invariants after the pop: def-line count = pre-FF count
   + landed additions, `uniq -d` empty (no duplicated ids), and the run's diff
   vs the NEW origin/main still exactly +N/-0 for the pure-addition deliverable.
6. Then proceed with implementation on the fresh base.

## Prevention

- Prefer pure-addition ledger edits (new items, appended riders) — they survive
  this procedure with keep-both resolutions; rewrites of existing rider text
  would not.
- Re-verify `git diff --stat` against the NEW base immediately after the pop;
  any surprise deletion in the diff means a conflict resolution ate a block.
- Do this once, at the phase boundary where content freshness starts to matter
  (implement), not mid-edit.
