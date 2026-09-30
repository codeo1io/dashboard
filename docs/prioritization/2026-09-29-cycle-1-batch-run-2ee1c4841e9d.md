---
date: 2026-09-29
topic: dashboard maintenance run 2ee1c484 cycle 1 — scoring and batch selection (post-d89ffe7)
mode: delegated-conductor
run: 2ee1c4841e9d4a71b963c0d6e6c31769
phase: prioritize
attempt: 2062c92e5e3242b0ba8ea2b9c6cebb4f
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent cycles 1-3 used ce-plan identically). Deviations declared: no subagent surface in this session, frames run in-process and disclosed (convention #3768). Label disclosure per the cycle-3 precedent: the engine cycle label is 1 (repository-maintenance:bb9b00df:cycle:1); the repo lineage has consumed cycles 1-17 plus parallel cycle-1 streams on other dates, so the artifact is named with the run suffix per the 2026-09-23-cycle-7-batch-run-998b49532b44 precedent to avoid collision.
---

# Dashboard maintenance — run 2ee1c484 cycle 1 batch (2026-09-29)

## Live frame facts (re-measured this phase, not carried stale)

- Worktree at `d89ffe7` (== `origin/main` per this run's assess phase; the merge that integrated run 998b4953). Uncommitted: `ROADMAP.md` extension only (41+/4-, this run's roadmap phase: rm-251..rm-256 minted, four dated-signal folds, provenance comment `cycle-1 extension #6`). No other tracked drift.
- Open candidate surface re-enumerated this phase: **57 items** with `status: candidate` across the ledger. Top of the ledger by priority: rm-104 (98.0, ESCALATED), rm-177 (97.0, implemented/pending-landing), rm-178 (91.0, implemented/pending-landing), rm-102 (90.0, in-progress awaiting the dependabot window ~2026-10-03), rm-142 (86.0, implemented/landed), rm-103 (85.0), rm-105 (80.0, implemented), then the live candidate band: rm-157/rm-249 (72.0), rm-251/rm-149 (66.0), rm-107 (65.0), rm-108/rm-162 (60.0), rm-205 (55.0), rm-163 (54.0), rm-119 (52.0), rm-216/rm-194/rm-220 (50-51.0), rm-252 (49.0), rm-153/rm-253/rm-187/rm-141 (47-48.0), rm-218 (46.0), rm-114 (45.0), rm-117/rm-226 (44.0), rm-254 (43.0), rm-118 (42.0), rm-256 (39.0), rm-255 (37.0), and the long tail of blocked/sequenced/decision-gated items.
- Fresh inputs feeding this selection, all from this run (not carried stale): the assess phase's six findings (now rm-251..rm-256 minus one) with file:line evidence at d89ffe7; the research phase's upstream/ecosystem measures (fro-bot/agent advanced to v0.117.0; all runtime deps current; TS7 still blocked by the typescript-eslint peer range).
- Phase boundaries this cycle: final_validation, commit, push, pr, ci are later gates — the batch must be implementable and verifiable with in-repo evidence (tests, greps, actionlint container-form locally) without needing a push to prove.

## Scoring (impact × risk-adjusted value; effort S/M/L; dependency state)

| item | pri | impact | effort | risk | deps | verdict |
|---|---|---|---|---|---|---|
| rm-104 render hardening | 98 | high (fleet-wide) | M | med | **EXTERNAL — the hermes-roadmap fleet generator must change first; acceptance requires the NEXT render to be clean + upstream tracking link** | defer |
| rm-103 absorb cadence | 85 | med (standing) | M | med | needs workflow+push authority design; current actionable delta is 2 riders, one of which IS rm-157's payload | defer |
| rm-157 agent v0.115.x absorb | 72 | high | L | high | **sequenced after gateway-side change; unverifiable without the live gateway (G2, standing)**; target advanced to v0.117.0 this run | defer |
| rm-249 dead-notification UI | 72 | med | M | med | **product decision joint with rm-138** (standing deferral) | defer |
| rm-149 OAuth PKCE | 66 | high (security, top unblocked) | M | med | unblocked; acceptance fully specified; open since 2026-09-23, deferred by selection 3× | **SELECT — co-lead** |
| rm-251 Monitoring poll wedge | 66 | high (live reliability defect) | S | low | unblocked; pattern exists (rm-155) | **SELECT — co-lead** |
| rm-107 status panel joint design | 65 | high | L | high | parked decisions (rm-198 family) + rm-256 twin must co-design | defer |
| rm-162 install-resolution memoization | 60 | med | M | med | pairs with rm-253; the small half is selectable now | defer (take rm-253) |
| rm-252 security-header test lock | 49 | med-high (guard) | S | low | unblocked, pure-test | **SELECT — rider** |
| rm-253 dead installByDatabaseId | 47 | med | S | low | unblocked; rm-162's small half | **SELECT — rider** |
| rm-141 pool verification half | 47 | med-high (closes a landed feature's proof) | S/M | low | pool already on main; remainder is a determinism test + timing measurement | **SELECT — rider** |
| rm-254 web lint gate (biome) | 43 | med | M | med | new devDep + CI wiring = widest blast radius in the fresh set; benefits from a cycle of its own BEFORE rm-108's TS7 work | defer (nominate next-cycle lead) |
| rm-256 /metrics twin | 39 | med | M | med | joint-design with rm-107 | defer |
| rm-255 logger claim fix | 37 | low-med | S | low | unblocked | **SELECT — rider** |
| rm-117 security-posture panel (+secret-scanning fold) | 44 | high | L | med | aggregator+web feature; wants a security-posture-themed cycle with live permission probes | defer |

## Selected batch — "auth-hardening + fresh-debt clearance" (6 items)

Theme: one deliberately-scoped security headliner the fleet has deferred three times, plus this run's freshly-evidenced small items — everything landable and verifiable with in-repo evidence, no external dependency, no parked decision.

- **B1 · rm-149 — OAuth PKCE (S256) for the operator login flow** (co-lead). The ledger's highest-priority unblocked security item; grep `code_challenge` across `src/` + `web/src/` returns zero at d89ffe7 (re-verified this run). Acceptance (carried verbatim from the item): authorization redirect carries state AND an S256 code_challenge; verifier in a short-lived HttpOnly SameSite=Lax cookie mirroring the state pattern; token exchange sends code_verifier and rejects mismatches; tests cover challenge-absent rejection at exchange, verifier-mismatch rejection, and the happy path; grep proof at the single redirect builder (`src/routes/auth.ts`). Evidence: new auth tests in `pnpm test`; any fork-specific nuance recorded in `docs/solutions/`.
- **B2 · rm-251 — Monitoring-view poll wedge** (co-lead). `web/src/views/Monitoring.tsx:19-31,45-53` latch + never-aborted AbortController + no timeout in `web/src/api/monitoring.ts:100-110`; the only 30s poll without rm-155's discipline. Acceptance: 15s `AbortSignal.timeout` composited with the caller signal; latch cleared in finally/on-abort; unmount aborts in-flight; a deferred-fetch + timer-advance test proves the poll recovers. Evidence: parity grep across all three poll hosts (App.tsx, Listener.tsx, Monitoring.tsx).
- **B3 · rm-252 — security-header test lock** (rider, pure-test). Acceptance: representative-response header set (CSP / X-Content-Type-Options / Referrer-Policy / X-Frame-Options per `src/server.ts:616-650`), the `/sw.js` exemption asserted present there and absent elsewhere, onError redaction assertions referenced from the same suite; negative-verified by planting a wider bypass. Evidence: suite red on planted edit, green at HEAD.
- **B4 · rm-253 — dead `installByDatabaseId` index: wire-or-delete** (rider). Acceptance: either a second lookup key at the join site (`src/github/aggregator.ts:569`) with a skew-seeded test proving the uncached resolver (`src/server.ts:1142-1151`) is not called, or the map deleted with the skew path documented as rm-162's; no third state. Evidence: grep shows reader or no builder; resolver call count stays zero in the fixture.
- **B5 · rm-141 — bounded-pool verification half** (rider; the pool itself already landed on main). Acceptance remainder: determinism check (result assembly independent of pool completion order; driftCount lock test and attention-first ordering hold under shuffled completion) + a before/after refresh-timing measurement recorded in this batch doc. Evidence: new determinism test green; timing table committed to the batch doc's landing addendum.
- **B6 · rm-255 — logger claim fix** (rider). Acceptance: make `src/logger.ts:104-108`'s structured-output comment true (opt-in `LOG_FORMAT=ndjson`, `{ts, level, msg, fields}` lines, default console output unchanged, warn/error still stderr) or correct the comment; tests pin both modes. Evidence: logger tests; grep shows no sink claim without a sink.

Order-of-work note: B1 first (auth surface, biggest review weight), then B2 (independent, client-only), riders B3-B6 in any order. B0 rider for the implement phase: flip ROADMAP statuses for the six to `in-progress` at implementation time and to `implemented` only at the landing gate, per house convention.

## Deliberate exclusions (recorded so the next prioritize does not re-derive)

- rm-104 (98.0): external — acceptance requires the fleet hermes-roadmap generator to change; this run's roadmap phase already applied the delegate-side half (mechanical render-hygiene checks on every added line). Revisit when the fleet generator ships its fix.
- rm-103 (85.0): wants its own cadence-design cycle (scheduled compare + human-approved merge PR); the current actionable upstream delta is two riders, one of which is rm-157's payload — folding them into THIS batch would couple an unverifiable item to a verifiable one.
- rm-157 (72.0): unchanged G2 gate (no live gateway this cycle) and the target moved twice this week (v0.115.1 → v0.117.0); absorbing under drift would double the review surface. Next gateway-touching cycle.
- rm-249 (72.0): product decision joint with rm-138 — standing.
- rm-107/rm-256: joint-design pair; the machine-readable twin decision should be made once, with the panel.
- rm-117 (+ secret-scanning fold): high-value but a full aggregator+web feature cycle; the research evidence (endpoint + existing optional permission) is recorded and fresh.
- rm-254 (43.0): nominated next-cycle LEAD — it must land before rm-108's TS7 migration to keep the typescript-eslint peer surface untouched, and it deserves its own verification cycle (planted-violation negative check across CI).
- rm-162 (60.0): take rm-253 (the small half) now; full memoization rides a performance cycle.
- Time-gated windows: rm-108 (TS7, blocked by peer range), rm-133 (vitest 5, re-eval 2026-10-21), rm-139 (Node 26, opens ~2026-10), rm-140 (pnpm 12, rides the rm-133 window), rm-102 (dependabot first-PR proof, window closes ~2026-10-03).
- Blocked/sequenced elsewhere: rm-146 (on rm-116), rm-159 (push authority), rm-215 (post-#155), rm-226 (converging via in-flight PR #196), rm-150 (completed).

## Verification expectations (what the implement phase must produce)

1. `pnpm check-types` (server + web) RC=0 with the heap cure (`NODE_OPTIONS=--max-old-space-size=6144`) on this box.
2. Targeted suites green: auth-route tests (B1), web Monitoring tests (B2), the new header suite (B3), aggregator skew fixture (B4), pool determinism test (B5), logger tests (B6); then the full `pnpm test` once, in a worktree with `web/dist` built (pretest) or via `pnpm test` directly.
3. Negative proofs: B3 planted-bypass red; B1 verifier-mismatch and challenge-absent red paths asserted; B4 skew fixture proves resolver-not-called; B5 shuffled-completion determinism.
4. Evidence lines: each batch item's landing note cites file:line at the landed SHA, per house convention.

## Landing record (worktree `conductor/run-2ee1c4841e9d`, 2026-09-29, pre-merge)

All six items implemented at HEAD d89ffe7 + this batch. Focused-suite evidence:
server 190/190 across 7 impacted suites, web Monitoring 45/45, server tsc RC=0
(heap cure), eslint clean on all touched files (0 errors, 1 intentional
`no-console` warning with disable-reason at the NDJSON stdout emit).

- **B1 rm-149 (PKCE, landed):** `src/auth/oauth.ts` — `buildPkce()` (43-char
  verifier, S256 challenge via `createHash`), `verifyPkce()` (timing-safe
  `timingSafeEqual` on equal-length digests); `src/routes/auth.ts:18-21`
  (verifier cookie `gf_pkce_verifier`, HttpOnly/SameSite=Lax, 10-min TTL, always
  Rotate), authorize URL carries `code_challenge`/`code_challenge_method=S256`,
  token exchange fail-closes (401 `invalid_grant`) when verifier cookie is absent
  or mismatched. `web/src/api/monitoring.ts` untouched (server-side flow).
  Tests: `test/auth-pkce.test.ts` (12) + 3 pre-existing auth tests updated to the
  new contract (`test/auth.test.ts`) = 63/63 auth surface green.
- **B2 rm-251 (poll wedge, landed):** `web/src/views/Monitoring.tsx:19-46` —
  Listener.tsx rm-155 discipline: per-fetch AbortController, 15s timeout-abort
  (`POLL_TIMEOUT_MS`), `finally`-released latch, stale-response race guard,
  unmount aborts in-flight fetch. Tests: `web/src/views/Monitoring.test.tsx`
  +4 (hang→timeout→recover; unmount-abort; race; cadence), 45/45.
- **B3 rm-252 (header lock, landed):** `test/security-headers.test.ts` (4) —
  CSP/`X-Content-Type-Options`/`Referrer-Policy`/`X-Frame-Options`/`Permissions-Policy`
  locked on API, SPA, and `/static` responses; `/sw.js` CSP-deletion bypass
  asserted (headers present except CSP). Planted-bypass negative proof deferred to
  full_tests (needs a header-deletion mutation run), noted for that phase.
- **B4 rm-253 (dead index, landed):** `src/github/aggregator.ts:542-577` —
  `installByDatabaseId` now load-bearing: database_id-keyed fallback lookup when
  node_id misses (covers API-format skew), resolver (`server.ts:1142-1151`) no
  longer the only path. Skew fixture proves fallback without resolver.
- **B5 rm-141 (pool verification, landed):** `test/aggregator-pool.test.ts` (3) —
  concurrency honored (5 in flight, 9th waits), shuffled-completion order
  deterministic (`sortAttentionFirst` stable sort; byte-identical snapshots),
  timing measured: serial 148-158ms vs pooled 57-65ms (≈2.5×, HEAD-scale
  fixture) — numbers recorded for rm-162's full-memoization case.
- **B6 rm-255 (logger, landed):** `src/logger.ts` — `LOG_FORMAT=ndjson` makes the
  structured-output claim true (per-line JSON: level/message/context/ts, service
  `dashboard`, timestamped entries only when a wall clock exists); default output
  unchanged. README env table row added. Tests: `test/logger-ndjson.test.ts` (6).

Carry-forward traps discovered this cycle: (a) `test/**` glob only matches
`.test.ts` — JSX component tests must live in the web test project
or esbuild drops the JSX; (b) module-level `vi.mock` factories are shared across
tests in a file — assert call counts only after `mockClear()` (a 15-call mystery
was cross-test pollution); (c) `@typescript-eslint` rejects `as {mock:...}` on
`vi.fn()` spies — bind the mock to a typed const instead.
