---
title: Zero-install workflow claims go false on the first package import
date: 2026-09-30
module: dashboard
problem_type: workflow breakage
component: canary workflow
severity: high
applies_when: a GitHub workflow runs a repo script without an install step
---

# Zero-install workflow claims go false on the first package import

## Problem

The `Canary` workflow's setup step was named "Set up Node 24 (native TS, no
install needed)" and really did install nothing. That claim was true when the
canary script only used Node builtins, and silently went false the moment the
script's transitive import chain gained a package dependency:

- `scripts/graphql-canary.ts:24` imports the query registry from
  `src/github/aggregator.ts`
- `src/github/aggregator.ts:32` value-imports `isErr`/`isOk` from
  `src/result.ts`
- `src/result.ts:12` imports `@bfra.me/es/result`, a production dependency
  (`package.json` dependencies)

With no `node_modules`, the workflow's only-ever run (36417620616 — the
weekly cron's FIRST fire, event=schedule, delayed ~6 h 23 m past its
05:23 UTC slot to 2026-09-28T11:46Z by GitHub scheduler load) died in about
thirteen seconds with `ERR_MODULE_NOT_FOUND: Cannot find package
'@bfra.me/es' imported from src/result.ts`. That cron fire produced the
workflow's only run: red in seconds, nothing watching scheduled-run failures,
so the signal sat dead, silently, for 2+ days while looking configured.

The step comment is the second defect: it asserted a load-bearing premise
("no install needed") that no gate checks, so it rotted without anyone
noticing.

## Solution

Any workflow that executes a repo script now uses the house composite
`./.github/actions/setup` (digest-pinned pnpm + Node 24 + `pnpm install
--frozen-lockfile` + pnpm store cache), exactly like every job in
`.github/workflows/main.yaml`. The 2026-09-30 cycle-1 batch put that swap in-tree (pending landing)
for the canary plus a `timeout-minutes` bump 5 to 10, and recorded the
install-vs-inline choice in the workflow's own comments.

Verification recipe that would have caught this before the workflow ever ran:

1. Run the script locally with dependencies installed and confirm exit 0:
   `GITHUB_TOKEN=<token> node scripts/graphql-canary.ts` (never print the
   token).
2. After the workflow lands, trigger one `workflow_dispatch` and confirm the
   run URL is green — a scheduled-only workflow has no other honest proof.

## Prevention

- When a script gains its first external-package import, every no-install
  workflow that invokes it breaks. Before landing such an import, grep
  `.github/workflows/` for the script's filename and check each invoking
  workflow installs dependencies.
- Never write "no install needed" (or any environment claim) into a step name
  or comment unless a test proves it; prefer the shared setup composite so
  the claim cannot exist.
- Scheduled workflows whose failure nobody watches are not signals. Pair every
  cron workflow with a failure route so a red or dead schedule surfaces (sibling
  run 7ce48fe5 mints this watch as its rm-289 — absent from this ledger,
  reconcile by content).

## Evidence

- Failing run: `gh run view 36417620616 --log` (ERR_MODULE_NOT_FOUND in ~10s;
  the only canary run ever at diagnosis time).
- Import chain: `scripts/graphql-canary.ts:24` → `src/github/aggregator.ts:32`
  → `src/result.ts:12`; `@bfra.me/es` in `package.json` dependencies.
- Local proof after the fix: canary exits 0 with both registered templates
  green (`REPO_STATUS_QUERY`, `REPO_STATUS_QUERY_NO_ALERTS`).
- Full-suite proof: ephemeral validation PR 306, all ten checks green
  (2026-09-30), including the changed workflow surface.
