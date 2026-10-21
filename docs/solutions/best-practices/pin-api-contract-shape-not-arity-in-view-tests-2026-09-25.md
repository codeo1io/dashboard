---
title: View-level tests that pin API arity break on additive signature changes
date: 2026-09-25
category: best-practices
module: dashboard
problem_type: testing_convention
component: development_workflow
severity: medium
applies_when:
  - writing or reviewing component tests that mock api-client functions with toHaveBeenCalledWith
  - adding optional parameters to an exported api-client function
---

## Problem

`web/src/views/Listener.test.tsx` asserted the "Mark read" flow with
`toHaveBeenCalledWith('msg-1')` — pinning the ack API's **arity**, not its
contract. When `ackListenerMessage` gained an optional second argument
(`{abortSignal}` from rm-189's timeout bounds), the assertion failed even
though the id argument was still exactly right. This survived the implement
phase because the file mocks the api module rather than importing the api
suite — the api-suite pins (17 tests) were green while the view pin was red,
and only the authoritative CI validation caught it.

The same trap generalizes: any `toHaveBeenCalledWith(exactArgs)` against a
function whose signature is expected to grow optional parameters is a
latent false failure, and it fires at the worst time — during the validation
gate of the very change that added the parameter.

## Solution

Pin the **contract shape**, not the arity:

```ts
expect(listenerApi.ackListenerMessage).toHaveBeenCalledWith(
  'msg-1',
  expect.objectContaining({abortSignal: expect.any(AbortSignal)}),
)
```

This turns the guard from "no second argument may ever exist" into "the
second argument, when the call site supplies one, must carry the documented
bound" — the test now *protects* the rm-189 timeout bound instead of
fighting it.

Rules of thumb:

- When adding an optional parameter to an exported api-client function,
  grep every `toHaveBeenCalledWith` mock of that function across `web/src`
  and `test/` — not just the api suite's own tests — and upgrade each pin to
  `objectContaining` + `expect.any(<Type>)` for the new argument.
- Prefer `expect.any()` for values the caller constructs inline
  (AbortSignals, RequestInit objects) — exact-match pins on those guarantee
  future breakage.
- A red view-level mock pin during validation is usually an arity pin, not a
  behavior regression: check the assertion before suspecting the component.

## Verification

- Pre-fix: `pnpm vitest run --config web/vitest.config.ts
  src/views/Listener.test.tsx` -> 1 failed | 5 passed with
  `expected "vi.fn()" to be called with arguments: ['msg-1']`.
- Post-fix: 6/6 passed; full web suite 28 files / 1085 tests green;
  authoritative CI validation green (ephemeral PR #127, all 10 checks).

Found during run 9c8505bc cycle-13 targeted_tests (attempt 622a1987).
