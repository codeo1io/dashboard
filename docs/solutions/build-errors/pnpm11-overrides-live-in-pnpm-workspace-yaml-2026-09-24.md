---
title: "pnpm 11: dependency overrides live in pnpm-workspace.yaml, not package.json"
date: 2026-09-24
category: build-errors
module: dashboard
problem_type: build_error
component: tooling
symptoms:
  - "An override added under package.json `pnpm.overrides` has no effect: `pnpm audit -r` stays red for the same advisory after a successful `pnpm install`"
  - "`pnpm install` logs only a warning: `[WARN] The pnpm field in package.json is no longer read by pnpm. Please move it to pnpm-workspace.yaml` and exits 0"
  - "The lockfile keeps the vulnerable resolution (here: toml@4.1.2 under @opencode-ai/plugin>effect) while the manifest edit looks correct in review"
root_cause: tooling_change
resolution_type: config_fix
severity: high
tags:
  - pnpm
  - overrides
  - pnpm-workspace-yaml
  - audit-gate
  - manifest-relocation
---

## Problem

Closing GHSA-82x6-q7mm-w9cf (toml uncontrolled recursion, vulnerable <4.2.0) via
a pnpm override. The first attempt added:

```json
"pnpm": { "overrides": { "toml": ">=4.2.0" } }
```

to `package.json`. `pnpm install --no-frozen-lockfile` exited 0, the lockfile
re-resolved nothing (`toml@4.1.2` stayed the sole toml resolution), and
`pnpm audit -r` kept reporting the HIGH. The only hint was a `[WARN]` line in
the install output: pnpm 11 no longer reads the `pnpm` field in `package.json`.
The warning is easy to miss precisely because the command succeeds.

## Root cause

pnpm 11 relocated manifest settings: everything that used to live under the
`pnpm` key of `package.json` (overrides, onlyBuiltDependencies, packageExtensions,
…) is now read from `pnpm-workspace.yaml`. The field in `package.json` is
silently ignored apart from the one-time WARN.

## Fix

Move the override into `pnpm-workspace.yaml`:

```yaml
overrides:
  toml: '>=4.2.0'
```

then re-resolve (`pnpm install --no-frozen-lockfile`). In this repo the
resulting lockfile moved the single toml resolution 4.1.2 → 5.0.0 and
`pnpm audit -r` reported `No known vulnerabilities found` (was: 1 high).

Note (repo convention): new/edited `.yaml` values are single-quoted — the
`yml/quotes` lint rule applies to `pnpm-workspace.yaml` too.

## Detection / prevention

- After ANY manifest change meant to alter resolutions, verify the lockfile
  actually moved: `grep -A2 'overrides:' pnpm-lock.yaml` plus confirm the old
  vulnerable version is gone (`pnpm list -r toml` or grep the lockfile) — an
  exit-0 install proves nothing by itself.
- Treat `[WARN] ... no longer read by pnpm` in install output as a hard signal,
  not noise: grep CI/install logs for `no longer read` as a tripwire.
- When GitHub Dependabot auto-dismisses the same advisory (`auto_dismissed`,
  dev-transitive rationale) while `pnpm audit -r` stays red, the two systems
  disagree silently — record the rationale wherever the override lands so the
  divergence is explained rather than mysterious (see ROADMAP rm-171).

## Evidence (2026-09-24, conductor run b4aac9ba implement)

- Before: `/tmp/impl-pnpm-install.log` shows the WARN line and unchanged
  `toml@4.1.2` with `pnpm.overrides` in `package.json`.
- After: `pnpm-workspace.yaml` overrides block + re-resolved
  `pnpm-lock.yaml` (`toml: '>=4.2.0'`, toml@5.0.0 sole resolution),
  `pnpm audit -r` → 0 findings; cloud full validation green (ephemeral PR #70,
  Main run 35962834943: Lint / Check Types / Test 3126/3126 all SUCCESS).
