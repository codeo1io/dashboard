---
title: should-release parity reds on the mixed validation tree when main's on.push.paths outruns the run base
date: '2026-10-18'
category: workflow-issues
module: ci
problem_type: release-gap
component: [release workflow, should-release guard, CI triggers]
severity: medium
applies_when:
  - A maintenance run based on an older main validates via github_ci_validate, whose ephemeral PR takes workflows wholesale from CURRENT origin/main and every other file from the run's base HEAD
  - test/should-release.test.ts reds on the validation PR with a path-parity diff naming a file the candidate never touched
  - git diff HEAD..origin/main on .github/workflows/release.yaml shows an on.push.paths entry the base lacks
tags: [ci, release, guard-drift, mixed-tree, validation, trigger-only-paths]
---

> **Provenance (2026-10-18, run 65d56bdd cycle:2 compound 4548917d):** authored
> from this run's full_tests `164f3320` evidence (ephemeral PR #945), with sibling
> corroboration from PR #941's identical Test failure. Extends the two-corpus
> lock story of `release-trigger-paths-guard-corpus-drift-2026-09-23.md` (rm-248
> lineage) — that doc binds the corpora to each other on ONE tree; this entry
> covers the failure mode where the validator deliberately pairs TWO epochs.

# Problem

`github_ci_validate` builds its ephemeral validation PR as a temp clone that
checks out the source worktree HEAD, replaces `.github/workflows/` WHOLESALE with
CURRENT origin/main, then applies the worktree diff with `git apply --3way`. The
validation tree therefore pairs current-main workflows with base-era everything
else. `test/should-release.test.ts` binds the release `on.push.paths` filter and
the `scripts/release-paths.ts` corpus file-exactly, in both directions. When
main's workflow gains a `paths` entry after the run's base — here
`scripts/gzip-static-sidecars.ts` (precompressed static sidecars, landed
post-base) — the workflow-side entry is unknown to the base-era corpus and the
parity test reds on the validation PR even though the candidate touched nothing
in the release surface. The red is by design of both mechanisms; the candidate is
innocent.

# Root cause

Two epochs deliberately paired on one tree: workflow-identity validation must
test CURRENT workflow shapes, while the corpus module rides the run base. Any
main-side corpus-relevant workflow addition between base and validation trips
the bidirectional lock.

# Solution

1. Diff first, never theorize: `git diff HEAD..origin/main --
   .github/workflows/release.yaml` — a one-path gain in `on.push.paths` naming
   an untouched file is this class, not a candidate defect.
2. Add the path to `WORKFLOW_TRIGGER_ONLY_PATHS` in `scripts/release-paths.ts`
   (the named, commented trigger-only-delegated list) — NOT to
   `HARD_RELEASE_FILE_PATHS`. Trigger-only keeps the base-era-workflow direction
   green locally (the base workflow filter lacks the path; a HARD entry would
   demand parity with a path that is not there), satisfies the mixed tree's
   workflow-side membership check, and folds clean at integrate where main's own
   corpus entry wins wholesale (the guard has no HARD/trigger-only disjointness
   leg). Say why in the list's comment block, dated, with the PR class named.
3. Pre-check the exact validation tree before re-running the gate: prepare the
   engine's validation clone (same construction the validator uses) and run the
   parity suite there, plus in the plain worktree — both green before spending a
   hosted gate run.

# Prevention rule

> Any run validating on a mixed workflows-from-main / files-from-base tree that
> sees a corpus-parity red naming an untouched path must diff the workflow
> against origin/main before touching candidate code. A main-side gain cures via
> the trigger-only list, never via a HARD entry from a base that lacks the file.
> Re-check `git fetch origin main` before every retest — main can advance again
> mid-run and re-trip the class with a new path.

# Detection commands

- Path-gain diff: `git diff HEAD..origin/main -- .github/workflows/release.yaml`
- Corpus parity (local tree): `node_modules/.bin/vitest run test/should-release.test.ts`
- Corpus parity (exact validation tree): prepare the validator's clone
  (engine-side `_prepare_validation_clone`) and run the same suite there
