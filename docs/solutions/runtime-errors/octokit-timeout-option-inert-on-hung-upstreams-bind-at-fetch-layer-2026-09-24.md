---
title: Octokit timeout option is inert on hung upstreams — bind outbound HTTP at the fetch layer and expect plugin-retry to amplify aborts
date: 2026-09-24
category: runtime-errors
module: src/github/app-client.ts
problem_type: runtime_error
component: dependency_boundary
symptoms:
  - "A hung/silent GitHub upstream (accepts TCP, never responds) stalls Octokit REST, GraphQL, and installation-token mint calls for the undici default (~300s headers/body) even when a `timeout` option was set"
  - "After adding a working timeout, the failing call surfaces as HTTP 500 and takes ~3× the bound in wall time"
  - "Only reproducible against a real socket that never responds — mocks with rejected promises never show it"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
tags:
  - octokit
  - undici
  - abortsignal
  - hung-upstream
  - plugin-retry
  - outbound-timeout
---

## Problem

The cycle-9 batch (rm-156, run 91e4626d) needed every outbound GitHub data-plane
call bounded so a hung upstream cannot stall the aggregator's serial refresh walk.

Three primitives were assumed to work and did not:

1. **`new Octokit({ timeout: ms })` / per-request `timeout`** — inert against a
   hung upstream on this runtime. `@octokit/request` implements `timeout` via
   `setTimeout` around the fetch *promise* only when the fetch implementation
   itself honors aborts in the same tick; with a socket that accepts and never
   responds, the bound never fires (verified empirically: silent `net` server +
   `timeout: 150` → request held open indefinitely).
2. **Per-request `signal` on `octokit.graphql`** — `@octokit/graphql` does not
   forward a request `signal` at all; there is no per-call seam there.
3. **`@octokit/plugin-retry` composes with a timeout bound** — it does, but
   poisonously: a timeout abort surfaces as a status-500 error, which the retry
   plugin treats as retryable. 3 retries × exponential backoff turned a 15s
   bound into ~14.7s of *additional* stall per hung call — retrying multiplies
   the exact stall the bound exists to cap, and the plugin cannot distinguish a
   timeout abort from a genuine transient 5xx.

## Resolution

Bind at the only honored seam — **inject a wrapped fetch** — and disable retry
on the bounded client:

```ts
export const GITHUB_HTTP_TIMEOUT_MS = 15_000

export function createBoundedFetch(timeoutMs: number): typeof globalThis.fetch {
  return async (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal
    return globalThis.fetch(input, {...init, signal})
  }
}

// constructor-level (REST + throttling + auth-app token mint):
new Octokit({
  auth, // or authStrategy: createAppAuth
  request: {fetch: createBoundedFetch(GITHUB_HTTP_TIMEOUT_MS)},
  retry: {enabled: false}, // plugin-retry would retry the timeout abort as a 500
})

// graphql (no signal forwarding — the fetch seam is the only bound):
const gql = graphql.defaults({
  headers: {authorization: `token ${token}`},
  request: {fetch: createBoundedFetch(GITHUB_HTTP_TIMEOUT_MS)},
})
```

Key details:

- `request: {fetch}` **is honored** by both `@octokit/core` and
  `@octokit/graphql` — it is the one injection point that reaches the real
  transport on every path.
- `AbortSignal.any([...])` composes the caller's signal with the timeout so an
  unmount/cancel abort still works; `AbortSignal.timeout` self-cleans.
- For `createAppAuth`, pass `request: octokit.request` when minting so the mint
  itself rides the bounded instance.
- A whole-operation ceiling that mere marking cannot achieve: pair the
  per-request bound with a watchdog (here: the aggregator stamps
  `refreshDurationMs`/`refreshDegraded` per refresh attempt). The request bound
  makes each call self-terminating; the watchdog makes the degradation visible.
- Acceptable loss from `retry: {enabled: false}`: transient 5xx recovery
  re-heals on the next scheduled refresh cycle (60s here) instead of in-line;
  rate-limit handling via `@octokit/plugin-throttling` is unaffected.

## Prevention

- Never claim "timeouts configured" from the presence of a `timeout` option
  alone — prove it with a hung-socket fixture (silent `net.createServer` that
  never writes, then assert the call rejects inside the bound window). The
  shipped regression test `test/app-client-timeout.test.ts` is the template.
- Grep-level audits for `AbortSignal|timeout|signal` return comments as well as
  code (this repo's own assess phase initially over- and under-counted both
  ways) — verify the wire path, not the keyword.
- Re-check bounded/unbounded inventory after any dependency bump of
  `@octokit/*` or undici: the seam that is honored is an implementation detail
  of those packages, not a contract.
