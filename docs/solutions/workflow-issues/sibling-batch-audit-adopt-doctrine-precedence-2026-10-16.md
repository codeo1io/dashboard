---
title: Audit-adopting a sibling batch — doctrine precedence for divergent copies and claim guards that test behavior
date: 2026-10-16
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
tags:
  - worktree-adoption
  - three-way-merge
  - guard-tests
---

## Problem

Conductor run worktrees routinely hold a finished-but-uncommitted batch that a later
cycle wants to adopt instead of re-authoring. Two hazards recur:

1. **The adoption source mixes concerns.** Its dirty state contains the wanted
   surface PLUS unrelated items (this cycle: a lane-integrity tool pair and its
   AGENTS.md append riding the same worktree as the push-channel repair).
2. **The source's local design diverges from what actually landed.** The sibling
   rebuilt the push-notification copy module (raw 8-label set, gateway-text
   fallback for unknown kinds) while main had since landed an upstream-reviewed
   module with different doctrine (humanized reason text, gateway title/body
   never rendered). Adopting the source's module wholesale would have silently
   reverted a reviewed landing.

## Resolution recipe (run 8fc084eaafe3, cycle:4)

1. **Classify every dirty file** as wanted-surface / separate-concern by reading
   the source's diffs — adopt per file, never `git checkout` the whole tree. For
   AGENTS.md, verify WHICH hunks belong to which concern; concerns can share a
   worktree without sharing a change unit.
2. **Prove clean-copy safety**: if `git rev-parse <source-base>:<file>` equals
   `git hash-object <main file>`, main did not diverge — copy the source file
   directly. Otherwise extract the base blob (`git show <base>:<file>`) and
   three-way with `git merge-file -p ours base theirs`.
3. **Doctrine precedence: the LANDED, reviewed module wins** over the sibling's
   local redesign. Keep main's module verbatim; instead reconcile the ADOPTED
   tests and docs to the shipped behavior. Chronology is not authority —
   landing is.
4. **Pin public claims to behavior, not wording.** The privacy page guard now
   imports the shipped module and asserts its rendered output for known kinds,
   the generic card for unknown kinds WITH gateway text present, and that the
   page's disclosure sentences match — so docs, tests, and feature truth cannot
   re-diverge silently (they had: a false "imported by" header, a three-events
   claim over a dead channel, and a null-controller dev aid).
5. **Comment-only workflow edits** in the same batch are validated with
   actionlint (container form) — no semantic change, but prove it.

## Pitfalls

- Build-output guards read `web/dist`, and direct vitest invocations bypass
  `pretest`: rebuild (`pnpm build:web`) before focused web suites or the guards
  assert a stale bundle (see
  `targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md`).
- The prose-residue guard flakes once on cold node_modules load (documented
  separately); a warm rerun is green — do not misread it as a tree regression.
- Adopting a test rewrite can shrink a suite (this cycle: web 1213 to 1170,
  subscribe.test rewritten around new seams). Focused-green is the gate; a
  coverage-parity skim is the honest follow-up, recorded in the roadmap rider.

## Cross-references

- Full validation under the Actions run-creation outage: this delta was proven
  by a mirror-repo CI PR (9/9 checks, commit a8fc5d9) — route documented in
  `actions-account-disable-fulltests-local-mirror-2026-10-09.md`.
- Roadmap riders: ROADMAP.md rm-1446..rm-1451 (this cycle's band; see the
  id-collision rider for the renumber protocol at landing).
