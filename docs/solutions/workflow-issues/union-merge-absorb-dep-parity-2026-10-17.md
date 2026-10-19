---
title: union-merge absorbs can silently drop upstream dependency bumps — run a post-absorb manifest-parity check
date: 2026-10-17
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
tags: [absorb, upstream, dependencies, pnpm]
applies_when:
  - Absorbing an upstream fro-bot/dashboard window via a union-merge (absorb-merge) instead of a clean rebase
  - An absorbed upstream PR touched package.json or pnpm-lock.yaml but its version specifier did not reach the fork tip
  - Verifying that a landed absorb actually carried every dependency change in the absorbed range
---

## Problem

An absorb that lands upstream commits through a union-merge resolves *content*
conflicts but does not guarantee *manifest* parity: an upstream PR that only
bumps a lockfile/manifest version can be an ancestor of the fork's `main` while
the fork's own manifest still pins the old specifier. The drop is silent — no
conflict is reported because neither side conflicts textually at merge time,
and the fork keeps building green on the older version.

Proven instance (detected 2026-10-17, run 6b6520e9): upstream PR #644
(`8d867b9b`, lockfile-only +4/-4) resolved `@hono/node-server` **2.1.5** and is
an ancestor of the fork's `main`, yet the fork manifest still read `^2.1.3`
with 2.1.3 installed (`node -e "console.log(require('@hono/node-server/package.json').version)"`),
while upstream's tip carried 2.1.5. The bump was finally landed out-of-band in
the 2026-10-17/18 mass-folds (`git show origin/main:package.json` → `^2.1.5`) —
the gap lived for days with zero failing checks.

## Root cause

Union-merge adoption verifies surviving *hunks*, not dependency-graph
equivalence. When the fork's manifest line and the upstream manifest line both
exist, the surviving line is whatever the union produced — and a caret range
(`^2.1.3`) satisfies install-time resolution, so nothing re-pins it to the
upstream-resolved version.

## Cure

After every union-merge absorb, diff the dependency specifiers against
upstream's tip for every dependency touched in the absorbed range, and record
the result in the absorb rider (the roadmap def tracking the absorb window —
`rm-252` for the current era):

```bash
# upstream tip manifest vs fork tip manifest, restricted to the absorbed range's files
git diff "$(git merge-base HEAD upstream/main)"..upstream/main -- package.json web/package.json pnpm-lock.yaml \
  | grep -E '^[+-]\s+"'            # the version lines the window touched
# then verify each landed specifier actually reached the fork tip
git show origin/main:package.json | grep -F '<the dep>'
```

Rules:

1. If a specifier the window bumped is missing or older on the fork tip, treat
   the absorb as **incomplete** — either land the bump or record a dated skip
   on the roadmap def.
2. `pnpm install --frozen-lockfile` passing is NOT parity evidence — it only
   proves the lockfile matches the fork manifest, not that either matches
   upstream's resolved range.
3. The check belongs in the absorb rider's acceptance, next to the existing
   content-parity step (excluded files, never-absorb surfaces).

## Verification of this pattern

- Drop: `git show 8d867b9b --stat` (pnpm-lock.yaml only, +4/-4) +
  `git merge-base --is-ancestor 8d867b9b <pre-cure main>` → true, with the fork
  manifest still `^2.1.3` (readback 2.1.3 in node_modules).
- Cure: `git show origin/main:package.json | grep '@hono/node-server'` →
  `^2.1.5` (landed in the 2026-10-17/18 fold wave).

## References

- Roadmap `rm-1973` (absorb-verified dependency parity — this doctrine is its
  acceptance); absorb window ledger `rm-252`; upstream PR #644 `8d867b9b`.
