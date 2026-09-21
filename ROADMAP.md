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
     manual-revision 2026-09-21 (run 5351fd4e, repository-maintenance cycle — repo research lineage
     cycle 4; research artifact docs/ideation/2026-09-21-repository-extensions-research.md, corrected
     same day: an initial fleet line mis-read fro-bot/agent as v0.79.0 — re-probed releases/latest and
     the release list both return v0.113.2 (2026-09-16); rm-120's v0.113.2 stands; the same artifact
     initially mis-read tailwind 4.2.4 — package.json:48 is 4.3.3, current): rm-125/rm-128/rm-130
     closed as completed at f334fb2 (verified: /privacy route src/server.ts:844 + claims tests,
     zero workbox in package.json, main.yaml:112 single-build note, metadata.ts:350 second count
     site, operator-client.ts refresh-then-resend retry with explicit rm-130 divergence comment);
     rm-103/rm-106/rm-108/rm-116 signals refreshed (drift 11; precondition landed; majors
     unchanged; protection EXISTS but is a shell — empty required checks); added rm-131..rm-134
     from the cycle-4 research (absorb #497 with #498-exclude/#499-moot ledger; aggregator refresh
     concurrency; minimumReleaseAge gate real-or-drop; binding-docs truthfulness batch 2).
     implementation 2026-09-21 (run 5351fd4e implement phase, compound entry): the full cycle-4
     batch B1-B5 implemented in stewardship worktree conductor/run-5351fd4e039a at a3bf45a
     (tree-identical to origin/main 9f978d1) — rm-126 docstring-truth + lock test, rm-131 #497
     absorb + ledger, rm-134 binding-docs truth, rm-133 minimumReleaseAge 1440, rm-123 base-drift
     workflow. Gates on the implemented tree: lint 0, check-types 0, 3071/3071 tests (2017+1
     server / 1054 web), actionlint container 0, frozen install clean. NOT YET LANDED — items stay
     'implemented pending landing'; the next cycle's assessment verifies the landing (commit sha,
     CI at that sha, first base-drift run) and only then moves them to completed.
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
- signals: drift recurs by design — 2 commits behind on 2026-09-19, 6 behind on 2026-09-20, 8 behind on 2026-09-20 second measure (run f69cd740 research: the two new commits 30839c6 + 3f2fbe9 are the privacy-policy feature absorbed as rm-125; everything else content-converged) (node digests churn ~daily; two tag rebuilds in 24h); absorption is manual-only; re-measured 2026-09-21 (run 5351fd4e research): drift 11, the three new commits are docs-only — #497 (Caddy extensionless-rewrite trap; absorb via rm-131), #498 (wiki-writer existence claim: true upstream, FALSE for this fork which has no wiki-writer/ — never absorb verbatim, invariant), #499 (privacy plan-doc correction: moot, the fork never carried the plan doc); upstream PR #481 (redaction chokepoint) MERGED upstream 2026-09-19 and ported by rm-122; upstream #493 (clonedeps-skill removal) must be SKIPPED on absorb — the fork keeps its clonedep artifacts deliberately as the v0.78.0 reference source (rm-120)
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

### Reconcile drift-identity reporting: count-only promise vs full_name on discovered repos
- id: `rm-126` | track: reliability | priority: 73.0 | status: implemented 2026-09-21 (run 5351fd4e implement: docstring corrected to the expose-and-document decision + driftCount/identity lock test; the `/api/monitoring` consumer decision (wire / fold into the rm-107/rm-119 status surface / delete with its tests) was NOT made — explicitly deferred to cycle-5, the B1 scope narrowed to docstring-truth + lock test only; worktree conductor/run-5351fd4e039a, pending landing + review — see cycle-4 batch addendum)
- signals: `src/github/aggregator.ts:12-19` docstring promises snapshot drift is reported "count only, never by repo identity", but RepoStatusDto carries `full_name` (aggregator.ts:86) and installation-only discovered repos enter the snapshot labeled `discovered` (aggregator.ts:418-419) — emitted by `/api/status` and `/api/monitoring`; during a metadata staleness window that can surface an un-redacted private repo name to authenticated clients; `/api/monitoring` additionally has no SPA consumer (grep shows only self-referential comments in `src/routes/api.ts`) since the operator-first re-architecture, so its exposure surface is maintained for nothing
- acceptance: one truth — either drift surfaces lose repo identity (count and count-by-class only, names stripped from discovered-only entries) or the docstring is corrected and an explicit operator decision to show names is recorded in the cycle batch doc; the `/api/monitoring` consumer question decided in the same change (wire it, fold it into the rm-107/rm-119 status surface, or delete it together with its tests); tests assert the chosen semantics for the discovered-only case
- evidence: `pnpm test` covering the chosen drift semantics; grep shows the docstring and DTO behavior agree; the consumer decision recorded in docs/prioritization/

### Listener digest push
- id: `rm-106` | track: operator-experience | priority: 70.0 | status: blocked-external (dependency discovery 2026-09-21, run 5351fd4e prioritize: the privacy precondition LANDED at f334fb2 as rm-125, but the push-SEND path lives in the GATEWAY, not this repo — the vendored contract src/gateway/operator-contract/push.ts models only GET /operator/push/vapid-key and GET /operator/push/subscriptions metadata; NO send/notify/dispatch endpoint exists in operator-contract/ and the dashboard never mounts /operator/push/* routes (src/server.ts:198-205, 342-347); landing digests requires a gateway-side (fro-bot/agent) contract extension FIRST — propose the digest-send contract upstream, then implement dashboard-side)
- signals: VAPID push infra is live for run events while listener messages (deploy-health, autoheal, Daily Maintenance Report per `docs/contracts/operator-listener-channel.md`) age out silently under the 500-row/30-day retention — the channel replaced GitHub issues but kept a "must watch a surface" burden
- unblock evidence (2026-09-20): upstream fro-bot/dashboard merged #495 (30839c6, plans the public operator push privacy policy) and #496 (3f2fbe9, publishes it: `web/privacy.html` +87, `web/src/privacy/claims.ts` +239, 258 lines of claims tests, a `/privacy` server route, AppShell link) — exactly the "published first or in the same change" precondition this item's acceptance names; landed 2026-09-20: rm-125 completed at f334fb2 (/privacy route at src/server.ts:844, claims module + tests in-tree, suite 3070)
- acceptance: push (rate-capped) or daily digest delivered on listener messages; noise calibration documented (what triggers immediate vs digest); upstream #238-style public push privacy policy published first or in the same change
- evidence: integration test covering the notify path in `pnpm test`; one live verified delivery to the operator's subscription; policy doc merged

### Operator system-status panel
- id: `rm-107` | track: operator-experience | priority: 65.0 | status: candidate
- signals: monitoring-of-monitoring signals exist but scattered — `refreshedAt`/`staleBanner` in the MonitoringDto, GitHub rate-limit hooks live but log-only (`src/github/app-client.ts:73-79` `onRateLimit`/`onSecondaryRateLimit`), listener store depth, nothing composes them; the 2026-09-20 assess needed out-of-band `gh` commands to learn CI was red; `/api/healthz` hardcodes its `lastFetch`/`rateLimit` fields to null placeholders (src/routes/api.ts) — liveness-only by design, confirming these signals belong in a composed status surface rather than healthz
- acceptance: one status surface composes snapshot freshness, rate-limit budget, listener store depth/age, and last refresh failures (fail-closed events); each composed signal has a test; no duplication of `/healthz` liveness semantics
- evidence: `pnpm test` includes tests for each composed signal; operator verification against a seeded stale snapshot renders the panel correctly

### Absorb upstream #497 with an exclusion ledger for #498/#499
- id: `rm-131` | track: reliability | priority: 62.0 | status: implemented 2026-09-21 (run 5351fd4e implement: #497 applied verbatim via `git apply`, #498-EXCLUDE/#499-MOOT ledger in batch doc; worktree, pending landing + review)
- signals: drift measured 11 on 2026-09-21 (`git log origin/main..autonomy-upstream/main`); the three new commits since the 2026-09-20 research are all docs — #497 (2941af0) adds docs/solutions/integration-issues/public-route-swallowed-by-caddy-extensionless-rewrite-2026-09-20.md (+128, absent fork-side) plus 6-line touch-ups to two solutions docs the fork carries (pwa-sw-registration, unit-green-not-done), and the fork serves `/privacy` + `public/` statics behind the same Caddy-class proxy topology the doc describes; #498 (d2510df) corrects a wiki-writer existence claim that is TRUE upstream but FALSE for this fork (no `wiki-writer/` exists here — verified `ls` + binding-docs grep zero — and the fork keeps stricter read-only wording by invariant, so absorbing it verbatim would corrupt the binding docs); #499 (d207fc7) corrects the upstream privacy PLAN doc the fork never carried (no docs/plans/2026-09-19* — moot)
- acceptance: #497's solutions doc hand-ported verbatim (docs-only, no executable surface); the two doc touch-ups applied where the fork's copies still carry pre-#497 text; the #498-EXCLUDE and #499-MOOT decisions recorded in the cycle batch doc's absorb ledger (rm-103 discipline) so a future history merge cannot re-apply them blindly; `pnpm lint` green (markdown rules)
- evidence: diff of the ported doc vs `git show 2941af0`; batch-doc ledger lines quoting the two decisions; grep shows the fork's binding docs still carry zero wiki-writer references post-port

### Dated major-upgrade decision matrix
- id: `rm-108` | track: reliability | priority: 60.0 | status: candidate (reframed 2026-09-20 from open-ended watchlist)
- signals: measured 2026-09-20 — typescript 6.0.3 → 7.0.2 (native compiler, announced 2026-07-08; 7.0 ships no programmatic API — typescript-eslint still needs 6.x via the `@typescript/typescript6` side-by-side package); vitest 4.1.11 → 5.0.1 (the 3→4 migration already cost a cycle; flags/`basic`-reporter breaks documented in solutions docs); jsdom 29.1.1 → 30.1.0; Node 26 enters LTS 2026-10 under the new annual schedule (every release LTS 30 months) while the image pins node:24-slim; everything else measured current (octokit modular, vite 8.3.0, react 19.3.0, tailwind 4.3.3, workbox 7.4.1); re-measured 2026-09-21 (run 5351fd4e research): majors unchanged (typescript 7.0.2, vitest 5.0.1, jsdom 30.1.0); minors available: eslint 10.11.0 vs fork 10.10.0; hono 4.13.8 = fork, vite 8.3.0 = fork, react 19.3.0 = fork, tailwind 4.3.3 = fork; node:24-slim live digest 5cbc7cab vs pinned 0e0ff40 (unchanged since 2026-09-20; rm-123)
- acceptance: this roadmap or a linked doc carries an adopted-vs-available table refreshed each maintenance cycle, each row with a trigger date, blast radius, and go/no-go decision recorded at the date; majors absorb via upstream merges where possible, otherwise explicit upgrade PRs — never a silent ride; REST API-version pin (`X-GitHub-Api-Version: 2022-11-28`, src/auth/oauth.ts:130) reviewed on the same cadence (protective pin — 2026-03-10 REST removals verified unexposed)
- evidence: `npm view <pkg> version` outputs cited at each refresh; each adopted-major bump shows a green Main run before merge

### Merge-hygiene baseline: required checks on main plus drift alert
- id: `rm-116` | track: reliability | priority: 58.0 | status: candidate
- signals: `gh api /repos/codeo1io/dashboard/branches/main/protection` returns 404 "Branch not protected" and `/rulesets` is empty (probed 2026-09-20; re-probed 2026-09-20 run f69cd740 — still 404); nothing structurally blocks red-check merges — PR #4 merged 2026-09-19 17:51Z with TWO red checks on its own run (35459324430) and its defects became the cycle's P1 findings (rm-100); repo is public on a User account, where required status checks and rulesets are available; SECOND INSTANCE 2026-09-20 (f4622d7e review): the fleet render 2f3a884 landed by direct push with its own run already red — a second red landing after PR #4's red merge; THIRD probe 2026-09-21 (run 5351fd4e roadmap): branch protection NOW EXISTS (API 200 where both 2026-09-20 probes returned 404) but is a shell — required_status_checks empty, enforce_admins disabled, zero rulesets, so nothing yet enforces any check; live corroboration: open PR #6's Main workflow failed twice on its own branch (runs 35536757064/35537213618, 2026-09-20) with nothing structural gating that state
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
- signals: REST actions/runs probed 2026-09-20 returning exactly the needed shape (latest runs at 5b8a2b3: Main=failure, CodeQL=failure, Scorecard=success); the 2026-09-19/20 gate reds sat invisible to operator-facing surfaces for ~26h (merged 17:51Z, found only by out-of-band assess); the dashboard renders check runs on commits but not workflow-level conclusions — and the week's failures lived at the workflow level (schema rejection before any check run existed); even the GOOD state needs this surface: the first fully-green tip (7de0de3, all four workflows green 2026-09-20 06:14Z) was itself only discoverable out-of-band via `gh run list`
- acceptance:
  - snapshot carries the latest conclusion per workflow at the default-branch tip (dedupe by workflow name, REST pagination with a documented ceiling — rm-110 discipline)
  - any red required-gate at the tip triggers the existing needs-attention surface
  - designed jointly with rm-107 as ONE status surface (repo gate health + monitor health), not two parallel panels — the joint-design decision recorded at plan time
- evidence: pnpm test for the roll-up path; fixture with multiple runs per workflow; manual verification against the live red Main/CodeQL state shows both surfaced

### Base-digest drift visibility: weekly read-only pin check
- id: `rm-123` | track: reliability | priority: 48.0 | status: implemented 2026-09-21 (run 5351fd4e implement: .github/workflows/base-drift.yaml, actionlint container exit 0; first run pending — Monday 04:13 UTC or dispatch; worktree, pending landing + review)
- signals: node:24-slim moved through four digests in ~8 days (2fe369e → a9d7043 #491 → 0e0ff40 #492 (the pin since rm-111 landed) → live 5cbc7cab at 2026-09-20, `docker manifest inspect`); dependabot docker updates are weekly (rm-102), so the pin can silently trail a rebuilt, security-fixed base for days — drift is detectable today only by hand-run manifest inspection (exactly how the 779e7271 assess found the old pinned 2fe369e shipping libpcre2 10.42-1 while the live base shipped 10.42-1+deb12u1)
- acceptance: weekly scheduled workflow compares each Dockerfile pin to the live tag digest and opens/updates ONE tracking issue on drift (title carries pinned→live digests); GITHUB_TOKEN only — the fork has no secrets; strictly read-only — it never bumps the pin itself (dependabot owns bump PRs, rm-102); the workflow passes the actionlint container gate
- evidence: actionlint container exit 0 on the new workflow; first run log shows pinned digest, live digest, drift verdict; a dry-run mode prints the issue text verbatim for review

### Aggregator refresh concurrency: bounded parallel per-repo fetches
- id: `rm-132` | track: reliability | priority: 47.0 | status: candidate (added 2026-09-21, run 5351fd4e research R3)
- signals: the refresh loop resolves every installation repo sequentially inside one cycle (src/github/aggregator.ts resolver path), so fleet growth linearly stretches snapshot wall-time and the refreshedAt freshness contract; the cache-TTL-equals-refresh-interval half of the scalability problem is already tracked by rm-112's absorbed acceptance — this item covers the serialization half; today's fleet tolerates it (small fleet, 60s cadence), which is why it is candidate-tier not urgent
- acceptance: per-repo resolution runs under a small bounded-concurrency pool (one documented bound, e.g. 4–8) with per-repo failure isolation preserved (one repo's failure never fails the whole refresh); refresh wall-time measured before/after on the fixture fleet; no new secondary-rate-limit hits in a normal cycle (app-client onSecondaryRateLimit log stays empty)
- evidence: `pnpm test` covering the pool's bound and failure-isolation behavior; a before/after timing note in the cycle batch doc; grep shows the bound constant defined exactly once

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

### Make the pnpm minimumReleaseAge gate real or drop its exclude list
- id: `rm-133` | track: security | priority: 43.0 | status: implemented 2026-09-21 (run 5351fd4e implement: minimumReleaseAge: 1440 with policy comment, @bfra.me excludes kept, `pnpm config get` → 1440; worktree, pending landing + review) — 7d form rejected: would block weekly dependabot PRs from merging until ~2026-10-03+
- signals: pnpm-workspace.yaml:8 declares `minimumReleaseAgeExclude` (@bfra.me pinned versions) but `minimumReleaseAge` is set NOWHERE — `pnpm config get minimumReleaseAge` → undefined; repo-wide grep (yml/yaml/json/ts/md, .github/, scripts/) finds exactly one hit (the exclude line itself); no env/npmrc override exists — the exclude list is inert config implying a supply-chain release-age gate that does not exist (autonomy-upstream/main carries the identical shape)
- acceptance: either `minimumReleaseAge` is set to a documented value (e.g. 7d) with the @bfra.me pins remaining excluded and a comment naming the policy, or the exclude block is deleted with a comment recording why the repo does not use the gate; frozen-lockfile install + full `pnpm test` prove the chosen shape; the decision recorded in the cycle batch doc
- evidence: pnpm-workspace.yaml diff; `pnpm config get minimumReleaseAge` output at the landing tree; suite green at the pushed sha

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
- signals: the cloned dependency source pins fro-bot/agent at v0.78.0 while upstream is at v0.113.2 — 75 releases of drift, with release bodies at v0.113.1, v0.113.0, v0.109.3, v0.107.1, v0.106.2 touching operator/gateway surfaces (gh api repos/fro-bot/agent/releases, 2026-09-20); AGENTS.md names this clone as the reference for the operator OAuth return path, GitHub App client, secret readers, and logger/Result primitives this app mirrors — and no process notices when that contract moves underneath the conformance tests; re-probed 2026-09-21 (run 5351fd4e roadmap): releases/latest AND the release list both return v0.113.2 (2026-09-16, prerelease=false) — unchanged since the 2026-09-20 probe, no new operator/gateway-touching releases
- acceptance: a periodic watch (checklist item in the maintenance cycle or a small workflow) compares the clonedep pin to the upstream latest tag; on drift, diffs the mirrored contract surfaces and records a short delta note (docs/solutions/ or the cycle batch doc) flagging conformance-test impact explicitly; the clonedep is refreshed on cadence, never auto-merged
- evidence: first watch output showing the v0.78.0→v0.113.2 delta summary with the operator/gateway-touching releases called out; the checklist/workflow merged

### Binding-docs truthfulness micro-batch 2 (badges, endpoints, stale comments)
- id: `rm-134` | track: reliability | priority: 32.0 | status: implemented 2026-09-21 (run 5351fd4e implement: badges → codeo1io/dashboard, Endpoints completed with /privacy + all four /api/listener routes, dependabot comment truthed, vite.config kill-switch comment; worktree, pending landing + review)
- signals: README.md badges point at fro-bot/dashboard (upstream) Actions/Scorecard, so the fork's README displays UPSTREAM health; the README Endpoints section omits `/privacy` and `/api/listener/*` (the operator push proxy routes correctly stay omitted — the server never mounts `/operator/push/*`, they live in the external gateway, src/server.ts:198-205); `.github/dependabot.yml` still says the shared fro-bot config in `.github/renovate.json5` — stale since 9f978d1 retargeted it to codeo1io/renovate-config; web/vite.config.ts:40 still says `createHandlerBoundToURL in sw.ts MUST reference the same URL` but sw.ts is the kill-switch with no precache handler (rm-128 residue)
- acceptance: badge URLs point at codeo1io/dashboard; the Endpoints section inventories every public + authenticated route at HEAD (cross-checked against isPublicPath and route registrations); the dependabot comment names the retargeted config and its inert state (Renovate never runs — rm-112); the vite.config comment rewritten for the kill-switch reality; `pnpm lint` green
- evidence: README/dependabot.yml/vite.config diffs; grep shows zero upstream badge URLs and zero stale-comment strings post-change; a route-inventory cross-check note in the batch doc

### CSRF tokens for listener ack mutations
- id: `rm-115` | track: security | priority: 30.0 | status: candidate (hardening; low severity)
- signals: `src/routes/listener.ts:121,130` accept session-authenticated state-changing POSTs (`/messages/:id/ack`, `/ack-all`) protected only by SameSite=Lax cookies, while logout already implements an explicit CSRF-token dance (`src/routes/auth.ts:168-190`) — an asymmetry; exploit window is narrow (Lax blocks cross-site POSTs except the fresh-cookie grace period) and impact bounded (ack state)
- acceptance: ack mutations require the same csrf-token pattern as logout (or equivalent origin check), with tests for the rejected cross-origin case; no behavior change for the operator's own client
- evidence: route tests in `pnpm test` covering token-missing rejection; manual operator flow unchanged

## Completed items

### Absorb the upstream operator-push privacy policy (#495/#496)
- id: `rm-125` | track: reliability | priority: 74.0 | status: completed (2026-09-20; landed at f334fb2 — commit names rm-125; Main/CodeQL/Scorecard green at 9f978d1, Release green at f334fb2 run 35523081051)
- signals: upstream drift grew 6 to 8 on 2026-09-20 and the two new commits were one feature — 30839c6 plans the public operator push privacy policy (upstream #495) and 3f2fbe9 publishes it (upstream #496); the fork had no first-party privacy surface, and the feature is the stated precondition for rm-106's listener digest push
- acceptance was: the policy feature hand-ported with fork layout (port intent, not a line merge — rm-122 discipline): a `/privacy` route serving the static policy page, claims module and tests green, AppShell link landed, drift accounting reflecting #495/#496 absorbed while #493 stays skipped per rm-103
- completion evidence: `/privacy` route at src/server.ts:844 serving web/privacy.html; web/src/privacy/claims.ts + claims.test.ts in-tree; AppShell privacy link present; suite 3018→3070 at f334fb2 (CI-confirmed on origin/main); Release run 35523081051 success at f334fb2
- implementation note (2026-09-21, run 5351fd4e roadmap verification): the fork diverged structurally from upstream — the kill-switch SW (web/src/sw.ts) has no NavigationRoute denylist (grep zero) and the upstream plan doc was never carried (no docs/plans/2026-09-19*), so upstream #499's plan-doc corrections are moot here; drift accounting at 2026-09-21: 11 upstream, #495/#496 content-converged, #493 skipped, #497/#498/#499 open (see rm-131)

### Drop the eight unused workbox runtime dependencies
- id: `rm-128` | track: reliability | priority: 34.0 | status: completed (2026-09-20; landed at f334fb2 — commit names rm-128; suite 3070 at f334fb2)
- acceptance was: the eight direct `workbox-*` devDependencies removed; vite-plugin-pwa retained only if still consumed; frozen-lockfile install clean; lint/check-types/test green; zero workbox imports repo-wide
- completion evidence: zero `workbox` hits in package.json at 9f978d1 (grep exit 1, re-run 2026-09-21); vite-plugin-pwa 1.3.0 retained and still consumed (web/vite.config.ts VitePWA injectManifest); gates green at 9f978d1 (check-types, lint, 3070/3070 tests — run 5351fd4e assess)
- residue note (2026-09-21, folded into rm-134): web/vite.config.ts:40 still says `createHandlerBoundToURL in sw.ts MUST reference the same URL` — sw.ts is the kill-switch with no precache handler; the comment describes code that no longer exists

### Server and CI hygiene batch 3
- id: `rm-130` | track: reliability | priority: 24.0 | status: completed (2026-09-20; landed at f334fb2 — commit names rm-130)
- acceptance was: one web build per test job; metadata skip counting extended to object-shape failures; CSRF-400 retry refresh-then-resend (or no retry) with a pinning test; gates green
- completion evidence (re-verified 2026-09-21 at 9f978d1): `.github/workflows/main.yaml:112` comment records the single-build decision ("No explicit Build web step: the pretest hook builds the client"); `src/github/metadata.ts:350` counts object-shape failures into skippedMalformedCount (increment sites :281/:350, warn at :355-357); `src/gateway/operator-client.ts:681-694` CSRF-400 retry refreshes via refreshCsrf() then re-sends with the SAME idempotency key, the v0.78.0-mirror divergence documented in the comment; suite 3070 at f334fb2

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
