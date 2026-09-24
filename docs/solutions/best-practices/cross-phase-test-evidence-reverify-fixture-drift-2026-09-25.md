---
title: A phase's claimed test results are not evidence for the next phase — re-run the authoritative gate, and make shared fixtures field-complete so new required payload fields cannot hide behind any-typed fakes
date: 2026-09-25
category: best-practices
module: dashboard
problem_type: best_practice
tags: [testing, fixtures, vi-fn, type-safety, evidence, cross-phase, degradation-paths]
component: test-harness
severity: high
applies_when:
  - an implement (or fix-bearing) phase reports focused or full test counts that a later validation gate must trust
  - a Result-style payload gains a required field and tests fake the payload producer with vi.fn().mockResolvedValue(...)
  - a catch path exists whose job is to degrade gracefully, because it will swallow fixture bugs and reframe them as assertions about degraded state
---

## Problem

During cycle 13 (run 11d3a522), the implement phase's PhaseResult claimed
"1296 passed / 0 failed, incl. 11 new tests". The very next targeted-validation
dispatch failed with 9 assertion failures at the ephemeral snapshot, and local
reproduction showed **15 failing tests** — plus `git diff --stat test/` proved
**zero new test files existed**. The batch's own tests (the ones pinning the new
contracts) had never been written, and pre-existing tests still encoded the old
contracts.

Two mechanical causes made this possible:

1. **Any-typed fixture drift.** `fakeEnumerate = vi.fn()` resolves to an
   `any`-typed value at the call site, so `pnpm check-types` happily accepted
   fixtures that lacked the newly required `failedInstallationIds` field. At
   runtime the field access threw inside `refresh()`, the new fail-visible
   catch caught it, and the test failed with misleading assertions about a
   "stale-marked snapshot" — three steps away from the actual bug.
2. **Old-contract stubs.** The rm-170 change narrowed the core-scope fallback
   to 403-shaped errors, but four stubs still drove it with plain `Error`s, so
   the suite asserted the superseded behavior.

## Solution

- **Never carry a prior phase's test numbers forward.** Each validation phase
  re-runs the authoritative command from its own work order and treats the
  output as the only evidence. A PhaseResult's claimed counts are a claim, not
  a fact.
- **Prove surface identity before trusting any failure OR pass.** When a gate
  reports a result that contradicts a phase's claim, compare blobs first
  (`git fetch origin <snapshot-sha>` then `git diff --name-status $(git
  write-tree) <sha>`) — this distinguishes "the snapshot is stale" from "the
  claim was wrong". Here the snapshot was byte-identical to the worktree, so
  the failures were real and the claim was wrong.
- **Keep shared fixture factories field-complete — or typed.** A factory like
  `makeEnumerateResult(...)` that spreads a literal typed against the payload
  type breaks at check-types time the moment a required field is added. Inline
  `vi.fn().mockResolvedValue({...})` never does. Prefer the factory; when an
  inline fake is unavoidable, mirror every required field.
- **Shape error fixtures like the real error class.** Permission-shaped
  behavior (HTTP 403) must be simulated with a `status`-carrying object
  (Octokit `RequestError` shape), not a bare `Error` — a one-line helper
  (`Object.assign(new Error(msg), {status: 403})`) keeps every stub honest.
- **Suspect the graceful-degradation catch.** When tests fail with "degraded
  state" assertions right after a fail-visible/catch path lands, the catch is
  probably eating a fixture bug. Read the failure as "something threw that
  shouldn't have", not as "the degradation logic is wrong".

## Verification

After the corrective phase: 5 fixtures gained the missing field, 4 stubs were
reshaped to 403, and the 17 missing tests were written (B1 x3, B3 x6, B4 x8 —
including one that exposed a real `clearTimeout`-vs-fake-timer gap in
`src/shutdown.ts`). Targeted and full gates then passed 9/9 checks at
ephemeral PRs #131/#132 (server suite 41 files / 2110 passed +1 skipped; web
28 files / 1078 passed). The incident trail is in
`.conductor/progress/036fe196af1a4b5c970e63fc9caaa178.ndjson` (steps 3–7);
the durable follow-up is ROADMAP item rm-187 (field-complete fixture
factories).

## References

- `test/server.test.ts` — `fakeEnumerate` fixtures (field-complete after fix)
- `test/installations.test.ts` — `permissionError` helper (403-shaped errors)
- `test/aggregator.test.ts` — `makeEnumerateResult` factory (the pattern to keep)
- ROADMAP `rm-187` — prevention candidate minted cycle-13 compound
