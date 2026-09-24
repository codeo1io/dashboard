---
title: Live GitHub rejected our GraphQL query for 4+ days while CI stayed green — transport-faking tests cannot validate query syntax
date: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: github_data_path
severity: high
applies_when:
  - Writing or editing GraphQL (or any DSL) inside JS/TS template literals that are sent verbatim to a remote API
  - A test suite stubs/fakes the transport layer for all queries against a template
  - Adding comments, formatting, or interpolation to an exported query template
  - Deciding what a scheduled "reality canary" should check
symptoms:
  - Every real request fails while every test passes; the feature degrades to fallback/stale data with no red signal
  - The API error is a parse-level rejection, e.g. GitHub GraphQL `Expected NAME, actual: UNKNOWN_CHAR ("/")`
  - The offending line is a `//`-style comment inside the template literal (GraphQL comments are `#`-prefixed)
solution: |
  Found by run 6fe26972 assess (2026-09-24): `src/github/aggregator.ts` carried
  `// GraphQL max page size …` comments INSIDE both REPO_STATUS_QUERY template
  literals, introduced 7de0de3 (2026-09-20). The transport sends the template
  unmodified, and GitHub's GraphQL parser rejects `//` outright — so every
  per-repo status fetch fell into the catch and the whole board rendered
  stale/unknown with zeroed counts for 4+ days. Every aggregator suite either
  fakes the transport (27 tests in test/aggregator.test.ts) or exercises the
  parser offline (test/aggregator-invariants.property.test.ts, rm-144) — none
  executes a real query, so no suite could see it; CI was green throughout.

  Fix (cycle-12 B1): convert to `#`-style comments, EXPORT both templates as the
  shared seam, and add three layered preventions:

  1. Structural guard in the suite — `test/query-shape-guard.test.ts` imports
     every exported query template and asserts none contains a `//`-prefixed
     line, plus parameter/field-shape parity checks. Negative-verified: inject a
     `//` line, watch it red, restore.
  2. Reality canary — `scripts/graphql-canary.ts` +
     `.github/workflows/canary.yaml`: weekly, GITHUB_TOKEN-only, read-only,
     zero-install; executes the EXACT exported template against the real API and
     sha256-logs the query text so drift is diffable. Red means "the real API
     would reject our query today".
  3. Live-proof at implement time — run the canary once by hand before shipping
     (`GITHUB_TOKEN=$(gh auth token) node scripts/graphql-canary.ts`), which is
     how the fix was proven against production in the same phase.

  Also hardened during live testing: the canary validates `GITHUB_REPOSITORY`
  with a regex before use — a malformed value (`/dashboard`) silently targeted
  the wrong repo when the fallback only guarded `undefined`.
prevention: |
  Any string built in TypeScript but interpreted by a different parser (GraphQL,
  SQL, YAML, regex) needs at least one test that exercises the REAL parser or the
  REAL endpoint on the shipped string — export the template and consume the
  export, never a copy. A scheduled canary that runs one real query is cheaper
  than one bad day of silently stale data. When you add a comment inside a
  template literal, ask which comment syntax the RECEIVING parser accepts, not
  the surrounding language.
tags:
  - graphql
  - template-literals
  - testing
  - canary
  - ci-signal-truth
---
