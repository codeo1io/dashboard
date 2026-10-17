---
title: A phase result without validation_evidence fails the implement fold even when the work is done
date: 2026-10-07
category: workflow-issues
module: conductor-pipeline
problem_type: workflow_issue
tags: [conductor, implement, validation-evidence, ktd13, fold-gate, phase-result]
component: delegate-workflow
---

# A phase result without validation_evidence fails the implement fold even when the work is done

## Problem

An implement phase completed its full batch, all gates green, worktree left
byte-stable — and the fold still rejected it with the changed-surfaces
attestation rejection. The phase result JSON simply carried no
`validation_evidence` key, so the attestation gate compared an empty
`changed_surfaces` declaration against an engine-derived delta of two
executable surfaces and failed closed.

## Mechanism

The fold gate does not infer effort or completeness: it enumerates the delta
between the workspace base SHA and the worktree, classifies surfaces, and
requires the implement phase result to DECLARE a changed-surfaces list that
covers the executable delta. Missing key, empty list, or a list that omits an
executable surface all reject. Nothing about the underlying work was invalid
— the record was.

## Cure (re-emit, do not redo)

1. Prove the worktree is byte-stable since the rejected attempt: identical
   `git status --porcelain`, file mtimes at or before the rejected attempt's
   result JSON timestamp, and the engine run row pinning the workspace base
   SHA. With stability proven, redoing implementation work adds risk, not
   evidence.
2. Re-emit the phase result with the full `validation_evidence` record:
   scope, command, outcome, digest, and `changed_surfaces` as the FLAT full
   engine-enumerated surfaces list (include non-testable surfaces too — a
   harmless superset that keeps the fold immune to gate-semantics drift).
3. Reproduce the gate offline first (load the written JSON, run the fold
   check against the real engine code with the real base SHA) so the re-emit
   is known-good before it is submitted.

## Prevention rule

For any fix/test-bearing phase, treat `validation_evidence` as part of the
deliverable, not an optional footer: it is consumed and validated directly,
and prose or a markdown document in its place fails the phase. If the fold
rejects on attestation, suspect the record before suspecting the work.
