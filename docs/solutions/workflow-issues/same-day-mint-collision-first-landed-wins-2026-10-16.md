---
title: Same-day mint-id collision between concurrent campaign fog bands — verify id occupancy on origin/main before landing, first-landed-wins
date: 2026-10-16
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
---

## Problem

Two repository-maintenance campaigns composing ROADMAP bands on the same day from the
same unlanded-fog frontier each minted `rm-1447`, `rm-1448`, `rm-1449` for completely
unrelated items. Run 85d97dc8's roadmap phase (attempt 18cb5c77, ext#44) minted
managed-render lint repair / installations pagination ceilings / provenance SHA_RE
widening; run ccde661ea990's roadmap phase (fe5d7f42, campaign dashboard-main-c1a05fb)
minted a platform-status banner / idempotency-key policy / dependency-majors sweep.
The fog census each phase reads ("NEXT FREE rm-N") is a *spool-wide* maximum over
unlanded patches — it cannot see a same-day band that has not yet been written.

ccde661ea990's band landed first (origin/main 06095e9). The other run's band — ids
identical, content unrelated — remained unlanded in its stewardship worktree with a
fully validated 7-file delta, a render-guard test suite, and ROADMAP evidence lines
that now name ids owned by foreign defs on main.

## Evidence (2026-10-16, run 85d97dc8 compound attempt 8753a0f3)

- `git show origin/main:ROADMAP.md | grep -E 'id: .rm-144[789].'` → foreign def lines
  (platform-status banner implemented / idempotency-key candidate / dependency-majors
  candidate, all citing run ccde661ea990 roadmap fe5d7f42).
- `git show origin/main:ROADMAP.md | grep -c 'roadmap extension #44'` → 0 (this run's
  band is NOT on main — the ids are foreign, not an adoption of this band).
- `git ls-tree origin/main --name-only test/ | grep -c render-guard` → 0 (the other
  band's ledger landed without this run's code, as expected for unrelated content).

## Resolution rule

1. **First-landed wins.** The band already on origin/main keeps the ids. The landing
   gate of the losing run re-derives id occupancy from origin/main ROADMAP and
   renumbers its band (defs, riders, and every reference below) before landing:
   - def ids and `- evidence:`/`- rider` lines inside the band,
   - code-comment references (here: `src/github/installations.ts`,
     `src/gateway/operator-contract/provenance.ts`),
   - test references (here: `test/installations.test.ts`,
     `test/operator-provenance-sha.test.ts`, `test/roadmap-render-guard.test.ts`),
   - docs/solutions notes citing the ids (here:
     `docs/solutions/workflow-issues/managed-render-lint-regression-2026-10-15.md`).
2. **Re-derive, don't increment.** Choose next-free from the *live* origin/main wall
   at landing time (other fog bands may have moved it again); never trust a recorded
   "NEXT FREE" constant across a time gap.
3. **Compound phases record, landing gates act.** The compound phase flips statuses
   and records the collision; renumbering belongs to the landing gate because only it
   sees the final race outcome.

## Prevention

- Roadmap phases minting ids should re-probe origin/main's def census (not just the
  spool fog ceiling) immediately before minting when more than one campaign is live —
  the fog ceiling is an *unlanded* frontier and races on it are silent until a fetch
  reveals them.
- Any landing gate landing a band whose ids were minted ≥1 day earlier MUST verify
  `git show origin/main:ROADMAP.md` def occupancy for every minted id first; treat a
  foreign same-id def as a renumber trigger, not a merge conflict to hand-resolve.

## Executed (2026-10-17, run 85d97dc8 landing at integrate, conflict case 794ca090)

Rule applied at the landing gate: origin/main had advanced to 55086dd with max def
`rm-1453`, so the band landed renumbered `rm-1454` (render-guard census) /
`rm-1455` (pagination page ceilings) / `rm-1456` (provenance SHA_RE widening) —
next-free re-derived from the live origin/main wall per rule 2. Every reference
below updated in the same landing: the band's three defs + riders in ROADMAP.md,
`src/github/installations.ts`, `src/gateway/operator-contract/provenance.ts`,
`test/installations.test.ts`, `test/operator-provenance-sha.test.ts`,
`test/roadmap-render-guard.test.ts`, and the managed-render-lint-regression note.
The foreign `rm-1447`/`rm-1448`/`rm-1449` defs (run ccde661ea990) keep their ids
and content untouched; render-guard census after the landing: 253 defs, 0 duplicate
ids, 0 dangling refs, 0 trailing-whitespace lines, 12 distinct tracks.
