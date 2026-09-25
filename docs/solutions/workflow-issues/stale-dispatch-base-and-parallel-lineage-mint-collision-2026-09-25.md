---
title: 'Stale dispatch base and parallel-lineage roadmap-id mint collisions'
date: '2026-09-25'
category: 'workflow-issues'
module: 'conductor'
component: 'repository-maintenance cycles'
problem_type: 'process failure'
tags: ['conductor', 'roadmap', 'maintenance-cycle', 'validation']
applies_when:
  - A conductor dispatch worktree lags origin/main at dispatch time
  - Two repository-maintenance lineages run concurrently and both mint roadmap ids
  - A batch is selected while a sibling batch is still unlanded
solution: 'Re-verify every finding at the origin/main tip and re-base before implementing; mint ids only above the all-lineage ceiling and let the integrate renumber the loser'
prevention: 'Run the freshness gate (fetch + rev-list + merge-base) at the start of EVERY phase, not just the first'
---

# Problem

Two failure modes recur across maintenance cycles on this repository, and both
burned real effort before being codified here:

1. **Stale dispatch base (rm-165, four recurrences).** A dispatch worktree is
   cut at the canonical checkout's HEAD, which can sit well behind origin/main
   (45 commits in the 2026-09-25 case). Findings scored against the stale tree
   describe already-fixed work; roadmap items get minted for content that has
   landed; every phase pays currency archaeology (`git show origin/main:<path>`
   re-verification per finding) before its evidence counts.

2. **Parallel-lineage mint collision.** Concurrent runs mint roadmap ids from
   the same ceiling (`rm-206` on 2026-09-25 produced two different `rm-209`
   meanings within hours). Both lineages believe their ids are fresh; neither
   is wrong at mint time; the collision only surfaces at landing, where the
   ROADMAP would carry duplicate ids with divergent meanings.

# Solution

**Stale base — the cure is procedural, applied at every phase boundary:**

```bash
git fetch origin
git rev-list --count HEAD..origin/main   # behind
git rev-list --count origin/main..HEAD   # ahead (must be 0 for a pure ancestor)
git merge-base HEAD origin/main          # == HEAD means strict ancestor
```

- Read/analysis phases (assess, research, roadmap): author against
  `git show origin/main:<path>` content, never the worktree copy.
- Write phases (implement): `git reset --hard origin/main` BEFORE touching
  files, re-running the freshness gate first so the batch is never built on a
  moved base.
- Any finding that survives only in the stale tree is a staleness artifact —
  reclassify against main before recording it.

**Mint collision — ceiling scan, then landing-order ownership:**

1. Before minting, scan EVERY live lineage, not just origin/main:
   `git show <each open PR head>:ROADMAP.md | grep -oE 'rm-[0-9]+' | sort -V | tail -1`.
   Mint strictly above the all-lineage max.
2. If two lineages still collide (they minted in the same window), the
   LANDING lineage keeps its ids; the later integrate renumbers the loser's
   collided ids and records the mapping in the ROADMAP header comment —
   landed meanings own ids.
3. A batch selected while a sibling batch is unlanded must record the sibling's
   claimed surfaces and avoid them (`must_remain_separate` in the stewardship
   request), so the renumber is the only landing-time conflict.

# Verification

- `grep -c '^- id: `' ROADMAP.md` — item count must not drop across a
  renumber; `uniq -d` on the id lines must be empty.
- After any integrate: `git show <landing>:ROADMAP.md | grep -oE 'rm-[0-9]+'`
  resolves to a single ordered id space with no duplicate meanings.

# Related items

- rm-165 (stale-base recurrence ledger, third recurrence 2026-09-25 with the
  end-to-end cure applied by run 71991cb3)
- docs/prioritization/2026-09-25-cycle-17-batch-run-71991cb31f2.md — the
  cycle-17 batch that exercised both protocols (45-behind re-base + cycle-16
  collision map)

# Known limitation (noted on review 2026-09-25, b310d051)

The counterparty lineage in a collision may itself be unpushed — cycle-16's
roadmap artifact existed only in the delegate spool, with no remote branch to
verify against. The pushed-ref ceiling scan is therefore necessary but not
sufficient: reconcile by meaning (does any pushed or spooled artifact already
claim this id for different content?) and treat landing order, not mint order,
as ownership. If the counterparty lands first, the loser's renumber must
reconcile against content this repository could not see at mint time.
