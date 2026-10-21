---
title: Impacted-test derivation lists web/src test files the root vitest leg never executes — always supplement the web leg
module: 'testing'
tags: ['vitest', 'targeted-tests', 'web-workspace', 'run-repo-impacted-tests']
problem_type: 'silently-skipped-tests'
date: '2026-10-15'
---

# Impacted-test derivation lists web/src test files the root vitest leg never executes — always supplement the web leg

## Problem

The conductor's targeted dispatches run
`run_repo_impacted_tests.py --mode fast -- <changed src surfaces>`, which derives
impacted test files by stem-matching and dependency heuristics across the WHOLE
repo — including `web/src/**/*.test.ts(x)`. But this repository runs vitest as two
projects: the root config's include set covers `test/**` only, and `web/src` runs
under its own `web/vitest.config.ts`. When the derived list is handed to the root
project, the `web/src/**` entries are silently dropped (they match no include
pattern and vitest does not error). A dispatch can therefore report a full derived
list and a green pass while the web-side tests for exactly the impacted surfaces
never executed.

Observed 2026-10-15 (run ccde661e, targeted_tests c2917a16): 25 derived files →
22 executed on the root leg; the 3 dropped were `web/src/**` test files.

## Symptoms

- Derived-file count > executed-file count in the impacted-tests log.
- `web/src/**` paths present in the derivation list but absent from the vitest
  "Test Files" tally.

## Solution / prevention rule

Whenever the derivation list (or the changed surfaces themselves) contains
`web/src/**` files, run the web leg explicitly after the canonical command:

```sh
npm exec -- vitest run --config web/vitest.config.ts \
  web/src/api/monitoring.test.ts web/src/views/Monitoring.test.tsx # ...derived web files
```

The canonical targeted command stays the authoritative evidence (it runs
verbatim); the web leg is a supplement recorded alongside it, never a
substitution. `pnpm test` is unaffected — its `pretest` rebuild and both-project
invocation cover both legs for full validation.

## Root cause

Single-project invocation of a dual-project suite; the tool derives repo-wide,
the executor filters per-project.
