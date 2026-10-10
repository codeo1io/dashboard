# Dashboard maintenance batch (2026-10-10, run 4c0ec7a5)

Base: cb4da55 (worktree HEAD, porcelain 0 at selection start). Run
4c0ec7a58ade4af5a76c2f752f603efc (repository-maintenance
ffe96544d8c84ed4a03b44713384e3ce cycle:1). Attempts: assess
ea90e0ad2f7444cf8e4aed3b75632c59, research 61e8a69e11f8442094250f378a9d9693, roadmap
fe481375ad8c4eb993de19919a71d62a (prior attempt 2df5289cca9a died of provider failure with
zero durable work — redone from scratch, nothing adopted), prioritize
acd1bcce236d4f4985b84a88f5c8396f. The selection composes this run's roadmap patch
(delegate/roadmap-4c0ec7a5-fe481375.patch: mints rm-874/875/876 + riders on
rm-157/252/120/116 + ext #42) as its base and supersedes it; the delivered
prioritize-acd1bcce patch is the single apply-ready carrier (roadmap content + status flips
+ selection riders + guard pin 833→876 + this document).

Skill routing: prioritized per ce-plan field-ranking conventions over the run's own assess
F1/F2/F3 and research R-verdict evidence; implement should re-route through ce-compound.

## Pre-selection diligence (all first-hand, 2026-10-10)

- Upstream fro-bot/dashboard at fd3c553 — 29 commits ahead of merge-base c1f760e, fully
  classified by research: zero unclaimed absorb residue; rm-252's 2026-10-13 decision packet
  rides the roadmap rider (close-clean ready).
- Gateway fro-bot/agent v0.119.0 (2026-10-09T23:07:49Z) carries operator contract 1.9.0 and
  deployment-blocking language; our fail-closed window rejects 1.9.0 by design and the serving
  release is v0.118.3 — escalation rider landed with the roadmap phase on rm-157. Window
  extension + question rendering is BUILT UNLANDED by sibling cb6061a358f2 (cycle:3): adopt by
  content at integrate, never rebuild (one-meaning-one-id).
- Registry currency: every pinned dep at latest except majors under documented gates
  (typescript 7 / vitest 5 / jsdom 30 / vite-plugin-pwa 2 re-evaluate 2026-10-21; pnpm
  12.10.1 rm-140; @types/node 26 rides Node 26 LTS 2026-10-28 rm-139) and in-range minors
  already claimed-unlanded by today's sibling lanes (vite 8.3.4, @hono/node-server 2.1.4,
  @opencode-ai/plugin 1.18.35, pnpm 11.28.5). playwright 1.64.0 in-range: dependabot-owned,
  rejected as manual work.
- Security posture: dependabot 47 alerts ALL fixed / 0 open; scorecard 7.4 with
  Pinned-Dependencies/Token-Permissions/Vulnerabilities = 10, Branch-Protection check
  erroring (-1, rm-116 rider), Code-Review 0/27 (conductor posture, known).
- Platform: GitHub Actions run-creation outage persists (newest run 2026-10-09T01:59:31Z) —
  batch MUST be offline-verifiable (vitest/eslint/tsc on the sandbox); no CI-gated member.
- Fleet id walls re-probed: live origin/main 253 defs / max rm-835 with zero rm-87x; sibling
  worktrees clean; delegate spool carries the unlanded dashboard wall at rm-872
  (roadmap-dc8e1756, run 33ede5dafe00) — mints rm-874/875/876 sit above it with margin 873.
  agenttrace-family ids (871-873 in spool foreign lanes) and the truth-family 890+ band are
  excluded by carrier attribution, not counted against the dashboard ceiling.
- Open PRs (20): 16 transient Conductor CI-validation lanes + 4 landed-batch stragglers
  (#518/#510/#509/#508). Zero overlap with the batch's code surfaces (src/server.ts CSP block,
  test/static-assets.test.ts, src/gateway/operator-copy.ts + test, boot validation seams).
  PR #533 shares test/roadmap-integrity-guard.test.ts with the pin bump — integrate re-derives
  census + pin atomically on union (roadmap hygiene clause, no conflict at selection).

## Fleet census (parallel walls at selection time)

| wall | owner | meaning | verdict here |
|---|---|---|---|
| rm-865-869 | 461586fe lineage | web/runtime batch | built-unlanded — adopt by content, never rebuild |
| rm-870-872 | 33ede5dafe00 roadmap | contract instrument, window digest, UA symmetry | sibling SELECTED rm-870+rm-872 (unlanded) — foreign lane |
| rm-874-876 | this run (4c0ec7a5) | CSP truth, orphan fold, boot fail-fast | THIS BATCH |
| rm-898-899 | foreign roadmap-4474e5ab | non-dashboard lane | excluded by attribution |

## Raced-content verdicts (highest-value items NOT selected, and why)

- Operator contract 1.9.0 adoption (window widen + question rendering + answer/skip): the
  strategic P0 of the fleet window — but the implementation is BUILT UNLANDED by sibling
  cb6061a358f2 (cycle:3 of run 6a2d5fbe7f7c). Selecting it here would duplicate a built
  artifact; the correct action is content adoption at integrate plus the landed rm-157
  escalation rider. No new id (one meaning, one id).
- Contract-readiness observability (rm-870 instrument, rm-872 UA symmetry): sibling
  33ede5dafe00 selected both for its cycle:2 — foreign lane, already built.
- Dependency regen lanes (pnpm 11.28.5 four-site; vite 8.3.4; @hono/node-server 2.1.4;
  plugin 1.18.35): claimed-unlanded by today's b0ad7444/19c024286fc4/cb6061a3 lanes — adopt
  ONE regen at integrate, do not race.
- Checkout-details display half (rm-842 operator lane): built-unlanded (08a0abac + the
  rm-825-829 family); four patches carry public/operator-stream.js — any new operator-stream
  work must reconcile with all four, none scheduled this cycle.
- rm-104 (98.0) PAT-scoped scorecard report commit: live GitHub App installation mutation —
  decision-first (consent gate), owner Hermes.
- rm-252 (80.0) absorb-window decision: rider + packet delivered, decision DUE 2026-10-13 —
  decision gate, not implementable.
- rm-103 (85.0) agent/action drift: sequenced behind the 1.9.0 window extension (its own
  rider); final_validation pushes the pin.
- rm-107 (65.0) monitoring view: siphons from the gateway 1.9.0 extension acceptance —
  sequenced behind adoption.
- rm-279 (96.0), rm-282 (74.0), rm-779 (72.0): close-as-cured-by-content candidates at
  integrate (script/content already lives in landed or built-unlanded lanes).
- rm-703 (76.0) merge-race testing, rm-149 (66.0) richer indicator: built-unlanded by
  siblings (c8a91084, 8134eb2e).
- rm-249 (72.0): LANDED 2026-10-09 (PKCE 2de647e) — awaiting ledger flip at integrate.
- rm-117 (70.0): rides foreign PR #479.
- rm-116 (60.0) required checks: live branch-protection mutation — decision-first.
- rm-871 Actions-dark watch: platform-blocked (outage), unimplementable this cycle.

## Five-axis selection (1-5; effort inverse — higher = cheaper)

| member | impact | risk | effort | deps | strategic | Σ | verdict |
|---|---|---|---|---|---|---|---|
| rm-874 CSP header truth | 3 | 4 | 5 | 5 | 4 | 21 | SELECTED |
| rm-876 OAuth boot fail-fast | 4 | 4 | 4 | 5 | 4 | 21 | SELECTED |
| rm-875 orphan fold | 3 | 5 | 5 | 5 | 3 | 21 | SELECTED |

Strategic notes: rm-874 converts an untestable stale CSP claim into a served-literal
assertion and drops 'unsafe-inline' (scorecard CSP posture; audit-proven zero inline styles);
rm-876 closes the silent-misconfig mode first-hand observed at server.ts:525-553 and pairs
with the landed PKCE S256 work; rm-875 removes a whole dead module + test (170 lines) while
recording where the served copy actually lives. All three: offline-verifiable end-to-end,
deterministic S/M/S-M effort, zero fleet ownership, zero PR overlap, no decision gates.

## The batch

Members rm-874, rm-876, rm-875 — compose order as listed: both server.ts-touching members first
(rm-874's styleSrc at :761, rm-876's boot validation at :525-553 — disjoint hunks, shared
file), then the two-file deletion (rm-875) last so the diff stays reviewable. Cessation
clause: implement stops after member 3 lands its battery green — NO ahead-of-phase work
(final_validation/commit/push/pr/ci remain prohibited in the implement turn).

Interlocks: rm-876's dev/test lazy-mode carve-out must not weaken rm-874's header assertion
(disjoint surfaces — CSP vs boot); rm-875's deletion must not remove copy that rm-876's
actionable boot messages reference (they are separate constants — verified disjoint by
assess F2/F3).

## Selection digest

This cycle's unclaimed implementable field is exactly the three fresh assess findings the
roadmap phase minted: every higher-priority open item is built-unlanded by a sibling lane,
sequenced behind the 1.9.0 adoption, decision-gated, or platform-blocked (table above). The
selected trio is the highest-value coherent batch that can complete end-to-end in one
implement turn under the platform constraints (offline gates), with every member carrying
first-hand evidence, explicit acceptance, and zero fleet conflicts.

## Verification

- Composed patch apply: git apply clean at base cb4da55; staged-tree census 251 defs /
  0 dups / max rm-876 (script-authoritative); integrity guard green with pin 876
  (statuses 'open' ∈ guard vocabulary); length + prose-residue guards green; eslint clean
  (0 errors / 10 pre-existing warnings baseline) on changed files.
- Correction carried by this phase: roadmap fe481375's extension comment stated the
  post-extension census in a non-canonical form ("max def rm-876") that the integrity
  guard's claim regex cannot read, so the newest readable claim was still #37's 248 —
  the guard failed red on the roadmap patch alone (the roadmap phase validated via the
  census script only, node_modules being wiped). This prioritize patch cures the claim
  form in place; the guard is green only on the composed carrier, not on the roadmap
  patch alone — apply the composed patch, not the roadmap patch.
- Tree restored after verification: porcelain 0, census back to 248/0/833.

## Follow-ups handed to later phases

- implement: apply delegate/prioritize-acd1bcce236d4f4985b84a88f5c8396f.patch FIRST (it
  contains the roadmap patch), then build the three members in order; re-run the full battery
  (check-types, lint, test) before declaring done.
- integrate: adopt sibling cb6061a3's 1.9.0 window+pin by content; adopt ONE dep regen; flip
  rm-249 to completed; re-derive census + guard pin over the union; reconcile PR #533's guard
  hunk.

## Implement outcome (2026-10-10, run 4c0ec7a58ade4af5a76c2f752f603efc attempt 426ceb050038496595d46e0f6f284e6e)

All three members IMPLEMENTED in the run worktree at base cb4da55; statuses flipped
open -> implemented with dated landing-note riders on each def. Composed cumulative carrier:
delegate/implement-4c0ec7a5-426ceb05.patch (applies clean at pristine cb4da55; contains the
prioritize carrier, so apply exactly ONE patch — the implement patch supersedes it).

- **rm-874 (CSP served-truth)** — style-src tightened to `'self'` at the src/server.ts CSP
  middleware; landing-time audit found exactly one real runtime residual
  (public/operator-launch.js:516 cssText on a runtime-built select — CSP3 blocks the cssText
  setter as a style-attribute write), FIXED in-batch by per-property CSSOM assignment;
  test/static-assets.test.ts:88 re-anchored from the synthesized unsafe-inline expectation to
  an exact style-src pin plus a full literal served-header toBe pin across /, /privacy,
  /static/operator-stream.js, /api/healthz. Before/after header strings + the audit inventory
  (commands + counts) recorded in the rm-874 landing rider.
- **rm-876 (OAuth boot fail-fast)** — validateProductionBootEnv (NODE_ENV=development|test
  carve-out, unset fail-closed) + toBootCookieKeyFailure (ENOENT translation only) wired into
  createDashboardServer; buildDashboardApp keeps the lazy ''-coalescing seam; package.json
  `dev` sets NODE_ENV=development (dev:fixture precedent); README rows updated; ten
  red-then-green tests in test/boot-validation.test.ts (run red 10/10 before implementation,
  green after).
- **rm-875 (operator-copy fold, option b)** — re-grep re-proved zero importers beyond the
  module's own test; src/gateway/operator-copy.ts + test/operator-copy.test.ts deleted;
  public/operator-stream.js byte-untouched (:1581/:1882 variants remain the served copy).

Focused verification (validation budget): static-assets 105/105, boot-validation 10/10,
roadmap guards + env-docs guard green, census 251/0/876 (statuses implemented:129, open:2 —
both pre-existing, zero from this batch), eslint clean on changed files, check-types green.
Full battery (check-types/lint/test/build:web + visual operator spot-check) is the full_tests
obligation. Prior-attempt forensics: bd44bb39 left no PhaseResult (provider-infrastructure
reap; event log progress-only) — its partial tree work was reset to pristine and the batch
was rebuilt from scratch under this attempt; nothing was adopted from it.

## Cycle outcome (compound 5e8931f574644df1acc3ffdce71bdc6b, 2026-10-10)

All three members landed in the implement carrier `delegate/implement-4c0ec7a5-426ceb05.patch` (11 paths, md5 5abd2dca96010942dd4accee4db49310, apply-check clean at pristine cb4da55) and were validated by the two recorded test phases. This appendix is the compound-phase ledger of those outcomes; nothing was re-run to write it.

### Validation outcomes (consumed from recorded evidence)

- **targeted_tests (attempt f123a12f4b404b488ab007c9e5e32fd0):** 183/183 over 7 files (static-assets 105 incl. the new literal served-header pins, boot-validation 10, roadmap guards, prose-residue, env-docs, server), eslint 0 problems over the touched files, check-types rc 0, census 251/0/max rm-876 healthy.
- **full_tests (attempt 2f022b37c77e4a9395305f06b68014f1):** supervisor-authorized local dual mirror of all six Main CI jobs (push/pr/ci prohibited + Actions run-creation disabled repo-wide, canary 422, zero runs since 2026-10-09T01:59:31Z). Pristine leg: 7/7 jobs rc 0, 3690 tests (root 65f/2478 + web 33f/1212), lint 0 errors/10 pre-existing warnings, impeccable detect empty, actionlint clean, scripts-load 48/48. Batch-applied leg: 7/7 jobs rc 0, 3660 tests (root 65f/2448 + web 33f/1212 — the 2478→2448 delta is exactly the folded operator-copy pair's 41 retired tests against the 10 new boot-validation tests plus 1 net-new static-assets assertion (104→105)), scripts-load 47/47 (the folded module gone). Fold-sim on the dispatch release: ACCEPT on the closing tree, all four tamper probes reject, patched-tree negative control rejects on R5.

### Digest map and close-state decision (recorded for the fold)

Measured first-hand at the dispatch release: pristine cb4da55 digests `validation:v1:6e448c9a668108a7cf687289a69a689a16120a24dea218aa5fc23c97c561309d` — equal to the dispatch stamp — while the carrier-applied tree digests `validation:v1:a617a7be030530f61c87a4925f91a8156b8bb60108088b738823c0b236b7d6b7`. The stamp described the pristine tree (the inverse of sibling run 633717c2, whose stamp was minted over a dead attempt's applied batch), so full_tests closed pristine with the stamp declared verbatim; an applied close would have failed the fold's R5 clause — proven by the negative control. Reusable rule recorded in docs/solutions/workflow-issues/validation-digest-stamp-describes-mint-time-tree-measure-both-close-states-2026-10-10.md.

### Dead attempts this cycle

Three provider-reaped attempts left zero durable work, each a heartbeat-only event log with the typed result never written and the tree pristine at redispatch: roadmap 2df5289cca9a4daf9c7f541847ad0524, implement bd44bb39f53445e1ad4a3f542c3583e8, targeted_tests a401517b36974688a9cd034dc9eab813. Nothing adopted; each phase was redone from scratch. The forensics protocol (typed-result absence + terminal event status + porcelain before redo) is the standing cure and is cheap.

### Next-cycle candidates and context

1. **Operator-contract 1.9.0 escalation** — anchored as this run's dated rm-157 rider; unlanded rm-850 (633717c2 lineage) owns the adoption meaning. Watch fro-bot/agent releases newer than v0.118.3 (v0.119.0 published 2026-10-09T23:07:49Z already bumps the contract); our fail-closed window rejects 1.9.0 by design until the dashboard side ships.
2. **rm-252 absorb decision due 2026-10-13** with this run's close-clean packet rider (upstream count 29 at research time).
3. **rm-120 clone refresh target v0.119.0** (81 releases of mirror drift; clonedeps copy absent).
4. **operator-stream.js copy convergence** (:1581/:1882 variants) — unminted candidate named by the rm-875 acceptance; next cycle's roadmap phase owns the mint if it is taken.
5. **Actions-outage recovery** — first run newer than 37872407109 or a dispatch canary that stops 422-ing triggers: run the authoritative validator verbatim, bank first green, sweep the 29 stranded conductor/ci refs, reconcile the checkless validation PRs (#546/#547/#549/#550). Substitution recipe: docs/solutions/workflow-issues/actions-outage-full-suite-local-dual-mirror-2026-10-10.md.
6. **Node 26 LTS gate 2026-10-28** rides the standing rm-139 lane.

### Patch chain (provenance)

Apply order at pristine cb4da55: `implement-4c0ec7a5-426ceb05.patch` → `compound-4c0ec7a5-5e8931f5.patch` (this phase's riders, ledger comment, appendix, and two solution docs; chain-proven byte-identical). ROADMAP ledger notes: three CYCLE VALIDATED riders at the rm-874/875/876 anchors plus the `cycle-1 compound #14` dated comment (last among dated claiming comments, census re-derived 251/0/876 riders-only, next free rm-877).
