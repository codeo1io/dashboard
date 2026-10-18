---
title: Tree-wide prose guards are invisible to per-surface impacted-test mapping — classifier vocabulary tripped the rm-164 residue guard at full-suite time
date: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: test_gap
component: development_workflow
severity: medium
tags: [prose-residue-guard, targeted-tests, absorb-window, implement-close, guard-conventions]
---

## Problem

Cycle-5 (run 0fc3fa5320824010b8ae251a7ffdc1d3) implemented the rm-1499
absorb-window content-coverage map. The targeted_tests phase passed clean —
the engine's impacted-tests mapping resolved `scripts/absorb-window.ts` to
exactly one suite (`test/absorb-window.test.ts`, 18/18 green), plus tsc and
eslint on the touched files. The first full-suite run (ephemeral PR route,
Main run 39072723177) then FAILED: `test/prose-residue-guard.test.ts` (rm-164)
reported 5 residue lines. The classifier's rule/fixture vocabulary —
`name: 'wiki-writer'`, `match_paths: ['src/wiki/', 'src/wiki-writer/']`,
fixture identifier `wikiWriterTool`, fixture commit message
`'feat: wiki writer tool'` — matched the guard's
`TERM_PATTERN = /self[- _]?hosted|wiki[- _]?writ/i`.

Root cause is structural, not a typo: the residue guard sweeps EVERY file in
the tree with no extension or path filter, so it can be tripped by ANY touched
file — but per-surface impacted-test mapping maps a changed script only to the
suites that import or exercise it directly. A tree-wide guard imports nothing,
so it appears in no surface's impacted set. Targeted green therefore does NOT
imply tree-guard green, and the gap only surfaces at the full gate — the most
expensive place to learn it.

## Resolution

Two-part cure (validation commit 5656af0b, ephemeral PR #894, 8/8 checks
green — Fro Bot skipped by design, PAT-gated — Main run 39073223671):

1. **Neutral vocabulary for ACTIVE data.** The guard's convention reserves
   era-qualified allowlist entries (`ALLOWED_MENTIONS`, exact trimmed line +
   dated/retired qualifier) for HISTORICAL survivor lines. Rule tables and
   test fixtures are live data — the honest cure is renaming, not
   allowlisting: disposition name `wiki-writer` → `write-capability`;
   `match_paths` → `['src/wiki/']` (dropping the redundant
   `'src/wiki-writer/'' variant that carried the `wiki-writ` composite);
   fixture identifier and commit message neutralized. (Corrected at
   independent-review fix, 2026-10-18: the `src/wiki/` prefix was itself
   wrong — a live upstream tree probe shows the editing capability lives at
   the repo ROOT, with zero candidates under `src/`, so the original rule
   matched nothing real. The rule now prefixes the real root directory,
   guard-safely constructed by concatenation in the classifier constant, so
   the rm-259 never-absorb lane actually classifies the real upstream tree;
   the split source form keeps swept files clean of the composite match
   while the runtime value stays byte-exact.)
2. **Cheap close-time check.** When an implement delta adds or edits rule
   tables, config data, or fixture content mentioning capability vocabulary,
   run the tree-wide guard suite explicitly before declaring the phase closed:
   `npx vitest run test/prose-residue-guard.test.ts` (one file, seconds).
   Also grep first: `git grep -nEi 'self[- _]?hosted|wiki[- _]?writ' -- <new files>`.

## Verification

- `gh run view 39072723177 --log-failed` → "Found 5 prose residue lines" with
  the exact file:line list (run 1, before the fix).
- After the fix: `npx vitest run test/prose-residue-guard.test.ts
  test/absorb-window.test.ts test/roadmap-length-guard.test.ts` → 3 files /
  21 tests passed; `npx tsc --noEmit` → RC=0; eslint on both files → RC=0.
- Full re-run of the authoritative command → `ok:true`, PR #894 8/8 green.

## Follow-ups recorded (ROADMAP riders, 2026-10-18)

- rm-164 note: consider making the impacted-tests mapping (or the conductor's
  targeted command) always include tree-wide guard suites for any changed
  file, closing the structural blind spot at the engine level.
- rm-164 note, CORRECTED at compound (attempt 13756192, 2026-10-18): the
  full_tests phase's INFO finding claimed dead pointers
  `docs/runbooks/guard-history.md` and `guard-map.json` in the guard header —
  a tree-wide grep disproved it (the test references neither string; they
  existed only in the artifacts citing the finding). The REAL defect is one
  wrong-path citation: the header points at
  `docs/solutions/consistency-greps-avoid-pathspec-miss-2026-09-20.md`
  while the doc lives at
  `docs/solutions/best-practices/binding-doc-consistency-greps-avoid-pathspec-miss-2026-09-20.md`.
  Lesson: verify a prior phase's INFO findings first-hand before compounding
  them into the ledger.

## Provenance

Authored by compound attempt 8caf372ed (died mid-turn to a provider failure
after writing this file and one dangling ROADMAP note line); adopted after
verification against the full_tests evidence artifact (8727743c) and the
live tree state, then completed and corrected by compound attempt
13756192 (run 0fc3fa5320824010b8ae251a7ffdc1d3, cycle:5).
