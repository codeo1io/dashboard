---
title: ROADMAP paragraph-length cliff - quadratic markdown lint past ~5K chars
date: 2026-09-30
category: workflow-issues
module: dashboard
problem_type: workflow_issue
tags: [markdownlint, eslint, lint, ci, roadmap, performance]
component: ci_lint
---

# ROADMAP paragraph-length cliff: repo-wide Lint dies at the 35m job timeout

Date: 2026-09-30 · Run: `7ce48fe53b134794bdf5c7589d900f1e`
(repository-maintenance cycle 1; implement `96f53b14`, compound `d4975abe`) ·
Item: rm-284

> **Sibling record**: `markdown-paragraph-length-lint-cliff-2026-09-30.md`
> in this directory is sibling run a923284c's same-day independent diagnosis
> of the same cliff on the main lineage; the measurements agree, its split
> cure landed on main first, and this record adds the quadratic mechanism
> plus the standing `test/roadmap-length-guard.test.ts` guard.

## Problem

Every Main push run since the 2026-09-29 landings died at the Lint job
(#330, #335, #353 - cancelled at the `timeout-minutes: 35` ceiling in
`.github/workflows/main.yaml:36`; #353 was measured dying at exactly 35m19s),
while every sibling job stayed green. The
root cause is neither herd contention nor the validator poll window:
ROADMAP.md carried two huge item paragraphs (rm-103's `signals` at 7317
chars, rm-157's at 7967), and inline-parsed markdown goes quadratic
somewhere between ~5.3K and ~7.4K chars.

Measured (sibling tree, run c06f7bf3d796, attempt 57d76fda): a 5267-char
line (an HTML comment, exempt from paragraph parsing) lints in ~5s; 7376-char
and 8026-char paragraphs each exceeded
420s. A physical line-split does NOT cure it - remark rejoins
lazy-continuation lines into ONE AST paragraph, so a 7200-char joined
paragraph still times out.

## Cure

Split each cliff paragraph into blank-line-separated sub-paragraphs (a blank
line plus a 2-space indent keeps the fragments inside the same list item) at
plain-text boundaries, targeting fragments ~2.4K chars, content byte-exact
on rejoin. Proven measurements: 7317ch -> 14s rc=0 and 7967ch -> 13s rc=0.
Post-fix corroboration on GitHub's own runners: Lint green in 37s (sibling
PR run 36766834836), 41s (ephemeral validation PR #310) and 54s (ephemeral
validation PR #311), against the 35m cancellations on the unsplit tree.

Fix in the same pass the rules masked beneath the timeout:
markdown/no-missing-label-refs fires on bracketed lists such as a bare
`tags: [security, lint]` value in unfenced doc lines (backtick-wrapping the
whole list value cures it), and trailing-whitespace lines in archive docs
are whitespace-only fixes.

## Prevention

`test/roadmap-length-guard.test.ts` fails any non-HTML-comment ROADMAP.md
line over 4000 chars (provenance comments are exempt - they are not parsed
as paragraphs). Keep riders under ~2.4K per fragment; the house shape is
blank-line + 2-space sub-paragraphs, never physical line-splits inside one
paragraph.

Supersedes in part `ci-validator-poll-window-vs-cold-lint-2026-09-29.md` in
this directory: herd contention may amplify cold-lint latency at smaller
paragraph sizes, but it is not the mechanism that kills the current Main
runs.
