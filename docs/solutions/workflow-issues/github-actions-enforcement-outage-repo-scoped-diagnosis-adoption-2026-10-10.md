---
title: "GitHub Actions repo-scoped run-creation enforcement outage: diagnose with cross-repo controls, do not churn refs, adopt byte-identical executions"
module: workflow-issues
tags: ['ci', 'actions', 'outage', 'conductor', 'validation']
problem_type: blocked-verification
---

# GitHub Actions repo-scoped run-creation enforcement outage: diagnose with cross-repo controls, do not churn refs, adopt byte-identical executions

Date: 2026-10-10 · Diagnosed in conductor run a794d381b4f0 (full_tests attempts
fc45565c-then-aaf184c6, dashboard repo); sibling repos showed the same state.

## Problem

`github_ci_validate.py` full-validation pushes an ephemeral branch, opens a
draft PR, and waits up to 3600s for checks. Under this outage NO run is ever
created: pushes and PR opens work fine, but `pull_request`-event runs stay at
zero forever, so the script burns the full hour and exits
`GitHub CI timed out without registering any PR checks`.

The failure is NOT what the settings say, and NOT the account:

- `GET /repos/<repo>/actions/permissions` reads healthy (`enabled: true`,
  allowlist intact, `sha_pinning_required: true` after a disable→re-enable
  cycle) — the flag is inert while the enforcement stands.
- `POST .../actions/workflows/<wf>/dispatches` returns HTTP 422
  `Actions has been disabled for this repository.` BEFORE and AFTER the
  re-enable cycle — re-enabling does not cure it.
- A control repo in the SAME account dispatches fine (agenttrace: rc=0, run
  created 2026-10-10T03:09:29Z) — the account is healthy.
- Sibling repos in the account die at scattered per-repo times (hermes-agent
  2026-10-09T01:53:02Z, dashboard 01:59:31Z, magic-hermes 14:09:15Z) —
  per-repo enforcement, consistent with automated abuse detection (plausibly
  the fleet's ephemeral-PR / `conductor/ci-*` ref churn), not an account-owner
  action and not a GitHub-wide incident.

## Diagnosis recipe (cheap — run before burning anything)

1. Run-list probe: `gh api 'repos/<repo>/actions/runs?per_page=5'` — newest run
   frozen (dashboard: 37872407109, created 2026-10-09T01:59:31Z) while pushes
   keep landing = no run creation.
2. Dispatch probe: expect HTTP 422 with the disable message.
3. Settings readback: `GET .../actions/permissions` — if it reads healthy while
   the probes 422, this enforcement state is in force; a disable→re-enable PUT
   cycle will not cure it (verified on both sides).
4. Cross-repo controls: dispatch one sibling repo in the account (expect the
   same 422) and one control repo (expect success). Control green = account
   healthy = repo-scoped enforcement; only owner-side action (GitHub
   support/appeal) can lift it.

## What NOT to do

- Do not burn the 3600s poll twice — the result is deterministic (verified:
  identical burn across attempts 6h apart).
- Do not fabricate check-runs via the Checks API to force `gh pr checks` green
  — evidence falsification; explicitly rejected by the supervisor.
- Do not churn more ephemeral PRs/refs while the enforcement stands — the churn
  is the plausible trigger; prefer adoption + the local mirror.
- Do not trust the settings flag as ground truth, and do not report
  "account-level disable" without a cross-repo control.

## Accepted completion route for full_tests

1. The dispatch full_command must be executed verbatim ONCE per the work order —
   or, when a predecessor attempt of THIS run already executed the exact
   command string on a diff-proven byte-identical script, adopt that execution
   as the verbatim execution (the 359B shim over
   `src/hermes_conductor/github_ci.py`: releases `b8feae94` and `e4f2ed66` are
   byte-identical, so the predecessor execution IS the dispatch string's
   execution — no re-burn needed).
2. Fresh probes both sides of the attempt (dispatch + run list) to prove the
   outage still stands.
3. Run the content-identical local mirror of the repo's own CI (see the
   2026-10-09 companion entries in this directory for the six-job recipe and
   the supervisor-authorization requirement).
4. Re-derive the dispatch digest with the pure hash utility over the restored
   tree and fold with the digest verbatim; restore pristine (porcelain 0).

## Recovery probe and deferral

Recovery signal: any run newer than the frozen newest (37872407109), or the
dispatch stops 422-ing. Defer the verbatim GitHub-runner confirmation (and the
sweep of stranded `conductor/ci-*` refs left by outage-era cleanup crashes) to
the first authorized push-gate turn after recovery.

## Evidence trail

- Diagnosis + burn: `delegate/fc45565cb3ff46ae8dec29aa322403b8-scratch/fulltests-ci-enforcement-diagnosis.md`
  and `/tmp/ft-fullcmd.log` (fleet spool, 2026-10-10).
- Adoption + mirror: `delegate/aaf184c6c12d4760aec46299b18e0e6c-scratch/fulltests-notes.md`
  (six-job mirror logs listed inside).
- Companion entries (2026-10-09): the probe-first + supervisor-authorized
  local-mirror recipes in this directory.
