---
title: A bytes-named buffer cap must measure UTF-8 bytes, not JS string length
date: 2026-09-25
category: logic-errors
module: dashboard
problem_type: logic_error
component: operator-run-stream
severity: medium
applies_when:
  - Enforcing any byte-denominated limit (memory bound, protocol limit, security guard) on data held as a JavaScript string
  - Maintaining parallel server-side and browser-side parsers of the same wire format
symptoms:
  - "The documented bound holds numerically in tests but real input oversubscribes it ~2x before tripping"
---

## Context

Both halves of the operator SSE path — the server-side reader
(`src/gateway/operator-sse-reader.ts`) and the production browser parser
(`public/operator-stream.js`) — enforced `MAX_SSE_BUFFER_BYTES = 1_000_000` with
`buffer.length > MAX_SSE_BUFFER_BYTES`, where `buffer` is a JS **string**. `.length`
counts UTF-16 code units, not bytes. Astral-plane characters (e.g. `𝕏`, U+1D54F)
occupy 2 code units but 4 UTF-8 bytes, so a hostile or merely emoji-rich stream
could accumulate ~2,000,000 actual bytes before the guard tripped — the cap, a
documented availability bound, was numerically untrue in both halves.

Fixed 2026-09-25 (cycle-13 batch B2, rm-114 units half): each append site now
feeds the chunk through an incremental `TextEncoder` byte counter (`encoder.encode(chunk).length`
summed per append) and the cap compares bytes to bytes. Astral-input tests in
both suites pin the corrected semantics: `'𝕏'`-only chunks sized to sit over the
byte cap but under the code-unit count must fail closed.

## Guidance

- A limit named `..._BYTES` must be measured in bytes end to end. For JS strings
  that means `TextEncoder` (or `Buffer.byteLength`) at the enforcement point —
  never `.length`, which silently measures UTF-16 code units.
- Prefer counting incrementally at append time over re-encoding the whole buffer
  on every check; the naive `encoder.encode(buffer).length` per check is O(n²)
  on a hot path.
- Pin the semantics with **astral-plane** fixtures, not ASCII: ASCII tests pass
  under both the buggy and correct implementations and prove nothing here.
- This repo deliberately keeps a server reader and a browser twin of the same
  parser in parallel (`rm-114` tracks the shared-source extraction). Until they
  are one source, ANY semantics change to one half must land in both and be
  pinned by a test in both suites — the units bug shipped to both halves
  identically because both were written from the same (wrong) mental model.

## Why This Matters

Byte budgets are usually availability or abuse bounds; a 2x oversubscription is
invisible to every ASCII-shaped test and to review. The failure mode is not a
crash but a quiet violation of a documented invariant — exactly the class that
survives CI and surfaces only under adversarial or real-world multilingual
traffic.

## Examples

```ts
// WRONG — code units, not bytes; 2x oversubscription on astral input
if (buffer.length > MAX_SSE_BUFFER_BYTES) { /* fail closed */ }

// RIGHT — incremental byte counting at the append site
bytesReceived += encoder.encode(chunk).length
if (bytesReceived > MAX_SSE_BUFFER_BYTES) { /* fail closed */ }
```
