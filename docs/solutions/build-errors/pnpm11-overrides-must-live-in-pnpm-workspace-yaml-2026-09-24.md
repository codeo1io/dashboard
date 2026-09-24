---
title: pnpm 11 ignores package.json pnpm.overrides — put overrides in pnpm-workspace.yaml
date: 2026-09-24
category: build-errors
module: dashboard
component: toolchain
problem_type: silent_config_ineffectiveness
severity: medium
applies_when:
  - A transitive-dependency advisory needs a forced version bump via pnpm overrides
  - pnpm 11.x is the package manager (check packageManager in package.json)
  - pnpm install exits 0 but the lockfile still resolves the vulnerable version
---

# pnpm 11 ignores `pnpm.overrides` in package.json

## Problem

Adding an `overrides` block under `pnpm` in `package.json` (the pnpm ≤10 home
for overrides) is **silently ignored** by pnpm 11:

```
[WARN] The "pnpm" field in package.json is no longer read by pnpm. The following
keys were ignored: "pnpm.overrides". See https://pnpm.io/settings for the new
home of each setting.
```

`pnpm install` still exits 0, so a CI pin-carrying workflow can pass while the
override never lands: the lockfile keeps resolving the vulnerable version and
`pnpm audit` keeps reporting the advisory. Observed 2026-09-24 with pnpm 11.27.1
forcing `toml >=4.2.0` (GHSA-82x6-q7mm-w9cf, dev-only chain
`@opencode-ai/plugin > effect > toml`): with the block in `package.json` the
lockfile stayed at `toml@4.1.2` and audit still reported 1 high.

## Root cause

pnpm 11 moved settings out of `package.json`'s `pnpm` field into
`pnpm-workspace.yaml` (treated as the settings file even when it declares no
`packages:`). The warning is easy to miss in long install output.

## Solution

Put the override in `pnpm-workspace.yaml` alongside the existing settings
(`allowBuilds`, `minimumReleaseAgeExclude`, …) and keep the style of a bounded
range, with a comment carrying the advisory id:

```yaml
overrides:
  brace-expansion@2: '>=2.1.2 <3.0.0'
  # GHSA-82x6-q7mm-w9cf (dev-only chain: @opencode-ai/plugin>effect>toml) — force
  # the fixed 4.2.0+ line instead of masking the advisory.
  toml: '>=4.2.0 <5.0.0'
```

Verify BOTH after `pnpm install`:

```sh
grep -n '^  toml@' pnpm-lock.yaml   # must show the bumped version (4.3.0)
pnpm audit                          # must report no vulnerabilities
```

Do not re-add a `pnpm` field to `package.json` — pnpm 11 ignores it, and a
future pnpm may warn again or reject it.

## Prevention

- When an override "doesn't take", grep install output for `no longer read by
  pnpm` before debugging resolution.
- The audit gate in CI is the backstop: an ineffective override shows up as a
  persistent advisory there.
