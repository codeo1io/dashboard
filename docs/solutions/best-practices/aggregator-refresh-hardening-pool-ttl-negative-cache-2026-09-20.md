---
title: Aggregator refresh hardening — bounded pool, 2x-interval TTL, negative cache, warm-empty preserve
date: 2026-09-20
category: best-practices
module: dashboard
problem_type: reliability_hardening
component: github_aggregator
severity: medium
applies_when:
  - Designing or tuning the monitoring aggregator's periodic refresh cycle (src/github/aggregator.ts)
  - Adding per-repo fan-out over installation tokens or any fixed-interval polling loop that queries an external API
  - Reviewing cache TTLs relative to their refresh interval, or fail-closed behavior when an enumeration step fails
---

## Problem

The cycle-3 assessment (run a7ca0303, frame 7de0de3) found four compounding weaknesses in
the aggregator's refresh cycle:

1. **Fully sequential fan-out.** `fetchRepoStatus` ran one repo at a time inside the cycle
   (`for ... await`), so cycle wall-clock scaled linearly with the installation count and a
   single slow repo stalled the whole cycle past its interval.
2. **TTL equal to the refresh interval.** `CACHE_TTL_MS` was 60s against a fixed 60s
   interval — the cache could never serve between refreshes, making it dead weight that
   only fired when a cycle overran, i.e. exactly when data was already stale.
3. **No negative caching.** A repo whose installation resolution failed was re-queried
   every cycle, so a dead install produced a permanent per-cycle retry hit on the GitHub
   API (and noisy `unresolved` churn).
4. **Silent metrics gaps.** Slow cycles, skipped ticks (the in-flight guard), and
   unresolved repos were invisible — no telemetry existed to notice that the cache was
   never bridging, cycles were serializing, or the unresolved set was growing.

## Solution

Implemented in the cycle-3 batch (rm-112 with rm-128 folded — one scope, since both touch
the same cycle body and would otherwise double the test churn):

- **Bounded worker pool** (`FETCH_CONCURRENCY = 6`) replaces the sequential loop: repos
  feed a work queue drained by fixed-width workers, so wall-clock scales with the slowest
  *batch lane*, not the repo count, while keeping request pressure bounded and
  scheduler-friendly.
- **TTL = 2× interval** (`CACHE_TTL_MS = 120_000` against the 60s tick). A cache that is
  supposed to bridge refresh jitter must outlive one interval; 2× bridges a single skipped
  or overrunning cycle without serving data older than the cycle that the fail-closed
  paths already tolerate.
- **Negative cache** (`NEGATIVE_CACHE_TTL_MS = 10min`) for failed installations: a dead
  install is remembered as unresolved instead of being retried every cycle. Deliberately
  much longer than the data TTL — the failure mode it caches (revoked/removed install) is
  slow to heal, and the cost of the retry is an API round-trip we know will fail.
- **Warm-empty preserve on enumeration failure.** If the repos.yaml enumeration fails but
  the snapshot has warm data, keep the last-good repo set and raise `staleBanner` instead
  of wiping to empty — this is the fail-closed invariant made visible: never an unfiltered
  or blank union when the allowlist source is unavailable.
- **Cycle telemetry**: `cycleMs`, `skippedCycles`, and `unresolvedCount` on the snapshot,
  plus slow-cycle and skipped-tick warnings. This is the evidence surface the wall-clock
  roadmap items (`rm-102`, `rm-104`) were missing — re-score them from production
  `cycleMs`, not from guesswork.

## Gotchas encountered (cost real debugging time)

- **Timer-compounding in tests.** TTL-sensitive tests that stub `now()` per
  `advanceTimersByTimeAsync` tick compound age across ticks — the pre-existing 70s-tick
  test survived the 60s→120s TTL change because its clock accumulates past 120k ms before
  the assertion. When porting such tests, recompute the *total* elapsed stub time, not the
  per-tick delta.
- **TypeScript control-flow narrowing through closures.** A `let releaseSlow: (() => void)
  | null` assigned inside a promise executor narrows to `never` at the later optional call
  site (`releaseSlow?.()` → TS2349). Re-widen explicitly (`const release = releaseSlow as
  (() => void) | null`) or type the resolver through a small helper.
- **Unfiltered gate logs.** A `tail -2` on a failing `check-types` run hid the only error
  line in a different file. Grep the full log for `error TS` (or run unfiltered) before
  calling a gate green.

## Verification

`test/aggregator.test.ts` (56/56 at the batch tree, +6 new): pool-cap serialization,
TTL bridge vs. expire, negative-cache retention, warm-empty preserve, skipped-tick
counting, unresolved counting. Full suite 3040/3040 green at 7de0de3 + batch
(check-types, lint, actionlint also exit 0).

## References

- Batch selection and outcome: docs/prioritization/2026-09-20-cycle-3-batch.md (B2 and its
  outcome addendum)
- Fail-closed / redaction invariant context: AGENTS.md "Redaction preservation"
- Related registry items: ROADMAP.md rm-112, rm-128
