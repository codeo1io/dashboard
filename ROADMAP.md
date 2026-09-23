# dashboard — Roadmap

> Autonomously maintained by the roadmap sync (reliability-first). Items cite reproducible codebase signals; acceptance is proven by cited evidence.
> Hand-extended 2026-09-20 by conductor roadmap phase (run 54fa71a3); statuses advanced same day by the compound phase after cycle-2 implement + targeted tests. Originally extended with cycle-1 assess findings + research candidates (sources: docs/ideation/2026-09-19-repository-extensions-ideation.md, docs/prioritization/2026-09-19-cycle-1-batch.md). Fleet render may re-flow; per-item `id:` is stable.

**Vision**: A reliable, customer-friendly repository advanced by evidence-cited roadmap cycles owned by the autonomy loop

**Pillars**: reliability work outranks customer-experience work; every roadmap item cites reproducible codebase signals; acceptance is proven by cited evidence, never claimed

## Fleet context

- upstreams (this repo builds on): hermes-agent
- dependents (changes here affect): (host)
- graph: evidence-derived (imports/refs/deploy surfaces); advisory

## Open items

### Restore Main gate: fro-bot.yaml secrets-in-if + lint-clean ROADMAP
- id: `rm-112` | track: reliability | priority: 100.0 | status: implemented (cycle-2 batch, run 54fa71a3) - landing + gate proof pending
- signals: Main red at tip 2f3a884 and 5b8a2b3 (PR #4 head b2ef125); actionlint `fro-bot.yaml:266:47` "context 'secrets' is not allowed here"; `eslint ROADMAP.md` line 20:32 `markdown/no-missing-label-refs` (prior fleet render emitted a bare array literal in prose)
- acceptance: (a) fro-bot.yaml stages `HAS_FRO_BOT_PAT` in workflow-level `env:` (the legal `secrets` read) and gates the agent step at STEP level (`if: env.* == 'true'` plus trigger check) with a warn step on schedule-without-PAT - as-built, because job-level `if:` admits only `github/inputs/needs/vars` (release.yaml's job-env pattern adapted to step level; fro-bot.yaml env block, warn step, agent gate); (b) this ROADMAP contains no lint-triggering constructs
- evidence: `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color` exit 0 across all workflows; `pnpm lint` exit 0; Main workflow `success` at the exact pushed sha - PENDING until the ci phase observes it (#3263)

### CodeQL green at pushed sha (re-land the lost run-333ad19e fix)
- id: `rm-113` | track: reliability | priority: 100.0 | status: implemented (cycle-2 batch, run 54fa71a3) - landing + gate proof pending
- signals: CodeQL run 18805981102 fails `[autobuild] npm run build --if-present` → `Cannot find module 'typescript'`; codeql.yaml on main has no deps-install step — the implemented fix exists only in an abandoned worktree (unlanded)
- acceptance: codeql.yaml installs deps before `codeql-action/init` (`corepack enable` + `pnpm install --frozen-lockfile` — the corepack shim resolves pnpm from package.json `packageManager`, so there is no hardcoded pin), `runs-on` stays self-hosted per PR #1 policy
- evidence: CodeQL workflow `success` at the exact pushed sha - PENDING until the ci phase observes it (#3263); autobuild completes with typescript present; no change to runner placement policy

### Absorb upstream base image (digest 0e0ff40) and retire the in-image libpcre2 patch
- id: `rm-111` | track: reliability | priority: 95.0 | status: implemented (cycle-2 batch, run 54fa71a3) - landing + gate proof pending; digest re-verified == live registry at implement time (was a9d7043 → 0e0ff40)
- signals: Dockerfile:1,21,35 pin `sha256:2fe369e…` (stale; `0e0ff40` is the live `node:24-slim` registry digest as of 2026-09-20) while Dockerfile:44-50 carries an `apt-get install --only-upgrade libpcre2-8-0` patch; upstream #492/#491 landed the digest moves
- acceptance: all three FROM pins (builder / prod-deps / runtime) → `0e0ff40`; libpcre2 patch block deleted; fork's pnpm pin stays 11.27.0 (upstream's 11.8.0 must NOT be absorbed); `wiki-writer/**` and `renovate.yaml` remain excluded per fork invariants
- evidence: Release Trivy scan reports zero HIGH at the pushed sha - PENDING until the ci phase observes it (#3263); `docker run` dpkg query shows base ships `libpcre2-8-0 10.42-1+deb12u1`; hono 4.13.8 rides the same absorb (pnpm-lock only)

### Aggregator checkSuites pagination beyond 10 suites
- id: `rm-110` | track: reliability | priority: 90.0 | status: implemented (cycle-2 batch, run 54fa71a3) - landing + gate proof pending (rode the batch as first rider)
- signals: `src/github/aggregator.ts` queried `checkSuites(first: 10)` at BOTH GraphQL variants (:137 primary, :174 no-alerts fallback - twin site found at implement — heads with >10 suites undercount `failingChecks`; no fixture exercised the boundary
- acceptance: pagination (or `first: 100` + explicit note) and a fixture whose head commit carries >10 check suites asserting full enumeration
- evidence: new test passes and total suite count reaches 3018 (3017 today); aggregator test file shows the boundary case

### Surface partial-enumeration degradation (snapshot truthfulness)
- id: `rm-115` | track: reliability | priority: 85.0 | status: candidate (needs product pass on DTO semantics)
- signals: `src/github/installations.ts:222` skips an installation whose mint/list fails inside an otherwise-successful enumeration; aggregator raises `staleBanner` only on TOTAL failure (aggregator.ts ~652-745); no aggregator-level test covers the partial-skip path
- acceptance: enumeration result carries a skip count; MonitoringDto gains a degraded-but-fresh field distinct from `staleBanner`; UI renders a softer banner; one aggregator-level test proves the partial-skip path
- evidence: new DTO field present in `src/routes/api.ts`; web test renders the degraded state; docs note the semantics distinction

### Merge-gate discipline: required status checks on origin/main
- id: `rm-116` | track: reliability | priority: 85.0 | status: candidate (settings change, no code)
- signals: PR #4 merged 17:51:16Z one minute after its own CI went red (17:50:32Z, Check Workflows); fleet-sync 2f3a884 pushed lint-red directly to main — both cycle-1 P1s arrived through merges over red gates
- acceptance: Lint, Check Workflows, Test required on `codeo1io/dashboard` main; require branches up to date
- evidence: `gh api repos/codeo1io/dashboard/branches/main/protection` shows the required checks; a deliberate red-gate merge attempt is blocked (dry-run/advisory note suffices)

### Automated upstream-absorb cadence with a drift gate
- id: `rm-103` | track: reliability | priority: 80.0 | status: candidate (gated on Main green)
- signals: drift grew 2 → 4 commits in one day; absorbable surface measured 2026-09-20 at exactly 2 files (Dockerfile digest + hono lockfile) with two merge traps (pnpm downgrade, excluded trees); run-333ad19e's implement batch was lost in an abandoned worktree — the manual ritual drops work
- acceptance: scheduled compare vs `autonomy-upstream/main`; prepare-only merge PR (never auto-push; human approves; exclusions enforced); drift >N commits fails a check
- evidence: workflow file + first drift report; exclusion assertions (no `wiki-writer/`, no `renovate.yaml`, pnpm pin unchanged) run on the prepared PR

### SBOM attestation + provenance mode=max in Release
- id: `rm-105` | track: reliability | priority: 75.0 | status: candidate
- signals: Release already pushes attestation-bearing OCI indexes (provenance auto-attaches via build-push-action v4+, per Docker docs 2026-09-20) — the known attestation-index parse trap is documented (solution doc 2026-09-17); no SBOM attestation exists (`grep -in sbom release.yaml` empty)
- acceptance: syft SBOM + `provenance: mode=max` attached to GHCR pushes; readbacks parse the Digest line (never the imagetools template, per 2026-09-17 fix)
- evidence: `docker buildx imagetools inspect` shows `attestation-manifest` entries incl. SBOM; Release green at pushed sha

### Operator status panel (monitoring-of-monitoring)
- id: `rm-107` | track: experience | priority: 70.0 | status: candidate (needs plan phase)
- signals: freshness (`refreshedAt`/`staleBanner`), rate-limit budget, listener store depth, and last fail-closed events exist independently but are not composed; cycle-1 required out-of-band `gh` commands to learn CI was red — twice inside 30 days
- acceptance: one panel composes snapshot freshness, degradation (rm-115), listener depth/age, rate-limit budget; distinct from `/healthz` semantics
- evidence: panel rendered in web client with tests; api.ts exposes the composite DTO

### Listener digest push (extend VAPID push to listener messages)
- id: `rm-106` | track: experience | priority: 65.0 | status: candidate (needs plan phase; preceded by push privacy policy — upstream #238)
- signals: push infra in-tree (`web/src/push/`); listener contract active with two producers; retention 500 rows/30 days silently ages out unwatched messages
- acceptance: rate-capped notify or daily digest on listener ingest; policy doc published before/parallel
- evidence: end-to-end push test with fake VAPID keys; policy doc present

### Major-upgrade watchlist with explicit policy
- id: `rm-117` | track: reliability | priority: 60.0 | status: candidate
- signals: vitest 4.1.11 → 5.0.1 available; typescript 6.0.3 → 7.0.2 (native compiler); jsdom 29 → 30.1.0; eslint 10.10.0 → 10.11.0 (minor) — npm registry 2026-09-20; no drift policy exists
- acceptance: standing ROADMAP section listing majors available vs adopted + policy (absorb via upstream when possible; explicit upgrade PR otherwise; never ride a major silently); reviewed at roadmap-sync cadence
- evidence: watchlist section present with dated registry checks; next sync updates it

## Superseded items

### Add test coverage for 21 untested module(s) — superseded by policy
- id: `rm-002` | track: reliability | priority: 100.0 | status: superseded (2026-09-20: all 21 signals resolve under `.agents/skills/impeccable/`, a vendored lint-exempt tree — reinstallable vendor code, not a maintenance target)
- signals: original signals targeted vendored skill scripts only
- acceptance: superseded — the productive equivalent (rm-110/rm-115) targets first-party `src/` gaps instead
- evidence: eslint.config.ts:11-14 designates the tree vendored; `src/` suite is 3017/3017 green

### Refactor 21 high-complexity function(s) — superseded by policy
- id: `rm-001` | track: reliability | priority: 90.0 | status: superseded (2026-09-20: same vendored-path defect as rm-002)
- signals: original signals all resolved under the vendored tree
- acceptance: superseded — revisit only if first-party complexity hotspots appear in future fleet signals
- evidence: none of the flagged functions live under `src/` or `web/src/`

## Completed history

- 2026-09-16 — 886c28e: Release App-token publication gated on job-env `HAS_RELEASE_APP` (fork has no repo secrets; scanned images still publish to GHCR).
- 2026-09-17 — 18a1ee6: digest readback parses the Digest line (imagetools template silently ignored on attestation-bearing indexes); 3c5adad: release timeout 60 min / Main 20 min.
- 2026-09-19 — 3075f4a (merged fc7b834): rm-100a Main actionlint → `rhysd/actionlint:1.7.12` container form; rm-100b codeql-action digests → `1c5b675` (4 refs); rm-102 `.github/dependabot.yml` (npm+docker+actions, grouped, weekly — first PRs expected ~2026-10-03); rm-109 fro-bot `disabled_manually` ops note in AGENTS.md. Gates at that sha: Main green, lint green, 3017/3017.

<!-- managed by hermes-roadmap render; do not edit by hand -->
