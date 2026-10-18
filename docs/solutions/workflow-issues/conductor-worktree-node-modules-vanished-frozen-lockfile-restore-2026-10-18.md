---
title: Conductor worktree node_modules vanished between phases — restore with frozen lockfile, never reinstall ad hoc
date: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: low
applies_when:
  - 'A phase in a conductor run worktree (`~/.hermes/conductor-worktrees/dashboard-*/run-*`) resumes after a multi-hour gap and `npx vitest run ...` fails with a module-not-found resolution error'
  - '`ls node_modules/.bin/vitest` is absent or `ls node_modules | wc -l` is near zero while the lockfile and manifest are intact'
  - 'The same suite ran green earlier in the same worktree with no manifest/lockfile change in between'
resolution: |
  Restore from the lockfile — do not hand-install packages and do not run a bare
  `pnpm install` that could rewrite `pnpm-lock.yaml`:

    pnpm install --frozen-lockfile --prefer-offline

  This reinstalls exactly the locked resolutions (offline-first, so no registry
  drift), leaves `pnpm-lock.yaml` byte-identical, and touches only gitignored
  paths. Verify the tree is otherwise untouched with `git status --short` — a
  vanished `node_modules` produces NO tracked-file drift, so any modified file
  you see is from your own edits, not the environment.
prevention: |
  Treat a module-not-found error in a long-lived run worktree as an environment
  symptom, not a code regression: check `node_modules` existence before
  debugging imports. Budget a frozen-lockfile install at the start of any phase
  that resumes after a long gap in a worktree you did not touch meanwhile.
evidence: |
  Run ed8f47e0 implement phase (2026-10-18): `npx vitest run
  test/snapshot-store.test.ts` failed on module resolution after a ~4h gap;
  `ls node_modules` was empty; `pnpm install --frozen-lockfile --prefer-offline`
  returned RC=0 with `git status --short` unchanged (4 pre-existing modified
  files only), after which the focused suite ran 26/26 green.
see_also:
  - 'docs/solutions/workflow-issues/targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md (the other "suite suddenly fails" cause in this repo: stale web/dist)'
