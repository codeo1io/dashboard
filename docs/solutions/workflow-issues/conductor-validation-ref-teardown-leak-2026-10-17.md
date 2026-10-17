---
title: 'Conductor CI validation ref teardown leak — detection and safe sweep'
date: 2026-10-17
category: workflow-issues
module: dashboard
component: ci-validation
problem_type: tooling_behavior
severity: low
applies_when:
  - 'A ls-remote census shows leaked conductor/ci-base-* or conductor/ci-* refs accumulating on origin, or a Conductor CI validation draft PR stays OPEN for days'
  - 'Planning a hygiene sweep of validation refs on a repo whose conductor fleet still mints them live'
  - 'The 2026-10-04 entry says teardown always runs and you need to reconcile that claim with observed leaked refs'
tags: [conductor, ephemeral-pr, ci-validation, ref-hygiene, teardown-leak]
related:
  - 'docs/solutions/workflow-issues/conductor-full-validation-ephemeral-pr-public-repo-2026-10-04.md (intended validator lifecycle this leak falsifies)'
  - 'run 43ca0b6277b0 pre-delete archive is an apply-time mechanism, not a frozen scratch path: re-materialize by fetching the delete-set refs from origin into a bare repo, then git bundle create --all + verify (first bundle 2026-10-17 sha256 40be1d8f…, 119 refs; re-materialized 2026-10-17T20:00Z sha256 8d673e84…, 122 refs)'
---

## Problem

The 2026-10-04 entry records teardown as "always runs" (close the PR, delete
both refs). Observed 2026-10-17 (surfaced by reviewing ephemeral validation
PR #694, which itself WAS properly torn down): that is only the happy path.
The validator's failure/kill exit paths leak both refs, and the fleet leaks
them continuously —

- Census 2026-10-17T04:17Z: 120 `ci-base-*` + 3 `ci-[0-9a-f]{12}` heads on
  origin; committer dates run 2026-10-09T23:16Z → 2026-10-16T15:22Z (roughly
  one leaked pair per failed validation).
- Two teardown-missed draft PRs (#521, #533) stayed OPEN ~7 days (7d5h58m and
  7d4h16m: #521 2026-10-10T01:18:57Z → 2026-10-17T07:16:24Z, #533
  2026-10-10T02:59:53Z → 2026-10-17T07:16:17Z), polluting the open-PR list next
  to live batch PRs.
- Happy path verified the same day: PR #855 ran the full cycle in 2m25s
  (refs + PR created 08:42:38Z, PR closed 08:45:03Z, both refs deleted) —
  the leak is failure-path-only, not systemic to every validation.

Epoch caveat: some ci-base refs carry non-UTC committer offsets (observed
-07:00). ISO-8601 strings are NOT sortable across offsets — convert to epoch
before applying any date cutoff.

## Solution — detection recipe + safe-sweep gates (run 43ca0b6277b0)

Detection: `git ls-remote origin 'refs/heads/conductor/*'` + count by class;
per-head PR state via `gh pr list --state all --head conductor/ci-<id>`.

Sweep gates, in execution order (a live fleet mints new refs at any moment,
so re-derive the set at apply time; derivations 08:45Z and 13:33Z produced
the identical 119-ref set, and the 2026-10-17T20:03Z re-derivation grew it
to 122 as the three then-fresh refs aged past the cutoff — by design):

1. Terminal PRs first: every ci-* head in the delete set must have a CLOSED
   or MERGED PR. (#521/#533 were merged into their own ci-base validation
   branches 2026-10-17T07:16Z — merging into the ephemeral base also
   terminates the PR and never touches main.)
2. Name-class filter only: `^ci-base-` or `^ci-<12 hex>`. `conductor/run-*`
   and `visual-capture-*` are landing-pipeline surfaces — never touched.
3. Age cutoff: commit committer date ≤ now − 12h (commit date ≈ ref
   creation; protects in-flight validations).
4. Live open-PR refs (BOTH headRefName and baseRefName) must have ZERO
   intersection with the delete set, re-checked at apply time. The gate must
   FAIL CLOSED on any gh failure (auth/rate-limit/network) — a masked error
   is a vacuous pass (verified live: bogus-repo probe exits 71, no mutation).
5. Archive before delete: fetch all ci refs into a bare repo, then
   `git bundle create --all` + `bundle verify` ("complete history") + record
   the sha256.
6. Delete per ref via `gh api -X DELETE .../git/refs/heads/conductor/<name>`;
   HTTP 422 (already gone) counts as success; abort on 5xx. Idempotent
   re-run resumes where it stopped.
7. Post-verify: (a) zero manifest refs remain on origin; (b) every remaining
   ci ref is fresher than the cutoff (in-flight ones are by-design); (c) no
   pre-existing run-*/visual-capture ref is missing afterward (additions are
   legitimate new fleet refs — only deletions are collateral).

Rollback: re-push refs from the apply-time archive bundle — if the bundle is
gone, re-materialize it the same way (every delete-set ref was still on
origin at the 2026-10-17T20:00Z re-derivation; only --apply deletes them);
`gh pr reopen` only AFTER the head ref exists again (reopen needs the head).

## Prevention

- Root cause lives in hermes-conductor (`github_ci_validate.py` teardown
  misses failure/kill exit paths) — a cross-repo fix, not fixable here.
- Keep the 2026-10-04 rule: never hand-delete mid-wait refs — the 12h cutoff
  encodes it.
- Re-census periodically while the validator gap stands. The leak paused
  08:43Z→13:31Z (0 new ci refs; 121 ci-base + 1 ci-head at the later
  census), but fleet cycles continue and failed validations add more.
