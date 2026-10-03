# SPA-shell fixture traps: `</head>`-replace injection and the real AggregatorSnapshot shape

module: dashboard
tags: `[testing, fixtures, spa-shell, server, typescript]`
problem_type: fixture-trap

## Problem

Writing new fixture tests against the `/` SPA-shell handler
(`buildDashboardApp` + a temp `webDistRoot`) fails in two silent ways if
the fixtures are minimal:

1. **No meta injection.** `loadSpaShell()` injects the push-enabled meta by
   `replace('</head>', …)`. A minimal fixture like
   `<!doctype html><title>x</title>` contains no `</head>`, so the served
   body comes back VERBATIM and any assertion on the injected meta fails
   (or, worse, a "byte-identical stale shell" comparison passes for the
   wrong reason — both bodies are the raw fixture).
2. **Wrong snapshot shape.** Copying a `getSnapshot: () => ({…})` literal
   from memory/another module gives `check-types` errors
   (`kind: 'operator-snapshot'` does not exist). The real
   `AggregatorSnapshot` is
   `{repos, staleBanner, driftCount, enumerationIncomplete, refreshedAt,
   refreshDurationMs, refreshDegraded}` — see `test/dashboard.test.ts`'s
   `makeSnapshot()` for the canonical minimal literal.

## Fix pattern (landed as rm-609's tests)

- Always write the fixture as a full document:
  `<!doctype html><html><head><title>shell</title></head><body><div
  id="root"></div></body></html>` — then the served body contains the
  injected meta and byte-identity assertions mean what they say.
- Copy `getSnapshot` literals from `makeSnapshot` in `test/dashboard.test.ts`,
  not from prose.
- Helpers returning `buildDashboardApp(...)` must be `async` (eslint
  promise-returning rule).

## Reference

The rm-609 fixture pair (stale-shell 200 after dist swap + exactly-one
throttled warn; cold-start 404) lives in `test/static-assets.test.ts`
under `describe('SPA shell cache — stale serve on transient reload
failure (rm-609)')`, including the `vi.spyOn(logger, 'warning')` spy
filtered to the exact message.
