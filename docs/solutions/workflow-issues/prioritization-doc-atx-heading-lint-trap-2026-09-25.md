---
title: Bare #NNN PR references at column 0 fail the remote Lint job
date: 2026-09-25
category: workflow-issues
module: dashboard
problem_type: workflow_issue
tags: [markdownlint, eslint, lint, ci, documentation, prioritization-docs, atx-headings]
component: ci_lint
---

# Bare `#NNN` PR references at column 0 fail the remote Lint job

## Problem

Any markdown document in this repository is linted by eslint's `markdown`
plugin as part of the **Main / Lint** CI job — including freshly authored
prioritization/batch docs that are not even tracked yet (the conductor
validation snapshot carries untracked working-tree files into its ephemeral
PR). When prose line-wrapping places a bare GitHub PR/issue reference at
**column 0** of a line, e.g.:

```
... payloads verified by name-only diff for
#155/#166/#157/#136/#113; TWO parallel lineage batches ...
```

markdownlint parses `#155/#166/...` as an ATX heading whose hashes are not
followed by a space, and `markdown/no-missing-atx-heading-space` fails the
whole job:

```
docs/prioritization/2026-09-25-cycle-15-batch-run-70ba5270.md
  17:1  error  Missing space after # on heading style  markdown/no-missing-atx-heading-space
  71:1  error  Missing space after # on heading style  markdown/no-missing-atx-heading-space
```

Observed 2026-09-25 on run 70ba5270's targeted validation: the first
ephemeral-PR run (36101910325, job 107966020653) came back 5 checks green +
Lint red on exactly this, in a doc the author had locally linted only for
its *code* blocks — the failure was invisible until remote CI ran.

## Root cause

`#` at column 0 is grammatically a heading to markdownlint regardless of
intent; a numeric reference `#155` looks like a deliberately malformed
heading (`#155` = heading of level 1 missing its space), not prose. The
author intended an issue reference; the linter cannot tell.

## Solution

Reflow so the line never starts with the bare reference — put a word in
front of the number:

```diff
-#155/#166/#157/#136/#113; TWO parallel lineage batches in spool ...
+PRs #155/#166/#157/#136/#113; TWO parallel lineage batches in spool ...
```

(`#166's ...` → `PR #166's ...`, same fix.)

## Prevention

- **Never wrap a line so a bare `#NNN` lands at column 0.** When writing or
  reflowing any markdown in this repo, start such lines with a word
  (`PRs #NNN`, `PR #NNN`, `issue #NNN`, `see #NNN`).
- Cheap pre-flight that would have caught it locally, no CI round trip:
  `pnpm exec eslint <doc>.md` — the repo's eslint config already lints
  markdown; run it on **every** markdown file you author, not just code
  files.
- Structural check worth keeping in muscle memory:
  `grep -n '^#[0-9]' <files>` finds the offending lines directly.
- Authors of conductor batch docs: remember the remote Lint sees your
  **untracked** docs too (the validation snapshot includes the working
  tree), so "not committed yet" is not a lint exemption.

## Related

- `docs/solutions/workflow-issues/` neighbors for other remote-CI-only
  failures (actionlint container form, base-drift self-hosted residue).
- ROADMAP cycle-1 compound note #5 (2026-09-25) records this same trap.
