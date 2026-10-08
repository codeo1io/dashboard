---
title: Targeted test-runner blind spots - web-config targets silently dropped, untracked new tests never selected
date: 2026-10-04
category: workflow-issues
module: dashboard
problem_type: workflow_issue
tags: [conductor, testing, vitest, test-selection, ci]
component: test_infra
---

# The generic impacted-tests runner under-covers this repo's split vitest layout

## Problem

Running the conductor targeted-validation command
(`run_repo_impacted_tests.py --mode fast -- <surface>`) for `src/server.ts`
derived **19** node test targets but the executed vitest invocation ran only
**18 files** — silently. The derived target
`web/src/operator/no-server-imports.test.ts` never executed, and neither of
the batch's **newly created untracked** test files
(`test/rate-limit-key-cap.test.ts`, `test/validate-dynamic-id-parity.test.ts`)
was ever selected. A green rc=0 therefore proved less than it appeared to.

Recorded in run `146d73f2` cycle:1 targeted_tests (attempt d89841d6, 2026-10-04);
the gaps were closed with explicit companion runs (1168 distinct tests green).

## Mechanism

Two independent structural blind spots, both repo-layout facts:

1. **Root-config include filter.** This repo splits its suite in two: the root
   `vitest.config.ts` includes `test/**/*.test.ts` only, and `package.json`'s
   `test` script is `vitest run && vitest run --config web/vitest.config.ts`.
   A generic runner that shells `vitest run <targets>` against the root
   config silently filters any `web/**` target — vitest reports fewer files,
   not a failure.

2. **Tracked-file enumeration.** The runner enumerates repo files via git;
   new test files not yet `git add`-ed (untracked, as conductor implement
   phases leave them) are invisible to target derivation.

## Prevention rule

- **Count check every time**: compare the runner's derived-target count to
  the vitest "Test Files" count in the output. Derived 19, executed 18 →
  something was filtered; find it before declaring the surface covered.
- **Run explicit companions** for (a) any `web/**` target via
  `npm exec -- vitest run --config web/vitest.config.ts <file>` and
  (b) every test file created in the current batch (`git status --porcelain`
  `??` entries under `test/` / `web/src/**`).
- Prefer surfacing this to the runner's owner over re-implementing selection
  in-repo; the count check is the cheap local guard.

## 2026-10-08 addendum — third leg: fs-scanning suites have no import edge

Run `8521c80a2583448594f57380855a6b50` (targeted `c8eae1bb`) hit a new leg of the
same class: MODIFIED tracked suites can be unselected too. The two read-only guard
corpora (`test/read-only-invariant-guard.test.ts`,
`test/readonly-invariant-guard.test.ts`) are acceptance fences for `src/server.ts`
but scan it as TEXT via `fs.readFileSync` — no import edge — so the impacted map
omitted them alongside the batch's NEW untracked parity suite
(`test/workflow-image-parity.test.ts`, the original leg-2 case). The map's 22
selected suites covered the two changed surfaces' import closure; all three of the
batch's own acceptance suites were supplementary.

Rule of thumb for any fix/test-bearing batch: run the batch-authored or
batch-modified acceptance suites explicitly (`vitest run <explicit paths>`) as a
supplementary focused run regardless of what the mapper selects — text-scanning
guards, snapshot suites, and file-tree assertions will never be import-selected.
The supplementary run is the only place a red acceptance suite surfaces at
targeted scope; the full-suite gate catches it later at strictly higher cost.

## Verification recipe

```bash
# what the engine derives (print-only, no execution):
python3 <release>/scripts/run_repo_impacted_tests.py --repo . --mode fast \
  --jobs 8 --print-only -- src/server.ts
# the dropped web target, run under the web config:
npm exec -- vitest run --config web/vitest.config.ts src/operator/no-server-imports.test.ts
# the batch's new untracked tests:
npm exec -- vitest run test/rate-limit-key-cap.test.ts test/validate-dynamic-id-parity.test.ts
```
