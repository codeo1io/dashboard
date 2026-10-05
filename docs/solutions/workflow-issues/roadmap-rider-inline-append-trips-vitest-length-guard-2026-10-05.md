---
title: "ROADMAP riders appended inline trip the 4000-char vitest length guard that lint cannot see"
date: 2026-10-05
category: workflow-issues
module: roadmap
problem_type: markdown-guard
component: [ROADMAP.md, test/roadmap-length-guard.test.ts]
severity: medium
applies_when: "any phase appends dated rider prose onto existing long list lines in ROADMAP.md"
tags: [roadmap, riders, vitest, lint, rm-284, maintenance]
---

## Symptoms

- An ephemeral-PR validation goes red on Main/Test ONLY, failing
  `test/roadmap-length-guard.test.ts` (rm-284) with "no non-comment line
  exceeds 4000 chars" — while Lint, Check Types, and every other job stay
  green.
- The triggering edit is small and innocent-looking: a dated rider sentence
  appended to the END of an existing `- signals:` (or `- evidence:`) line.

## Problem

rm-284's guard is a VITEST test over ROADMAP.md lines, not a lint rule.
Several ledger lines legitimately sit at ~3.3K chars; a rider appended inline
grows them past the 4000-char cliff. The repo's markdown lint does not check
line length (the 2026-09-30 lint-cliff family was a lint-RUNTIME problem —
see `markdown-paragraph-length-lint-cliff-2026-09-30.md` and
`roadmap-paragraph-length-quadratic-lint-cliff-2026-09-30.md` — a different
failure class), so every local gate except the guard test passes and the red
surfaces only on CI's Main/Test job.

Firing of record (2026-10-05, run `3570419605cb`): the implement rider for
rm-116 was appended inline to its `- signals:` line, growing it 3333 → 4131
chars; ephemeral PR `387` run 1 failed Main/Test (job `111904086507`, run
`37351767759`) with Lint green.

## Cure

Split the rider out of the long line into a blank-line-separated,
2-space-indented sub-paragraph inside the SAME list item (rm-284's own
documented pattern):

- the base line stays byte-identical to its committed form;
- the rider text moves verbatim into the sub-paragraph;
- the guard predicate is re-checked locally before folding (see below).

## Prevention

1. NEVER append riders inline to existing long ROADMAP list lines — land
   riders as their own `- rider (...)` line, or as a blank-line
   sub-paragraph when they must live inside another item's block.
2. Before folding any ROADMAP edit, run the guard predicate as a static
   check (this is file inspection, not a test run):

   ```sh
   python3 -c "import sys; bad=[(i+1,len(l)) for i,l in enumerate(open('ROADMAP.md')) if len(l.rstrip(chr(10)))>4000 and not l.lstrip().startswith('<!--')]; print(bad or 'clean')"
   ```

3. Treat "Lint green but Main/Test red on the guard test" as this exact
   signature — diff the touched lines' lengths, do not re-run the suite
   looking for a product regression.
