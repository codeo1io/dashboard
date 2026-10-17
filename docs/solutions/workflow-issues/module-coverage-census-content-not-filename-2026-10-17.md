---
title: A filename-based "untested module" census is not evidence — measure coverage by content (grep the import path), not by same-named test files
date: 2026-10-17
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - Selecting an rm-022-style coverage slice (picking "untested" src modules for new test files)
  - Claiming a module lacks coverage because no test/<module>.test.ts exists
  - Building a batch or stewardship request from a coverage census
---

# A filename-based "untested module" census is not evidence

## Symptom

Two consecutive phases of one maintenance cycle (stewardship 2026-10-16, then
implement 2026-10-17, run e178a9460f10 cycle:3) designed a test-coverage batch
around "the two untested modules" `src/github/app-client.ts` and
`src/github/query-registry.ts` — chosen because `test/app-client.test.ts` and
`test/query-registry.test.ts` did not exist. Both premises were wrong:

- `app-client` already had **four** differently-named suites pinning it:
  `test/app-client-timeout.test.ts`, `test/bounded-fetch-redirect.test.ts`,
  `test/transport-timeout-contract.test.ts`, plus integration use in
  `test/installations.test.ts`.
- `query-registry` was already covered by `test/query-shape-guard.test.ts`
  (registry completeness, template staticness, no-mutation invariants).

The cycle still landed `test/app-client.test.ts` and
`test/query-registry.test.ts` (they pin the fixture-server contract shape and
the registry export surface directly, which is additive), but they are not
"first coverage" and must never be cited as closing a coverage hole.

The same failure mode produced a second, subtler error in the same census: a
`find src` listing was truncated to the first ~10 modules and the rest of the
"uncovered" list was reconstructed from expectation — naming files that do not
exist (`src/redact.ts`, `src/auth/cookies.ts`). The census output was never
re-verified against the filesystem before decisions were made from it.

## Root cause

1. **Test-file naming is not a coverage index.** Suites in this repo are named
   after the *behavior* they pin (timeout, redirect, transport contract, shape
   guard), not after the module file they import. A module can be fully covered
   with zero same-named test files.
2. **Truncated tool output read as complete.** A `find | head -30`-style census
   fed later reasoning as if exhaustive.

## Prevention rule

When a phase needs a coverage census (rm-022 slice selection, batch
prioritization, stewardship surface pinning):

- **Content census, not filename census.** For each `src/**.ts` module, grep
  the module's repo-relative import path across `test/` and `scripts/`:

  ```sh
  for f in $(find src -name '*.ts' ! -name '*.d.ts' | sort); do
    grep -rql "$f" test/ scripts/ || echo "UNCOVERED $f"
  done
  ```

  A hit means *some* suite or script imports the module (transitive runtime
  coverage may still be partial — but absence of a hit is the only
  filename-independent negative you can assert cheaply).

- **Never trust a truncated listing.** Pipe censuses to a file or `wc -l`
  first, and re-verify every file the census names with `ls` before using it
  in a decision (the invented-files error would have been caught by one `ls`).

- **Re-derive at the consuming phase.** A census made at prioritize time can
  be stale by implement time (landings move fast in this fleet); the phase
  that writes the file owns the liveness check.

## Verification

The corrected content census for this repo (2026-10-17, base 7042635,
re-run at review-fix) reports **16** truly unimported modules: the 13-module
`src/gateway/operator-contract/**` cluster plus
`src/gateway/operator-fixture-config.ts`, `src/listener/config.ts`, and
`src/routes/api.ts` (the last transitively covered via app-level suites).
The contract cluster and its two adjacent gateway modules are a contested
in-flight lane, excluded from coverage slices by congestion, not by coverage
state; `src/listener/config.ts` is the one remaining non-contested,
content-verified coverage hole.
