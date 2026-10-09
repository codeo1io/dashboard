---
title: 'Actions account-level disable — detecting it and validating full suites via the approved local CI mirror'
date: '2026-10-09'
category: 'workflow-issues'
module: 'validation'
problem_type: 'process-trap'
component: 'ci'
severity: 'info'
---

## Problem

Since 2026-10-09T01:59:31Z this repository can create NO Actions runs. A
full_tests phase seeded with `github_ci_validate.py --repo .` executes the
ephemeral-PR route on this public repo (force-push a `conductor/ci-*` ref,
open a draft PR, poll its checks) — the PR opens fine and then registers
zero check-runs for the full 3600-second poll and fails with "GitHub CI
timed out without registering any PR checks". Twenty-plus sibling attempts
between 2026-10-09 03:00Z and 17:30Z reproduced this exactly, each leaving a
check-dark validation PR open for an hour (several are still open at
authoring time: #480, #482, #483, #485, #488, #494, #495, #496).

## Signal: account-level disable, not a repo setting

Distinguish the two cases before burning an hour:

- Repo-level disable would show `permissions.actions.enabled: false`; here
  `GET /repos/codeo1io/dashboard` permissions show actions enabled and
  `allowed_actions: all`.
- The decisive probe is a dispatch:
  `gh api -X POST /repos/codeo1io/dashboard/actions/workflows/main.yaml/dispatches -f ref=main`
  returns **HTTP 422 "Actions has been disabled for this repository"** even
  though the workflow and ref are valid.
- An idempotent `PUT` re-asserting the GET-visible permission state is
  accepted (rc=0) and changes nothing — the disable sits above the repo
  level (account policy/billing), so repo-admin tokens cannot cure it. Only
  the account owner can.
- Corroboration: `GET /repos/.../actions/runs?per_page=8` shows the newest
  run frozen at the outage boundary (37872407109, 2026-10-09T01:59:31Z) on
  every workflow, while sibling repos on other accounts complete runs.

The validator itself has no dry-run flag (only `--repo`, `--timeout`,
`--poll`) and no zero-check fast-fail in its wait loop, so under this
condition it is structurally guaranteed to burn the full poll and fail.
There is also a known cleanup defect on its timeout path: the finally-block
base-ref delete runs inside a validation clone that a shared-TMPDIR sweep
can delete mid-run, stranding `conductor/ci-*` refs — run it with
`TMPDIR=/tmp` when it is finally usable.

## Cure: the supervisor-approved local CI mirror

For full_tests phases only (targeted phases must NOT route to the remote
fallback), the approved alternative is to execute all six jobs of
`.github/workflows/main.yaml` content-identically on the workstation and
record the deviation as a high-severity finding plus a companion report.
Approval is requested per instance through the delegate session; this
happened first-hand for runs 155f9770, 3eea27cb, and 8cecf1d7 on 2026-10-09.

The six mirrors (all commands verbatim from main.yaml):

1. `TIMING=1 pnpm lint`
2. `findings=$(npx --yes impeccable@3.2.1 detect --json web/src web/privacy.html)` — must print `[]`
3. `pnpm check-types` — server + web + .opencode, three tsc passes
4. `pnpm test` — runs `pretest` (`pnpm build:web`) first, then the root
   Vitest suite and the web suite (`web/vitest.config.ts`)
5. `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color`
6. Strip-only import loop: `node -e "import('./src/<file>')"` over every
   non-test `src/**/*.ts`

Known environment deltas to record, not fix: workstation Node is v22
against CI's Node 24 (pnpm prints the engines advisory; all gates green),
and the mirror runs on the delegate host rather than ubuntu-24.04.

## Re-dispatch trigger and deferred work

- Recovery signal: a dispatch stops returning 422, OR any run newer than
  37872407109 exists. On the first signal, re-run the seeded
  `github_ci_validate.py --repo .` verbatim with `TMPDIR=/tmp` (expected
  ~5-10 minutes) to obtain the runner-side confirmation the mirror cannot
  provide.
- Residue to sweep at the same time: the open check-dark validation PRs and
  any stranded `conductor/ci-*` refs (two from 2026-09-29 predate the
  outage). Tracked as roadmap item rm-860 (blocked-external; numeral chain rm-850→rm-853 after a duplicate-mint collision with sibling lane 06c667d3, then rm-853→rm-860 after review 982c8393 found the fix turn's probe had missed sibling lane e5b718478274's live rm-853..856 band).
