---
title: 'SSE stream readers must fail closed on a zero-frame 200 — clean EOF is not contract truth'
date: 2026-10-10
category: 'best-practice'
module: 'dashboard'
component: 'gateway-sse'
problem_type: 'best_practice'
severity: 'high'
---

# SSE stream readers must fail closed on a zero-frame 200

Authored 2026-10-10, repository-maintenance cycle:3 run 633717c23b19 compound
a2fe8d1b, from the cycle's first-hand evidence (assess probe, implement 98d9cc18,
targeted dad6d5bc, full df99449a) — the fix is rm-851, landed pending review.

## Problem

`src/gateway/operator-sse-reader.ts` treated a `200 text/event-stream` that ends
cleanly having delivered ZERO frames as a healthy, cleanly-closed connection. The
reader's only contract gate ("the first frame must be `ready`") fires per-frame,
so a stream that never delivers a frame never triggers it — contract drift (a
proxy serving an empty 200, a wrong route, a version-skewed peer) surfaced as
silence, not as an error. The assess-phase probe made it empirical: point the
reader at a server that closes a 200 event-stream with no bytes and it reports
`{events:[],errors:[],closed:1}` — a clean close over a broken contract.

The class generalizes: **any stream reader whose only contract verification
fires per-frame is fail-open on frame-less streams.** Absence of frames is not
evidence of a healthy stream; it is the absence of evidence.

## Solution

Fail closed on the empty-contract case, keeping the mid-flight case clean:

- After a clean EOF, if no frame ever verified the contract, emit the
  contract-drift error BEFORE `onClose`
  (`onError('contract-drift: stream ended before a ready frame')`).
- Keep a mid-flight close AFTER a valid frame a clean close — the gate is "at
  least one frame verified the contract", not "the stream never ended early".
- Test BOTH empty-stream variants: the zero-byte stream AND a keepalive-only
  stream (comment lines are legal SSE that carry no frames — they must not
  satisfy the contract gate).

When auditing any other consumer of the same frame family, run the same probe
first — the reader under audit should report a non-empty `errors` for both
variants. `public/operator-stream.js` (the browser twin) still owes this audit
(rm-851 acceptance bullet 2, deferred at selection for fleet-collision reasons;
rm-253's wire-or-fold discipline decides which twin owns the gate), and the
1.9.0 question-frame window (rm-850) will grow the frame family again — extend
the zero-frame regression tests whenever it does.

## Evidence

- Red -> green probe (implement 98d9cc18): before
  `{events:[],errors:[],closed:1}`, after
  `{events:[],errors:['contract-drift: stream ended before a ready frame'],closed:1}`.
- 3 regression tests in `test/operator-sse-reader.test.ts` (empty stream,
  keepalive-only comments, mid-flight close after a valid frame).
- Targeted dad6d5bc 182/182 incl. operator-sse-reader 18; full df99449a
  dual-mirror legs A/B green (root 65f/2478 vs 65f/2483, web 33f/1212).

## Notes

- The canonical Result shape at this seam is `{success,data}` (listener
  contract), not `{ok,value}` — the implement phase learned this the hard way
  when wiring `parseLinksCell` through the exported validator (rm-187).
- Related: `operator-sse-output-consumption-2026-06-22.md`,
  `authenticated-sse-consumption-fetch-stream-no-leak-2026-06-20.md`
  (consumption and leak hygiene — this doc owns the zero-frame truth gate),
  `race-timeout-wrappers-propagate-rejections-2026-10-09.md` (the sibling rule
  for wrappers: own only your case, propagate the rest).
