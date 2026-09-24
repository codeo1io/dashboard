---
title: vitest 4's cac CLI rejects jest-style flags (--runInBand) — use --no-file-parallelism or pnpm test
date: 2026-09-21
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - running the test suite with CI-orchestrator supplied commands or ported jest-era invocations
---

## Problem

A dispatched validation ran `npm test -- --runInBand` (a jest-style
invocation). npm shell-appends the flag to the package.json test script's
LAST vitest invocation (`vitest run --config web/vitest.config.ts
--runInBand`), and vitest 4's cac-based CLI rejects unknown long flags
outright:

```
CACError: Unknown option `--runInBand`
```

The failure happens during CLI parsing — before a single test runs — so it
looks like a suite failure but is pure flag dialect.

## Solution

- Serialization equivalent: `--no-file-parallelism` (vitest 4 spelling).
- Repo-canonical full suite: `pnpm test` (what the CI Main Test job runs —
  `vitest run && vitest run --config web/vitest.config.ts` via the pretest
  build).
- One project at a time: `npx vitest run test/<file>.test.ts` (server) or
  `npx vitest run --config web/vitest.config.ts` (web).

Known vitest 4 siblings (already repo-documented): the `basic` reporter was
removed; `testTimeout` had to be raised to 30s for web suites.

## Prevention rule

Never dispatch or script jest spellings (`--runInBand`, `--runInBand`-style
aliases, `--detectOpenHandles`) into this repo; validate orchestrator
supplied commands against the vitest 4 CLI before treating their failure as
a test regression.
