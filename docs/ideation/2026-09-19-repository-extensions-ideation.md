---
date: 2026-09-19
updated: 2026-09-20
topic: repository-extensions
focus: research_repository_extensions — upstream changes, ecosystem, competing approaches, user needs, standards; reliability-first per ROADMAP pillars
mode: repo-grounded
---

# Ideation: Repository extensions (run cf5527c1, research phase)

Generated via `ce-ideate` in-process path (delegate session has no subagent
tool; all four ideation frames run in-thread — per project convention, no idea
is claimed as independently corroborated). External sourcing added per the
work-order scope, which supersedes ce-ideate v1's no-external-research default.

## 2026-09-20 Update (run 54fa71a3, research phase)

Updated in place per ce-ideate resume rule (same topic, statuses preserved and
advanced). What moved since the 2026-09-19 pass — all verified live today:

- **Upstream drift grew 2 → 4 commits**, but the *absorbable* surface sharpened
  to exactly **2 files**: `Dockerfile` (digest `2fe369e` → `0e0ff40`, which is
  the **live `node:24-slim` registry digest today** and ships the fixed
  libpcre2 per the 2026-09-17 verification) and `pnpm-lock.yaml` (hono
  4.13.7 → 4.13.8). Two traps in the merge: upstream's Dockerfile would
  **downgrade pnpm 11.27.0 → 11.8.0** (fork pin is newer), and the upstream
  tree carries the excluded `wiki-writer/**` + `renovate.yaml` (hosted-runner
  policy violation). Everything else in the 59-file fork↔upstream diff is
  fork-own docs/workflow divergence.
- **Idea 2 (dependency automation) LANDED**: `.github/dependabot.yml` merged at
  3075f4a (2026-09-19); first npm/docker PRs expected from ~2026-10-03.
- **Idea 1 (roadmap generator) RECURRED, 2nd instance**: the 2026-09-20 fleet
  sync (2f3a884) again shipped a lint-breaking ROADMAP.md (20:32,
  `markdown/no-missing-label-refs`) — Main Lint red at tip. Same defect class,
  new line number.
- **New evidence that manual absorb loses work**: run 333ad19e's entire
  implement batch (codeql fix, digest absorb, rm-110 test) exists only in an
  abandoned worktree — never landed on main. Strengthens idea 3.
- **Gate discipline failed in production**: PR #4 merged 1 minute after its own
  CI went red; the ROADMAP fleet-sync pushed lint-red. Motivates new idea 9.
- **Assess-phase 2026-09-20 found a new reliability gap** (partial-installation
  enumeration silently degrades the snapshot) — motivates new idea 8.
- **Ecosystem re-check (2026-09-20)**: vitest latest still 5.0.1 (4.1.11
  in-major current), typescript 7.0.2, jsdom 30.1.0, eslint 10.11.0 (fork one
  minor behind), hono 4.13.8 (absorb via upstream), vite 8.3.0 / react 19.3.0 /
  tailwindcss 4.3.3 / vite-plugin-pwa 1.3.0 — no major-position changes.
- **Competing approaches**: `dlvhdr/gh-dash` 12,535★ (+2, flat); new entrant
  `psyb0t/gitrakz` (created 2026-08-14, 0★) — self-hosted Go+Svelte GitHub
  activity tracker with SQLite sync, derived work-sessions, template/report
  exports. No traction yet, but confirms the self-hosted single-operator GitHub
  dashboard niche is actively growing; its session-derivation and report-export
  patterns are worth watching, not adopting.
- **Standards**: Docker's official attestations docs (2026-09-20 read) confirm
  `docker/build-push-action` v4+ auto-attaches provenance (mode=min for private
  repos) — this repo's pushes ALREADY carry provenance (that's why the
  attestation-bearing index parse trap exists, solution doc 2026-09-17). The
  genuinely missing rungs are an explicit **SBOM attestation** and
  **mode=max**. Sharpens idea 4 to Low-Medium complexity.

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
**Status:** Recurred (2nd instance 2026-09-20: 2f3a884, ROADMAP.md:20:32) — generator still unfixed, defect class confirmed recurring

### 2. Land fork dependency automation for real this time
**Description:** Add `.github/dependabot.yml` (or enable Renovate self-hosted) covering npm + docker digests + Actions. The prior maintenance cycle's dependabot fix never landed — absent from the fork's entire git history and live main — and Renovate has never run here (1 PR total in repo history, manual). Dockerfile:40-41 already documents "renovate is absent in this fork so pins move only by hand".
**Warrant:** `direct:` — `git log --all --oneline -- .github/dependabot.yml` empty; `gh api repos/codeo1io/dashboard/contents/.github` shows no dependabot.yml; `gh pr list` shows 1 lifetime PR (manual); upstream's last 10 commits are all Renovate PRs proving the pattern works on this codebase.
**Rationale:** Reliability-first: the fork currently absorbs security patches only when a human merges upstream; today's verified-current node:24-slim digest is luck plus discipline, not mechanism.
**Downsides:** Dependabot on a fork with one self-hosted runner adds queue load (serialized jobs, memory #3264); needs `@ci` grouping config to stay polite.
**Confidence:** 90%
**Complexity:** Low
**Status:** Landed 2026-09-19 at 3075f4a — verify first PRs arrive ~2026-10-03, then close

### 3. Automated upstream-absorb cadence with a drift gate
**Description:** Scheduled workflow that compares HEAD to `autonomy-upstream/main`, opens a merge PR for dep-only commits when gates are green, and fails/warns past N commits of drift. Include a watch item for upstream security PR #481 (redacting logger) as an explicit fast-follow trigger.
**Warrant:** `direct:` — fork sits 2 commits behind (54a5669, 7fab758); the fork's documented absorption path is manual merges only; upstream #481 is open security work touching error redaction (fork-relevant surface).
**Rationale:** Compounding: turns the manual-merge ritual into a queue the operator approves, and makes drift visible instead of discovered during assess phases.
**Downsides:** Auto-merge of upstream commits must respect fork exclusions (the upstream write-capability block — read-only invariant #1 — and the stricter doc wording) — merge PRs should stay human-approved; keep automation to "prepare + gate" not "push".
**Confidence:** 90%
**Complexity:** Medium
**Status:** Strengthened (2026-09-20): drift 4 commits, absorb surface = 2 files with two merge traps; run-333ad19e worktree loss proves the manual ritual drops work

### 4. Supply-chain baseline v2: SBOM + build provenance in Release
**Description:** Extend the Release pipeline (which already builds, scans, and pushes to GHCR) with syft SBOM generation and `actions/attest-build-provenance`, publishing attestations to GHCR.
**Warrant:** `direct:` — `grep -in "sbom|attest|provenance|cosign" .github/workflows/release.yaml` finds no such step (only a comment about attestation-bearing indexes at :440); the repo already runs OpenSSF Scorecard (v2.4.4, green), so attestations are the natural next rung of the 2026-07-31 security-workflow-baseline lineage.
**Rationale:** Standard practice now native to GitHub Actions/GHCR; closes the "what exactly is in the published image" question permanently.
**Downsides:** Adds Release minutes on the serialized single runner; attestation verification story needs a docs note.
**Confidence:** 90%
**Complexity:** Low-Medium (sharpened 2026-09-20: provenance already auto-attached; only SBOM + mode=max missing)
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
**Confidence:** 80%
**Complexity:** Medium
**Status:** Strengthened (2026-09-20): Main red at tip with two fresh gate regressions — out-of-band discovery problem recurred within 30 days

### 7. Major-upgrade watchlist with explicit policy (vitest 5, TypeScript 7, jsdom 30)
**Description:** Add a standing roadmap section: majors available vs majors adopted, with a policy (absorb via upstream when possible; explicit upgrade PR otherwise; never ride a major silently). Today's positions: vitest 4.1.11→5.0.1 available, TS 6.0.3→7.0.2 (native compiler) available, jsdom 29.1.1→30.1.0 available.
**Warrant:** `external:` — `npm view` on 2026-09-19: vitest latest 5.0.1 (latest 4.x = 4.1.11), typescript latest 7.0.2 (latest 6.x = 6.0.3), jsdom latest 30.1.0. Fork is current within every adopted major.
**Rationale:** TS 7 (native) is a compounding typecheck-speed lever and vitest 5 will eventually be forced by plugin matrix; a watchlist converts surprise breakage into scheduled work.
**Downsides:** Watchlists rot if unreviewed — tie to the roadmap sync cadence.
**Confidence:** 70%
**Complexity:** Low
**Status:** Unexplored

### 8. Surface partial-enumeration degradation (snapshot truthfulness)
**Description:** When one App installation fails to mint/list mid-cycle, `installations.ts:222` skips it inside an otherwise-successful enumeration, and the aggregator raises `staleBanner` only on TOTAL enumeration failure. The operator sees a green, fresh-looking dashboard that silently omits repos. Extend the freshness contract: count skipped installations in the enumeration result, add a DTO field (e.g. `degradedInstallations`), and render a softer banner than stale. One aggregator-level test for the partial-skip path.
**Warrant:** `direct:` — src/github/installations.ts:222 (skip-and-continue, tested only at the installations level), src/github/aggregator.ts:652-745 (staleBanner on total failure only), src/routes/api.ts MonitoringDto (freshness fields refreshedAt/staleBanner exist; no degradation field). Found by assess phase 2026-09-20.
**Rationale:** Reliability-first pillar: silent omission is the worst failure mode for a monitoring tool — the tool that exists to catch failures hides its own. Composes with idea 6's status panel.
**Downsides:** API surface addition needs client + test updates; must not conflate with staleBanner semantics (degraded-but-fresh is a distinct state).
**Confidence:** 85%
**Complexity:** Low-Medium
**Status:** Unexplored (new 2026-09-20)

### 9. Merge-gate discipline for the autonomy loop (branch protection on origin/main)
**Description:** PR #4 was merged 17:51:16Z, one minute after its own CI went red at its head (17:50:32Z, Check Workflows); the 2026-09-20 ROADMAP fleet-sync pushed lint-red straight to main. Both P1s at tip arrived through merges-over-red-gates. Add required status checks (Lint, Check Workflows, Test) + require branches-up-to-date on codeo1io/dashboard main, so autonomy merges queue behind green gates. Fork has no secrets to lose; the only self-hosted-runner cost is serialization delay already accepted.
**Warrant:** `direct:` — run timestamps via gh api (PR#4 merge vs run conclusion), Main red at 2f3a884/5b8a2b3/b2ef125 in this run's assess evidence.
**Rationale:** Cheapest possible reliability lever: zero code, converts every future regression from "landed and red" to "blocked at the gate". Directly addresses the recurring generator defect (idea 1) at the enforcement layer while the generator itself gets fixed upstream.
**Downsides:** Autonomy loops that race their own CI will start failing to merge — that is the point, but the loop owner must adapt (retry-after-green). Required-check outages (runner down) temporarily block all merges — acceptable for a single-runner fork.
**Confidence:** 85%
**Complexity:** Low (gh api settings/branches; no code)
**Status:** Unexplored (new 2026-09-20)

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
| 13 | Absorb upstream #492 digest + retire libpcre2 patch + re-land codeql fix (2026-09-20) | Already provisioned as fix-phase work by this run's assess phase — research must not double-count it |
| 14 | SIGTERM/SIGINT graceful shutdown (server.ts) | Code-hygiene fix item (assess F10), not a roadmap extension — route to fix phase |
| 15 | Per-repo cache fix-or-remove (TTL==interval dead machinery) | Same — small maintainability fix (assess F8), below roadmap ambition floor |
| 16 | Adopt gitrakz-style work-session derivation / report templates | 0-star new entrant, no demand signal from the single operator; watch-only |

## Sources

- `git log HEAD..autonomy-upstream/main`; `git show 54a5669`
- `gh issue list -R fro-bot/dashboard`; `gh pr list -R fro-bot/dashboard`
- `npm view <pkg> version` ×18 (2026-09-19); `npm view typescript@6 / vitest@4 version`
- Docker Hub registry API: `library/node/manifests/24-slim` → digest `sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553`
- `gh api repos/github/codeql-action/releases/latest` → `codeql-bundle-v2.27.0`; `gh api repos/raven-actions/actionlint/releases/latest` → `v2.2.0`; `gh api repos/dlvhdr/gh-dash` → 12,533★
- In-repo: ROADMAP.md; docs/contracts/operator-listener-channel.md; docs/plans/ (latest 2026-07-31); .github/workflows/release.yaml; eslint.config.ts; package.json; Dockerfile:40-41
- Prior phase artifacts: `.conductor/progress/dfca4a206a384d4a98f547e91dbd8056.ndjson`, delegate spool `dfca4a206a384d4a98f547e91dbd8056.json`

### 2026-09-20 sources
- `git fetch autonomy-upstream && git diff origin/main autonomy-upstream/main --stat` (59 files; wiki-writer/renovate excluded-tree dominance; Dockerfile pnpm 11.27.0 vs upstream 11.8.0; digest 0e0ff40)
- `gh pr view 488/489/491/492 -R fro-bot/dashboard` (bodies, mergedAt, file lists); `gh pr list`/`gh issue list -R fro-bot/dashboard` (#481 still open; #238/#112/#8 unchanged)
- Docker Hub registry API (2026-09-20): `library/node/manifests/24-slim` → digest `sha256:0e0ff40c39bc…` (0e0ff40 IS the live digest today)
- `npm view` ×12 (2026-09-20): vitest 5.0.1 / 4.1.11, typescript 7.0.2 / 6.0.3, jsdom 30.1.0, eslint 10.11.0, hono 4.13.8, vite 8.3.0, react 19.3.0, tailwindcss 4.3.3, vite-plugin-pwa 1.3.0
- Web (agent-reach, Exa): docs.docker.com/build/ci/github-actions/attestations/ (build-push-action v4+ provenance auto-attach, mode=min private); github.com/psyb0t/gitrakz (created 2026-08-14, 0★)
- `gh api repos/dlvhdr/gh-dash` → 12,535★ (2026-09-20)
- In-tree: pnpm-lock.yaml (hono@4.13.7), .github/workflows/codeql.yaml:32,38 (codeql-action@1c5b675 already absorbed), src/github/installations.ts:222, src/github/aggregator.ts:652-745,715,793
- Prior phase artifacts: `.conductor/progress/23914d5282124a16a0eb70062c0a2179.ndjson` (assess 2026-09-20), delegate spool
