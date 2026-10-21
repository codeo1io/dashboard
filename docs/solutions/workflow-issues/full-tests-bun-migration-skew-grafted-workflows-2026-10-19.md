---
title: 'full_tests on a pre-Bun base fails exit 127 under the ephemeral-PR route (validator grafts origin/main workflows)'
date: '2026-10-19'
category: 'workflow-issue'
module: 'dashboard'
problem_type: 'workflow_issue'
component:
  - 'conductor/full_tests'
  - '.github/workflows/main.yaml'
severity: 'high'
applies_when:
  - 'full_tests dispatch while the run base predates a package-manager migration already landed on origin/main'
  - 'github_ci_validate.py ephemeral-PR route for a public repository'
---

# full_tests Bun-migration skew — grafted workflows break a pre-Bun base

## Problem

`full_tests` on this repository routes to the engine's ephemeral GitHub-hosted CI
validator (`github_ci_validate.py`). The validator creates a draft PR whose head
is the candidate commit and grafts **origin/main's entire `.github/workflows/`
tree** onto it (with `.github/actions/**` staying from the base). When origin/main
has migrated package managers (pnpm → bun, run 570a72421f5b era: main at
`3df545b3`+ ships `packageManager bun@1.4.3`, `bun run lint/check-types/test`,
`bun.lock`) while the run base predates the migration (base `655bfe50`:
`packageManager pnpm@11.28.5`, `pnpm-lock.yaml`, no `bun.lock`), the grafted
workflows execute in the wrong world:

- Lint / Check Types / Test jobs fail `bun: command not found` — exit 127, with
  `PNPM_HOME` on PATH and no bun binary for the pnpm-era action steps.
- Design Check fails exit 2 when the grafted pin (e.g. `impeccable@4.6.0`) fires
  a finding the base's UI never resolved (here: `flat-type-hierarchy` on
  `web/privacy.html`).

The local worktree is green (targeted suites, `check-types`, scoped eslint), so
the failure looks like a mystery regression — it is not one. Nothing in the
candidate delta causes it; the skew is between the candidate's base and the
grafted main workflows.

## Cure

Do not chase the red jobs individually. Make the candidate head live in main's
world, then re-run the full command:

1. Verify the delta is intact and disjoint from the migration: the batch's
   changed files must not appear in `git diff <base> origin/main`.
2. Absorb main's content onto the uncommitted candidate tree:
   `git checkout origin/main -- .` followed by
   `git rm -f <paths main deleted>` (the migration deletes pnpm-era files,
   e.g. `pnpm-lock.yaml`, `pnpm-workspace.yaml`) — HEAD must stay at the run
   base, no commits.
3. Reapply the batch delta verbatim (`git apply <spool patch>` captured before
   the absorb).
4. Re-run the validator's `full_command` unchanged. Post-state check:
   `git diff origin/main --stat` == exactly the batch delta; `git status`
   shows the absorbed files as modifications riding uncommitted.

Proof from run `570a72421f5b` cycle:2: attempt `138e3713` exit 1
("GitHub CI failed: Check Types FAILURE, Design Check FAILURE, …", ephemeral
PR #1038, `bun: command not found` in three job logs) → attempt `958ec93f`
after the absorb: exit 0, `ok: true`, 8/8 checks green on ephemeral PR #1041
(commit `c624c8fb`, base `3df545b3`, Main run 39286670404), closed with zero
`conductor/ci-*` ref residue.

## Notes

- The fold gate rejects a `full_tests` phase_result that reports `failed` — the
  regression must actually be cured before filing, so the absorb is the path,
  not a failure report.
- After the absorb, the worktree's package world is main's: use `bun install` /
  `bun run` conventions (AGENTS.md post-migration) — the historical
  `node_modules`-sweep cure for pnpm worktrees becomes a `bun install` cure.
- The riding absorbed content lands with the batch: the landing merge carries
  main@absorb plus the batch delta, closing the absorb window by construction
  for that cycle. Re-baseline the roadmap census on the post-landing main.
- Design-Check-only failures under this route deserve one extra look before
  absorbing: confirm locally (`npx --yes impeccable@<grafted pin> detect --json
  web/src web/privacy.html`) whether the finding exists on the base or was
  introduced by the candidate — same class either way once main's pin is what
  CI runs.
