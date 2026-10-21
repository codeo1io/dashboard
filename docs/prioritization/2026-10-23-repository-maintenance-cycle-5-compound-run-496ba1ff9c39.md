# Repository-maintenance cycle 5 — roadmap extension riders (run 496ba1ff9c394116a141737a4bd98378)

Attempt 6004bb62f9514a12bd495900a787cab8 (roadmap:roadmap), 2026-10-23.
Base 8597282 (== origin/main, porcelain-clean before and after; this delta ships as a spool
patch only — nothing committed or pushed from the worktree).

Extension shape: riders-only, NO new def ids minted. Rationale (mint restraint):

- 60+ fog defs unlanded; every research candidate from this cycle mapped onto an existing def
  lane (see rider subjects below).
- In-flight unlanded spool patches from sibling runs already reserve the absorb-batch /
  pnpm-doc-truth / SARIF-dedup / ban-surface subjects (bands around rm-2311–rm-2315); minting
  overlapping subjects now doubles the fog.
- On-tree census max is rm-2134 (next-free rm-2135) while the in-flight frontier sits at
  rm-2316 — id reconciliation is the landing gate's job; riders add no new ids to reconcile.

Seven riders appended, all evidence first-hand 2026-10-23 unless noted:

1. rm-252 (absorb window) — upstream window c984578..d4f0a27 decomposition: deps-only
   absorbable set (node digest 43b9ba1 == live Docker Hub manifest == upstream tip; codeql
   9b32540 at 4 sites; trivy v0.76.1 unifying the triple-split; agent 0.125.x), 3 never-absorb
   wiki commits + 2 wiki-dep bumps — the write surface moved IN-TREE (src/wiki/**, web/src/wiki/**,
   web/src/views/Wiki*, npm dep), so the fork-exclusion ban-list re-derivation is a prerequisite;
   bfra-me N/A; fork floors AHEAD (hono ^4.13.11, @hono/node-server ^2.1.5) must not regress;
   fork-native pin headroom bun 1.4.4 + impeccable 4.7.0.
2. rm-779 (cve-tripwire) — gate still DOA after the landed resolve-cure: 3/3 runs red lifetime,
   rc=5 host repro this pass, objects-guard cure at :90/:94/:104/:110 (corroborates the
   in-flight 0fb6d281 spool rider; no intent to duplicate its landing).
3. rm-1961 (fallback dedupe) — mechanism proven: skip-only runs count as workflow successes, so
   the recency dedupe is self-sustaining; canary 18/18 masked fires, base-drift 4th consecutive
   masked fire while drift LIVE; acceptance refinement: count only target-job conclusions.
4. rm-856 (base-drift literal) — the :118 family literal is structurally always-red (live
   24-slim digest 55fb5f5a ≠ trixie 43b9ba1 at zero real drift); derive from the Dockerfile ARG
   or ride the rm-139 migration.
5. rm-673 (security.txt floor) — DATED: runway 62d at 10-23; >=60d floor boundary
   2026-10-25T00:00Z; suite + Main red from 2026-10-26 unless the one-line Expires bump lands;
   upstream's own bump sits below c984578 (not absorbable) — fork-local on the rm-245 cadence.
6. rm-139 (Node 26 gate) — node 24 active support ENDED 2026-10-20 (endoflife.datum: security
   support to 2028-04-30 → maintenance-only); node 26.12.1 live; 2026-10-28 LTS gate stands;
   family literal + Dockerfile digest + engines >=24 move as one batch.
7. rm-857 (integrity guard) — enforcement-absence gap: newest carrier (6abf380, 2026-10-21)
   carries zero '## Deliverables' while its landing 847f179 shipped six files; acceptance
   refinement: require the marker on the newest cohort doc, not merely validate marker-bearing
   ones.

## Deliverables

- `ROADMAP.md`
- `docs/prioritization/2026-10-23-repository-maintenance-cycle-5-compound-run-496ba1ff9c39.md`

Census (post-delta, riders-only — no def ids added): census 327 defs / 0 dups / max rm-2134,
verified via node scripts/roadmap-census.ts on the patched tree; roadmap-integrity-guard green
on the patched tree; git apply --check clean at 8597282.
