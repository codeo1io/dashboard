---
module: dashboard
tags: [repository-maintenance, cycle-3, prioritization, batch-selection]
---

# Cycle 3 batch selection — run f72cb7ef4b8b4fe19a792e757e503d9f

Date: 2026-10-09. Base: 88e423a (== origin/main tip at dispatch; worktree carried the
cycle-3 roadmap delta only). Attempt: prioritize ae47e1917e284e2aa2c44f96da7a3b87.
This document is the implement phase's source of truth for batch scope.

## Selected batch: operator status composition + supply-chain floor convergence

- **rm-107 (65.0, reliability/operator-experience)** — compose the remaining system-status
  surface: snapshot freshness, rate-limit budget (currently log-only), listener store
  depth/age, refresh failures — one panel, each composed signal with a test.
- **rm-844 (54.0, security)** — katex floor convergence with upstream fro-bot/dashboard
  #581: widen the pnpm-workspace.yaml override `katex: '>=0.18.2 <0.19.0'` to
  `>=0.18.2 <1.0.0`, re-resolve to katex 0.19.0, GHSA rationale comment updated in the
  same change (rm-276 convention), frozen-install + audit re-derivation.

Both are the highest-value FREE items on the ledger (walk below), both are fully
offline-verifiable (required: Actions disabled, dispatch → HTTP 422), and the batch is
effort-balanced — one feature composition plus one tiny convergence change.

## Floor walk (descending priority; "free" = no implemented-unlanded sibling, no hard blocker)

| id | priority | verdict | evidence |
|----|----------|---------|----------|
| rm-104 | 98.0 | skip — engine/fleet render surface, not implementable in-tree | def block; repeatedly passed over since 2026-09-20 |
| rm-279 | 96.0 | skip — CI-observability cure, verification needs green Main runs | Actions disabled (gh workflow run → HTTP 422, zero runs since 02:00Z) |
| rm-103 / rm-252 | 85/80.0 | skip — standing census/absorb-window trackers, rider-fed | 2026-10-09 riders in ext #36; not batch items |
| rm-703 | 76.0 | skip — operational acceptance needs live release runs | CI-gated half explicitly open in def |
| rm-282 | 74.0 | skip — content-satisfied (floors-half closed by rm-285, audit gate discharged by rm-278) | riders 2026-10-03; undici durable-floor question only |
| rm-779 | 72.0 | skip — CI-gated (born-red cure observable Monday at earliest) + triple sibling literal fixes | def riders: three sibling lineages carry the NODE_IMAGE fix unlanded |
| rm-249 | 72.0 | skip — product-decision-blocked ("not next-cycle material unless rm-106's dead-notification UI gets a product decision") | def defer note + 2026-10-07 platform-state riders |
| rm-117 / rm-162 | 70/60.0 | skip — stranded implemented-unlanded via closed PR #479 | gh pr view 479 → CLOSED 2026-10-09T13:02:04Z; first-selection owners alive |
| rm-149 | 66.0 | skip — **implemented-unlanded in 3 sibling trees** | fleet scan 2026-10-09: 155f9770aba4, ba5f6d7ddd67, 8dd690c85b50 all `status: implemented` |
| **rm-107** | **65.0** | **SELECT** — free (no sibling implementation), offline-verifiable | fleet scan: zero implemented/in-progress hits; consumer half landed in-base via 6277460e (2026-10-08) |
| rm-281 | 62.0 | skip — CodeQL CI-gated | def: code-scanning default-setup runtime condition |
| rm-108 | 60.0 | skip — rider-fed action-pin census item, dependabot-lane rule owns | 2026-10-09 rider in ext #36 |
| rm-116 | 58.0 | skip — sequenced AFTER Actions re-enable (required checks that cannot run deadlock merges) | today's rm-116 rider (this run's research R5) |
| **rm-844** | **54.0** | **SELECT** — free; its content-pair rm-841 is minted-unselected (1c814809d084) | fleet scan: rm-841 `status: candidate` only |
| rm-163 | 54.0 | skip — implemented-unlanded | fleet scan: 3eea27cbd1e3 `status: implemented` |
| rm-220 | 50.0 | skip — implemented-unlanded | fleet scan: 34b027811b0e `status: implemented` |
| rm-842 | 48.0 | pass-over — this run's own mint; content claimed by rm-825 (8134eb2e6b13 batch, implemented-unlanded) | #17526/#17540 lineage; fold by first-selection at integrate |
| rm-843 | 40.0 | pass-over — this run's own mint; halves claimed by rm-826 (8134eb2e6b13) and rm-837/rm-839 (159ec0eba87d / folded dup) | same fold map |

rm-760 (pnpm 11.28.5) is not on the walk: the age-gate (minimumReleaseAge 1440) lifts
2026-10-10T06:42Z — after this cycle's implement window; upstream #592 corroboration is
recorded on its rider for the next cycle.

## Why this batch is coherent and completable end-to-end

- rm-107 completes a surface the ledger has fed for weeks (snapshot-freshness, budget,
  listener-store signals all have rider evidence); the consumer half is IN BASE at 88e423a
  (6277460e landed 2026-10-08), so implement composes against landed primitives — no
  dual-track reconciliation needed.
- rm-844 is upstream-proven (#581 moved the identical override in the same direction with
  the identical plugin chain), mechanically small, and its acceptance re-derives the audit
  greens fresh (the standing lesson: audit greens expire with the advisory DB).
- Neither depends on CI, on external product decisions, or on sibling landings.

## Offline verification plan (implement gate — Actions disabled, no CI budget)

1. rm-107: extend the composed DTO + panel view; per-signal tests in the server suites
   (vitest, node 22/24 native TS) and web view tests (`npx vitest run --config
   web/vitest.config.ts web/src/views/...` — root config does NOT include web/**).
   `pnpm check-types` after both halves; `pnpm lint` zero NEW warnings.
2. rm-844: edit pnpm-workspace.yaml floor + comment → `pnpm install` (re-resolve) →
   verify lockfile katex 0.19.0 → fresh `pnpm install --frozen-lockfile` → check-types →
   katex-rendering web tests → `pnpm audit --prod` re-derived and recorded.
3. Gates in order: `pnpm check-types` → `pnpm lint` → `pnpm test` (pretest rebuilds
   web/dist; static-assets suite needs it) → census (`node scripts/roadmap-census.ts`)
   → guards (`npx vitest run test/roadmap-integrity-guard.test.ts
   test/roadmap-length-guard.test.ts`).
4. Tree hygiene: implement leaves ROADMAP.md status flips (107/844 → implemented) + code
   + tests + this doc as the only tracked delta.

## Binding coordination notes for implement

1. **rm-107 reconcile**: the 2026-10-08 landed slice (MonitoringData whitelist adds +
   stale banner) is IN BASE — do not re-implement it; compose on top. The def's
   review-pin (monotone fix) history means the panel must not regress the landed banner
   semantics (allClear residue is rm-780's rider, NOT this def — leave Monitoring.tsx
   allClear alone unless the batch explicitly cures it; it is unlanded-sibling-owned).
2. **rm-844 lockfile churn**: re-resolve touches pnpm-lock.yaml only via the katex chain;
   verify no unrelated drift rides the diff (git diff pnpm-lock.yaml scope check). The
   override must keep the GHSA-238p rationale comment adjacent (rm-276 convention).
3. **Dual-track fold map** (unchanged from ext #37): rm-842↔rm-825, rm-843↔rm-826/rm-837
   /rm-839, rm-844↔rm-841, rm-780-rider↔rm-835 — first-selection wins at integrate; this
   batch deliberately implements only FREE content.
4. **No-CI discipline**: every acceptance must be provable offline this cycle; anything
   needing Actions (rm-779 born-red cure, rm-116 protection fill, rm-279 decomposition
   verification) stays parked with its rider rationale.
5. **Census/guard**: status flips 107/844 → implemented keep census healthy only if the
   guard pin (844) still matches max def id — flips do not change max; if any sibling
   minted above 844 by integrate time, re-probe walls and bump atomically.
