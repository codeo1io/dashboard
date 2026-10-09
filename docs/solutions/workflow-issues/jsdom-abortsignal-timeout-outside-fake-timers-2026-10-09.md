---
title: 'jsdom AbortSignal.timeout fires outside vi.useFakeTimers — assert the timeout bound separately'
date: '2026-10-09'
category: 'workflow-issues'
module: 'web-client'
problem_type: 'test-infrastructure'
component: 'vitest'
severity: 'info'
---

## Problem

Converting a real-clock test to `vi.useFakeTimers()` silently loses control
of `AbortSignal.timeout()` bounds. Proven first-hand in the rm-807
conversion of the rm-487 focus re-probe family (`web/src/App.test.tsx`,
run 8cecf1d7 implement 5f31a4c3): the production wiring under test calls
`AbortSignal.timeout(REPROBE_TIMEOUT_MS)` for the focus re-probe fetch, but
jsdom implements `AbortSignal.timeout` through its own
`globalObject.setTimeout` (AbortSignal-impl.js), which schedules OUTSIDE the
timers vitest fakes. Driving the clock with
`vi.advanceTimersByTimeAsync(...)` advances the poll intervals and
`waitFor`-style waits, but never fires the abort bound: a fake-clock test
that asserts "aborted at the bound" by only advancing timers fails or —
worse — passes against a stub that never aborts.

## Cure

Shim `AbortSignal.timeout` onto the faked clock inside the specific test
that asserts the bound, keeping App wiring real:

- Before the act that triggers the probe, replace
  `AbortSignal.timeout` with a shim that schedules the abort via
  `setTimeout(fn, ms)` — with faked timers installed that lands on the
  driven clock. Restore in the scoped `afterEach` alongside
  `vi.useRealTimers()`.
- Assert the contract on both sides of the bound
  (`advanceTimersByTimeAsync(REPROBE_TIMEOUT_MS - 1)` → not aborted,
  in-flight state stands; `+1` → aborted, fail-closed result latches
  nothing, single-shot-per-focus preserved so the next focus retries).
- The REAL static remains covered by real-timer tests (the rm-606 family
  exercises the real `AbortSignal.timeout` under real timers) — the shim
  only borrows the identical contract for the driven clock.

## Prevention

When a component passes `abortSignal: AbortSignal.timeout(n)` into a fetch
path, its determinism tests need one of: (a) the shim pattern above, (b)
spying `AbortSignal.timeout` to return a controllable signal, or (c)
asserting the bound with a real (short) timeout budget. Never assume
`vi.useFakeTimers()` covers `AbortSignal.timeout` — jsdom's timer channel
for it is separate from the mocked one. The scoped
`afterEach(() => { vi.useRealTimers(); ... })` also guards against clock
leaks across failures in the same file.
