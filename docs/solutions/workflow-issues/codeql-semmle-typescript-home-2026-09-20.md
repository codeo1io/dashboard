---
title: Self-hosted CodeQL needs SEMMLE_TYPESCRIPT_HOME pointed at the repo toolchain
date: 2026-09-20
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - CodeQL on a SELF-HOSTED runner fails with "Cannot find module typescript" from the typescript-parser-wrapper under autobuild
  - build-mode is none and the repo has no build step the autobuild tracer can use
  - Adding pnpm install to the job did NOT fix the crash (install completed before the failure)
tags:
  - codeql
  - self-hosted-runner
  - typescript
  - ci
---

# Self-hosted CodeQL needs `SEMMLE_TYPESCRIPT_HOME` pointed at the repo toolchain

## Problem

The fork's CodeQL job (self-hosted runner per the PR #1 placement policy) failed
on every run with a crash from CodeQL's own tooling, not from the repo:

```
##[error] fatal from autobuild.sh under trace-command --use-build-mode
build-stderr: 'Cannot find module typescript'
```

Two fixes were tried and both were insufficient on their own:

1. **`pnpm install --frozen-lockfile` before `codeql init`** — the install
   completed (log-timed: "Done in 19.6s" 14 s before the crash), `typescript`
   IS a root devDependency, and `node_modules/typescript` existed on disk —
   the crash was byte-identical anyway.
2. Reasoning from upstream — upstream's identical workflow is green with NO
   install step at all, so "missing node_modules" could not be the root cause.

## Root cause

CodeQL's `typescript-parser-wrapper` resolves the `typescript` module via a
bare `require` **from the CodeQL `_tool` cache path**, not from the
workspace. On GitHub-hosted runners that path happens to resolve (the wrapper
finds its own bundled resolution path), which is why upstream never sees this.
On our self-hosted runner there is no `node_modules` anywhere up the `_tool`
tree, so the bare `require` throws regardless of what is installed in the
workspace.

The wrapper honors the `SEMMLE_TYPESCRIPT_HOME` environment variable as an
override for exactly this situation — that is the supported seam.

## Fix (landed at aa4ff9f)

Job-level env in `.github/workflows/codeql.yaml`:

```yaml
env:
  # CodeQL's typescript-parser-wrapper resolves 'typescript' via this override
  # OR a bare require from the _tool cache path — no node_modules exists up
  # that tree on the self-hosted runner, so point it at the repo toolchain.
  SEMMLE_TYPESCRIPT_HOME: ${{ github.workspace }}/node_modules/typescript
```

The pre-analysis `pnpm install --frozen-lockfile` step stays (the override
points AT the workspace toolchain, so it must exist).

Verification: CodeQL run 35490785207 green (3 m 43 s) — first green CodeQL on
the fork after three failing attempts across two runs.

## Lesson

- A green upstream run of the "same" workflow is NOT transferable evidence on
  a different runner class — the wrapper's module resolution differs by host.
- When a CI fix is a no-op, time-stamp the log lines before assuming the fix
  even ran (install "Done in 19.6s" vs crash 14 s later ruled out ordering).
- Environment overrides documented in a tool's wrapper (`SEMMLE_*`) are the
  intended seam for self-hosted setups; prefer them over re-plumbing installs.

## Related

- `.github/workflows/codeql.yaml` (job-level env + root-cause comment)
- AGENTS.md — self-hosted runner placement policy (PR #1)
