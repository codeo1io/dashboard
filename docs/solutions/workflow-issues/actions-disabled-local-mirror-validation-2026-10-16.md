---
title: Actions hard-disabled for the repository — validate with the local six-job mirror, never the ephemeral-PR CI route
date: 2026-10-16
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - 'A full-suite validation phase needs CI but a workflow dispatch returns 422 Actions has been disabled for this repository.'
  - 'A freshly pushed validation PR reads no checks reported for 10+ minutes'
  - 'GET actions/permissions still reads enabled:true while no new run appears repo-wide'
tags:
  - github-actions
  - ci-validation
  - local-mirror
  - outage
---

# Actions hard-disabled — local six-job mirror validation recipe

## Problem

Cycle-3 full_tests (conductor run fcfde1ea38da, attempts 34ba7b5c then
276f110b) had to prove the Main workflow green. The seeded CI-validation
command's only execution mode is push + PR + CI — and this repository's
Actions were hard-disabled at the platform level: POST
`/actions/workflows/main.yaml/dispatches` returned 422 "Actions has been
disabled for this repository." while GET `/actions/permissions` still read
`enabled:true` and `gh workflow list` showed every workflow active.

The disable is invisible to the common probes — the permissions endpoint and
the workflow list both look healthy. The first attempt burned 11m20s polling
zero check-runs on ephemeral PR #728 and left remote debris (validation
branches + PR) that had to be cleaned up by hand.

## Detection (two-sided probe — run it FIRST, before any push)

1. `gh run list --repo codeo1io/dashboard --limit 3` — a newest run frozen
   well behind `pushed_at` means no lane will ever report, no matter what the
   PR page says.
2. `gh api -X POST repos/codeo1io/dashboard/actions/workflows/main.yaml/dispatches -f ref=main`
   — 422 "Actions has been disabled for this repository." is the hard-disable
   verdict; anything other than 204 means lanes are back.
3. `gh api repos/codeo1io/dashboard/actions/permissions` — reads `enabled:true`
   even while disabled; never use this endpoint as the liveness probe.

Never open a validation PR while probe 2 returns 422 — checks cannot start.

## Solution — the local six-job mirror

Run the six Main-workflow jobs verbatim with the CI pins (node 24.x, pnpm from
`packageManager`):

- Setup: `pnpm install --frozen-lockfile --prefer-offline`
- Design Check: `npx --yes impeccable@3.2.1 detect --json web/src web/privacy.html`
- Check Types: `pnpm check-types` (three tsc legs: root, web, .opencode)
- Lint: `pnpm lint`
- Test Scripts Load: a node-import loop over the 49 `src/` non-test modules
- Check Workflows: `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color`
- Test: `pnpm test` (pretest `build:web` + root and web vitest legs)

Battery outputs are gitignored (`node_modules`, `.eslintcache`, `web/dist`);
prove tree immutability by re-deriving the engine validation digest before and
after the battery. Green-run totals from 2026-10-16: root 59 files / 3067
tests + web 34 files / 1213 tests = 4280/4280, every static job RC=0. Durable
evidence lives in the campaign DB phase_results and the spool results JSON for
attempt 276f110b (battery logs under /tmp are swept — cite the JSON, not the
logs).

## Prevention rule

Treat "no checks reported" on a fresh validation PR as a disabled pipeline
until proven otherwise: poll `gh run list` (not the PR checks) and timebox the
poll. When Actions come back, expect a burst of queued scheduled fires, and
re-check `pushed_at` vs latest-run before trusting any green.

## Related

- ROADMAP rm-1411 — the out-of-band watchdog minted for exactly this outage
  class; its 2026-10-16 rider records the darkness-to-disable escalation.
- ROADMAP rm-289 — the in-repo red-watch (outage-gated by construction).
- `targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md` — the
  targeted-run half of the same pretest/build discipline.
- `docs/prioritization/2026-10-14-cycle-3-batch-run-fcfde1ea38da.md` — the
  cycle record whose validation this recipe carried.
