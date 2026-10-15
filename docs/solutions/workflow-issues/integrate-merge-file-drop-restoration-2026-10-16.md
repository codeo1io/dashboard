---
title: Integrate-merge file drop — restoring dropped self-maintenance surfaces (and finding their subjects regressed)
date: 2026-10-16
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
---

## Problem

The 3e3664c integrate merge landed a run's batch but silently dropped ~60
files that existed in the integrated run's tree — including an error boundary,
six guard tests, a lockfile tripwire workflow, and two docs. Nothing failed at
landing time because the dropped files WERE the checks: no in-tree assertion
pinned their existence, and the merge diff looked clean (the files were absent
from main's side, so the merge had nothing to reconcile). Two guard SUBJECTS
(not just their tests) regressed with them: the rm-713 `/robots.txt` route and
the symlink-aware entry-point gate in `src/server.ts`.

Discovery path: `comm -23 <(git ls-tree -r --name-only <integrated-commit>) <(git ls-tree -r --name-only <main>)`
— the tree-vs-tree census is the only reliable detector; the merge diff is not.

## Solution (run 1a261b63 cycle:2, rm-887)

1. **Restore from git objects, not memory.** Every dropped file was recovered
   verbatim via `git show <commit>:<path>` — the integrated run's tree is the
   provenance of record.
2. **Expect the tree to have drifted; re-derive, don't transplant blindly.**
   The operator-contract-window test pinned `1.6.0`/window exports that no
   longer exist at HEAD (contract now `1.9.0`, kinds are a `ReadonlySet`).
   Re-derive assertions against live truth (verified by importing the real
   modules under `node` BEFORE pinning) and leave an in-file note for the
   fenced owner to extend later.
3. **A restored test may fail because its subject regressed — that is a find,
   not a blocker.** Restore the subject too, from the same provenance commit.
   The naive first cut of the entry gate FAILED the 3 symlink tests the
   restored suite carries; the full symlink-aware implementation
   (`realpathSync(argv[1])` retry after the raw `pathToFileURL` compare) was
   also in the dropped tree — restore the complete cure, not the naive shape.
4. **Guard machinery names its own terms.** Restoring the read-only-invariant
   guard (whose detectors are the literal `wiki-writer`/mutating-verb
   patterns) tripped the prose-residue guard (rm-164). The documented
   convention: EXCLUDED_FILES entry with the "guard machinery names its own
   terms" rationale — the 06396b4 prose-residue guard already had it; restore
   that line rather than rewording the detector.
5. **Restores can resurrect coupled prose.** The endpoint-parity guard
   (rm-556) reddened because README documented `GET /robots.txt` — the line
   was restored from the same commit's README.
6. **Canonicalize duplicate spellings.** The drop left TWO divergent
   invariant-guard files (218-line and 197-line). Restore one canonical file,
   diff-merge the other's unique detector in, and pin single-spelling with a
   presence-guard rider (`test/restored-critical-files-guard.test.ts`) so the
   restore itself is now tree-enforced — the anti-recurrence for this class.

## Verification pattern

- RED proof by absence at base, then per-file green.
- RED proof by insufficient implementation for the symlink-entry tests.
- Focused suites, then the six-job Main-workflow local mirror (Actions dark —
  see `actions-disabled-local-mirror-validation` if present, else the
  supervisor-ratified mirror memory) for full validation.

## References

- Batch: rm-887; run 1a261b63dce7 cycle:2 (implement bd313244, targeted
  5a37c360, full 55f42bd8, compound 01efe234).
- Related upstream-of-detection lesson: tree-vs-merge-diff audit rider on
  integrate merges (rm-887 acceptance leg) — prevent the drop, don't just
  detect it after the fact.
