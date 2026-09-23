---
date: 2026-09-20
topic: repository-extensions-research
focus: research_repository_extensions — new evidence-backed candidates that EXTEND the 2026-09-19 ideation set; upstream changes, ecosystem advisories, GitHub API capabilities, competing approaches, user needs
mode: repo-grounded
run: 'f4622d7ef78c49a7ae97725fe4d1b683 (research phase; stranded-run record — its landing commit ecedc26 was integrated late on 2026-09-24, conflict case 06d38b7d; numbered -3 per the #4315 filename-collision convention: the primary path holds the re-run lineage record that landed as 7de0de3)'
---

# Ideation: Repository extensions — research pass 2 (run f4622d7e, research phase)

Generated via `ce:ideate` in-process path (delegate session has no subagent
tool; frames run in-thread — no idea is claimed independently corroborated, per
project convention). This doc EXTENDS, and does not repeat,
`docs/ideation/2026-09-19-repository-extensions-ideation.md` (7 ranked ideas,
12 rejections): every candidate below is new, and evidence updates to the prior
set are listed separately so the prioritize phase can fold them in.

## Grounding Context

**Codebase** (carried from this run's assess phase, attempt
`62e9eb24c53048e9a00a1ae28ed8a764`): HEAD `b2ef125` == content of origin/main
`5b8a2b3`; 2 P1 red gates on main (Main/Check Workflows via `fro-bot.yaml:266`
secrets-context job-if from PR #4; CodeQL missing the unlanded deps-install
fix), 3 P2, 5 P3; local gates green (types 0, lint 0, tests 3017/3017);
actionlint container exit 1 reproducing CI at `fro-bot.yaml:266:47`.

**Upstream** (`fro-bot/dashboard`, remote `autonomy-upstream`, fetched today):
- Now **4 commits ahead** of origin/main — two new since yesterday's ideation:
  `3efa4b1` (#491, base digest → `a9d7043`) and `86c1e6a` (#492, base digest →
  `0e0ff40`). Two upstream base-digest moves in ~24h re-confirms rebuild
  velocity; the absorb target for prior rm-111 is now `0e0ff40`, superseding
  `a9d7043`.
- PR #481 (redacting logger) still OPEN; no other open upstream PRs; no new
  feature-bearing issues (only the daily report, #238, #193, #112, #8).

**Ecosystem** (npm registry + GitHub Advisory Database, probed 2026-09-20):
- **hono 4.13.7 (lockfile) is clean** against every published GHSA affecting
  hono (all 30 advisories probed are fixed in ≤4.13.5) — the 4.13.8 move is
  convergence only, NOT security-prompted. Upstream carries 4.13.8.
- **vite 8.3.0 is clean** (all 8.x advisories fixed by 8.0.16; devDependency
  anyway).
- In-major currency unchanged from yesterday: react 19.3.0 / vite 8.3.0 /
  vite-plugin-pwa 1.3.0 / tailwindcss 4.3.3 at latest; majors available:
  vitest 5.0.1 (have 4.1.11), typescript 7.0.2 (have 6.0.3), jsdom 30.1.0
  (have 29.1.1) — no change to prior idea 7's watchlist numbers.
- `fro-bot/agent` (the gateway whose contract this app mirrors; clonedep pinned
  at `v0.78.0`) is now at **v0.113.2 — 75 releases of drift**, with ≥5 recent
  release bodies touching operator/gateway surfaces (v0.113.1, v0.113.0,
  v0.109.3, v0.107.1, v0.106.2).

**GitHub API capability probes (live, 2026-09-20, this operator token):**
- GraphQL `repository.vulnerabilityAlerts` works; `codeScanningAlerts` does NOT
  exist on `Repository` in the public schema (code scanning is REST-only).
- REST `/repos/{o}/{r}/code-scanning/alerts?state=open` works and returns **10
  OPEN alerts on this fork's `main` right now — 1 critical (CVE-2023-45853) +
  9 high, created 2026-09-16, refs/heads/main** — none visible in the dashboard.
- GraphQL `vulnerabilityAlerts(states:OPEN)` returns **0 open / 28 historical
  (all FIXED)** on this fork.
- REST `/repos/{o}/{r}/actions/runs` works and directly exposes per-workflow
  conclusions (probed: Main=failure, CodeQL=failure, Scorecard=success at
  `5b8a2b3`).
- `GET /branches/main/protection` → **404 "Branch not protected"**;
  `GET /rulesets` → **empty**. `codeo1io` is a **User account** (not an org),
  repo public.

**User needs / competing approaches:** the operator's demonstrated blind spots
are this run's demand signals — the F1/F2 gate reds sat unnoticed by the
operator's own tooling from merge (2026-09-19 17:51Z) until today's assess, and
10 code-scanning alerts incl. a critical have been open and unseen since
2026-09-16. GitHub's native Security tab and org Security Overview are the
competing surfaces; both need interactive UI login, are per-repo or org-scoped
(an org overview does not exist here — codeo1io is a User account), and
demonstrably did not reach this operator. The single-operator, read-only,
App-token cross-repo niche remains uncontested (prior doc's gh-dash finding
stands).

## Ranked Ideas (new — extends the 2026-09-19 set)

### 1. Security-posture panel: Dependabot + code-scanning alerts per repo

**Description:** Extend the aggregator's per-repo snapshot with two
already-permissioned data sources: open Dependabot alert counts (severity
breakdown) via GraphQL `vulnerabilityAlerts(states:OPEN)`, and open
code-scanning alert counts via REST `/code-scanning/alerts?state=open`
(GraphQL has no code-scanning field — probed). Render as a per-repo posture
chip and a needs-attention trigger. Both calls sit behind the optional
permissions (`security_events` / `vulnerability_alerts:read`) that
`src/github/installations.ts` ALREADY requests in `FULL_READ_PERMISSIONS`
with graceful core-only fallback — the plumbing was designed for exactly this.

**Warrant:** `direct:` — live probes today: 10 open code-scanning alerts on
main (1 critical CVE-2023-45853 + 9 high, dated 2026-09-16, never surfaced
anywhere the operator looks) and 0/28 open/historical Dependabot alerts on this
fork; `src/github/installations.ts:50-53` documents the optional-permission
design; AGENTS.md invariant #1 names `security_events/vulnerability_alerts:read`
as optional + graceful.

**Rationale:** Reliability-first and evidence-forced: a critical alert has been
open four days on the very repo whose dashboard is the operator's console. The
dashboard's whole reason to exist is "one authenticated view of the footprint";
security posture is the largest footprint dimension it currently omits despite
already carrying the tokens for it.

**Downsides:** REST code-scanning is a second query pattern (per-repo N+1 on
top of GraphQL — needs the same batching/`first:`-cap discipline the rm-110
family taught); alert triage semantics (scanner artifacts vs real exposure —
see rejection 2) must stay manual; rate-limit budget grows.

**Confidence:** 85%  **Complexity:** Medium  **Status:** Unexplored

### 2. Per-repo scoped installation tokens (defense-in-depth for invariant #2)

**Description:** The mint path (`src/github/installations.ts:165-189`,
`mintReadOnlyToken` → `mintFn(installationId, permissions)`) mints tokens
scoped to the WHOLE installation. GitHub's
`POST /app/installations/{id}/access_tokens` accepts a `repositories` array to
scope the token to named repos. Pass the single target repo when querying
per-repo status, so each token's capability matches the query intent.

**Warrant:** `direct:` — mint code takes only `(installationId, permissions)`
with no repository scoping (read today); the REST contract's `repositories`
parameter is documented at docs.github.com/rest/apps/apps#create-an-installation-access-token-for-an-app;
the redaction denylist filters QUERIES (`src/github/aggregator.ts` excludes
denylisted repos before any per-repo query) but cannot constrain what a minted
installation token could read if misused — denylisted/private repos inside an
installation remain readable by the token itself.

**Rationale:** Hardens the strongest invariant the repo has. Today the redaction
guarantee is query discipline; scoping the token makes it capability, which
survives future code drift in the query layer.

**Downsides:** More mints per cycle (one per repo rather than one per
installation) — mitigate by keeping the installation-wide token for
installation enumeration and scoping only per-repo GraphQL/REST calls; cache
per-repo tokens with the existing 55-min pattern. GitHub caps token mints per
hour (5,000/installation/hour) — far above this fleet's size.

**Confidence:** 80%  **Complexity:** Low-Medium  **Status:** Unexplored

### 3. Merge-hygiene baseline: branch protection / rulesets + drift alert

**Description:** Codify `main`'s required checks (Test, Check Types, Check
Workflows, Lint, Test Scripts Load, Design Check, Dependency Review, CodeQL —
the Main workflow's job set) via a ruleset or classic branch protection with
`required_status_checks`, and add a periodic (weekly) workflow that snapshots
the protection/ruleset API state and alerts on drift. This closes the hole
demonstrated yesterday: PR #4 merged at 17:51Z with TWO red checks on its own
run (35459324430).

**Warrant:** `direct:` — `gh api /repos/codeo1io/dashboard/branches/main/protection`
→ 404 "Branch not protected"; `/rulesets` → empty; assess finding F3 (PR #4
merged red, both jobs, evidence in run 35459324430); repo is public on a User
account, where required status checks and rulesets are available.

**Rationale:** Cheapest possible fix for the exact failure mode that just
landed two P1 red gates on main: nothing enforces green-before-merge today.
Drift alert keeps the config honest instead of trust-but-never-verify.

**Downsides:** Required checks + the single serialized self-hosted runner
(memory #3264) will queue merges behind red-check reruns — that is the point,
but expect slower merges under load; document the override path for hotfixes
(admin merge with red checks becomes an explicit, visible decision).

**Confidence:** 90%  **Complexity:** Low  **Status:** Unexplored

### 4. Gate-health roll-up: workflow-run conclusions per repo

**Description:** Add per-repo "gate health" to the snapshot: latest conclusion
per workflow (REST `/repos/{o}/{r}/actions/runs?per_page=N`, dedupe by workflow
name, head_sha == default branch tip), surfaced as chips and as a
needs-attention trigger (any required-gate red at tip).

**Warrant:** `direct:` — probed today; the endpoint returns exactly the shape
needed (probed rows: Main=failure, CodeQL=failure, Scorecard=success at
`5b8a2b3`); the F1/F2 reds existed ~26h before any operator-facing surface
showed them (merged 2026-09-19 17:51Z; discovered by today's out-of-band assess
`gh` calls).

**Rationale:** The dashboard already shows check runs ON commits (via GraphQL
checkSuites); workflow-level conclusions are the operator's mental model of
"are the gates green" — the distinction that mattered this week (the red was at
workflow-parse level, before any check run existed).

**Downsides:** Adjacent to prior idea 6 (operator system-status panel — health
of the MONITOR); this candidate covers health of the REPOS. Implement together
in one "observability" plan to avoid two parallel status surfaces; N+1 REST
calls need batching discipline like candidate 1.

**Confidence:** 75%  **Complexity:** Medium  **Status:** Unexplored

### 5. Gateway-contract drift watch for the mirrored fro-bot/agent surface

**Description:** The repo's cloned dependency source (`.slim/clonedeps/repos/
fro-bot__agent`, the documented reference for the operator OAuth return path,
App client, secret readers, logger/Result primitives this app mirrors) is
pinned at `v0.78.0` while upstream `fro-bot/agent` is at `v0.113.2` — 75
releases of drift, ≥5 recent ones touching operator/gateway surfaces. Add a
standing watch: refresh the clonedep on a cadence, diff the mirrored contract
surfaces, and record deltas as roadmap items (conformance tests here may need
updating when the gateway contract moves).

**Warrant:** `external:` — `gh api repos/fro-bot/agent/releases` (today):
latest `v0.113.2`; release bodies matching operator/gateway: v0.113.1, v0.113.0,
v0.109.3, v0.107.1, v0.106.2 among the newest 40; AGENTS.md "Cloned Dependency
Source" names the mirrored surfaces; `.slim/clonedeps` pins `v0.78.0`.

**Rationale:** This app's auth spine is a MIRROR of a fast-moving upstream
(35 versions ahead). Drift is currently invisible — no process notices when the
gateway contract changes underneath the conformance tests.

**Downsides:** The clonedep is a read-only reference; absorbing changes is
manual and judgment-heavy (the mirror intentionally diverges in places).
Keep the watch cheap (tag-diff + surface-diff notes), not an auto-PR.

**Confidence:** 75%  **Complexity:** Low  **Status:** Unexplored

## Rejection Summary (new)

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Security-prompted hono/vite bumps | Advisory DB probed: hono 4.13.7 and vite 8.3.0 are clean against ALL published GHSAs — no security delta; convergence is already rm-111/F6 work, not a new candidate |
| 2 | Auto-dismiss/remediate code-scanning alerts | Premature: the 10 open alerts (incl. CVE-2023-45853 critical) predate the 2026-09-19 Trivy-green release and are likely container-scanner artifacts needing manual triage — surface first (candidate 1), automate never without triage semantics |
| 3 | Adopt GitHub org Security Overview instead | Not applicable: codeo1io is a User account (probed `owner.type`), no org-level overview exists; per-repo UI tabs already failed to reach this operator |
| 4 | Snapshot history / trends for alerts | Same rejection as prior doc's #2 — introduces the repo's first storage layer; posture counts suffice for now |
| 5 | Enable Renovate self-hosted / upstream auto-absorb | Already prior ideas 2 and 3; today's evidence (now 4 commits behind, base at `0e0ff40`) strengthens them but adds no new candidate — fold as evidence update below |

## Evidence Updates to Prior Ideas (use, not redo)

- Prior idea 3 (upstream-absorb cadence): drift is now 4 commits (`7fab758`,
  `54a5669`, `3efa4b1`, `86c1e6a`); absorb target for the base pin is now
  `0e0ff40` (supersedes `a9d7043` from the unlanded rm-111).
- Prior idea 6 (operator system-status panel): this run's assess findings F1/F2
  are a second concrete instance of the blind spot it targets (first instance
  was yesterday's reds) — motivation now twice-evidenced; consider merging with
  candidate 4 at plan time.
- Prior idea 7 (major-upgrade watchlist): numbers unchanged today (vitest
  5.0.1 / TS 7.0.2 / jsdom 30.1.0 available; in-major current everywhere).

## Sources

- Upstream: `git fetch autonomy-upstream`; `git log origin/main..autonomy-upstream/main`;
  `git show --stat 3efa4b1 86c1e6a`; `gh pr view 481 -R fro-bot/dashboard`;
  `gh pr list` / `gh issue list -R fro-bot/dashboard`
- Ecosystem: `npm view <pkg> version` ×11 (hono 4.13.8, react 19.3.0, vite
  8.3.0, vitest 5.0.1, typescript 7.0.2, jsdom 30.1.0, @octokit/app 16.1.4,
  arctic 3.7.0, @node-rs/argon2 2.2.1, vite-plugin-pwa 1.3.0, tailwindcss 4.3.3);
  `gh api /advisories?ecosystem=npm&affects=hono` (30 GHSAs, all fixed ≤4.13.5);
  `gh api /advisories?ecosystem=npm&affects=vite` (8.x fixed by 8.0.16);
  `gh api repos/fro-bot/agent/releases` (v0.113.2 latest; 75 releases since v0.78.0)
- GitHub API probes (2026-09-20): GraphQL `vulnerabilityAlerts(states:OPEN)` →
  0 open (28 historical); GraphQL `codeScanningAlerts` → undefinedField (REST-only);
  REST `/repos/codeo1io/dashboard/code-scanning/alerts?state=open` → 10 (1 critical
  CVE-2023-45853 + 9 high, 2026-09-16, refs/heads/main); REST
  `/repos/codeo1io/dashboard/actions/runs?per_page=3` → per-workflow conclusions;
  `GET /branches/main/protection` → 404 not protected; `GET /rulesets` → empty;
  `repos/codeo1io/dashboard` → owner.type=User, private=false
- In-repo: `src/github/installations.ts` (mint signature, permissions objects,
  token cache); `src/github/aggregator.ts` (denylist-before-query); AGENTS.md
  (invariants, Cloned Dependency Source); package.json + pnpm-lock.yaml pins;
  prior ideation doc `docs/ideation/2026-09-19-repository-extensions-ideation.md`
- Prior phase artifacts: assess attempt `62e9eb24c53048e9a00a1ae28ed8a764`
  (delegate spool + `.conductor/progress/62e9eb24c53048e9a00a1ae28ed8a764.ndjson`)
