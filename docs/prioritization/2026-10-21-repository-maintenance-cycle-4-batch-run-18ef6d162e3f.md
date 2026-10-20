---
module: roadmap
tags: ['repository-maintenance', 'cycle-4', 'batch-selection', 'prioritize', 'rm-2141', 'rm-2142', 'rm-2144']
problem_type: maintenance-batch-selection
owner: dashboard
run_id: 18ef6d162e3f439991a7b3c1a729cec0
---

# Repository maintenance — cycle 4 batch selection (2026-10-21, run 18ef6d162e3f)

Selection of record for the prioritize phase (attempt
06eaa870d82840d3add60238c26a0e63) at base 76005aa (== origin/main). The tree
carries this run's roadmap deliverable uncommitted (the ROADMAP.md mint of
rm-2141..rm-2144 plus the roadmap carrier doc); S0 below lands exactly that
delta — never redone, never dropped. All four candidate sites were re-read
first-hand this turn before selection.

Adoption record (2026-10-21, prioritize attempt 6a045493336040a889d0755861d429ec):
attempt 06eaa870 was reaped after writing this doc and its four ROADMAP
selection riders but before its PhaseResult reached the spool. This attempt
re-verified the full product first-hand and adopted it unchanged: census
329/0/rm-2144; ledger-check the same two informational PROVEN-STALE anchors
(rm-1523 ROADMAP.md:544, rm-843 :712); the four roadmap guards 24/24 green;
eslint rc=0 on ROADMAP.md and both cycle-4 docs; gh api 330819996 ->
disabled_manually since 2026-10-19T11:46:21Z (AGENTS.md:100 still documents
active); gh api 375606447 -> active with lockfile-guard.yaml absent from the
13-file workflow tree; web/src/sw.ts:83 cleanupOutdatedCaches at module eval;
web/index.html:8 apple-touch-icon -> /icon-192.svg; scorecard.yaml the only
workflow of 13 without timeout-minutes; fro-bot.yaml:357 pin e59939d v0.123.1;
ROADMAP.md diff = 34 insertions (roadmap's 30 + exactly the four selection
riders — no def-line change). Skill routing this phase: compound-engineering
router -> ce-plan (headless/pipeline-adapted; the delegation is autonomous, so
its interactive gates were resolved automatically); ce-strategy disclaims
backlog prioritization ("schedules and prioritization in the issue tracker;
implementation plans in ce-plan").

## Selected batch — fleet-truth closure (ordered)

- **S0 — land the roadmap delta (anchor, never cut).** The roadmap-phase
  deliverable plus this phase's selection riders ride the batch landing
  as-is.
- **S1 — rm-2141, workflow-fleet state-assert (reliability 45.0).** The
  batch lead. Converts the estate's chronic silent-failure class into a red
  check: expected-state manifest, scheduled assertion step, guard pin of the
  manifest against the workflows present in the tree, and the birth-divergence
  record in the landing batch doc.
- **S2 — rm-2144, scorecard timeout bound (maintainability 20.5).** One
  timeout-minutes line in the analysis job plus the guard extension pinning
  all 13 workflows bounded. Feeds S1: an unbounded scorecard run burns six
  platform-default hours and pollutes exactly the run-list freshness signal
  the S1 assertion reads.
- **S3 — rm-2142, service-worker precache cleanup placement (reliability
  44.0).** One placement decision with a red-first placement test, answering
  rm-1960's documented-intent header in the same change.

Cut order under time pressure: S3 first, then S2. S0 and S1 are never cut.

## Why this batch (impact, risk, effort, dependencies, strategy)

- Impact: rm-2141 is the highest-priority open candidate and the only one
  whose grounding failure is live at selection time — the Fro Bot workflow
  (id 330819996) has sat disabled_manually since 2026-10-19T11:46:21Z while
  AGENTS.md still documents it active, the ghost workflow (id 375606447)
  remains active with no file in-tree, and rm-1450's darkness rider records
  all 8 scheduled watchers running silently unrun for days during the
  10-11..10-14 outage. rm-2142 and rm-2144 are small correctness and hygiene
  wins that ride along at near-zero marginal cost.
- Risk: all three are repo-local — no absorb-lane overlap (two unlanded
  sibling envelope bands own the adjacent action-pin topics; first-landed
  wins by content, never a third mint), no external decision gates, no
  tracked binaries, no new dependencies.
- Effort: S2 trivial, S3 small, S1 medium. The total fits one implement
  cycle with validation margin; rm-2142's acceptance is completable via
  either arm (the activate move, or the recorded evidence-based dismissal —
  the workbox-precaching 7.4.1 activate-listener fact verified live by
  sibling research on 2026-10-21 is admissible evidence for the dismissal
  arm).
- Dependencies: none between members; S1 and S2 extend the same
  workflow-hardening-guard file family, so one batch touches one guard
  family.
- Strategic value: closes three of this cycle's four fresh mints, keeps the
  ledger's newest band clean for integrate, and makes PRODUCT.md's
  surface-what-is-real voice true for the workflow fleet itself.

## Not in this batch (with reasons)

- **rm-2143, iOS apple-touch-icon PNG (operator-experience 21.0).** DEFERRED:
  the acceptance opens with a generation-tool choice that must reconcile the
  salvage lineage's two-tool inventory to exactly one tool, commits tracked
  binary assets, and wants real-device or screenshot visual evidence — a
  tooling decision plus an evidence step, not a single-cycle end-to-end
  item. Re-select once the tool decision is recorded.
- **Agent pin bump to v0.125.0 (rm-252 leg).** Rides the rm-252 absorb lane
  by this run's own roadmap deferral; the pin-parity bump converges with the
  workspace-image ca-certificates cure and the Fro Bot re-enable
  precondition, and the enable/disable decision itself is rm-1450's, carved
  out of rm-2141.
- **TypeScript 7 cohort.** Hard-blocked: typescript-eslint 8.72.0 (published
  2026-10-19) peers at exactly 6.0.x or lower; 6.0.3 is the newest
  in-ceiling typescript.
- **rm-139 Node 26.** Date-gated: cycle 26 LTS starts 2026-10-28.
- **Envelope-band topics** (trivy scanner v0.76.0, the web-test-only release
  skip, actions/cache v6.1.0, integrity-guard hardening, impeccable 4.7.0).
  Claimed by two live unlanded sibling bands — first-landed-wins by content,
  never a third mint.
- **Everything else open** (rm-1450 Fro Bot decision, rm-1464 ruleset,
  rm-204, rm-691, rm-169, rm-226, rm-263, rm-1487): owned by their def
  owners as in-progress or operator/estate-gated work, not fresh-mint
  closure.

## Verification basis (this phase, first-hand)

- Sites re-read this turn: web/src/sw.ts lines 82-83 (precacheAndRoute then
  cleanupOutdatedCaches at module eval); web/index.html line 8
  (apple-touch-icon points at the SVG); timeout-minutes census across the 13
  workflows (.github/workflows/scorecard.yaml alone at zero);
  .github/workflows/fro-bot.yaml line 357 pin e59939d v0.123.1.
- Census after the selection riders: 329/0/rm-2144, unchanged by this phase
  (riders only). Ledger-check rc=1 with the same two informational
  PROVEN-STALE anchors as the assess and roadmap baselines.
