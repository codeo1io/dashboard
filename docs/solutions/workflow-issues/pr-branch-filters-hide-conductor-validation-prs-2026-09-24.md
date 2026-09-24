---
title: 'PR branch filters scoped to main hide Conductor validation PRs — zero checks, ci validation times out'
date: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - Conductor ci validation (github_ci_validate.py, ephemeral-PR route) times out at the engine's 1800s budget with no error output
  - gh pr checks reports "no checks reported" for a draft PR whose head branch is conductor/ci-*
  - Draft Conductor CI validation PRs and conductor/ci branches pile up un-deleted on origin
---

## Problem

Since CI moved to GitHub-hosted runners (PR #11/#12, 2026-09-21), Conductor's
full-suite validation routes through `_prepare_validation_clone` in the engine's
`github_ci.py`: it pushes an ephemeral head branch `conductor/ci-<sha12>`, an
ephemeral base branch `conductor/ci-base-<sha12>`, opens a draft PR between
them, and polls `gh pr checks` until the checks go stable.

Every PR-triggered workflow in this repo (`main.yaml`, `codeql.yaml`,
`dependency-review.yaml`) carried `pull_request: branches: [main]` — inherited
from upstream's Main workflow (8b3c3df, PR #2). GitHub evaluates `branches`
filters against the PR's **base** ref. The ephemeral PR's base is
`conductor/ci-base-*`, not `main`, so none of those workflows ever fired:

- PRs whose delta touched `web/src/**` or `tests/visual/**` still triggered
  `visual` (paths-gated, no branch filter) — and a lone passing visual check
  makes the engine's poll declare success, i.e. the "validation" was vacuous:
  Lint / Check Types / Test / Check Workflows / Design Check never ran.
- PRs with docs-only deltas (this integration) reported **zero** checks, the
  poll never went stable, and the engine reaped the process at 1800s — leaving
  the draft PR and both branches behind because the cleanup `finally` never
  ran. 2026-09-23 left ~11 such PRs (#18–#41) and ~20 branches on origin.

## Fix

Admit the validation bases explicitly in the three workflows' pull_request
filters (2026-09-24, conflict case c98511ff, integrating run f4622d7e):

```yaml
on:
  pull_request:
    branches: [main, 'conductor/ci-base-**']
```

`push:` filters stay `[main]` — the ephemeral branch pushes themselves must not
double-run CI; only the PR event should. The glob restores the workflows' own
stated intent ("jobs for changes headed to main"): the ephemeral PRs gate
exactly pre-landing main content. Job timings make this safe: on
`ubuntu-latest` the whole suite registers in ~6 checks, slowest ~1m30s
(measured on PR #23), far inside the engine's 1800s budget.

## Validation

- `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color`
  — clean across all workflows.
- The next engine ci validation must show Lint/Check Types/Test/Check
  Workflows/Design Check (+CodeQL, Dependency Review) on the ephemeral PR
  instead of "no checks reported".
- First post-fix run confirmed the registration half (PR #44, run
  35938942882: all six checks fired) and then went red exactly once on
  `test/fork-exclusion-guard.test.ts` rm-131 — the engine's fresh
  re-merge for the validation clone had re-introduced the ours-side
  `.conductor/progress/70f231743fbd4e3a*.ndjson` (the standing trap:
  ours-added vs theirs-untouched survives auto-merge). Closed same day by
  conflict case 5fbda314 with `git rm --cached` + re-verify
  (`git ls-files .conductor` empty; guard file 17/17 locally).

## Residue

The stale draft PRs and `conductor/ci-*` / `conductor/ci-base-*` branches
orphaned by the 2026-09-23 timeout loop do not unblock by themselves (no new
PR event fires on them); close/delete them at the next landing gate:

    gh pr list -R codeo1io/dashboard --state open --json number,title \
      --jq '.[] | select(.title|startswith("Conductor CI validation")) | .number' \
      | xargs -r -n1 gh pr close -R codeo1io/dashboard
    git ls-remote --heads origin 'refs/heads/conductor/ci-*'
