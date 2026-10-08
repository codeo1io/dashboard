# Cycle-batch selection — run 91776e2597524e52941b715cf26300aa (repository-maintenance cycle 1), 2026-10-09

Base at selection: `546c93c` (== `origin/main`, fetch + `git ls-remote` re-verified
2026-10-09T00:49Z; porcelain-clean at dispatch apart from this run's roadmap
deliverable). Tree at selection: `M ROADMAP.md` (roadmap phase's 10-line
extension #38 + this phase's two selection flips and two selection riders,
uncommitted by design — commit phase prohibited this turn).

Prior prioritize attempt `2c0260cc` (provider failure) left nothing durable
(event log = progress pings only, typed artifact absent, no repo drift) — this
phase was REDONE first-hand; no adoption.

## Inputs

- Assess (attempt `f7232bfe`): all mechanical gates green first-hand at `546c93c`
  (check-types rc=0, lint rc=0, 3657 tests green). Findings F1–F4 mapped below.
- Research (attempt `2a7ccb67`): upstream 24 commits unabsorbed; registry movers;
  no new roadmap ids warranted (high-bar convention).
- Roadmap (this run): extension #38, ZERO-MINT, census 244 defs / 0 dups /
  max rm-778, guard pin 778.

## Selection floor — 'security visibility at flat API cost'

- **rm-117** (security, priority 70.0) — **lead**. Surface per-repo open-alert
  counts: Dependabot half is already landed by content (`query-registry.ts:51`
  `vulnerabilityAlerts(states: OPEN)` + `aggregator.ts:223/:703` with the
  permission-absent graceful fallback at `:738`); the remaining work is the
  code-scanning REST half (one call per repo per cycle, severity buckets only,
  behind the SAME optional-permission degradation), web rendering with a
  needs-attention trigger, and the rate-limit cost note. Live premise at
  selection: **49 open code-scanning alerts** on codeo1io/dashboard main
  (REST probe 2026-10-09T00:49Z; freshest #81 created 2026-10-08T08:48Z at
  commit `546c93c` — Trivy CVE-2026-78410; 63 at the 2026-10-07 rider), zero
  operator-facing surface shows them. `OPTIONAL_READ_PERMISSIONS`
  (`src/github/installations.ts:45-46`, security_events + vulnerability_alerts
  read) unchanged — implementable with zero new scopes, read-only invariant
  intact. The dead unlanded claim owning the secret-scanning extension (run
  `67868217`, failed 2026-10-07, rm-677) folds here BY CONTENT — no new mint.
  Triage clause stays operator-decision per the def's own framing.
- **rm-162** (performance, priority 60.0) — **complement**. Memoize installation
  resolution (explicit 404/TTL invalidation, zero resolver calls at steady
  state) + If-None-Match 304 discipline on the metadata contents read and
  repo-list pagination. Pair story: rm-117 adds one REST call per repo per
  cycle; rm-162 removes ≥1+N resolver calls per 60s cycle and turns repeated
  reads into free 304s — the batch delivers MORE security visibility at
  flat-or-better per-cycle API cost. Seams verified first-hand:
  `aggregator.ts:300/:1066-1102`, `server.ts:1427`, and no If-None-Match
  anywhere in `src/` today.

Effort: M + M, both server-side plus one bounded web render — within house
batch norms (cf. run 392bad29's twins+workflows 14-path batch, run 405e9004's
four-item batch). No policy gates, no soak windows, no push authority needed;
implementable and fully validatable end-to-end this cycle (implement → targeted
→ full_tests → read-only final_validation).

File-overlap vs live lanes (checked against each lane's batch doc / def flips):
aggregator/metadata/server seams are touched by NO live lane's batch
(e8c99e0e = web/src client surfaces; cb0cfe96 = src/github/auth.ts + listener
store; f510a33e = .github/workflows/main.yaml + ROADMAP; c37a8576 = workflows +
guard tests; 392bad29 = twins + workflows; 405e9004/tripwire lanes = Dockerfile
+ workflows). ROADMAP.md remains the shared congestion file (integrate-fold
obligation as usual).

## Claimed-and-excluded (congestion audit, probed 2026-10-09T00:36-00:49Z)

Live lanes via fleet runs tables (`status`/`current_phase_id`); claims via
all-worktree def-line scans:

- **F1 cve-tripwire NODE_IMAGE cure** (rm-755 content): owned by ≥6 lanes —
  32f33f1b rm-781 (selected, running), c37a8576 rm-689 (running full_tests,
  adopting 9fd8bcad's artifact by content), ddb41af7 rm-782 (implemented,
  validated pre-review, pending landing), 0cde5807 rm-784, 33b30ba2 rm-782,
  cb189044 rm-788, d1a0b216 rm-793, cbe70604 rm-779 (unselected claim). Never
  re-implement.
- **F2 focus re-probe bound/dedup (rm-487 remainder) + rm-501 logout half +
  rm-485**: e8c99e0e's selected batch 'client network-bound truth' (running
  implement) — verified their selection flips this cycle.
- **F3 listener.ts trailing newline**: folds into the next listener.ts touch —
  e8c99e0e's batch owns that file this cycle.
- **F4 Dockerfile HEALTHCHECK**: 405e9004 rm-742 (running full_tests) + rm-513
  standing DEFERRED (M effort, container-build acceptance, probes
  externally-defined).
- **rm-279 (96, lint-job decomposition)**: selected by f510a33e (running
  implement) — the one higher-priority free item got taken first.
- **rm-104 (98)**: actor is the upstream render fleet; in-repo recovery recipe
  already exists; third-recurrence rider is evidence-class — observation.
- **rm-102/rm-103/rm-282**: standing observation/process (dependabot
  auto-merge watch, absorb cadence, audit floors — Monday fires pending).
- **rm-252/rm-157 contract absorb**: gated on PR #448 (state OPEN,
  mergeable CONFLICTING, zero checks — stale residue from failed-at-ci lane
  9289efaa; disposition belongs to landing gates; window due 2026-10-13).
- **rm-116 branch-protection fill**: precondition (≥6 unlanded sibling builds)
  still violated — 20+ unlanded lanes in flight right now.
- **rm-149 PKCE + rm-187 listener corruption**: cb0cfe96 'PKCE auth hardening'
  (running targeted_tests).
- **rm-281 (62, CodeQL PKCE false positive)**: free but FILE-COLLIDES with
  cb0cfe96's live implement (test/auth-pkce.test.ts; src/github/auth.ts
  adjacency). Deferred one cycle — note for their full_tests: the bare GHAS
  CodeQL check on an ephemeral validation PR may flag the PKCE digest
  (js/insufficient-password-hash precedent) even though #448 currently shows
  zero checks.
- **rm-760 soak remainder** (vite 8.3.4 ≥12:07Z, @hono/node-server 2.1.4
  ≥04:42Z, @playwright/test 1.64.0 ≥20:44Z): minimumReleaseAge windows NOT yet
  open at selection time (00:49Z) — policy-gated to a later cycle; the
  playwright half is additionally owned content-wise by ddb41af7's implemented
  rm-785 (visual regen done per the in-image recipe).
- **Failed lanes' content** — 5bd710d8 (rm-745-750 operator UX) and f266ce30
  (rm-751/754 operator web/server) died at implement 2026-10-08T21:29
  (provider failure wave): re-implementable by content, but both are M-L
  operator-UX surfaces below the 70/60 pair in priority; left for later cycles.
- rm-512: superseded-by-content by rm-497's readBodyCapped (landed) — not a
  candidate despite its status token.

## Selection risk

- Roadmap-collision risk: rm-117/rm-162 selected by NO sibling as of 00:49Z;
  races resolve at integrate per house convention (our def-line flips and this
  doc are the selection record).
- GitHub-side risk: code-scanning REST may 403 where security_events:read is
  absent on an installation — that is the acceptance's own graceful-degradation
  clause, already patterned at aggregator.ts:738.
- No new permissions, no write paths, no workflow/Dockerfile touches —
  Monday's gate wave (base-drift 04:13Z, audit, tripwire 06:53Z) is untouched
  by this batch and covered by the owning lanes above.

## Verification

- `git diff ROADMAP.md`: exactly 2 def-line status flips (rm-117, rm-162 →
  `open (selected …)`) + 2 `selection rider` bullets, on top of the roadmap
  phase's 10-line extension.
- Guards: `CI=true ./node_modules/.bin/vitest run test/roadmap-integrity-guard.test.ts test/roadmap-length-guard.test.ts` green;
  `./node_modules/.bin/eslint ROADMAP.md` rc=0; `node scripts/roadmap-census.ts`
  still 244 defs / 0 dups / max rm-778 (selection edits don't move the census).
- Liveness/ownership probes: fleet runs tables (`runs` + `archived_runs` across
  campaign stores), all-worktree `status: open (selected` scans, `gh pr list`,
  `gh pr view 448`, `git ls-remote origin refs/heads/main`.
- Live premise: `gh api repos/codeo1io/dashboard/code-scanning/alerts?state=open`
  (49 open at 00:49Z; alert #81 freshest).
