---
module: gateway
tags: [security, untrusted-input, response-body, byte-cap, fetchjson, parity]
problem_type: security-hardening
---

# Untrusted response bodies must be capped at MAX_SSE_BUFFER_BYTES parity (fetchJson rule)

Recorded 2026-10-09 (repository-maintenance cycle:1, run 122a693028b8, rm-822 landing
line; compound doc:
docs/prioritization/2026-10-09-repository-maintenance-cycle-1-compound-run-122a693028b8.md).

## Rule

Every client-side read of an untrusted HTTP response body in this repository must be
byte-capped at parity with the strictest existing untrusted-buffer bound —
`MAX_SSE_BUFFER_BYTES` (1_000_000, src/gateway/operator-sse-reader.ts:46) — by reusing
`readBodyTextWithCap` (src/gateway/operator-client.ts), or must carry a written
justification for a different bound next to the call. A declared Content-Length
pre-check is NOT sufficient alone (a lying header must be caught by the streamed byte
counter), and over-cap rejection must be a TYPED error that PROPAGATES to callers
(`GatewayResponseTooLargeError`), never a silent truncate or a caught-and-swallowed
exception.

## Why green suites could not catch it

Before rm-822, `fetchJson` ended in an unbounded `response.json()` — an untrusted-buffer
read at NO cap while the SSE reader capped the same server's stream at 1 MiB. No test
suite pins fetch-parity: the suites pin behavior (status codes, shapes, retry
semantics), so an uncapped read passes every existing test by construction. The class
is invisible to green suites; only a rule plus a shared helper makes the next instance
visible at review time.

## Cure pattern (rm-822, implemented 2026-10-09)

- `readBodyTextWithCap(response, cap)`: reject early on declared Content-Length over
  cap; stream with a running byte counter; cancel the body at the fence; throw the
  typed over-cap error.
- Tests pin BOTH paths: honest-header over-cap AND lying-header streamed-over-cap
  (test/operator-client.test.ts size suite), plus error propagation to callers.
- When adding a new client fetch, grep for the helper first; count PRODUCTION fetch
  sites (test-seam suppliers and loopback-only dev harnesses are tracked separately —
  see the no-timeout-fetch family census on rm-571/rm-562/rm-606 for that pattern's
  twin rule).
