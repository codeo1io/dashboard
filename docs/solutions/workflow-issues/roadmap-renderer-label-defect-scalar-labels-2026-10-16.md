---
title: Roadmap renderer label defect and scalar-label authoring
date: 2026-10-16
category: workflow-issues
module: repository-maintenance
problem_type: tooling-regression
component: ROADMAP.md
severity: medium
applies_when: minting or re-rendering the ROADMAP ledger, or investigating markdown lint errors on ROADMAP.md
tags: [roadmap, eslint, markdown, renderer]
---

# Roadmap renderer label defect and scalar-label authoring (rm-893)

## Problem

The `pnpm lint` gate was red with 50 errors that all lived in `ROADMAP.md`:
47 trailing-whitespace lines plus 3 `markdown/no-missing-label-refs` errors at
`ROADMAP.md:19:32`, `:878:72`, and `:880:167`. Line 19's label was a 20-element
array stringified into a markdown link label; the other two rendered literally
as `[object Object]`. The wall is written by the hermes-autonomy roadmap-sync
renderer, so hand-fixing the file only lasts until the next render regenerates
the same shapes.

Root cause: the renderer accepts non-scalar acceptance/signals values and
stringifies them into label positions (JS arrays and objects become
`[a, b, c]` / `[object Object]`), and its whitespace pass re-introduces
trailing whitespace. The defect is external to this repository and, as of
2026-10-16, unproven fixed upstream.

## Fix (already landed)

The managed re-render that rode the ccde661e landing commit (visible at
origin/main 06095e9) cured the wall: the array label was escaped and the
trailing whitespace dropped — the same wall that produced 50 errors at 3e3664c
produces 0 at 06095e9. Verify any wall without modifying it with the stdin
probe (the file-scoped markdown rules still apply because eslint is told the
filename):

```sh
pnpm exec eslint --stdin --stdin-filename ROADMAP.md < ROADMAP.md
# exit 0 + no output = clean; exit 1 + "✖ N problems" = dirty
```

## Authoring convention

When minting ledger entries or writing evidence lines, keep acceptance and
signals values scalar or pipe-delimited. Spell lists in prose or inside
backticks — never as bare bracket-comma syntax, which the markdown linter
parses as a reference link label. Empty brackets are inert.

## Guard

`test/roadmap-lint-zero-baseline-guard.test.ts` (rm-893) fails when the tree's
wall lints worse than the wall the tree diverged from (merge-base with
origin/main, falling back to HEAD in detached validation clones). A second
case feeds a deliberately bad render (array label, `[object Object]`, trailing
whitespace) through the same probe to prove the detection logic fires. The
guard deliberately pins no absolute count, so it stays correct as baselines
move; it protects against renderer regressions, not historical debt.
