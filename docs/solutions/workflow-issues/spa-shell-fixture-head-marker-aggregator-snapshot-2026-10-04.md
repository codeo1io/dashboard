# SPA-shell fixture tests: the index.html needs a `</head>` and the snapshot must match AggregatorSnapshot

module: dashboard
tags: `[testing, fixtures, server, spa-shell, typescript]`
problem_type: fixture-trap

## Problem

Two independent surprises when writing fixture tests against the `/`
SPA-shell handler (`src/server.ts`):

1. A minimal `index.html` fixture like `<!doctype html><title>x</title>` is
   served VERBATIM — none of the shell injection happens. Assertions on the
   injected content fail confusingly.
2. Passing a hand-guessed `getSnapshot` literal to `buildDashboardApp`
   fails check-types with "not assignable to parameter of type
   'AggregatorSnapshot'" — the real shape differs from what the older
   dashboard tests suggest.

## Root causes

1. `loadSpaShell()` injects the push-enabled meta by `replace('</head>', ...)`.
   No `</head>` in the fixture → no injection → raw file served. Use a
   complete document: `<!doctype html><html><head><title>t</title></head><body><div id="root"></div></body></html>`.
2. `buildDashboardApp`'s `getSnapshot` must return `AggregatorSnapshot` —
   `{repos, staleBanner, driftCount, enumerationIncomplete, refreshedAt,
   refreshDurationMs, refreshDegraded}` (see `test/dashboard.test.ts`
   `makeSnapshot` for the canonical minimal literal). A guessed
   `{kind: 'operator-snapshot', runs, ...}` shape belongs to a different
   type entirely.

## Recipe

- Build the app per-fixture with `mkdtemp` + `DASHBOARD_WEB_DIST` pointing
  at the temp dir (existing pattern in `test/static-assets.test.ts`);
  remember `buildDashboardApp` returns a promise — helper arrows must be
  `async` (eslint requires async on promise-returning functions).
- For stale-shell/TTL behavior: load once, `rmSync(index.html)`, advance
  past `SPA_SHELL_CACHE_TTL_MS` (5s), request again, and assert on a
  `vi.spyOn(logger, 'warning')` filtered to the expected message.

## Found

2026-10-04, run 2c3b4c641212 implement phase (rm-609 fixture pair);
recorded so the next fixture author skips the two failed iterations.
