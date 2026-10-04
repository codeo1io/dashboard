# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-04, run d1850b2ea56e)

- **Run / phase**: conductor run `d1850b2ea56e4dd8934a2cad4e652742` (repository-maintenance `1a56b31b4a094070a05c92abfa5a15fc`, cycle 1), phase **prioritize**, attempt `cdc2a127cbe74b489d662eea7fd27f59`.
- **Composed at**: base `227375247414e025902a29148c22c10d7244aacc` == live `origin/main` (`git ls-remote origin main` re-run this attempt, byte-identical to worktree HEAD). Porcelain pre-compose: ` M ROADMAP.md` only (this run's roadmap-phase deliverable, mints rm-599..rm-606 + 7 dated riders + extension #11, +57/-0).
- **Inputs**: this run's assess `549f4402` (full first-hand coverage-map completion), this run's research `61ca68e8` (11 mint candidates, npm/upstream probes, registerSW artifact fact), this run's roadmap phase `53d1476c` (mints + fleet census), and a **fresh fleet census re-derived this attempt** (below) — including one batch doc that appeared mid-flight after this run's roadmap census.
- **Skill routing disclosure**: no `ce-*` skill package is installed in this delegate env (`~/.agents/skills` → agent-reach only; repo `.agents/skills` → impeccable only) — same disclosure as sibling runs `146d73f2` and `fefc4067`; the fleet's recorded house process for this phase is followed directly (five-axis scoring over the open ledger + sibling census, one coherent batch, drop order, reconcile pointers).

## Fleet census at selection time (re-derived this attempt, not inherited)

Implementation-level claims (each lane's own batch doc + worktree porcelain; the decisive new fact this attempt: **`fefc4067`'s prioritize completed** and its batch doc now exists):

| Lane | Selected/landed batch | State |
| --- | --- | --- |
| `38ee3e1c` (ff35f77e c:1) | rm-187 corrupt-links guard + rm-482 rider, rm-501 unbounded operator fetches, rm-597 (their), rm-596 erasable-plugin bump (their) | batch doc present, implement pending |
| `2c3b4c64` (b8c62b40 c:1) | rm-608 Node-26 web-test localStorage cure, rm-609 stale SPA shell | **code landed in its worktree** (uncommitted) |
| `146d73f2` (3a560bcc c:1) | rm-286 audit-log op-buttons, rm-594 approval-fetch wall-clock bound, rm-595 validateDynamicId 3-copy parity, rm-596 dismissed push-card latch (their) | batch doc present, implement pending |
| `3b584779` (b5c74f87 c:1) | rm-617 logger stateless-token redaction, rm-484 SSE data-line \n-join (rm-616 same-batch mint RETRACTED same-day — superseded, do not implement) | batch doc + stewardship surfaces ready (spool `7d9a9b44`) |
| `84860aac` (9efdddd1 c:2) | rm-614 arm(a) gateway-auth 302 consistency (401/403 launch tail), rm-615 X-Robots-Tag | stewardship surfaces ready (spool `597de7e2`), implement pending |
| `fefc4067` (740b6dab c:1) | rm-601 limiter raw-pathname bypass, rm-602 429 Retry-After+no-store, rm-603 healthz no-store, rm-604 snapshot-store byte bound, rm-605 playwright reuseExistingServer (their numbering; compression deferred with a trigger awaiting this doc) | batch doc present, implement pending |
| `7a4d9070` | rm-555 /assets immutable caching | **code in worktree, unlanded** (2026-10-03 batch) |
| `b528f707` (1f2327c8 c:3) | rm-556 endpoint-parity, rm-557 permissionsPolicy, rm-558 multi-arch | **code landed in its worktree** (uncommitted) |
| `5bf98ac3` | stale 2026-09-30 lane: aggregator.ts JSDoc pins + base-drift/canary/visual workflows | unlanded, undated — avoid those surfaces |

Mint-level (unimplemented) content-twins relevant below: `63b5848a` rm-568–573 (**folds rm-487's badge re-arm as a same-batch rider** — per `84860aac`'s census; prioritize pending); `41067ca6` rm-586–593 incl. rm-592 VAPID provisioning **capability** (roadmap-only, prioritize pending); `9114bc6c` rm-608–610 incl. Notifications.tsx focus-steal (roadmap-only, prioritize pending); `73365170` rm-607 cancel-client CSRF-400 retry (roadmap-only); `86c2dd13` rm-619–621 (roadmap-only).

Fresh id-space census re-run this attempt (per-worktree `git diff HEAD -- ROADMAP.md` def-line extraction, all lineages): all-lineage uncommitted ceiling **rm-621**, **next free rm-622**. No minting happens in this phase.

## Five-axis prioritization of the candidate pool

Candidates = this run's own eight mints (rm-599..rm-606, the freshest first-hand-evidenced pool) + the unclaimed open-ledger items sibling docs list as free. Scale 1–5 (higher = more). Every code claim below **re-verified at base this attempt** (retraction law: no remembered greps — the law's third application in this fleet).

| Item | Impact | Risk-of-inaction | Effort (inverse) | Dependency-freedom | Strategic | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| rm-600 VAPID stale-key wire (op-exp 24.0) | 4 | 4 | 3 | 4 | 4 | **SELECT (anchor)** |
| rm-604 XFP Secure-cookie decision (sec 16.0) | 3 | 3 | 4 | 5 | 3 | **SELECT** |
| rm-603 workflow timeout-minutes ×4 (rel 12.0) | 2 | 3 | 4 | 5 | 3 | **SELECT** |
| rm-606 fixture session fetch unbounded (dev 6.0) | 2 | 2 | 5 | 5 | 2 | **SELECT (rider)** |
| rm-599 healthz no-store (10.0) | 3 | 3 | 5 | 5 | 2 | **DEFER — twin TAKEN** by `fefc4067` B3 |
| rm-602 compression decision-first (perf 38.0) | 3 | 2 | 2 | 2 | 4 | **DEFER + DISCLAIM** (see below; fires `fefc4067`'s recorded trigger) |
| rm-601 aggregator union dual-key (rel 26.0) | 2 | 2 | 3 | 2 | 3 | **DEFER — premise contested by landed design** (rm-255 pin; see below) |
| rm-605 playwright port NaN (dev 8.0) | 2 | 2 | 5 | 5 | 2 | **DEFER — same file as `fefc4067`'s selected B5** |
| rm-487 badge re-arm (28.0) | 3 | 3 | 3 | 5 | 3 | pass — **raced**: folded into `63b5848a`'s mint set |
| rm-153 session roundtrip caching (48.0) | 4 | 3 | 2 | 3 | 4 | pass — **region-raced**: same gateway-auth middleware block as `84860aac`'s pending rm-614 arm(a) (`src/server.ts:842–919`) |
| rm-138/rm-249 PWA/Push joint decision (30/72) | 4 | 3 | 2 | 2 | 5 | pass — dedicated-cycle fleet convention (two same-day sibling docs record it; this run's registerSW artifact fact is already banked in riders) |
| rm-274 logout-purge dead SW messaging (30.0) | 2 | 1 | 4 | 3 | 2 | pass — same SW-substrate decision family as rm-138 |
| rm-254 runbook gateway truthing (40.0) | 2 | 2 | 4 | 2 | 2 | pass — needs `fro-bot/agent@v0.116.x` first-hand sources; local clone is v0.78 only |
| rm-485 decision-record close (32.0) | 1 | 1 | 5 | 5 | 1 | pass — cheap docs rider named for next cycle by `146d73f2`; below this batch's bar |
| rm-226 fleet-data decoupling (44.0) | 4 | 3 | 1 | 3 | 4 | pass — architecture-scale, its own cycle |
| rm-279 Lint-job decomposition (96.0), rm-103 digest-churn watch (85.0), rm-104 fleet-render drift (98.0) | ≤3 | ≤3 | 1–2 | 1–2 | 4 | pass — standing fleet deferrals (CI-scale / external watch / pipeline-infrastructure) |

## Selected batch — "session trust and time bounds: what the operator client believes, what the server trusts, and how long anything may run"

One anchor + three riders, all this run's own first-hand-proven mints, zero lockfile/dependency changes, zero migration, single validation pass. File footprint is **disjoint from every selected/landed sibling surface**: no `src/server.ts`, no static-assets/rate-limit/aggregator/playwright.config surfaces; the only adjacent files (`web/src/views/Notifications.tsx`) carry mint-level (unimplemented) sibling interest only — reconcile pointers below.

### B1 (anchor) — rm-600: wire the VAPID key-version truth into the reconcile sweep

- **Why anchor**: production-dead correctness path proven this attempt, not remembered — `ReconcileSweepDeps.getCurrentKeyVersion` (`web/src/push/subscribe.ts:668`, consumed at `:755` → `classifyPushState`'s `currentKeyVersion` param, `web/src/push/reconcile.ts:48/:66`) has **zero production suppliers** (grep across `web/src/` + `src/`: only `subscribe.test.ts` exercises it, 7+ sites), so the `stale_key` classification is unreachable in production and a rotated VAPID key misclassifies as `subscribed` — push dies silently forever. The supplier half already exists: `web/src/push/vapid-key.ts` ships a fail-closed parser for the Gateway's `GET /operator/push/vapid-key` that **requires `keyVersion`** (`hasValidVapidKeyShape`) — the wire is the missing seam, exactly as minted.
- **Fix shape**: the Notifications view's `runReconcileSweep` call (`web/src/views/Notifications.tsx:97-103`, deps = `getLocalSubscription` + `pushClient` only) gains `getCurrentKeyVersion`, sourced from the existing vapid-key fetch/parse (view- or module-level cache; fail-open to `undefined` on fetch failure, which the classifier already treats as "unknown" — never block the sweep on it).
- **Tests**: view-level pin in `Notifications.test.tsx` (mocked `runReconcileSweep` asserting the dep is wired to the cached version) + a skew assertion at the seam (stale-vs-current version → `stale_key`, present-version → `subscribed`).
- **Sibling notes**: `41067ca6`'s mint rm-592 (VAPID provisioning/rotation **capability**) is mint-only and disjoint by the ledger's own boundary (this item owns only the dead handoff wire in existing code); `9114bc6c`'s mint touches `Notifications.tsx` (focus-steal) — mint-only, prioritize pending. Keep the `Notifications.tsx` diff minimal (dep supply + cache read); reconcile by content at integrate.

### B2 — rm-604: record the X-Forwarded-Proto → Secure-cookie trust decision and pin it

- **Why**: both cookie sites (`src/routes/auth.ts:79` state cookie, `:155` session cookie — re-verified this attempt) do `secure: c.req.url.startsWith('https://') || c.req.header('x-forwarded-proto') === 'https'`, and `grep x-forwarded-proto test/` = **0 hits** — the trust rule has no direct pins anywhere, while `README.md:70` documents "Sessions are HttpOnly, Secure, SameSite=Lax" without the header-trust caveat. An unprobed proxy can mark cookies Secure over plain HTTP; conversely a naive "fix" (gating XFP trust behind a new env, à la `RATE_LIMIT_TRUSTED_PROXY`) would silently strip `Secure` from existing XFP-trusting deployments at upgrade — both failure modes are unrecorded.
- **Decision pre-made (removes the acceptance's OR)**: branch **(b)** — keep header-trusting behavior, record the asymmetry-vs-`rm-129` rationale (cookie Secure is a one-way hardening flag, not a spoof-keying input; the blast radius of a forged Secure bit is bounded, while an opt-in default flips deployed behavior), document the deployment requirement in the README auth/security section, and add the **first direct three-topology pins** at both cookie sites (proxy-terminated https via XFP / direct https URL / plain http → not Secure). Branch (a) (mirror the env opt-in) is rejected as a deploy-time regression risk for existing single-operator deployments.
- **Tests**: three-topology matrix in the auth surface tests (new focused block; `test/dashboard.test.ts` is the only existing file touching cookies — zero current XFP pins).

### B3 — rm-603: bound the four unbounded workflows with observed durations

- **Why**: `grep timeout-minutes` across `.github/workflows/{codeql,dependency-review,fro-bot,scorecard}.yaml` = 0 (re-verified this attempt; `main.yaml` already carries 6) — a hung job burns runner minutes indefinitely on four gates, three of them scheduled/PR-triggered.
- **Fix shape**: `timeout-minutes` per workflow, **sized from observed Actions durations** gathered at implement time via `gh api repos/codeo1io/dashboard/actions/workflows/<id>/runs` (created_at↔updated_at deltas), never guessed. `fro-bot` is `disabled_manually` with no current runs — size from its last pre-disable runs and cite that fact in the batch appendix. Verify with actionlint (container form) — no test changes.
- **Sibling notes**: `5bf98ac3`'s stale lane edits base-drift/canary/visual only — file-disjoint.

### B4 (rider) — rm-606: bound the operator fixture session fetch

- **Why**: `web/src/operator/fixture-runtime-loader.ts:36-60` fetches the fixture session with no timeout — a wedged fixture gateway hangs the operator surface load indefinitely (dev/fixture-only, hence rider class).
- **Fix shape**: `AbortSignal.timeout(...)` with a fail-closed (skip-fixture) path on abort, mirroring the module's existing failure semantics. Test rides `web/src/App.test.tsx` (the existing coverage site for the loader — verified by grep this attempt).

## Deferred / disclaimed this cycle (decisions of record)

1. **rm-599 healthz no-store — TAKEN, not raced**: `fefc4067`'s selected B3 is this item's content-twin (same file `src/routes/api.ts:93-95`, same one-line fix, pinned in `test/dashboard.test.ts` per their doc). One implementation owner; this lane defers entirely. Reciprocates their own reconcile pointer.
2. **rm-602 HTTP compression — DEFERRED + TWIN DISCLAIMED** (this discharges `fefc4067`'s recorded next-cycle trigger clause (b) "the d1850b2e lane's prioritize disclaims its compression twin"): (a) the class carried three same-day unlanded claims and their lane owns it going forward; (b) the surface family (static mounts in `src/server.ts`) is occupied by unlanded sibling implementations (`7a4d9070` rm-555, `2c3b4c64` rm-609); (c) this item's own Arm-1 decision input is **unverifiable from this delegate env** — no `marcusrbrown/infra` checkout exists here (first-hand: `find /work -iname '*caddy*'` and an `encode` grep over the only infra checkouts found → zero hits), so the decision could not be grounded first-hand this cycle. Arm 2 (precompressed siblings) per `fefc4067` is the executable default with their measured 4.15× ceiling; their lane takes it.
3. **rm-601 aggregator union dual-key — premise contested by landed design; decision-gated now**: re-derived this attempt (retraction law): landed `test/aggregator.test.ts:650` (`rm-255: auth-context join falls back to database_id when node_ids skew across formats`) **asserts** at `:671` `snap.repos` length 2 with the comment *"metadata entry + install-only twin — the documented skew drift"*, and the stale `5bf98ac3` lane pins the same semantics as "by design" in JSDoc. The mint's "duplicate rows inflate driftCount" defect premise therefore contradicts a landed, test-pinned design decision; a dedup fix would have to overturn `rm-255`'s recorded posture (conservative over-reporting of drift). Not implementable as minted. **Correction-of-record candidate**: the mint's status should move to `decision` at the next roadmap phase (drift-semantics adjudication: count-only vs dual-key identity vs documented-skew-drift), noting the fresh-vs-remembered evidence law caught this in prioritize.
4. **rm-605 playwright port NaN — same-file race**: `fefc4067`'s selected B5 edits `playwright.config.ts` (`:79`); this item edits `:30`. Same file, selected-vs-mint — defer to avoid textual collision; revisit after their implement lands.
5. **rm-487 badge re-arm — raced**: folded as a same-batch rider into `63b5848a`'s mint set per `84860aac`'s census (that lane's prioritize pending but the fold is its ledger claim).
6. **rm-153 session roundtrip caching — region-raced**: the caching seam is the same gateway-auth middleware block (`src/server.ts:842–919`) that `84860aac`'s pending rm-614 arm(a) edits; also a real fail-closed design effort (TTL/invalidation) too heavy to ride this batch.
7. **rm-138/rm-249 + rm-274 (PWA/SW substrate family)** — dedicated-cycle fleet convention, recorded by two same-day sibling docs; this run's registerSW artifact fact (the enabling decision input) is already banked in the ledger riders and two corrections-of-record.

## Drop order, guards, verification recipe

- **Drop order (first dropped first)**: B4 → B3 → B2 → B1 (anchor lands or the batch dies as a unit — same guard as every 2026-10-04 sibling).
- **Batch guards**: every unit lands its red-before-green test (where applicable) in the same change; no unit touches a file another unit's tests depend on being unmodified; `pnpm check-types`, `pnpm lint` (changed files), targeted suites (`Notifications`, `subscribe`, `vapid-key`, `dashboard`/auth surface, `App`), then the full battery.
- **Web-suite validation recipe** (standing until `2c3b4c64`'s landed-uncommitted rm-608 cure integrates): on Node 26, run web suites with `NODE_OPTIONS='--localstorage-file=/tmp/x'` — the documented fleet workaround for the rm-548 localStorage ExperimentalWarning class (4f/100t red bare, 1172/1172 green with the flag; re-verified by two sibling assess runs this morning). Server suites are natively green at base.
- **Estimated effort**: B1 S–M, B2 S, B3 S, B4 XS → **~M total**, one cycle.

## Reconcile-at-integrate pointers

- rm-600 ~ `41067ca6` rm-592 (capability vs wire — ledger-boundary separation) and `9114bc6c`'s Notifications.tsx mints (mint-only, unimplemented) — reconcile by content, id-first-landed.
- rm-604, rm-603, rm-606: no sibling claims at any level (census this attempt).
- rm-599 → `fefc4067` B3 is the sole implementation claim (this lane disclaims).
- rm-602 → `fefc4067` owns the class next cycle (this doc is their recorded trigger (b)); standing `ff60e183` spool rm-553 pointer noted dead by their census.
- rm-601 → next roadmap phase: status correction to `decision` + drift-semantics adjudication rider (landed rm-255 pin is the authority).
- Id-space note: this worktree's mints rm-599..rm-606 overlap `fefc4067`'s rm-600..rm-605 **in id-space only**; extension #11's re-delivery addendum remains the coordination record.

*Required evidence for this phase = the selected batch + rationale above (this document). Implement phase consumes B1–B4 as specified, including the pre-made rm-604 branch-(b) decision.*

## Compound record (2026-10-04, attempt 0498dcd8 — pre-review, cycle evidence only)

Batch B1–B4 implemented (attempt 40c6e58d, 13 files +476/-2, uncommitted) and
validated pre-review:

- **Targeted** (attempt 9e046055): impacted-tests runner derived node
  targeted=10 server files (auth, dashboard, gateway-auth*2, listener*2,
  static-assets, listener-store, plus aggregator-adjacent) — green; the four
  workflow diffs actionlint-clean (container form); eslint/tsc on changed
  files clean.
- **Full** (attempt 8fd750b3, authoritative `github_ci_validate.py --repo .`):
  routed to ephemeral GitHub-hosted validation PR #369 on snapshot
  970e47381476 (= base 227375247 + this batch; temporary-index, worktree
  untouched) — **all 10 checks SUCCESS** (Analyze, Check Types, Check
  Workflows, CodeQL, Dependency Review, Design Check, Lint, Test 1m26s on
  the Node-24 pins, Test Scripts Load, visual; Main run 37195600393). B3's
  four new `timeout-minutes` caps were enforced on their own validating
  jobs. Teardown clean (PR closed, `conductor/ci-970e47381476` deleted,
  porcelain byte-identical pre/post). Digest declared:
  `validation:v1:a64c16c73edf390d4ac584ef99e0a13a1cb22494565e7897924b0784210277a8`.
- **Red-first proofs**: B1 stash → exactly the 2 wiring pins fail (2/40);
  B4 stash → abort test hangs to vitest's 30s timeout (the unbounded-wait
  red). NODE_OPTIONS=--localstorage-file recipe above used for all local
  web-suite runs, as specified.
- **Roadmap statuses**: rm-600/603/604/606 statuses now carry
  implement + targeted + full-CI evidence, still `pending review/landing`
  (review/shipping outcomes are post-compound by policy).
- **Durable lessons**: filed as
  `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-04-session-trust-time-bounds.md`
  (L1 dead-wire optional deps, L2 stash-based red-first + timeout-as-red,
  L3 timeout sizing from observed Actions history, L4 decision-of-record
  deliverables, L5 ephemeral-PR workflow-edit self-enforcement, L6 Node-26
  local web recipe) plus next-cycle candidates.

Next cycle inherits: the deferred/decision-first set above (rm-601 decision
+ rm-255 adjudication, rm-602 infra-first, rm-605/rm-599 sibling reconcile,
web-storage cure sequencing), the dated ledger signals (v26 LTS 2026-10-28,
TS7 peer-block, vite-plugin-pwa 2.0.0 re-verify), and the fleet-janitor
candidate (stale `conductor/ci-*` branches + stale open validation PRs).
