---
title: SSE frames silently vanished when a CRLF pair straddled two read() chunks
date: 2026-09-29
category: logic-errors
module: dashboard
problem_type: logic_error
component: sse_parsing
severity: medium
symptoms:
  - "Both SSE readers dropped a complete, well-formed event frame with no onError, no parse error, and no log — the event simply never existed"
  - "Reproduced deterministically by splitting a CRLF-terminated stream so one read() chunk ended with \\r and the next began with \\n"
  - "Existing 'partial-chunk reassembly' tests stayed green the whole time — they only split chunks mid-payload, never at a line terminator"
root_cause: per_chunk_state_loss
resolution_type: code_fix
related_components:
  - src/gateway/operator-sse-reader.ts
  - public/operator-stream.js
  - test/operator-sse-reader.test.ts
  - test/operator-stream-core.test.ts
tags:
  - sse
  - streaming
  - chunk-boundary
  - crlf
  - parser
---

## Problem

Both SSE implementations normalized each `read()` chunk independently
(`normalizeCrlf(chunk)` inside the read loop). A chunk that happened to end
with the CR half of a CRLF pair was normalized as if the CR were a complete
line terminator, early-terminating the current line. The next chunk's leading
LF then looked like a record boundary — producing two truncated records where
the wire carried one well-formed frame. Both halves were invalid events, so
the frame was dropped **silently**: no error callback, no onError dispatch,
nothing observable.

The failure mode is probabilistic in production (depends on TCP chunking) and
invisible to every test that feeds whole records or splits chunks mid-payload.

## Detection

Deterministic regression: drive the reader with the byte stream of a valid
frame split so chunk 1 ends exactly at the `\r` and chunk 2 starts at the `\n`.
Assert the frame still arrives. This went red pre-fix (`[ready]` vs
`[ready, status]`) and green post-fix.

Chunking-invariance property (the durable guard): generate an arbitrary valid
multi-frame stream, then split it at EVERY possible cut point (and at random
cut sets); assert the parsed frames are identical to the whole-buffer parse.
Any parser that carries per-chunk state leaks fails some cut. 300 runs in both
suites.

## Fix

Never normalize a trailing separator you cannot yet classify. Both readers now
hold a chunk-final CR in a pending-CR state and only resolve it against the
next chunk's first byte (`\n` → one terminator; anything else → lone-CR
terminator). In the public twin this lives in the exported
`appendStreamChunk(buffer, decoded)` seam (declared in
`public/operator-stream.d.ts`), consumed by the read loop at :2507.

A stream that ends mid-pair (trailing CR at close) is resolved by the
done-time flush: the reader parses `buffer + '\n\n'` and the parser's internal
normalization collapses the held CR, so the final record is delivered —
byte-identical to pre-fix EOF behavior. The hold exists only to keep
chunk-boundary classification honest mid-stream; it never loses data at EOF.

## Prevention rule

**Streaming parsers must be chunking-invariant**: for any valid byte stream,
the parsed output may not depend on where `read()` boundaries fall. Enforce
with the split-at-every-cut-point property above, and never put
state-independent transformations (CRLF normalization, BOM stripping,
multi-byte decoding) inside the per-chunk loop unless they are
prefix-complete. Splitting tests mid-payload is not coverage of the boundary
class — split AT the separators, between them, and at every index.

## Provenance

Found in run dbe8fb1696ea assess (live repro against the real module), landed
same cycle (rm-265) with the regression + property in both suites; validated
by targeted 825/825 (19-suite impact set) and full ephemeral CI 10/10 (PR
#261, snapshot 7ddda611bead).
