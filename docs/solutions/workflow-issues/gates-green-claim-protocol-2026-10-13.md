---
title: A "gates green" claim must cover build:web — direct vitest hides a broken pretest
date: 2026-10-13
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
---

## Problem

On 2026-10-12 the merge commit `b8fb532` landed on `main` with a message claiming
"3052/3052 vitest green", while the same tree could not build its own client:
`web/src/index.css` carried a stray `[data-role="run-output-coalesced"] {` selector
opener (file braces 235/234), so `pnpm build:web` — which is `pretest`
(`package.json` `test` chain) — failed with `CssSyntaxError`. `pnpm test`
therefore could not pass from a clean tree, yet the fleet record read "green"
for hours (repeated by several research artifacts) before run
`783256c777724996a5016df4752af76c` falsified it first-hand.

## Root cause

`pnpm exec vitest run …` bypasses the `pretest` hook. When a tree carries a
stale-but-functional `web/dist`, every server-leg suite that fetches `/` passes
against the OLD bundle, and the web-leg suites don't exercise the CSS pipeline
at all — so a red `build:web` is invisible to any direct-vitest invocation.
This is the same trap as the 404-on-missing-dist class, but with the opposite
symptom: the dist exists, is stale, and masks a broken build.

## Rule (the protocol)

A "gates green" claim for this repository must cite results from **one clean
tree, in one sweep**:

```sh
pnpm check-types && pnpm lint && pnpm build:web && pnpm test
```

- `pnpm test` MUST be the plain script (it embeds `pretest` → `build:web`), not
  a direct `vitest run`.
- If only a subset ran (e.g. targeted suites during an implement phase), the
  claim must name exactly which subset — "focused: X.test.ts 793/793" — and must
  not be summarized as "green".
- `web/dist` is a build artifact: never treat its presence as evidence of a
  current build.

## First application

Batch B1 of run `783256c777724996a5016df4752af76c` (rm-100 installment) repaired
the CSS opener, the `runtime.ts` `gapEl` binding, and the
`APPROVAL_FETCH_TIMEOUT_MS` ordering; its prioritization doc
(`docs/prioritization/2026-10-13-repository-maintenance-cycle-1-batch-run-783256c77772.md`)
records the sweep per this protocol. This entry is the roadmap acceptance for
rm-993 (roadmap extension #45).
