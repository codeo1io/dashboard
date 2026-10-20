# Roadmap extension — repository-maintenance cycle:3 (2026-10-21)

## Deliverables

- `ROADMAP.md` — three mints (rm-2205, rm-2206, rm-2207), five riders (rm-252, rm-1524, rm-1525, rm-139, rm-879), extension marker #60

## Context

Conductor run d733142509744d8f9d6dcf8b2b3ae289, roadmap attempt 4b196677cc7741aa948c845904f7e8c0, campaign repository-maintenance 6e074f2ede994f549b1f2ac32aa6c202 cycle:3. Composed at base 76005aa == origin/main (origin re-fetched at compose; unmoved since assess), worktree porcelain-clean before the edit. Skill: ce-plan headless.

Prior attempts on this action died of provider-family reaps (224581df33d9411fa731bb05d427070d; b60692cf6acd4fd6bf830c8fa58d0003 — 12 messages then a serve-hold-ceiling reap, no result envelope, no tree drift, no spool scratch). Nothing adoptable; this extension is a declared from-scratch redo.

Inputs consumed (not redone): assess 7faca383 (battery green on rerun; five fresh findings) and research fb027dd4 (candidates R1–R4, upstream window at f37600d 32-behind, sibling-band discipline).

## Mints

- rm-2205 — Operator degraded-policy state: distinguish fail-closed empty listings from true empties (reliability 69.0). From research R1; incident-grounded in upstream fro-bot/dashboard issue #674 (2026-10-19, 18:25–19:05 UTC policy-unavailability window rendered as empty listings). Fork half only; the gateway-half contract change explicitly rides the absorb-window def.
- rm-2206 — Hook-bridge grandchild pid-file wait survives full-battery load (reliability 57.0). From assess F1: one 3928/3929 first-run failure under full-suite load, isolated rerun 37/37, full rerun green; the 400ms pid-file budget loses to the runner's kill budget under load.
- rm-2207 — Base-drift fallback-gate job least-privilege (compliance 41.0). From assess F5: the workflow_run fallback-gate job inherits workflow-level permissions including issues: write while only probing gh run list; the gates fire live, so the over-scoped token is minted on real runs.

Mint band rationale: sibling worktree def-line maxima re-probed live at compose — 21xx band dense through rm-2154 plus rm-2200–rm-2202 (af26c83c) and rm-2204 (42466e744796); wall extension ordinals through #59. This band takes rm-2205/2206/2207; next free rm-2208; extension ordinal #60.

## Riders (fresher evidence on existing defs)

- rm-252 — window moved: upstream tip 4bf77d9 (PR #698, agent v0.125.1), fork 33 behind / 371 ahead; v0.125.1 published 2026-10-21T04:15:12Z, lock-path hardening read first-hand (ACKNOWLEDGED→EXECUTING retry, 5s-bounded heartbeat shutdown with freshest confirmed ETags, malformed expiry → invalid lock); re-derive the digest pin at the then-tip at absorb.
- rm-1524 — the dated re-evaluation gate is LIVE (self-scheduled for 2026-10-21); currency 5.0.5; upstream recipe proven end-to-end (#694 lockfile+package.json only; #695 12-line jest-dom.d.ts companion) so vitest 5 + jest-dom 7 move as one change.
- rm-1525 — migration de-risked first-hand: upstream PR #693 (ecbaa72) moves vite-plugin-pwa to v2 as bun.lock + package.json only, zero config/source edits; rm-1960 landing further eases the sequencing concern.
- rm-139 — gate week live: v26.12.0 (2026-10-14) still lts:false, Node 24 in maintenance since 2026-10-20, 26 promotes 2026-10-28; go/no-go matrix due this week.
- rm-879 — arm-one state re-probed unchanged (workflow 330819996 disabled_manually since 2026-10-19T11:46:21Z); arm-two settled FALSE today (Actions secrets list empty — no FRO_BOT_PAT exists); AGENTS.md:100 doc-half is the stale remainder.

## Rejected candidates (dedupe, first-landed-wins — owned by sibling unlanded envelopes, reconcile by title)

- Port of upstream #682 (awaitInit loader-settle) — operator-suite load tolerance mint, run 592e2a894898.
- Port of upstream #678 + #679 (launch-surface robustness, disabled-state styling) — same sibling run.
- Renderer lazy-chunk 404 + sw.ts waitUntil hardening (assess F2/F4 overlap) — cycle:4 mints on run af26c83c (their signals quote renderer-source.ts:19 and sw.ts:270-273 first-hand).
- Fro Bot workflow live-state / AGENTS.md:100 truing (assess F3) — rm-879 lineage; rider added above rather than a mint.
- Remaining assess findings re-verified as owned by recorded defs on main (rm-2012, rm-2013, rm-116, and the re-verified stack) — no action.

## Census

Committed census at base 76005aa == origin/main: 325 defs / 0 dups / max rm-2032.

Census after edit (this worktree, this deliverable): 328 defs / 0 dups / max rm-2207

## Adoption record

Re-dispatch attempt `bf4bbc662a2e4ce3ad1a6daa12a14f47` (2026-10-21T07:49Z) after `4b196677cc7741aa948c845904f7e8c0` was provider-reaped at 06:58:29Z with this deliverable complete but the result envelope unwritten (typed artifact absent; event log confirms the reap mid-turn). Every leg re-verified first-hand, work ADOPTED UNCHANGED: identity lineage matches this work order (event log run/phase/action); base 76005aa re-fetched, still == origin/main with zero drift; tree is exactly this carrier plus the ROADMAP.md +26 delta; live ledger count matches the after-edit claim above; ledger-check exits rc=1 on the standing two-stale pair only (anchors shifted by the insertions); five guard suites 31/31 green including this doc's census-truth leg; lint rc=0; no sibling def-id collision on the minted ids (fleet re-probe at adoption: 42466e744796's ceiling is its rm-2204 with only next-free prose touching 2205; af26c83c holds rm-2200-2202; extension ordinal #60 unique across the fleet); every rider live-fact re-probed true (upstream tip 4bf77d9 / PR #698 / agent v0.125.1 published 2026-10-21T04:15:12Z, fork 33 behind / 371 ahead; workflow 330819996 disabled_manually since 2026-10-19T11:46:21Z; Actions secrets total_count 0; nodejs.org v26.12.0 still lts:false, v24.22.0 Krypton the LTS line, no newer v26). Phase result envelope written by the adopting attempt.
