---
title: ROADMAP ledger bracket groups trip markdown label-ref lint
date: 2026-10-16
category: workflow-issues
module: repository-maintenance
problem_type: lint-gate
tags: [roadmap, lint, markdown, prevention]
component: ROADMAP.md, pnpm lint
severity: medium
applies_when: editing ROADMAP.md def/prose lines, or emitting ledger rows from a managed render
---

# ROADMAP ledger bracket groups trip markdown label-ref lint

## Problem

`pnpm lint` (eslint-plugin-markdown on `ROADMAP.md`) fails with
`markdown/no-missing-label-refs` whenever a ledger line contains a bare
bracket group that eslint parses as a shortcut reference link — for example
prose quoting a JS-array literal (`[:19]`-style), a file-listing
(`scripts/lib/impeccable-paths.mjs']` groups), or an object-shape fragment
(`[object Object]` as literally emitted by a JS render that stringified a
value). The 2026-10-16 census: 3 label-ref errors (ROADMAP.md:19:32, :878:72,
:880:167) plus 46 `@stylistic/no-trailing-spaces` lines kept the lint gate
red since the managed-render era; two of the three label-refs were minted by
the cycle-3 landing itself (rm-802's def prose quoting literal bracket
groups).

## Root cause

A managed render stringifies values into ledger prose without escaping
markdown link syntax; eslint-plugin-markdown treats `[text]` (and
`[text][ref]`) as a reference link and errors when no matching label
definition exists. Trailing whitespace rides along from emitted multi-part
rows.

## Cure

- Repo-side (immediate, landed 2026-10-16, run fecd3997): backtick-wrap every
  bracket group in ledger prose (code spans are exempt from link parsing) and
  strip trailing whitespace — `pnpm lint` reaches exit 0 with census 0.
- Durable (rm-675): wrap bracket groups at the RENDERER side (the roadmap-sync
  emitter), because the next managed render will re-emit unescaped groups and
  regress the census. Until that lands, treat any ledger edit touching
  bracket-bearing prose as lint-sensitive.

## Prevention rule

1. Never author a bare `[...]` group in ROADMAP prose — backtick-wrap it at
   write time (`[:19]`, `['*']`, `[object Object]`).
2. Ledger lines are single-line bullets: end them with a non-space character
   (no trailing whitespace), and re-check `grep -c ' $' ROADMAP.md` == 0 after
   any ledger edit.
3. After editing ROADMAP.md, run `pnpm exec eslint ROADMAP.md` — the markdown
   plugin parses ledger lines as markdown, so prose syntax errors surface only
   there.

## Evidence

- 2026-10-16 cycle-1 (run fecd3997, base 3e3664c): census 50 → 49 (roadmap
  phase) → 0 (implement S6); `pnpm lint` exit 0 first time since the render
  era; full-suite green (root 3081/3081 + web 1223/1223).
- The three label-refs: `:19` (a `[:19]`-style group quoting a lint position),
  `:878`/`:880` (rm-802 def prose quoting literal `[object Object]` output).
- Related house traps: the `#digits:` ATX-heading trap (nested ledger bullets
  whose text starts with a bare PR reference — prefix `PR #634:`) and the
  square-bracket list-item trap; both also live in ROADMAP-only prose.
