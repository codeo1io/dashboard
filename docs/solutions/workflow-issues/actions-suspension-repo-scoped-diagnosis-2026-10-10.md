---
title: GitHub Actions suspended for this repository only — 422 on dispatch while the permissions endpoint false-greens; how to prove the blast radius before routing validation
date: 2026-10-10
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: continuous_integration
severity: high
applies_when:
  - workflow_dispatch (or a push/PR trigger) creates no run and the API returns 422 "Actions has been disabled for this repository"
  - Validation PRs are check-dark while the actions/permissions endpoint still reports enabled:true
  - Deciding whether a validation command that routes to GitHub-hosted CI can pass at all
---

## Problem

Since 2026-10-09T01:59:31Z (last healthy run id 37872407109), GitHub Actions has been
suspended for `codeo1io/dashboard` by a mechanism ABOVE the repo-settings layer:

- `POST /repos/codeo1io/dashboard/actions/workflows/<id>/dispatches` → HTTP 422
  `"Actions has been disabled for this repository."`
- `GET /repos/.../actions/permissions` STILL reports `enabled: true` (false-green).
- An idempotent `PUT /repos/.../actions/permissions` (`-F enabled=true -F
  allowed_actions=selected`) is ACCEPTED (rc=0, settings and the selected-actions
  allowlist byte-identical after) and does NOT cure the 422 — the block is not stored
  where a repo-admin token can write it.
- Every trigger path is swallowed silently: pushes land, PRs open, but zero check-runs
  register. A validation script that polls for PR checks will burn its entire window
  (observed: full 3600 s poll, then `{"ok": false, "error": "GitHub CI timed out
  without registering any PR checks"}`).

## Differential diagnosis (do this before burning a validation window)

1. **Probe dispatch, not the settings endpoint.** `gh api -X POST
   .../actions/workflows/<id>/dispatches -F ref=main` — the 422 text is the ground
   truth; `GET actions/permissions` is not.
2. **Scope: repo vs account.** List the newest run on sibling repos of the same owner
   (`gh api repos/<owner>/<sibling>/actions/runs?per_page=1`). During this incident
   siblings on the same account ran Actions normally (agenttrace 19:21:25Z,
   hermes-infra 19:23:10Z on 2026-10-09) — proving the suspension is
   **repository-scoped, not account-level**. Fleet notes that predate this check say
   "account-level"; that reading is wrong and over-widens the blast-radius claim.
3. **Locate the boundary.** Walk PR head SHAs backwards and read
   `/commits/<sha>/check-runs`: here PR #457 (opened 01:59:28Z) still has the full
   10-check set green; PR #458 (02:41:42Z) and every later PR have zero. That is the
   outage boundary and the shape a healthy re-run must reproduce.
4. **Falsify the cheap causes.** Repo not archived and not flagged (anonymous GET
   returns 200), all workflows report `state: active`, branch protection untouched —
   none of those produce this signature.

## Cure

None from inside the repository: the setting a repo-admin token can write is already
correct. The cure is owner/platform-side (GitHub support or the account owner). Do not
loop on PUT/re-PUT cycles — acceptance without effect is part of the signature.

## Routing validation while suspended (fleet protocol)

Use the supervisor-authorized local CI-Main mirror instead of burning the GitHub-hosted
window — full recipe: `actions-account-disable-fulltests-local-mirror-2026-10-09.md`
(FLEET-EXTERNAL reference: a sibling conductor lane's artifact (run d8fdf8b7), NOT part
of this repository — if the named file is absent at read time, the essential six-job
mirror is: `pnpm install --frozen-lockfile`; `TIMING=1 pnpm lint`;
`npx --yes impeccable@3.2.1 detect --json web/src web/privacy.html`;
`pnpm check-types`; `pnpm test`; `docker run --rm -v "$PWD:/repo" -w /repo
rhysd/actionlint:1.7.12 -no-color`; plus a `node -e "import('./<file>')"` loop over
non-test `src/**/*.ts`.) Re-dispatch trigger to watch for: any run newer than 37872407109, or
dispatch no longer returning 422. Expect a normal ~5–10 min pass once Actions returns.

## Residue to clean after recovery

Check-dark PRs minted during the window (draft validation PRs and any sibling lane's),
plus stranded `conductor/ci-*` / `conductor/ci-base-*` refs on origin. The ref sweep is
tracked by rm-778; PR closure needs a push-gate turn.
