---
title: ephemeral full-validation runs the default branch's workflows — a base-stale release-paths.ts reds the rm-248 corpus-parity guard
date: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
tags: [ci, release, validation, corpus-parity]
applies_when:
  - Running the conductor's full validation (github_ci_validate.py / ephemeral PR mode) from a lineage whose base predates main-side .github/workflows or release-path changes
  - The Main workflow's Test job fails with AssertionError listing path entries as "unaccounted" or "unknown to the lineage"
  - origin/main has moved past the lineage base before a full-validation phase runs
---

## Problem

The conductor's full validation creates an **ephemeral draft PR whose workflow
files come from the repository's default branch**, not from the candidate
lineage. When `origin/main` has gained a `release.yaml` `on.push.paths` entry
after the lineage's base commit, the Test job's corpus-parity guard
(`test/should-release.test.ts`, ledger rm-248) compares main's *workflow*
against the lineage's *corpus* (`scripts/release-paths.ts`) and fails:

```
AssertionError: ['scripts/gzip-static-sidecars.ts'] unaccounted
```

Proven instance (2026-10-18, run 6b6520e9 full_tests): lineage base 64cd2f6a
predated main's rm-602-era `scripts/gzip-static-sidecars.ts` sidecar entry;
ephemeral Main run 39113809739 went 7/8 green with exactly this Test failure.

## Root cause

Two sources of truth drift apart: the trigger filter (`.github/workflows/
release.yaml` `on.push.paths`) is evaluated from the **default branch**, while
the corpus it must match (`scripts/release-paths.ts`) travels with the
**candidate lineage**. A base that predates a main-side addition fails the
equality check even though the candidate itself is coherent.

## Cure

Carry the missing entry into the lineage in the same fix landing, syncing BOTH
files with the default branch:

```bash
diff <(git show origin/main:.github/workflows/release.yaml) .github/workflows/release.yaml
diff <(git show origin/main:scripts/release-paths.ts) scripts/release-paths.ts
# both must be empty after the fix; then re-run the full validation command
```

In the proven instance the sync produced run 39114509328 fully green
(server 3614 passed/1 skipped + web 1656 passed) with no other change.

## Prevention

Before invoking full validation (or any ephemeral-PR validation), check whether
`origin/main` has moved past the lineage base; if it has, diff both files
against `origin/main` first. The check is cheap and deterministic:

```bash
git fetch origin
[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ] && \
  diff <(git show origin/main:scripts/release-paths.ts) scripts/release-paths.ts
```

## References

- Roadmap `rm-248` (corpus-parity guard; trap rider dated 2026-10-18) and
  `rm-602` (the gzip-sidecar entry that triggered the instance).
- Runs: 39113809739 (red) → 39114509328 (green); lineage base 64cd2f6a.
