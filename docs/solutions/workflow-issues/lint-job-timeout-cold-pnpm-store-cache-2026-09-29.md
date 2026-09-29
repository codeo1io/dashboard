---
module: ci
tags: ['ci', 'workflow', 'lint', 'caching', 'timeouts', 'diagnosis']
problem_type: false-cancellation
---

# Lint job self-cancels at exactly timeout-minutes when the lockfile changes

## Problem

Full-validation ephemeral PRs failed twice in a row (2026-09-29, runs on
`conductor/ci-da9b5d528454` and `conductor/ci-4f3941bdece0`) with the same
signature: every check green except **Lint**, whose GitHub conclusion was
`cancelled` at **20m16s** and **20m19s** — matching the lint job's
`timeout-minutes: 20` to the second. All setup steps (checkout, pnpm install,
cache restore) were green; the job died *inside* the lint step.

The trigger was a batch that changed `pnpm-lock.yaml` (advisory floor bumps).
The shared `./.github/actions/setup` composite keys its pnpm-store cache on
`hashFiles('pnpm-lock.yaml')`, so any lockfile change busts the store cache on
every runner: cold install + cold eslint on the shared self-hosted runners
exceeds 20 minutes, and the job self-cancels. A timeout reads as "cancelled",
not "failure", so the validator reports `9 pass / 1 cancel` — easy to
misdiagnose as runner contention or cross-session interference (three
concurrent `conductor/ci-*` validations were in flight at the same moment,
muddying the picture).

## Diagnosis

- A job that cancels at *exactly* `timeout-minutes` (± a few seconds) with all
  setup steps green is a timeout, not interference: contention cancels at
  arbitrary timestamps, timeouts at the deadline.
- Cross-check a sibling ephemeral PR whose batch did NOT touch the lockfile —
  its Lint stays fast because the store cache still hits.
- `gh run view <id> --json jobs` shows per-job `startedAt`/`completedAt`;
  subtract to confirm the deadline hit.

## Solution

Bumped the lint job in `.github/workflows/main.yaml` from
`timeout-minutes: 20` to `timeout-minutes: 35`, with an inline comment citing
the mechanism (the Test job's existing `timeout-minutes: 40` was precedent for
headroom on long jobs). Post-fix ephemeral PR `conductor/ci-be592eb8d168`
completed its Main workflow in 17m44s and the full validation went 10/10
green (PR #254, `conductor/ci-579e5a473312`).

## Prevention

- Any batch that lands `pnpm-lock.yaml` changes should expect a cold store on
  the first CI run afterward — budget lint-job headroom accordingly (or warm
  the cache with a trivial re-run before validating the real change).
- When a validation reports `cancelled` rather than `failed`, check the
  cancelled job's elapsed time against its own `timeout-minutes` before
  blaming concurrency.
- Job `timeout-minutes` values are per-job, not global: the lint job needed
  its own headroom even though Test already had 40.
