---
module: dashboard
tags: ['maintenance-cycle', 'conductor', 'provider-reap', 'adoption-forensics', 'validation']
problem_type: workflow-issue
---

# Maintenance-cycle learnings — reaped-attempt adoption forensics + validation invariants (2026-10-07/08, run `5b333105`, repository-maintenance cycle 1)

Five first-hand lessons from a cycle in which FOUR phase attempts were lost to
provider reaps (research `4f79d932` ~25s, roadmap `6c37bd4a`, implement
`1e4e6229`, full_tests `a1cab409` ~27s) and the batch still reached
pre-review-green. Companions:
`maintenance-cycle-learnings-2026-10-06-detached-ci-wait.md` (the detached-CI
wait pattern this cycle's full_tests used),
`targeted-runner-blind-spots-web-config-untracked-tests-2026-10-04.md` (the
tracked-only enumeration class — L3's instance), and sibling run `02238c80`'s
unlanded `maintenance-cycle-learnings-2026-10-08-attempt-reap-staging-forensics-absorb-preconditions.md`
(staging/reap forensics from the absorb lane — reconcile the pair by content
at integrate; neither lesson set is a subset).

## L1 — a reaped attempt's standing worktree delta is adoptable — on a four-leg verification chain

An absent typed artifact is not evidence no work happened. This cycle's
implement attempt (`1e4e6229`) was reaped AFTER completing a complete,
deliberate 9-modified + 1-untracked worktree delta and BEFORE writing its
result JSON. The delta was adopted only after all four legs held:

1. **sha256 identity** — the reaped attempt's scratch patches `f1`/`f2`
   hash-matched the live worktree files byte-for-byte (the delta is exactly
   what that attempt wrote, not ambient drift).
2. **upstream ground truth** — its `upstream-570.patch` was verified to be
   the genuine upstream format-patch (`4e5accf`) and re-applied cleanly to
   the base revision's pre-fix files, re-proving fork/upstream byte-identity
   and that the port matches the accepted upstream fix.
3. **red-first proof** — stashing the delta made the delta's own new suites
   fail (26 failed / 269 passed), unstashing restored green: the tests test
   the fix, not the fixture.
4. **post-adoption gates** — lint/check-types/census green on the adopted
   tree, including fixing the 6 lint errors + 2 warnings the delta carried.

The same cycle's counter-example: reaped roadmap attempt `6c37bd4a`'s PLANNED
composition was rejected — its id-ceiling audit was contaminated (L4). Rule:
adopt only what verifies against the live frame; redo the rest. And the cheap
side of the rule: a reaped attempt whose event log is
`turn_started -> progress -> session_reaped -> completed(failed)` inside ~60s
with no scratch and no typed artifact (`4f79d932`, `a1cab409`) is a
zero-durable-work reap — redo from scratch without ceremony.

## L2 — fresh conductor worktrees ship without node_modules, and the validation digest does not care

Symptom: `corepack pnpm exec vitest --version` -> `Command vitest not found`
(`ls node_modules` absent). Cure: `corepack pnpm install --frozen-lockfile`
(11.5s this cycle, vitest 4.1.11). Proof obligation when repairing mid-phase:
re-derive the validation digest
(`hermes_conductor.validation_policy.validation_digest(HEAD, '.')`) BEFORE and
AFTER the repair and record equality — `node_modules` classifies non-tracked,
so the digest is invariant and the repair is provably outside the validated
surface. Budget the install in every fresh worktree.

## L3 — the impacted-suite runner derives only TRACKED test files; run NEW untracked suites explicitly

Cross-references
`targeted-runner-blind-spots-web-config-untracked-tests-2026-10-04.md`. This
cycle's instance: the targeted command derived 22 suites over the batch's
changed testable surfaces (`src/github/snapshot-store.ts` +
`src/server.ts`), but the batch's NEW untracked suite
`test/server-entry-point.test.ts` (rm-702) matched nothing in the derivation —
vitest ran 21 files / 747 tests and the new suite was silently absent. Cure
applied: an explicit supplementary `vitest run` of the new file (1 file / 6
tests green), recorded in the phase evidence. Rule: whenever implement
creates a NEW untracked test file, the test phases must run it by name in
addition to the derived set, and implement should name new-suite files in its
handoff.

## L4 — shared-spool id-space audits are contaminated by foreign-repository ledgers; filter by def-id overlap

The delegate spool accumulates OTHER repositories' roadmap claims (this
cycle: a foreign fleet's claims ran rm-707..755 against this ledger's 229
ids). A naive def-line ceiling scan over the spool reads a phantom ceiling
and either mints into a collision or rejects valid ids. Cure (this cycle's
roadmap phase): compute def-id SET overlap between each spool claim block and
this repo's own main-ledger id set (~70/245 overlap here), exclude
non-overlapping blocks, and complement with committed-ref probes (including
preserve/run refs) and dirty sibling-worktree scans. The reaped `6c37bd4a`
plan rested on the contamination; the live composition corrected it.

## L5 — ephemeral GitHub-CI teardown is not guaranteed when the driving attempt is reaped; refs accumulate on origin

The ephemeral-PR validation route force-pushes `conductor/ci-<sha>` +
`conductor/ci-base-<sha>` and deletes them in a `finally` block — but only if
the attempt survives to run it. At this cycle's full_tests close, 46 stale
refs sat on origin (13 `conductor/ci-*` + 33 `conductor/ci-base-*`); a
compound-time re-probe read 48 (sibling churn continues). Rules: (a) every
full_tests must verify ITS OWN teardown (`git ls-remote origin
'refs/heads/conductor/ci-*'` for its two refs plus PR state — this run's
pair `ci-112a0b8fb034` / `ci-base-3a8013c5ac29` verified deleted, PR #433
verified closed); (b) the accumulation is a standing housekeeping sweep for a
stewardship phase, gated on no sibling validations being in flight —
deleting a live sibling's refs breaks its validation.
