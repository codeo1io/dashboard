---
title: pnpm install inside a bind-mounted container poisons host node_modules (no-TTY purge abort) and creates a repo-local .pnpm-store
date: 2026-09-22
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - running pnpm install inside docker containers that bind-mount the repository worktree
  - validating or regenerating artifacts in a pinned toolchain image (e.g. the Playwright visual baselines)
---

## Problem

Running `pnpm install` inside a container that bind-mounts the repository
(such as the in-image Playwright baseline regen) silently breaks the HOST
worktree's node_modules in two ways:

1. The container's install rewrites `node_modules/.modules.yaml` with the
   container's store directory. The next host-side `pnpm` command then wants
   to purge and reinstall node_modules, and because the session has no TTY it
   aborts:

   ```text
   ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY
   Aborted removal of modules directory due to no TTY
   ```

   pnpm's `verify-deps-before-run` triggers an auto-`pnpm install` before
   `check-types`/`test`, so the failure surfaces far from its cause — the
   error stack points at `runDepsStatusCheck`, not at the earlier container
   run.

2. When the container's default global store lives on a different filesystem
   than the bind-mounted worktree, pnpm falls back to a repo-local
   `.pnpm-store/` — tens of thousands of files, root-owned (the container
   user), untracked, and (before 2026-09-22) not gitignored.

## Fix

After any in-container install, restore the host before running anything else
host-side:

```bash
sudo rm -rf node_modules
pnpm install --frozen-lockfile
sudo chown -R "$(id -u):$(id -g)" .pnpm-store 2>/dev/null || true
```

And keep `.pnpm-store/` gitignored (done 2026-09-22, with a comment pointing
at the regen procedure that creates it) — it is a cache, never commit it.

If the container run only READS (actionlint over workflows, for example),
plain `-v "$PWD:/repo"` is fine: the trap is specific to container-side
`pnpm install` writing into the mount.

## Detection

The signature is the no-TTY abort above appearing in a session that last ran
a containerized install; `ls node_modules/.modules.yaml` shows a `storeDir`
under the container path, and `find . -user root -not -path './.git/*'`
surfaces the root-owned residue. Hit twice on 2026-09-22 (implement phase,
then anticipated and pre-empted in the targeted_tests phase of the same run).
