# A wedged "in progress" main-branch run blocks full CI validation — cancel the zombie, do not blame the command

module: dashboard
tags: [ci, github-actions, validation]
problem_type: ci

## Problem

The conductor full-validation tool (`github_ci_validate.py`) refuses to start
while **any** main-branch workflow run reports `in_progress`:

```
refusing to run: current main run 37284642643 still in progress
(created 2026-09-28T11:46:01Z)
```

A scheduled run that wedged days earlier therefore blocks every later
full-validation invocation fleet-wide, and the refusal message points at a
5-day-old run id — easy to misread as a stale-cache artifact or a bug in the
command being run.

## Mechanism (probed first-hand 2026-10-03, run d0305cd7b819)

Run 37284642643 (canary workflow, `event=schedule`) reported `status:
in_progress`, `conclusion: null`, `run_attempt: 1`, `updated_at` frozen at
2026-09-28T11:47:49Z — and its single job sat `queued`, never started, for 5
days. The Actions API reports that state indefinitely; the validator's
"no in-progress main run" precondition never clears on its own. Its sibling
run 36417620616 (same `created_at`, the same schedule tick) recorded a
conclusion, which is why dashboard-level probes showed a quiet main branch
while the blocking run sat invisible in run-list tails.

## Diagnosis recipe

```bash
gh api repos/<owner>/<repo>/actions/runs/<run-id> \
  --jq '{name, event, status, conclusion, created_at, updated_at, run_attempt}'
# zombie signature: in_progress + conclusion null + updated_at days old
gh api repos/<owner>/<repo>/actions/runs/<run-id>/jobs \
  --jq '.jobs[] | {name, status, started_at}'
# zombie signature: job queued with no started_at
```

## Solution

Cancel the zombie — a no-code unblock:

```bash
gh api -X POST repos/<owner>/<repo>/actions/runs/<run-id>/cancel
# then: status=completed, conclusion=cancelled; re-run the identical
# validation command — it passes without any change to the command or repo
```

A run whose `updated_at` is hours old while claiming `in_progress` is not
progressing; cancelling it discards nothing (a queued job never executed).
Recorded cure: 2026-10-03, run 37284642643 cancelled, the identical
`github_ci_validate.py` invocation then passed (run 37285257781, all checks
SUCCESS).

## Prevention rules

- Before debugging a refused full-validation invocation, list **in-progress
  main runs first** (`gh api .../actions/runs?branch=main&status=in_progress`)
  and check `updated_at`; one wedged scheduled run is enough to block the
  whole fleet.
- When probing workflow health, enumerate runs by status, not by recency —
  a 5-day-old zombie does not surface in a newest-first page.
- Workflows that can wedge should carry an explicit `timeout-minutes` at the
  job level so the platform reaps them; the canary zombie's job sat queued
  past every timeout because queue time is not job time.

## References

- ROADMAP rm-280 rider (2026-10-03, canary-zombie incident) — the Monday
  zero-green time-box is the live acceptance for the canary family.
- Conductor run d0305cd7b819 full_tests attempt 35b456f6 (evidence:
  cancel-zombie.txt, full-run.log, full-run2.log in the attempt scratch).
