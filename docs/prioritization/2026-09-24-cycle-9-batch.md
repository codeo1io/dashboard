# Prioritization batch 2026-09-24 — repo lineage cycle 9

Provenance: conductor run 91e4626dccaf442588135e735703172f, prioritize attempt
9a40630e857840cbbd670249df66cb65, engine label cycle:1.

Lineage numbering (disclosed per convention): the engine labels this run cycle 1, but repo lineage
already carries five prioritization docs through `2026-09-21-cycle-5-batch.md`, and a parallel
campaign (run b9c36244) wrote `2026-09-23-cycle-8-batch.md` with its landing PR pending merge —
verified by `git fetch origin conductor/run-b9c36244d5ff` + filesystem probe this turn. To avoid the
known same-name collision hazard, this batch takes lineage **cycle 9**. This run's roadmap extension
was relabeled and renumbered accordingly (see below).

## Live frame re-measurement (stale-base rule)

- `git fetch origin` 2026-09-24: `origin/main` = `763c1fa`; this worktree HEAD `7809df6` (14 commits
  behind, PR-#12-era content); branch `conductor/run-91e4626dccaf`; tree = ` M ROADMAP.md` (this
  run's roadmap-phase extension, now renumbered) + untracked `.conductor/`.
- Parallel campaign: `conductor/run-b9c36244d5ff` ("land cycle-8 redaction-integrity and
  operator-surface truth batch", run b9c36244) has all PR checks green at 2026-09-23T18:39Z
  (Main 1m32s, CodeQL 1m33s, visual 1m40s, Dependency Review) — merge pending as of this fetch.
  Its 19-file payload overlaps this batch's server surface: `src/github/aggregator.ts` (52 lines),
  `src/github/app-client.ts` (13), `src/github/installations.ts` (29), plus `ROADMAP.md` (151 lines).
- **Id collision found and fixed**: that branch carries its own `rm-149..rm-154` (PKCE S256,
  trusted-proxy runbook pairing, int64-safe denylist, private-flag YAML robustness, session-roundtrip
  caching, hygiene batch 4). This run's roadmap phase had drafted `rm-149..rm-152` against
  `origin/main` 763c1fa (which stops at rm-148); they are now renumbered `rm-155..rm-158` in the
  worktree ROADMAP per the rm-132→rm-141 collision precedent, with the extension comment disclosing
  both the renumber and the cycle-8→cycle-9 relabel. Verified: 54 item headers, zero duplicates.

Inputs used, not redone: assess 2fa86485 (fresh adversarial surface read at 7809df6), research
8e38a665 (upstream/gateway/ecosystem/standards evidence), roadmap 5722630784 (worktree ROADMAP =
origin/main content + cycle-9 extension).

## Gated scoring (impact, risk-to-skip, risk-to-do, effort, dependencies)

Gates before value: (G1) does it restore or lock a currently broken invariant? (G2) can it complete
end-to-end this cycle in this worktree? (G3) does it depend on unlanded or external work?

| item | impact | risk-to-skip | risk-to-do | effort | deps | gated |
| --- | --- | --- | --- | --- | --- | --- |
| rm-156 outbound timeouts + refresh watchdog (60.0) | 9 — the product IS freshness; every server→upstream hop is unbounded | 8 — a single hung upstream blinds the serial fleet walk ~5 min while staleBanner stays false (2026-09-21 gateway incidents show hangs are real in this topology) | 3 — mis-sized timeouts could clip slow-legit calls; mitigated per-call-class + stall fixtures | M | none | PASS |
| rm-155 client polling hygiene batch (42.0) | 7 — the listener view's core loop permanently dies on one hung fetch; unread badge silently lies on outage | 7 — frozen UI with a false "will retry" promise erodes operator trust | 2 — happy path preserved by acceptance | S–M | none | PASS |
| rm-158 app badge for unread count (18.0) | 4 — installed-PWA visibility of the existing count | 3 | 1 — feature-checked no-op | XS–S | rm-155's error path (B2) | PASS (rider) |
| rm-141 bounded-concurrency fleet refresh (47.0) | 8 | 5 | 4 — determinism + rate-budget decisions; stranded ideation note must be recreated | M–L | wants rm-156's watchdog ceiling first | DEFER — enabled by B1 |
| rm-157 gateway run-status provenance (34.0) | 6 | 3 | 2 | S–M | agent pin ≥ v0.115.0 = open upstream PR #521 | DEFER — external pin gate |
| rm-129 trusted-proxy ingest limiter (40.0) | 6 | 5 | 3 | M | deployment decision; cycle-8's pending rm-150 pairs the gateway side | DEFER — pairing lands first |
| rm-116 branch protection (58.0) | 6 | 5 | 3 — owner/account-level action | M | owner decision; gates rm-146 | DEFER — unchanged rationale |
| rm-144 property suites (50.0) | 6 | 4 | 2 | L | none | DEFER — effort exceeds one batch |
| rm-112 staleness-semantics fix-half | 6 | 4 | 4 — decision-heavy (TTL 60s == refresh 60s) | M | none | DEFER — queued by cycle-7 |
| rm-104 render hardening (98.0) | 7 | 6 | 3 | M | tool lives in the fleet repo | HOLD — fleet scope |
| rm-102 first-PR proof / rm-139 Node 26 / rm-140 pnpm 12 | — | — | — | — | time-gated (~2026-10-03 / Oct) | WAIT |
| rm-103 absorb cadence (85.0) | 7 | 5 | 3 | M | drift is 0 — nothing to absorb | WAIT — evidence window not open |
| rm-105 SBOM+provenance (80.0) | 7 | 4 | 3 | M | none | DEFER — not from fresh findings |
| rm-107 / rm-117 / rm-119 operator panels | 6–7 | 4 | 2 | M each | rm-156's watchdog marker feeds rm-107 later | DEFER — fed by B1 |
| rm-114 / rm-115 / rm-118 / rm-120 / rm-127 | 5–6 | 3–4 | 2–3 | S–M each | none | DEFER — batch budget |
| rm-106 / rm-147 | — | — | — | — | blocked-external (gateway contract / upstream license) | BLOCKED |
| cycle-8's rm-149..rm-154 | — | — | — | — | pending landing on their PR | NOT re-selected (parallel campaign owns them) |

## Selected batch — "bounded-time, visible-failure transport" (both ends)

**B1 — rm-156 outbound HTTP timeouts + refresh watchdog.** Every outbound client gains an explicit
timeout sized per call class: `graphql.defaults` at `src/server.ts:963`, the Octokit clients in
`src/github/app-client.ts` (request `timeout` option), the gateway fetches in
`src/gateway/operator-server-fetch.ts` (Node's `AbortSignal.timeout`), metadata reads. The
aggregator records refresh duration and marks the snapshot degraded when a refresh exceeds a
documented ceiling. Tests inject a stalling socket and assert bounded cycle time + the marker.
Rationale: highest impact×urgency product of this run's findings, zero external dependencies, and it
defines the watchdog ceiling rm-141 needs next cycle. **Overlap risk**: the pending cycle-8 PR
modifies `aggregator.ts` and `app-client.ts` — the implement phase MUST re-measure after that merge
(stale-base rule applies to it) and expect textual reconciliation on those two files.

**B2 — rm-155 client polling hygiene batch.** Listener poll: release `isFetchingRef` in `finally`,
abort in-flight fetches on unmount, regression test seeding a never-settling fetch and asserting the
next tick still polls. App poll: in-flight guard, one-shot visible error (silent recovery allowed),
pause on `document.hidden` with immediate poll on visibilitychange. Rationale: the listener loop is
a permanent-latch bug (correctness), the unread poll is a silent-lie bug (trust); both are
worktree-local with no dependency on the parallel campaign (it touches no `web/` files).

**B3 — rm-158 app badge for unread notifications (rider).** `navigator.setAppBadge`/`clearAppBadge`
behind a feature check on the existing unread poll; clear after N consecutive failures (pairs with
B2's error surfacing); unit test with a stubbed navigator. Rationale: XS effort, standards-based,
rides the seam B2 opens.

Sequencing: B1 → B2 → B3 (B3 depends on B2's error path; B1 first because its fixture/test pattern
— a stalling local socket with a short configured timeout — is the pattern B2's web tests mirror).
Gates per batch item: `pnpm check-types`, `pnpm lint`, `pnpm test` (full suite), and for B1 a
hang-injection test must exist (acceptance requires it). Visual baselines: no `web/` component
rendered in the three dark baseline scenarios changes pixel output (error states only render on
failure paths); if a baseline reddens anyway, regenerate in the pinned Playwright image per the
rm-142 procedure — never bypass.

Deferred-to-next-cycle queue (explicit): rm-141 (now unblocked-shaped by B1), rm-144, rm-112
fix-half, rm-105, rm-107 (fed by B1's marker). Watch items: dependabot first docker/npm PRs
~2026-10-03 (rm-102), Node-26 gate opens ~October (rm-139), upstream PR #521 (agent v0.115.0) —
when it merges, rm-157 unblocks and rm-103's absorb window opens.

Contingency: if the cycle-8 PR merges mid-implementation, rebase the batch's server files onto the
new main before continuing; if it is REJECTED instead, re-check whether its rm-154 expiry-plumbing
still needs the cache rework fold-in noted on rm-118's signal.

## Landing notes (for the later commit gate, not this phase)

- Stage explicit file lists only; `.conductor/` stays untracked (rm-131 guard).
- ROADMAP landing: this worktree's ROADMAP is origin/main content + the cycle-9 extension; after the
  cycle-8 PR merges, reconcile by content (their rm-149..154 + my renumbered rm-155..158 coexist;
  my cross-references to "its rm-150"/"its rm-154" already use their post-merge ids).
