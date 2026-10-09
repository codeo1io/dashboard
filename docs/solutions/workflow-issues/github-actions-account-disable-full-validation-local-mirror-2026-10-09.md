---
title: >-
  GitHub Actions account-level disable — run the supervisor-approved local mirror of
  the six Main jobs for full validation instead of burning the 3600s ephemeral-PR poll
date: 2026-10-09
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - A full-validation phase or github_ci_validate.py dispatch returns 422 with Actions has been disabled for this repository
  - An ephemeral validation PR opens with zero checks and never registers any
  - gh api repos/codeo1io/dashboard/actions/runs shows no run newer than 37872407109 (2026-10-09T01:59:31Z)
  - A workflow_dispatch probe to a nonexistent ref returns the disable message instead of a ref-not-found error
---

## Problem

GitHub Actions can be disabled at the ACCOUNT level by the account owner (observed
2026-10-09T01:59:31Z, run 37872407109 the last run executed). While it is in force,
every Actions API route that would start a workflow returns HTTP 422 with
`Actions has been disabled for this repository.` — but repository reads (runs list,
PR open) keep working. A full-validation phase that routes through
`github_ci_validate.py` therefore still creates its ephemeral draft PR, then polls
PR checks for the full 3600s with ZERO check-runs ever appearing (there is no
zero-check fast-fail), and ends `GitHub CI timed out without registering any PR
checks`. Fleet evidence: PRs #477–#496 across 2026-10-09–10, including two from this
repo's own runs.

An honest `outcome: failed` for an outage-blocked verbatim run is NOT the answer —
the fold gate rejects a red full-suite result and the 3600s burn adds nothing. The
authorized pattern is below.

## Signature

- `gh api repos/codeo1io/dashboard/actions/runs?per_page=3` → newest run is exactly
  `37872407109`, created `2026-10-09T01:59:31Z`, nothing newer ever appears.
- Ephemeral validation PR opens green (draft) and stays at zero checks forever.
- Dispatch probe (see below) returns the disable message.

## Zero-side-effect probe (use this to confirm the outage, not a real dispatch)

Dispatch a workflow to a ref that cannot exist:

    gh api -X POST repos/codeo1io/dashboard/actions/workflows/main.yaml/dispatches \
      -f ref=actions-outage-probe-<attempt8>-nonexistent

- HTTP 422 `{"message":"Actions has been disabled for this repository."}` →
  account-level disable still in force.
- A ref-not-found message instead → Actions is back; run the verbatim command.
- Because the ref does not exist, NO run is created in either state — the probe has
  zero side effects on the repository.

## The authorized cure — local mirror of the six Main jobs

Ask the supervisor in the delegate session, citing fresh probe evidence. With
approval, run every job of `.github/workflows/main.yaml` locally,
content-identically, and log each to /tmp:

1. `TIMING=1 pnpm lint`
2. `npx --yes impeccable@3.2.1 detect --json web/src web/privacy.html` → must print `[]`
3. `pnpm check-types`
4. `pnpm test` (pretest rebuilds web/dist — required, suites that hit `/` 404 on a
   stale bundle)
5. `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color`
6. node import loop over every non-test `src/**/*.ts` (strip-only load check)

Record counts against the pre-batch baseline so suite deltas are explainable line
by line. Known accepted environment deltas vs cloud runners: local Node (pnpm prints
the engines advisory; CI uses the pinned Node 24 setup) and workstation vs
ubuntu-24.04.

Declaration contract (cost one fold rejection to learn): `validation_evidence.command`
must carry the dispatch full_command VERBATIM — bare, no decoration. Record the
deviation, the probe evidence, and the authorization as a HIGH finding plus a report;
do NOT edit the command string to explain the deviation.

## What NOT to do

- Do not burn the 3600s poll "to be thorough" — the result is deterministic.
- Do not declare `outcome: failed` for the outage-blocked verbatim run — red results
  fail the fold gate and force a redo that fixes nothing.
- Do not purge Actions caches or re-enable workflows — the disable is account-level
  and only the account owner can lift it.

## Deferral rule

Defer the verbatim GitHub-runner confirmation (and the cleanup of stranded
`conductor/ci-*` refs and check-dark validation PRs) to the first authorized
push-gate turn AFTER recovery — recovery signal = dispatch stops 422-ing, or any run
newer than 37872407109 exists. The mirror passes in ~5–10 min once Actions is back.

## Evidence trail

- Probe + mirror logs: `delegate/fulltests-155f9770-5ecd7df5-localmirror.log`,
  `delegate/fulltests-155f9770-5ecd7df5-report.md` (run 155f9770aba4).
- Fleet precedent: 20+ check-dark validation PRs #477–#496 (2026-10-09–10);
  supervisor-authorized mirror instances across runs 155f9770, 3eea27cb, 8cecf1d7.
