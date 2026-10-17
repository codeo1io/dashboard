---
title: Absorbs that move the operator failure-kind map must mirror every vendored twin in the same change
date: 2026-10-08
category: integration-issues
module: dashboard
component: operator-contract
problem_type: vendored_twin_parity_gap
severity: medium
applies_when:
  - 'Absorbing an upstream operator-contract delta that adds OperatorFailureKind values or relabels FAILURE_REASON_LABELS entries'
  - 'The absorb batch touches public/operator-stream.js and its focused suites pass, while public/operator-run-index.js and the .d.ts twins stay untouched'
  - 'A later targeted or full run fails in test/operator-run-index-core.test.js on identical-keys, label-text, or vendored-kind coverage parity'
tags: [operator-contract, vendored-twins, parity, upstream-absorb, failure-kinds]
related:
  - 'public/operator-stream.js (VALID_FAILURE_KINDS at :161, FAILURE_REASON_LABELS at :178)'
  - 'public/operator-run-index.js (twin map at :42/:59; header at :55 declares the parity contract)'
  - 'test/operator-run-index-core.test.js (identical-keys + label-text + vendored-kind coverage gates)'
  - 'test/operator-stream-core.test.ts (the stream-side pins)'
  - 'ROADMAP.md rm-157 (the cycle-3 window + absorb batch, conductor run 9289efaac79f)'
---

## Problem

The 2026-10-08 cycle-3 absorb of upstream `a82871d` (operator contract 1.8.0: new kinds
`checkout-substituted` and `workspace-unavailable`, plus the relabel
`workspace-unreachable` → `Workspace unreachable` to free `Workspace unavailable` for the
new kind) updated `public/operator-stream.js` and passed every implement-phase focused
suite — 625 tests across the contract-window, reader, conformance, and stream-core sets.
The first authoritative targeted run (the dispatched impacted-suite command) then failed
3 of 1560 tests, all in `test/operator-run-index-core.test.js`:

- `:2291` — identical-keys gate: the two module maps no longer expose the same key set
- `:2296` — label-text gate: `Workspace unavailable` vs `Workspace unreachable`
- `:2305` — vendored-kind coverage gate: the run-index twin did not know the new kinds

## Root cause

The failure-kind/label map is ONE logical constant with FOUR hand-maintained physical
homes: `public/operator-stream.js` (`VALID_FAILURE_KINDS`, `FAILURE_REASON_LABELS`),
`public/operator-run-index.js` (the twin of both), and the two `.d.ts` declaration twins.
The parity contract is only enforced by tests that live in the RUN-INDEX suite —
`test/operator-run-index-core.test.js`, outside any stream-focused selection — so a
green focused run cannot see the drift. The run-index header even states it
(`:55` — must stay identical to the map in `public/operator-stream.js`; parity is
enforced by tests), but nothing mechanical couples the four edits: the coupling lives in
a test file the absorb's focused set did not include.

## Solution (as applied this cycle)

Mirror the map in the same change unit:

1. `public/operator-run-index.js` — `VALID_FAILURE_KINDS` and `FAILURE_REASON_LABELS`
   brought byte-identical to `public/operator-stream.js`'s map.
2. Both `.d.ts` twins (`public/operator-run-index.d.ts`, `public/operator-stream.d.ts`)
   — the kind union and label map declarations; `tsc` resolves these, so a stale twin
   also surfaces as TS2724 against the updated runtime shape.
3. `test/operator-run-index-core.test.js` — the pins extended to the new kinds/relabel
   (the coverage gate enumerates the map, so the pins and the map must move together).

Re-run proof for the cycle-3 instance: the exact dispatched targeted command went green
at 26 files / 1560 tests RC=0; focused `operator-run-index-core` 158/158; `pnpm
check-types` rc=0; eslint rc=0 on the four cure files.

## Prevention rule

- Treat the failure-kind/label map as one logical constant with four homes. Any diff
  that touches `VALID_FAILURE_KINDS` or `FAILURE_REASON_LABELS` in either `public/*.js`
  twin must update all four surfaces in the same change — never ship a stream-side map
  delta alone, even when every stream test is green.
- The impacted-test selection for any absorb that moves the map MUST include BOTH
  parity suites: `test/operator-run-index-core.test.js` AND
  `test/operator-stream-core.test.ts`. A focused stream-only green run is not evidence
  of parity.
- Cheap pre-flight before declaring an absorb done:
  `grep -n "VALID_FAILURE_KINDS" public/operator-stream.js public/operator-run-index.js`
  and compare the two map bodies by eye (they are short), or run the run-index parity
  suite directly — it fails closed on key-set, label-text, and coverage drift.

Recorded by the 2026-10-08 cycle-3 compound phase from the recorded targeted_tests
outcome (first run RED 3/1560 → cure → re-run GREEN); no new validation was executed
when writing this document.
