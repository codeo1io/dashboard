# Cycle-1 repository-maintenance batch — run be59a16eed8f437ab8394058e211d33c (prioritize attempt e189eedc)

Date: 2026-09-30 (host clock; engine stamps reading 2026-10-01 are skewed). Base measured:
worktree HEAD `278d350`, `origin/main` = `31995a20` (re-verified `git fetch origin` this attempt;
main unmoved since the research phase). All premises below re-measured at `origin/main` via the
git object channel, not the working tree.

## Selected batch — "Monitoring-of-monitoring: compose the fleet-data plane's truth into the live monitoring surface"

One status surface (already rendered), three units that make it truthful, complete, and verified:

### B1 — rm-107 (track operator-experience, priority 65.0): compose the missing monitoring-of-monitoring signals

The ledger's standing premise is PARTIALLY STALE at `31995a20` (fresh measure 2026-09-30, this
attempt): `web/src/views/Monitoring.tsx` already consumes `/api/monitoring` via
`web/src/api/monitoring.ts` + `useBoundedPoll` (import :2/:28-29, stale-status copy :144), so the
"dead route / consumer-less" signal (5 recurrences, last at 20ade64) predates a later landing that
connected the view. The item narrows to COMPOSING the still-missing signal classes into that live
surface:

- **Rate-limit budget**: `onRateLimit`/`onSecondaryRateLimit` (`src/github/app-client.ts:140/:144`)
  are log-only — surface the live budget (remaining/reset) through the monitoring DTO.
- **Listener store depth/age**: `ListenerStore` (`src/listener/store.ts:13-20`) has no depth
  accessor (`list/insert/ack/ackAll/prune/close` only; retention 500 rows / 30d) — add a small
  `stats()` (count + oldest `received_at`) and compose it.
- **Last refresh failures (fail-closed events)**: compose the fail-closed/stale transitions, not
  just `refreshedAt`/`staleBanner`.
- **Pinned review fix (rides this unit — 2026-09-24 review pin, run 91e4626d)**: make
  `refreshDegraded` MONOTONE under worsening outage. Verified live: `watchdogStamp`
  (`src/github/aggregator.ts:1030-1035`) stamps the FAILED attempt's duration and the fail-closed
  return at `:1404` resets `refreshDegraded: false` — a 95s degraded walk followed by an ms-fast
  network-dead metadata failure flips degraded back to false. Preserve the last successful walk's
  duration on fail-closed, or key degraded on `now() - refreshedAt` vs the ceiling. Red-before-green
  test required.
- `/api/healthz` stays liveness-only (`src/routes/api.ts` `lastFetch`/`rateLimit` null placeholders
  are by design — no duplication).

Acceptance (per item): each composed signal has a test; operator verification against a seeded
stale snapshot renders the panel correctly. Files: `src/github/app-client.ts`,
`src/github/aggregator.ts`, `src/routes/api.ts`, `src/listener/store.ts`,
`web/src/api/monitoring.ts`, `web/src/views/Monitoring.tsx` + tests.

### B2 — rm-119 (track operator-experience, priority 52.0): workflow-level gate-health roll-up

The four historical invisible-red instances (2026-09-19..24: gate reds discovered only by
out-of-band assess, up to ~26h) all lived at the WORKFLOW level — the dashboard renders check runs
(`CiRollupState`/`failingChecks` in `web/src/api/monitoring.ts:18-19`) but not workflow-level
conclusions. Unit:

- Snapshot carries the latest conclusion per workflow at the default-branch tip (dedupe by
  workflow name; REST pagination with a documented ceiling — rm-110 discipline).
- Any red required-gate at the tip feeds the EXISTING rollup/attention surface (no second panel —
  the 2026-09-26 fold rider already bound this to rm-107's surface).
- **Permission**: `actions: 'read'` is ABSENT from the mint subset today
  (`src/github/installations.ts:33-49`: CORE = pull_requests/checks/issues/contents/metadata;
  OPTIONAL = security_events/vulnerability_alerts, each with graceful core-only fallback). Add
  `actions: 'read'` to `OPTIONAL_READ_PERMISSIONS` — read-only, optional-with-fallback, so
  invariant #1 (read-only by construction) is preserved; note the extension in the invariant's doc
  site. REST `actions/runs` shape probed 2026-09-20 (Main/CodeQL/Scorecard conclusions); the probe
  must be re-verified with a minted installation token (rm-227's caveat pattern).
- Own-repo queue depth composes into the same surface (rm-107's 2026-09-21 evidence, jointly
  designed); fleet self-inclusion needs BOTH the repos.yaml data-branch row and the App install
  (2026-09-26 fold note — currently exactly one repo in the working set).

### B3 — rm-141 (track performance, priority 47.0): bounded-pool determinism verification (the acceptance's remaining half)

The pool itself is LANDED (`src/github/aggregator.ts:887` `AGGREGATOR_REFRESH_CONCURRENCY = 4`,
`:967` clamp, `:1310-1330` worker pool over the working set) — the item's own NARROWED rider leaves
exactly the verification half. Unit:

- Completion-order-independence test: injectable per-repo resolves with permuted completion
  orders; assert result assembly is identical — the driftCount lock semantics (existing pins at
  `test/aggregator.test.ts:541/:602/:605`) and attention-first sorting (`:306/:430`) hold under
  permutation. Src change only if the test finds real order-dependence.
- Before/after refresh-timing measurement (serial `refreshConcurrency=1` vs default 4) recorded in
  THIS batch doc — the acceptance's second clause.

## Why this batch (impact × risk × effort × dependencies × strategic value)

- **Impact**: P=65 + P=52 + P=47 under one theme — the highest-priority UNCLAIMED implementable
  content in the open ledger. The pain is measured four times over (invisible gate reds for hours,
  queue invisibility, rate budget invisible, refresh degradation non-monotone).
- **Contention (the deciding axis this cycle)**: as of 18:38Z, main (`31995a2`) carries NONE of the
  sibling claims, and every headline surface is multiply claimed unlanded: floors (runs 0a6430c9
  implemented+validated 16:39Z, 23d39aa7 selected 18:10Z, d997d9a88aad/afab8dbb minted), rm-252
  contract/pin absorb (3f3abfdd selected, b6abe350 IMPLEMENTED at salvage `2c60644` full_tests-green
  15:26Z, a666f8c0 selected 18:15Z), listener ack deadlines (b6abe350's B2 — the exact content of
  this run's rm-277 — implemented in `2c60644`), main.yaml Lint shard + residue (f91bcdc2),
  runtime lockfile refresh (a666f8c0), push/listener-view truth quartet (bcf92ca2), auth-PKCE
  (run 2ee1c4841e9d full_tests in flight), session-cache + listener 401 truth (open PR #196, run
  bf5d7753: `src/gateway/session-cache.ts`, `src/server.ts`, `web/src/api/listener.ts`,
  `web/src/App.tsx`). This batch's file set (aggregator.ts, app-client.ts, installations.ts,
  routes/api.ts, listener/store.ts, web monitoring pair + tests) intersects NONE of them — the
  integrate fold for this batch is trivial.
- **Risk**: low-medium. Additive DTO fields; one optional read-only permission with an existing
  graceful-fallback pattern; the deepest src change is the pinned monotonicity fix (small,
  independently reviewed, test-first-able). No contract-version surface, no gateway dependency.
- **Effort**: B1 medium, B2 medium, B3 small. B3 is separable if implement must trim.
- **Dependencies**: none external (no gateway deploy, no product decision, no live-VAPID, no
  protection window). Internal: B3 and B1's monotonicity fix both touch `src/github/aggregator.ts`
  — sequence together. Adjacency (not collision): `src/listener/store.ts` (3f3abfdd's dead salvage
  B3 touched `links` JSON.parse — disjoint hunk); prefer `web/src/views/Monitoring.tsx` as the
  render host and keep clear of `web/src/App.tsx` (PR #196).
- **Strategic value**: makes the dashboard self-observing (the fleet's own repeated blind spot —
  every red-window in the ledger's evidence was found by out-of-band `gh`), and closes the
  10-day-old rm-141 verification debt. Highest landing-probability per unit of value in the
  current fleet state, where NINE unlanded claims are queuing on main.

## Considered and deferred (with recorded reasons)

| Item (P) | Reason for deferral |
|---|---|
| rm-249 push-only SW (72) | Product gate: joint strip-or-implement decision with rm-138 + rm-106's user-facing dead-notification UI; evidence clause needs live VAPID push on an installed PWA — cannot complete end-to-end this cycle (own 2026-09-23 prioritize deferral stands). PNG-icon rider noted. |
| rm-252 contract 1.7.0/1.8.0 (80) | TRIPLE-claimed: 3f3abfdd (selected), b6abe350 (IMPLEMENTED, salvage 2c60644, full_tests green), a666f8c0 (pin half). Any re-selection quadruples the fold. |
| rm-276 fast-uri/floors (76) | Quadruple-claimed (0a6430c9 implemented+validated, 23d39aa7, d997d9a88aad/afab8dbb, plus my ledger candidate). FLEET WARNING recorded: fresh OSV/GHSA triple-source (2026-09-30 18:1xZ, sibling research) shows undici 7.x cannot reach `pnpm audit -r == 0` (GHSA-3jxr fixed only at 8.0.0; 7.30.1/7.31.1 backports unpublished) — the in-flight floors batches' acceptance is unachievable on 7.x; durable path = undici >=8.10.2 <9.0.0 + jsdom 29→30. fast-uri '>=3.1.8' and brace-expansion 2.1.7/5.0.12 remain correct. |
| rm-277 ack deadlines (70) | Implemented unlanded by sibling b6abe350 (salvage 2c60644: AbortSignal.timeout on all three mutation fetches + try/finally latch). DedupeKeys clear() + src/routes/listener.ts limit=0 also stay out — listener-view surface claimed by b6abe350 (Listener.tsx) and bcf92ca2 (replay policy). |
| rm-226 availability half (44) | Coupling site `src/server.ts:758` per-request session roundtrip is EXACTLY open PR #196's cache-insertion region — direct hunk collision; revisit after #196 lands. |
| rm-153 session-validation decision (48) | Converges to PR #196's `src/gateway/session-cache.ts` (15s-TTL single-flight) — recording the decision without landing the cache would fork the truth; wait for #196. |
| rm-278 SSE single-pass (38) | b6abe350's unlanded batch grew both parsers (+66/+89); a perf rewrite on top guarantees integrate conflicts. Measure-first harness also exceeds one cycle's trim discipline. |
| rm-271 toolchain majors (34) | Its own acceptance forbids bundled mega-PRs (each major its own landing); vitest 5 + typescript 7 must sequence with strip-only lint re-checks. |
| rm-127 topology doc (56), rm-205 zlib triage (55) | Off-theme docs-truth pair — next docs batch. |
| rm-116 protection fill (58) | Needs live protection mutation + push-authorized window (external sequencing). |
| rm-107's dead-route premise | Not an item — PREMISE STALE (see B1): the monitoring surface is live at 31995a2; ledger rider should follow at landing. |

## Verification plan (implement phase)

1. `pnpm check-types && pnpm lint` (mind the `#14785` stdin-lint instrument; per-line splits for
   oversized ledger lines).
2. `pnpm test` — new pins: per-signal composition tests (B1), monotonicity red-before-green (B1),
   workflow roll-up dedupe + required-gate red (B2), mint-with/without-optional-actions fallback
   (B2), permuted-completion determinism (B3), store stats accessor.
3. Record the B3 timing measurement (serial vs pooled) in this doc.
4. Client suite rides `pretest` web build (`web/dist` trap documented in AGENTS.md).

## Provenance

Selection by prioritize attempt `e189eedc` (run `be59a16eed8f437ab8394058e211d33c`,
repository-maintenance cycle 1), from: this run's assess (d0e62518/19dc34c2, git-object-channel)
+ research (7926409b) + roadmap deliverable (ROADMAP.md +24/-2, rm-276..rm-278 minted) + fresh
fleet-contention probes this attempt (5 sibling prioritize selections, 3 salvage worktrees, open
PRs, origin/main re-fetch). Canonical copy: delegate spool `e189eedcb7284f558dce10d27ca3ef1a.json`.
