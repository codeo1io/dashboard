---
date: 2026-09-19
topic: repository-extensions
focus: research_repository_extensions — upstream changes, ecosystem, competing approaches, user needs, standards; reliability-first per ROADMAP pillars
mode: repo-grounded
---

# Ideation: Repository extensions (run cf5527c1, research phase)

Generated via `ce-ideate` in-process path (delegate session has no subagent
tool; all four ideation frames run in-thread — per project convention, no idea
is claimed as independently corroborated). External sourcing added per the
work-order scope, which supersedes ce-ideate v1's no-external-research default.

## Grounding Context

**Codebase** (carried from this run's assess phase, artifacts
`.conductor/progress/dfca4a206a384d4a98f547e91dbd8056.ndjson` + delegate spool):
HEAD 0bc9a32, gates green locally except `pnpm lint` (ROADMAP.md:14:32);
Main+CodeQL red on the self-hosted runner; security invariants verified intact;
tests 3017/3017.

**Upstream** (`fro-bot/dashboard`, remote `autonomy-upstream`):
- 2 unmerged commits: `7fab758` hono 4.13.8 (#488), `54a5669` codeql-action digest 1c5b675 (#489).
- Last 10 upstream commits are ALL automated dependency PRs (#478–#489) — Renovate operates upstream (issue #8 is its Dependency Dashboard).
- Open upstream PR #481 "fix(security): route unhandled request errors through the redacting logger" — security-relevant, fork should fast-follow when merged.
- Open issues #238 (public push privacy policy), #112 (infra-only deploy App).

**Ecosystem** (npm registry, Docker Hub, GitHub API — 2026-09-19):
- vitest 4.1.11 → latest 4.x is 4.1.11 (current in-major); **vitest 5.0.1 exists**.
- typescript 6.0.3 → latest 6.x is 6.0.3 (current in-major); **typescript 7.0.2 exists** (native compiler line).
- eslint 10.10.0 → 10.11.0 (1 minor behind); jsdom 29.1.1 → 30.1.0 (major behind).
- hono/@octokit/*/react/vite/tailwindcss/vite-plugin-pwa/yaml: all current; upstream already carries hono 4.13.8.
- `node:24-slim` pinned digest `sha256:2fe369e…63d553` **verified current** against the live registry (exact match).
- raven-actions/actionlint latest = v2.2.0 == pinned digest (no upstream pipx fix available); CodeQL bundle 2.27.0 is the current release.

**Competing approaches**: `dlvhdr/gh-dash` 12,533★ (terminal GitHub dashboard; benchmark for saved views/filters UX); generic "github dashboard" repos are stale/unmaintained (muan/github-dashboard 934★ web-extension). The fork's niche — single-operator, read-only, GitHub-App-authed, run-centric — has no active direct competitor.

**User needs (in-repo demand signals)**: feature pipeline idle since the 2026-07-31 security-workflow-baseline plan; zero TODO/FIXME in src; listener channel contract active with two machine producers on a shared HMAC key; VAPID push infrastructure landed 2026-07-08; `refreshedAt`/`staleBanner` already surface snapshot freshness.

## Ranked Ideas

### 1. Harden the roadmap-sync generator (vendored-path exclusion, stack-correct evidence, self-lint output)
**Description:** The autonomous roadmap sync emits artifacts that break the repo it reports on: bare `['*', …]` prose trips `markdown/no-missing-label-refs` (ROADMAP.md:14:32, red Main Lint job), acceptance evidence cites pytest/ast CI that cannot exist in a Node/Vitest repo, and both items target only `.agents/skills/impeccable/**` (105 tracked files the repo's own eslint config documents as vendored). Fix the generator: exclude vendored paths from signals, derive acceptance evidence from `package.json` scripts, and run `pnpm lint` on its own output before committing.
**Warrant:** `direct:` — reproduced locally at HEAD (`pnpm lint` exit 1, ROADMAP.md:14:32; matches CI job 44114194992); ROADMAP.md:15,21 cite "pytest collects the new test files" / "ast-based branch-count check passes in CI"; eslint.config.ts:11-14 designates `.agents/skills/impeccable/**` as vendored.
**Rationale:** The roadmap is reliability-first by its own pillars; a roadmap generator that breaks the Lint gate and points effort at vendor-reinstallable code is a recurring reliability defect — every sync re-broken until fixed at the source.
**Downsides:** Generator lives outside this repo (fro-bot automation); fix may need an upstream issue/PR plus an interim in-repo lint override.
**Confidence:** 95%
**Complexity:** Medium
**Status:** Unexplored

### 2. Land fork dependency automation for real this time
**Description:** Add `.github/dependabot.yml` (or enable Renovate self-hosted) covering npm + docker digests + Actions. The prior maintenance cycle's dependabot fix never landed — absent from the fork's entire git history and live main — and Renovate has never run here (1 PR total in repo history, manual). Dockerfile:40-41 already documents "renovate is absent in this fork so pins move only by hand".
**Warrant:** `direct:` — `git log --all --oneline -- .github/dependabot.yml` empty; `gh api repos/codeo1io/dashboard/contents/.github` shows no dependabot.yml; `gh pr list` shows 1 lifetime PR (manual); upstream's last 10 commits are all Renovate PRs proving the pattern works on this codebase.
**Rationale:** Reliability-first: the fork currently absorbs security patches only when a human merges upstream; today's verified-current node:24-slim digest is luck plus discipline, not mechanism.
**Downsides:** Dependabot on a fork with one self-hosted runner adds queue load (serialized jobs, memory #3264); needs `@ci` grouping config to stay polite.
**Confidence:** 90%
**Complexity:** Low
**Status:** Unexplored

### 3. Automated upstream-absorb cadence with a drift gate
**Description:** Scheduled workflow that compares HEAD to `autonomy-upstream/main`, opens a merge PR for dep-only commits when gates are green, and fails/warns past N commits of drift. Include a watch item for upstream security PR #481 (redacting logger) as an explicit fast-follow trigger.
**Warrant:** `direct:` — fork sits 2 commits behind (54a5669, 7fab758); the fork's documented absorption path is manual merges only; upstream #481 is open security work touching error redaction (fork-relevant surface).
**Rationale:** Compounding: turns the manual-merge ritual into a queue the operator approves, and makes drift visible instead of discovered during assess phases.
**Downsides:** Auto-merge of upstream commits must respect fork exclusions (the upstream write-capability block — read-only invariant #1 — and the stricter doc wording) — merge PRs should stay human-approved; keep automation to "prepare + gate" not "push".
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 4. Supply-chain baseline v2: SBOM + build provenance in Release
**Description:** Extend the Release pipeline (which already builds, scans, and pushes to GHCR) with syft SBOM generation and `actions/attest-build-provenance`, publishing attestations to GHCR.
**Warrant:** `direct:` — `grep -in "sbom|attest|provenance|cosign" .github/workflows/release.yaml` finds no such step (only a comment about attestation-bearing indexes at :440); the repo already runs OpenSSF Scorecard (v2.4.4, green), so attestations are the natural next rung of the 2026-07-31 security-workflow-baseline lineage.
**Rationale:** Standard practice now native to GitHub Actions/GHCR; closes the "what exactly is in the published image" question permanently.
**Downsides:** Adds Release minutes on the serialized single runner; attestation verification story needs a docs note.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Unexplored

### 5. Listener digest push (extend existing VAPID push to listener messages)
**Description:** The operator is not always watching the PWA. Push notifications exist for run events (2026-07-08 plan, web/src/push/) and the listener store accumulates machine findings (deploy-health, autoheal, Daily Maintenance Report) with ack-all semantics. Add a digest/notify policy: push when a listener message lands (rate-capped) or daily digest.
**Warrant:** `direct:` — push subscribe/notify infra in-tree (`web/src/push/subscribe.ts`, server notify path); listener contract active (`docs/contracts/operator-listener-channel.md`, 2026-07-11) with two producers; retention 500 rows/30 days means unwatched messages age out silently.
**Rationale:** The channel replaces the machine→machine GitHub issue flow; without push it just moves the "must check a surface" problem.
**Downsides:** Push privacy policy gap (upstream #238 exists for exactly this) — publishing the policy should precede/parallel the feature; single-operator blast radius is small but noise calibration matters.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

### 6. Operator system-status panel (composite observability)
**Description:** One panel aggregating what's currently scattered: aggregator snapshot freshness (`refreshedAt`/`staleBanner` already in the API), GitHub rate-limit budget (app-client sees it), listener store depth/age, and last refresh failures (fail-closed events).
**Warrant:** `direct:` — components exist independently (src/routes/api.ts:42-64 MonitoringDto; app-client auth/rate-limit surface; listener store stats) but nothing composes them for the operator's "is my monitoring itself healthy" question — the exact blind spot the current Main/CodeQL reds demonstrate.
**Rationale:** Reliability-first: monitoring-of-monitoring is the highest-leverage single-operator feature; the assess phase needed out-of-band gh commands to learn CI was red.
**Downsides:** Needs a small server-side status aggregate endpoint; avoid duplicating /healthz semantics.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 7. Major-upgrade watchlist with explicit policy (vitest 5, TypeScript 7, jsdom 30)
**Description:** Add a standing roadmap section: majors available vs majors adopted, with a policy (absorb via upstream when possible; explicit upgrade PR otherwise; never ride a major silently). Today's positions: vitest 4.1.11→5.0.1 available, TS 6.0.3→7.0.2 (native compiler) available, jsdom 29.1.1→30.1.0 available.
**Warrant:** `external:` — `npm view` on 2026-09-19: vitest latest 5.0.1 (latest 4.x = 4.1.11), typescript latest 7.0.2 (latest 6.x = 6.0.3), jsdom latest 30.1.0. Fork is current within every adopted major.
**Rationale:** TS 7 (native) is a compounding typecheck-speed lever and vitest 5 will eventually be forced by plugin matrix; a watchlist converts surprise breakage into scheduled work.
**Downsides:** Watchlists rot if unreviewed — tie to the roadmap sync cadence.
**Confidence:** 70%
**Complexity:** Low
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Saved views/filters on operator home (gh-dash pattern) | Demand signal is for PR-queue dashboards; this product's home is run-centric by explicit redesign (2026-07-03 plan) — better as a brainstorm variant, weak grounding |
| 2 | Snapshot history persistence/trends | No articulated demand signal; introduces the repo's first storage layer (largest complexity in pool) — route through ce-brainstorm first |
| 3 | Multi-operator support | Subject-replacement of the single-operator design assumption; expensive auth/RBAC surface with one known user |
| 4 | Merge upstream + fix Main/CodeQL/pipx | Already provisioned as fix-phase work by this run's assess phase — duplicating it here would double-count, not extend, the roadmap |
| 5 | Document fro-bot workflow disable state; checkSuites(first:10) pagination | Assess-phase findings F7/F8 — small fix items, not roadmap extensions |
| 6 | Per-producer HMAC keys for the listener channel | Contract requires external producer migration (docs/contracts: "producer migrations are dispatched as separate tasks") — not unilaterally actionable this cycle; keep as contract backlog note |
| 7 | Remove vestigial workbox precache config (sw.ts is kill-switch) | Below ambition floor: single-config cleanup with no runtime effect; fold into any future PWA work item |
| 8 | Second runner / runner queue metrics | Runner fleet is host infrastructure outside this repository's scope |
| 9 | Node 26 runtime / @types/node 26 | Node 24 LTS window runs to ~2028; runtime bump has no reliability payoff now |
| 10 | CodeQL build-mode investigation variants | Fix-phase item (assess F3 provisional work), not a research candidate |
| 11 | i18n/a11y audit pass | Single operator; no demand signal; below meeting-test bar |
| 12 | Dual SSE parser unification | Documented as intentional contract-parity design in the plans; drift risk is already covered by conformance tests |

## Sources

- `git log HEAD..autonomy-upstream/main`; `git show 54a5669`
- `gh issue list -R fro-bot/dashboard`; `gh pr list -R fro-bot/dashboard`
- `npm view <pkg> version` ×18 (2026-09-19); `npm view typescript@6 / vitest@4 version`
- Docker Hub registry API: `library/node/manifests/24-slim` → digest `sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553`
- `gh api repos/github/codeql-action/releases/latest` → `codeql-bundle-v2.27.0`; `gh api repos/raven-actions/actionlint/releases/latest` → `v2.2.0`; `gh api repos/dlvhdr/gh-dash` → 12,533★
- In-repo: ROADMAP.md; docs/contracts/operator-listener-channel.md; docs/plans/ (latest 2026-07-31); .github/workflows/release.yaml; eslint.config.ts; package.json; Dockerfile:40-41
- Prior phase artifacts: `.conductor/progress/dfca4a206a384d4a98f547e91dbd8056.ndjson`, delegate spool `dfca4a206a384d4a98f547e91dbd8056.json`
