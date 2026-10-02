---
title: Guard test spawnSync `null` status conflated with a real exit code
date: 2026-10-02
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: low
applies_when:
  - 'A guard-suite test that spawns `scripts/should-release.ts` or `scripts/compute-release-tag.ts` fails with `expected 2 to be +0` (or `expected 1 ...`) on a valid-input case whose siblings passed in the same run'
  - 'The failure appears in a full-suite validation on the shared fleet host but never reproduces when the file is run alone'
  - 'The tree did not touch `scripts/`, `.github/workflows/release.yaml`, or `package.json`'
---

## Problem

The guard test harnesses spawned the guard script with `spawnSync` and mapped a
missing exit status straight onto a script exit code:

- `test/should-release.test.ts` — `exitCode: result.status ?? 2`
- `test/compute-release-tag.test.ts` — `exitCode: result.status ?? 1`

`spawnSync` reports `status: null` when the child **never ran to completion**:
fork failure (`EAGAIN`/`EMFILE`/`ENOMEM`), a signal kill (OOM), or the helper's
own timeout wall. None of those are decisions the script made. The mapping made
an infrastructure blip masquerade as a guard verdict:

- In `should-release`, a killed spawn rendered as the script's usage-error
  exit 2 — producing exactly `AssertionError: expected 2 to be +0` on
  `releases when bare src path is listed as changed` (conflict case
  643099884, 2026-10-02 full-suite validation), while every sibling spawn in
  the same file passed.
- In `compute-release-tag`, the `?? 1` variant is worse: an infrastructure
  failure could silently **pass** a test that expects a nonzero/skip exit.

The triggering context: this repository's validation runs on a shared fleet
host with hundreds of concurrent conductor worktrees and background builds;
the observed failure landed in a full-suite run fired immediately after a
`web/dist` rebuild, i.e. at a moment of peak contention.

## Diagnosis method (infrastructure signature, not a regression)

1. Re-run the exact child invocation by hand —
   `node scripts/should-release.ts --changed-files src --base-pkg x --head-pkg y`
   — it exits `0` with `release: hard-release path changed: src`.
2. Run the whole test file alone, several times, and once under deliberate CPU
   oversubscription (2x cores of busy-loops): 64/64 green each time.
3. Diff the tree under validation against both parents for everything the
   guard reads (`scripts/should-release.ts`, `scripts/release-paths.ts`,
   `.github/workflows/release.yaml`, `package.json`): untouched.
4. Signature: one isolated "wrong exit code" on a valid-input case, siblings
   green, non-deterministic, load-correlated → spawn-infrastructure failure,
   not a guard logic change.

## Solution

Both helpers now require a genuine exit status and treat `status === null` as
infrastructure, not verdict:

- one retry absorbs a transient host blip;
- a persistent null status **throws** with the spawn cause and signal, so the
  assertion failure names the real problem instead of fabricating an exit code.

No guard decision logic and no test expectation changed: every genuine script
exit (0/1/2) flows through exactly as before. This is the cycle-11
"sentinels that tell the truth" convention applied to the spawn boundary.
