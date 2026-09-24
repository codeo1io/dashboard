---
date: 2026-09-24
topic: repository-extensions
focus: evidence-backed candidates extending the dashboard fork roadmap (conductor run 3538ec96, research phase)
mode: repo-grounded
---

# Ideation: Repository extensions (cycle:4 research pass)

## Codebase Context

Measured this session (2026-09-24) at origin/main `82312f7` and upstream `fro-bot/dashboard@66a542d`, on top of the same run's fresh adversarial assessment at base `7809df6` (findings F1-F6, F8).

**Upstream drift is 3 dependency commits** (`git log 0c7489d..66a542d`): fro-bot/agent v0.114.0→v0.115.0 (#521), bfra-me/.github v4.32.0 (#519), pnpm v11.27.0→v11.27.1 (#520). Upstream has **zero open PRs**; no security-relevant surface to absorb (the #481/#495/#496 era is fully absorbed). The fork's fro-bot/agent pin sits at `fro-bot.yaml:333` (v0.114.0) on a workflow that is `disabled_manually` fork-side.

**Toolchain majors moved** (npm view / GitHub release API, 2026-09-24): TypeScript **7.0.2** GA (2026-08-20, native port) vs fork 6.0.3; vitest **5.0.1** (2026-09-15) vs fork 4.1.11; Node **v26 goes LTS 2026-10-28** and v24 is supported to 2028-04-30 (nodejs/Release schedule.json); hono 4.13.9 latest vs lockfile-era ^4.7.11 (caret-compatible). Current-elsewhere: react 19.3.0, vite 8.3.0, tailwindcss 4.3.3, vite-plugin-pwa 1.3.0 all match latest. `node:sqlite` imports with **no ExperimentalWarning** on v24.19.0. Base image pinned digest `0e0ff40…` **equals the live** `node:24-slim` digest (zero drift; base-drift workflow green).

**Fork PR surface** (gh): 10 open — real batches `#45` (cycle-9: bounded transport, polling hygiene, badge — i.e. assess F2/F5 fixes in flight) and `#43`, plus **8 stale conductor DRAFTs** (#24-#36, 2026-09-23/24).

**Live at both base and main** from the assess pass: F1 rate limiter keyed on direct-connection address (`src/server.ts:79-81,520-530`) → single global 60/min bucket behind the sibling Caddy proxy; F3 dead `/api/monitoring` endpoint + DTOs with no client consumer (`src/routes/api.ts:95`, `src/server.ts:176` comments claim a "SPA monitoring view" that doesn't exist); F4 aggregator cache never evicts departed repos (`src/github/aggregator.ts:609,717-718`); F6 "self-hosted runner" prose stale in `vitest.config.ts:10`, `web/vitest.config.ts:13`, `test/dockerfile-context.test.ts:12` — a recurrence class already hit 3× by filtered sweeps (#3255); F8 this run's assess worktree was pinned 18 commits behind main.

**Prior ideation docs** (`docs/ideation/2026-09-19/20-…`) carry three cycles of recurring candidates: listener digest push (rm-106, now **blocked-external** per ROADMAP), operator self-observability (proposed 3×, never landed), supply-chain SBOM/provenance, upstream-absorb cadence + drift gate (base-drift half landed), major-upgrade watchlist, SSE buffer caps, rate-limiter fairness, dead workbox deps.

## Topic Axes

- upstream-absorb posture
- transport & data-plane resilience
- operator experience
- toolchain & platform currency
- process & repo automation

## Ranked Ideas

### 1. Operator self-observability panel — decide-or-ship the dead monitoring endpoint

**Description:** The fork has debated "surface the monitoring's own health" three cycles running while `/api/monitoring` sits dead with stale comments claiming an SPA consumer. Resolve the contradiction in one move: either (a) ship the operator panel — own-repo CI state (Main/Release latest runs), base-digest drift result, upstream absorb distance, rate-limit budget headroom — reading only this repo via the existing read-only App token; or (b) delete the endpoint, DTOs, and stale comments. The decision is the deliverable; (a) is the default given three cycles of recurrence.

**Axis:** operator experience

**Basis:** direct: `src/routes/api.ts:95` defines the route; `src/server.ts:176` comment "Both the SPA monitoring view and /api/status read from this" — `git grep 'api/monitoring' 82312f7 -- web/` returns only a negative assertion in `sw.test.ts:104`. external: prior ideation `docs/ideation/2026-09-19-repository-extensions-ideation.md` idea 6, `2026-09-20-repository-extensions-research.md` candidate 3 — proposed, never landed.

**Rationale:** A monitoring product that cannot see its own health (stale aggregator, red CI, base drift) forces the operator back to GitHub's UI — the exact friction this dashboard exists to remove. The endpoint already exists; the marginal cost is the client view.

**Downsides:** Scope creep risk (observability scope must stay to own-repo, read-only); (b)-deletion is defensible if the operator never asks for it.

**Confidence:** 85%

**Complexity:** Medium

### 2. Rate-limiter trusted-proxy re-key with path-class budgets

**Description:** Key the limiter on `X-Forwarded-For` only when the peer is the documented sibling Caddy proxy (configurable trusted-proxy list), and split budgets: a generous bucket for authenticated operator API, a tight separate bucket for pre-auth public paths (`/api/healthz`, `/auth/*`, `/`), exempting listener ingest (it authenticates by HMAC). This turns the current single global 60/min bucket into per-client fairness that survives the real deployment topology.

**Axis:** transport & data-plane resilience

**Basis:** direct: `src/server.ts:520` "Keyed on the direct connection remote address, not X-Forwarded-For (client-spoofable)" + `:530` `ip = getConnInfo(c).remote.address ?? 'unknown'` — behind Caddy every client shares that address, so the spoof-resistance argument collapses the whole deployment into one bucket; unchanged at `82312f7`. external: standard reverse-proxy limiter design (trust-boundary keying).

**Rationale:** Assess F1 is a pre-auth availability lever: an anonymous flooder on the public paths 429s the operator and the listener's ingest today. The spoofing concern is solved by trusting the proxy's address, not by refusing all forwarded identity.

**Downsides:** Wrong trust config would reintroduce spoofable keying; needs a config knob + tests for both topologies.

**Confidence:** 80%

**Complexity:** Small-Medium

### 3. Self-maintaining-fork program (absorb-bot + stale-PR hygiene + the current absorb)

**Description:** Bundle three automations under one roadmap front: (i) absorb the current 3-commit upstream dep-bump batch (fro-bot/agent v0.115.0, bfra-me/.github v4.32.0, pnpm v11.27.1) plus lockfile riders (hono 4.13.9 sweep under existing caret); (ii) a scheduled read-only workflow — same shape as the landed base-drift.yaml — that opens a tracking issue whenever `autonomy-upstream/main` advances past the merge-base, with a conflict-risk summary; (iii) auto-close conductor `ci-*` DRAFT PRs older than N days with a pointer comment (8 are open now).

**Axis:** upstream-absorb posture + process & repo automation

**Basis:** direct: upstream `66a542d` = 3 dep commits since merge-base `0c7489d` (measured this session); `gh pr list` shows drafts #24-#36 lingering; base-drift.yaml at main proves the read-only scheduled-workflow pattern works fork-side. external: prior cycle's "Automated upstream-absorb cadence with a drift gate" — the drift half landed, the absorb half didn't.

**Rationale:** The fork's recurring work is small mechanical absorbs and PR-hygiene; both are cheaper as workflows than as human/conductor cycles. Current drift is exactly the trivial kind that proves the automation's value.

**Downsides:** Bot-opened issues add notification noise if the cadence outruns appetite; the absorb workflow must respect fork invariants (no wiki-writer, read-only wording) — it should open issues, not auto-PR.

**Confidence:** 75%

**Complexity:** Medium

### 4. Filter-free residue guard test

**Description:** Add a CI guard test asserting the absence of known-stale prose repo-wide — terms like `self-hosted runner`, `wiki-writer`, `pipx` — using the #3255 sweep form: NO extension filters, NO path filters, excluding only known-historical doc trees (`docs/solutions`, `docs/prioritization`, `docs/ideation`). Companion: fix the three live sites first (`vitest.config.ts:10`, `web/vitest.config.ts:13`, `test/dockerfile-context.test.ts:12`).

**Axis:** process & repo automation

**Basis:** direct: the three sites are live at origin/main today (assess F6, verified at `82312f7`); memory #3255 records that filtered sweeps missed sites three separate times (Dockerfile `COPY wiki-writer` line; vitest-config/test-comment trio).

**Rationale:** This failure class has recurred every time a term goes stale; the lesson exists but only as human memory. A guard converts it to an invariant the repo enforces at every PR.

**Downsides:** Term list needs curation (false positives on legitimate historical mentions — hence the doc-tree exclusions); test must live outside the excluded trees.

**Confidence:** 85%

**Complexity:** Small

### 5. Version support policy + dated upgrade watchlist (TS7 / vitest 5 / Node 26)

**Description:** Write a short SUPPORT-style policy doc stating the fork's platform matrix and dated decision points, seeded from this session's measurements: TypeScript 7.0.2 (native port) — spike `tsgo` for the `check-types` gate, which aligns with the repo's erasableSyntaxOnly/strip-only posture; vitest 5.0.1 (2026-09-15) — schedule the 4→5 upgrade after the current batch PRs land; Node v26 LTS 2026-10-28 — dated plan to move `node:24-slim` pins and `engines` after the LTS flip (v24 supported to 2028-04-30, so no urgency). Re-baseline quarterly or on major release.

**Axis:** toolchain & platform currency

**Basis:** external: microsoft/TypeScript v7.0.2 (2026-08-20), vitest-dev/vitest v5.0.1 (2026-09-15) via GitHub release API; nodejs/Release schedule.json v26 LTS 2026-10-28 / v24 end 2028-04-30. direct: fork versions at `82312f7` (ts 6.0.3, vitest 4.1.11, Dockerfile pins node:24-slim digest, currently zero-drift).

**Rationale:** The prior watchlist idea proved out: every entry it predicted (vitest major, TS major) has now shipped. A dated, sourced policy turns reactive upgrade churn into scheduled decisions and keeps CI-current.

**Downsides:** Policy docs rot like any doc; must reference the guard (#4) or carry its own freshness term.

**Confidence:** 70%

**Complexity:** Small-Medium

### 6. Bounded parallel refresh + conditional GraphQL

**Description:** With PR #45's bounded transports landing, take the remaining F2 residue: run per-repo refresh with bounded concurrency (3-5 in flight) instead of serially, and use GraphQL/REST ETag or conditional headers where GitHub supports them so unchanged repos cost ~zero quota. Pair with a per-cycle rate-budget counter surfaced in logs (feeds idea 1's panel later).

**Axis:** transport & data-plane resilience

**Basis:** direct: assess F2 — `src/github/aggregator.ts:761-763` skip-guard + serial loop; zero `signal|timeout` hits in `src/github/` pre-#45. reasoned: at 60+ repos, wall-clock and quota scale linearly today; GitHub's secondary rate limits reward spread-out parallel access.

**Rationale:** Same cycle time with lower quota burn per refresh compiles: it delays the day a growing repo set hits budget, and it is the substrate the self-observability panel's "rate-limit headroom" tile needs.

**Downsides:** Parallelism changes failure interleaving (partial-fresh states need the existing staleness flags); conditional-request savings vary by endpoint.

**Confidence:** 65%

**Complexity:** Medium

### 7. Aggregator cache eviction on working-set diff

**Description:** When the installation/repository working set changes, prune per-repo cache entries that fell out of the set (delete on diff), keeping the long-lived Map bounded by the live set instead of the historical union.

**Axis:** transport & data-plane resilience

**Basis:** direct: assess F4 — cache Map at `src/github/aggregator.ts:609` with read-side TTL only (`:717-718`), no `delete`/prune path at base or `82312f7`.

**Rationale:** The server is a long-uptime single process; renamed/deleted/transferred repos currently accumulate forever. Small fix, removes a slow resource leak class the assessment could not bound.

**Downsides:** None material — worst case a re-added repo pays one cold refresh.

**Confidence:** 75%

**Complexity:** Small

### 8. Pin conductor assess/research worktrees at origin/main tip

**Description:** Campaign-level change (conductor config or dispatch habit): phase worktrees for repository-level assess/research should base at the freshly-fetched `origin/main` tip, not the canonical checkout's stale HEAD snapshot. This run's assess frame was 18 commits behind and burned currency-checking effort on three findings that were already fixed at tip.

**Axis:** process & repo automation

**Basis:** direct: assess F8 — base `7809df6` vs tip `82312f7`, +18; three candidate findings (aggregator null-repo staleness, pnpm-workspace release trigger, AGENTS pipx note) were dead on arrival at tip and survived only as provenance notes. reasoned: repository-scope phases gain nothing from a pinned snapshot — their subject is the tip.

**Rationale:** Every future cycle pays the stale-frame tax unless the base tracks the tip; one convention change removes a recurring verification cost and a class of already-fixed findings.

**Downsides:** Tip-based frames can race a landing PR mid-phase (acceptable — currency rules already handle it); commit-phase worktrees still need deliberate bases.

**Confidence:** 80%

**Complexity:** Small

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Unify client freshness on existing SSE | Overlaps in-flight PR #45 polling hygiene; speculative benefit beyond it |
| 2 | Offline-first data (SW stale-while-revalidate) | Below meeting-test vs idea 1, which serves the same operator-visibility need with direct recurrence |
| 3 | Per-cycle research cadence as a "feature" | Already convention (prioritization batches per #3903) — covered by existing workflows |
| 4 | Fleet-health analogy framing of self-observability | Duplicate of idea 1 (same move, weaker basis) |
| 5 | Newsroom corrections ledger | Overkill for a prose-hygiene class the guard test (#4) already covers |
| 6 | Delete /api/monitoring as a standalone idea | Folded into idea 1 as the decision's other branch |
| 7 | Absorb the 3 upstream commits as a standalone idea | Folded into idea 3's program |
| 8 | vitest 5 upgrade as a standalone idea | Folded into idea 5's dated watchlist |
| 9 | pnpm/hono rider bumps as a standalone idea | Folded into idea 3's first absorb |
| 10 | Rate-limiter "re-key only" variant | Folded into idea 2 (path-class budgets are the substance) |
| 11 | Stale-draft PR cleanup as a standalone idea | Folded into idea 3 |
