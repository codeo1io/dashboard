---
module: dashboard
tags: [prioritization, repository-maintenance, cycle-1, operator-stream]
problem_type: selection
---

# Repository-maintenance cycle:1 selected batch — run 489f454f1c324499a5ac6a9e70b3b0ab

Selected by prioritize attempt fec2bcba4f6b4a238f92f024269d633f (2026-10-14; earlier attempts
a68a5def8e51471abf500e677c70bf83 and 797176707ba544698aa5fc4fd9238e1f session-reaped with no
delegate result — their durable content was verified and adopted). Stewardship contract:
attempt 93206dcd4508477b9083834f3232102d. Implemented by attempt
b8723f2708d94fc3b789fb8a0f25d96f in the run worktree at 5530b5e.

## Batch: operator-stream gap-credit truth

Two cores, one landing:

1. **CORE 1 — rm-853 follow-up acceptance (correctness).** The output reducer
   (`public/operator-stream.js` `nextStreamState` output branch) latched
   `outputGapDetected` and accumulated `outputGapMissing` on every seq skip, crediting
   nothing against the server-reported `droppedCount` on the same frame — conflating
   server-coalesced deltas (known, reported) with true missing output (silent). The
   committed review-fix rider (ROADMAP.md, rm-853, 2026-10-10) deferred exactly this
   cure to the next window with a required upstream semantics check. That check ran
   first-hand this cycle: gateway `packages/gateway/src/web/sse/manager.ts` drains a
   per-subscriber accumulator and reports the count on the next enqueued frame, so the
   D dropped seqs sit exactly between prevSeq+1 and the arriving seq — per-arrival
   credit is the correct arithmetic. Implemented: `gap = seq - (prevSeq + 1)`,
   `credit = min(gap, droppedCount)`, latch only when `missing = gap - credit > 0`,
   accumulate `missing` into `outputGapMissing`; `coalesced` tracking unchanged and
   independent; `.d.ts` gap-tracker docs updated to credited semantics; four new
   reducer fixtures (full-credit, partial-credit, excess-credit, mixed accumulation)
   in `test/operator-stream-core.test.ts`, file 797/797 green with every pre-existing
   gap pin untouched.
2. **CORE 2 — adjacent-scope observability rider (66656feb's rm-853 rider).** The
   runtime attach path's bare catch (`web/src/operator/runtime.ts` `_attachStream`)
   rendered the Unavailable badge with zero diagnostics. Now logs one structured,
   identifier-free `console.error('[operator] run-stream attach failed', {error})`
   before the badge — honoring the console-security contract (no run IDs in console
   output). Pinned by a source-contract test plus a real-module throw-point test
   (poisoned `checkoutEl.hidden` setter drives the real `initOperatorStream` throw
   the catch wraps) in `web/src/operator/runtime.test.ts`, 60/60 green.

## Ledger bookkeeping riding the same landing

- `ROADMAP-v2-delta-489f454f.patch` applied (rm-1021 mint + rm-100 gates-green rider +
  rm-252 absorb-window orphan rider + extension #39 collision-resolution record).
- rm-853 implement rider appended (acceptance discharged, status stays implemented
  pending landing verification).
- Post-edit ledger census: 236 defs / 0 dups / max rm-1021.

## Why this batch (selection rationale)

- Top-scoring unclaimed zone after the day's fog bands: every high-visibility zone
  (upstream absorb, contract forward-compat, version-truth/d.ts guards, watchdog) is
  claimed by active sibling lineages (9f078622, 66656feb, fcfde1ea, 1b227f20) — the
  house zero-sibling-claims standard excludes them.
- The acceptance spec was already committed on main (rm-853's review-fix rider) with a
  required upstream verification the batch completed first-hand.
- Client-only, no protocol/contract surface, red-first locally testable, and the file
  has zero overlap with every sibling-claimed surface.

## Verification

- `pnpm vitest run test/operator-stream-core.test.ts` -> 797/797 (was 793).
- `pnpm vitest run --config web/vitest.config.ts src/operator/runtime.test.ts` -> 60/60
  (was 58).
- `pnpm check-types` -> RC=0 (3 legs).
- `./node_modules/.bin/eslint` on the touched root-scoped files -> RC=0.
- Roadmap guards re-run post-ledger-edit (see implement PhaseResult).
- Repository-wide validation deferred to the full_tests gate per the phase budget.
