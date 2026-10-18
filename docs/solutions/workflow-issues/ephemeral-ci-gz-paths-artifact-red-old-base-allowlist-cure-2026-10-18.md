---
title: Ephemeral-CI gz-paths artifact-red at old bases — diagnose by local non-repro, cure via the trigger-only allowlist, adjudicate the retry race on live records
date: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - A full_tests dispatch (github_ci_validate) adjudicates a Test FAILURE on should-release path-filter parity at a worktree base that lags origin/main
  - The unknown path cited by the assertion (scripts/gzip-static-sidecars.ts) does not exist anywhere in the worktree tree
  - The validator's PR creation fails mid-run with 'GraphQL: Head repo was deleted' yet a green validation record may still exist
---

## Problem

Two failure shapes appear when running the ephemeral cloud-CI validator at a
worktree base behind current main:

1. `test/should-release.test.ts` > workflow path filter parity fails with
   `release.yaml on.push.paths entries unknown to the guard ... expected [
   'scripts/gzip-static-sidecars.ts' ] to deeply equal []` — even though the
   batch under validation touches neither `release.yaml`, nor
   `scripts/release-paths.ts`, nor the guard suite.
2. The validator can exit 1 on its first ephemeral-PR creation attempt
   (`GraphQL: Head repo was deleted` — racing its own prior-run cleanup) and
   still complete a green validation via an internal retry.

## Diagnosis (prove it before curing)

- Run the failing suite locally at the SAME tree. Green locally + red only in
  the ephemeral PR = injected-entry artifact, not a regression.
- Grep the base for the cited path in `.github/workflows/release.yaml`,
  `scripts/release-paths.ts`, and `scripts/should-release.ts`. Zero hits
  means the entry exists only in the validator-injected ephemeral tree.
- `git show origin/main:<file>`: main carries the corpus pairing (and the
  release.yaml entry) — the cure landed on main AFTER the worktree base, so
  the red is the old-base artifact class, not new breakage.

## Solution

Cure with a one-line conscious entry in `WORKFLOW_TRIGGER_ONLY_PATHS` in
`scripts/release-paths.ts` — the failing assertion's own blessed mechanism —
NOT the hard-release corpus. Reason: the suite's reverse assertion
(`HARD_RELEASE_FILE_PATHS` ⊆ workflow paths) goes red locally with a
corpus-only line at a base whose release.yaml lacks the entry, while the
trigger-only allowlist is excluded from that direction. Allowlist entries do
not change release behavior. At fold, main's landed shape (corpus pairing +
release.yaml entry) supersedes the line — the landing may drop it.

For the retry race: adjudicate on the validator's final `ok: true` JSON plus
live immutable records — PR state + head sha (`gh api pulls/<n>`), the commit
and its parent chain (`gh api commits/<sha>` — parent is the
'Conductor: ephemeral cloud-CI base' commit on CURRENT main; this validator
release rebases onto live main, so a green record is fold-ready proof), and
the Main run's per-job conclusions (`gh run view <id> --json`). Never trust
the shell exit code alone, and never trust it without the cross-checks.
Residue shape: a dangling OPEN PR whose head commit 422s (never resolvable) —
close-without-head-resolution sweep material, not a validation record.

## Verification

- Post-cure local: `npx vitest run test/should-release.test.ts` green
  (both parity directions), `tsc --noEmit` clean.
- Changing `scripts/release-paths.ts` is an executable-surface change:
  re-derive and declare the fresh digest via the engine's
  `validation_digest(base_sha, worktree)` before folding — the dispatch-time
  digest is stale by rule.
- Proven 2026-10-18, run a31293fd full_tests: run 1 red (artifact), cure,
  run 2 green (ephemeral PR 938, Main run 39094141720 success, Test success,
  9 checks SUCCESS/path-skip on current-main base cea35054).
