---
title: "Raw ok-shape test fakes drift silently when a Result contract grows — type them or fail loudly"
date: 2026-09-24
category: best-practices
module: dashboard
problem_type: test_gap
component: testing
symptoms:
  - "After adding a field to a `Result`-shaped return type (e.g. `EnumerateReposResult.failedInstallationIds`), tests that never touch the new field start failing with TypeError on an unrelated property (`... .length of undefined`)"
  - "check-types stays clean — the fakes are untyped object literals, so contract growth is invisible to the compiler in test files"
  - "Failures cluster in a test file your manual focused set did not include; an impacted-test runner over changed surfaces finds them"
root_cause: untyped_test_double
resolution_type: test_fix
severity: medium
tags:
  - test-fakes
  - result-type
  - contract-drift
  - check-types-blind-spot
  - impacted-test-runner
---

## Problem

`src/server.ts` accepts an `enumerateFn` dependency typed as
`typeof enumerateRepos`, but `test/server.test.ts` faked it with raw
`{ success: true, data: { repos, installations } }` literals. When the
cycle-11 batch (rm-172) added `failedInstallationIds` to
`EnumererateReposResult`, production code (`runRefresh` reading
`.failedInstallationIds.length`) threw on the fakes. The implement phase's
manual focused test set did not include `test/server.test.ts`, so the drift
first surfaced in the engine's impacted-test run: 5 red tests, all
`expect(refreshedAt).not.toBeNull()` — the production code was correct, the
fakes were stale.

Two compounding traps:

1. **check-types cannot catch it.** Object literals in untyped fake positions
   satisfy no structural check against the real return type; the compiler never
   compares them.
2. **The failure looks like a production bug.** The new (intended) behavior —
   snapshot marked stale when refresh throws — fired exactly as designed, so
   the fakes' snapshots came back degraded.

## Fix / rule

- When a production contract grows, every hand-rolled fake of that contract
  must be updated in the same change. Grep for the fake shape, not the field:
  `grep -n "data: {repos" test/` finds the ok-shaped literals fast.
- Prefer building fakes through the real `ok()`/`err()` helpers (or annotate
  the fake as the real type: `const fake: typeof enumerateRepos = ...`) so
  check-types fails at the seam instead of the runtime suite failing later.
- Trust the impacted-test runner's closure over a hand-picked focused set: it
  selected 13 files including `server.test.ts`, which the manual set of 8
  missed.

## Related trap (same file, same cycle)

The module-level installation-token cache (`src/github/installations.ts`)
is keyed by installation id and persists across tests, so reusing an id
across tests silently bypasses mint mocks — new installation-mock tests must
use fresh installation ids or they assert against cached tokens.

## Evidence (2026-09-24, conductor run b4aac9ba targeted_tests)

- Run 1 (engine targeted command over the 4 changed surfaces): 697/702 —
  5 failures in `test/server.test.ts`.
- Fix: `failedInstallationIds: []` added at the 5 fake sites
  (lines 108/175/222/267/308 post-edit). Run 2: 702/702.
- Full validation afterwards: cloud ephemeral PR #70, 3126/3126.
