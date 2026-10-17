---
title: 'Engine validation routing — targeted_tests withholds the remote fallback, full_tests executes it verbatim'
date: '2026-10-08'
category: 'workflow-issues'
module: 'validation'
problem_type: 'process-trap'
component: 'ci'
severity: 'info'
---

## Problem

The conductor engine dispatches a seeded `targeted_command` and `full_command`
per phase. On this repository both commands hide a trap:

- `run_repo_impacted_tests.py` lists `package.json` in `FULL_IMPACT_FILES`,
  so ANY batch that touches `package.json` deterministically escalates to the
  seeded `--fallback-command` = `github_ci_validate.py --repo .`.
- `github_ci_validate.py` is not a local test runner: on a public origin it
  creates an ephemeral validation PR — `git push --force` of two
  `conductor/ci-*` refs, `gh pr create` (draft), polling Actions checks, then
  cleanup in a `finally`.
- Additionally, the runner's impacted map can list web-project test files
  (`web/src/**/*.test.ts`), but the root `vitest.config.ts` only collects
  `test/**` — a direct run silently under-covers the map.

## Solution

Route by the work order's granted authority, not by the command's shape:

1. **`targeted_tests` turn (push/pr/ci prohibited):** WITHHOLD the fallback.
   Prove the escalation deterministically with `--print-only` (zero side
   effects), then run:
   - the same runner with `package.json` dropped from the argv (engine-mapped
     vitest targets still cover the remaining surfaces);
   - the mapped `web/*` targets separately under
     `--config web/vitest.config.ts`;
   - `actionlint` container-form for workflow surfaces;
   - `pnpm install --frozen-lockfile` + `pnpm audit --recursive` for the
     package.json/pnpm-lock surface.
2. **`full_tests` turn (full-command authority granted):** EXECUTE
   `validation.full_command` VERBATIM — the ephemeral-PR route is the
   sanctioned mechanism there. Pre-flight before letting it push:
   `gh repo view` (public + ADMIN), `ssh -T git@github.com`, the engine's
   comment-aware `_workflow_uses_self_hosted` over origin/main workflows
   (a raw `grep self-hosted` false-positives on retired-policy comments in
   `main.yaml`/`base-drift.yaml`/`release.yaml`), and
   `git diff <run-base> origin/main -- <changed workflows>` to predict
   3-way-apply conflicts. Afterward verify cleanup: PR CLOSED, both
   `conductor/ci-*` refs gone (`ls-remote`), local worktree untouched (the
   script works in a temp shared clone).
3. **Digest rule:** an unchanged tree means the dispatch digest copies
   VERBATIM; always re-derive with the release engine's
   `validation_digest(workspace_base_sha, '.')` to prove it rather than
   assume it.

## Evidence

- Run `788aa489c1d5` targeted_tests (2026-10-08): `--print-only` showed
  `'shared build/test configuration changed; fallback=full'`; local mapping
  22 files/765 tests + 1 web straggler green, digest re-derived == dispatch.
- Run `788aa489c1d5` full_tests (2026-10-08): verbatim execution →
  `ok: true`, 11/11 checks SUCCESS, ephemeral PR #445 reaped clean,
  both refs verified deleted, worktree byte-identical.

## Notes

- Orphaned `conductor/ci-*` heads accumulate from failed/aborted validations
  (~50 on origin at 2026-10-08) — tracked as rm-778.
- The ephemeral PR's checks take workflow files from the merge ref, so
  workflow changes are exercised on real runners — a stronger signal than
  local actionlint for action re-pins (used to discharge rm-761's dispatch
  clause).
