---
module: dashboard
tags: ['maintenance-cycle', 'actions-disable', 'full-validation', 'local-mirror', 'ci-routing', 'outage-probe']
problem_type: workflow-issue
---

# Maintenance-cycle learnings — account-level Actions disable and the full-validation local mirror (2026-10-09, run 91776e2597524e52941b715cf26300aa)

The `full_tests` phase's authoritative command
(`hermes-conductor .../scripts/github_ci_validate.py --repo .`) routes full
validation to GitHub-hosted CI via an ephemeral validation PR. This doc records
what to do while that route is impossible, so the next cycle does not have to
re-derive it.

## Problem

Since 2026-10-09T01:59:31Z, GitHub Actions is disabled at ACCOUNT level on
codeo1io: every workflow dispatch returns HTTP 422 ("Actions has been disabled
for this repository") and zero new runs appear (newest run 37872407109, of
2026-10-09T01:59:31Z). The cure is account-owner-only (re-enable in account
settings); no repo-side change can lift it. Fleet scope: conductor issue
#17569, 20+ affected full_tests phases.

## Detection — probe before any routing decision

1. `gh api -X POST repos/codeo1io/dashboard/actions/workflows/main.yaml/dispatches -F ref=main`
   — while the outage holds this returns HTTP 422 with "Actions has been
   disabled"; a 204 means recovery.
2. `gh api 'repos/codeo1io/dashboard/actions/runs?created=>2026-10-09T02:00:00Z'`
   — `total_count` 0 while the outage holds.
3. Recovery signals (either one): the dispatch stops 422-ing, or any run newer
   than 37872407109 exists.

## Prevention rule

Never verbatim-run the full command during the outage: it creates the ephemeral
validation branch, waits out the full 3600s budget, then fails on check-dark
(no runs) — a deterministic budget burn that additionally strands
`conductor/ci-*` refs and leaves check-dark PRs to clean up (six from
2026-10-09 alone: #480, #482, #483, #485, #488, #494). Instead take the
fleet-established, supervisor-authorized deviation:

1. Ask the supervisor in the delegate session, citing fresh probe evidence
   (dispatch 422 + zero-new-runs + newest-run id + the rejected verbatim
   attempt if any). Approval has been granted per-session every time it was
   asked.
2. Run a LOCAL content-identical mirror of all six Main-workflow jobs:
   - Setup parity: `CI=true pnpm install --frozen-lockfile`
   - Lint: `TIMING=1 pnpm lint`
   - Design: `npx --yes impeccable@3.2.1 detect --json web/src web/privacy.html`
     (pin must match `.github/workflows/main.yaml`'s Design Check pin)
   - Types: `pnpm check-types`
   - Test: `pnpm test` (build the client first — `pretest` covers it via pnpm;
     direct `vitest run` does not)
   - Actionlint: container form `docker run --rm -v "$PWD:/repo" -w /repo
     rhysd/actionlint:1.7.12 -no-color` (container form per the 2026-09-19
     doc; assumes nothing from the host)
   - Strip-only import loop: node-import every non-test `src/**/*.ts` module
     (the native-TS server contract)
3. Record the deviation as a HIGH finding in the phase result (grounds +
   deferral), and re-derive the validation digest pre- and post-battery,
   requiring it equal to the dispatch-time digest.
4. Defer the verbatim GitHub-runner run to the first authorized push-gate turn
   after the recovery signals appear.

## Attribution

Discovered and first executed by run 91776e259752 cycle:1 full_tests
(2026-10-09, attempt 63fa82a9216b4bfbbb4656e875473816; local grant ~18:08Z;
all six mirrored jobs green, digest equal pre/post/dispatch). The recipe is
fleet-established — this doc makes it repo-local so the next cycle's full_tests
starts from it instead of the fleet failure corpus.
