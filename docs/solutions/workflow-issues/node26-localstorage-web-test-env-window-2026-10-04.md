---
title: Node 26 localStorage env window - local web test half red while CI (Node-24 pin) is green
date: 2026-10-04
category: workflow-issues
module: dashboard
problem_type: workflow_issue
tags: [node, vitest, jsdom, localstorage, web, environment, ci]
component: web_tests
---

# Bare-Node-26 `pnpm test` web half fails an environment window, not the suite

## Problem

Locally, on bare Node 26 (26.10.0 measured), `pnpm test` exits rc=1 with the
entire `web/` half red (4 files / 100 tests at base) while the server half
(54 files / 2354 tests) is green. The same suite is **fully green in CI** —
the workflows pin Node 24 — and green locally under the recipe below. This is
the known rm-548 env-window localStorage class: on Node 26 the jsdom test
environment's storage access hits Node's own flag-gated webstorage global.

Triage consequence: a red local web half under Node 26 is **not evidence of a
regression**. Check `node --version` before chasing web-half failures.

## Cure (local, per-session)

```bash
NODE_OPTIONS=--localstorage-file=/tmp/localstorage.json pnpm test
# or scoped to the web half:
NODE_OPTIONS=--localstorage-file=/tmp/localstorage.json \
  npm exec -- vitest run --config web/vitest.config.ts
```

Fleet-measured green with the recipe: full web half (31 files / 1172 tests
at base; 2026-10-04 sibling record) and the current tree's changed web tests
(Notifications + InstallPrompt, 45 tests).

## Authoritative read

CI is the gate that matters: the workflows' Node-24 pin runs the whole suite
green (2026-10-04: ephemeral validation PR #373, all 10 checks SUCCESS
including the full `Test` job). Treat CI's Test check, not local bare-Node-26
output, as the suite's truth.

## Scope note (2026-10-04, run 146d73f2 cycle:1)

The class **narrowed** with this run's B3 delta (rm-596): after exporting the
dismiss-latch keys and adding the guarded restore path,
`web/src/shell/AppShell.test.tsx` (33 tests) is green on bare Node 26 —
measured twice — while App / Notifications / InstallPrompt test files still
need the recipe locally.

## Ownership / do-not-fix-here

The proper cure is a test-environment seam fix (jsdom/localStorage setup),
claimed by unlanded sibling work (rm-568, rm-608 family). Do **not** fix it
inside `web/src/test-setup.ts` in an unrelated review or batch — that seam is
fleet-contested; wait for the claiming lane to land and re-measure.
