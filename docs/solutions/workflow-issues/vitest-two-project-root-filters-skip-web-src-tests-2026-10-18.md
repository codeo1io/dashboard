---
title: web/src tests silently no-op when named to the root vitest project
date: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: silent-test-skip
component: vitest-config
severity: high
applies_when:
  - running a single web/ test file directly with pnpm exec vitest
  - CI or a maintenance phase validating only the files a batch touched
  - adding a new test file under web/src and checking it runs
---

## Problem

This repository has TWO vitest projects: the root project (include `test/**/*.test.ts`,
`.opencode/impeccable/**`) and the web client project defined by `web/vitest.config.ts`
(include `src/**/*.{test,spec}.{ts,tsx}` with `root: 'web'` — see both configs). When you name a
`web/src/**` file as a positional filter to the default root config, vitest treats the
arguments as substring filters against each project's include list: the root project has
no match, the web project is not part of that invocation at all, and vitest exits **0**
having run only the files that DID match. A combined run like

```sh
pnpm exec vitest run web/src/sw.test.ts test/static-assets.test.ts ...
```

reports `4 passed (4)` — the four `test/` files — while `web/src/sw.test.ts` never
executed. The exit code is green, so nothing surfaces the omission.

Running from inside `web/` does not help either: the web config's `root: 'web'`
is resolved against the working directory, so vitest resolves `.../web/web` and finds no files.

## Solution

Invoke the web project explicitly from the repository root:

```sh
pnpm exec vitest run --config web/vitest.config.ts web/src/sw.test.ts
```

or rely on the repo-canonical `pnpm test`, whose script already points at
`web/vitest.config.ts` (see
[related: vitest4 cac cli rejects jest-style flags](vitest4-cac-cli-rejects-jest-style-flags-2026-09-21.md)).

## Prevention rule

When a focused run names N test files, the reported `Test Files` count MUST equal N
before treating the run as evidence — a green exit with fewer files means some named
suite was silently skipped (observed live in the 2026-10-18 cycle: the first combined
run of the rm-2003 batch reported 4 files for 5 named inputs; corrected invocation ran
the missing suite, 42/42). New `web/src/**` test files should be discovered once
through the web config before they are trusted.
