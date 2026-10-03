# Node 26 localStorage is undefined in vitest jsdom envs — re-bind in test-setup, not via --localstorage-file

module: dashboard
tags: `[testing, vitest, jsdom, node-26, webstorage]`
problem_type: environment-trap

## Problem

On Node 26.10.0, the four web suites that clear storage in setup (App /
AppShell / Notifications / InstallPrompt — 100 tests) all fail with:

    TypeError: Cannot read properties of undefined (reading 'clear')

at `window.localStorage.clear()`. The same suites are green on Node 24.
Nothing in the repo changed. The fleet's assess phases had been decomposing
this as a "known red class" for days.

## Root cause (probed first-hand, run 2c3b4c641212, 2026-10-04)

Node ≥ 26 ships experimental webstorage: `globalThis.localStorage` is an
own, **configurable getter** on the global; without `--localstorage-file`
it emits `ExperimentalWarning` and returns `undefined`.

Vitest 4's jsdom environment populates the test global by copying the jsdom
window's keys onto `globalThis` — but a key that ALREADY exists on
globalThis is not overwritten. So Node's broken getter survives, and every
`localStorage` read in tests is `undefined`. The probes that pin this:

- `window === globalThis` and `document.defaultView === globalThis` are both
  TRUE in the env (the jsdom window's own storage is unreachable — you
  cannot re-borrow it).
- `sessionStorage` — which Node does **not** pre-define — propagates from
  jsdom just fine (`typeof 'object'`). Only the pre-defined key is blocked.

## Rejected fixes

- `NODE_OPTIONS=--localstorage-file=<file>` (runner flag): works, but ONE
  backing file is shared across ALL concurrent fork workers — `clear()` /
  `setItem()` race across the 31-file suite. Also invocation-dependent
  (CI/local/IDE must all remember the flag).
- `poolOptions execArgv` in `web/vitest.config.ts`: same shared-file race,
  just config-owned.
- Re-borrow the jsdom window's storage: impossible — see `window === globalThis` above.

## Fix (landed as rm-608)

`web/src/test-setup.ts` re-binds the global to a fresh, in-memory Storage
literal per test file (object literal, so no index-signature gymnastics):

    if (typeof window !== 'undefined' && window.localStorage === undefined) {
      Object.defineProperty(globalThis, 'localStorage', {
        value: createMemoryStorage(), configurable: true, writable: true,
      })
    }

Each test file's environment gets tab-like, isolated storage — no flags, no
shared file. One benign `ExperimentalWarning` per file remains from the
single guard probe read. Result: full web project 31 files / 1172 tests rc=0
on Node 26.10.0; repo's first fully green `pnpm test` on Node 26.

## Notes

- The web half of the test script must run from the repo ROOT
  (`web/vitest.config.ts` sets `root: 'web'`); direct vitest from inside
  `web/` finds no test files.
- jsdom 30 evaluation (rm-271): if the major restores propagation, the
  guard's override branch stops firing — retire the seam in the same bump.
  `web/src/test-setup.ts` is the single seam owner either way.
