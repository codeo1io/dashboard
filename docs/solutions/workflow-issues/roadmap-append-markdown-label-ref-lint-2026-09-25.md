---
title: 'ROADMAP prose appends with bare bracket tokens trip markdown/no-missing-label-refs — CI Lint red not catchable by TS-focused gates'
date: 2026-09-25
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: low
applies_when:
  - 'A maintenance phase appends dated prose signals or item text to ROADMAP.md (or any linted .md)'
  - 'The appended prose contains array-index or bracket-like tokens such as `releases[0]`, `runs[1]`, or `[text]` not written as inline code'
  - 'Implementation-phase verification ran eslint on the touched TypeScript files only, and the batch passed check-types and vitest'
---

# Problem

The cycle-1 batch of run 5ae8aaf7 (2026-09-25, "ledger & citation truth") landed
a `ROADMAP.md` signal append containing the plain-text token `releases[0]` —
evidence prose for `gh api .../releases --jq '.[0]'`. `eslint-plugin-markdown`
parses `[0]` as a collapsed reference link whose label `0` has no definition,
and `markdown/no-missing-label-refs` errors:

```
ROADMAP.md
  389:4639  error  Label reference '0' not found  markdown/no-missing-label-refs
```

Every implement-phase gate was green — `pnpm check-types`, `eslint` on the
touched TS files, focused `vitest` — because none of them lint `ROADMAP.md`.
The failure surfaced only at the engine's ephemeral CI validation PR (Lint job,
Main workflow), i.e. after the phase had declared success.

# Root cause

Two gaps compound:

1. Bracket-like tokens in prose (`releases[0]`) must be inline code
   (`` `releases[0]` ``) or they are parsed as link references.
2. The repo's lint surface is wider than the files an implement phase usually
   eyeballs: `pnpm lint` = eslint over TS **and** markdown **and** yaml
   (the `yml/quotes` rule). "Focused eslint on changed TS files" is not a
   lint gate for a batch that touches `.md` or `.yaml`.

# Fix (one token)

```
- upstream tip remains v0.115.1 (releases[0], published 2026-09-24T22:51Z …)
+ upstream tip remains v0.115.1 (`releases[0]`, published 2026-09-24T22:51Z …)
```

# Prevention

- Any batch touching `.md` or `.yaml` runs the **full** `pnpm lint` as its
  implement gate — not `eslint <changed-ts-files>`.
- In appended roadmap/signals prose, write array-index and bracket tokens as
  inline code: `` `releases[0]` ``, `` `.[0]` ``-style jq fragments likewise.
- Detection command for the whole class, cheap enough to run before handoff:

```sh
pnpm lint
# or narrow: pnpm exec eslint --rulesdir 2>/dev/null || pnpm exec eslint ROADMAP.md README.md docs/prioritization/*.md
```

- When the engine's ephemeral validation PR reports a Lint failure, prove the
  snapshot is your tree before treating it as foreign noise (see
  `validation-clone-exclude-pathspec-drops-staged-breadcrumb-deletion-2026-09-24.md`
  for the snapshot-identity method — note `git write-tree` reads the INDEX and
  silently validates the wrong tree when edits are unstaged; diff the fetched
  snapshot sha's content against your working tree instead).
