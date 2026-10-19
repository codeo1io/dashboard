---
title: Repo-wide eslint walks the .slim clonedeps mirror — lint dies on the mirror's own config (local-only red)
date: 2026-10-18
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - Repo-wide `pnpm lint` fails in a conductor worktree with "could not find plugin 'vitest'" / rule "vitest/expect-expect"
  - A `.slim/clonedeps/repos/*` dependency-source mirror exists in the worktree (untracked machine-local state)
  - The same lint passes in CI and in worktrees without the mirror
  - Diagnosing whether a lint failure is repo truth or worktree-environment truth
---

## Problem

Repo-wide `pnpm lint` (`eslint --cache .`, flat config) walked into the
machine-local dependency-source mirror at `.slim/clonedeps/repos/fro-bot__agent/`.
Flat-config eslint picks up **nested** `eslint.config.*` files in every directory
it walks; the mirror is a full foreign repo whose own `eslint.config.ts:52`
references `'vitest/expect-expect'`. `eslint-plugin-vitest` is not installed
inside the shallow clone, so config resolution hard-fails with rc 2:

```
A configuration object specifies rule "vitest/expect-expect",
but could not find plugin "vitest".
```

The root `eslint.config.ts` ignores list (`docs/**`, `web/**`, `.agents/**`,
`.opencode/**`) does **not** exclude `.slim/**`, and `vitest.config.ts` already
excludes `.slim` — so this was an ignore-scope gap specific to eslint.

## Why it looks like repo truth (two traps)

1. **The stash test lies.** `git stash` only stashes tracked changes; the
   untracked mirror survives, so "lint red at pristine base" was a false
   positive — the mirror, not the base, was the cause.
2. **Single-file lint is clean.** `npx eslint --print-config <repo test file>`
   and any scoped invocation resolve the ROOT config fine; only the repo-wide
   walk reaches the mirror. CI never sees the mirror at all (untracked), so the
   CI Lint job stays green with byte-identical manifest/lockfile/config.

## Diagnosis recipe

1. `npx eslint --print-config test/<any>.test.ts` — rc 0 means the repo config
   itself resolves; suspect a nested config the walk reaches.
2. Lint one file inside the suspect tree —
   `npx eslint .slim/clonedeps/repos/fro-bot__agent/src/gateway/server.ts` —
   reproducing the exact error proves the nested config is the source.
3. `grep -rn "expect-expect" <mirror>/eslint.config.*` finds the rule reference;
   `grep -c eslint-plugin-vitest pnpm-lock.yaml package.json` returning 0/0
   proves the plugin is genuinely absent at root (never needed there).

## Cure

- Immediate (no repo change): scope lint to changed files, or move the mirror
  aside (`mv .slim/clonedeps/repos .slim/clonedeps/repos.aside`).
- Durable: add `'.slim/**'` to the root `eslint.config.ts` ignores —
  roadmap `rm-1984` tracks the landing (precedent: `vitest.config.ts` already
  excludes `.slim`). Until it lands, worktree lint gates must scope files.

## Evidence

Root-caused 2026-10-18 in run adb01769f69f43cb98e6fcf032f7af77
(targeted_tests attempt b818999e); CI Main Lint green at 55aedc97 with
identical lint inputs; both cycle cloud batteries (ephemeral PRs #995, #1001)
Lint SUCCESS. Recorded in ROADMAP.md (rm-1984, rm-1983 truth-cure rider).
