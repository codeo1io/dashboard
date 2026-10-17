---
title: Web-suite flake (rm-596/rm-487/rm-208 class) — focus-dispatch passive-effect races, a non-configurable serviceWorker stub, and dismissal-latch storage hygiene
date: 2026-10-09
category: workflow-issues
module: dashboard
tags: [vitest, jsdom, react-testing-library, act, localstorage, sessionstorage, test-isolation, flaky-test, serviceWorker]
problem_type: test_flake
---

# Web-suite flake (rm-596/rm-487/rm-208 class) — focus-dispatch passive-effect races, a non-configurable serviceWorker stub, and dismissal-latch storage hygiene

## Problem

The web project suite (`vitest run --config web/vitest.config.ts`, 33 files / 1212
tests) failed intermittently under full-suite runs while every file passed in
isolation — the class recorded by the 2026-10-05 assessment as a ~1-in-1180
full-suite failure (ledger rm-651, nominally about the rm-596 AppShell restore
tests). During the 2026-10-09 implement phase the suite was looped with logs
until two distinct mechanisms were captured first-hand.

## Mechanism 1 — focus dispatch races the passive-effect listener attach (captured, App.test.tsx)

`web/src/App.test.tsx` rm-487 fail-closed test: render → `waitFor` for the
`unread-auth-expired` testid → dispatch `window` `focus` → `waitFor` that the
probe spy was called. The state flip that renders the expired badge can land
**outside `act`** (it originates in the poll hook's promise chain). React 19
commits the re-render, but the `useEffect` that attaches the focus listener is
a **passive effect flushed later**. When the `waitFor` assertion sees the
testid before that flush, the subsequent `act(() => dispatchEvent('focus'))`
runs the dispatch *inside the same act batch* — before the listener attaches —
so nothing handles it and the spy-count `waitFor` times out after 1000ms
(captured: full-suite run failing `expected +0 to be 1` at ~1138ms elapsed;
~1-in-8 full-suite runs under 33-file parallel contention).

**Fix (test-only):** flush pending passive effects with a no-op
`await act(async () => {})` between the state-establishing `waitFor` and the
focus dispatch — applied at the three exposed sites in `App.test.tsx`
(rm-487 fail-closed, rm-487 re-login recovery, rm-208 stale-badge "Failure 1").
Where the dispatch already followed an awaited act/timer window (the rm-487
retry legs, the visibilitychange test), the listener is guaranteed attached
and no flush was added.

## Mechanism 2 — non-configurable `navigator.serviceWorker` stub poisons later tests under any non-default order (captured, Notifications.test.tsx)

The 'synthetic push click' test defined `navigator.serviceWorker` with
`writable: true` but **no `configurable`** — an own, non-configurable property
that the test never restored. Any *later* `Object.defineProperty` on
`serviceWorker` (the file has three sibling stub sites) then throws
`TypeError: Cannot redefine property: serviceWorker`. Default test order runs
the poisoner last, so the suite is green; `--sequence.shuffle` reproduced it
2-of-3 single-file runs (two tests failing).

**Fix (test-only):** the site now captures the original descriptor, defines
with `configurable: true`, and restores/deletes in a `finally` — the exact
pattern its three sibling sites already used.

## Mechanism 3 — dismissal-latch storage hygiene (latent gaps, closed defensively)

`AppShell.test.tsx` reset `window.localStorage` but never
`window.sessionStorage` nor leftover `push-enabled` meta tags;
`Notifications.test.tsx` / `InstallPrompt.test.tsx` cleared storage only in
`beforeEach`, so a *failing* test's dismissal state survived into the rest of
the file. All three suites now clear both storages (and the meta tags where
relevant) in `beforeEach` **and** `afterEach`. No product code changed.

### Host vector (recorded premise, not reproduced here)

The original assessment also recorded a Node-26 host vector: where Node's
file-backed webstorage is active, a bare `localStorage` reference outside a
jsdom-populated global resolves to a *persistent* store. This machine cannot
reproduce it (PATH node v22.22.0 and the corepack-managed node both report
`typeof globalThis.localStorage === 'undefined'`). Neutralization recipe for
Node-25+/26 hosts: give each invocation a throwaway backing file —
`NODE_OPTIONS='--localstorage-file=/tmp/vitest-localstorage.$$' corepack pnpm test`
— never a shared path.

## Verification (2026-10-09, run d823703c implement)

| Check | Result |
| --- | --- |
| `Notifications.test.tsx --sequence.shuffle` ×3 (post-fix) | 3× green |
| Full web suite, plain order | 6 consecutive green (4 + 2) after the fixes; 1 captured failure before (runs 1–14 logged to /tmp/web-run*.log) |
| Full web suite `--sequence.shuffle` | green (failed before the serviceWorker fix) |
| Full web suite `--no-file-parallelism` | green |
| `AppShell.test.tsx` focused | 1 file / 33 tests green |

Reproduction loops if ever needed:

```sh
corepack pnpm exec vitest run --config web/vitest.config.ts --sequence.shuffle
for i in $(seq 1 10); do corepack pnpm exec vitest run --config web/vitest.config.ts || echo "FAILED run $i"; done
```
