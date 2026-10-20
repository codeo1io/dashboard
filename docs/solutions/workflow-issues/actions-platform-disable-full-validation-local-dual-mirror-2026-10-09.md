---
title: 'Actions platform disable — running the full_tests dispatch under github_ci_validate.py is structurally impossible; validate via supervisor-authorized local dual mirror'
date: '2026-10-09'
category: 'workflow-issues'
module: 'validation'
problem_type: 'process-trap'
component: 'ci'
severity: 'info'
---

## Problem

Since 2026-10-09T01:59:31Z the repository's GitHub Actions platform is disabled at an
account/org level: `gh api repos/codeo1io/dashboard/actions/permissions` still answers
`enabled:true/allowed:selected`, but `gh api 'repos/codeo1io/dashboard/actions/runs?created=2026-10-09T02:00:00Z..'`
returns `total_count=0` for hours, a `workflow_dispatch` POST returns HTTP 422
`Actions has been disabled for this repository`, and no scheduled fire registers.

The conductor engine's `full_tests` dispatch command is `github_ci_validate.py`, and under
this condition it cannot produce valid evidence:

- The script (engine release e4f2ed66) is an **ephemeral-PR-route ONLY** validator: it pushes
  `conductor/ci-base-<n>` + `conductor/ci-<n>` refs, opens a draft PR, polls check runs, and
  prints a JSON verdict. There is **no local-mirror fallback, no dry-run flag** (only
  `--repo/--timeout/--poll`).
- Pushing refs and opening PRs are **prohibited stages** in delegate phases — the verbatim
  command may only run at the phase whose action IS that gate.
- The script's clone applies the worktree's `git diff HEAD` (+ untracked copies). Under the
  house **carrier-patch** delivery shape (batch spooled as a patch, tree pristine), that diff
  is EMPTY — any run the script could possibly drive exercises the BASE tree, silently
  validating the wrong content. The patched-tree PASS it prints is therefore unobtainable
  twice over.
- With Actions disabled, the run times out at +60min with
  `GitHub CI timed out without registering any PR checks` and strands `conductor/ci-*` refs.

## Solution

Record the dispatch command byte-exact as the declared command, do NOT execute it, and
substitute a **supervisor-authorized 13th-instance local dual mirror** (fleet precedent:
runs 8cecf1d7, 633717c2, 6a2d5fbe, ba5f6d7d under the 2026-10-09/10 disable):

1. **Probe the outage first-hand** (both, timestamped): runs-since cutoff `total_count=0`
   and/or the dispatch 422. Never infer the disable from silence.
2. **Leg A (pristine control)**: a fresh clone at the base SHA; run the six Main-job
   equivalents (lint, impeccable design check, check-types, test incl. `pretest` web build,
   actionlint container-form, scripts-load) + the ledger census.
3. **Leg B (patched)**: apply the spool batch patch (`git apply`, verify the path list) and
   run the identical battery. The B-minus-A delta must be exactly the batch's authored test
   delta (new files counted, no unexplained drift).
4. **Digest continuity**: derive `validation_digest(base, worktree)` with the engine's own
   helper **before and after** the battery — both must equal the dispatch stamp byte-exact,
   proving the battery executed on the exact tree the evidence closes over.
5. **Fold simulation**: run the engine's `apply_validation_gates` (duck-typed) over the
   written validation JSON with the dispatch `full_command` byte-exact, `scope: full`,
   `covered_surfaces: ['*']` — expect ACCEPT — plus tamper probes (mutated digest, mutated
   outcome, empty evidence, stale base) expecting REJECT.
6. **Disclose**: the unrun dispatch command is ONE HIGH finding in the phase result; the
   JSON's `command` is what actually ran.

## Evidence

Run ba5f6d7ddd67 full_tests (attempt d6c23f92, 2026-10-10): outage probes 0-runs and
permissions GET quoted; leg A rc=0 six jobs (root 64 files/2474 tests, web 32/1203, census
245/0/778); leg B rc=0 six jobs (root 65/2482 = +8 batch tests, web 32/1203, census
246/0/831; `corepack pnpm install --frozen-lockfile` ran pnpm v11.28.5 proving the pin);
digest `validation:v1:e18b3a3a…` == dispatch stamp pre- and post-battery; fold-sim ACCEPT,
four tamper probes fired. Script truth read at e4f2ed66
(`scripts/github_ci_validate.py` + `src/hermes_conductor/github_ci.py`).

## Notes

- Watch-and-re-enable lives at ledger def rm-831 (probe recipe + Monday-fire banking);
  re-verify the platform is live (`total_count > 0` or a non-422 dispatch) before any
  lane re-routes to the verbatim command.
- Stranded `conductor/ci-*` refs and check-less PRs from timed-out runs are the standing
  residue — sweep tracked at rm-778.
- The mirror does not mint new authority: it only re-runs the suite the Main job would run,
  under the phase's existing scope, with the engine's own gate function adjudicating.
