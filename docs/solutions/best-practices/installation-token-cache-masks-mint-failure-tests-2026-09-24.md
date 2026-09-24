---
title: Module-scoped installation token cache masks mint-failure tests that reuse installation ids
date: 2026-09-24
category: best-practices
module: dashboard
problem_type: best_practice
component: github_installations_tests
severity: medium
applies_when:
  - Writing or extending tests for src/github/installations.ts that stub the token-mint or list-repos path to fail
  - A new per-installation failure test passes its assertions vacuously (skippedInstallations stays empty, repos still enumerate)
  - Reusing an installation id that an earlier test in the same file already minted a token for
tags:
  - tests
  - isolation
  - token-cache
  - installations
---

# Module-scoped installation token cache masks mint-failure tests that reuse installation ids

## Problem

Cycle-10 B1 (rm-164, run a4a97e30 implement) added tests asserting that a
failing per-installation token mint records a skipped installation. The first
draft reused installation id `1` — an id an earlier test in the same file had
already minted a token for. The test failed its assertions with
`skippedInstallations: []` and a healthy repo list, as if the mint had never
been stubbed to fail.

Root cause: `src/github/installations.ts` keeps a module-level installation
token cache (~55-minute TTL, keyed by installation id) with no per-test reset
hook. Vitest runs the file in one module context, so a token minted by an
earlier test satisfies `enumerateRepos` for the reused id before the failing
mint path is ever reached. The stub is not broken — the code under test never
calls it.

This is a silent-pass hazard, not a loud one: the suite reports the failure as
a wrong assertion (empty skip list), which reads like a production-logic bug
and sends you debugging the skip accounting instead of test isolation.

## Solution

Give each per-installation failure test installation ids no earlier test in
the file has used (e.g. `41`, `42`). The cache miss forces the real mint path
through the stubbed failure.

If this bites more than once, the durable fix is a reset seam: export a
`resetInstallationTokenCacheForTests()` (or inject the cache) and call it from
the file's `beforeEach`, mirroring how other module state is reset elsewhere
in the suite. Not done in cycle-10 — one occurrence did not justify widening
the auth-path surface.

## Prevention

- Per-installation failure tests own their installation ids; never copy an id
  from a neighboring happy-path test.
- Symptom signature to recognize: a failure-stub test that "passes" its way to
  an empty skip list and populated repos means a cached token served the
  request — check `installationTokenCache` hits before suspecting the skip
  accounting.
- When adding module-level caches to production code, ask whether tests will
  need to evict them; a one-line test-only reset export is cheaper than an
  id-allocation discipline nobody enforces.

## References

- `src/github/installations.ts` — module-level token cache (keyed by
  installation id, ~55-minute TTL, no reset hook).
- Cycle-10 batch doc: `docs/prioritization/2026-09-24-cycle-10-batch.md`
  (B1, rm-164).
