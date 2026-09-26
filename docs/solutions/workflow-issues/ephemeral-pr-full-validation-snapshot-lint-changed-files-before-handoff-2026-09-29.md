---
title: full validation runs as an ephemeral GitHub PR over a worktree snapshot — vendored upstream files and re-fired implement turns must be linted before handoff
date: 2026-09-29
category: workflow-issues
module: .github/workflows/main.yaml
problem_type: process_gap
component: ci
symptoms:
  - "Every local gate is green (targeted suite, tsc) but the full-validation phase reports Lint FAILURE on an ephemeral PR you never opened, citing code you wrote"
  - "Vendored files copied byte-faithfully from an upstream repo fail this repo's @stylistic rules (46 indent errors in one vendored file) even though they pass the upstream's own lint"
root_cause: process_gap
cause_detail: |
  The full-validation command (github_ci_validate.py) does not run suites
  locally. It snapshots the CURRENT working tree via a temporary GIT_INDEX_FILE
  (the real worktree/index/HEAD are never touched), builds base+head commits in
  a temp clone, pushes its own `conductor/ci-<sha12>` branches, opens an
  ephemeral PR, and reads GitHub CI. Two consequences:

  1. LOCAL fixes are picked up simply by re-running the same command — the
     snapshot is retaken from the worktree each time (proved 2026-09-29: a
     60-error Lint regression from the implement batch → 59 autofix + 1 manual
     import → re-run → all 10 checks SUCCESS).
  2. Nothing between the implement phase and that ephemeral PR lints the tree
     unless you do. A turn that skips lint (e.g. a re-fire continuing prior
     edits under a deadline) hands any regression straight to CI, where it
     costs a full PR round-trip (~5 min) to discover.
fix: |
  Before handing off from any implement-bearing turn: run targeted
  `npx eslint <changed files>` (~30s for a batch) — NOT repo-wide lint, which
  needs >300s uncached on a loaded box. Vendor-facing rule: upstream-formatted
  files must be linted where they land; run eslint --fix over the vendored set
  and record the reformat in the mirror's README so the deviation from
  upstream bytes is intentional and documented, not drift.
verification: |
  2026-09-29 cycle: first full run → Lint FAILURE, 60 errors across 10 files
  (46 indent in the vendored provenance.ts, import ordering, async-ification,
  one node:process global). eslint --fix + one manual import → local EXIT=0,
  374/374 touched suites, tsc RC=0. Re-run → ephemeral PR all green. Three
  consecutive green ephemeral PRs (#239, #243, #245) on the resulting tree.
prevention: |
  Treat "targeted eslint on the changed-file set" as part of the implement
  phase's definition of done, exactly like tsc. When absorbing upstream
  code, budget the lint pass into the vendoring step itself.
related:
  - docs/solutions/workflow-issues/targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md
  - .github/workflows/main.yaml (Lint job)
---
