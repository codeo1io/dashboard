---
date: '2026-09-20'
topic: 'repository-extensions'
focus: 'research_repository_extensions — upstream changes, ecosystem, user needs, standards; fresh refresh extending the landed 2026-09-20 research'
mode: 'repo-grounded'
run: 'f69cd740 (engine cycle 1), research phase; lineage disclosure: this is the THIRD repository-extensions refresh (2026-09-19 ideation → run 779e7271 research → this), numbered -2 to avoid the #4315 filename-collision hazard'
---

# Repository-extensions research (run f69cd740, lineage cycle 3)

Fresh refresh against live frame `7de0de3` (worktree synced and gates
re-verified green this run's assess phase: `pnpm check-types`, `pnpm lint`,
`pnpm test` = 3026 tests). Per project convention this delegate session runs
in-process (no subagent tool, #3768); warrants are `direct:` (reproduced /
measured this session) or `external:` (registry/API reads with timestamps).
Everything below was measured 2026-09-20 after the 7de0de3 landing — the
landed research doc (`docs/ideation/2026-09-20-repository-extensions-research.md`)
predates that tip and several of its candidates have since changed state.

## State transitions since the landed research (run 779e7271)

| Prior candidate | Status now | Fresh evidence (this session) |
|---|---|---|
| 1. Port upstream #481 onError chokepoint | **LANDED** (rm-122) | tip commit `7de0de3` is the port ("maintenance: port onError redaction"); suite grew 3018 → 3026 with its tests |
| 2. Upstream-absorb batch incl. base digest | **MOSTLY LANDED** (rm-111/rm-121/rm-124 direct edits) | Dockerfile pins `0e0ff40` with the in-image libpcre2 patch retired; pin verified healthy via `docker run node@sha256:0e0ff40… dpkg-query` → `libpcre2-8-0 10.42-1+deb12u1` |
| 3. Operator self-observability (rm-107/rm-119) | carried, **evidence strengthened** | first ALL-GREEN tip of the campaign (`gh run list` at `7de0de3`: Main/CodeQL/Release/Scorecard all success 06:14Z) — yet detection was still out-of-band `gh` runs, never the dashboard itself |
| 4. SBOM + provenance (rm-105) | carried | `grep -i sbom\|attest\|syft\|cosign release.yaml` → 1 hit = the #3317 readback comment only; no attestation steps exist |
| 5. Base-digest drift visibility (rm-123) | carried, **drift recurred** | live tag now `sha256:5cbc7cab…` vs pin `0e0ff40` (5th digest event in ~9 days; `docker manifest inspect node:24-slim` this session) |
| 6. Listener digest push (rm-106) | **UNBLOCKED** | upstream merged the public operator push privacy policy (#495 plan + #496 publish) — see below |
| 7. Major-upgrade watchlist | carried, unchanged majors | vitest 5.0.1 / TS 7.0.2 / jsdom 30.1.0 / eslint 10.11.0 available; none adopted |

## Upstream changes (fro-bot/dashboard, remote `autonomy-upstream`, fetched this session)

Drift is **8 commits** (was 6 in the landed research). The two NEW commits are
the headline:

- `30839c6` docs: plan the public operator push privacy policy (#495) — 404-line
  plan doc `docs/plans/…feat-operator-push-privacy-policy-plan.md`.
- `3f2fbe9` feat(privacy): publish the public operator push privacy policy
  (#496) — a real feature, not just prose: `src/server.ts` +17 (serves the
  policy page), `web/privacy.html` +87 (static page), `web/src/privacy/claims.ts`
  +239 with `claims.test.ts` +199 and `content.test.ts` +59 (machine-verified
  policy claims — the tests pin the published text to the actual data
  practices), `web/src/shell/AppShell.tsx` +22 (nav link), `main.yaml` +2.

  This is exactly the acceptance precondition ROADMAP rm-106 states for the
  fork's listener digest push ("upstream #238-style public push privacy policy
  published first or in the same change"). The fork has the VAPID
  infra in-tree and the listener store's 500-row/30-day retention aging
  messages out silently; the only blocker was policy, which upstream just
  published.

Older drift recap (content mostly converged by rm-111's direct edits, history
not merged — a future history absorb must not double-apply, per rm-103's note):
hono #488 4.13.8 (fork lockfile at 4.13.8 ✓), #489 codeql-action digest
(already pinned ✓), base digests #491/#492 (absorbed ✓), #481 onError (ported
as rm-122 ✓), and #493 clonedeps removal (**keep excluded** — fork deliberately
retains `.slim/clonedeps/` as the v0.78.0 reference source per AGENTS.md).

## Ecosystem (measured 2026-09-20, `npm view` / `gh api`)

- npm latest vs fork: hono 4.13.8 = 4.13.8 ✓; vite 8.3.0 ✓; react 19.3.0 ✓;
  `@octokit/auth-app` 8.3.1 ✓; `vite-plugin-pwa` 1.3.0 ✓; eslint 10.11.0 (fork
  10.10.0, one minor); jsdom 30.1.0 (fork 29.1.1, one major, web-only);
  vitest 5.0.1 (fork 4.1.11 — major available); typescript 7.0.2 (fork 6.0.3 —
  major available).
- Actions: `actions/checkout` v7.0.1 latest (fork unified at v7.0.1 ✓);
  `aquasecurity/trivy-action` v0.36.0 latest ✓; actionlint container line still
  tops out at 1.7.x (#4262) ✓.
- Competing approaches: `dlvhdr/gh-dash` 12,536★ (was 12,535), last push
  2026-09-08 — unchanged; still a terminal tool with PAT-scoped reads, not a
  GitHub-App-minted read-only web surface. The fork's niche (single-operator,
  read-only-by-construction, App-token, run-centric) remains unoccupied; no new
  entrant found this cycle.
- Standards: the privacy-policy pattern upstream adopted (machine-verified
  claims tests pinning the published policy text) is a transferable standard
  for any future data-touching feature the fork adds.

## User needs (in-repo demand signals, this cycle)

- Zero TODO/FIXME in `src/`; listener channel still has two producers and the
  retention window still silently ages messages out (rm-106 need unchanged).
- The all-green tip proves the gates CAN be green — but the operator still
  learns gate state only out-of-band (this campaign's every CI incident was
  found by hand-run `gh` commands during conductor phases). rm-107/rm-119's
  joint status surface is the structural answer; standing.
- This run's assess phase surfaced four NEW code-level needs not yet on the
  roadmap (candidates N3–N6 below): a drift-identity docstring contradiction
  with real DTO exposure, a gateway login-redirect topology trap, seven dead
  workbox dependencies, and a proxy-blind rate limiter.

## Ranked candidates (evidence-backed)

### N1. Absorb upstream #495/#496 privacy policy — unblocks rm-106 (absorb + feature track)
**Warrant:** `direct:` — `git fetch autonomy-upstream` → 8-commit drift with
`3f2fbe9`/`30839c6` new; `git show --stat 3f2fbe9` lists server route +
`web/privacy.html` + `web/src/privacy/claims.ts` (+239) with 258 test lines;
ROADMAP rm-106 acceptance literally names this policy as the precondition.
**Why now:** security/trust-relevant feature landed upstream with tests; the
fork's push-digest feature (rm-106) has waited on it. Absorb respects the
standing exclusions (#493 skipped; wiki-writer lines if the Dockerfile is
touched — it is NOT touched by #496, good).
**Complexity:** Low–Medium (port + keep fork's diverged AppShell/server
structure; claims tests are self-contained). **Confidence:** 90%.

### N2. rm-106 listener digest push — now actionable (standing, unblocked)
**Warrant:** `direct:` — VAPID infra live in-tree; listener store retention
500-row/30-day (`docs/contracts/operator-listener-channel.md`); blocker
(policy) resolved by N1; upstream #238-class concern answered by the policy's
claims tests.
**Shape:** rate-capped immediate push for deploy-health/autoheal classes,
daily digest for Daily Maintenance Report; noise calibration documented in the
same change. **Complexity:** Medium. **Confidence:** 80% (was gated; now
sequenced behind N1).

### N3. Resolve the drift-identity contradiction: docstring says count-only, DTOs carry repo identity (assess P2)
**Warrant:** `direct:` — `src/github/aggregator.ts:12-19` docstring promises
drift is "count only, never by repo identity"; `aggregator.ts:86` + `:418-419`
put `full_name` on every snapshot repo including installation-only
"discovered" ones; `/api/status` and `/api/monitoring` emit them
(`src/routes/api.ts` toMonitoringRepoDto); `/api/monitoring` additionally has
**no consumer** anywhere in `web/src` or `public/` (grep this session: only
self-referential comments in api.ts). In a metadata staleness window a newly
private-but-not-yet-denylisted repo would surface its real name to the
authenticated client — single-operator posture mitigates severity but the
docstring contract is violated today.
**Shape:** decide one truth — either scrub identity from drift/discovered
surfaces (align code to docstring) or amend the docstring AND repurpose
`/api/monitoring` (delete it, or fold it into the rm-107/rm-119 status surface
rather than maintaining an unconsumed endpoint with tests).
**Complexity:** Low–Medium. **Confidence:** 85% (contradiction reproduced; the
choice is a product decision for prioritize phase).

### N4. Gateway login-redirect topology guard (assess P2, robustness)
**Warrant:** `direct:` — `src/server.ts:111` defines
`GATEWAY_LOGIN_REDIRECT = '/operator/auth/github/start?return_to=/operator'`
as a RELATIVE path; the gateway-mode middleware redirects every
unauthenticated non-public request there; `isPublicPath` (server.ts:585-598)
does NOT include `/operator/auth/*`; the dashboard registers no handler for
that path (routes/operator.ts mounts only `/`). Works iff a same-origin
reverse proxy routes that path to the gateway (the issue-#70 comment implies
that topology); a standalone-dashboard deployment mis-set into gateway mode
produces a browser-terminating redirect loop with no server-side diagnostic.
**Shape:** fail-fast at startup (require an explicit same-origin-proxy
acknowledgement in gateway mode) or honor an absolute `resolvedGatewayOrigin`
for the login redirect. **Complexity:** Low. **Confidence:** 75% (loop is
code-verified; the intended deployment may make it unreachable in practice —
which is exactly why a guard is cheap).

### N5. Dependency hygiene: remove the seven dead workbox-* runtime deps (assess P3)
**Warrant:** `direct:` — `web/src/sw.ts` is a kill-switch (#3836) importing
nothing; repo-wide grep for `from 'workbox-…'` = 0 hits in `src/`, `web/src/`,
`test/` (only a comment in sw.ts and sw.test.ts); `package.json` carries
workbox-precaching/-cacheable-response/-expiration/-routing/-strategies/-window
(+7.x pins); `vite-plugin-pwa` vendors its own `workbox-build`, so the SW
build is unaffected. Dead deps invite dependabot churn for packages nothing
imports.
**Complexity:** Trivial. **Confidence:** 95%.

### N6. Rate-limiter fairness behind a trusted proxy (assess P3)
**Warrant:** `direct:` — `src/server.ts:520` comment: keyed on "the direct
connection remote address, not X-Forwarded-For (client-spoofable)" — sound
default; but behind the gateway reverse-proxy topology (N4) every client
shares the proxy address into one `checkRateLimit` bucket (server.ts:535),
so one noisy producer can throttle all ingest. An explicit opt-in
trusted-proxy mode (honor XFF only when configured) is the standard
middle ground. **Complexity:** Low. **Confidence:** 70%.

### N7. Small riders batch (assess P3s; fold into next hygiene PR)
- Main test job builds the web bundle twice — `main.yaml:112` ("🏗 Build web")
  plus `pretest: pnpm build:web` (package.json:17) — redundant minutes on the
  serialized single runner (#3264).
- `src/github/metadata.ts:331-344`: structurally-invalid PUBLIC entries
  (object but missing owner/name/node_id/discovery_channel) are skipped
  silently; `skippedMalformedCount` (line 281) counts only non-objects, so
  malformed volume is invisible to the skip warning at line 346.
- operator-client CSRF-400 retry reuses the SAME token
  (`src/gateway/operator-client.ts`, decideRunApproval/subscribePush) — the
  named cause (stale CSRF) can never be fixed by the retry; align with the
  upstream client's contract or drop the retry.
**Complexity:** Trivial each. **Confidence:** 90%.

## Rejections this cycle

| Idea | Reason rejected |
|---|---|
| Absorb upstream #493 (clonedeps removal) | Standing fork keep: `.slim/clonedeps/repos/fro-bot__agent` is the documented v0.78.0 gateway-contract reference (AGENTS.md section). |
| Adopt vitest 5 / TS 7 / jsdom 30 now | Majors with no repo need this cycle; watchlist standing (rm-108 reframed list); Typescript 7 especially is ecosystem-risky while eslint/parser chains sit at 6.0.3. |
| Add branch protection / rulesets as this cycle's item | Already rm-116 (standing, process decision); re-probed 2026-09-20 — still `404 Branch not protected`; not duplicated. |
| Renovate revival | Dead config documented under rm-112's absorbed signals; dependabot owns updates (rm-102, first PRs ~2026-10-03). |
| Node 26 / runner fleet / i18n | Unchanged from prior rejections (LTS window, host infra, no demand signal). |

## Sources

- `git fetch autonomy-upstream`; `git log --oneline origin/main..autonomy-upstream/main` (8); `git show --stat 3f2fbe9 30839c6`; `git show 3f2fbe9 --name-only`
- `gh run list -R codeo1io/dashboard --limit 8` (all four workflows success at `7de0de3`, 06:14Z); `gh api repos/codeo1io/dashboard/branches/main/protection` → 404 (2026-09-20)
- `gh api repos/{dlvhdr/gh-dash,actions/checkout/releases/latest,aquasecurity/trivy-action/releases/latest}`
- `npm view <pkg> version` ×10 (2026-09-20); `package.json` / `pnpm-lock.yaml` importers
- `docker manifest inspect node:24-slim` → sha256:5cbc7cab; `docker run --rm --entrypoint dpkg-query node@sha256:0e0ff40… -W libpcre2-8-0` → 10.42-1+deb12u1 (both this run's assess phase, re-cited)
- In-repo: `src/server.ts` (111, 520, 535, 585-598), `src/github/aggregator.ts` (12-19, 86, 418-419), `src/github/metadata.ts` (281, 331-350), `src/routes/api.ts`, `web/src/sw.ts`, `web/vite.config.ts`, `.github/workflows/main.yaml:112-116`, `package.json:17`, `ROADMAP.md` (rm-102..rm-124 standing), `.github/workflows/release.yaml:440`
- Prior artifacts: `docs/ideation/2026-09-20-repository-extensions-research.md` (landed 7de0de3), `docs/prioritization/2026-09-20-cycle-2-batch-2.md`; this run's assess breadcrumbs `.conductor/progress/12ad8962f3c64aadbd3aeb746293c834.ndjson`
