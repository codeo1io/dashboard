---
title: Concurrent phase attempts share the run worktree — converge, dedupe ROADMAP ids, re-fingerprint
date: 2026-09-25
category: docs/solutions/workflow-issues
module: conductor delegate workflow
problem_type: workflow_issue
component: development_workflow
severity: medium
tags: [conductor, worktree, roadmap-id-hygiene, fingerprint, merge-convergence]
applies_when: two attempts of the same conductor phase (or two phases) operate in the same run worktree, or unfamiliar unexplained edits appear mid-phase
---

# Concurrent phase attempts share the run worktree — converge, dedupe ROADMAP ids, re-fingerprint

## Context

During run 4e7c674 implement (2026-09-25), a second attempt of the same phase
interleaved writes into the shared run worktree: the same six roadmap ids
(rm-181..rm-186) appeared twice in two different hand-styles, signal lines
carried doubled same-day update markers, and four test files showed
modifications the first attempt never made.

## Guidance

- **Fingerprint before and after.** `git status --porcelain | sort | sha256sum`
  (first 16 hex chars) at phase start, at each suspicious moment, and at the
  end. A changed fingerprint with no edits of your own means someone else is
  writing; an unchanged one after your own edits means your edits are the
  whole delta.

- **Prove provenance before clobbering.** `git diff -- <file>` on every
  unfamiliar modification. In this incident the foreign test edits were
  convergent — they propagated a new required DTO field into fixtures the
  first attempt hadn't reached — so keeping them completed the change rather
  than conflicting with it.

- **Dedupe ROADMAP ids by the LEADING token only.** Extract the id from
  `- id: \`rm-NNN\`` lines by leading token; other `rm-NNN` tokens inside the
  same line are cross-references, not items (counting them manufactures false
  duplicates). Two items with the same leading id in different hand-styles
  are the interleave signature — keep one (prefer the richer block), fold any
  distinct evidence from the other into it.

- **Collapse doubled signal segments, keep distinct refreshes.** Same-day
  update markers appended twice with identical text collapse to one;
  markers referencing different upstream bases (e.g. a 480c92c refresh vs a
  57a182b refresh) are distinct evidence and both stay.

- **Re-run the focused gate set on the converged tree.** Lint, check-types,
  the touched-surface test files, and the roadmap id-hygiene grep — the
  convergence edit itself needs validation. Then re-fingerprint and record
  the final fingerprint in the phase evidence so the merge gate can detect
  any further drift.

## Applicability

Any conductor run where the engine re-dispatches a phase (attempt re-fire)
while the previous attempt's worktree edits are still uncommitted — exactly
the situation this repo's integrate/merge stages see repeatedly. The same
convergence discipline applies there: prove surface identity via blob/tree
comparison instead of re-running from scratch.

## Related

- docs/solutions/workflow-issues/implemented-is-not-landed-and-narration-is-not-evidence-2026-09-22.md
- ROADMAP.md id-hygiene convention (leading-token extraction)
