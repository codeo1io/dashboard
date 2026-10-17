---
title: Worktree remote-tracking refs vanish and https fetch fails on credentials — ff locally from the shared object store
date: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
tags: [git, conductor, worktree, fetch, refs]
---

## Problem

Mid-campaign, a conductor worktree on the dashboard campaign lost ALL of its
`refs/remotes/origin/*` tracking refs (`git for-each-ref refs/remotes` listed
only `autonomy-upstream/*`), and `git fetch origin` over https began failing
with a credential error. Symptom chain:

- `git rev-parse origin/main` → `fatal: Needed a single revision`
- `git fetch origin` → credential failure (no usable askpass/helper in the
  delegate session)
- shas named by the engine (e.g. a validator's `validation_base_commit`) were
  not in the local object store

Despite that, `HEAD`, `git log`, `git show <local-sha>:<path>`, and
`git merge --ff-only <local-sha>` all kept working, because the worktree shares
the campaign repository's object store: every object the run had ever touched
remained reachable by sha.

## Trap shape

Operators instinctively re-fetch to "fix" a missing ref. With credentials
broken, that burns the phase on an unrecoverable path and can LOOK like the
worktree is bricked. It is not: only the ref NAMES are gone, not the objects.

## Cure / prevention rule

1. Do NOT delete/reclone. Work from the shared store: `git rev-parse HEAD`,
   `git log <sha>`, `git merge --ff-only <sha>` all remain valid.
2. Re-anchor by explicit sha, not by ref name: the engine's dispatch context
   and the ephemeral validator JSON both print absolute shas
   (`validation_base_commit`) — those are the authoritative base pointers when
   `origin/*` names are unavailable.
3. Record the ref-loss as an anomaly in the phase result: the fold/integrate
   gate must reconcile against the engine's refs, not this worktree's
   remote-tracking refs.
4. Before any later phase rebases, re-establish tracking (fix credentials or
   `git update-ref refs/remotes/origin/main <sha>` from the engine-provided
   sha) so ref-based tooling works again.

Related: `landed-commit-claims-need-object-verification-2026-10-18.md` — the
same instability is why landed-commit claims read from tracking refs need
object verification.
