---
title: Browser mutation fetches must carry AbortSignal timeouts (interactive lockout prevention)
module: operator-runtime
category: reliability
component: operator-runtime
tags: ['reliability', 'fetch', 'timeout', 'abort', 'operator-ui', 'listener', 'logout']
problem_type: hung-request-lockout
severity: medium
date: 2026-09-30
---

# Browser mutation fetches must carry AbortSignal timeouts (interactive lockout prevention)

## Problem

Interactive dashboard controls that POST (run approvals, run launch, listener
acks, logout) were wired to unbounded `fetch()` calls behind single-flight
latches (`approveMutex`, `submitting`, `ackingId`, a disabled logout button).
A stalled connection (proxy hiccup, dropped keep-alive, slow gateway) never
settles the promise, so the latch is never released and **every control behind
it stays disabled until a page reload** — the operator cannot retry, approve,
ack, or even log out.

Two comments in `web/src/shell/AppShell.tsx` even claimed
`Promise.allSettled` "can never block navigation" on a hang — false:
`allSettled` bounds *rejections*, not *hangs*. A hung fetch never settles,
so neither the `.then` nor a `finally` after it ever runs.

## Root cause

`Promise.allSettled` (and `try/finally`) only guarantees progress when
promises *settle*. Unbounded network calls have no settle guarantee. The
codebase already knew the fix — `public/operator-stream.js`'s cancel client
carried `CANCEL_FETCH_TIMEOUT_MS = 10_000` with the comment "A hung fetch
must not leave the control stuck pending forever" — but the same idiom was
never applied to the other mutation clients.

## Fix (run 78407a074176, rm-276)

Every browser mutation fetch now carries `AbortSignal.timeout(10_000)`:

- `public/operator-stream.js` — `buildApprovalClient` gained
  `fetchTimeoutMs` (default `10_000`); the approval decision POST, CSRF
  refresh, and run-approvals list are bounded. Aborts surface as the
  client's existing `{ kind: 'network' }` result, so the UI shows the normal
  retryable error instead of wedging.
- `public/operator-launch.js` — the shared `browserFetch` wrapper gained the
  same bound (launch submit, CSRF fetch, launch-params fetch).
- `web/src/shell/AppShell.tsx` — logout CSRF + logout POSTs bounded; the two
  false "cannot block navigation" comments corrected.
- `web/src/api/listener.ts` — ack CSRF + ack POSTs bounded
  (`ACK_FETCH_TIMEOUT_MS = 10_000`, const at `web/src/api/listener.ts:151`).
- Latch hygiene: ack paths now release `ackingId` in `finally` so even a
  thrown/aborted request cannot leave controls disabled.

## Prevention rule

1. **Any `fetch()` reachable from a user-visible control must pass a
   `signal: AbortSignal.timeout(<ms>)`** (10s for mutations). Treat a missing
   signal on an interactive path as a bug, not a style choice.
2. **Single-flight latches must be released in `finally`**, never only on the
   success path.
3. **Never reason about hang-safety via `allSettled`/`try-finally`** — they
   bound settle-time, not wall-clock. Only an abort signal bounds wall-clock.
4. Regression guard: `test/operator-fetch-hang.test.ts` drives the real
   operator modules with injected never-settling fetches and asserts controls
   recover within the (test-shortened) budget. Extend it when adding a new
   interactive client rather than adding ad-hoc timeout tests.

## How to verify

```
npm exec -- vitest run test/operator-fetch-hang.test.ts
grep -n "AbortSignal.timeout" public/*.js web/src/api/listener.ts web/src/shell/AppShell.tsx
```

## Ledger

ROADMAP.md rm-276 dated rider (2026-09-30, run 78407a074176); batch doc:
docs/prioritization/2026-09-30-batch-run-78407a074176.md (cycle outcome
section). Related landed items in the same batch: rm-277 (fast-uri override
floor), rm-278 (logout joins the rate-limit counting surface).
