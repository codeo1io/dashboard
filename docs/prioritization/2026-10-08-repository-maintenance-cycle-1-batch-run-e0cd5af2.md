# Dashboard roadmap prioritization — 2026-10-08, repository-maintenance cycle:1 batch (conductor run e0cd5af2ab8240fbbbe34ac14f259fb4)

Base at composition: 5aab7c7 == origin/main (roadmap-phase fetch re-probe; pristine tree, report-only
composition per the 6277460e/ext#35 pattern — no in-tree drift from the roadmap phase). Base at
selection: f66e547 (origin/main advanced mid-run; landing of run 3ff5a80c's batch, touch-set disjoint
from this batch). Base at implement: **b658cb60** — origin/main advanced TWICE more mid-run (9aceea8d,
then the 23edabab + a94d0659 integrate merges); the worktree was ff'd before any edit and every batch
surface re-derived at the new tip: the unguarded manifest/registerSW middlewares live at :1273-1281 /
:1282-1289 (rm-690's guarded siblings at :1253-1258 / :1260-1266 unchanged), the landed server.ts deltas
sit at :25/:1626+ and the /api region — 300+ lines clear of the middleware family.

Run lineage: assess 4cde10fb → research c0759983 (extensions dossier) → roadmap d50dc885 (extension #20:
mints rm-720/rm-721, delivered spool-only in `delegate/d50dc885…-scratch/roadmap-ext20.patch` +
postimage) → prioritize 18b2356c (reaped 2026-10-08T00:54:35Z, provider infra death; left no typed
result but DID write the selection riders into the roadmap postimage — adopted) → prioritize 5aca2740
(redone selection, ADOPTED the 18b2356c choice after first-hand re-verification; batch doc spec lives at
`delegate/5aca2740…-scratch/prioritization-2026-10-08-run-e0cd5af2-batch.md`) → stewardship a30e1cdf
(single repo, two change-units + one ledger ride) → **implement 3a12d0d5 (this delivery)**. Prior
attempt 92005465 on implement: typed envelope absent, durable event log = started → 1 tick → reaped at
23s, no scratch, no attributable residue, worktree clean — nothing adoptable, implemented from scratch.

In-tree ledger at implement delivery: `node --experimental-strip-types scripts/roadmap-census.ts` →
**238 defs / 0 dups / max rm-744** (pre-mint 236/0/744; rm-720/721 mint BELOW the landed ceiling so the
guard pin STAYS `toBe(744)` — no renumber; newest census claim = the extension-#20 deliver comment,
placed after the 2a9dd25 INTEGRATE-MERGE per the rm-678 newest-claim rule, date tie broken
last-in-document).

## Implementation-space congestion audit (first-hand at implement)

Sibling claims were re-probed before any edit: no sibling worktree delta touches the
:1273-1289 middleware region (5b333105's hunks at :23/:27/:1626 and edaa50e0's at :1329 are all 19+
lines clear — from the prioritize audit, re-confirmed by hunk headers at the ff'd tip); rm-720/rm-721
grep = 0 on b658cb60; the 5bd710d8 sibling's rm-745..750 claims exist in worktrees/spool only and MUST be
re-adjudicated at integrate before any further mint.

## Batch selected for this cycle (implement-phase scope)

### Unit 1 — rm-720 static-header status-guard completion (lead; reliability, this run's mint)

Complete the rm-690 middleware family: the manifest and registerSW wrappers set
content-type/cache-control unconditionally, so a serveStatic 404 came back labeled
`application/manifest+json` or carrying a no-store policy — cache metadata minted for a body that is not
the asset.

Landed: both wrappers now guard with `if (c.res.status === 200)`, mirroring the rm-690
`/assets/*` / `/icon-*` shape exactly (src/server.ts comments cross-ref the family). Red-first honored
via the acceptance's own technique: new rm-720 describe block in test/static-assets.test.ts pins BOTH
404 legs through an empty webDistRoot (mkdtemp) passed via buildTestApp's opts passthrough into
buildDashboardApp's existing `webDistRoot` seam — before the fix the pins failed with `no-cache` /
`no-cache, no-store, must-revalidate` received on 404s; after, the full suite runs **106/106** with every
rm-690 200-leg pin unchanged (the guards are 200-transparent). Fixed filenames force the empty-dist-root
technique: both routes exist in every real build, so the 404 leg is only reachable by pointing the dist
root at an empty directory.

### Unit 2 — rm-721 phantom-dependency lint for the shamefullyHoist workspace (developer-experience, this run's mint)

pnpm-workspace.yaml `shamefullyHoist: true` makes every transitive resolve at the root — an undeclared
import works locally and breaks under any hoist-free resolution. The `import-x` plugin is registered by
@bfra.me/eslint-config 0.54.0 but the preset leaves `no-extraneous-dependencies` OFF.

Landed: the rule enabled as `'error'` in eslint.config.ts as its own rm-721 block — the exact rm-682
precedent (no plugin import needed; family presence proven via `pnpm exec eslint --print-config`). All
defaults kept deliberately, rationale in-config: no `packageDir` (nearest-package.json lookup resolves
every linted file to the root package.json — single-package layout, no nested package.json exists),
devDeps allowed everywhere (the whole lint surface is dev surface), type-only imports unchecked; ZERO
boundary exceptions — the clean tree needs none. Red-first was LIVE, not planted: the rule's first
full-tree run flagged exactly one violation — `eslint.config.ts:2` importing `typescript-eslint`,
undeclared since 2026-09 and resolving only via the hoist. Cure: promoted
`eslint-plugin-import-x@4.17.1` (rule now load-bearing) + `typescript-eslint@8.70.1` (the catch) to
direct devDeps — both already resolved as @bfra.me transitives at exactly these versions, so
`pnpm install` downloaded 0 packages and pnpm-lock.yaml grew exactly 6 importer lines, zero version
movement (the rm-108 window discipline held with zero new registry versions). Green: `pnpm exec
eslint .` rc=0. Scope fact: web/** is globally ignored by this eslint config (pre-existing house
decision) and type-checked via web/tsconfig.json in check-types — the rule covers every file the linter
touches.

### Ride — extension #20 ledger delivery (non-executable)

The roadmap-phase composition (two def blocks + four dated cross-ledger riders) rides this batch's
implement: rm-720/rm-721 defs transplanted from the postimage with status flipped to implemented, the
18b2356c + 5aca2740 prioritize riders verbatim, new implement riders with the red/green evidence, the
rm-108/rm-120/rm-157/rm-249 riders (composed from research c0759983 + assess 4cde10fb F3) appended
chronologically after each block's 2026-10-07 tail, and the extension-#20 deliver comment owning the
newest census claim slot (238 defs / 0 dups / max rm-744; pin stays 744).

## Verification battery (focused, per phase budget)

- `pnpm exec eslint .` — rc=0 full-tree (was: exactly 1 error, the live phantom catch, before the cure)
- `./node_modules/.bin/vitest run test/static-assets.test.ts` — 106/106 (rm-720 red-first: 2 new pins
  failed pre-fix, all pass post-fix; every rm-690 pin unchanged)
- `./node_modules/.bin/vitest run test/roadmap-integrity-guard.test.ts` — 8/8 (newest census claim =
  238/0/744, pin `toBe(744)` untouched)
- `node --experimental-strip-types scripts/roadmap-census.ts` — 238 defs / 0 dups / max rm-744, healthy
- `pnpm check-types` ×3 — rc=0 each (flake guard)
- Full-suite runs (server 60-file / web 31-file batteries) deferred to full_tests per the phase budget.

## Deferred with reasons (from the prioritize audit, restated)

- **rm-116 branch-protection fill** — landing-pipeline authority work, out of this batch's touch-set.
- **rm-252 absorb decision (due 2026-10-13)** — decision-gated, not implementation.
- **rm-104 upstream cadence** — thin this week (upstream tip 684b3ba unchanged since 10-07).
- **rm-157 contract catch-up** — watch window exactly complete (gateway v0.118.2 + contract 1.8.0
  upstream); action rides the rm-252 decision.
- **Research C1 release-surface provision-vs-strip** — owned unlanded by sibling 2ca90eb1 ext#19's
  rm-714; reconcile by content at integrate, never re-mint.
- **rm-746+ L3 findings family (5bd710d8's unlanded mints)** — sibling-owned unlanded; integrate-time
  adjudication.

## Changed files (this batch's complete touch-set)

- `src/server.ts` — rm-720 guards (both middlewares) + family cross-ref comments
- `test/static-assets.test.ts` — buildTestApp opts passthrough + rm-720 describe block (2 pins) +
  helper imports
- `eslint.config.ts` — rm-721 rule block (with rationale comment)
- `package.json` — 2 devDep promotions (alphabetical placement)
- `pnpm-lock.yaml` — 6 additive importer lines (zero version movement)
- `ROADMAP.md` — extension-#20 deliver (2 defs + riders + 4 cross-ledger riders + census comment)
- `docs/prioritization/2026-10-08-repository-maintenance-cycle-1-batch-run-e0cd5af2.md` — this doc
