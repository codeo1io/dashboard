---
title: Mint-time is not id ownership — re-verify the roadmap ledger ceiling at implement start and renumber in lockstep when a parallel landing takes your ids
date: 2026-09-25
category: best-practices
module: dashboard
problem_type: best_practice
tags: [roadmap, id-space, parallel-runs, landing-race, integrate-renumber, chain-integrity]
component: roadmap
severity: high
applies_when:
  - a roadmap or prioritize phase mints new rm-NNN ids above a verified all-lineage ceiling
  - another run's integrate-merge can land between this run's mint and its implement phase
  - code comments, tests, or batch docs already carry minted ids by the time a collision is discovered
---

## Problem

The cycle-14 run (ec07634c) minted six roadmap items as rm-191..rm-196 at prioritize
time, verified against the then-live all-lineage ceiling (origin/main topped at
rm-190, open-PR surfaces topped lower). Between prioritize and implement, a parallel
run's integrate-merge (run 4e7c674, landing as main 6fd7d04 via the 8bbff5c6
integrate) **renumbered its own batch into rm-191..rm-196** — the exact ids this run
had allocated. Mint-time verification cannot prevent this: the ceiling is a moving
target whenever parallel runs are in flight, and a landing between two of your own
phases silently invalidates your allocation.

This was the fleet's third such race (d00d095's integrate renumber, then the
5b6e8e80 cycle's, now this one) — the failure mode is structural, not bad luck.

## Detection

At implement start (or any phase that stamps ids into durable artifacts), before
writing any id anywhere:

```bash
grep -n 'id: `rm-19[0-9]' ROADMAP.md          # your allocated block now owned by someone else?
git log --oneline <dispatch-frame>..origin/main  # what landed since your mint?
```

In this cycle the check surfaced only mid-implementation, after code comments in
five src files and two test describes already carried rm-191/rm-193/rm-194 stamps.

## Resolution — the in-lockstep renumber

Landed meanings win ids; in-flight claims renumber (the standing fleet convention).
The cure is mechanical but must be **atomic across every stamped surface**:

1. Re-mint above the *re-verified* ceiling (here rm-196 → rm-197..rm-202).
2. Update the ROADMAP item ids themselves.
3. Update **every** id stamp outside the ledger, found by range-grep not by memory:
   `grep -rn 'rm-19[1-6]' src/ test/ AGENTS.md` — code comments, test describe
   titles, doc cross-references.
4. Append a renumber note to the batch/prioritization doc so later phases citing
   the original ids resolve to the new ones.
5. Record the collision + the voided allocation in the ledger header comment —
   a future archaeologist seeing 'rm-191' in an old PhaseResult must be able to
   discover it was reallocated.

Gate after the renumber: zero references to the old range in code and tests, no
duplicate item ids in the ledger
(`grep -oE '^- id: `rm-[0-9]+' ROADMAP.md | sort | uniq -d` → empty).

## Adjacent traps from the same cycle

- **Phantom items from stale title associations**: the batch carried a B5 rider
  keyed to "rm-183 kill-switch re-read" — but rm-183's title had drifted (it is
  the rate-limit collapse warning) and no kill-switch read site exists in `src/`
  at the live frame. Accepting an item without verifying its read site still
  exists burns a batch slot; verify with a grep before planning around it.
- **Hollow prior phases**: the run's own roadmap phase recorded `succeeded` but
  materialized only its orientation step — its six items existed solely in its
  terminal PhaseResult text. The prioritize phase caught this by checking disk
  (breadcrumbs count, `git status`, ledger grep) before building on the claim.
  Narration is not materialization; verify prior-phase artifacts exist on disk.

## Prevention

- Treat id allocations as leases, not ownership. Re-verify the ceiling at every
  phase boundary that stamps ids, and expect to renumber.
- Never cite an id range from memory when a range-grep can enumerate the actual
  stamps.
- When a phase's summary and the tree disagree, the tree is the truth.
