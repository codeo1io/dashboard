---
title: Excluding an upstream workspace member from a fork merge needs more than git rm
date: 2026-09-17
category: workflow-issues
module: dashboard
problem_type: fork_maintenance
component: development_workflow
severity: medium
applies_when:
  - Merging upstream into the dashboard fork and excluding an upstream directory on principle (e.g. wiki-writer per invariant #1)
  - The excluded directory is a pnpm workspace member that other root files reference (workspace yaml importers, lockfile, test config, docs)
  - A future merge must re-apply the same exclusion cleanly
tags:
  - fork-maintenance
  - merge
  - pnpm
  - lockfile
  - wiki-writer
  - invariant
---

## Problem

Upstream (`fro-bot/dashboard`) added `wiki-writer/` as a pnpm workspace member — a
flag-gated GitHub WRITE path. This fork's AGENTS.md invariant #1 ("Never add a write
code path") forbids adopting it, but the fork still wants the other ~124 commits of
drift (dep bumps, arctic removal #401, CI updates). `git rm -r wiki-writer/` inside
the merge commit removes the directory but leaves four non-obvious residue sites that
each fail a different gate:

1. `pnpm-workspace.yaml` still lists the `wiki-writer` importer → pnpm workspace
   validation errors.
2. `pnpm-lock.yaml` keeps the importer block AND the `wiki-write-core` package entries
   (a `github:` dependency) → `pnpm install` tries to resolve a remote the fork never
   pinned; frozen installs fail.
3. Root `vitest.config.ts` still globs `wiki-writer/test/**` → vitest collects test
   files that no longer exist / are unresolvable.
4. `package.json` description + `README.md`/`AGENTS.md` wording may reference the
   capability → docs contradict the fork's stated invariants.

## Symptom shape

Failures appear far from the `git rm`: install-time (workspace/lockfile), test-collect
time (empty include), and only last as a docs inconsistency. `git status` looks clean
after the rm, which is misleading.

## Solution

Inside the SAME merge commit (before finalizing):

1. `git rm -r wiki-writer/` — directory first.
2. Remove the importer entry from `pnpm-workspace.yaml`.
3. Excise the importer block and every `wiki-write-core` package block from
   `pnpm-lock.yaml` (a small script beats hand-editing; blocks are keyed and
   contiguous).
4. Remove the `wiki-writer/test/**` glob from the root `vitest.config.ts` include.
5. Revert capability wording in `package.json` (description), `README.md`, and
   `AGENTS.md` — but keep unrelated upstream doc improvements (diff hunks, not whole
   files).
6. Prove consistency: `pnpm install --frozen-lockfile` MUST succeed. This single
   command validates steps 2–3 together.
7. `grep -rn "wiki-writer" --include="*.ts" --include="*.json" --include="*.yaml"`
   (excluding `node_modules`, `.conductor`) must return nothing.

## Prevention rule

Upstream will keep editing the excluded directory: expect recurring **delete/modify
conflicts** on every future merge touching `wiki-writer/` — resolve identically
(keep the fork's deletion). Also re-check upstream's `AGENTS.md` invariant #1 wording
each merge: upstream rewrote it to admit "one isolated wiki-write capability", and
merging their file verbatim silently weakens this fork's charter — restore the fork's
strict wording while keeping their operational additions.

## Evidence (cycle 1, 2026-09-17)

- `pnpm install --frozen-lockfile` → "Done in 49.2s using pnpm v11.27.0" after excision.
- Post-state greps: zero `wiki-writer` refs outside `.conductor/`; zero in lockfile.
- Full gates green at the merged tree: check-types, lint, 1997 server + 1020 web tests.
