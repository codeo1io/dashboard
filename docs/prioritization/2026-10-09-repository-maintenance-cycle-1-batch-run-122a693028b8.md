---
date: 2026-10-09
topic: dashboard maintenance cycle 1 — scoring and batch selection
mode: delegated-conductor
run: 122a693028b84eaa95f86cbb86cc24bf
campaign: repository-maintenance:02c69b0f93c0447e8b1352eeb651929a
phase: prioritize
attempt: 0816fcf824ba4d0eb59ed7632a37ffc3
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent uses ce-plan for this shape). Deviations declared: no subagent surface in this session, scoring frames run in-process and disclosed.
---

# Dashboard maintenance — cycle 1 batch selection (2026-10-09)

Prior-attempt forensics: attempt 09f5b4fc901e4709bca96e7057778628 died ~45s in
of a provider failure with 2 messages logged and no typed artifact — no work to
adopt; this phase was executed from scratch.

## Live frame facts (re-measured this phase, not carried stale)

- Tip: `origin/main` = `364272b`, this worktree 0 ahead, clean apart from the
  roadmap phase's in-tree uncommitted extension (rm-822 mint + roadmap-integrity
  guard pin 822) — the handoff mechanism this fleet uses between phases.
- **GitHub Actions is disabled repo-side by GitHub enforcement since
  2026-10-09 ~02:00Z and still is at scoring time (12:12Z): zero workflow runs
  created after 01:59:31Z (`actions/runs?created=>02:00Z` total_count 0), and
  draft PR #479 (the 91776e lane's validation PR, created 11:16Z) has no checks
  registering.** Consequence for selection: any item whose acceptance requires a
  CI run to prove (release-pipeline triggers, CodeQL/lint-job timing, dependabot
  merges, gate-health reads of new runs) cannot complete end-to-end this cycle;
  batch acceptance must be locally provable (`pnpm check-types`, `pnpm lint`,
  targeted `vitest run`).
- Six live sibling batches mapped id-level on their walls (all 2026-10-09):
  - run-5989eb976c8b cycle:2 — `shell-cache-waitFor-sse-parity hardening`:
    rm-818, rm-819, rm-820 (shell cache, waitFor flake, SSE-reader watchdog).
  - run-155f9770aba4 cycle:3 — `oauth-pkce-hardening`: rm-149
    (src/routes/auth.ts; grep code_challenge is zero on main).
  - run-3eea27cbd1e3 cycle:2 — `push-metadata distinguishability + bounded
    logout`: rm-163, rm-501 (web/src/push/*, web logout chain).
  - run-6a97d6f78af6 cycle:3 — `non-push shell cache policy`: rm-802. NOTE for
    integrate: rm-802's subject overlaps 5989's rm-818 headliner (same-day
    double-selection); reconcile by content at integrate — neither is ours.
  - run-493bbbf2227c cycle:2 — `dep + action-digest currency refresh`: rm-137,
    rm-760 (codeql v4.38.3, upload-artifact v7.0.2, @hono/node-server 2.1.4;
    their doc conditions vite 8.3.4 on 24h maturity — that crossed at 12:07Z
    today, inside their implement window).
  - run-91776e259752 cycle:1 — full implemented content riding open draft PR
    #479: src/github/{aggregator,code-scanning,conditional-reads,
    installation-resolution,installations,metadata}.ts, src/routes/api.ts,
    src/server.ts, web monitoring views/suites. These file surfaces are
    keep-out for every other lane this cycle.
- Fresh unbatched mints on the run-8134eb2e6b13 wall: rm-823..rm-829
  (operator-stream pending-strand, timeout-family census items) — that lane's
  own upcoming batch's natural selection; not contested by us.
- Dep-refresh family ownership (from this run's roadmap phase, fleet ruling):
  rm-821@5989-wall + rm-807@155f-wall standing defs, rm-137/rm-760 live
  selection — no third claim minted by us; nothing to add here.
- cve-tripwire NODE_IMAGE drift (this run's assess F1, first scheduled fire Mon
  2026-10-12 06:53Z): owned by live rm-755 (5989 lineage) / rm-793 (dead
  sibling double-claim) under the fleet no-third-mint ruling — screened out
  with owners at roadmap; ALSO note the Monday fire will not run at all while
  Actions is disabled, which lowers the blast window but does not change
  ownership.

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rm-485 launchRun refresh-then-resend | 4 | 3 | 4 | 5 | 4 | 20 | SELECTED (headliner) |
| rm-822 fetchJson response-size cap | 3 | 3 | 5 | 5 | 3 | 19 | SELECTED |
| rm-703 release.yaml digest matrix (76.0) | 4 | 4 | 2 | 1 | 4 | 15 | DEFER — acceptance needs a release-pipeline trigger; Actions disabled |
| rm-104 render corruption (98.0, escalated) | 5 | 3 | 2 | 1 | 4 | 15 | DEFER — fix lives in the hermes-roadmap generator (external), not this repo |
| rm-117 security-posture panel (70.0) | 4 | 3 | 2 | 2 | 4 | 15 | DEFER — aggregator/code-scanning/monitoring surfaces owned by PR #479 |
| rm-279 lint-job decomposition (96.0) | 4 | 3 | 2 | 1 | 4 | 14 | DEFER — CI timing proof; Actions disabled |
| rm-153 session-validation cache (48.0) | 3 | 2 | 3 | 3 | 3 | 14 | DEFER — decision item + src/server.ts on PR #479's file list |
| rm-119 gate-health roll-up (52.0) | 4 | 3 | 2 | 2 | 4 | 15 | DEFER — needs actions/runs surface + aggregator/api files on PR #479 |
| rm-187 corrupt links entry (47.0) | 3 | 2 | 3 | 4 | 3 | 15 | DEFER — aggregator links-folding + metadata-store tests on PR #479's files |
| rm-651 web-suite test isolation (35.0) | 3 | 2 | 2 | 5 | 3 | 15 | DEFER — sound but separate theme; wants its own cycle, keeps this batch single-seam |
| rm-149 PKCE / rm-818–820 / rm-163+rm-501 / rm-802 / rm-137+rm-760 | — | — | — | — | — | — | EXCLUDED — live sibling selections (id-level, above) |
| rm-102/146 dependabot clause 2 (90.0) | 3 | 1 | 3 | 1 | 3 | 11 | DEFER — external clock; merges need CI; Actions disabled |
| rm-252 absorb family + agent paper-pin (80.0) | 3 | 2 | 2 | 2 | 3 | 12 | DEFER — absorb decision due 2026-10-13 (after this cycle); residue chores owned by rm-137/rm-760 |
| rm-157 operator-contract flip | 3 | 2 | 3 | 1 | 4 | 13 | DEFER — externally blocked: deployed infra pin v0.118.2 < required v0.118.3 |

## Selected batch — `operator-client hardening — launchRun retry parity + fetchJson size cap`

Two members, one seam: both live in `src/gateway/operator-client.ts` and pin
their tests in `test/operator-client.test.ts`. No file overlap with any live
sibling lane (rm-149 is src/routes/auth.ts; rm-163 is web/src/push/*; 5989's
batch is shell-cache/watchFor/sse-reader surfaces; 493bbbf2's is manifests and
workflow files; PR #479 is aggregator/metadata/server/monitoring). Zero
external landing dependencies; every acceptance line is provable with local
gates under the disabled-Actions window.

### B1. rm-485 — launchRun refresh-then-resend (reliability, 32.0)

Scope: wire the module's existing one-CSRF-400-retry-with-refreshed-token
helper (retry body at operator-client.ts:703-723, used by
decideRunApproval/subscribePush/unsubscribePush) into launchRun (:551-582,
which at :575 surfaces a stale-token 400 unrecoverably). The idempotency key
makes a retry safe by construction — the browser twin already retries on the
same key (public/operator-launch.js:529-544). Interface docs for all four
mutating methods state the contract (:252/:275/:285 + launchRun's). Tests pin:
400-then-refresh-200 retries exactly once with the SAME idempotency key; a
failed token refresh surfaces the ORIGINAL error; non-400 errors never retry.

### B2. rm-822 — fetchJson response-size cap at untrusted-buffer parity (security, 25.0)

Scope: `fetchJson` awaits `response.json()` with no size bound (operator-client
ts:489) — the operator path's only size-unbounded untrusted buffer; every
sibling input path is byte-capped (operator-sse-reader.ts:46
MAX_SSE_BUFFER_BYTES, server-fetch timeout). Shared hard-cap constant exported
from one home and imported by both consumers; typed size-error rejection that
PROPAGATES (the run cbe70604 wrapper-collapse lesson); Content-Length over-cap
and lying-Content-Length streamed-over-cap both pinned in tests. This closes
this lane's own assess F2 → rm-822 arc end-to-end within the campaign.

### Why this batch and not something bigger

- Every item above ~50 priority standing is either owned by a live lane's
  id-level selection, file-collides with PR #479's content, or needs a CI run
  / external clock to land — none is completable end-to-end this cycle.
- The batch is small by impact but maximal on landing certainty: one file, one
  test suite, zero congestion, zero integrate-conflict exposure — while the
  congested surfaces clear. It also retires a 9-day-old reliability asymmetry
  (rm-485, the last un-retried mutating method of the rm-130 family) and
  completes the untrusted-input byte-cap invariant across the operator path
  (rm-822), both of which compound with the live sse-parity work rather than
  racing it.

## Validation plan (phase-constraint aware)

Local gates only, per the disabled-Actions window: `pnpm check-types`;
`./node_modules/.bin/eslint` full repo; `vitest run test/operator-client.test.ts
test/roadmap-integrity-guard.test.ts test/roadmap-length-guard.test.ts` (the
operator-client suite does not hit `/`, so no pretest web build is required;
if any suite in the eventual run does, `pnpm build:web` first). The
full_tests/PR-validation route will be attempted by the validation phase but is
expected to be blocked GitHub-side (0 runs registering since 02:00Z) — the
local-gate evidence trail above is the cycle's completion evidence, and the
PR-route outcome must be recorded either way.

## Collision diligence record (id-level, first-hand 2026-10-09T12:1x–12:3xZ)

- rm-485: `candidate` in all 78 conductor walls (the lone `status: open`
  variant sits in dead wall run-e8c99e0ef791, not a claim); never selected
  anywhere; no 2026-10-09 batch doc mentions it.
- rm-822: exists on this wall only (this run's mint); 8134's rm-823..829 and
  every other wall's max-id scan show no fetchJson/response-cap def.
- Selected-vs-colliding file map: rm-149→src/routes/auth.ts,
  rm-163/rm-501→web/src/push/* + web logout chain, rm-818/819/820→shell cache +
  waitFor fixtures + SSE-reader, rm-137/rm-760→package.json/pnpm-lock.yaml/
  .github workflows, PR #479→src/github/aggregator + metadata + api.ts +
  server.ts + web monitoring. None intersects src/gateway/operator-client.ts
  or test/operator-client.test.ts.
- Open-PR sweep: exactly one open PR (#479, draft); diff read file-by-file —
  carries the 91776e lane's full content; three older ci-* PRs all closed.
