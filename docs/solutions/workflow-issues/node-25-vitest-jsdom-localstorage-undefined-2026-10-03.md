# Node >= 25 makes vitest jsdom tests see an undefined localStorage — guard-shim the test setup

module: dashboard
tags: [vitest, jsdom, node, test-infra]
problem_type: dev-environment

## Problem

On any Node >= 25 host (the fleet sandbox runs Node v26.10.0), roughly 100 of
the 1171 web tests fail wholesale with `TypeError: Cannot read properties of
undefined (reading 'clear')` — the first site is `web/src/App.test.tsx`'s
`beforeEach` calling `window.localStorage.clear()`. CI (pinned Node 24) stays
green, so the failure looks flaky or "environmental" and is easy to misroute
to the test that trips first rather than the environment.

## Mechanism (probed first-hand 2026-10-03, run d0305cd7b819)

1. Node >= 25 defines an experimental `localStorage` **own property on
   globalThis** whose getter always resolves to `undefined` unless the process
   started with `--localstorage-file`. It is configurable — that is the
   property that makes the workaround possible.
2. vitest's jsdom environment populates the DOM globals from the jsdom
   window's key list but **skips keys Node already defines**
   (vitest-dev/vitest#10867), so `window.localStorage` resolves to Node's
   always-`undefined` getter instead of jsdom's Storage.
3. Borrowing the real jsdom Storage is **impossible**: in the vitest jsdom
   environment `window`, `globalThis`, and `document.defaultView` are all the
   same populated global object — there is no other window to reach into
   (probed: `document.defaultView === globalThis`).

So every `window.localStorage` / `globalThis.localStorage` access throws or
reads `undefined`. `sessionStorage` is unaffected in practice only because
Node does not define it; nothing in this repo uses it either.

## Diagnosis recipe

```bash
node -e 'const d = Object.getOwnPropertyDescriptor(globalThis, "localStorage"); console.log(d && {hasGet: !!d.get, configurable: d.configurable})'
# Node >= 25 without --localstorage-file: { hasGet: true, configurable: true }
pnpm exec vitest run --config web/vitest.config.ts src/App.test.tsx
# wholesale TypeError failures at the first localStorage touch
```

## Solution (interim, in-tree since 2026-10-03)

`web/src/test-setup.ts` carries a guarded block that fires **only when the
key is actually broken** (`globalThis.localStorage === undefined`): it deletes
the configurable own property and installs a spec-shaped in-memory Storage
(getItem/setItem/removeItem/clear/key/length). On Node 24 and under vitest >= 5
the guard is inert — the block is trivially removable and its header names the
deletion window (the vitest 5 / jsdom 30 majors bump, ROADMAP rm-271).

A tripwire suite (`web/src/test-env-localstorage.test.ts`) exercises the full
Storage interface plus the `globalThis`/`window` alias identity, so a Node
bump that outruns the shim goes loudly red instead of producing this
wholesale-failure signature again.

## Prevention rules

- Treat a wholesale, same-signature failure across many web tests as an
  **environment** signal first: probe the globals before reading individual
  test bodies.
- Never blind-assign `globalThis.localStorage = …` — Node's own property is
  configurable but assigning over an existing getter leaves the getter; the
  working sequence is `delete` then assign.
- The durable fix is the vitest/jsdom majors window (vitest 5.0.3+ / jsdom 30);
  the vitest 4.x line is a dead end (the Node-26 backport PR vitest#10873 was
  closed unmerged). Do not attempt a vitest-4.x backport again.

## References

- ROADMAP rm-548 (signals, acceptance, both-leg proof: 31 files/1171 green on
  hosted Node 24 and 27/27 on sandbox Node 26).
- vitest-dev/vitest#10867 (jsdom environment drops keys Node defines).
