# Repository-extensions research — 2026-09-21 (cycle-4 refresh, reconstructed)

> **Reconstruction note (2026-09-21, run 5351fd4e prioritize phase).** The
> original write of this artifact did not persist into the run worktree
> (verified absent by `ls docs/ideation/ | grep 2026-09-21` on 2026-09-21).
> This is a faithful reconstruction from the phase's recorded evidence, with
> two measurement corrections re-verified live during reconstruction:
>
> 1. `fro-bot/agent` latest release is **v0.113.2** (2026-09-16, prerelease=false),
>    confirmed by BOTH `releases/latest` and the release-list probe — an earlier
>    draft line recorded a nonexistent "v0.79.0 (2026-09-20)"; rm-120's drift
>    figure was correct all along.
> 2. Fork `tailwindcss` is **4.3.3 = current** (package.json:48) — an earlier
>    draft said "fork 4.2.4, one minor behind".
>
> Lineage disclosure (#4323): engine labels this run cycle:1; by repository
> artifact lineage this is the 4th repository-extensions refresh
> (2026-09-19 ideation → 2026-09-20 research ×2 → this).

## Frame

- Fork origin/main tip: `9f978d1` (2026-09-20); tree-identical to the assess
  frame; gates green (check-types, lint, 3070/3070; Main/CodeQL/Scorecard at
  `9f978d1`; Release green at `f334fb2` run 35523081051).
- Upstream drift: **11 commits** (`git log --oneline origin/main..autonomy-upstream/main`),
  up from 8 on 2026-09-20. The three new commits are docs-only:
  - `2941af0` (**#497**) adds
    `docs/solutions/integration-issues/public-route-swallowed-by-caddy-extensionless-rewrite-2026-09-20.md`
    (+128 lines, absent fork-side) plus 6-line touch-ups to two solutions docs
    the fork carries.
  - `d2510df` (**#498**) corrects a wiki-writer existence claim — TRUE upstream,
    FALSE for this fork (no `wiki-writer/` exists here; binding docs carry zero
    references post-sweep). **Never absorb verbatim** (invariant #3206).
  - `d207fc7` (**#499**) corrects the upstream privacy PLAN doc — the fork never
    carried that plan doc (no `docs/plans/2026-09-19*`); the kill-switch SW has
    no NavigationRoute denylist (grep zero). **Moot.**
- Fleet/ecosystem (re-verified 2026-09-21): `fro-bot/agent` at **v0.113.2**
  (correction above); clonedep reference pin documents v0.78.0 (AGENTS.md).
- npm: hono 4.13.8 = fork; vite 8.3.0 = fork; react 19.3.0 = fork;
  tailwindcss 4.3.3 = fork (correction above); vite-plugin-pwa 1.3.0 = fork;
  @octokit/auth-app 8.3.1 = fork; eslint 10.11.0 vs fork 10.10.0 (one minor);
  majors available and unadopted: typescript 7.0.2, vitest 5.0.1, jsdom 30.1.0.
- Base image: node:24-slim live tag digest `sha256:5cbc7cab…` vs Dockerfile
  pin `0e0ff40` (one digest behind; dependabot docker PRs expected ~2026-10-03).
- Automation: dependabot.yml live since 3075f4a; **zero dependabot PRs** to date;
  Renovate never runs (rm-112 ledger).

## Candidates (evidence-backed, with dispositions)

### R1. Absorb upstream #497 (Caddy extensionless-rewrite trap) — **ACCEPTED → rm-131**
Docs-only. The fork serves `/privacy` + `public/` statics behind the same
Caddy-class proxy topology the new solutions doc describes. Port the doc
verbatim; apply the two touch-ups where the fork's copies carry pre-#497 text;
record the #498-EXCLUDE and #499-MOOT decisions in an absorb ledger.

### R2. Listener digest push — **GATED: cross-repo blocker (rm-106)**
Dependency discovery during prioritization: the vendored gateway contract
(`src/gateway/operator-contract/push.ts`) models only GET
`/operator/push/vapid-key` and GET `/operator/push/subscriptions` metadata;
no send/notify/dispatch endpoint exists, and the dashboard never mounts
`/operator/push/*` routes (`src/server.ts:198-205,342-347`). The send path
lives in the gateway (fro-bot/agent) — a contract extension there is the
prerequisite. rm-106 flipped to blocked-external in ROADMAP.md.

### R3. Aggregator sequential per-repo refresh — **ACCEPTED (serialization half) → rm-132**
`src/github/aggregator.ts` resolves installation repos sequentially in one
cycle; cache TTL == refresh interval (the other half) is already tracked by
rm-112's absorbed acceptance. Bounded-concurrency pool with per-repo failure
isolation.

### R4. `minimumReleaseAge` gate is inert — **ACCEPTED → rm-133**
`pnpm-workspace.yaml:8` declares `minimumReleaseAgeExclude` (@bfra.me pins) but
`minimumReleaseAge` is set nowhere (`pnpm config get minimumReleaseAge` →
undefined; repo grep finds exactly the exclude line; no env/npmrc override).
Inherited verbatim from upstream. Make the gate real (documented value) or drop
the exclude block with a recorded decision.

### R5. CSRF posture on listener acks — **DEDUPLICATED into rm-115**
Ack POSTs (`src/routes/listener.ts` + `web/src/api/listener.ts:106-121`) send
no CSRF header while logout uses `x-csrf-token`. Already tracked as rm-115;
no new item.

### R6. Binding-docs truthfulness — **ACCEPTED → rm-134**
README badges point at fro-bot/dashboard (upstream) Actions/Scorecard; the
Endpoints section omits `/privacy`, `/api/listener/*`, push proxy surfaces;
`.github/dependabot.yml` comment still names the fro-bot shared config stale
since 9f978d1 retargeted to codeo1io/renovate-config;
`web/vite.config.ts:40` still references `createHandlerBoundToURL in sw.ts`
(code that no longer exists in the kill-switch SW — rm-128 residue).

### R7. clonedep reference refresh — **ABSORBED by rm-120**
Latest release is v0.113.2 (correction above), i.e. 75 releases of drift —
exactly what rm-120 (gateway-contract drift watch) already tracks; no new item.

## Rejected during research (unchanged)

- **Absorb #498** — violates the wiki-writer exclusion invariant (#3206).
- **Absorb #499** — moot; the plan doc was never carried.
- **Majors adoption** (TS 7 / vitest 5 / jsdom 30) — watchlist standing (rm-108).
- **Renovate revival** — PR #1 deleted renovate.yaml deliberately (CI placement
  policy); dependabot is the fork's automation.

## Verification

`pnpm lint` green on this artifact (markdown rules: no bare array literals,
fenced-code-language, no-multiple-h1).
