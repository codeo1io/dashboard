---
title: Cross-lane unattributed worktree edits and the keep-or-discard decision
date: 2026-10-17
category: workflow-issues
module: repository-maintenance
problem_type: process-anomaly
component: conductor-worktrees
severity: medium
applies_when: a conductor run worktree contains edits no phase of the current run made, or pins/baselines drift mid-run
tags: [conductor, worktrees, forensics, playwright, baselines]
---

# Cross-lane unattributed worktree edits and the keep-or-discard decision (run 83e235f3)

## Problem

Twice now, a run worktree has carried edits that no phase of the owning run
made. During this run's full_tests phase, forensics found a batch of
2026-10-16 18:09–18:25Z edits — a ROADMAP.md lint render cure, a
`@playwright/test` DOWNGRADE to 1.63.0 exact across package.json and
pnpm-lock.yaml, and a visual-baseline swap — none attributable to any typed
attempt in the spool event logs. The same signature occurred earlier in run
65d41c1b. A second lane validating simultaneously is the leading hypothesis;
the mechanism remains unproven.

The danger is asymmetric: a downgrade pin or a stale baseline that rides a
landing silently breaks the visual suite or reverses another lane's cure.

## Detection (cheap, run before trusting any pre-existing tree delta)

1. `git status --porcelain` at attempt start; compare against the previous
   phase's recorded tree state (every phase artifact records it).
2. `git diff` the changed tracked files and ask: does each hunk belong to a
   typed attempt in `~/.hermes/conductor-delegate-spool/events/<attempt>.jsonl`?
   Unattributable edits = cross-lane residue.
3. For pins and binary baselines, compare against origin/main's bytes, not
   against the local base: `git show origin/main:package.json` /
   `git show origin/main:web/...png` piped to `md5sum` vs the tree's file.
   The tree's file is correct iff it matches main's current bytes (this run:
   operator-dark `e397a053…`, listener `c928e6d0…`, privacy-dark `34ef52c1…`).

## Keep-or-discard rules applied here

- KEEP a render cure (lint-clean wall) — it is monotone improvement; verify
  with the non-mutating stdin probe, never by editing the wall.
- DISCARD any pin change that diverges from origin/main's current pins. The
  1.63.0 downgrade was dead on arrival: main carries the 1.64.0 triple
  (package pin + lockfile + visual image `v1.64.0-noble@06a9939e`). Corrected
  to 1.64.0 exact before validation; lockfile playwright regions made
  byte-identical to main's, making the delta merge-neutral.
- KEEP a baseline iff its bytes equal main's current baseline for that spec;
  otherwise restore main's bytes.

## Prevention rules

- Never land a dependency pin without comparing to `origin/main`'s pin at the
  moment of landing, not at the moment the batch started.
- Full-suite validation (ephemeral PR) is the arbiter for kept edits: the
  visual suite passing under main's image is the proof the pin correction was
  right (PR 813, 10/10 checks).
- Record the mystery-edit occurrence in the run's compound so the pattern is
  visible across cycles: two occurrences (65d41c1b, 83e235f3) is a trend, not
  noise.
