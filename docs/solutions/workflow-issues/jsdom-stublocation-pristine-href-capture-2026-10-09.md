---
title: Capture the pristine href when stubbing jsdom location for redirect tests
date: 2026-10-09
category: workflow-issues
module: test
problem_type: test-order-dependence
component: vitest
severity: info
tags: [jsdom, location-stub, redirect-assertion, vi-waitfor, test-isolation]
---

## Problem

`web/src/shell/AppShell.test.tsx` (logout flow, batch `3eea27cbd1e3`) stubs `window.location`
per-test to assert post-logout redirects. The stub helper originally synthesized its state at
CALL time — including the `href` it initialized the fake location with. After the first test in a
file performed a redirect assignment, every later test's `stubLocation()` call inherited the
ALREADY-REDIRECTED `href` from the shared jsdom window, because the real `location` object (and
the stub wrapping it) persisted across tests within the file.

Two failure modes, both silent:

1. **Vacuous passes** — a later test's `vi.waitFor(() => expect(window.location.href).toBe(X))`
   resolved instantly because the inherited href already equaled X from an earlier test's
   redirect, so the assertion never exercised the code under test.
2. **Order dependence** — the same test passed when run with `-t` isolation and failed (or
   falsely passed) in full-file runs, depending on which earlier test redirected where.

The file's suite was green under per-test invocation while its redirect coverage was empty —
the classic test-order-dependence trap, invisible until a sibling test changed redirect targets.

## Diagnostic recipe

```bash
pnpm exec vitest run --config web/vitest.config.ts web/src/shell/AppShell.test.tsx   # full file
pnpm exec vitest run --config web/vitest.config.ts web/src/shell/AppShell.test.tsx -t '<one redirect test>'
```

If a redirect assertion passes in full-file mode but the test never passes when run alone
against a fresh location — or if commenting out an EARLIER redirect test flips a LATER test's
result — the location stub is inheriting redirected state.

## Fix

Snapshot the pristine href ONCE at module load, before any test mutates location, and have
`stubLocation()` reset to that snapshot instead of synthesizing from current state:

```ts
// module scope — runs before any test redirects
const pristineHref = window.location.href;

function stubLocation(): Location {
  const url = new URL(pristineHref);
  // ...build the writable location stub from `url`, not from window.location at call time
}
```

With that, every test starts from the same navigation state regardless of execution order, and
redirect assertions can only pass by exercising the code under test.

## Prevention rule

Any file-level `window.location` stub must (a) capture pristine navigation state at module
scope, (b) reset to it in the stub constructor (or `beforeEach`), and (c) assert redirects
against an EXACT expected value — `waitFor` around a truthy/inherited href is not a redirect
test. When adding a redirect test to a file that already has them, run the full file, not just
the new test.

## Evidence

Found and cured in batch `3eea27cbd1e3` (rm-501 logout half), implement attempt `4207b512`:
the three new hung-fetch redirect tests exposed the inherited-href vacuity in the pre-existing
suite; full-file battery 4 files / 170 tests green post-fix, and `pnpm test` full suite
(33 web files / 1223 tests) green under the same tree.
