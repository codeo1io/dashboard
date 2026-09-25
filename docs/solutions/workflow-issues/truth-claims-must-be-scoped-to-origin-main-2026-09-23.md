---
title: Truth claims about origin/main must be scoped to origin/main — a working-tree grep produced a false "already landed"
date: 2026-09-23
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - Writing a roadmap rider, prioritization note, or review finding that claims a change "is already on main"
  - Deciding to close or re-scope a roadmap item because its acceptance appears satisfied in-tree
  - Grep-verifying a landed state from inside a conductor worktree that may carry local or stranded-branch payloads
  - Basing a batch selection on a premise you did not measure yourself this cycle

## Context

Cycle-7 (conductor run 8f151ba4, 2026-09-23) selected a "truthing-only closure" for roadmap item
rm-141 (bounded-concurrency aggregator refresh) on the premise that `FETCH_CONCURRENCY=6` was "already
on origin/main at `aggregator.ts:324,594`". That premise came from a grep executed during the roadmap
phase. When the implement phase re-measured it directly:

```
git grep -c FETCH_CONCURRENCY origin/main -- src/github/aggregator.ts   # -> 0
git show origin/main:src/github/aggregator.ts | sed -n '717p'           # serial loop
git grep -c FETCH_CONCURRENCY conductor/run-a7ca03039406 -- src/github/aggregator.ts  # -> 3
```

origin/main has zero occurrences and still runs the serial per-repo loop. The pool exists only on a
stranded, unlanded local branch. The earlier grep had hit the working tree (which carried local edits
and/or stranded-branch payloads), not `origin/main:<path>`.

The false premise had already propagated into two artifacts (the ROADMAP rider and the batch doc's B4
scope). Cost: a closure that would have marked an unimplemented item complete, plus two corrective
edits. Caught only because the implement phase re-derived the claim at point-of-use instead of
trusting the phase artifact.

## Guidance

1. **Scope every "on main" claim to main explicitly.** `grep path` inside a worktree answers "what
   is in MY tree", never "what is on main". The only acceptable forms are
   `git grep <pattern> origin/main -- <path>`, `git show origin/main:<path> | grep …`, or
   `git ls-tree origin/main …`. Never cite line numbers as main line numbers unless they came from a
   `git show origin/main:` read.
2. **Fetch before measuring.** Conductor worktrees are routinely N commits behind `origin/main`
   (this run: worktree at 7809df6, main at 64024a5, 7 behind). A stale `origin/main` ref is better
   than the working tree, but a fresh fetch is better still.
3. **Re-derive at point-of-use.** A later phase that ACTS on an earlier phase's premise (close an
   item, skip an implementation) must re-measure the premise itself, cheaply, before acting. The
   implement phase's one-line re-grep is what caught this; no review stage would reliably have.
4. **Correct falsified riders in place, immediately.** The correction rider
   ("CORRECTED 2026-09-23 … mis-attributed grep") was appended to the same ROADMAP item in the same
   cycle, and the batch doc's B4 scope was rewritten — not left for a later pass. Falsified claims
   compound; corrections do not survive deferral.
5. **Distrust stranded-branch payloads as "landed".** This repo accumulates certified but unlanded
   merge trees on `conductor/run-*` branches. Their presence in the object DB or a sibling worktree
   is NOT evidence anything reached `origin/main`.

## Why This Matters

A falsified "already on main" rider converts an open item into a phantom completion. The failure
mode is quiet: every subsequent reader sees a confident, line-numbered claim and no failing check —
until someone tries to use the "landed" behavior and it isn't there (here: rm-141's pool timing win
that never ships). The digest/fingerprint discipline protects executable surfaces; nothing equivalent
protects *prose* claims. Explicit grep scoping is the prose equivalent.

## When to Apply

- Any roadmap/prioritization/review artifact asserting landed state, line numbers "on main", or
  "superseded by merge <sha>".
- Any decision to close, re-scope, or defer an item based on such an assertion.
- Merging or rebasing conductor payloads forward: verify each payload's target state on main first.

## Related

- `docs/prioritization/2026-09-23-cycle-7-batch.md` — B4 premise falsification record
- `ROADMAP.md` rm-141 correction rider (2026-09-23, run 8f151ba4 implement)
- `era-specific-config-rationale-comments-carry-their-date-2026-09-23.md` — same-cycle sibling lesson:
  a true-at-the-time rationale comment that silently became false after an infra migration

## Landing note (2026-09-26)

The fetch retraced above was correct at the time and the rule is unaffected — that is exactly why the
lesson held. The state it measured has since changed: main now carries the bounded pool
(`refreshConcurrency` in `src/github/aggregator.ts`), so rm-141's remaining scope narrowed to its
verification half. Recorded at the integrate of run 8f151ba4 (conflict case a911e1e1); the retraction
itself stands as the worked example.
