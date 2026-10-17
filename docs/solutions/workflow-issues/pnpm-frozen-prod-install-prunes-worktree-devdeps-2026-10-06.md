---
module: dashboard
tags: [pnpm, lockfile, worktree, devdependencies, verification]
problem_type: workflow-issue
date: 2026-10-06
---

# `pnpm install --frozen-lockfile --prod` in the worktree silently PRUNES devDependencies

Discovered 2026-10-06, conductor run `cc4339fe` (implement attempts
`ab9ea97d`/`a7e287e`, base `306a972`) while verifying the frozen-install wall
cure against `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`.

## Problem

`pnpm install` is a *state transition of the shared install*, not a read-only
check. Running it with `--prod` inside a stewardship worktree removes every
devDependency from `node_modules` — `vitest`, `eslint`, and `tsc` vanish from
`node_modules/.bin`. The command exits 0, so nothing announces the pruning;
the next `vitest run` / `eslint` / `pnpm check-types` invocation fails (or
resolves to a sibling checkout's binaries on `PATH`) in a way that looks like
a broken batch rather than a self-inflicted prune.

## Symptom

    ls node_modules/.bin | grep -E '^(vitest|eslint|tsc)$'   # -> empty

after any `--prod` install ran in that tree.

## Cure

Never run `--prod` installs in a tree whose dev tooling you still need.
Verify the frozen-install contract in a **/tmp manifest copy** instead —
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` fires at lockfile-config parse time,
before any store mutation, and `--prod` resolution is identical given the
same three manifests:

    mkdir /tmp/wall && cp package.json pnpm-lock.yaml pnpm-workspace.yaml /tmp/wall/
    cd /tmp/wall && corepack pnpm install --frozen-lockfile --prod

If a worktree was already pruned, restore it before running gates:

    corepack pnpm install --frozen-lockfile        # full, no --prod

## Evidence

Hit live in run `cc4339fe` implement (2026-10-06): a `--prod` verification
against the worktree's own `node_modules` removed the dev toolchain
mid-phase; the run's subsequent A/B verifications
(`/tmp/a7e287e-wall/`, `/tmp/121dcdb7-wall/`) used the manifest-copy form and
proved the same contract (frozen `--prod` rc=0, `--lockfile-only` rc=0,
audit rc=0) with the worktree's `node_modules` left fully populated for the
vitest/eslint gates.

Related: `pnpm-lockfile-config-mismatch-frozen-install-trap-2026-10-05.md`
(the wall itself) and
`container-pnpm-install-poisons-host-node-modules-2026-09-22.md` (the
container-side cousin).
