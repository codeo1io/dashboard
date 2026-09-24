---
title: Targeted vitest invocations bypass pretest — suites hitting `/` 404 on missing web/dist
date: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: low
applies_when:
  - 'A targeted `pnpm exec vitest run test/<file>.test.ts` (or any bare `vitest run` that is not `pnpm test`) fails with unexpected 404s on `/`'
  - 'The failing tests exercise the served PWA surface (gateway-auth push-HTML, operator-ui redirects) right after you edited `src/server.ts`'
  - '`web/dist` is absent or older than your working tree changes'
tags:
  - vitest
  - pretest
  - web-dist
  - false-regression
  - targeted-tests
---

# Targeted vitest invocations bypass pretest — `/` suites 404 on missing web/dist

## Problem

Cycle-10 implement (conductor run 449ed1a5, attempt eae30057) had just landed
the rm-166 memoized `web/dist` push-index serve in `src/server.ts` when a
targeted run of `test/gateway-auth.test.ts` started failing with 404s on `/`.
The change was the obvious suspect — it touches exactly the handler that
serves `/`.

It was not the change. The repo's `pretest` script (`pnpm build:web`, see
`package.json`) only runs through `pnpm test`. Direct invocations like
`pnpm exec vitest run test/gateway-auth.test.ts` skip it, so the suite ran
against a stale/absent `web/dist` and every route that serves the built client
404'd. Proven by A/B: `git stash push -- src/server.ts` + rerun still failed
1 test (the failure survived the suspect change being removed), and
`pnpm build:web` before the next targeted run turned the file green 43/43.

## Solution

- Before blaming a served-route regression on an in-flight `src/server.ts`
  change, A/B it: `git stash push -- <suspect file>`, rerun the failing test,
  `git stash pop`. A failure that survives the stash is environmental.
- Check the artifact, not the code: `ls -la web/dist` (absent/stale ⇒ build
  first with `pnpm build:web`).
- Repo-canonical full suite remains `pnpm test` — it wires the pretest build
  (this is also what the CI Main Test job runs; see
  `docs/solutions/workflow-issues/vitest4-cac-cli-rejects-jest-style-flags-2026-09-21.md`
  for the canonical invocation spellings).

## Prevention rule

Any bare `vitest run` that exercises routes serving `/` requires a fresh
`web/dist`: either run `pnpm test` (pretest-wired) or `pnpm build:web` first.
Treat `/` 404s in pretest-less targeted runs as a missing-build artifact until
the stash A/B says otherwise — never as a src regression.

## Related

- `vitest4-cac-cli-rejects-jest-style-flags-2026-09-21.md` — canonical suite
  invocations and flag dialect.
- `pwa-service-worker-registration-invisible-to-unit-tests-2026-06-25.md` —
  another assembled-surface behavior invisible to naive unit runs.
- ROADMAP rm-166 (cycle-10 B2) — the change the false regression pointed at.
