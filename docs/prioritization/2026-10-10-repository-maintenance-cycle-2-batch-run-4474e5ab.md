# Prioritization — repository-maintenance cycle:2 batch, run 4474e5ab38d8

- 2026-10-10 · run 4474e5ab38d8465dbf7effaa3acdf2a7 · prioritize attempt 43ce4628d6ee498e95240039ce63ce4f
- conductor config repository-maintenance:ee09aa2628914784a08df0efcdf2b730 cycle:2 · /work/projects/dashboard
- Selection base: origin/main ae9ee8e + this run's roadmap layer (delegate/roadmap-4474e5ab-7f5515b5.patch — census 253/0/rm-896). Live tip re-probed at selection: origin/main advanced to e6b6a94 (run 122a6930 landing, rm-822 landed-by-content, census 253) — rm-896 collision-free at live tip (0 mentions); union obligations unchanged.

## Selected batch — `monitoring-coverage-and-push-sw`

Two items, operator-experience track, both ownership-clean at file level, both gated by the offline battery only.

1. **rm-896 — Monitoring view visual/a11y coverage via a fixture /api/monitoring seam** (priority 30.0, minted by THIS run from assess F2 + research C4). Effort S-M. Risk LOW (report-only gate; fixture route mirrors existing /__fixture/* loopback-gated pattern). Value: closes the only uncovered nav view; the fixture seam is durable infrastructure for every future Monitoring browser test. Fresh first-hand evidence: 3-PNG baseline dir, harness router :240 (no /api/monitoring), AppShell.tsx:366 nav, rm-835's landed rendering delta shipped uncovered.
2. **rm-249 — push-only service worker substrate** (priority 72.0, the highest-priority ownership-clean offline-implementable open def). Effort M (SW + expirationTime/pushsubscriptionchange ownership + sw-notification.ts wiring + subscribe.ts real-subscription path + README /sw.js truthing + tests; PNG-icon substrate rider may ride or fall to the offline boundary per its tooling). Risk MEDIUM, mitigated by sequencing rm-896 first. Value: revives the dead client receive path; prerequisite for rm-106; the joint rm-138 decision is recorded below.

**rm-138 joint decision (recorded per rm-249's acceptance):** push substrate is implemented as a PUSH-ONLY service worker registered alongside the existing shell — no fetch handler, no precache manifest; the kill-switch's purge mission stays complete and the precache strip-or-implement decision remains rm-138's own, unprejudiced by this batch ("compatible with either rm-138 outcome").

**Acceptance gating made explicit (honest-scope clause):** rm-249's evidence line "manual verification on an installed PWA receiving a live VAPID push" is future-gated BY THE DEF'S OWN SEQUENCING ("rm-106's digest/push delivery rides it once the gateway-side send contract exists") — this cycle delivers substrate + unit/visual verification; live-push verification records at rm-106's landing. Any verification of installed-PWA behavior must cite BUILT artifacts (web/dist), never source greps (landed rider, run d1850b2e).

**Cycle gates (offline, per rm-831 platform disable):** pnpm check-types + pnpm lint (0-error baseline) + pnpm test two-green (root 66f/2491t + web 33f/1215t at tip; new tests add to these), the new Monitoring spec green locally with web/dist built, census stays 253/0/rm-896 (selection riders add no defs; guard pin 896 stands), actionlint not in scope (no workflow files touched).

## Ranking dispositions (top of the 70-def selectable pool, statuses first-hand at the selection base)

| def | pri | disposition |
|---|---|---|
| rm-104 | 98.0 | EXCLUDE — hermes-roadmap RENDER tool acceptance (next fleet render must emit lint-clean, vendored-path-excluded output); not repo code; mass ROADMAP signals surgery would conflict with every unlanded roadmap lane |
| rm-279 | 96.0 | EXCLUDE — acceptance fires on live push-to-main Lint runs; Actions run-creation outage makes it unverifiable this cycle; the ROADMAP-signals-line half is the same mass-conflict surface as rm-104 |
| rm-102 | 90.0 | EXCLUDE (in-progress) — first-PR proof needs dependabot PRs + live checks; outage-blocked |
| rm-103 | 85.0 | EXCLUDE — automated absorb cadence acceptance needs scheduled workflow runs; outage-blocked |
| rm-252 | 80.0 | LEDGER — decision due 2026-10-13; package already ridered by this run's roadmap layer (close-clean, residue zero); not implement code |
| rm-703 | 76.0 | EXCLUDE — landed by content: both digest readbacks at tip use the full-consume END-pattern awk (release.yaml digest-verification loop :490-496 and promote-latest step :533+ with the rm-691 note; introducer c8a2edd, 2026-10-07T12:39Z conductor-salvage); the def's cited early-exit SIGPIPE form is absent from the tree → true-up rider this phase (7th stale-status instance this run) |
| rm-282 | 74.0 | EXCLUDE — override-floor refresh re-derives the lockfile; converges with unlanded rm-842/rm-807-set (adopt-ONE-regen rule at their integrate) |
| **rm-249** | **72.0** | **SELECTED** — ownership clean (file-level spool grep: zero unlanded lanes touch web/src/sw.ts or web/src/push/**; run 3ff5a80c's landed work only truthed the sw-notification.ts header) |
| rm-779 | 72.0 | EXCLUDE — carried by the unlanded 938d6033/533ad14f lineage per fleet record; re-implementing would double-claim |
| rm-107 | 65.0 | DEFER (next-cycle lead) — composable status surface, offline-capable, but M-H effort with product-shape choices and no fresh evidence this run; outranked by rm-249 on priority and by rm-896 on freshness |
| rm-281 | 62.0 | EXCLUDE — CodeQL-green half of acceptance gated on platform re-enable (rm-831) |
| rm-108 | 60.0 | EXCLUDE — decision matrix time-gated to the 2026-10-21 rm-133 re-eval; lockfile half converges with rm-842 |
| rm-116 | 58.0 | EXCLUDE — branch-protection fill is a live gh-api mutation + cross-system coordination, not repo code |
| rm-196 | 56.0 | EXCLUDE (in-progress) — in-range lockfile refresh; same convergence rule as rm-282 |
| rm-119 | 52.0 | DEFER — gate-health roll-up; conclusions absent while Actions is down (would ship a view over empty data) |
| rm-144 | 50.0 | DEFER (partially implemented) — remaining half is property-test work on SSE-parser surfaces adjacent to unlanded rm-866/867 carriers; fold after their integrate |
| rm-194 | 50.0 | EXCLUDE — landed-by-content residue per the 155f9770 trap map (non-selectable) |
| **rm-896** | **30.0** | **SELECTED** — this run's own mint, fresh evidence, S-M effort, zero collisions |

## Ownership probe record (file-level, this phase)

Flat grep `^diff --git a/<path>` across every spool patch: `web/src/sw.ts` → 0 lanes; `web/src/push/` → 0 lanes; `tests/visual/dashboard.spec.ts` → 0 lanes; `operator-fixture-harness`/`operator-fixture-config` → 0 lanes. `release.yaml` → 2 lanes (493bbbf2 action-digest swaps only; a794d381b4f0 unrelated surface) — no rm-703-code lane (consistent with landed-by-content). Competing unlanded selections decoded: run 8cecf1d7f09f cycle:1 selected rm-807 (App.test.tsx determinism — different files); run ba5f6d7ddd67 cycle:2's 'oauth-pkce-and-pnpm-pin' batch (rm-149/rm-281/pnpm pin) LANDED by content as 2de647e — its auth surface is done on main, no collision with this batch.

## By-catch rider

rm-703 landing-verified true-up (landed at c8a2edd by content, sites verified at tip this phase) — rides the same cumulative roadmap layer this selection patch carries. The 22-def pending-landing audit roster stays owned by the roadmap layer's extension #39 (next ledger turn).
