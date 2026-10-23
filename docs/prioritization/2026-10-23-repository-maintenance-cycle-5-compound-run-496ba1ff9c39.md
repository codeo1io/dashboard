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
- `src/server.ts`
- `package.json`
- `bun.lock`
- `Dockerfile`
- `.github/workflows/base-drift.yaml`
- `.github/workflows/codeql.yaml`
- `.github/workflows/cve-tripwire.yaml`
- `.github/workflows/release.yaml`
- `.github/workflows/scorecard.yaml`
- `test/roadmap-integrity-guard.test.ts`

Census (post-delta, riders-only — no def ids added): census 327 defs / 0 dups / max rm-2134,
verified via node scripts/roadmap-census.ts on the patched tree; roadmap-integrity-guard green
on the patched tree; git apply --check clean at 8597282.

## Implement record (attempt dd045096f6c0431b93b72d8c9d4db815, 2026-10-23)

Batch 'Weekend floor-crossing + Monday fire-chain green', adopted-and-completed on top of the
reaped attempt f870da58c1284420a6f455cf353947f1 (provider-death mid-turn; its tree work was
verified file-by-file, corrected, and completed — no typed envelope ever existed for it):

- P0 security.txt floor-crossing: src/server.ts Expires 2026-12-24 -> 2027-03-24 (runway
  151.8d at 2026-10-23T04:48Z; >=60d floor boundary 2026-10-25 cured, <=366d ceiling held;
  test/security-txt-expiry-guard.test.ts + test/server.test.ts green).
- P1 toml override: package.json 'toml@4' floor crossed to '>=5.0.0 <6.0.0'; bun install
  re-resolved bun.lock (2-line diff: override range + toml 4.3.0 -> 5.0.1); bun audit =
  'No vulnerabilities found (checked 804 packages)' rc=0 — the 3 HIGHs (all toml@4.3.0) are
  gone. Monday 03:37Z audit.yaml chain unblocked.
- P1 base digest + family: Dockerfile ARG NODE_IMAGE digest 7f486cab -> 43b9ba11 (== live
  Docker Hub manifest == upstream d4f0a27 pin); base-drift.yaml family literal fixed at all
  seven sites incl. the registry-HEAD fallback (manifests/24-slim -> 24-trixie-slim — missed
  by the reaped attempt, would have false-reded exactly when the fallback fired).
- P1 codeql-action: 6f2ac81f -> 9b325408 at all four sites (codeql.yaml init/analyze,
  release.yaml upload-sarif, scorecard.yaml upload-sarif whose comment was truncated to
  '# v4'). Version comments read '# v4.39.1' — verified first-hand: annotated tag v4.39.1
  peels to exactly 9b3254085494b55a0f7c4c2b3d2d52cc712ce370 and is the newest tag; the
  reaped attempt's '# v4.43.0' label was wrong (no such tag exists) and was corrected.
- P2 trivy unification: release.yaml :384/:423 v0.76.0 -> v0.76.1 (== upstream d4f0a27
  release.yaml both sites); cve-tripwire.yaml TRIVY_VERSION v0.72.0 -> v0.76.1.
- P2 cve-tripwire jq objects-guard (rm-779 cure): all four sites :90/:94/:104/:110
  '.. | .Vulnerabilities[]?' -> '.. | objects | .Vulnerabilities[]?'; mechanism re-proven
  first-hand: old shape exits rc=5 (Cannot index number with string 'Vulnerabilities'),
  objects-guard rc=0 with identical counts.
- rm-857 absence-side enforcement: test/roadmap-integrity-guard.test.ts gains the
  newest-cohort marker leg; red-first proven by moving this carrier out (cohort falls back
  to the unmarked 2026-10-21 cycle-3 carrier, leg reds 'marker-less carriers ship
  unguarded'), restore -> 14/14 green.

Verification (focused, per phase budget): census 327 defs / 0 dups / max rm-2134; vitest
focused battery roadmap-integrity-guard (14) + security-txt-expiry-guard +
workflow-hardening-guard + server.test.ts = 80/80 green, plus ledger/length/render guards
11/11 green. scripts/roadmap-ledger-check.ts rc=1 with 2 PROVEN-STALE cites (rm-1523 389d60ef,
rm-843 d00d095) proven IDENTICAL at base HEAD (8597282) via tree-swap probe — pre-existing
fleet state outside every batch hunk, recorded for the full_tests gate, not a regression.

## Re-verification record (attempt a8f3b47da2c4488f90b3074870d9fc09, 2026-10-23)

Adopted dd045096's completed tree wholesale (that attempt died at its serve-hold ceiling
before filing; its Implement record above stands as the primary record). One correction
applied on top: the cve-tripwire.yaml:7 header comment still said "v0.72.0 binary" —
updated to v0.76.1 to match the unified TRIVY_VERSION (same comment-truth class as the
scorecard.yaml '# v4' truncation fix in this batch). No other tree edits. Re-verified
first-hand this attempt:

- census 327 defs / 0 dups / max rm-2134; focused battery 13 files 310/310 green
  (11 guard files 59/59 + server.test.ts + static-assets.test.ts 251/251);
  check-types rc=0; lint rc=0; actionlint 1.7.12 container rc=0 on all five changed
  workflows.
- bun audit "No vulnerabilities found (checked 804 packages)" rc=0 — toml cure holds.
- jq mechanism re-proven (old shape rc=5 "Cannot index number"; objects-guard rc=0
  identical counts); ledger-check rc=1 with exactly the 2 stale cites (rm-1523 389d60ef,
  rm-843 d00d095), proven identical at base 8597282 via a detached temp-worktree probe —
  pre-existing fleet state, recorded for the full_tests gate, not a batch regression.
- Live re-probes: Docker Hub node:24-trixie-slim digest sha256:43b9ba1142b8… == pinned
  Dockerfile ARG == upstream d4f0a27; codeql-action annotated tag v4.39.1 peels to commit
  9b3254085494b55a0f7c4c2b3d2d52cc712ce370 (comment truth verified); trivy release
  v0.76.1 exists (published 2026-10-21T11:18:34Z, newest).
- Engine fold simulated by importing the live validation_policy.changed_surfaces:
  engine delta == exactly the 12 declared surfaces above.
