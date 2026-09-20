---
title: Absorbing an upstream dependency bump needs a hand-merged lockfile, not a raw diff
date: 2026-09-20
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - Absorbing upstream drift (docker/base digests, dependency bumps) into the dashboard fork as a content-merge
  - Upstream's pnpm-lock.yaml diff does not apply cleanly onto our diverged lockfile
  - A merged lockfile passes visual inspection but pnpm install reports a missing entry for the OLD version
tags:
  - fork-maintenance
  - upstream-merge
  - pnpm
  - lockfile
  - frozen-lockfile
---

# Absorbing an upstream dependency bump needs a hand-merged lockfile, not a raw diff

## Problem

Cycle 2 absorbed upstream's hono 4.13.7 → 4.13.8 bump (upstream #488). The raw
`git diff merge-base..upstream -- pnpm-lock.yaml | git apply` failed outright
(`patch does not apply` at the diverged hunks — our lockfile had drifted from
upstream's base), and after an anchored hand-merge the install still failed with
`ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY: no entry for 'hono@4.13.7'`: one reference to
the old version remained that no upstream hunk covered.

## Symptoms

- `git apply --check` rejects the upstream lockfile patch
- `pnpm install --frozen-lockfile` after a hand-merge:
  `Broken lockfile: no entry for 'hono@4.13.7'`

## What Didn't Work

- Applying upstream's diff wholesale (context drift; our tree is not upstream's base)
- Editing only the obvious `packages:` entry — the old version string lives in several
  mirroring sections

## Solution

Hand-merge with anchors, then sweep for stragglers. A single version bump touches up
to five places in pnpm-lock.yaml v9:

1. `importers:` → the direct dependency's `version:` line under its `specifier:`
   (line ~40 for hono — the one upstream's hunks omitted on our base)
2. `importers:` → any dependent's resolved-pair suffix, e.g.
   `'@hono/node-server@2.1.1(hono@4.13.7)'`
3. `packages:` → the package key `hono@4.13.7:`
4. `snapshots:` → the snapshots key for the package
5. Peer-suffix mentions inside dependents' dependency maps

Then `grep -n '<old-version>' pnpm-lock.yaml` must return nothing, and
`pnpm install --frozen-lockfile` must exit 0 — that command is the only trustworthy
proof (visual inspection is not; the lockfile is internally cross-referential).

## Why This Works

pnpm-lock.yaml sections mirror each other: importers reference package keys, package
keys reference snapshots, peers are encoded as `(dep@version)` suffixes. A bump is
consistent only when every mirror moves together; `--frozen-lockfile` verifies the
cross-references exactly, which is why it — not the diff — is the gate.

## Prevention

- After ANY lockfile merge: `grep` for the old version string, then
  `pnpm install --frozen-lockfile` before claiming the absorb landed.
- Prefer bumping the whole dependency via the manifest spec and regenerating when the
  fork has no divergence conflict; hand-merge only when matching an exact upstream
  commit content is the goal.

## Related Issues

- `docs/solutions/workflow-issues/upstream-merge-exclude-workspace-package-2026-09-17.md`
  (fork-merge exclusions)
- ROADMAP.md item `rm-111` (upstream absorb batch, cycle 2)
- `docs/prioritization/2026-09-20-cycle-2-batch.md` (cycle-2 batch + addendum)
