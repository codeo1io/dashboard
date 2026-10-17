---
title: 'Dead-attempt dirt binds the dispatch stamp — the run closes on the tree the stamp describes'
date: 2026-10-10
category: 'workflow-issues'
module: 'validation'
component: 'conductor'
problem_type: 'process-trap'
severity: 'info'
---

# Maintenance-cycle learnings — dead-attempt dirt binds the dispatch stamp (2026-10-10, run 633717c23b19)

Authored at cycle:3 compound a2fe8d1b, from this run's first-hand full_tests
forensics (df99449a) and fold-source read.

## Problem

The full_tests attempt before df99449a (d4187996) was provider-reaped mid-turn.
It left NO typed artifact — its event log is heartbeats only — but it left the
worktree DIRTY with the batch applied and node_modules swept. The engine then
stamped the NEXT dispatch over that dirt, so the dispatch stamp equaled the
BATCH-APPLIED tree digest (`validation:v1:848264199d15…`), not the pristine one
(`validation:v1:bf89434e…`).

The trap: a later phase that "restores the worktree to pristine and closes
clean" now R5-REJECTS the mandated stamp as stale validation evidence — proven
first-hand as a negative control in this run's fold simulation (pristine close +
this stamp = guaranteed rejection). The stamp binds to the tree the engine saw
at dispatch, and the run must close on the tree the stamp describes.

## Solution

When inheriting a worktree dirtied by a dead attempt, do NOT reflexively restore
pristine. Forensics order (all cheap, all read-only):

1. Event log of the dead attempt — heartbeats-only with no typed artifact means
   it did no adoptable work, but says nothing about the tree.
2. `git status --porcelain` + `git rev-parse HEAD` — what dirt exists, at what
   base.
3. `git apply -R --check <spool patch>` — does the dirt reverse-apply cleanly
   against the batch's spool patch? If yes, the dirt IS the batch (nothing
   foreign to salvage or discard).
4. Derive BOTH candidate digests (pristine and patch-applied) with the fleet
   engine (`hermes_conductor.validation_policy.validation_digest`) and read
   which one the dispatch stamp names.
5. Read the fold source (R5 clause) before assuming what "close clean" means.

Then close on the tree the stamp describes — here, the carried batch — and
disclose the close state to every later phase.

Companion fact (why documentation phases are safe): `classify_surface` never
counts `ROADMAP.md` or `docs/` as validation surfaces (`NON_EXECUTABLE_PREFIXES`),
so roadmap riders and solution docs cannot move the stamp — but any post-stamp
edit to `src/`, `test*/`, `scripts/`, or `.github/workflows/` would, and must be
re-derived and disclosed.

## Evidence

- Dead attempt event log: heartbeats/reap only, typed artifact absent; dirt
  reverse-applied clean over `implement-633717c23b19-98d9cc18.patch` (md5
  `51731bc4fedc682acbaba2250dab4c87`).
- Digest pair at base 88e423a: pristine `bf89434e…`, batch-applied
  `848264199d15…` == the dispatch stamp; close digest re-derived == stamp, net
  authored executable delta 0.
- Fold simulation: ACCEPT on the carried-batch close; the pristine-tree negative
  control REJECTED (stale validation evidence).

## Notes

- Adjacent-but-disjoint prior docs: the reap-forensics family (2026-10-08)
  covers adoption decisions and zero-mint folds, not the stamp/close-tree
  binding; `fulltest-actions-platform-disable-local-dual-mirror-2026-10-09.md`
  covers the outage deviation method; `engine-validation-routing-full-tests-vs-targeted-2026-10-08.md`
  covers routing.
- rm-778 (compound #12's mint) already carries the fleet-wide guard: re-derive
  at dispatch and stamp both pristine and carried-batch digests.
- node_modules swept between attempts is the recurring companion symptom —
  `corepack pnpm install --frozen-lockfile` cures it in ~8s.
