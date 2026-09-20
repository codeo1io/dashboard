---
title: Parallel maintenance campaigns — re-measure the live frame and expect collisions
date: 2026-09-20
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - Two or more conductor maintenance campaigns (or a campaign plus any other actor) target codeo1io/dashboard in the same window
  - origin/main advances while a campaign's phases are still running
  - A batch artifact or ROADMAP.md lineage produced by one campaign collides with another's
---

## Context

During the 2026-09-20 cycle-2 campaign (run 779e7271), a parallel campaign (run 270220e7,
engine cycle:1) landed two batches onto origin/main **while the cycle-2 phases were still
executing**:

- `2f3a884 → 916783f` (04:54Z): gates fixes, Dockerfile 0e0ff40 absorb, checkSuites
  `first: 100`, ROADMAP rm-100..rm-115 — discovered mid-`prioritize`, invalidating every
  score computed against 2f3a884.
- `916783f → aa4ff9f` (05:05Z): CodeQL round 2 (`SEMMLE_TYPESCRIPT_HOME`) — discovered
  mid-`stewardship`, dissolving the batch's largest unit (B1) entirely.

Both landings were invisible without re-measuring: the worktree only shows them after
`git fetch origin`.

## Guidance

1. **Re-measure the live frame at the start of every phase** (`git fetch origin && git
   log --oneline origin/main -1`), not once per cycle. A phase that scores, describes, or
   lands against a stale tip produces wrong verdicts — this cycle's prioritize and
   stewardship phases each caught a landing this way and re-scoped in time.
2. **Fast-forward the worktree before implementing** (`git merge --ff-only origin/main`),
   saving uncommitted curated artifacts (ROADMAP.md) aside as content-merge sources.
3. **Batch artifacts name-collide**: both campaigns wrote
   `docs/prioritization/2026-09-20-cycle-2-batch.md`. The landed file wins; the second
   campaign's doc renames with a `-2` suffix — never overwrite a landed artifact.
4. **ROADMAP id-spaces collide**: the landed 916783f carried `rm-112..rm-115` with
   meanings that differed from the parallel unlanded lineage. Resolution protocol
   (applied 2026-09-20): the landed file is the base; landed ids keep their meanings;
   unlanded items renumber above the landed ceiling with the mapping recorded in the
   header manual-revision comment; content-level overlaps (e.g. both lineages' aggregator
   hygiene items) fold into the landed id rather than duplicating.
5. **Dissolve, don't duplicate, superseded work**: when the frame moves and a selected
   unit's target is already fixed upstream-of-your-batch (CodeQL at aa4ff9f), shrink the
   unit to a verify-rider plus any documentation residue — do not reimplement.

## Why This Matters

Every gate verdict, score, and status line in a long campaign is evidence against a
specific commit. Two campaigns on one repo guarantee the frame moves mid-run; without
per-phase re-measurement, the cycle compounds its own errors — re-fixing fixed gates,
re-adding absorbed upstream content, or clobbering the sibling campaign's landed roadmap
lineage (which is exactly how curated items get lost).

## When to Apply

Always for multi-phase maintenance campaigns on this repo; especially before prioritize,
stewardship, implement, and any landing gate. The rule generalizes to any parallel actor
(human pushes, dependabot, scheduled renders) — the fleet render clobber of 2026-09-20
(see `fleet-roadmap-render-clobber-recovery-2026-09-20.md`) is the single-actor variant
of the same failure.

## Examples

Caught mid-phase (2026-09-20):

```
$ git fetch origin && git log --oneline origin/main -1     # at prioritize start
916783f maintenance: restore main gates, absorb upstream drift ...   # frame MOVED
$ git log --oneline origin/main -1                          # at stewardship start
aa4ff9f fix(ci): point CodeQL typescript wrapper at repo toolchain  # moved AGAIN
```

The id-collision mapping recorded in ROADMAP.md's manual-revision header (rm-116..rm-124,
2026-09-20) is the worked example of rule 4.
