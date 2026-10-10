---
module: dashboard
tags: ['maintenance-cycle', 'operator-contract', 'sse', 'web', 'fixtures', 'validation']
problem_type: workflow-issue
---

# Maintenance-cycle learnings — operator-contract flip ripples into the web suite (2026-10-09, run `28cd8f6c`, repository-maintenance cycle 3)

One regression class from this cycle's full-validation leg: the operator
contract `1.8.0` flip (implement `3ab756fb`) broke three web tests that no
root-side suite or targeted phase could see, because the fixture surface lives
in the web half of `pnpm test`.

## L1 — a contract-version flip sweeps THREE fixture sites, not two

`PINNED_CONTRACT_VERSION` / `SUPPORTED_OPERATOR_CONTRACT_VERSIONS` changes
ripple into:

1. Root `test/` suites — `operator-sse-reader` happy-path literals,
   `operator-stream-core` ready frames, `operator-contract-window` /
   `operator-contract-conformance` pins (this batch swept them).
2. `web/src/operator/runtime.test.ts` — which imports the REAL
   `../../../public/operator-stream.js` (line ~506) and serves
   `event: ready` / `data: {"contractVersion":"…"}` literals (:654/:689/:999
   at the flip). A stale version here fails the handshake CLOSED.
3. The web half only executes under `pnpm test`'s web vitest config
   (`vitest --config web/vitest.config.ts`) — nothing scoped to `test/`
   runs it.

Failure signature worth recognizing: not a suite-wide flame — exactly the
tests whose streams open: connection state stays `'drift'`, the run cards
never populate (`hidden` never clears). First run of this cycle: web
`1 failed | 32 passed (33)`, three failures at :670/:715/:1039.

## L2 — sweep rule before landing any contract-window change

`grep -rn 'contractVersion' test/ web/src/` and align every HAPPY-PATH
literal with the new primary version. Rejection fixtures on retired versions
(e.g. `1.5.0`, `1.1.0`) must STAY on old versions — they are the fail-closed
path's coverage. Fix for this cycle: the three literals `1.6.0` -> `1.8.0`;
rerun green (`1212/1212`).

## L3 — targeted phases cannot see cross-half constants

The engine's impacted-tests reader maps `src/` surfaces to ROOT suites only
(`version.ts` -> window/sse-reader/sse-parser.property; it misses even
`operator-contract-conformance.test.ts`, which pins the constant via type
imports). For cross-cutting constants consumed by both halves (contract
version, shared vocabularies), treat `pnpm test`'s web half as the minimum
gate, or add the web suite to the targeted selection manually — the
"focused battery green" story is not complete otherwise.

## Record

- Caught at `full_tests` (`dbc3b8dd`), first run: web 3 failed; fixed
  in-turn; second run all six Main-workflow jobs green (root 65 files /
  2495 tests, web 33 files / 1212 tests).
- Ledger: `rm-157` rider (flip executed + this regression),
  `rm-252` rider (consumer half completed), cycle-3 extension UPDATE.

## Correction (2026-10-09, review-fix turn `3f0ca268`)

The Record section above described the pre-review implementation. The
independent review (`3b6cf864`, NEEDS_CHANGES) found the checkout layer had
fabricated the wire shapes; the fix turn replaced it with a port of
fro-bot/dashboard main `public/operator-stream.js:178-557` and restored
`operator-run-index.js` to base. Lessons L1-L3 stand unchanged — the L3
blind-spot lesson is exactly why the fabrication survived to review: no
root-side suite pins the browser mirror against the vendored contract. That
pin now exists (import-driven parity tests in `operator-stream-core`).

Follow-up (fix turn 0b509f6f, 2026-10-10): the fabrication survived the redo
in one more place than the runtime — the hand-maintained `.d.ts` type block
still carried an intermediate invented vocabulary (12 wrong update-failure
values, `filesChanged`/`missing` worktree variants, a `newer` remote-freshness
change). Lesson: when a runtime file is replaced wholesale, sweep EVERY
hand-maintained mirror of it the same turn (`.d.ts`, README API tables, doc
snippets), and pin the sweep with the same parity tests. Also fixed en passant:
the recipe step-5 `none`-operation exception (template fill was stringifying
`undefined`), and render-only label maps with no consumer were trimmed rather
than shipped dead.
