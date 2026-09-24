---
title: Hard-wrapped markdown lines must never start with a hash token (ATX heading lint reads PR refs as broken headings)
date: 2026-09-25
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - Authoring or reflowing any markdown document in this repository (prioritization batch docs, solutions, runbooks)
  - A hard-wrapped prose line begins with #97, #113, or any '#'-prefixed reference token
  - The Lint job fails on markdown/no-missing-atx-heading-space in a file you never meant to contain a heading
---

# Hard-wrapped markdown lines must never start with a hash token (ATX heading lint reads PR refs as broken headings)

## Context

During cycle-13 targeted validation (run f1ae52a3f04b, 2026-09-25), the ephemeral-PR Lint check failed on
the freshly authored batch doc docs/prioritization/2026-09-25-cycle-13-batch.md:59 — the only failing
check of ten. The offending line was ordinary prose that happened to wrap immediately before a PR
reference:

```text
…locked by the open PRs, scoped to
#113/#114 only — the dedupe-un-ack replay lineage…
```

markdownlint parses a line-initial `#` followed by non-space as a malformed ATX heading
(`markdown/no-missing-atx-heading-space`), so the wrap turned two PR numbers into a lint error that
blocked the whole gate. The error is invisible while writing because the text is prose, not a heading,
and local authoring does not run the markdown rules until the gate does.

## Guidance

Reflow the wrap so the `#` token sits mid-line; never start a wrapped line with `#`. For example,
re-wrap as "…scoped to PR #113 / and PR #114 only — …" or move the reference to the start of the
sentence as plain words ("PR #113 and PR #114 only —"). Content stays identical; only the break point
moves. When wrapping long signals lines in ROADMAP.md or batch docs, prefer breaking at em-dashes,
semicolons, or before a backticked code span rather than at a bare `#NNN` token.

## Why This Matters

This repository gates markdown in CI (the Lint job runs the markdownlint rules over docs), so a single
bad wrap in an untracked working-tree doc is enough to fail the authoritative validation — the snapshot
includes untracked files (proven twice this cycle: the failing doc and the new .dockerignore both rode
the ephemeral-PR snapshot). A doc-only change therefore cannot be treated as digest-neutral for CI
purposes: it can redden the gate even when every executable surface is untouched.

## When to Apply

- After writing or reflowing any `.md` file destined for the repo (batch docs, solutions, runbooks,
  ROADMAP signals), scan for line-initial hash tokens.
- Quick self-check before finishing a doc phase (construction check, no tooling needed):

```sh
grep -nE '^#[^ #]' <file>
```

must print nothing for prose docs (a legitimate ATX heading always has a space after the hashes).

## Examples

Bad (wrap lands on the reference):

```text
the lock is held by
#97 and its stranded branch
```

Good (reference kept mid-line, break before the sentence instead):

```text
the lock is held by PR #97
and its stranded branch conductor/run-c2ae28ab9962
```
