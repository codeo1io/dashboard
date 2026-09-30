---
title: A fail-fast constructor contract breaks every mode-enabling test helper — sweep all of them, not the touched suites
date: 2026-09-26
category: best-practices
module: dashboard
problem_type: best_practice
component: development_workflow
severity: medium
applies_when:
  - Adding startup validation / fail-fast throws to a shared app factory (buildDashboardApp)
  - A new required config or acknowledgement env gates a mode (gateway mode, fixture mode)
  - Verifying a change batch by running only the test suites whose files you touched
---

## Problem

Cycle 6 (run 4084c786aa67, 2026-09-26) made gateway mode fail fast at startup
unless `DASHBOARD_GATEWAY_PROXY_ACK=same-origin` is set (rm-127's explicit
topology guard, `src/server.ts` buildDashboardApp). The implementation updated
the two gateway-mode test helpers it knew about — `test/gateway-auth.test.ts`
and `test/operator-route-redirect.test.ts` — and their suites went green.

The fleet's targeted validation runner (`run_repo_impacted_tests.py`, closure
derived from the changed server surfaces) then selected a WIDER set: 14 files,
including `test/operator-ui.test.ts`, whose `buildTestApp` helper enables
gateway mode (`gatewayOperatorSessionEnabled: true`) without the new
acknowledgement. First run: **32 tests red**, all throwing the new fail-fast
error. The helper was invisible to the implement phase because implement-phase
verification ran the touched-suites closure, not the mode-enablers closure.

## Root cause

A constructor contract change ("gateway mode now requires an acknowledgement")
attaches to a *mode*, and every test helper that enables that mode constructs
through the same factory. Suite-level or file-level closures answer "what did I
touch", not "who constructs in this mode" — the two sets diverge exactly when a
helper lives in a file the change never edited.

## Fix

One line in the third helper, same shape as the other two:

```ts
gatewayProxyAcknowledged: resolved.gatewayOperatorSessionEnabled === true,
```

i.e. the helper derives the acknowledgement from the mode opt itself — so any
helper enabling gateway mode automatically satisfies the contract instead of
each helper opting in by hand. Re-run: 14 files, 743/743 green.

## Lesson / prevention rule

1. **Constructor-contract changes demand a mode-enablers sweep, not a
   touched-files sweep.** Before declaring a fail-fast startup contract done,
   grep for every construction site that enables the gated mode
   (`grep -rn "gatewayOperatorSessionEnabled" test/ web/` here — three hits,
   not two) and update or derive-from-opt in ALL of them.
2. **Prefer derived opts over hand-placed acknowledgements in helpers** so the
   contract is satisfied by construction wherever the mode turns on.
3. **Trust the impacted-tests runner's graph closure over your touched-suites
   set** — it selects by call graph from the changed surfaces and will find
   constructor sites you never opened. Run it (or its equivalent) before
   claiming a batch green when the change touches a shared factory.
