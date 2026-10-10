---
title: 'Actions account-level disable leaves the ephemeral-PR CI route check-dark — probe before dispatching, then use the sanctioned local six-job mirror'
date: 2026-10-09
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - Full-suite validation dispatches an ephemeral validation PR and it sits with zero check-runs minutes after opening
  - gh api 'repos/codeo1io/dashboard/actions/runs?per_page=1' shows the newest run of any workflow is hours old
  - workflow_dispatch returns HTTP 422 with 'Actions has been disabled for this repository'
  - The repo-level actions/permissions GET still reports enabled true and allowed_actions all
---

# Actions account-level disable → ephemeral-PR CI route is check-dark; probe first, then the local six-job mirror

## Problem

Full-suite validation for this repository routes through an ephemeral-PR CI
validator: it pushes throwaway refs, opens a validation PR against main, and
polls the PR's check-runs until the CI matrix concludes. Since
2026-10-09T01:59:31Z that route is dark at the SOURCE: GitHub Actions
run-creation is disabled **at the account level** for this repository, so no
workflow — manual, PR, or scheduled — produces runs at all. The validation PR
opens fine (PR creation is not Actions), which makes the failure look like a
slow starter: the PR sits check-dark, the validator polls its whole budget
(3600s), then fails with `GitHub CI timed out without registering any PR
checks`. Each such ride strands litter: a closed check-dark PR (the
2026-10-09 outage left a chain of them, #477 through #493) and, when the
validator's error path runs its base-ref deletion from a working tree that a
shared tmp sweeper already removed, a stranded `conductor/ci-base-*` ref on
origin (the head ref deletes cleanly via the API route; the base ref push is
the one that crashes).

The account level is what makes this confusing: `GET /repos/.../actions/permissions`
keeps reporting `enabled: true` and `allowed_actions: all` the whole time, and
an idempotent PUT re-asserting that state is accepted without curing anything.
Recovery requires the account owner; no repository-side action helps. Sibling
repositories under other accounts kept running through the same window, and
githubstatus was green — both worth checking before concluding the blast
radius.

## Detection (probe BEFORE burning a validator budget)

1. `gh api 'repos/codeo1io/dashboard/actions/runs?per_page=1'` — if the newest
   run of ANY workflow is hours old, run-creation is dark; do not dispatch a
   polling validator on that evidence alone.
2. `gh api '/repos/codeo1io/dashboard/actions/runs?created=>2026-10-09T01:59:31Z'`
   → `total_count` 0 — confirms nothing has started since the disable moment.
3. `gh api -X POST /repos/codeo1io/dashboard/actions/workflows/main.yaml/dispatches -f ref=main`
   → HTTP 422 `Actions has been disabled for this repository` is the
   definitive account-level signature (a repo-level disable would answer 403
   and show in the permissions GET).

A check-dark validation PR in its first two or three minutes (zero
check-runs, zero runs created repo-wide) means abort early — not ride the
full budget hoping the queue drains.

## Solution (the sanctioned local six-job mirror)

When the outage is confirmed and a phase requires full-suite evidence, do not
re-run the dark route. Get the deviation approved by the supervising owner,
then execute all six `Main` workflow jobs content-identically from
`.github/workflows/main.yaml`, under the workflow's own `bash -Eeuo
pipefail` discipline, from a clean tree with `pnpm install --frozen-lockfile`
restored first:

| Job | Command (verbatim) |
| --- | --- |
| Lint | `TIMING=1 pnpm lint` |
| Design Check | `npx --yes impeccable@3.2.1 detect --json web/src web/privacy.html` — findings must equal an empty list |
| Check Types | `pnpm check-types` |
| Test | `pnpm test` (pretest runs `pnpm build:web`; direct vitest invocations bypass it) |
| Check Workflows | `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color` |
| Test Scripts Load | the workflow's while-loop `node -e "import(...)"` over `find src -name '*.ts' ! -name '*.test.ts' \| sort` |

Record the deviation prominently (a high-severity finding plus a report),
account for suite-count drift against the last recorded baseline before
declaring green, and verify the tree is byte-identical before and after the
battery (the mirror must be pure validation: `git status --porcelain`
unchanged). Host deltas versus the cloud runners — local Node 22 against the
pinned 24 — are advisory only (pnpm prints the engines warning; every gate
still passes).

Afterwards, defer the GitHub-runner confirmation to the first authorized
push-gate turn after recovery: re-dispatch the original validator verbatim
once `workflow_dispatch` stops 422-ing or any run newer than the disable
moment exists; expected pass is minutes, and the tree needs no changes. Sweep
the stranded `conductor/ci-*` refs in the same turn.

## Prevention rule

- Probe the three signals above before ANY dispatch that polls CI; never
  treat the permissions GET (`enabled: true`) as recovery evidence, and never
  treat an accepted permissions PUT as a cure — the disable sits above the
  repository.
- A validator timeout under this signature is an environmental failure, not a
  code regression: do not "fix" the tree to appease it. Consume the recorded
  outcome, pivot to the mirror above, and keep the verbatim command reserved
  for the recovery turn.
- Do not stack retries: every verbatim re-ride under the outage produces
  another check-dark PR twin and another stranded base ref with zero new
  information.

## Related

- `.github/workflows/main.yaml` — the six jobs mirrored above (pins:
  impeccable 3.2.1, actionlint 1.7.12 container form).
- `docs/solutions/workflow-issues/actionlint-pipx-missing-container-form-2026-09-19.md`
  — the container-form actionlint convention used by the mirror's
  Check Workflows job.
- `docs/solutions/workflow-issues/targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md`
  — why the mirror's Test job must go through `pnpm test` rather than direct
  vitest invocations.
- ROADMAP.md rm-835 rider (2026-10-09) — first full accounting of a
  mirror-validated cycle; PR #487 is the check-dark ride that motivated this
  doc.
