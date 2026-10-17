---
title: Ledger riders citing cross-lineage roadmap ids must be fog-marked, and candidate trees face current-main guards via ephemeral PRs
date: 2026-10-17
last_updated: 2026-10-17
category: workflow-issues
module: [conductor, roadmap, ci]
problem_type: process-trap
component: roadmap, ledger-riders, ci-validation
severity: medium
applies_when: writing ROADMAP riders or any prose that cites rm-NNNN ids, or relying on base-era test results for a candidate tree
---

## Problem

Two coupled traps hit during repository-maintenance cycle 2 (run `0f5694c6b2f64488a14398d623dd2199`, 2026-10-17):

1. **Dangling narrative refs.** A dated rider written against the run's base ledger cited
   cross-lineage sibling ids bare (`unlanded rm-1478/rm-1461 lineages`). Those ids exist only in
   sibling worktree ledgers that had not landed, so this ledger had no def-line or Closed-items
   entry for them. The `roadmap-render-guard` test ("every rm-NUMBER narrative ref resolves to a
   def-line or Closed-items id") rejects exactly that.
2. **Base-era blind spot.** The guard landed on main AFTER this run's base commit, so no local
   battery at the base could see the violation. It surfaced only when the authoritative CI channel
   materialized the dirty worktree and ran current-main checks on it: ephemeral validation PR
   #849 failed its Test job (`Dangling refs: ROADMAP.md:491 -> rm-1478, ROADMAP.md:491 -> rm-1461`).

## Root cause

- Rider prose is validated against the CURRENT main at validation time, not against the ledger
  snapshot the author wrote into — concurrent sibling landings add guards and ids constantly.
- The ephemeral-PR validator (`github_ci_validate.py`) pushes a materialization of the DIRTY
  worktree, so a candidate delta is always judged by later-main guards even when the run never
  rebased onto them locally.

## Solution / rule

1. **Write cross-lineage refs fog-marked at authoring time.** The guard's exemption regex is
   `fog[ (]*rm-\d+(?:\s*\/\s*rm-\d+)*` — house forms: `fog rm-553`, `fog rm-1440/rm-1441`,
   `unlanded fog rm-1478/rm-1461 lineages`. If an id has no def-line or Closed-items entry in
   THIS ledger, it must be fog-marked or not cited. Note what the guard skips entirely: lines
   starting with `` - id: `rm- `` (def-lines may cite anything) and lines containing `<!-- -->`
   comments (tail comments are exempt), so id-census/dedupe maps belong in the extension comment.
2. **Cure shape.** One-word fix: prefix the refs with `fog`. The cure is md-only, which never
   moves the validation digest (the digest hashes executable surfaces only) — re-deriving the
   digest after an md fix should confirm byte-equality with the declared value.
3. **Before relying on base-era greens, run the ledger guards at the CURRENT head** when any
   ROADMAP delta exists, or let the ephemeral-PR channel catch it early — a failed ephemeral PR
   is cheap; a failed fold is not.

## Evidence

- Failing run: ephemeral PR #849, Main workflow Test job, run 39014491131 (log-failed output
  names `ROADMAP.md:491` and both ids).
- Cure: `ROADMAP.md:491` `unlanded rm-1478/rm-1461 lineages` → `unlanded fog rm-1478/rm-1461
  lineages`; green on ephemeral PRs #850 (targeted) and #864 (full, Main run 39024250963).
- Guard source: `test/roadmap-render-guard.test.ts` (FOG_MARKED_RE, def-line/comment-line skip).
- Digest neutrality proven live: `hermes_conductor.validation_policy.validation_digest` returned
  the identical `validation:v1:65e07a77…` before and after the md-only fix.

## Related

- Concurrent-landing supersede pattern (three of four cycle selections superseded mid-run by
  sibling landings): the stewardship-phase overlap check is mandatory, not courtesy.
- `docs/solutions/workflow-issues/` siblings for the ephemeral-PR channel semantics.
