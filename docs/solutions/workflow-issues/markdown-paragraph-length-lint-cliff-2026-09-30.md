---
title: Markdown paragraph length is a lint-time cliff — split paragraphs, not lines
date: 2026-09-30
module: lint
problem_type: pathological runtime
component: eslint markdown pipeline + ROADMAP.md
severity: high
applies_when: markdown files carry very long single-line (or lazily joined) paragraphs
---

# Markdown paragraph length is a lint-time cliff — split paragraphs, not lines

> **Sibling record**: `roadmap-paragraph-length-quadratic-lint-cliff-2026-09-30.md`
> in this directory is sibling run 7ce48fe5's same-day record of the same
> cliff; on top of the split cure documented here it added the standing
> automated guard (`test/roadmap-length-guard.test.ts`, fail >4000 chars).

## Problem

The markdown lint pipeline goes superlinear on long paragraphs. Measured
2026-09-30 on this repository's files: a 1,973-char paragraph lints in ~7s, a
3,227-char one in ~4s, a 5,267-char one in ~5s, and 7,376/8,026-char ones
exceed 420 seconds each — well past the CI Lint job's 35-minute budget. From
2026-09-29, roadmap "signals" paragraphs had grown to 7,317 and 7,967
characters through single-line appends, so every push-to-main Lint job
self-cancelled at exactly `timeout-minutes: 35` (runs 36576833307,
36599485283, 36692888877), leaving main with no green full run while every
other job passed.

Two aggravators made this worse:

- Splitting the physical line does not help. The remark parser rejoins
  lazy-continuation lines into one AST paragraph, so a 7,200-character
  paragraph wrapped across physical lines still times out.
- The cliff masked real errors. Once the timeout was removed, repo-wide lint
  surfaced eleven trailing-space errors in an archived batch doc and a
  missing-label-ref error on a bracketed tag list — all invisible while the
  job died at the cliff first.

## Solution

Break the paragraph into multiple real paragraphs, separated by a blank line,
inside the same list item:

1. Insert a blank line where the fragment should end.
2. Indent the continuation two spaces so it stays inside the list item.
3. Split at single spaces between plain-text neighbors and keep fragments
   around 2.4K characters.
4. Keep the content byte-exact on rejoin — the split is a formatting change
   only.

Results after splitting the two pathological lines (7,317 and 7,967 chars) and
capping the file's max paragraph at 5,222 chars: local repo-wide lint
completes in ~80 seconds under host load 45 (it previously could not finish
inside 600 seconds), and CI Lint is green again — 68 seconds on validation
PR 305, green likewise on PR 306 (2026-09-30).

## Prevention

- Keep signals-style paragraphs under roughly 5K characters. Append new
  dated evidence as its own rider bullet or as a new blank-line-separated
  fragment — never as an unbounded single-line append.
- When lint output shows a job cancelled near its timeout, measure paragraph
  lengths before blaming variance: `awk '{ print length }' FILE | sort -rn |
  head` finds the cliff lines in one pass.
- Backtick-wrap bracketed lists like `tags: [a, b]` in docs to avoid the
  missing-label-ref rule, and never start a comment line in linted YAML with
  the bare word `eslint` — the inline-config parser claims it and emits a
  parse error.
- Doc-only cures do not change the validation digest, and that is provable
  rather than assumable: insert the release `src` on `sys.path` and call
  `hermes_conductor.validation_policy.validation_digest('<base sha>', repo)`;
  `classify_surface()` returns non-executable for `.md` under `docs/` and for
  `ROADMAP.md`, so the recomputed digest equals the dispatched one verbatim.

## Evidence

- Timeout signature: `gh api repos/codeo1io/dashboard/actions/runs/36692888877/jobs`
  (Lint cancelled at 35m; five sibling jobs success), same for runs
  36599485283 and 36576833307.
- Post-split green: validation PR 305 Lint 68s, PR 306 all ten checks green
  (2026-09-30); local repo-wide lint rc=0 in ~80s under load 45.
- Length measurements pre/post: 7,967 and 7,317 at lines 413/176 pre-fix;
  max 5,222 post-fix.
