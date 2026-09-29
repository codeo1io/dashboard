---
title: SSE read-loop connection lifecycle — every non-close exit must abort, and abort-caused read rejections must be swallowed
date: 2026-09-29
category: workflow-issues
module: dashboard
problem_type: reliability_pattern
component: operator_stream
severity: medium
applies_when:
  - 'Adding or reviewing an exit path from the operator SSE read loop in `public/operator-stream.js` (drift, submitted-unobservable, gateway-error, first-frame timeout, unread-body branches)'
  - 'Mirroring the same lifecycle in `src/gateway/operator-sse-reader.ts` or any future single-source reader'
  - 'A stalled operator stream "recovers" on manual retry but the origin connection count keeps growing'
tags:
  - sse
  - abortcontroller
  - connection-lifecycle
  - operator-stream
  - rm-251
---

## Problem

The read loop in `public/operator-stream.js` had exits that stopped reading
without releasing the connection: the 'drift' and 'submitted-unobservable'
transitions returned bare, `connect()` replaced `this.abortController`
without aborting the prior one, and the first-frame-timeout dispatch left
the unread response body attached. Each manual retry after a stalled run
therefore stranded another open origin connection — and browsers cap ~6
HTTP/1.1 connections per origin, so repeated retries starve ALL same-origin
traffic (React polls, CSRF refresh) while the gateway holds each stream
session open against a stalled reader.

## Root cause

Three separate beliefs had to be true at once for the strand, and each edit
that added an exit path re-broke only one of them:

1. "returning stops reading" — true, but it does not abort the `fetch`
2. "the timeout aborts" — only the buffer-overflow and `close()` paths did
3. "replacing the controller is enough" — the OLD controller's signal is the
   one the in-flight fetch listens to

## Cure (rm-251, cycle-18)

- Every non-close exit aborts the CURRENT controller (`controller.abort()`
  tagged `// rm-251` at each site: stop-reading guard, first-frame-timeout
  dispatch, unread-body branches, buffer-overflow).
- `connect()` aborts any prior live controller before creating a new one.
- `close()` aborts synchronously.

## The counter-trap (this is the part that costs a second bug)

Aborting a controller whose `reader.read()` is PENDING rejects that read
promise. If the catch maps every rejection to `unexpected-close`, a
deliberate abort becomes a phantom close event — which can schedule a
reconnect and undo the lifecycle fix. Every read-catch must swallow
abort-caused rejections FIRST:

```js
catch (error) {
  if (signal.aborted) return // deliberate abort — never dispatch a close
  // ...existing error mapping...
}
```

## Regression seam

`test/operator-stream-core.test.ts` imports the real ESM module and stubs
`fetch`; the rm-251 suite drives drift and first-frame-timeout transitions
and asserts the fetch stub saw its signal aborted. When touching either
reader, extend that suite rather than reasoning about the lifecycle by eye.

## Related

- `web/src/push/subscribe.ts` carries the sibling rule for subscriptions:
  any abort return AFTER `pushManager.subscribe()` but BEFORE the gateway
  POST records the subscription must call `subscription.unsubscribe()` —
  and post-POST windows must check POST success first, so a gateway-recorded
  subscription survives an abort (no desync) while a gateway-uninformed one
  is cleaned up (rm-254, same cycle).
