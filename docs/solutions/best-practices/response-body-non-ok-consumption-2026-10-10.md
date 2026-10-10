---
title: Consume or cancel every fetch response body on error paths, not just success
date: '2026-10-10'
category: best-practices
module: src/gateway
component: 'operator transport (operator-client.ts, operator-sse-reader.ts)'
problem_type: resource-leak
severity: high
---

## Problem

`fetch()` call sites tend to handle the happy path carefully and treat
non-ok responses as "just an error" — constructing a Result error and
returning without ever touching `response.body`. In undici (and therefore
Node's global fetch), a Response whose body is never consumed or cancelled
retains its underlying socket/connection until GC settles it. Under a
gateway error storm — repeated 5xx/429 polling cycles — each dropped body
pins a keep-alive connection, and the pool exhausts: transports stall with
connection timeouts while the process itself looks healthy.

First-hand evidence (run 7f03c5059e3144ac8c9cb678a58d0afa assess,
2026-10-10): `src/gateway/operator-client.ts` consumed or cancelled the
body only on the 1 MiB cap path; every non-ok early return dropped the body
unread, and the SSE reader's 404/429/5xx branches did the same.

## Rule

Every exit from a fetch call site owns its Response body:

- ok paths that read the body: consume it (json()/text()) or cancel it.
- non-ok paths returning an error: `await response.body?.cancel()` before
  returning — or read-then-discard when error details are logged.
- mid-stream abandonment: cancel the reader (client-side twin covered in
  operator-sse-output-consumption-2026-06-22.md).

## Enforcement

Per-branch tests with a mocked non-ok Response assert cancel/consume before
the error return (test/operator-client.test.ts, test/operator-sse-reader.test.ts;
ROADMAP.md rm-900 carries the signals/acceptance/evidence record and the
validation-outcome rider). Review checklist item for any new fetch site:
name every exit path and its body disposition.

## References

- ROADMAP.md rm-900 (ledger record).
- undici documentation: consume or cancel every response body.
- Adjacent twins: authenticated-sse-consumption-fetch-stream-no-leak-2026-06-20.md,
  operator-sse-output-consumption-2026-06-22.md.
