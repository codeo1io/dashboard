---
title: Race/timeout wrappers must propagate rejections — they own only the hang case
date: 2026-10-09
category: best-practice
module: dashboard
component: web-api-seams
problem_type: best_practice
severity: high
---

# Race/timeout wrappers must propagate rejections

## Problem

`rm-780` added `withGetSeamTimeout` (`web/src/api/fetch-timeout.ts`) to give the app client's
GET seams a 15s wall-clock bound (parity with rm-501's ACK bound). The first variant settled
BOTH race outcomes itself:

```ts
// BROKEN — collapses the seam taxonomy
promise.then(resolve, () => { clearTimeout(timer); resolve('timeout') })
```

so every transport rejection surfaced as `{ ok: false, reason: 'timeout' }` — but the seams'
`try/catch` blocks already classify rejections (`AbortError` → `'timeout'`, everything else →
`'network'`), and the landed suites pin that contract
(`web/src/api/listener.test.ts` "handles network error",
`web/src/api/monitoring.test.ts` "maps a transport rejection to network"). A wrapper that
swallows the rejection never feeds the catch, so the classification collapses — and a caller
abort now misreports as a timeout too. Both suites red on the full ephemeral-PR CI run
(`gh run view 37858326134`), not before: the implement phase's focused runs selected the NEW
tests (fetch-timeout/Listener/Monitoring views) but never the touched seams' pre-existing
suites.

## Rule

1. A race/timeout wrapper owns ONLY the hang case. It must `reject(error)` in the promise's
   rejection branch — never map a rejection to the timeout sentinel — so downstream
   `try/catch` classifications keep operating on the real error.
2. When adding a shared helper (a wrapper, a mapper, a hook) consumed by EXISTING code paths,
   the focused verification set must include every pre-existing suite that imports the touched
   seams (`grep -rn '<seam>' web/src --include='*.test.*'`), not just the new helper's own
   tests. The targeted/impacted selector maps files to suites, not callers to suites —
   importer grep is the operator's responsibility.
3. A wrapper's own unit test must pin the propagation contract explicitly (rejects with the
   original error), not merely "settles somehow" — the broken variant's test asserted
   `result === 'timeout'` on rejection and was green while the contract was broken.

## Verification recipe (focused, no repo-wide suite needed)

```
grep -rn 'withGetSeamTimeout\|fetchMonitoring\|fetchListenerMessages' web/src --include='*.test.*'
node_modules/.bin/vitest run --config web/vitest.config.ts src/api/listener.test.ts src/api/monitoring.test.ts src/api/fetch-timeout.test.ts
```

If the grep names a suite the focused run did not execute, add it — that gap is exactly where
this regression class lives until the full gate catches it.
