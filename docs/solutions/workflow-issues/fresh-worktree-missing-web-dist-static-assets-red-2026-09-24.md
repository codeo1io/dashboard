---
title: Fresh conductor worktrees red ~58 static-asset tests until web/dist is built once
date: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: low
applies_when:
  - Running vitest directly in a freshly created conductor worktree (impacted-tests harness, ad-hoc `npx vitest run`)
  - Interpreting a first-run failure burst in test/static-assets.test.ts in a tree you did not build
  - Wiring any harness that invokes the test runner without the package's lifecycle scripts
symptoms:
  - Dozens of 404s on `/sw.js`, `/manifest.webmanifest`, and the SPA shell in static-asset tests
  - Failures clustered in serving tests while logic tests pass
  - `ls web/dist` is empty — the gitignored client build output was never produced
solution: |
  Run 6fe26972 targeted_tests (2026-09-24): the work order's impacted-tests
  command red 58/665 on first invocation — every failure was a static-asset 404.
  Root cause: the repo's `pnpm test` runs `pretest` (`pnpm build:web`) which
  produces gitignored `web/dist/sw.js` + manifest + precache; harnesses that
  invoke `vitest` directly skip lifecycle scripts, and a fresh worktree has no
  build output. Not a code defect: the identical command went 665/665 green
  after one `pnpm build:web`.

  Recipe: before blaming the diff, check whether the failing surfaces depend on
  a build artifact (`git check-ignore web/dist` confirms it is untracked output);
  build once, re-run the SAME command, and compare. Building is safe for digest
  discipline — the git-status fingerprint is unchanged because the output is
  ignored.
prevention: |
  Any harness that runs the suite outside `pnpm test` must either run the
  package's pretest equivalent first or be pointed at a worktree that already
  has `web/dist`. When a first validation run in a fresh worktree fails
  exclusively on artifact-backed routes, suspect the missing build before the
  change under test.
tags:
  - conductor
  - worktrees
  - vitest
  - build-artifacts
  - triage
---
