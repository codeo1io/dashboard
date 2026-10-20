---
title: Web build-output guard tests fail confusingly on a stale web/dist
date: 2026-09-25
category: build-errors
module: dashboard
problem_type: build_output_testing
component: development_workflow
severity: low
applies_when:
  - invoking vitest directly on web suites (pnpm vitest run --config web/vitest.config.ts ...) instead of pnpm test
  - debugging sudden failures in src/sw.test.ts or src/privacy/build-output-no-tracking.test.ts
---

## Problem

Running `pnpm vitest run --config web/vitest.config.ts` directly — the
natural form for focused web work — skips the root `pretest` hook that runs
`pnpm build:web`. The build-output guard tests (`src/sw.test.ts`,
`src/privacy/build-output-no-tracking.test.ts`) scan the *shipped* bundle
under `web/dist`, so against a stale or missing bundle they fail in bulk:

- `GUARD: no reference to tracker token "<token>" in the shipped output`
  (11 failures), `GUARD: the JS bundle contains no third-party origin…`,
  SW kill-switch guards (`exists and is non-empty`, `self.__WB_MANIFEST`
  substitution, …) — 21 failures across exactly those 2 files.

The signature is misleading: it looks like a tracking/SW regression in the
change under test, when the real cause is just that the guards are reading
yesterday's (or no) build output.

## Solution

Build before any direct web-suite invocation that touches dist-reading
tests:

```sh
pnpm build:web && pnpm vitest run --config web/vitest.config.ts [files]
```

or use `pnpm test` (whose pretest builds the client) when running broader.
When triageing, check *which files* failed first: failures confined to
`sw.test.ts` + `build-output-no-tracking.test.ts` with everything else green
⇒ stale `web/dist`, not a code regression. Rebuilding and re-running is the
30-second confirmation.

## Verification

- Direct run without build: 2 files failed | 26 passed, 21 tests failed
  (all in the two guard files).
- `pnpm build:web` (exit 0) then the same command: 28 files / 1085 tests
  passed.

Found during run 9c8505bc cycle-13 targeted_tests (attempt 622a1987).
