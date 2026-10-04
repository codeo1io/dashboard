# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-04, run fefc40679c69)

- **Run / phase**: conductor run `fefc40679c69441babd773300bf31f81` (repository-maintenance `740b6dab`, cycle 1), phase **prioritize**, attempt `7209fe5c933241a58fb80a441c619b07`.
- **Composed at**: base `227375247414e025902a29148c22c10d7244aacc` == live `origin/main` (fresh `git fetch` + `git ls-remote origin main` this attempt — remote tip byte-identical to the worktree HEAD; porcelain pre-compose: ` M ROADMAP.md` only, this run's roadmap mint `rm-600..rm-605` + 5 riders + extension #11, +42/-0).
- **Inputs**: this run's assess `2ed3d229` + research `103c56d9` (spool research docs + wire-compress probe), this run's roadmap phase `2eda5f27` (the mint + re-delivery addendum), and a fresh fleet census (below).
- **Skill routing disclosure**: no `ce-*` skill package is installed in this delegate env (`~/.agents/skills` → agent-reach only; repo `.agents/skills` → impeccable only) — same disclosure as sibling run `146d73f2`'s prioritize; the fleet's recorded house process for this phase is followed directly (five-axis scoring over the open ledger + sibling census, one coherent batch, drop order, reconcile pointers).

## Fleet census at selection time (re-derived this attempt, not inherited)

Implementation-level claims (selected or landed, from each lane's own batch doc + worktree porcelain; every surface grep re-run against the sibling `git diff HEAD` output this attempt):

| Lane | Selected/landed batch | State |
| --- | --- | --- |
| `38ee3e1c` (ff35f77e c:1) | rm-187 corrupt-links guard + rm-482 rider, rm-501 unbounded operator fetches, rm-597 (their), rm-596 erasable-plugin bump (their) | batch doc present, implement pending |
| `2c3b4c64` (b8c62b40 c:1) | rm-608 Node-26 web-test localStorage cure, rm-609 stale SPA shell | **code landed in its worktree** (src/server.ts, static-assets, test-setup — uncommitted) |
| `146d73f2` (3a560bcc c:1) | rm-286 audit-log op-buttons, rm-594 unhandled-500 suite, rm-596 push-card re-entry (their), rm-595 validateDynamicId 3-copy parity (their) | batch doc present, implement pending |
| `3b584779` (b5c74f87 c:1) | rm-617 logger stateless-token redaction, rm-484 SSE data-line join (rm-616 RETRACTED same-day — superseded, do not implement) | batch doc + stewardship surfaces ready (spool `7d9a9b44`) |
| `84860aac` (9efdddd1 c:2) | rm-614 arm(a) 401/403 launch tail, rm-615 X-Robots-Tag | stewardship surfaces ready (spool `597de7e2`), implement pending |
| `7a4d9070` | rm-555 /assets immutable caching | **code in worktree, unlanded** (2026-10-03 batch) |
| `b528f707` (1f2327c8 c:3) | rm-556 endpoint-parity, rm-557 permissionsPolicy, rm-558 multi-arch | **code landed in its worktree** (uncommitted) |

Mint-level (unimplemented) content-twins relevant below: `63b5848a` rm-569 (limiter encoded-path, roadmap-only, its prioritize **pending**); `d1850b2e` rm-602 (compression) + rm-599 (healthz no-store) (roadmap-only, prioritize **pending**); `41067ca6` rm-589 (Retry-After — **zero spool results, dead lane**); `ff60e183` rm-553 (compression — spool-only claim, dead lane); `38ee3e1c` rm-595 (Retry-After — **passed over** by that lane's own prioritize).

Fresh id-space census (per-worktree `git diff HEAD -- ROADMAP.md` def-line extraction, all run-worktrees): all-lineage uncommitted ceiling **rm-621** (`86c2dd13` minted rm-619..621; then `b3491252` rm-618, `3b584779` rm-616/617, `84860aac` rm-614/615 downward); **next free rm-622**. No minting happens in this phase.

Reproducibility note (correction-of-record candidate for lane `38ee3e1c`): its batch doc claims `146d73f2`'s B1+B2 "landed at origin/main `07e88cdd`" — `07e88cdd` is **not a valid object** in this clone and live `origin/main` is `227375247` (ls-remote this attempt); the cited content (listener store /audit-log op-buttons at the quoted lines) is not present at this base either (`test/listener-routes.test.ts:189` is ingest-cap code). Immaterial to this selection (no overlap), recorded here so that lane's integrate does not trust the hash.

## Five-axis prioritization of the candidate pool

Candidates = this run's own six mints (the freshest evidence-backed pool, fully probed by this run's assess/research) + the open-ledger items sibling docs list as unclaimed. Scale 1–5 (higher = more). Every code claim below re-verified at base **this attempt** (rm-616 law: no remembered greps).

| Item | Impact | Risk-of-inaction | Effort (inverse) | Dependency-freedom | Strategic | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| rm-600 compression (perf 38.0) | 3 | 2 | 2 | 5 | 4 | **DEFER** — see below |
| rm-601 limiter raw-pathname bypass (rel 26.0) | 4 | 4 | 3 | 5 | 3 | **SELECT (anchor)** |
| rm-602 429 no Retry-After (rel 18.0) | 3 | 3 | 5 | 5 | 3 | **SELECT** |
| rm-603 healthz no Cache-Control (rel 14.0) | 3 | 3 | 5 | 5 | 2 | **SELECT** |
| rm-604 snapshot-store UTF-16 bound (rel 10.0) | 2 | 2 | 5 | 5 | 2 | **SELECT** |
| rm-605 playwright stale-server reuse (test 12.0) | 2 | 3 | 4 | 5 | 2 | **SELECT** |
| rm-107 composed status panel | 5 | 3 | 1 | 2 | 5 | pass (feature-scale; standing fleet deferral) |
| rm-116 branch-protection fill | 4 | 4 | 3 | 1 | 4 | pass (ops/decision-first, needs live protection object) |
| rm-260 logger stdout decision | 3 | 2 | 4 | 4 | 2 | pass (decision-shaped; adjacent lane 3b584779 owns logger surface this cycle) |
| rm-257 web lint, rm-253 CI-fleet decision, rm-139 time-gated, rm-147 blocked-external | ≤2 | ≤2 | 3–5 | 2–4 | ≤2 | pass (each parked by its own standing reason) |

## Selected batch — "wire truth: the limiter, its 429 contract, and the gates that can lie"

One anchor + four mechanical riders, all server-side/test-infra, all red-before-green testable in-repo, zero external dependencies, zero migration. Surfaces verified **unclaimed at implementation level** by the census above; file footprint disjoint from every sibling lane's selected/landed batch except sharing `src/server.ts` with landed-but-uncommitted sibling code in *disjoint regions* (theirs: '/'-handler shell caching, secureHeaders, /assets mounts; ours: the limiter block `:714–:757` + `classifyRateLimitPath:186` only).

### B1 (anchor) — rm-601: rate-limiter class gate reads the raw pathname

- **Why anchor**: highest-impact implementable mint of this run (security-adjacent, live-probe-proven: 70× `/%61uth/login` → 70× 302, 0× 429 vs plain-form trip at exactly 60/min; `/%61pi/status` reaches the real handler consuming zero budget). Base state re-verified this attempt: `src/server.ts:720` `const path = new URL(c.req.url).pathname` raw, classify call `:754`, dispatch `:186`; auth holds on encoded forms (exact-match gates deny) — the fix is accounting-only.
- **Decision pre-made (removes the acceptance's OR)**: primary arm = classification and the adjacent pathname gates (`isPublicPath`, sensitiveRoutes) operate on a **decoded normalized pathname** (`decodeURIComponent` in try/catch, raw fallback on malformed escapes — never throw); the alternative "re-key on routed pattern" is rejected as invasive (touches the router seam for an accounting fix).
- **Tests**: extend `test/rate-limit-class.test.ts` (property: percent-encoded variants of every public/sensitive route classify to the same class) + a regression pin of the live repro (encoded flood trips at the plain-form threshold). Existing static-assets traversal tests must stay green (auth/routing behavior on encoded paths unchanged).

### B2 — rm-602: 429 responses carry Retry-After (+ no-store)

- **Why**: same middleware block as B1 — literally the adjacent line (`src/server.ts:756` `c.text('Too Many Requests', 429)`, verified the **sole** 429 site tree-wide this attempt; all three classes public/operator/ingest emit through it). Well-behaved pollers currently retry blind.
- **Implement notes**: `RATE_LIMIT_WINDOW_MS = 60_000` (`:126`), fixed window anchored at first hit (`:267-268` `windowStart`); `checkRateLimit` (`:258`) returns boolean — export a window-remaining companion (or richer return) so the response site can emit `Retry-After: ceil((windowStart + 60_000 − now)/1000)`, floored at 1, plus `Cache-Control: no-store`. Sibling `38ee3e1c`'s mint adds one good clause adopted here: document the header in README's rate-limit section. Tests in `test/rate-limit-config.test.ts` asserting both headers per tripped class.

### B3 — rm-603: /api/healthz sends Cache-Control: no-store

- **Why**: constant probe body is exactly what an intermediary caches — stale `ok:true` masks outages. Base re-verified this attempt: `src/routes/api.ts:93-95` no header, while the repo's no-store convention covers `/status` (`:104`). Header half only — the DTO half stays rm-107's.
- **Tests**: one-line header + assertion pinned in the existing healthz block (`test/dashboard.test.ts:647-650`), not in static-assets (minimizes collision with sibling landed-uncommitted static-assets edits).

### B4 — rm-604: snapshot-store size bound counts bytes, not UTF-16 units

- **Why**: both guards (`src/github/snapshot-store.ts:96` persist, `:122` load; `MAX_SNAPSHOT_BYTES = 1_048_576` at `:29`) compare `.length` — astral characters undercount up to 4×; latent (ASCII-dominated today) but the bound should measure what it bounds. Zero sibling claims anywhere.
- **Tests**: `test/snapshot-store.test.ts` astral-heavy payload just over the byte bound rejected identically at persist **and** load; ASCII payloads byte-identical (no behavioral change).

### B5 — rm-605: playwright visual suite must not silently pin to a stale dev server

- **Why**: `playwright.config.ts:79` `reuseExistingServer: process.env.CI === undefined` — a leftover listener on 127.0.0.1:4311 (the documented backgrounded-`pnpm dev` recipes) gets reused against the **prebuilt** `web/dist`, so the report-only gate green-lies about the current tree. Zero sibling claims.
- **Decision pre-made**: first acceptance arm — default `reuseExistingServer: false`, explicit opt-in `PW_REUSE_SERVER=1`, decision encoded in the config comment; the build-sentinel probe arm is rejected as over-engineering for a report-only gate. CI unchanged (CI already never reuses). Recipe note rides the existing orphan-kill doc (`docs/solutions/workflow-issues/dev-server-hang-background-no-watch-kill-orphans-2026-06-25.md`).

### Drop order, guards, verification recipe

- **Drop order (first dropped first)**: B5 → B4 → B3 → B2 → B1 (anchor lands or the batch dies as a unit; same guard as every 2026-10-04 sibling).
- **Batch guards**: every unit keeps its red-before-green test in the same change; no unit touches a file another unit's tests depend on being unmodified; `pnpm check-types`, `pnpm lint` (changed files), targeted suites (`rate-limit-class`, `rate-limit-config`, `dashboard`, `snapshot-store`, `static-assets`, `server`), then the full battery. Web suites need the Node-26 `--localstorage-file` recipe (sibling rm-608's lane owns the durable cure).
- **Estimated effort**: B1 S–M, B2 XS, B3 XS, B4 XS, B5 S → ~M total, one cycle.

## Deferred this cycle — rm-600 (HTTP compression) with recorded trigger

The top-priority mint (38.0) is deliberately **not** in this batch, on fleet discipline (no racing of standing claims on an occupied surface family):

1. **Three unlanded claims on one class**: this rm-600, `d1850b2e`'s rm-602 (same-day concurrent mint, that lane's prioritize **pending** — a live racing risk), `ff60e183`'s spool rm-553 (dead). One owner at integrate; implementing under a pending sibling claim maximizes duplicate-work probability on the single most-contested class in the fleet today.
2. **The surface family is occupied by unlanded sibling implementations**: the static mounts (`src/server.ts:1081` shell, `:1132-1156` /static, `:1169-1170` /assets+icon, `:1181` manifest) carry `7a4d9070`'s rm-555 /assets caching (code in worktree) and `2c3b4c64`'s rm-609 shell-caching (landed-uncommitted) — a compression negotiation middleware would textually collide in the same file regions and the same test file before either lands.
3. **Decision-first**: the item's own acceptance demands the two-arm decision (infra Caddyfile vs in-repo precompressed siblings); that decision is best recorded when the cache-posture lanes have landed and the claim count has resolved.

**Next-cycle trigger**: rm-600 becomes the default anchor of the next batch once (a) the rm-555/rm-609 surface family lands, or (b) the d1850b2e lane's prioritize disclaims its compression twin. The decision pointer stands: Arm 2 (in-repo precompressed siblings + negotiation middleware with `Vary: Accept-Encoding`) is the default executable; Arm 1 is a runbook line, never a code claim. Measured ceiling re-quoted from this run's research: cold-load js+css 333,584 B → ~80.3 KB brotli (4.15×).

## Reconcile-at-integrate pointers

- rm-601 ~ `63b5848a` rm-569 (mint-only, prioritize pending) — reconcile by content, id-first-landed.
- rm-602 ~ `38ee3e1c` rm-595 (passed over by its own prioritize) + `41067ca6` rm-589 (dead lane) — this batch is the sole implementation claim.
- rm-603 ~ `d1850b2e` rm-599 (mint-only, pending).
- rm-604, rm-605: no sibling claims (census this attempt).
- rm-600 (deferred): 3-way set above; plus the standing `rm-553` spool pointer.
- Id-space note: this worktree's mints rm-600..rm-605 overlap `d1850b2e`'s rm-599..606 **in id-space only**; extension #11's re-delivery addendum is the coordination record of that fact.

*Required evidence for this phase = the selected batch + rationale above (this document). Implement phase consumes B1–B5 as specified, including the two pre-made decisions.*
