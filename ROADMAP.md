# dashboard — Roadmap

> Autonomously maintained by the roadmap sync (reliability-first). Items cite reproducible codebase signals; acceptance is proven by cited evidence.

<!-- manual-revision 2026-09-20: restored + extended by maintenance cycle run 270220e7 (roadmap phase)
     after the 2026-09-20 fleet render (2f3a884) regressed: it re-introduced the exact bare-array
     lint failure rm-104 predicted (ROADMAP.md:20:32, Main run 35479225529 Lint red), resurrected
     superseded rm-001/rm-002 with pytest/ast evidence on vendored .agents/skills/impeccable paths,
     deleted every tracked open item and this directive, and added a Fleet context section naming
     hermes-agent as upstream (not this repo's upstream; removed). This revision restores the
     3075f4a content, updates cycle-1 items against what landed at 3075f4a (dependabot.yml present;
     actionlint container form in main.yaml; AGENTS.md Fro Bot note present — rm-109 completed),
     and adds cycle-2 items from run 270220e7 assess findings and
     docs/ideation/2026-09-20-repository-extensions-ideation.md.
     hermes-roadmap render: preserve or explicitly supersede these items on the next render; do not
     silently drop them. rm-001/rm-002 remain superseded — do not resurrect vendored-path signals.
     cycle-1 outcome (2026-09-19, run cf5527c1): rm-100 (container actionlint + codeql-action digest
     1c5b675), rm-102 (.github/dependabot.yml), rm-109 (AGENTS.md Fro Bot ops note) landed on
     origin/main at 3075f4a. CodeQL green at the pushed sha remains open (see rm-100). Batch
     decisions: docs/prioritization/2026-09-19-cycle-1-batch.md.
     manual-revision 2026-09-20 (run 779e7271, cycle-2 batch-2 implement — lineage reconciliation):
     the two divergent curated lineages were reconciled with this file (aa4ff9f) as base.
     Id-collision mapping applied verbatim from docs/prioritization/2026-09-20-cycle-2-batch-2.md:
     unlanded f4622d7e items renumbered rm-116 merge-hygiene, rm-117 security panel, rm-118 per-repo
     tokens, rm-119 gate-health roll-up, rm-120 gateway watch, rm-121 binding-docs sync (implemented
     this batch), and its rm-118 aggregator-hygiene folded into landed rm-112; this run's items
     renumbered rm-122 port upstream #481 (implemented this batch), rm-123 digest-drift, rm-124
     server/docs hygiene (implemented this batch). Landed-id meanings (rm-112..rm-115 at 916783f)
     unchanged. rm-100/rm-110/rm-113 closed against aa4ff9f outcomes (Main 35490785353 green,
     CodeQL 35490785207 green); rm-111 CLOSED at compound time — Release 35491419600 completed
     success at aa4ff9f with the '🚦 Enforce fixed HIGH/CRITICAL' Trivy step green (image 9e6cbb41,
     zero enforceable findings). cycle-2 outcome (2026-09-20, run 779e7271 compound): batch-2
     (B0/B2/B3/B4/B5) implemented and validated pre-review in this tree (lint/check-types/test
     3026/3026, actionlint container 0); review/shipping outcomes follow this phase and carry into
     the next cycle's assessment. Next-cycle candidates queued: rm-116, rm-119, rm-123, rm-117,
     rm-118, rm-120. Cycle lessons compounded to
     docs/solutions/workflow-issues/parallel-conductor-campaigns-frame-movement-collisions-2026-09-20.md,
     docs/solutions/best-practices/binding-doc-consistency-greps-avoid-pathspec-miss-2026-09-20.md, and
     docs/solutions/workflow-issues/codeql-semmle-typescript-home-2026-09-20.md
     manual-revision 2026-09-20 (run f69cd740, repository-maintenance cycle 1 — repo research lineage
     cycle 3; research artifact docs/ideation/2026-09-20-repository-extensions-research-2.md):
     added rm-125..rm-130 from this run's assess findings and the cycle-3 research re-measure;
     refreshed rm-103 signals (drift 8: the two new upstream commits are the #495/#496 privacy
     policy, absorbed by rm-125), rm-106 (UNBLOCKED — upstream published the public operator push
     privacy policy, this item's stated precondition), rm-107 (healthz placeholder-null confirmation),
     rm-116 (re-probed 2026-09-20: still unprotected), rm-119 (first all-green tip discovered only
     out-of-band). Completed and superseded sections untouched.
     hermes-roadmap render: preserve or explicitly supersede these items on the next render; do not
     silently drop them. rm-001/rm-002 remain superseded — do not resurrect vendored-path signals. -->

**Vision**: A reliable, customer-friendly repository advanced by evidence-cited roadmap cycles owned by the autonomy loop

**Pillars**: reliability work outranks customer-experience work; every roadmap item cites reproducible codebase signals; acceptance is proven by cited evidence, never claimed

## Open items

### Harden the roadmap render (vendored-path exclusion, stack-correct evidence, lint-clean output)
- id: `rm-104` | track: reliability | priority: 98.0 | status: candidate (ESCALATED: failure recurred 2026-09-20)
- signals: the 2026-09-20 fleet render (2f3a884) repeated every defect class rm-104 predicted: bare-array prose broke `pnpm lint` at ROADMAP.md:20:32 (main unlandable; run 35479225529), pytest/ast evidence strings re-cited in a Node 24/pnpm/Vitest repo, all 21 signals again under vendored `.agents/skills/impeccable/**`, and — new this time — the manual-revision directive, superseded section, and all tracked open items rm-100/102/103/104/105/106/107/108/109/110 were silently deleted (88 deletions in `git show 2f3a884 -- ROADMAP.md`)
- acceptance:
  - next hermes-roadmap render emits zero signals under `.agents/skills/impeccable/**` (vendored-path exclusion)
  - rendered evidence strings reference repo-native commands only (`pnpm lint`, `pnpm check-types`, `pnpm test`, `gh run ...`), never pytest/ast tooling
  - `pnpm lint` exits 0 immediately after a render (generator lints its own output before commit)
  - manual-revision, superseded, and completed sections survive a render verbatim unless explicitly superseded; tracked items may only close with an explicit superseded marker citing evidence
- evidence: diff of ROADMAP.md across the next sync commit; `pnpm lint` exit 0 at that commit; upstream fro-bot tracking issue/PR link for the generator fix; delegate-side recovery recipe documented at `docs/solutions/workflow-issues/fleet-roadmap-render-clobber-recovery-2026-09-20.md` (compound-phase 2026-09-20)

### Land fork dependency automation — first-PR proof
- id: `rm-102` | track: reliability | priority: 90.0 | status: in-progress (config landed 3075f4a 2026-09-19; first dependabot PR evidence pending ~2026-10-03)
- signals: `.github/dependabot.yml` present on origin/main (landed at 3075f4a — verified by `git log origin/main -- .github/dependabot.yml`); Renovate never runs here (PR #1 deleted renovate.yaml; config .github/renovate.json5 persists uninvoked); weekly cadence, first window opened 2026-09-19
- acceptance: first dependabot-authored PR visible within 14 days of 2026-09-19; grouped updates honored (npm, docker digests, github-actions; `open-pull-requests-limit: 3` for the single serialized runner); `pnpm test` green after the first merged automated bump
- evidence: `gh pr list --author "app/dependabot"` non-empty; merge commit's Main run green

### Automated upstream-absorb cadence with drift gate
- id: `rm-103` | track: reliability | priority: 85.0 | status: candidate
- signals: drift recurs by design — 2 commits behind on 2026-09-19, 6 behind on 2026-09-20, 8 behind on 2026-09-20 second measure (run f69cd740 research: the two new commits 30839c6 + 3f2fbe9 are the privacy-policy feature absorbed as rm-125; everything else content-converged) (node digests churn ~daily; two tag rebuilds in 24h); absorption is manual-only; upstream PR #481 (redaction chokepoint) MERGED upstream 2026-09-19 and ported by rm-122; upstream #493 (clonedeps-skill removal) must be SKIPPED on absorb — the fork keeps its clonedep artifacts deliberately as the v0.78.0 reference source (rm-120); fresh measure 2026-09-21 (run 87e3c32f research): 3 commits behind (da6809d upstream #511 push never auto-registers without user action, 232f353 upstream #508 unknown reconcile inputs no longer destroy live subscriptions, 31564c4 docs on proxy-collapsed rate-limit identities) — the fork SHIPS pre-fix reconcile.ts/subscribe.ts, so #511/#508 are live bug fixes on absorb, not noise; upstream open PR #512 (stream retry without snapshot) is the next watch item; scope is push/docs files only (10 files, 635 insertions since merge base 9f9adc5), so this absorb batch is low-residue-risk, but the exclusion hazards ride in the merge base itself — pair with rm-131
- implementation note (2026-09-20, f4622d7e lineage): the 2026-09-20 absorb's CONTENT (hono 4.13.8 + base digest 0e0ff40) landed as direct edits via rm-111 rather than a history merge, so upstream history stays ahead while content converged — a future history absorb must not double-apply (Dockerfile pins and pnpm-lock.yaml already sit at the upstream values)
- acceptance: scheduled workflow compares HEAD to `autonomy-upstream/main` and opens a human-approved merge PR when behind (auto-prepare + gate, never auto-push — fork exclusions demand human review); drift past a documented threshold opens an alert issue; #481 fast-followed within one cycle of merging upstream
- evidence: workflow run logs showing the compare step; merge PR links; `git rev-list --count HEAD..autonomy-upstream/main` → 0 (or ≤ threshold with an open alert)

### Supply-chain baseline v2: SBOM + build provenance in Release
- id: `rm-105` | track: security | priority: 80.0 | status: candidate
- signals: `.github/workflows/release.yaml` has no sbom/attest/provenance/cosign step (verified by grep, 2026-09-19) while Scorecard v2.4.4 is already green — attestations are the missing next rung of the 2026-07-31 security-workflow-baseline lineage
- acceptance: Release publishes the GHCR image with SBOM (syft) artifact and build provenance (`actions/attest-build-provenance`); verification reads the digest via the Digest line (`awk '/^Digest:/{print $2; exit}'` — the `--format` template is silently ignored for attestation-bearing indexes on this buildx) and confirms the attestation manifest exists
- evidence: release run log showing SBOM + attest steps green; registry manifest for the released digest shows attestation layer; docs note how an operator verifies (`docker buildx imagetools inspect` or `gh attestation verify`)

### Aggregator degradation and staleness semantics
- id: `rm-112` | track: reliability | priority: 75.0 | status: candidate (from run 270220e7 assess F3)
- signals: `src/github/aggregator.ts` silently drops repos on resolver failure (line 686) and a warm-empty working set replaces `lastGoodSnapshot` with fresh-empty without a stale banner (lines 704-706), contradicting the file's own fail-closed cold-start path (lines 624-641); no test covers either branch (verified 2026-09-20); the operator cannot distinguish "all quiet" from "data lost"
- absorbed signals (2026-09-20, from the f4622d7e lineage item formerly rm-118 — aggregator hygiene batch): the snapshot cache TTL equals the refresh interval (60s) so the cache never serves between refreshes (dead weight plus a false sense of caching); the denylistComplete doc comment and its code disagree; failed installation resolution has no negative caching so a dead install re-hits the GitHub API every cycle; `.github/renovate.json5` persists with nothing invoking it since PR #1 deleted renovate.yaml — undocumented dead config inviting confusion with the landed dependabot (rm-102)
- acceptance: partial resolver failure serves last-good with an explicit stale marker and per-repo absence entries instead of silent drop; warm-empty never replaces last-good without a banner; MonitoringDto gains a degradation signal consumed by the operator view; both branches tested
- evidence: new aggregator tests in `pnpm test` covering resolver-failure and warm-empty paths; operator view renders a stale banner against a seeded degraded snapshot
- absorbed acceptance (f4622d7e lineage rm-118): cache TTL raised above the refresh interval or the cache removed with a comment recording why; denylistComplete comment corrected or code aligned — one truth; failed-installation resolution negatively cached with a short TTL and tested; renovate.json5 deleted or an AGENTS.md line documents its inert state

### Absorb the upstream operator-push privacy policy (#495/#496)
- id: `rm-125` | track: reliability | priority: 74.0 | status: in-progress (implemented in the run-f69cd740 worktree 2026-09-20 as B1 of docs/prioritization/2026-09-20-cycle-3-batch.md; pending landing)
- signals: upstream drift grew 6 to 8 on 2026-09-20 and the two new commits are one feature — 30839c6 plans the public operator push privacy policy (upstream #495) and 3f2fbe9 publishes it (upstream #496: `web/privacy.html` +87, `web/src/privacy/claims.ts` +239, 258 lines of claims tests, a `/privacy` server route, an AppShell link); the fork has no first-party privacy surface (grep, 2026-09-20), and this feature is the stated precondition for rm-106's listener digest push
- acceptance: the policy feature is hand-ported with fork layout — the fork's server.ts and web app have diverged, so port intent, not a line merge (same discipline as rm-122): a `/privacy` route serves the static policy page in fork chrome, the claims module and its tests are ported and green, the AppShell link lands, and the upstream drift accounting reflects #495/#496 absorbed while #493 stays skipped per rm-103
- evidence: cross-ref `git show 3f2fbe9 30839c6`; the ported claims tests in `pnpm test`; `git rev-list --count HEAD..autonomy-upstream/main` re-measured after the absorb; `pnpm lint` and `pnpm check-types` green

### Reconcile drift-identity reporting: count-only promise vs full_name on discovered repos
- id: `rm-126` | track: reliability | priority: 73.0 | status: candidate (added 2026-09-20, run f69cd740 assess F2)
- signals: `src/github/aggregator.ts:12-19` docstring promises snapshot drift is reported "count only, never by repo identity", but RepoStatusDto carries `full_name` (aggregator.ts:86) and installation-only discovered repos enter the snapshot labeled `discovered` (aggregator.ts:418-419) — emitted by `/api/status` and `/api/monitoring`; during a metadata staleness window that can surface an un-redacted private repo name to authenticated clients; `/api/monitoring` additionally has no SPA consumer (grep shows only self-referential comments in `src/routes/api.ts`) since the operator-first re-architecture, so its exposure surface is maintained for nothing
- acceptance: one truth — either drift surfaces lose repo identity (count and count-by-class only, names stripped from discovered-only entries) or the docstring is corrected and an explicit operator decision to show names is recorded in the cycle batch doc; the `/api/monitoring` consumer question decided in the same change (wire it, fold it into the rm-107/rm-119 status surface, or delete it together with its tests); tests assert the chosen semantics for the discovered-only case
- evidence: `pnpm test` covering the chosen drift semantics; grep shows the docstring and DTO behavior agree; the consumer decision recorded in docs/prioritization/

### Listener digest push
- id: `rm-106` | track: operator-experience | priority: 70.0 | status: candidate (UNBLOCKED 2026-09-20, run f69cd740 research — the privacy-policy precondition was published upstream; absorb via rm-125, implement this item in the same or next cycle)
- signals: VAPID push infra is live for run events while listener messages (deploy-health, autoheal, Daily Maintenance Report per `docs/contracts/operator-listener-channel.md`) age out silently under the 500-row/30-day retention — the channel replaced GitHub issues but kept a "must watch a surface" burden
- unblock evidence (2026-09-20): upstream fro-bot/dashboard merged #495 (30839c6, plans the public operator push privacy policy) and #496 (3f2fbe9, publishes it: `web/privacy.html` +87, `web/src/privacy/claims.ts` +239, 258 lines of claims tests, a `/privacy` server route, AppShell link) — exactly the "published first or in the same change" precondition this item's acceptance names
- acceptance: push (rate-capped) or daily digest delivered on listener messages; noise calibration documented (what triggers immediate vs digest); upstream #238-style public push privacy policy published first or in the same change
- evidence: integration test covering the notify path in `pnpm test`; one live verified delivery to the operator's subscription; policy doc merged

### Operator system-status panel
- id: `rm-107` | track: operator-experience | priority: 65.0 | status: candidate
- signals: monitoring-of-monitoring signals exist but scattered — `refreshedAt`/`staleBanner` in the MonitoringDto, GitHub rate-limit hooks live but log-only (`src/github/app-client.ts:73-79` `onRateLimit`/`onSecondaryRateLimit`), listener store depth, nothing composes them; the 2026-09-20 assess needed out-of-band `gh` commands to learn CI was red; `/api/healthz` hardcodes its `lastFetch`/`rateLimit` fields to null placeholders (src/routes/api.ts) — liveness-only by design, confirming these signals belong in a composed status surface rather than healthz
- acceptance: one status surface composes snapshot freshness, rate-limit budget, listener store depth/age, and last refresh failures (fail-closed events); each composed signal has a test; no duplication of `/healthz` liveness semantics
- evidence: `pnpm test` includes tests for each composed signal; operator verification against a seeded stale snapshot renders the panel correctly

### Dated major-upgrade decision matrix
- id: `rm-108` | track: reliability | priority: 60.0 | status: candidate (reframed 2026-09-20 from open-ended watchlist)
- signals: measured 2026-09-20 — typescript 6.0.3 → 7.0.2 (native compiler, announced 2026-07-08; 7.0 ships no programmatic API — typescript-eslint still needs 6.x via the `@typescript/typescript6` side-by-side package); vitest 4.1.11 → 5.0.1 (the 3→4 migration already cost a cycle; flags/`basic`-reporter breaks documented in solutions docs); jsdom 29.1.1 → 30.1.0; Node 26 enters LTS 2026-10 under the new annual schedule (every release LTS 30 months) while the image pins node:24-slim; everything else measured current (octokit modular, vite 8.3.0, react 19.3.0, tailwind 4.3.3, workbox 7.4.1)
- acceptance: this roadmap or a linked doc carries an adopted-vs-available table refreshed each maintenance cycle, each row with a trigger date, blast radius, and go/no-go decision recorded at the date; majors absorb via upstream merges where possible, otherwise explicit upgrade PRs — never a silent ride; REST API-version pin (`X-GitHub-Api-Version: 2022-11-28`, src/auth/oauth.ts:130) reviewed on the same cadence (protective pin — 2026-03-10 REST removals verified unexposed)
- evidence: `npm view <pkg> version` outputs cited at each refresh; each adopted-major bump shows a green Main run before merge

### Merge-hygiene baseline: required checks on main plus drift alert
- id: `rm-116` | track: reliability | priority: 58.0 | status: candidate
- signals: `gh api /repos/codeo1io/dashboard/branches/main/protection` returns 404 "Branch not protected" and `/rulesets` is empty (probed 2026-09-20; re-probed 2026-09-20 run f69cd740 — still 404); nothing structurally blocks red-check merges — PR #4 merged 2026-09-19 17:51Z with TWO red checks on its own run (35459324430) and its defects became the cycle's P1 findings (rm-100); repo is public on a User account, where required status checks and rulesets are available; SECOND INSTANCE 2026-09-20 (f4622d7e review): the fleet render 2f3a884 landed by direct push with its own run already red — a second red landing after PR #4's red merge; THIRD INSTANCE 2026-09-20/21 (run 87e3c32f assess): PR #7 merged with every Main gate green while the same push broke Release at builder step 5/8 (run 35562249072) — a red landing for the third time with zero structural block, and Release stayed red on three consecutive pushes (7ba9c82, b0ed12d, d0d17fc) (2026-09-21 compound, run 87e3c32f implement c6a1806d: exclusions RESTORED from 4b1b406 baseline — Dockerfile/README/AGENTS/copilot/vitest.config plus the .slim/clonedeps.json manifest the merge had deleted; local docker build green (manifest sha256:cb0ce8a…) so Release is expected green once the cycle-5 batch lands; the standing defense is now rm-131, in-tree)
- acceptance:
  - main protected (classic branch protection or a ruleset) with required status checks covering the Main workflow's job set (Test, Check Types, Check Workflows, Lint, Test Scripts Load, Design Check) plus CodeQL; strict-on-required-context where feasible
  - a periodic (weekly) workflow snapshots the protection/ruleset API state and alerts (open issue or failing check) on drift from the codified baseline
  - the hotfix override path documented in AGENTS.md (an admin merge over red checks becomes an explicit, visible decision, not a default)
- evidence: `gh api /repos/codeo1io/dashboard/branches/main/protection` returns the configured object post-change; drift-check workflow run log on first run; AGENTS.md note merged; PR #4-style merge attempt with red checks is blocked (observed on a throwaway branch)

### Make the gateway login-redirect topology assumption explicit
- id: `rm-127` | track: reliability | priority: 56.0 | status: candidate (added 2026-09-20, run f69cd740 assess F1)
- signals: gateway mode redirects unauthenticated non-public paths to `GATEWAY_LOGIN_REDIRECT` = `/operator/auth/github/start?return_to=/operator` (src/server.ts:111) — a relative path the dashboard itself never serves (routes/operator.ts mounts only `/`) and that isPublicPath (src/server.ts:577-598) does not exempt, so the intended topology is a same-origin reverse proxy routing that path to the gateway, an assumption the server.ts comment makes silently; deployed any other way an unauthenticated browser hits a browser-terminating redirect loop with no server-side diagnostic
- acceptance: the assumption becomes explicit — startup config validation requiring a documented gateway-origin/proxy topology, or the redirect built absolute against the configured gateway origin, or an isPublicPath exemption plus a local route; at least one config shape's unauthenticated flow is covered by a test and a comment records the supported topology
- evidence: a new gateway-mode unauthenticated test in `pnpm test`; grep shows the redirect target served or validated at startup; a seeded misconfigured-startup test shows the fail-fast log line

### Gate-health roll-up: workflow-run conclusions per repo
- id: `rm-119` | track: operator-experience | priority: 52.0 | status: candidate
- signals: REST actions/runs probed 2026-09-20 returning exactly the needed shape (latest runs at 5b8a2b3: Main=failure, CodeQL=failure, Scorecard=success); the 2026-09-19/20 gate reds sat invisible to operator-facing surfaces for ~26h (merged 17:51Z, found only by out-of-band assess); the dashboard renders check runs on commits but not workflow-level conclusions — and the week's failures lived at the workflow level (schema rejection before any check run existed); even the GOOD state needs this surface: the first fully-green tip (7de0de3, all four workflows green 2026-09-20 06:14Z) was itself only discoverable out-of-band via `gh run list`; THIRD INSTANCE 2026-09-21 (run 87e3c32f assess): Release red on three consecutive pushes (7ba9c82, b0ed12d, d0d17fc; last good 4b1b406 2026-09-20T21:53Z), GHCR :latest stale since — again discovered only by out-of-band assess, zero operator surface
- acceptance:
  - snapshot carries the latest conclusion per workflow at the default-branch tip (dedupe by workflow name, REST pagination with a documented ceiling — rm-110 discipline)
  - any red required-gate at the tip triggers the existing needs-attention surface
  - designed jointly with rm-107 as ONE status surface (repo gate health + monitor health), not two parallel panels — the joint-design decision recorded at plan time
- evidence: pnpm test for the roll-up path; fixture with multiple runs per workflow; manual verification against the live red Main/CodeQL state shows both surfaced

### Base-digest drift visibility: weekly read-only pin check
- id: `rm-123` | track: reliability | priority: 48.0 | status: candidate
- signals: node:24-slim moved through four digests in ~8 days (2fe369e → a9d7043 #491 → 0e0ff40 #492 (the pin since rm-111 landed) → live 5cbc7cab at 2026-09-20, `docker manifest inspect`); dependabot docker updates are weekly (rm-102), so the pin can silently trail a rebuilt, security-fixed base for days — drift is detectable today only by hand-run manifest inspection (exactly how the 779e7271 assess found the old pinned 2fe369e shipping libpcre2 10.42-1 while the live base shipped 10.42-1+deb12u1); fresh probe 2026-09-21 (run 87e3c32f research): live node:24-slim digest == pinned 0e0ff40 (tag last_updated 2026-09-19) — aligned today, a drift-free window; dependabot docker bumps begin around 2026-10-03 (window opened 2026-09-19); a cycle-4 batch reportedly implements this item — verify landing state before scheduling duplicate work (base-drift.yaml confirmed absent at HEAD d0d17fc)
- acceptance: weekly scheduled workflow compares each Dockerfile pin to the live tag digest and opens/updates ONE tracking issue on drift (title carries pinned→live digests); GITHUB_TOKEN only — the fork has no secrets; strictly read-only — it never bumps the pin itself (dependabot owns bump PRs, rm-102); the workflow passes the actionlint container gate
- evidence: actionlint container exit 0 on the new workflow; first run log shows pinned digest, live digest, drift verdict; a dry-run mode prints the issue text verbatim for review

### Single-source the SSE parser invariants
- id: `rm-114` | track: reliability | priority: 45.0 | status: candidate (from run 270220e7 assess F5/F6)
- signals: the server reader and the browser parser are maintained by hand in parallel and share a live bug — the buffer cap counts UTF-16 code units against a BYTES-named constant (`src/gateway/operator-sse-reader.ts:35,526` and `public/operator-stream.js:44,2473`); the first-frame timeout park (operator-stream.js:2505) mirrors the same duplication
- acceptance: cap constant and normalization rules extracted to one shared source consumed by both the server reader and the browser bundle (shared module or build-time generation); divergence becomes a build/type failure rather than a live parser bug; multi-byte frame tests cover the corrected cap semantics
- evidence: single definition site; `pnpm test` includes multi-byte boundary-frame tests; grep shows no remaining duplicated literal

### Security-posture panel: Dependabot and code-scanning alerts per repo
- id: `rm-117` | track: security | priority: 44.0 | status: candidate
- signals: live probes 2026-09-20 — REST `/repos/codeo1io/dashboard/code-scanning/alerts?state=open` returns 10 OPEN alerts on this fork's main (1 critical CVE-2023-45853 + 9 high, created 2026-09-16, refs/heads/main) that no operator-facing surface shows, while the 2026-09-19 Release Trivy gate was green — alert triage lags the release state; GraphQL `vulnerabilityAlerts(states:OPEN)` works (0 open / 28 historical here) but GraphQL has NO code-scanning field (probed — REST only); the token mint already requests security_events and vulnerability_alerts read with graceful fallback (src/github/installations.ts FULL_READ_PERMISSIONS), so the permission plumbing predates the feature
- acceptance:
  - aggregator snapshot carries per-repo open-alert counts — Dependabot via GraphQL `vulnerabilityAlerts(states:OPEN)`, code-scanning via one REST call per repo — both behind the existing optional-permission graceful degradation (absent permission ⇒ field omitted, never an error)
  - counts render per repo with a needs-attention trigger; only counts and severity buckets are stored/rendered — no alert content beyond that
  - the 10 standing open code-scanning alerts are triaged (dismissed with reason or routed to fix work) and the panel reflects the triaged state — surfacing is the feature, triage is the operator decision it enables
  - rate-limit cost documented: one REST call per repo per cycle, batched with the same pagination/ceiling discipline as the check-suite query (rm-110 family)
- evidence: pnpm test coverage for both alert paths including the graceful-fallback case; seeded fixture with alert counts; operator verification against live data shows the triaged state

### Per-repo scoped installation tokens
- id: `rm-118` | track: security | priority: 42.0 | status: candidate
- signals: mintReadOnlyToken (src/github/installations.ts) mints installation-WIDE tokens — the redaction denylist constrains queries (aggregator excludes denylisted repos before any per-repo query) but a minted token's capability still spans the whole installation including denylisted/private repos; GitHub's create-installation-access-token endpoint accepts a repositories array to scope a token to named repos, so capability can be made to match query intent
- acceptance:
  - per-repo GraphQL/REST status queries use a token scoped to just that repo (repositories array param at mint); installation enumeration keeps the installation-wide token
  - per-repo tokens cached with the existing 55-min pattern; the 5000-mints-per-hour-per-installation cap documented as the budget ceiling (fleet size is far below it)
  - a test proves the scoping: the client seam rejects a repo-scoped token used against a sibling repo
- evidence: pnpm test includes the scoping/rejection test; code diff extends the mint signature and call sites; AGENTS.md security-invariant block notes the capability-scoping layer

### Optional trusted-proxy mode for the ingest rate limiter
- id: `rm-129` | track: security | priority: 40.0 | status: candidate (added 2026-09-20, run f69cd740 assess F3)
- signals: the listener-ingest rate limiter keys on the direct connection address and deliberately ignores `X-Forwarded-For` as client-spoofable (src/server.ts:520-535 comment) — correct standalone, but behind the gateway reverse-proxy topology (rm-127's assumed deployment) every producer shares ONE bucket and a single noisy producer throttles all others; no configured middle ground exists today
- acceptance: an explicit trusted-proxy setting — unset keeps today's behavior (XFF ignored, spoof-safe); set switches rate-limit keying to the validated X-Forwarded-For first hop; both modes tested including the spoof-rejection case when unset, and the trade-off is documented next to the existing comment
- evidence: rate-limiter tests in `pnpm test` for both modes; a config-surface test including fail-fast on invalid values; an AGENTS.md or config-doc note naming the proxy assumption

### Gateway-contract drift watch for the mirrored agent source
- id: `rm-120` | track: reliability | priority: 36.0 | status: candidate
- signals: the cloned dependency source pins fro-bot/agent at v0.78.0 while upstream is at v0.113.2 — 75 releases of drift, with release bodies at v0.113.1, v0.113.0, v0.109.3, v0.107.1, v0.106.2 touching operator/gateway surfaces (gh api repos/fro-bot/agent/releases, 2026-09-20); AGENTS.md names this clone as the reference for the operator OAuth return path, GitHub App client, secret readers, and logger/Result primitives this app mirrors — and no process notices when that contract moves underneath the conformance tests
- acceptance: a periodic watch (checklist item in the maintenance cycle or a small workflow) compares the clonedep pin to the upstream latest tag; on drift, diffs the mirrored contract surfaces and records a short delta note (docs/solutions/ or the cycle batch doc) flagging conformance-test impact explicitly; the clonedep is refreshed on cadence, never auto-merged
- evidence: first watch output showing the v0.78.0→v0.113.2 delta summary with the operator/gateway-touching releases called out; the checklist/workflow merged

### Drop the eight unused workbox runtime dependencies
- id: `rm-128` | track: reliability | priority: 34.0 | status: in-progress (implemented in the run-f69cd740 worktree 2026-09-20 as B2 of docs/prioritization/2026-09-20-cycle-3-batch.md; pending landing)
- signals: package.json declares eight `workbox-*` packages (`workbox-window` included — the research-time count of seven missed it) alongside `vite-plugin-pwa` while zero `workbox-*` imports exist anywhere in the repo (repo-wide runtime-import scan, 2026-09-20) — the service worker is a cacheless kill-switch (`web/src/sw.ts` performs no precaching), so the workbox runtime surface is dead weight; any workbox code the PWA plugin itself needs arrives as its own transitive dependencies, not via these direct devDependencies
- acceptance: the eight direct `workbox-*` devDependencies are removed (`vite-plugin-pwa` retained only if the vite config still consumes it — verify first); frozen-lockfile install clean; `pnpm lint`, `pnpm check-types`, and `pnpm test` green; the repo-wide grep still shows zero workbox imports
- evidence: package.json and pnpm-lock.yaml diff; a green Main run at the pushed sha; the import grep re-run at the landing tree

### CSRF tokens for listener ack mutations
- id: `rm-115` | track: security | priority: 30.0 | status: candidate (hardening; low severity)
- signals: `src/routes/listener.ts:121,130` accept session-authenticated state-changing POSTs (`/messages/:id/ack`, `/ack-all`) protected only by SameSite=Lax cookies, while logout already implements an explicit CSRF-token dance (`src/routes/auth.ts:168-190`) — an asymmetry; exploit window is narrow (Lax blocks cross-site POSTs except the fresh-cookie grace period) and impact bounded (ack state)
- acceptance: ack mutations require the same csrf-token pattern as logout (or equivalent origin check), with tests for the rejected cross-origin case; no behavior change for the operator's own client
- evidence: route tests in `pnpm test` covering token-missing rejection; manual operator flow unchanged

### Server and CI hygiene batch 3
- id: `rm-130` | track: reliability | priority: 24.0 | status: in-progress (implemented in the run-f69cd740 worktree 2026-09-20 as B3 of docs/prioritization/2026-09-20-cycle-3-batch.md; pending landing)
- signals: three verified small defects — the Main test job builds the web client twice (`.github/workflows/main.yaml:112` Build web step plus the pretest hook at package.json:17 — redundant on the serialized single runner); `src/github/metadata.ts:331-344` silently skips structurally-invalid PUBLIC entries while `skippedMalformedCount` (metadata.ts:281) counts only non-objects, so malformed-input volume stays invisible to monitoring; the documented CSRF-400 retry (src/gateway/operator-client.ts:675-681) re-sends the identical request with the same token although the client exposes a `refreshCsrf` seam (operator-client.ts:522,805) — the stale-token cause the retry names can never be fixed by the retry as written
- acceptance: one web build per test job (drop the redundant step; pretest stays the single build path) with job time measured before/after; metadata skip counting extended to object-shape failures with a test; the CSRF-400 retry either re-fetches a fresh token via the existing seam before retrying or does not retry token rejections, with a test pinning the chosen behavior; all gates green
- evidence: main.yaml diff plus gh run timing for the test job; the metadata counting test and operator-client retry test in `pnpm test`; `pnpm lint`/`pnpm check-types` green

<!-- cycle-3 extension (2026-09-21, conductor run 87e3c32fa39a429989c7d8e5493b8e13 roadmap attempt 7187054a; items rm-131..rm-133 sourced from cycle-3 assess (e3c515c5) + research (829799a5); existing items preserved verbatim, dated signals appended to rm-103/rm-116/rm-119/rm-123) -->

### Merge-residue guard test: assert the wiki-writer and renovate exclusions
- id: `rm-131` | track: reliability | priority: 88.0 | status: in-progress (implemented 2026-09-21, cycle-5 batch B4, unlanded)
- signals: the 2026-09-20 upstream merge 57c9c6b silently erased every fork exclusion — Dockerfile and README.md now sit at zero diff versus `autonomy-upstream/main` (`git diff HEAD autonomy-upstream/main -- Dockerfile README.md` is empty), Dockerfile:10,31 COPY wiki-writer/package.json while `wiki-writer/` does not exist in the fork, vitest.config.ts gained a `wiki-writer` include, `.github/workflows/renovate.yaml` returned, README/AGENTS regressed to upstream's relaxed wiki-write wording, and 18 engine-internal `.conductor/progress/` ndjson files landed tracked; the run-93069e23 guard test never landed (`git log --all` shows no test/wiki-writer-guard.test.ts), so nothing failed before Release run 35562249072 went red on push; upstream tip da6809d still carries every hazard, so the next absorb re-risks the same class (2026-09-21 compound, run 87e3c32f implement c6a1806d: IMPLEMENTED as test/fork-exclusion-guard.test.ts — 9 invariants matching acceptance exactly, incl. the org-flip and clonedeps-manifest checks and git ls-files .conductor empty; negative-verified: re-adding the upstream COPY line turns the guard red; runs in Main via the existing test include; suite 2033+1070 green)
- acceptance: a vitest test with no file-extension filters (the Dockerfile is extension-less) asserts zero occurrences of `wiki-writer` in Dockerfile, README.md, AGENTS.md, .github/copilot-instructions.md, vitest.config.ts, pnpm-workspace.yaml; asserts package-manager pnpm pinned 11.27.0 (upstream carries 11.8.0); asserts `.github/workflows/renovate.yaml` absent; asserts no `.conductor/` path is tracked; the test runs in Main so the class fails at PR time, not on push
- evidence: the test is red on a scratch copy re-adding any one hazard line and green at a fixed tree; Main run green including the new test

### PR-side Dockerfile validity gate: parse COPY sources before merge
- id: `rm-132` | track: reliability | priority: 84.0 | status: in-progress (implemented 2026-09-21, cycle-5 batch B5, unlanded)
- signals: Main gates Lint/Design/Types/Test/Check Workflows/Scripts Load but never builds the image, and Release is main-push-only, so PR #7 merged green on 2026-09-20 while the same push broke Release at builder step 5/8 (COPY wiki-writer/package.json: not found, run 35562249072) — the third consecutive Release red (7ba9c82, b0ed12d, d0d17fc), all invisible at PR time; GHCR :latest stale since 4b1b406 (2026-09-20T21:53Z) (2026-09-21 compound, run 87e3c32f implement c6a1806d: IMPLEMENTED as test/dockerfile-context.test.ts — parses COPY/ADD in both stages, skips --from sources, fails on any missing tree path; negative-verified on the exact upstream hazard line; adds ~0.3s to the suite)
- acceptance: a fast Node test parses Dockerfile COPY/ADD sources across both stages and fails when a referenced path does not exist in the tree — catching missing-context breakage in seconds without a docker build; runs in Main so the class fails at PR time; complements rm-131 (content exclusion) with structural validity
- evidence: the test red on the pre-fix tree that carries the P0 Dockerfile and green after; Main run green with the test included; adds seconds, not minutes (friendly to the serialized single self-hosted runner)

### Pin dependabot major versions until migrations are planned
- id: `rm-133` | track: reliability | priority: 74.0 | status: in-progress (implemented 2026-09-21, cycle-5 batch B6, unlanded)
- signals: .github/dependabot.yml (landed as rm-102) carries no ignore rules while majors are already out — vitest 5.0.1 versus repo 4.1.11 (vitest 4 removed the `basic` reporter and its CLI rejects jest-style flags: documented constraints), TypeScript 7.0.2 versus repo 6.0.3 on the erasableSyntaxOnly pipeline, pnpm 12.5.1 versus the Dockerfile-pinned 11.27.0; the first grouped major PR from the 2026-09-19 window is expected around 2026-10-03 and will red the suite unbidden; npm view probes 2026-09-21: hono 4.13.8, playwright 1.63.0, tailwind 4.3.3, vite 8.3.0 all current within the majors in use — no minor drift (2026-09-21 compound, run 87e3c32f implement c6a1806d: IMPLEMENTED in .github/dependabot.yml — npm ignore for vitest+typescript majors, re-evaluation comment dated 2026-10-21; pnpm majors are NOT a dependabot surface (no ecosystem covers the corepack/Dockerfile pin) so that pin is guarded by rm-131’s 11.27.0 assertions instead)
- acceptance: dependabot.yml ignore rules for major-version updates of vitest, typescript and pnpm with a dated re-evaluation comment naming the migration owner; a docs decision note recording which majors are deliberately deferred and why; minor and patch updates stay open
- evidence: dependabot.yml diff plus actionlint container validation (repo convention); gh api on the config returns the ignore list; first weekly PRs after the change propose minor/patch only

<!-- cycle-7 extension (2026-09-23, conductor run 8f151ba4ac474aeab0e71a6ec90321ed; sources: assess attempt 242fac43 (17 findings), research attempt 28c14fe2 (12 evidence-backed candidates), roadmap attempt 2ea24d0b. Every candidate was re-measured against origin/main 64024a5 before id assignment: assess F1 (visual.yaml tag pins) is ALREADY FIXED on main via 37f28e7 — absorbed at merge, no id; research C7 folds into the rm-137 truthing signal below. New ids start at rm-142 because origin/main already carries rm-134..rm-141 from run 2ae7d10a cycle-6. Existing items preserved verbatim.) -->

### Setup-composite pnpm cache on ephemeral CI runners
- id: `rm-142` | track: performance | priority: 56.0 | status: in-progress (implemented 2026-09-23, cycle-7 batch B1, unlanded)
- signals: `.github/actions/setup/action.yaml:11-17` on origin/main still justifies skipping the pnpm cache with "runs on a self-hosted runner whose pnpm store persists across runs" — false since d73fbe7/aa9937f moved every job to ephemeral ubuntu-latest; measured 2026-09-23: Main run 27610828410 `test` job "Install dependencies" step = 5m0s of an 11m15s total across 6 jobs; visual.yaml already sets `cache: pnpm` locally (bypassing the composite), proving the intended pattern
- acceptance: the composite sets `cache: pnpm` alongside the existing node-version wiring and the stale rationale comment is replaced; every workflow that installs dependencies goes through the composite (or carries an explicit local cache); actionlint + `pnpm lint` + full suite green
- evidence: composite diff plus one post-merge Main run with warm Actions cache showing the install step under 1m (record a cold-cache run too if observed; cold stays registry-bound by design)

### Direct test coverage for src/secrets.ts hardening branches
- id: `rm-143` | track: reliability | priority: 54.0 | status: in-progress (implemented 2026-09-23, cycle-7 batch B2, unlanded)
- signals: `src/secrets.ts` implements symlink-follow refusal (O_NOFOLLOW), the ELOOP guard, FIFO rejection, a size cap, and trailing-newline strip — but no test file exercises it (`git ls-tree origin/main test/` has no secrets test; grep over test/ = 0 hits) despite it being the load-bearing file for critical invariant #3 (never commit or leak the App private key / cookie key)
- acceptance: new `test/secrets.test.ts` covering each branch — symlink refusal, ELOOP guard, FIFO rejection, oversize abort, trailing-newline strip, happy path — with ZERO executable changes to `src/secrets.ts`
- evidence: `git diff src/secrets.ts` empty; suite count grows by exactly the added cases; targeted `pnpm exec vitest run --pool=forks --maxWorkers=1 test/secrets.test.ts` green

### Latest-release column (per-repo releases datum)
- id: `rm-144` | track: capability | priority: 52.0 | status: candidate (added 2026-09-23, cycle-7)
- signals: research introspection (gh api graphql __type Repository) confirms `releases` is a readable field and `contents:read` is already minted (app-client.ts permission map) — zero permission change needed; the niche's reference tools treat release freshness as first-class (gh-dash 24.2k★, release-argus 5.3k★, both measured live 2026-09-23); origin/main aggregator query has no releases field
- acceptance: per-repo GraphQL query gains `releases(first: 1)` (name/tag/publishedAt/isLatest), DTO + UI column + README/API docs updated; denylist fail-closed and negative-cache semantics unchanged
- evidence: aggregator query diff + snapshot fixture deltas + aggregator suite green; one UI screenshot in the cycle batch doc

### Operator-contract lifecycle reconciliation with agent v0.114.x
- id: `rm-145` | track: reliability | priority: 50.0 | status: candidate (added 2026-09-23, cycle-7)
- signals: gateway runtime is fro-bot/agent v0.114.1 (origin/main #517) and its v0.114.0 release introduces background-task subagents on gateway surfaces plus "incomplete invocation" lifecycle-evidence semantics (gh api repos/fro-bot/agent/releases/tags/v0.114.0), but `src/gateway/operator-contract.ts` on origin/main contains no lifecycle/incomplete vocabulary — the dashboard's run-state model predates the gateway's
- acceptance: operator-contract run-state model reconciled against v0.107.1..v0.114.1 semantics (incomplete invocation, background subagent sessions); unknown or unversioned states render fail-closed with no invented transitions; contract types carry a version marker
- evidence: contract diff + a delta note vs the v0.78.0 reference recorded with the rm-147 refresh or in the cycle batch doc

### Server runtime hygiene batch
- id: `rm-146` | track: reliability | priority: 46.0 | status: in-progress (implemented 2026-09-23, cycle-7 batch B3, unlanded)
- signals: push-enabled `/` handler does a synchronous `readFileSync` + regex replace per request (`src/server.ts:753` on main); the startup banner uses `console.warn` instead of the logger (`src/server.ts:1097`); the aggregator cache Map never evicts entries for repos that leave the working set (unbounded growth, tiny footprint); `src/gateway/operator-client.ts:4-6` header doc claims "no live /operator/* calls" contradicting the live per-request session call (assess F4)
- acceptance: `/` HTML read memoized (startup render or mtime-keyed) with behavior locked by a test; `console.warn` → logger; cache eviction on working-set exit; stale operator-client header corrected — no other behavior change
- evidence: diffs + full suite green + a one-line timing note for the `/` handler before/after

### Cloned dependency source refresh (fro-bot__agent v0.78.0 → v0.114.1)
- id: `rm-147` | track: reliability | priority: 44.0 | status: candidate (added 2026-09-23, cycle-7)
- signals: AGENTS.md:83 pins the cloned reference at v0.78.0 while the runtime pin on origin/main is v0.114.1 (#517) — reference and runtime drifted 36 releases; releases are publicly readable (gh api repos/fro-bot/agent/releases → v0.114.1); supersedes the refresh half of rm-120's acceptance (its watch mechanic stays)
- acceptance: `.slim/clonedeps/repos/fro-bot__agent` refreshed to v0.114.1 (or nearest tag the tooling supports), AGENTS.md pin text updated, short delta note vs v0.78.0 for the mirrored surfaces (gateway OAuth return path, Hono build/serve split, logger/Result primitives)
- evidence: clone tag + AGENTS.md diff + the delta note (docs/solutions entry or batch doc)

### Deployments column (permission-gated capability)
- id: `rm-148` | track: capability | priority: 42.0 | status: candidate (added 2026-09-23, cycle-7)
- signals: `Repository.deployments` verified readable via the same introspection, but deployment states need `deployments:read` added to the minted permission subset — still read-only, yet a mint-map change (app-client.ts) is a governance decision, not a rider
- acceptance: mint-map diff adds deployments:read with graceful degradation when an installation lacks it (empty column, no error surface); UI column + docs; aggregator suite green
- evidence: mint-map diff + a degraded-mode test proving zero error surface when the permission is absent

### Riders and dated signals on existing items (cycle-7, 2026-09-23)
- `rm-112` (degradation semantics) — acceptance EXTENDED with three signals re-measured on origin/main: (1) `repository: null` responses are cached as a FRESH all-zero unknown status (`src/github/aggregator.ts:524` on origin/main — the `repo === null || repo === undefined` branch returning `rollupState: 'unknown'`) so an access revocation presents as a healthy quiet repo; (2) per-installation enumeration failures fail soft with no staleBanner (`src/github/installations.ts:194` rationale comment; the catches at `:203` listInstallations and `:221-237` per-install token mint on origin/main) leaving a silently incomplete snapshot; (3) the in-flight tick skip (`src/github/aggregator.ts:765` `if (refreshing) {` on origin/main; declaration at `:623`) lengthens refresh cadence with no staleness signal of its own. All three must surface a distinguishable degradation marker.
- `rm-123` (base digest watch) — dated signal: 2026-09-23 live `node:24-slim` index digest is `d8bb36de…` vs the in-tree pin `0e0ff40…` (6th drift event; docker manifest inspect); re-baseline the first-fire-red expectation when base-drift.yaml's weekly cron reaches this branch
- `rm-133` (TS7/vitest5 deferral) — dated re-measure 2026-09-23: typescript@7.0.2 still peer-blocked by the recorded `<6.1.0` gate; vitest@5.0.1 and jsdom@30.1.1 are npm-latest; eslint 10.11.0 absorbs free via upstream #516 at merge; deferral unchanged, next re-eval stays 2026-10-21 or the next vitest 4.2.x patch
- `rm-137` (action pin discipline, on origin/main) — TRUTHING: the pins-half payload has landed on origin/main (SHA pins observed live in visual.yaml via merge 37f28e7); the item's status line predates the landing — relocate to Completed at the next batch commit
- `rm-141` (bounded-concurrency fleet refresh) — CORRECTED 2026-09-23 (run 8f151ba4 implement, attempt c7c6b3b2): the earlier cycle-7 rider claiming FETCH_CONCURRENCY=6 on origin/main was a mis-attributed grep — `git grep -c FETCH_CONCURRENCY origin/main -- src/github/aggregator.ts` returns 0; main still runs the serial per-repo loop (`aggregator.ts:717` on main). The pool exists ONLY on the stranded local branch `conductor/run-a7ca03039406` (3 refs, certified write-tree per integrate-run history), unlanded. rm-141 therefore stays OPEN: outstanding work is landing/reimplementing the pool, then the determinism check (result assembly must not depend on pool completion order) and a before/after refresh-timing measurement
- README rider (fold into the next docs pass): origin/main README.md:48 still documents `GET /api/healthz` as returning `{ ok, lastFetch, rateLimit }` while the handler stubs those fields null (`src/routes/api.ts:80`) — NOTE: the README half of this rider is already implemented on the cycle-7 branch (B3), pending landing
- cycle-7 batch outcome (pre-review, 2026-09-23, run 8f151ba4): B1 rm-142, B2 rm-143, B3 rm-146 implemented on branch `conductor/run-8f151ba4ac47` (tree at 7809df6 + batch, unlanded). Validation: targeted vitest 550/550 over the six suites covering the three changed surfaces; FULL suite `pnpm test` 3133/3133 (root 2055 + web 1078) = prior gate 3115 + exactly the 18 new tests; check-types 0 errors; eslint 0 problems; actionlint exit 0. B4 rm-141 premise falsified (see correction above) — remains open with pool landing/reimplementation outstanding. Review/merge outcomes intentionally not recorded here; the next cycle's assessment carries them forward

## Completed items

### Port upstream security fix #481 — global redaction chokepoint
- id: `rm-122` | track: security | priority: 76.0 | status: completed (landed at 7de0de3 2026-09-20 — commit names rm-122 onError port; Main/CodeQL/Release/Scorecard all green at 7de0de3 06:14Z, verified run-f69cd740 prioritize)
- signals: upstream fro-bot/dashboard merged 876a02a (PR #481, 2026-09-19) — buildDashboardApp registers `app.onError` routing unhandled request errors through `logger.error` with `sanitizeErrorMessage` and a generic 500, plus 62 lines of tests; grep-verified 2026-09-20 (run 779e7271 research): no `app.onError` anywhere in fork `src/` — an unhandled throw reached Hono's default raw `console.error`, bypassing the logger.ts single-chokepoint redaction discipline (AGENTS.md invariant 2); the fork already imports `sanitizeErrorMessage` (src/server.ts:50), but its server.ts has diverged (fixture harness, ingest routes, rate limiter), so this is a hand port of intent, not a line-level merge
- acceptance was: fork's buildDashboardApp registers `app.onError` (sanitized log line + generic 500 body, upstream parity); upstream's test intent ported — a secret-shaped throw never reaches the response body nor the log raw; existing handler behavior unchanged; full suite green
- completion evidence: `pnpm test` green including the 2 ported redaction tests; grep shows onError registered in src/server.ts; cross-ref `git show 876a02a` and upstream PR #481
- implementation note (2026-09-20, run 779e7271 implement): `app.onError` registered in src/server.ts after the middleware chain, upstream shape (logger.error with sanitizeErrorMessage(err) + generic 500 text); 2 tests added to test/dashboard.test.ts porting upstream's intent (secret-shaped throw: never in the response body, never raw in the log); dashboard.test.ts 45/45 green locally. Landed at 7de0de3 2026-09-20 with Main/CodeQL/Release/Scorecard green 06:14Z (run-f69cd740 prioritize verification)

### Binding-docs metadata-source sync
- id: `rm-121` | track: reliability | priority: 63.0 | status: completed (landed at 7de0de3 2026-09-20 — commit names rm-121 binding-docs sync; all four binding surfaces + test-narration residue; CI green at 7de0de3 06:14Z, verified run-f69cd740 prioritize)
- signals: AGENTS.md, README.md, .github/copilot-instructions.md, and the src/github/metadata.ts:4 doc comment all said the redaction source repo is `fro-bot/.github` while src/server.ts has read `codeo1io/.github` since commit 4aa5d07 (2026-08-10) — the docs described a stricter configuration than what actually runs; the deferred IR-5 residue (test/server.test.ts:210/248/254/288 titles and comments narrating fro-bot/.github) still stood at aa4ff9f
- acceptance was: all binding docs name `codeo1io/.github` as the metadata denylist source (docs updated, not code — the code is correct); a grep over binding docs for the fro-bot/.github metadata claim returns nothing; metadata.ts doc comments and tests aligned in the same change
- completion evidence: grep output post-change across AGENTS.md, README.md, .github/copilot-instructions.md, src/github/metadata.ts; pnpm lint exit 0; pnpm test green
- implementation note (2026-09-20, run 779e7271 implement): AGENTS.md:18, README.md:65, metadata.ts:4, and .github/copilot-instructions.md:17 now read `codeo1io/.github`; test/server.test.ts metadata-topology titles/comments + fixture accounts aligned (4 sites, injection-based, assertions unchanged); grep for the metadata claim across binding docs and tests returns nothing (the two `fro-bot/.github#3525` hits in test/aggregator.test.ts are upstream issue-tracker references — different semantics, left). CAUTION: the run-779e7271 stewardship grep that called copilot-instructions.md "clean" was a pathspec miss (bare filename vs the .github/ path). Landed at 7de0de3 2026-09-20 with Main/CodeQL/Release/Scorecard green 06:14Z (run-f69cd740 prioritize verification)

### Server and docs hygiene batch
- id: `rm-124` | track: reliability | priority: 26.0 | status: completed (landed at 7de0de3 2026-09-20 — commit names rm-124 hygiene; 4 of 5 B5 items, fifth moot at aa4ff9f; CI green at 7de0de3 06:14Z, verified run-f69cd740 prioritize)
- signals: five verified small defects from the 779e7271 assess — `devAutoLogin` Guard A rejected only `production` though its comment promised an explicit development/test allowlist (src/server.ts — the fixture-harness guard implements the strict form, so the divergence was between two guards in the same file); `src/github/metadata.ts` silently skipped malformed entries while the promised `log count at end` was never implemented; OAuth state compared with plain `!==` (src/routes/auth.ts) where session verification uses `timingSafeEqual` — two guards, two disciplines; the trivy best-practices doc claimed `Renovate already keeps this pin current` — false on this fork (PR #1 deleted renovate.yaml; pins move by manual absorb + weekly dependabot); `Dockerfile:41` said dependabot.yml was `staged 2026-09-19` (moot: the sentence no longer exists at aa4ff9f)
- acceptance was: devAutoLogin allowlist matches its comment (unset NODE_ENV no longer passes, mirroring the fixture guard); the malformed-entry count is logged as promised; the state comparison is timing-safe; the stale doc sentence corrected; `pnpm lint` / `pnpm check-types` / `pnpm test` all green
- completion evidence: new tests for the guard allowlist and the skip-count log; cross-ref to the session.ts timingSafeEqual pattern; git diff of the doc line; full local suite green
- implementation note (2026-09-20, run 779e7271 implement): Guard A now requires NODE_ENV=development|test explicitly (+2 pinning tests, and Guard B's message aligned); metadata.ts counts skipped malformed entries and warns with skippedCount when >0 (+1 test asserting the warning and its count); the OAuth state compare is timingSafeEqual with a length guard (+3 tests: equal-length mismatch, wrong-length mismatch → 403 not 500, happy path); the trivy doc sentence replaced with the fork-accurate drift-is-expected wording; the Dockerfile item verified moot at aa4ff9f. Landed at 7de0de3 2026-09-20 with Main/CodeQL/Release/Scorecard green 06:14Z (run-f69cd740 prioritize verification)
### Upstream absorb batch 2026-09-20 (node 0e0ff40, hono 4.13.8, retire in-image patch)
- id: `rm-111` | track: reliability | priority: 92.0 | status: completed (2026-09-20; landed at 916783f, Trivy proof at aa4ff9f)
- acceptance was: upstream content absorbed with fork exclusions preserved (no write code path; stricter read-only doc wording); all three Dockerfile pins at 0e0ff40; in-image libpcre2 patch removed; frozen-lockfile install clean; Release Trivy zero HIGH at the pushed sha
- completion evidence: pins at 0e0ff40 + patch retired in 916783f (content absorbed as direct edits, upstream history intentionally still ahead — see rm-116's double-apply note); Release run 35491419600 completed success at aa4ff9f with '🚦 Enforce fixed HIGH/CRITICAL vulnerabilities' conclusion=success (image ghcr.io/codeo1io/dashboard@sha256:9e6cbb41…, exit-code:1 fail-on-findings mode, zero enforceable findings); suite 3018 green at landing; absorb recipe at `docs/solutions/workflow-issues/upstream-lockfile-content-merge-2026-09-20.md`

### Restore required gates green at HEAD on main
- id: `rm-100` | track: reliability | priority: 100.0 | status: completed (2026-09-20; cycle-2 arc closed at aa4ff9f)
- acceptance was: Lint, Check Workflows (fro-bot.yaml job-env gate), and CodeQL Analyze green at HEAD on main via the self-hosted posture
- completion evidence: Main green at aa4ff9f (run 35490785353 — Lint + Check Workflows + full suite); CodeQL green (run 35490785207, SEMMLE_TYPESCRIPT_HOME round 2 landed aa4ff9f); the gates fixes landed at 916783f/aa4ff9f (runs 270220e7); root-cause solution doc `docs/solutions/workflow-issues/codeql-semmle-typescript-home-2026-09-20.md`

### Aggregate complete check-suite counts
- id: `rm-110` | track: reliability | priority: 55.0 | status: completed (2026-09-20; landed at 916783f)
- acceptance was: checkSuites raised past 10 with a fixture proving full counting
- completion evidence: `checkSuites(first: 100)` in both query variants at src/github/aggregator.ts:137/:174 with a 12-suite regression test in test/aggregator.test.ts; suite count 3018 at the landing tree; Main green at aa4ff9f (35490785353); page-ceiling comment rider (f4622d7e IR-6) applied at both query sites in the run-779e7271 batch-2 tree

### CI pin hygiene micro-batch
- id: `rm-113` | track: reliability | priority: 40.0 | status: completed (2026-09-20; landed at 916783f)
- acceptance was: setup-node at v7.0.0; single checkout pin repo-wide; container actionlint exit 0; Main green at the pushed sha
- completion evidence: checkout unified at v7.0.1 and setup-node at v7.0.0 incl. the setup composite (916783f); Main green at aa4ff9f (run 35490785353)

### Document the Fro Bot workflow disable state
- id: `rm-109` | track: reliability | priority: 50.0 | status: completed (2026-09-19; landed on origin/main at 3075f4a)
- acceptance was: an ops note in binding docs records the disabled state, the reason (missing secret), and the re-enable prerequisites
- completion evidence: `AGENTS.md` Fro Bot ops-conventions block (line 68) cites `disabled_manually`, the missing `FRO_BOT_PAT`, and the re-enable precondition; present at origin/main HEAD

## Superseded items

### Add test coverage for 21 untested module(s)
- id: `rm-002` | track: reliability | priority: 100.0 | status: superseded (2026-09-19, run cf5527c1; resurrection by the 2026-09-20 fleet render reverted 2026-09-20, run 270220e7)
- original acceptance: every flagged module has a corresponding test file with at least one passing test; original evidence cited "CI: pytest collects the new test files"
- supersession rationale: all 21 flagged paths are under `.agents/skills/impeccable/scripts/**`, designated vendored by `eslint.config.ts` — work there is discarded on reinstall; the cited pytest evidence cannot exist in this Node 24/pnpm/Vitest repository. First-party coverage is not flagged as gapped by the assess cycles (3017 tests passing at 2f3a884; listener/aggregator paths covered directly or indirectly). Replaced by the vendored-path exclusion in `rm-104`; first-party coverage signals should regenerate from the fixed render.

### Refactor 21 high-complexity function(s)
- id: `rm-001` | track: reliability | priority: 90.0 | status: superseded (2026-09-19, run cf5527c1; resurrection by the 2026-09-20 fleet render reverted 2026-09-20, run 270220e7)
- original acceptance: each flagged function decomposed below the branch threshold with behavior locked by characterization tests; original evidence cited an "ast-based branch-count check in CI"
- supersession rationale: every flagged site is in vendored `.agents/skills/impeccable/scripts/live-browser.js` and siblings (same discard-on-reinstall problem); no ast-based CI check exists in this repository's stack. Replaced by `rm-104`; first-party complexity signals should regenerate from the fixed render.

<!-- managed by hermes-roadmap render; do not edit by hand -->
