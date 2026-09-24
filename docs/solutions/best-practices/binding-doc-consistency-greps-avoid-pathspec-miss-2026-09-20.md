---
title: Binding-doc consistency greps must be repo-wide pattern greps, not bare-filename pathspecs
date: 2026-09-20
last_updated: 2026-09-25
category: best-practices
module: dashboard
problem_type: tooling_decision
component: development_workflow
severity: medium
applies_when:
  - Verifying that a claim (repo name, source path, documented behavior) is consistent across binding docs after a rename or correction
  - Any grep/git-grep residue sweep over AGENTS.md, README.md, or .github/ instruction files
---

## Context

The 2026-09-20 cycle-2 campaign fixed a stale metadata-source claim (`fro-bot/.github` →
`codeo1io/.github`) across four binding surfaces. A review phase verified the residue
sweep with `git grep 'fro-bot/.github' <rev> -- AGENTS.md README.md copilot-instructions.md
src/github/metadata.ts` and reported the copilot file **clean**. It was not: the actual
file is `.github/copilot-instructions.md`, and a bare-filename pathspec matches only at
the repository root — git silently returns nothing rather than erroring.

## Guidance

- Sweep binding docs with **repo-wide pattern greps** (`grep -rn '<claim>' AGENTS.md
  README.md .github/ src/ test/ docs/` or `git grep -n '<claim>'` with no pathspec), then
  read the hit list. Never list a file by bare filename unless it truly lives at the root.
- The dashboard's binding surfaces for a single claim can be four or more files across
  directories: `AGENTS.md`, `README.md`, `.github/copilot-instructions.md`, source doc
  comments (`src/github/metadata.ts`), and test narrations (`test/*.test.ts` titles and
  fixture strings).
- Distinguish semantics before "fixing" hits: `fro-bot/.github#3525` in
  `test/aggregator.test.ts` is an upstream **issue-tracker reference**, not a
  metadata-source claim — those stay.

## Why This Matters

A pathspec miss produces a confident wrong verdict ("clean") that propagates: the stale
claim survived a dedicated review phase and was only caught at implement time, one phase
from landing. Silent no-match behavior is the trap — git treats an unmatched pathspec as
an empty result set, indistinguishable from an actual clean sweep.

## When to Apply

Any residue or consistency verification over known file names in this repo — claim
renames, wiki-writer-style exclusion sweeps, binding-doc audits. The repo's own history
shows extension-less files (Dockerfile) hiding from extension-filtered greps too; bare
filenames are the same class of filter blind spot.

## Examples

```console
# WRONG — bare filename pathspec; matches only at repo root, silently empty
$ git grep -n 'fro-bot/.github' aa4ff9f -- copilot-instructions.md
(no output — reported CLEAN, actually stale at .github/copilot-instructions.md:17)

# RIGHT — path-aware pattern grep
$ grep -rn 'fro-bot/.github' AGENTS.md README.md .github/copilot-instructions.md src/ test/
test/aggregator.test.ts:1163:  // (tracked: fro-bot/.github#3525).   ← issue ref, keep
```

## Update 2026-09-25 — plural test trees hid a LIVE dependency (near-miss dead-dep removal)

The same filter class nearly shipped a wrong removal. A research-phase "is this
dependency dead?" check ran
`grep -rn 'axe-core|AxeBuilder' test/ web/` → zero hits, and `@axe-core/playwright`
was recorded as a dead devDep candidate for wire-or-drop. The repository has TWO
test roots: `test/` (server Vitest suites) and `tests/` (Playwright visual suite).
The unscoped re-check at implement time found
`tests/visual/dashboard.spec.ts` importing `@axe-core/playwright` and running an
accessibility scan on every visual page — dropping the dep would have broken the
CI visual gate. The dep was kept; no change was the correct change.

- Dead-dependency (or dead-export) determination must enumerate every source
  root or use no pathspec at all. In this repo that is `test/` AND `tests/`,
  plus `web/`, `public/`, `scripts/`, and `.github/workflows/` (workflow
  action-adjacent tooling).
- A zero-hit grep is only evidence if the scope provably contains every place
  a usage could live; otherwise prefer `grep -rn '<term>' .` with known-noise
  excludes over an enumerated allowlist of directories.
- Record the grep command verbatim when a finding says "zero usages" — the
  next phase must be able to reproduce or refute the scope, as happened here.
