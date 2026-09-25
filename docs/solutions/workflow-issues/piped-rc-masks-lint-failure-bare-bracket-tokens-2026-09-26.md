---
title: Piped rc masks lint failure until ephemeral CI catches it (ROADMAP bare-bracket tokens)
date: 2026-09-26
category: workflow-issues
module: [conductor, lint]
problem_type: tooling-misuse
component: CI Lint / ROADMAP.md / delegate verification
severity: medium
applies_when: running eslint or any gate locally inside a conductor delegate turn, especially on ROADMAP.md or other markdown that carries bracketed tokens
tags: [eslint, exit-code, pipefail, markdown, no-missing-label-refs, roadmap, ephemeral-ci, conductor]
---

## Problem

Cycle-18's implement turn verified its ROADMAP.md ledger edits with:

```
timeout 90 npx eslint ROADMAP.md <doc> | tail -4; echo "RC=$?"
```

That printed `RC=0` — **but `$?` was `tail`'s exit code, not eslint's.**
The same file then failed the sanctioned ephemeral-CI Lint bucket
(targeted_tests run 1, job 108207012899):

```
ROADMAP.md:537:704  error  Label reference {name,conclusion,detailsUrl} not found  markdown/no-missing-label-refs
```

Root defect: a status line written as plain prose contained the bare
bracket token `[{name,conclusion,detailsUrl}]`. In markdown, `[label]`
that is not a link and has no matching reference definition is a
*label reference*; `markdownlint`'s `no-missing-label-refs` fires on it.
This is the `releases[0]` trap class again — recurring because ROADMAP
status lines naturally quote API field shapes.

Two failures stacked:

1. The bracket token was written unbackticked (authoring miss).
2. The local gate was piped, so the miss survived local verification and
   only surfaced in ephemeral CI — one full validation cycle wasted.

## Solution

**Verification-side (the durable rule):** capture the gate's own exit
code, never a pipe's.

```
timeout 90 npx eslint ROADMAP.md <doc>; rc=$?; echo "ESLINT_RC=$rc"
```

or use `set -o pipefail` / `${PIPESTATUS[0]}` if output must be trimmed.
If the rule is doubted, prove it is active locally first:

```
npx eslint --print-config ROADMAP.md | grep -o 'no-missing-label-refs.*'   # severity must be [2, ...]
```

**Authoring-side (the cheap insurance):** backtick any bracketed token
in ROADMAP.md / docs prose, even mid-sentence:

```
`[{name,conclusion,detailsUrl}]`   # code span — never parsed as a label reference
```

## Prevention

- Treat every local gate invocation inside a delegate turn as
  evidence: if its exit code can be corrupted by the surrounding shell
  line, it is not evidence.
- ROADMAP status lines are prose that quotes GraphQL field selections —
  expect bracket tokens; backtick them by reflex.
- The ephemeral-CI Lint bucket reads the full repo including ROADMAP.md
  and docs/; local checks must cover exactly that scope before a
  full-validation dispatch is spent.

## Evidence

- Failing run: targeted_tests run 1, ephemeral job 108207012899
  (`537:704 Label reference ... not found`), 2026-09-26.
- Fix + green: token backticked; local `npx eslint ROADMAP.md` → rc=0
  with unpiped capture; ephemeral PR #218 all 10 buckets SUCCESS
  (Lint job 108210298446), then PR #219 all 10 buckets SUCCESS.
