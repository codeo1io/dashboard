# Batch selection record — 2026-10-10 repository-maintenance cycle:3, run 91ddebf659a4

Priority: 30.0 → 18.0 (max within batch), batch size 3 items.
Selected ledger items: `rm-906`, `rm-910`, `rm-911` — batch name **'ledger-truth-and-hygiene'**.
Prioritize attempt: `6e1e367a6d8242f08bb198af2cc545d8` at base `e6b6a94` (worktree
`run-91ddebf659a4-91ddebf6`, origin/main re-probed at `d2b1acf`, 5 merges ahead — integrate
obligations carried by roadmap extension #44). The worktree carries this run's roadmap-phase
patch applied on top of base (`roadmap-eb83b651608a40159c9c6203adca44cb.patch`: six mints
rm-906..rm-911, the ten-block misfiling relocation, three riders, guard pin 835 → 911).

## Inputs

- assess `0171c62858dc4172b17bb2a74a3d3d87` — fresh adversarial pass at e6b6a94, ten
  findings with first-hand file:line evidence (F1 CSP, F2 contract window, F3 SSE watchdog,
  F4 SSE quadratic, F5 healthz truth, F6 mirror drift, F7 UA parity, F8 signal discard, F9
  lint warnings, F10 console.warn).
- research `b4d66ecdf01747bcb9ee3b00f55a36f5` — six extension candidates C1–C6 with
  upstream/ecosystem evidence (gateway v0.119.0 @ 1.9.0 contract, 41-release clone drift,
  impeccable 4.5.2, Node/pnpm cadence); ownership map deduped against existing ledger.
- roadmap `eb83b651608a40159c9c6203adca44cb` — extension #44 minting the six, census
  259/0/911 on the patched ledger (census healthy, guards 9/9, eslint clean).
- Fleet liveness (first-hand 2026-10-10): 24 live dashboard lanes across campaigns;
  maintenance campaign `dashboard-main-258bb63870b02750` shows only this run running.
  Contentions verified per-file by reading each live worktree's drift directly:
  `public/operator-stream.js` held by 461586feaf7d; `src/gateway/operator-sse-reader.ts`,
  `src/listener/store.ts`, and `test/listener-store-degradation.test.ts` held by
  633717c23b19 (the 1.9.0 adoption lane); `test/roadmap-integrity-guard.test.ts` pin-class
  drift on 8 lanes; `src/gateway/operator-server-fetch.ts` and `.github/workflows/main.yaml`
  — zero drift anywhere.

## Selection floor (top-of-ledger screening, priorities from the patched ledger)

- rm-104 (98.0): upstream-generator-gated — non-selectable per trap map (standing).
- rm-279 (96.0): cured-by-quiescence, score stale after the probe — non-selectable
  (standing).
- rm-102 (90.0, in-progress): dependabot clause-2 wording — gated on an upstream event
  (standing).
- rm-103 (85.0): upstream absorb window — standing defer (NO-ABSORB rm-252 constraint;
  fleet saturation).
- rm-252 (80.0): the absorb-window ledger itself — standing never-absorb write-capability
  item, not a code batch.
- rm-703 (76.0): carries an in-flight-mint rider (minted 2026-10-06, in-flight 2026-10-07,
  held-versions re-probe) — owned by a foreign lane.
- rm-282 (74.0): premise stale (zero open alerts at re-probe) — non-selectable (standing).
- rm-779 (72.0): in-flight-mint rider 2026-10-06/07 — owned by a foreign lane.
- rm-249 (72.0): product joint decision with rm-138 — decision-gated (standing).
- rm-117 (70.0): feature-sized, partially acceptance-blocked, uncontended server space —
  standing defer as strongest next-cycle candidate (recorded 155f9770 cycle:3).
- rm-106 (70.0): blocked-external (standing).
- rm-107 (65.0), rm-281 (62.0): in-flight-mint riders 2026-10-06/07 — foreign-owned.
- rm-162 (60.0): landed-by-content residue — non-selectable per trap map (standing).
- Below the floor: this run's mints rm-907 (32.0), rm-911 (24.0), rm-908 (22.0), rm-906
  (30.0), rm-909 (20.0), rm-910 (18.0) — the only items both fresh and legally selectable
  by this run.

## Claimed-and-excluded (congestion audit)

- rm-907 (SSE quadratic, 32.0 — the strongest fresh mint) EXCLUDED on file contention:
  `public/operator-stream.js` is drifted by live lane 461586feaf7d and
  `src/gateway/operator-sse-reader.ts` by live lane 633717c23b19. Re-selectable once both
  land; the rm-114 pairing rider survives the deferral.
- rm-909 (console.warn seam, 20.0) EXCLUDED on file contention: `src/listener/store.ts`
  drifted by live lane 633717c23b19 (plus f72cb7ef4b8b's landed lane). Re-selectable after.
- rm-908 (lint warnings, 22.0) EXCLUDED on file contention:
  `test/listener-store-degradation.test.ts` drifted by live lane 633717c23b19.
- rm-850 chain + rm-874 + rm-872 + rm-599/rm-513: built-unlanded in other lanes' spool
  patches (633717c2/cb6061a3/a794d381/19c024286/4c0ec7a5/b8e129c6/155f9770 lineages) —
  duplicate building would create integrate conflicts; they converge by content at
  integrate.
- rm-117: uncontended but feature-sized + partially acceptance-blocked — deferred, not
  crowded out by this batch (recorded as the strongest next-cycle candidate).

## Selected batch — 'ledger-truth-and-hygiene'

1. **rm-906 (30.0, maintainability)** — roadmap-integrity-guard placement assertion: every
   open-status def must sit between the Open and Completed headers, red-first regression
   fixture included. Test-file-only surface (`test/roadmap-integrity-guard.test.ts`);
   contention is pin-class only (8 lanes carry pin bumps, reconciled mechanically at
   integrate). The ten-block relocation is already delivered by extension #44; this closes
   the guard gap that let the misfiling persist across cycles.
2. **rm-910 (18.0, docs)** — operator-server-fetch caller-signal contract: document (or
   implement signal-combining for) the unconditional `AbortSignal.timeout` replacement,
   pinned by a test that a caller abort propagates while the timeout still fires. Zero
   live drift on the file; assess F8 verified the current usage is auth-middleware-only so
   this is contract honesty, not a live-cap fix.
3. **rm-911 (24.0, dependencies)** — impeccable pin currency: evaluate 4.5.2 against the
   Design job's real inputs (findings diff versus 3.2.2/3.2.1 recorded), bump the
   `.github/workflows/main.yaml` pin and `.impeccable/config.json` in lockstep if clean,
   or record a dated deferral rider with the observed delta. Zero live drift on main.yaml;
   network feasibility proven this session (npm registry + gh api reachable).

Coherence: all three are truth-guards on surfaces the fleet is NOT currently touching —
ledger structure truth (906), fetch-contract truth (910), design-gate truth (911). No two
share a file; no item shares a file with any live lane. Sizes are individually completable
within one cycle even under saturation (cf. 155f9770's single-item batch precedent under
4-lane saturation; three small uncontended items carry comparable total risk).

## Selection risk

- rm-906: pin-region merge attention at integrate (mechanical, ext #44 obligations) and
  the assertion must not false-positive on held `open` defs intentionally parked in other
  sections by foreign in-flight lanes — the assertion scopes to THIS tree's structure.
- rm-910: choosing document-vs-implement; acceptance allows either, implement preferred
  if `AbortSignal.any` is available in the Node floor (check `>=24` support first).
- rm-911: 4.5.2 findings delta may require `.impeccable/config.json` adjustments (the
  AGENTS.md note about `ignoreValues` handling); actionlint must stay clean; if the delta
  is unresolvable this cycle the acceptance explicitly permits a dated deferral rider.

## Verification

Prioritize-phase battery (this attempt): census healthy on the patched+selected ledger;
roadmap guards green; eslint clean on ROADMAP.md. The selected ledger reads:
`grep -n "status: open (selected 2026-10-10, run 91ddebf659a4" ROADMAP.md` → rm-906,
rm-910, rm-911 exactly. Chain proof: roadmap patch applies to pristine e6b6a94
(verified), prioritize patch applies on top of the roadmap patch (verified forward and
reverse), and the implement phase must apply BOTH before building.

<!-- AUTO-APPEND: implement/compound phases append their sections below this line. -->

## Implement outcome (2026-10-10, run 91ddebf659a4 implement 96100997)

Carrier chain applied in-tree first (ext #44 `roadmap-eb83b651608a40159c9c6203adca44cb.patch` md5 052a904cfa9240982a4c11fe0069d831 + `prioritize-6e1e367a6d8242f08bb198af2cc545d8.patch` md5 fac74303a2ef8f4e14aba832274837ce — both md5-verified against the prioritize phase records before applying); census after application 259/0/911 matching the prioritize battery.

- **rm-906 (placement half) — implemented.** `test/roadmap-integrity-guard.test.ts` gains `misplacedOpenDefs()`: every def whose status is open / candidate / in-progress / blocked-external must sit between the `## Open items` and `## Completed items` headers; terminal statuses are unaffected. Red-first honored in order: the three new tests were added first and observed RED (3 failed / 8 passed — helper not yet defined), then the helper landed and the battery went GREEN (12/12 including the length guard; eslint 0). Two regression fixtures: a synthetic minimal ledger (one candidate under Completed → exactly that id flagged) and the historical e6b6a94 blob flagging exactly the ten misfiled ids at their historical lines (git show with a 16 MiB maxBuffer — the 1 MiB execFileSync default hit ENOBUFS first-hand; depth-1 on-demand fetch fallback and skip-if-absent mirror the landed 3d07cf9 fixture pattern).
- **rm-910 (caller-signal contract) — implemented, both branches.** `src/gateway/operator-server-fetch.ts` now combines a caller `init.signal` with the hard timeout via `AbortSignal.any` — caller abort propagates AND the 10s cap still fires; a caller can add an abort source but never remove the timeout (null/undefined falls back to timeout-only). The seam contract comments (file header, security-invariants list, factory JSDoc, mergedInit comment) state the combine explicitly. Pinned by three new tests in `test/operator-server-fetch.test.ts`: caller-abort propagation through a combined (not passthrough) signal; an already-aborted caller aborting downstream synchronously; a real-time ~10s pin proving the timeout leg fires through the combine without leaking back into the caller signal.
- **rm-911 (impeccable pin) — deferral branch, dated rider recorded.** Measured first-hand with the exact Design-job command (`npx --yes impeccable@V detect --json web/src web/privacy.html`): **3.2.1 → `[]` rc=0; 3.2.2 → npm ETARGET (does not exist — ladder jumps 3.2.1→3.3.0, correcting this doc's earlier presumption); 3.3.0 → `[]` rc=0; 3.6.1 (last 3.x) → `[]` rc=0; 4.5.2 (latest) → 1 NEW finding rc=2** — `flat-type-hierarchy` (warning, slop) on `web/privacy.html`: body 16px / h1 16px / h2 16px, largest adjacent step 1.00:1 vs the 1.25:1 target — the exact first candidate the mint named. Bumping now would turn the Design job red, so the acceptance's deferral branch applies: pin stays 3.2.1, no workflow or config edit. Also proven: 4.5.2 honors `.impeccable/config.json` `ignoreValues` under the current schema (the bounce-easing value lives at `web/src/styles/tokens.css:93` inside the scanned tree and was NOT flagged), so no lockstep config edit is owed when the bump eventually lands. Unblock path: give `web/privacy.html` a real type step (or disposition the finding in `ignoreValues` deliberately), then bump the pin in both places. actionlint 1.7.12 rc=0 on the unchanged workflow (release-page binary; Docker Hub unreachable under the live network outage).

Focused-only test budget honored: guard suites (12/12), operator-server-fetch (34/34, ~11.9s wall from the real-time pin), gateway-auth (45/45 — the only live wiring of the adapter passes no signal, behavior identical), `pnpm check-types` rc=0, eslint on every touched file rc=0, census 259/0/911 healthy after riders. Repository-wide validation reserved for the full_tests phase. Implement evidence riders landed at the three def tails + implement extension #45 at the census tail.
