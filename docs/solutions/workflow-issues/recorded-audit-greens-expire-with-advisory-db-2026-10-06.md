---
module: dashboard
tags: [pnpm, audit, advisory-db-drift, security-floors, minimum-release-age, fold-gate]
problem_type: workflow-issue
---

# Recorded `pnpm audit` greens expire with the advisory DB — re-derive at every fold

**Date**: 2026-10-06 · **Runs**: 8b1672ef (full_tests 73c95090, compound
b0413212) · **Base**: 306a972.

## Problem

A green `pnpm audit` output is a fact about a (lockfile × advisory-DB) pair,
not about the lockfile. The advisory side keeps moving after the probe: a new
GHSA published against an already-resolved version retroactively reddens every
recorded green without touching the tree.

First live fleet instance (2026-10-06): two audit-0 records were made on
2026-10-05/06 (cfa9f94b implement `audit 17->0`; adoption run 8b1672ef implement
`No known vulnerabilities found`, rc=0). Within ~24h both were expired by
advisories already in the DB:

- `source-map-js` **GHSA-68fv-2mgg-jv7q** (HIGH, vuln `>=1.0.0 <1.2.2`, patched
  1.2.2 published 2026-09-30) — the batch lockfile resolves `source-map-js@1.2.1`
  (`pnpm-lock.yaml:3533`) via 16 dev-transitive paths (`@eslint/css-tree`,
  `@tailwindcss/*`, `vite > postcss`).
- `katex` **GHSA-238p-pmpm-9mq7** (LOW, vuln `>=0.11.0 <0.18.2`) — resolves
  `katex@0.16.47` (`:2830`) via `@bfra.me/eslint-config > @eslint/markdown >
  micromark-extension-math@3.1.0`, which declares `^0.16.0` (latest release —
  no `^0.18`-capable successor).

Nothing in CI could have caught the expiry at record time: `audit.yaml` is
schedule-only (Monday 03:37 UTC — the gate is the LAST detector, not the
first), `dependency-review.yaml` is PR-diff-only, and `minimumReleaseAge`
gates new resolutions, never already-resolved ones.

## Rule (prevention)

1. **Never gate a merge/fold on a recorded audit output.** Re-derive
   `pnpm audit -r` live at the merge gate; treat any green older than the last
   advisory-DB refresh as unproven.
2. **When the gate reddens mid-cycle, cure by FLOOR + regen, never by
   dismissing alerts** — alerts for transitive deps can never be fixed by
   dependabot security updates (they cannot move a resolution past a
   satisfying floor). The concrete cure for the 2026-10-06 instance: floors
   `source-map-js '>=1.2.2 <2.0.0'` + `katex '>=0.18.2 <0.19.0'` in
   `pnpm-workspace.yaml` + lockfile regen → resolves 1.2.2 / 0.18.10, audit
   rc=0, 38-line delta (both patched lines age-eligible under
   `minimumReleaseAge: 1440`). Recorded on ROADMAP rm-285's 2026-10-06 rider.
3. **A green ephemeral-CI validation does NOT cover this** — its PR check set
   excludes scheduled workflows (see
   `ephemeral-ci-validation-surface-excludes-scheduled-workflows-2026-10-06.md`).

## Evidence

- `pnpm-lock.yaml:3533` `source-map-js@1.2.1`, `:2830` `katex@0.16.47`,
  `:3106` `micromark-extension-math@3.1.0` (re-probed 2026-10-06).
- Fresh re-derivation rc=1 on the batch lockfile (run eb452afd,
  `/tmp/verify-eb45` sandbox; floor cure verified there).
- ROADMAP rm-278 rider 2026-10-06 (gate blind spot, mint-time analysis
  corroborated live); rm-285 rider 2026-10-06 (floors + regen acceptance).
