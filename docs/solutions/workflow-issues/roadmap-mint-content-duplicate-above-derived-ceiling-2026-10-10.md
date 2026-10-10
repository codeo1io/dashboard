---
title: 'Roadmap mint content-duplicates above a correctly-derived ceiling'
date: '2026-10-10'
category: 'workflow-issues'
module: 'conductor'
component: 'repository-maintenance cycles'
problem_type: 'process failure'
tags: ['conductor', 'roadmap', 'maintenance-cycle', 'dual-track', 'mint-discipline']
applies_when:
  - Two repository-maintenance lineages run concurrently and both mint roadmap items
  - A lane derives its mint ceiling from an all-lineage def-line scan
  - A selected def's content may also exist under a sibling id
solution: 'Run content greps (distinctive literals from the signals evidence) over every sibling wall, spool patch, and remote ref at MINT time — ceiling arithmetic alone cannot see content; resolve any surviving duplicate by first-selection at prioritize and fold the loser to superseded at integrate'
prevention: 'Never mint from the ceiling number alone; grep the CONTENT anchors first, and record the dual-track fold plan in the selection rider the moment a duplicate is spotted'
---

# Problem

The all-lineage mint-ceiling discipline (scan every run wall, integration
worktree, remote `conductor/run-*` ref, and spool patch for the highest def
id, then mint above it) prevents id collisions — it cannot prevent CONTENT
duplicates. On 2026-10-10, cycle:3 run 159ec0eba87d minted `rm-837` (10
`no-non-null-assertion` warnings in `test/listener-store-degradation.test.ts`)
at ~13:20Z. Within the hour, sibling run 1c814809d084 (campaign 3ea1787da405)
minted `rm-839` with byte-equivalent acceptance content — ABOVE the
correctly-derived ceiling rm-837, which their own extension comment even
cites — because their ceiling scan sees def-line numbers, not what the defs
say, and their content-grep pass predated the sibling def appearing on the
wall.

Two lanes then each hold a def for the same work. Without a resolution rule
this mints double implementations and an integrate-time id fight even though
no id was ever duplicated.

# Solution

1. **First-selection resolves the dual-track.** The lane whose def is
   selected first implements; the duplicate def folds to `superseded` at
   integrate with a pointer to the winner. Record the fold plan in the
   SELECTION RIDER the moment the duplicate is spotted (this run's rider:
   "rm-839 is a content-duplicate of rm-837 — fold at integrate, no second
   implementation"), not at integrate time when memories have gone cold.
2. **Reconcile by content, not by id.** When a sibling lane has already
   built the same change, adopt the sibling's SHAPE deliberately and say so
   in the implement rider: this run's rm-837 implementation adopted
   8134eb2e6b13-29ef0e46's `rowByTitle` accessor verbatim-by-shape so the
   two lanes' hunks reconcile by content at integrate regardless of which
   def id wins.
3. **Content greps at mint time.** Before minting, grep 2–3 distinctive
   literals from the candidate's evidence (file names, warning classes,
   field names) across every sibling `ROADMAP.md` wall, the delegate spool
   `*.patch` set, and the remote `conductor/run-*` refs — the same sweep
   already used for the ceiling, but matching content instead of ids.

# Prevention

Mint discipline has two legs and both are mandatory: the ceiling scan
(numbers) and the content-grep (meaning). A lane that only walks ids will
mint a fresh id for known content whenever a sibling def landed between the
grep and the mint — which under a busy fleet is minutes, not hours.
Cross-reference: id-collision mode and stale-base mode are covered in
`stale-dispatch-base-and-parallel-lineage-mint-collision-2026-09-25.md`;
reaped-attempt forensics in
`maintenance-cycle-learnings-2026-10-08-reap-forensics-zero-mint-fold-ci-attribution.md`.
This entry adds the third mode: duplicate content under a correctly-fresh
id.
