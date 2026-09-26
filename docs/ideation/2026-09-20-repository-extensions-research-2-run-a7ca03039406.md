<!-- LANDING NOTE (2026-09-26, integration 6d785798d31e, conflict case e8b90ceb): this is run a7ca0303's research artifact, landed under a `-run-a7ca03039406` suffix because a PARALLEL cycle-3 run (f69cd740) authored the same-named doc on the same date and its landing owns the canonical path docs/ideation/2026-09-20-repository-extensions-research-2.md. Nothing this run researched survived unlanded: its selected units were all superseded or declined on main under landed ids (see the batch doc's LANDING HEADER at docs/prioritization/2026-09-20-cycle-3-batch-run-a7ca03039406.md for the full frame->landed map; notably the rm-130 healthz-population line was declined by rm-107's liveness-only design, and the rm-131 listener-SSE push-digest idea remains uncarried as a ledger item — main landed the polling-hygiene direction, rm-155). Original artifact follows unmodified. -->

---
date: '2026-09-20'
topic: 'repository-extensions'
focus: 'research_repository_extensions — cycle-3 refresh of the repository-extensions research lineage (engine labels this run cycle:1; repo lineage is the third refresh — see disclosure)'
mode: 'repo-grounded'
run: 'a7ca0303 (engine cycle:1), research phase; prior artifacts: docs/ideation/2026-09-20-repository-extensions-research.md (run 779e7271), docs/ideation/2026-09-19-repository-extensions-ideation.md'
---

# Repository-extensions research (run a7ca0303, 2026-09-20 evening)

Third refresh of the extensions lineage. Every prior candidate re-measured at
the live frame (origin/main = 7de0de3, fetched and verified this session);
new candidates admitted only with direct or external warrants. In-process
delegate (no subagent tool) — no candidate is claimed independently
corroborated. Lineage disclosure: the engine's cycle label for this run is
`cycle:1` (fresh maintenance lineage), but this artifact is the third
repository-extensions research refresh in the repo (2026-09-19 ideation →
2026-09-20 research run 779e7271 → this); numbering follows the file-suffix
convention established by the cycle-2 batch collision (batch-2 suffix).

## Headline changes since the morning research (run 779e7271)

1. **Upstream shipped the operator push privacy policy** — `30839c6` (#495,
   404-line plan doc) + `3f2fbe9` (#496, publish: server route +17 src lines,
   `web/privacy.html`, `web/src/privacy/{claims,content}.ts` with 258 test
   lines, AppShell link, sw.ts `/privacy/` deny-list, vite multi-page input).
   This was the explicit blocker noted on the carried listener-digest-push
   candidate ("policy should parallel the feature"). **That candidate is now
   unblocked, contingent on absorbing the policy first.**
2. **Upstream shipped a full `wiki-writer/` workspace package** — 20 files
   under `wiki-writer/` (contract, gate-contract, github-data-client,
   internal-auth, operation-ledger, retention, server + 674 test lines), with
   non-package references in 7 files (AGENTS.md, README.md, Dockerfile,
   pnpm-workspace.yaml, pnpm-lock.yaml, vitest.config.ts,
   .github/copilot-instructions.md). The fork's write-capability exclusion
   (#3206/#3210/#3242/#3255) is now a per-merge discipline over an entire
   subpackage, not a few Dockerfile lines.
3. **Upstream's sw.ts is no longer a kill-switch** — it is a 242-line
   deny-by-default fetch router (NetworkOnly for `/auth/*`, `/operator/auth/*`,
   `/api/*`; precache; NavigationRoute with a `/privacy/` denylist) plus a
   reworked ReloadPrompt (+80/+94 lines). The fork's kill-switch SW and
   vestigial workbox precache wiring (the "wire or remove" question) now has a
   concrete upstream answer to absorb rather than invent.
4. **Fork↔upstream divergence is now bidirectional and large** — 89 files,
   +6101/−2515. Fork-only surfaces (listener ingest HMAC + store, rate limiter,
   fixture harness, ideation/prioritization/solutions docs) show as upstream
   deletions; upstream-only surfaces (wiki-writer, privacy policy, PWA router,
   oauth/aggregator/metadata tweaks) as additions. Wholesale merge is off the
   table; absorb stays cherry-pick-shaped, and the cost curve is steepening.

## State transitions of prior candidates (re-measured at 7de0de3)

| Prior candidate (779e7271) | Status now | Evidence |
|---|---|---|
| 1. Absorb upstream #481 onError redaction chokepoint | **LANDED** | `git show 7de0de3` — ported with tests; `app.onError` present in fork src/server.ts; this run's assess re-verified the redaction path |
| 2. Upstream-absorb batch (6 commits) | **PARTIAL — hono + digest + checkout pins absorbed** | 916783f "restore main gates, absorb upstream drift": lockfile hono@4.13.8 (= npm latest, `grep hono@4.13.8 pnpm-lock.yaml`), Dockerfile pin 0e0ff40 with in-image libpcre2 patch retired, all 11 `actions/checkout` pins now v7.0.1@3d3c42e (morning inconsistency gone). NOT absorbed: privacy policy (#495/#496), clonedeps removal (#493 — still excluded per prior decision), sw/PWA router |
| 3. Operator self-observability panel | carried | No monitoring-of-monitoring surface landed; MonitoringDto freshness pieces unchanged (src/routes/api.ts:42-64) |
| 4. Roadmap-sync generator hardening | **PARTIAL — lint green, generator unfixed** | `pnpm lint` exit 0 at 7de0de3 (assess evidence); ROADMAP.md:8 still cites "pytest/ast evidence" (generator-side phrasing persists) |
| 5. SBOM + build provenance in Release | carried | `grep -ci 'sbom\|attest\|syft\|cosign' .github/workflows/release.yaml` = 0 |
| 6. Base-digest drift visibility workflow | carried (more urgent) | Live `node:24-slim` = sha256:5cbc7cab (manifest inspect, this session); fork AND upstream both pin 0e0ff40 — both behind live; fifth digest movement in ~10 days |
| 7. Listener digest push + watchlist | **UNBLOCKED (policy now exists upstream)** + watchlist refreshed below | #496 merged the policy; issue #238 remains open (rollout tracking). Fork PR surface: `gh pr list -R codeo1io/dashboard` still empty — first dependabot PR pending (~2026-10-03 window per rm-102) |

## Ecosystem (measured this session, 2026-09-20 evening)

- npm latest vs fork pin: hono 4.13.8 = 4.13.8 (current); react 19.3.0 =
  19.3.0; vite 8.3.0 = 8.3.0; tailwindcss 4.3.3 = 4.3.3; typescript 7.0.2 vs
  fork 6.0.3 (major available); vitest 5.0.1 vs fork 4.1.11 (major available);
  jsdom 30.1.0 vs fork 29.1.1; eslint 10.11.0 vs fork 10.10.0 (one minor).
- Docker: node:24-slim live digest sha256:5cbc7cab — unchanged since the
  morning measurement; both trees' pins (0e0ff40) lag live again.
- Actions: checkout pins now uniformly v7.0.1 (swept at 916783f). No other
  action-pin movement re-measured this session; trivy/scorecard/codeql pins
  unchanged from the morning read.
- Upstream open issues re-read: #494 daily report (irrelevant to fork — Fro
  Bot workflow `disabled_manually`, zero secrets), #238 push privacy policy
  (open, tracking), #193 OpenCode hook timeout, #112 dedicated infra App for
  dispatch (moot for the fork's no-secrets Release), #8 Dependency Dashboard.

## New candidates (evidence-backed)

### N1. Absorb the upstream operator push privacy policy (#495/#496)
**Warrant:** `direct:` — `git show 3f2fbe9 --stat` (server.ts +17, web/privacy.html
+87, claims.ts +239 with 199 test lines, content tests +59, AppShell +22,
Notifications +9, sw.test +51, vite.config multi-page input); `git log
origin/main..autonomy-upstream/main` lists it; issue #238 context. Absorb must
adapt to the fork's diverged server.ts (fixture harness, rate limiter) and
kill-switch sw.ts (fork lacks the deny-by-default router the upstream patch
deny-lists into — see N3 coupling).
**Why now:** prerequisite for the listener digest push (carried candidate 7);
also the only user-facing trust artifact for a push-consent surface that
already exists in-tree (VAPID infra, web/src/push/subscribe.ts).
**Complexity:** Medium. **Confidence:** 90%.

### N2. Standing wiki-writer exclusion guard (CI-enforced fork invariant)
**Warrant:** `direct:` — upstream tree now carries `wiki-writer/` × 20 files plus
references in 7 non-package files (`git grep -l 'wiki-writer' autonomy-upstream/main
-- ':!wiki-writer' ':!docs'`); the fork's invariant (AGENTS.md critical invariant 1;
memory rules #3206/#3210/#3242/#3255) is currently enforced only by per-merge human
discipline + the residue-sweep convention. An in-repo test (and/or workflow step)
that fails when `wiki-writer/` exists on the tree or any tracked file references it
converts the invariant into a mechanical gate — catching the exact failure class
that hid `COPY wiki-writer/package.json` behind an extension-filtered grep.
**Why now:** the exclusion surface just grew by an order of magnitude; every
future absorb touches it.
**Complexity:** Low–Medium. **Confidence:** 90%.

### N3. PWA offline router absorb (retire the kill-switch SW deliberately)
**Warrant:** `direct:` — `git diff origin/main..autonomy-upstream/main --
web/src/sw.ts`: upstream sw.ts is a deny-by-default router (NetworkOnly
/auth, /operator/auth, /api; precache; NavigationRoute denylist incl.
/privacy/) replacing the fork's 64-line kill-switch; ReloadPrompt +80/+94;
fork vite.config.ts precache wiring (globIgnores/index-rewrite) is the
vestigial half of exactly this design. The fork's kill-switch rationale
(hiding the server-side auth redirect) is answered by upstream's
NetworkOnly denylist for auth routes.
**Why now:** resolves the long-standing "vestigial workbox" architecture
question (#3836-class) by absorbing a tested upstream implementation rather
than building one; N1's sw deny-list change lands cleaner on top of it.
**Complexity:** Medium (offline behavior deserves its own verification pass:
registerSW lifecycle, update flow, PWA tests exist both sides).
**Confidence:** 80%.

### N4. Listener live stream (SSE) to replace 30s polling
**Warrant:** `direct:` — web/src/views/Listener.tsx:16 `POLL_INTERVAL_MS =
30000` and web/src/App.tsx:54 unread-count `setInterval(..., 30000)`; the
repo already maintains a browser SSE parser
(`public/operator-stream.js`, consumed via web/src/operator/runtime.ts) and a
server SSE reader for tests; listener store retention (500 rows/30d) ages
unwatched messages out while the UI can lag 30s behind ingest.
**Shape:** server-sent events on an auth'd listener channel (rate-limit-aware), reusing the existing parser pattern; digest push
(candidate 7) remains the offline complement.
**Complexity:** Medium. **Confidence:** 75% (depends on operator appetite
for latency vs. the current simplicity).

### N5. Aggregator fetch concurrency + cycle telemetry (extends assess F2)
**Warrant:** `direct:` — src/github/aggregator.ts:714-731 sequential per-repo
await loop; :717 CACHE_TTL_MS = 60_000 == :795 interval; assess-phase finding
F1/P2 (this run, attempt 4cc4d8dd). Research adds the roadmap framing: a
small bounded pool + slow-cycle logging also feeds candidate 3
(self-observability) — the same telemetry powers both.
**Complexity:** Low–Medium. **Confidence:** 90%.

### N6. Healthz real contract (extends assess F3)
**Warrant:** `direct:` — README.md:48 documents `{ok, lastFetch, rateLimit}`;
src/routes/api.ts:79-81 hardcodes nulls; no consumer asserts them (assess
greps). Wiring lastFetch/rateLimit to snapshot state makes healthz the
cheap substrate for candidate 3's freshness panel.
**Complexity:** Low. **Confidence:** 95%.

### N7. Node digest fast-follow 0e0ff40 → 5cbc7cab
**Warrant:** `external:` — `docker manifest inspect node:24-slim` this session
→ sha256:5cbc7cab; fork Dockerfile:1 pins 0e0ff40 (absorbed at 916783f);
upstream also 0e0ff40. Fifth digest movement in ~10 days; weekly dependabot
docker PRs (none yet) cannot pace this — reinforcing carried candidate 6.
**Complexity:** Low. **Confidence:** 95%.

### Watchlist refresh (carried, standing)
vitest 4.1.11 → 5.0.1 (major; `basic`-reporter and CAC hazards documented in
constraints #3211/#3233 make this a planned migration, not a ride-along);
typescript 6.0.3 → 7.0.2 (major); jsdom 29.1.1 → 30.1.0 (web-only); eslint
10.10.0 → 10.11.0 (minor). No action until a cycle picks one deliberately.

## Rejections this refresh

| Idea | Reason rejected |
|---|---|
| Absorb upstream `wiki-writer/` | Violates the fork's binding read-only invariant (AGENTS.md invariant 1; the package is a GitHub write surface). Excluded in every absorb, mechanically guarded by N2. |
| Wholesale upstream merge instead of cherry-pick absorbs | Bidirectional divergence (89 files, +6101/−2515) — a merge would attempt to delete fork-only surfaces (listener store, ingest auth, docs lineage) and drag the write package; absorb stays surgical. |
| Absorb #493 (clonedeps removal) | Unchanged from prior decision: fork deliberately keeps `.slim/clonedeps` as the gateway-contract reference clone. |
| Re-enable renovate / adopt upstream renovate workflow | Fork policy (PR #1: self-hosted only; renovate's reusable workflow delegates to hosted runners); dependabot already covers the window. |
| Node 26 base move | Node 24 remains in support; no forcing signal; unchanged from prior refreshes. |
| Self-monitoring via unilateral `repos.yaml` edit | Data file is upstream-owned; unchanged — surface own-repo state via fork-side config (candidate 3). |
| eslint 10.11.0 minor bump as its own roadmap item | Trivial; fold into the next dependency-touching absorb or wait for the first dependabot PR. |

## Sources

- `git fetch origin autonomy-upstream`; `git rev-list --count
  origin/main..autonomy-upstream/main` = 8; `git log --oneline
  origin/main..autonomy-upstream/main` (new: 3f2fbe9 #496, 30839c6 #495);
  `git show --stat 3f2fbe9 30839c6`; `git diff origin/main..autonomy-upstream/main
  --stat` (89 files, +6101/−2515); `-- web/src/sw.ts web/vite.config.ts`;
  `git grep -l 'wiki-writer' autonomy-upstream/main -- ':!wiki-writer' ':!docs'`;
  `git ls-tree -r autonomy-upstream/main --name-only | grep -c '^wiki-writer/'` = 20
- `npm view <pkg> version` ×8 (hono 4.13.8, vitest 5.0.1, typescript 7.0.2,
  eslint 10.11.0, jsdom 30.1.0, react 19.3.0, vite 8.3.0, tailwindcss 4.3.3);
  `grep -m2 'hono@4' pnpm-lock.yaml` → 4.13.8; package.json/web pins
- `docker manifest inspect node:24-slim` → sha256:5cbc7cab (this session)
- `gh pr list -R codeo1io/dashboard` (empty); `gh pr list -R fro-bot/dashboard`
  (empty); `gh issue list -R fro-bot/dashboard` (#494 #238 #193 #112 #8)
- In-repo: web/src/views/Listener.tsx:16, web/src/App.tsx:54,
  public/operator-stream.js, src/routes/api.ts:79-81, README.md:48,
  src/github/aggregator.ts:714/717/795, ROADMAP.md:8, .github/workflows pins
  (11× checkout v7.0.1@3d3c42e), Dockerfile pin 0e0ff40
- Prior artifacts: docs/ideation/2026-09-20-repository-extensions-research.md
  (run 779e7271), docs/ideation/2026-09-19-repository-extensions-ideation.md;
  this run's assess breadcrumbs .conductor/progress/4cc4d8dd1bb44dc0b9066bb10d215f43.ndjson
