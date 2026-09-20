---
title: Recovering ROADMAP.md after a destructive fleet render (second occurrence)
date: 2026-09-20
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - A hermes-roadmap fleet render lands on origin/main and ROADMAP.md is suddenly broken or emptied
  - `pnpm lint` fails on ROADMAP.md with markdown/no-missing-label-refs after a sync commit
  - Tracked open items, the manual-revision directive, or the Superseded section vanish from ROADMAP.md
  - Evidence strings appear that reference pytest/ast or vendored `.agents/skills/impeccable/**` paths
tags:
  - roadmap
  - fleet-render
  - recovery
  - lint
  - hermes-roadmap
---

# Recovering ROADMAP.md after a destructive fleet render

## Problem

The autonomously-maintained ROADMAP render rewrites the file from generator state that
does not know the repo's conventions. Observed twice (2026-09-19 cycle-1 aftermath;
2026-09-20 at commit 2f3a884): it broke `pnpm lint` (bare array literal in prose →
`markdown/no-missing-label-refs` — Main's Lint job goes red, main is unlandable), it
silently deleted every tracked open item plus the manual-revision do-not-drop directive
and the Superseded section (88 deletions at 2f3a884), and it cited pytest/ast evidence
on vendored `.agents/skills/impeccable/**` paths — tooling and paths that cannot exist
in this Node 24/pnpm/Vitest repository. It also added a "Fleet context" section naming
the wrong upstream.

## Symptoms

- `pnpm lint` red with `markdown/no-missing-label-refs` at a ROADMAP.md line inside a
  prose sentence (bare array literal)
- `git show <render-sha> -- ROADMAP.md` shows mostly deletions (tracked items gone)
- Superseded items resurrected as if open
- Evidence strings referencing pytest/ast or `.agents/skills/impeccable/**`

## What Didn't Work

- Trusting the render: the two-line lint fix alone leaves the file missing every
  tracked item and directive — the roadmap silently loses its memory.
- Re-typing items from memory or from the previous cycle's notes: statuses drift from
  what actually landed on origin/main.

## Solution

1. Recover the pre-render content verbatim: `git show <render-sha>^:ROADMAP.md` —
   that is the last good manual revision (3075f4a-style). Start from it, not from the
   render.
2. Update recovered statuses against reality with live checks
   (`git log origin/main -- <path>`, `gh run list`, `pnpm test` counts) — do not carry
   cycle-old claims forward.
3. Re-address the manual-revision do-not-drop directive to the NEXT render
   (the addressee must always be the upcoming render, not the one that already failed).
4. Preserve superseded items verbatim with a re-supersession note instead of deleting
   them.
5. Prove the file: `npx eslint ROADMAP.md` must exit 0, then repo-wide `pnpm lint`.
   Re-prove after every subsequent edit to the file.

## Why This Works

The pre-render parent holds the full manual state; the render's only reliable content
is what it added wrong. Verifying statuses against live repo/CI state (not the render's
claims) keeps the roadmap truthful, and linting after each edit catches the bare-array
class the generator reintroduces.

## Prevention

- Any phase that touches ROADMAP.md runs `npx eslint ROADMAP.md` before finishing.
- Treat a mid-cycle fleet render as a re-base event: re-read the file before editing;
  do not assume prior-phase line numbers still hold.
- The durable fix is fleet-side (tracked in ROADMAP `rm-104`): the generator must lint
  its own output, exclude vendored paths, and never delete manual sections. Until that
  lands, this recovery recipe is the delegate-side mitigation.

## Related Issues

- ROADMAP.md item `rm-104` (generator hardening — escalated priority 98 after the
  2026-09-20 recurrence)
- `docs/prioritization/2026-09-19-cycle-1-batch.md` (cycle-1 outcome addendum)
- `docs/prioritization/2026-09-20-cycle-2-batch.md` (cycle-2 batch + addendum)
