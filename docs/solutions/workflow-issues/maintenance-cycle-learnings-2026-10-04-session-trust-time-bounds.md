---
module: dashboard
tags: ['maintenance-cycle', 'dead-wire-optional-deps', 'red-first-stash', 'workflow-timeouts', 'decision-of-record', 'ephemeral-ci', 'node26-local-web']
problem_type: workflow-issue
---

# Maintenance-cycle learnings — session trust and time bounds (2026-10-04, run d1850b2ea56e)

Reusable lessons from the 2026-10-04 repository-maintenance cycle (batch: B1
rm-600 VAPID stale-key wire + B2 rm-604 XFP Secure-cookie decision pins +
B3 rm-603 workflow timeout bounds + B4 rm-606 fixture fetch bound; full CI
green on ephemeral PR #369, snapshot 970e4738). Recorded pre-review, from
cycle evidence only.

## L1 — An optional dep supplied only by tests is production-dead

`ReconcileSweepDeps.getCurrentKeyVersion` (web/src/push/subscribe.ts:668,
consumed via optional chaining at :755) was exercised six-plus times by
`subscribe.test.ts` and ZERO times by production code — so the `stale_key`
branch of `classifyPushState` (reconcile.ts:66) was unreachable in production
while every suite stayed green. Same shape as the earlier
`mintRuntimeIdempotencyKey` wire. Prevention rule: for any injected seam
consumed via optional chaining, grep **production call sites** for the
supplier before treating the seam's behavior as live — a type declaration
plus test suppliers proves nothing about reachability. The cure was a wire,
not a parser: the supplier half already existed (vapid-key.ts's fail-closed
parser requires `keyVersion`), so B1 only connected it (30s-rate-limited
cache in Notifications.tsx, fail-open to undefined — unknown key version
classifies non-stale, matching the classifier's contract).

## L2 — Red-first via `git stash`, and a timeout IS the red

Proving new tests bind: `git stash push -- <implementation file>` then run
only the new suite, then `git stash pop`. B1: stash of Notifications.tsx →
exactly the 2 wiring pins failed (2/40) — the assertions bind to the wire,
not to each other. B4: stash of fixture-runtime-loader.ts → the abort test
HUNG to vitest's 30s test timeout — which is itself the positive control,
since the finding is an unbounded wait; for time-bound bugs the red may
manifest as duration, not assertion failure. Read the elapsed time, not just
the pass/fail glyph.

## L3 — Size `timeout-minutes` from observed Actions history, not guesses

For each workflow: `gh api /repos/<org>/<repo>/actions/workflows/<id>/runs?
per_page=30` → max of `completed_at - started_at` → cap at roughly 2-3x
observed max, with the sizing citation recorded as an in-file comment (this
cycle: codeql 20 / dependency-review 10 / scorecard 15 from observed maxima
565s/275s/474s). A workflow that has never run enabled (fro-bot:
`disabled_manually`, its own history dies in seconds at input validation)
is sized by explicit analogy (main.yaml's agent job) with that provenance
named in the comment. Validate with the actionlint container form; the
ephemeral validation PR then exercises the edits live (see L5).

## L4 — A decision-of-record is a legitimate maintenance deliverable

rm-604's adversarial finding reduced to a deployment-topology decision (trust
`X-Forwarded-Proto` for the Secure cookie flag or not). The chosen cure kept
behavior and made the decision auditable instead: rationale comments at BOTH
`setCookie` sites naming the rm-129 asymmetry (rate limiter treats XFF as
untrusted unless opted in), README deployment-requirement truth, and the
first-ever three-topology pins at both cookie sites (proxy+XFP, direct TLS,
plain HTTP). Pattern: for decision-first items, "document + pin the contract"
advances the item without prejudging the deployment owner's call.

## L5 — The ephemeral validation PR exercises workflow edits live

The full-validation snapshot is a temporary-index commit of the dirty tree —
the worktree is never mutated (porcelain verified identical pre/post), so an
uncommitted batch rides to full CI intact. Corollary: `.github/workflows`
edits in the batch RUN under themselves — this cycle's four new
`timeout-minutes` caps were enforced on the very CodeQL / Dependency Review /
Check Workflows jobs that validated them. Local actionlint is necessary;
the ephemeral PR is the authority.

## L6 — Node 26 local web runs need the localStorage recipe (pre-cure)

On Node 26.10 the four web suites of the rm-548 class fail locally while CI's
Node-24-pinned Test job passes (1m26s on PR #369) — an environment-local
red, not a regression. Until the dedicated cure lands, targeted web suites
run locally with `NODE_OPTIONS=--localstorage-file=/tmp/<file>` (recipe
recorded in the cycle batch doc). Recorded here so the next cycle's local
gates interpret the class correctly; not re-run in the compound phase.

## Next-cycle candidates (pre-review, from this cycle's evidence)

- rm-601 (union join single-key vs dual-key denylist) is decision-first:
  landed rm-255 pins the current skew behavior by test ("documented skew
  drift", test/aggregator.test.ts:650) — any fix must first overturn or
  refine that design record, not just edit the join.
- rm-602 (compression posture) stays decision-first: verify the production
  Caddyfile's encode posture via the infra checkout BEFORE any app-layer
  work; SSE streams must stay uncompressed either way.
- rm-605 and rm-599 have sibling claims (fefc4067 batch) — reconcile by
  content before planning; rm-605 edits the same file as that lane's B5.
- Sequence with the sibling web-storage cure (test-setup.ts localStorage
  rebind, landed-uncommitted) so the L6 recipe can retire.
- Dated signals riding the ledger: Node 26 LTS window 2026-10-28 (rm-139);
  TS 7 still peer-blocked by typescript-eslint <6.1.0 (rm-271 rider);
  any PWA decision re-verifies on vite-plugin-pwa 2.0.0, not 1.x assumptions
  (rm-138/rm-249 riders — built-artifact citations, never source greps).
- Fleet hygiene: ~10 stale `conductor/ci-*` branches and stale open
  validation PRs on origin from killed prior validations — janitor candidate.
