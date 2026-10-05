---
title: "pnpm lockfile/override CONFIG_MISMATCH kills every frozen install — and in-tree pnpm silently regenerates the lockfile"
date: 2026-10-05
category: workflow-issues
module: dependency-management
problem_type: configuration-drift
component: [pnpm, pnpm-lock.yaml, pnpm-workspace.yaml]
severity: high
applies_when: "any 'pnpm install --frozen-lockfile' fails with ERR_PNPM_LOCKFILE_CONFIG_MISMATCH, or CI Setup dies ~1 min in across unrelated workflows"
tags: [pnpm, lockfile, overrides, frozen-lockfile, ci, maintenance]
---

## Symptoms

- `pnpm install --frozen-lockfile` aborts with
  `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH ... The current "overrides" configuration doesn't match the value found in the lockfile` — in CI Setup, in Docker builder stages, everywhere.
- Blast radius looks absurd: 4 of 5 push workflows red (Main, CodeQL, visual, Release) while Scorecard stays green — anything that installs dies; anything that doesn't, doesn't.
- `pnpm audit` still works and reads the OLD lockfile, so advisory counts look "fine" and misdirect the investigation.

## Problem

The committed `pnpm-lock.yaml` embeds a copy of the `overrides` block (plus importer
specifiers and resolved versions) that must agree with `pnpm-workspace.yaml`. When the
workspace floors are raised (e.g. security floors: fast-uri, brace-expansion, undici,
toml) without regenerating the lockfile, every frozen install trips the mismatch before
resolving a single package. On this fork the divergence class arrived twice via upstream
merges: an upstream `fro-bot[bot]` dep commit regenerates `pnpm-lock.yaml` against
UPSTREAM's old floors, and a merge that resolves the lockfile conflict upstream-ward
reverts the fork's security posture while keeping the raised floors — a split state
(2026-10-04 merge `1e1e2f5`, '# Conflicts: pnpm-lock.yaml').

The trap on top: running ANY pnpm script in the tree (`pnpm lint`, `pnpm check-types`)
first runs pnpm's implicit install preamble, which SILENTLY REGENERATES the broken
lockfile to the cured shape. The tree now holds a large unexplained `pnpm-lock.yaml`
diff that a careless `git add -A` would commit under the wrong change-unit — or that a
`git checkout -- pnpm-lock.yaml` discards harmlessly (the tracked blob was the broken
one; the regen is recoverable by re-deriving).

## Solution

Derive the cure OUT of tree, never in-tree:

1. `S=$(mktemp -d)`; copy ONLY `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` into it.
2. In `$S`: `pnpm install --lockfile-only` — regenerates against the raised floors,
   respecting `minimumReleaseAge`. Run it twice; the second run must be byte-identical
   (byte-stability check).
3. Acceptance in a SECOND clean dir (fresh `mktemp`): copy the three files with the NEW
   lockfile and run `pnpm install --frozen-lockfile` — rc=0 is the cure proof. Then
   `pnpm audit --recursive` (expect the floor-dominated advisories to close) and
   `grep` the new lockfile for ghost importers/removed deps (the broken blob can be
   stale in BOTH directions: this fork's carried a `wiki-writer` importer for a
   workspace member that no longer exists while MISSING `@playwright/test` and
   `@axe-core/playwright` that `package.json` declares).
4. Copy the derived file into the tree as its own change-unit (lockfile-only: if the
   floors are already on main, do NOT also touch `pnpm-workspace.yaml` — the workspace
   file is the acceptance oracle for the lockfile).
5. Restore discipline: if in-tree pnpm ever regenerated the lockfile incidentally,
   `git checkout -- pnpm-lock.yaml` and re-derive in the sandbox.

Armor: `.github/workflows/lockfile-guard.yaml` runs the exact failing command
(`pnpm install --frozen-lockfile --lockfile-only`, ~1 s, no node_modules) on
pull_request + push(main) — it turns this class red at merge time instead of at the
next install. The upstream-merge regression vector (an upstream dep commit resolving
the lockfile conflict upstream-ward) is what the guard is FOR: keep it in the
pull_request trigger set.

## Verification

- Clean-copy frozen install rc=0 on the derived lockfile (2026-10-05, run
  3570419605cb B1: 10.7 s install; blob 96db787f; second derivation byte-identical).
- `pnpm audit --recursive`: 17 → 0 on the same derivation.
- Guard self-test both polarities: rc=0 on the cured manifests, rc=1 with the exact
  `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` on the broken blob (2026-10-05).

## References

- `.github/workflows/lockfile-guard.yaml` (the merge-time armor)
- `docs/solutions/best-practices/trivy-base-image-alerts-unfixable-by-design-2026-08-30.md` (the sibling pattern: pinned-digest drift, not lockfile drift)
- `docs/solutions/workflow-issues/upstream-lockfile-content-merge-2026-09-20.md` (the upstream-merge lockfile-conflict class)
- ROADMAP.md `rm-282` (the wall, its blast radius, and the cure record) / `rm-276` (the floors) / `rm-669` (the image half)
