# Repository maintenance — cycle:2 batch selection (run 38e728540707)

**Selected:** 2026-10-09 ~01:30Z · **batch name:** 'routes-api truth: healthz no-store + boundary comment' ·
**base at selection:** 7055c52 (the run worktree carrying this run's roadmap-phase layer — census 241 defs / 0
dups / max rm-797, guard pin 797; dispatch tree was clean at 7055c52) · **origin/main at selection:** 546c93c
(2 ahead; this run's cycle-2 extension comment carries the standing INTEGRATE OBLIGATION — both selected
items verified present-and-unchanged at 546c93c, and `git log 7055c52..origin/main -- src/routes/api.ts` is
empty, so the mid-run landing does not touch the batch surface).

**Prior-attempt forensics:** first attempt on this prioritize action; the run's roadmap phase had a
provider-death predecessor (attempt 932f17fa, nothing durable — event log shows no ROADMAP writes) recorded
in the roadmap artifact.

## Inputs

- assess dfdaeffa (base 7055c52, full deep read): F2 = routes/api.ts:17-19 boundary comment vs
  toMonitoringRepoDto (minted rm-797 at this run's roadmap phase); P0 = cve-tripwire NODE_IMAGE cure
  (deduped at roadmap to four standing wall claims — see audit).
- research 50129744 (D1-D8 datum matrix): D1 agent#1737 closed/v0.118.3; D2 upstream window 24; D3 C5
  obsolete; D4 playwright 1.64.0 executable; D5 codeql v4.38.3 soak-crossed; D6 trivy v0.75.0 3-site
  lockstep; D7 conductor refs 157→159; D8 census basis.
- roadmap 3e077905 (this run): mint rm-797, six dated riders, census 241/0/797, guard pin 797.
- house mechanics: status flips + selection riders + this doc (the accepted cycle:1 pattern); selection
  edits do NOT move the census or the guard pin.

## Selected batch — 'routes-api truth: healthz no-store + boundary comment'

1. **rm-599 — LEAD (reliability, priority 10.0, the highest-priority uncontested actionable item in the
   ledger).** `/api/healthz` (src/routes/api.ts:92-95) serves a constant JSON body with no `Cache-Control`
   while every other API surface sets `no-store` explicitly. Acceptance as minted: `no-store` pinned by a
   header test in the routes/api-level suite on the served response (the current handler always 200s; if
   implement adds a degraded path, pin it too), plus `curl -I` evidence and `pnpm test` green. The
   "(or a recorded decision…)" escape hatch in the minted acceptance stays available but the batch intent is
   the header.
2. **rm-797 — complement (docs, priority 24.0, this run's own mint from assess F2).** Rewrite the
   routes/api.ts:17-19 boundary comment to enumerate what IS emitted (`full_name`, `discovery_channel`,
   per-repo status fields) and why the internal keys stay server-side; comment-only, no behavior change;
   grep leg shows comment and DTO agree.

**Why this pair wins the floor:** the lead is the top-priority item not claimed by any live lane; the
complement is the same file, so one implement + one final_validation pass lands both; zero external gates,
zero soak windows, no push authority needed; premise verified first-hand at BOTH the run base and the
mid-run origin/main tip (identical handler + comment in both), so the integrate rebase is mechanical.

## Selection floor (scored pool, priority order)

Uncontested candidates evaluated: rm-605 (8.0), rm-599 (10.0), rm-559 (12.0), rm-675 (open, 20.0), rm-140
(22.0), rm-181 (23.0), rm-139 (24.0), rm-797 (24.0), rm-217, rm-230, rm-693, rm-257, rm-165, rm-675-family
open items — plus the rider-updated currency family (rm-157/159/196/252/648/650) and the P0 tripwire cure.
Everything else above priority 32.0 is either claimed by a live lane (see audit) or landed.

## Effort

S + S. One new header line + header-pinning test; one comment rewrite + grep leg. Single-file family
(src/routes/api.ts + its test suite). No lockfile, no workflow, no baseline regen.

## File-overlap vs live lanes (checked 2026-10-09 ~01:2xZ)

`src/routes/api.ts` appears in NO live lane's current batch doc — the only `routes/api` mentions across all
worktrees sit in the LANDED 2026-10-08 cycle-1 docs (batch/compound run 6277460ed8bd, shared lineage in
every worktree). 20 lanes running at selection (8 implement, 3 full_tests, 1 targeted_tests, 2 stewardship,
1 push, 1 assess, 2 prioritize, 1 independent_review, 1 more); none select rm-599 or rm-797 (full-wall
`status: open (selected` scan).

## Claimed-and-excluded (congestion audit)

**Selected by other live lanes (never re-implement):** rm-117/rm-162 (91776e259752), rm-215/rm-790
(84133641d624), rm-689/rm-784/rm-785 (0cde5807f659), rm-485/rm-501/rm-784 (e8c99e0ef791), rm-781
(32f33f1b35dd), rm-782/rm-783 (33b30ba2cd59 AND ab16a466a77c — duplicate selection, integrate's problem),
rm-767 (392bad29b3d3), rm-768/rm-769 (4fcdb776a1e6 — dead lane, re-implementable by content per house
rule), rm-116/rm-792 (438dea88117e), rm-149/rm-187 (cb0cfe9681a9), rm-279 (f510a33e155f), rm-787
(df0dd46d97a1), rm-788/rm-789 (cb1890443b05), rm-793/rm-794 (d1a0b216493d), rm-158 (13de86628f15).

**Content-implemented in unlanded walls (dedupe, excluded):** the cve-tripwire NODE_IMAGE cure (this run's
assess P0) — four def-line claims (89ebbf49 rm-755, cbe70604 rm-779, ddb41af7 rm-782 implemented at 559642a,
d1a0b216 rm-793 selected into its cycle:2 batch); trivy v0.75.0 (rm-648 content = rm-783/rm-787 lanes);
codeql v4.38.3 (rm-650 content = rm-784 lanes); playwright 1.64.0 (rm-196 content = rm-785 lanes).

**Deferred with reason:**
- rm-605 (8.0, would-be lead by priority): visual-machinery congestion — the playwright 1.64.0 bump is
  selected (rm-785, 0cde5807) and implemented (ddb41af7); a DASHBOARD_VISUAL_PORT validation change inside
  playwright.config.ts + a visual-suite test would validate against a visual lane in mid-flight churn.
  Re-floor next cycle once rm-785 lands.
- rm-675 (open, 20.0): the acceptance lands in the EXTERNAL roadmap-sync renderer before any next managed
  render — not in-repo implementable this cycle.
- rm-140 (22.0, pnpm 12 evaluation): surface-collides with sibling c4617181's fresh rm-797 batch content
  (packageManager + Dockerfile corepack bootstrap + fork-exclusion-guard assertions); evaluate after that
  lane's disposition lands, in one coordinated motion.
- rm-181 (23.0, stale conductor draft PRs): disposition closes shared fleet validation PRs — cross-lane
  blast radius, needs fleet-level coordination, not a silent micro-batch.
- rm-559 (12.0, code splitting): recorded LOW by its own mint terms — gated on compression/caching
  siblings landing plus a fresh cold-load measure.
- rm-139 (24.0, node 26): window opens 2026-10-28 — not yet actionable.
- rm-157/rm-252 (contract 1.8.0 absorb, upstream window): gated externally — fro-bot/.github#3512 open and
  PR #448's lane already carries the absorb; selecting here would duplicate an owned lane.
- rm-159 (branch sweep): push-gated — push is its own phase/lane (cbe70604 owns the live push lane).

**Numeral collision (recorded for integrate, not a content conflict):** sibling c4617181 minted its own
rm-797 within the same hour from the same all-lineage ceiling rm-796 (pnpm packageManager +sha512 integrity
suffix — package.json/Dockerfile/fork-exclusion-guard surfaces; its wall carries the def at track: security
priority: 58.0). Both walls' riders name the pairing; integrate renumbers whichever lineage lands second.

## Selection risk

Low. rm-599: one header; the minted acceptance's degraded-path clause applies only if implement adds a 503
(current handler is constant-200). rm-797: comment-only, fenced by the existing monitoring suites. Both
verified present-and-identical at origin/main 546c93c, so the INTEGRATE OBLIGATION rebase cannot conflict on
content. Residual risk: none identified beyond normal gate flake.

## Verification

- Claim scan on this wall: exactly two `status: open (selected 2026-10-09, run 38e728540707 cycle:2
  prioritize 19f793228aa0` flips — rm-599 (:1647) and rm-797 (:2383), each with its selection rider.
- Census unchanged by selection: `node scripts/roadmap-census.ts` → 241 defs / 0 dups / max rm-797 (statuses
  shift candidate→open only).
- Guards: `node_modules/.bin/vitest run test/roadmap-integrity-guard.test.ts` 8/8; roadmap-length-guard;
  `node_modules/.bin/eslint ROADMAP.md`.
- This doc at `docs/prioritization/2026-10-09-repository-maintenance-cycle-2-batch-run-38e728540707.md`.
