---
title: deadline-race helpers that resolve the deadline error as a value will cancel your own abort timer — abort on the deadline path, clear on the winner path
date: 2026-09-29
category: runtime-errors
module: src/github/aggregator.ts
problem_type: runtime_error
component: concurrency
symptoms:
  - "A wrapper that races a deadline against a promise and ABORTS a signal on deadline expiry never fires the abort — tests assert an aborted controller and time out or, worse, pass only because the loser rejects on its own"
  - "The bug is invisible in happy-path tests: the winner settles first, the timer is cleared, everything looks correct"
root_cause: wrong_api
cause_detail: |
  The existing `deadlineOr(promise, ms)` contract resolves its deadline expiry as
  a VALUE (a `DeadlineExceededError` instance), it does not reject — by design,
  so callers can treat deadline loss as data. A naive abort wrapper around it:

      const t = setTimeout(() => controller.abort(), ms)
      try {
        return await deadlineOr(promise, ms)
      } finally {
        clearTimeout(t)
      }

  never aborts: when the deadline wins, `deadlineOr` still RESOLVES, control
  reaches `finally`, and `clearTimeout` cancels the abort before it fires. The
  timer only survives when the underlying promise rejects — the one path where
  you need it least.
fix: |
  Branch on the deadline VALUE, not on control flow:

      export async function deadlineOrWithAbort<T>(
        promise: Promise<T>,
        deadlineMs: number,
      ): Promise<T> {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), deadlineMs)
        try {
          const result = await deadlineOr(promise, deadlineMs)
          if (result instanceof DeadlineExceededError) {
            controller.abort() // deadline won as a value — abort NOW
            throw result
          }
          return result
        } finally {
          clearTimeout(timer)
        }
      }

  Winner path: clear the timer, controller never aborted. Deadline path: abort
  synchronously before throwing, so the losing request's socket is released
  even if its own rejection is slow or never comes.
verification: |
  Behavioral test (test/deadline-abort.test.ts, 3 cases): (1) no-abort on
  success, (2) abort fired at deadline — this case was RED against the naive
  `finally`-clear wrapper and only passed after the value-branch fix, proving
  the test catches the class, (3) the deadline value wins over a late loser
  rejection (loser rejects after the deadline result is already returned).
  Landed 2026-09-29 with the installation-enumeration call site routed through
  it (src/github/aggregator.ts), so a hung `/installation/repositories` page
  now releases its socket at the 15s refresh deadline instead of pinning it
  for the undici default (~300s).
prevention: |
  When wrapping ANY race helper, read its settle semantics first: does the
  error path resolve or reject? Cleanup keyed to `finally` is only correct if
  every non-winner path REJECTS. If the helper resolves errors as values,
  cleanup must branch on the value, or the cleanup will eat the very timer
  the wrapper exists to guarantee. Pair every such wrapper with a behavioral
  test that asserts the SIDE EFFECT (controller.aborted === true), not just
  the returned value — value assertions pass against both implementations.
related:
  - docs/solutions/runtime-errors/octokit-timeout-option-inert-on-hung-upstreams-bind-at-fetch-layer-2026-09-24.md
  - src/github/aggregator.ts (deadlineOr, deadlineOrWithAbort)
  - test/deadline-abort.test.ts
---
