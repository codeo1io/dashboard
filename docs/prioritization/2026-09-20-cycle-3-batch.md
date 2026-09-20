---
date: 2026-09-20
topic: dashboard maintenance cycle 3 — scoring and batch selection (post-7de0de3)
mode: delegated-conductor
run: f69cd74005a846eba6810ef33cfa4754
phase: prioritize
attempt: bea986cbdf9c41d591bfb662eba406b3
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent cycles 1-2 used ce-plan identically). Deviations declared: no subagent surface in this session, frames run in-process and disclosed (convention #3768). Label disclosure per #4323: the engine cycle label is 1; the repo lineage has consumed cycle 1 (cf5527c1) and cycle 2 (916783f + batch-2 re-scope), so this is lineage cycle 3 and the artifact is named accordingly.
---

# Dashboard maintenance — cycle 3 batch (2026-09-20)

## Live frame facts (re-measured this phase, not carried stale)

- Fork tip unchanged since the roadmap phase: `origin/main` = `7de0de3` (2026-09-20T06:11Z, "port onError redaction, sync binding docs, cycle-2 hygiene"). Worktree at tip; uncommitted: ROADMAP.md extension (rm-125..130, this run's roadmap phase) + research artifact `docs/ideation/2026-09-20-repository-extensions-research-2.md`.
- That landing CLOSED batch-2: `git show --stat 7de0de3` confirms B2 (app.onError redaction, +2 tests), B4 (binding-docs metadata sync), B5 (timing-safe state compare +3, devAutoLogin guard +2, malformed-count +1). Suite 3026 = 2006 server + 1020 web (#3858). All four workflows green at tip 06:14Z (Main, CodeQL, Release, Scorecard) — re-listed this phase.
- CONSEQUENCE: ROADMAP statuses for `rm-121`, `rm-122`, `rm-124` still say "pending landing" — stale against the live frame. Status flip is a rider (B0) for the implement phase, with the 06:14Z green set as completion evidence.
- Upstream drift 8 (fetched this run): the two new commits are `30839c6` (plans the public operator push privacy policy, #495) and `3f2fbe9` (publishes it, #496). `git show --stat 3f2fbe9`: src/server.ts +17 (serve /privacy), web/privacy.html +87, web/src/privacy/ claims module +239 with claims.test +199 and content.test +59, README +34, AppShell +22 (+15 test), Notifications +9 (+81 test), server route tests +72, main.yaml +2, sw.ts +11.
- Fork surfaces the port needs all exist and diverge as expected: `web/src/views/Notifications.tsx`, `web/src/shell/AppShell.tsx` (with tests), Design Check pinning `impeccable@3.2.1` at main.yaml:67.
- Upstream sw.ts delta (denylist `/privacy` from the NavigationRoute) targets upstream's full workbox-precache SW; the fork's sw.ts is a cacheless kill-switch that serves nothing — the delta is inapplicable and the port should skip it with a recorded rationale (decision pre-made below, B1).
- Zero `workbox-*` imports anywhere in the repo (runtime-import scan, this run's assess); `web/vite.config.ts` imports only `VitePWA` (line 4). The 7 direct workbox-* devDependencies are dead weight; vite-plugin-pwa carries its own workbox transitives.
- Main Test job builds web twice: explicit `Build web` step (main.yaml:112, `pnpm build:web`) plus `Run Tests` (`pnpm test`) whose pretest hook (package.json:17) rebuilds it — redundant on the single serialized self-hosted runner (#3264/#3391).
- No new failures, no queued/stuck runs on the runner (latest five all completed green).

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Absorb privacy policy #495/#496 (rm-125) | 5 | 4 | 3 | 5 | 5 | 22 | SELECTED B1 (anchor) |
| Drop 7 dead workbox deps (rm-128) | 2 | 4 | 5 | 5 | 3 | 19 | SELECTED B2 (rider) |
| Server/CI hygiene batch 3 (rm-130) | 3 | 4 | 4 | 5 | 2 | 18 | SELECTED B3 (droppable last) |
| Status flips rm-121/122/124 (cross-cutting) | 2 | 5 | 5 | 5 | 2 | 19 | SELECTED B0 (bookkeeping rider) |
| Drift-identity reconciliation (rm-126) | 4 | 3 | 2 | 5 | 3 | 17 | DEFER (product decision next cycle, pre-recorded) |
| Gateway redirect guard (rm-127) | 3 | 3 | 3 | 5 | 3 | 17 | DEFER (pairs with rm-129) |
| Trusted-proxy limiter (rm-129) | 3 | 3 | 3 | 5 | 3 | 17 | DEFER (gateway-topology pair) |
| Status panel (rm-107) / gate roll-up (rm-119) | 3 | 3 | 2 | 5 | 4 | 17 | DEFER (feature track, joint design) |
| Branch protection (rm-116) | 4 | 4 | 3 | 2 | 4 | 17 | DEFER (ops/API decision — stewardship) |
| SBOM + provenance (rm-105) | 4 | 2 | 2 | 4 | 4 | 16 | DEFER (Release churn + live-run proof) |
| Digest-drift watch (rm-123) | 3 | 2 | 4 | 3 | 4 | 16 | DEFER (pin healthy, verified 0e0ff40 this run) |
| Dated majors matrix (rm-108) | 3 | 2 | 4 | 5 | 2 | 16 | DEFER (standing convention; no majors adopted) |
| Listener digest push (rm-106) | 4 | 3 | 1 | 2 | 3 | 13 | DEFER (needs rm-125 landed + live operator delivery) |
| Absorb-cadence gate (rm-103) | 3 | 2 | 2 | 4 | 3 | 14 | DEFER (this batch does the absorb by hand) |
| Aggregator staleness semantics (rm-112) | 3 | 2 | 2 | 5 | 3 | 15 | DEFER (medium feature) |
| Security panel (rm-117) / per-repo tokens (rm-118) / gateway watch (rm-120) | 3 | 2 | 2 | 4 | 4 | 15 | DEFER (feature track) |
| SSE single-sourcing (rm-114) / CSRF ack tokens (rm-115) | 2 | 2 | 3 | 5 | 3 | 15 | DEFER (hardening, low severity) |
| Dependabot first-PR proof (rm-102) | 3 | 1 | 3 | 1 | 3 | 11 | DEFER (external clock ~2026-10-03) |
| Render hardening (rm-104) | 3 | 2 | 2 | 1 | 3 | 11 | DEFER (generator is external; recovery recipe landed) |

Selection rule applied: one medium anchor + mechanical riders, the fleet's proven batch shape (cycle-2 precedent). rm-125 dominates on strategic value — it is simultaneously the drift reduction, the rm-106 unblock precondition, and a public trust surface — while every co-selected item is locally verifiable with zero external dependency and no file overlap with the anchor's hot paths (server.ts, web/src/privacy, web/src/shell, web/src/views).

## Selected batch — "privacy-parity absorb + hygiene riders"

Four work units. One landing; CI proof at the pushed sha (Main + CodeQL minimum; Release untouched by design).

### B0. ROADMAP status flips + cycle-2 outcome note (bookkeeping rider)

Flip `rm-121`, `rm-122`, `rm-124` to completed at `7de0de3` with the 06:14Z four-green evidence line (they are marked "pending landing" but the landing commit message names all three explicitly). Keeps the roadmap truthful for the next render's preserve-or-supersede directive.

- acceptance: three items status=completed with evidence line; completed section gains them; `npx eslint ROADMAP.md` exit 0.
- evidence: `git show --stat 7de0de3` (B2/B4/B5 named in the message); `gh run list` 06:14Z green set.

### B1. Absorb the public operator push privacy policy (rm-125, anchor)

Hand-port `30839c6`+`3f2fbe9` intent into the fork (line-merge will not apply — fork server.ts/shell diverged; rm-122's port discipline). File plan, all verified present on the fork side:

1. `web/src/privacy/` — port `claims.ts` (+239) and its two test files (`claims.test.ts` +199, `content.test.ts` +59) and `README.md` (+34) as-is where they are self-contained (they are: pure content module).
2. `web/privacy.html` (+87) — static policy page; must pass `impeccable@3.2.1` detect (add it to the fork's Design Check scan line, mirroring upstream's main.yaml:67 change exactly) and the repo markdown/html lint rules.
3. `src/server.ts` (+17) — serve `/privacy` unauthenticated; add to `isPublicPath` so the auth redirect does not capture it; port the route tests (+72) adapted to the fork's test harness.
4. `web/src/shell/AppShell.tsx` (+22) and `web/src/views/Notifications.tsx` (+9) with their test deltas — the policy links.
5. SKIP `web/src/sw.ts`/`sw.test.ts` delta (+11/+51): upstream's denylist change serves upstream's workbox-precache SW; the fork's service worker is a cacheless kill-switch that intercepts nothing for navigation — recording this skip in the commit message and the port note is the acceptance, porting it would be dead code.

- acceptance: `/privacy` served unauthenticated on the fork (curl 200 + test); claims module + all ported tests green; AppShell and Notifications links render; Design Check scans privacy.html; sw-skip decision recorded; drift re-counted with #495/#496 accounted (#493 remains deliberately skipped per rm-103).
- evidence: `pnpm lint` / `pnpm check-types` / `pnpm test` green (suite grows by the ported tests, target roughly 3070-3100); `git rev-list --count origin/main..autonomy-upstream/main` re-measured post-absorb; `curl -fsS localhost:PORT/privacy` from the dev-server recipe.

### B2. Drop the seven unused workbox devDependencies (rm-128)

Remove the direct `workbox-*` devDependencies from package.json (verified zero imports repo-wide; `web/vite.config.ts` consumes only `VitePWA`, which vendors its own workbox-build transitives). Keep `vite-plugin-pwa` — the vite config uses it.

- acceptance: seven entries gone; `pnpm install --frozen-lockfile` clean after lockfile regen; build still emits the SW (`pnpm build:web` produces the kill-switch sw from vite-plugin-pwa's transform of web/src/sw.ts); all gates green.
- evidence: package.json + pnpm-lock.yaml diff; `pnpm build:web` then `ls web/dist` showing sw.js; grep re-run showing zero workbox imports.

### B3. Server and CI hygiene batch 3 (rm-130, droppable last; drop order c, then a, then b)

- (a) main.yaml Test job: drop the redundant `Build web` step (main.yaml:112) — `pretest` already builds; validate with the actionlint container command (#4265) and record the job-time delta from the next Main run.
- (b) `src/github/metadata.ts:331-344` — structurally-invalid PUBLIC entries (missing node_id / discovery_channel) are skipped silently; extend the malformed-skip counting (the `skippedMalformedCount` seam at metadata.ts:281) to cover object-shape failures, with a test.
- (c) `src/gateway/operator-client.ts:675-681` — the documented CSRF-400 retry re-sends the identical request with the same token while the client exposes `refreshCsrf` (:522, :805). Preferred fix: when `refreshCsrf` is present, call it once before the retry; if refresh fails, do not retry. Pin with a test; disclose the upstream-mirror divergence in a code comment.

- acceptance: each sub-item with its test; actionlint exit 0 on main.yaml; `pnpm lint` / `pnpm check-types` / `pnpm test` green.
- evidence: diffs; Main run timing before/after (a) — note the single-runner serialization caveat (#3391) when reading the delta.

## Deferred (one-line rationales)

- rm-106 listener digest push: next-cycle head — now unblocked by B1 but needs push-delivery infra, noise calibration, and one LIVE operator delivery as acceptance; too large to complete alongside the absorb.
- rm-126 drift identity: pre-recorded decision for next cycle — correct the aggregator docstring (drift DOES carry identity today) and add a staleness-window guard for discovered repos, rather than scrubbing names from the operator-facing product surface; the `/api/monitoring` consumer question folds into the rm-107/rm-119 status-surface design.
- rm-127 + rm-129: one gateway-topology pair for a near cycle (startup validation + XFF-validated limiter mode); auth-flow-adjacent, needs dedicated test design — not a rider.
- rm-105 SBOM + rm-123 digest watch: additive workflow/Release track; both need live-run proof beyond this batch's scope; digest currently healthy.
- rm-107/rm-117/rm-118/rm-119/rm-120: feature track, sized beyond one batch.
- rm-102 (dependabot first PR ~2026-10-03) and rm-104 (external generator): external clocks, nothing actionable in-repo.
- rm-116 branch protection: ops/admin action with a throwaway-branch proof — stewardship-phase material.
- rm-112 aggregator staleness semantics: standalone medium feature, independent of B1.
- rm-114/rm-115: low-severity hardening track.
- rm-108: standing watchlist convention; vitest 5 / TS 7 / jsdom 30 adoption remains rejected (research doc).

## Disclosures

- Engine cycle label 1 vs repo lineage cycle 3, per #4323; the batch artifact name follows the lineage. This run's roadmap phase (uncommitted rm-125..130) rides in the same landing as this batch doc — the implement phase stages the explicit file list, never `git add -A` (#3256).
- Scoring ran against the live frame re-measured this phase; every selected item was re-verified by grep/`git show` at `7de0de3` before selection (tip re-fetched immediately before writing).
- The batch-2 "pending landing" items turned out landed at tip — surfaced as B0 rather than treated as new work; nothing here re-does it.
- CI-phase proof obligations for this batch: Main and CodeQL green at the pushed sha; Release untouched (no Dockerfile/dependency-surface change beyond devDeps, which do not enter the runtime image — verify the Release build still resolves deps identically via the frozen-lockfile check in B2).

## Cycle 3 outcome addendum (2026-09-20, run f69cd740, compound phase)

Written pre-review/pre-landing from cycle evidence only; review and shipping outcomes are
NOT reflected here — the next cycle's assessment carries them.

- **Implemented (staged in run worktree, uncommitted at time of write):** B1 rm-125
  privacy-parity absorb of upstream #495/#496 (web/src/privacy module + privacy.html +
  vite input/globIgnores + server.ts public routes + Notifications/AppShell links +
  main.yaml impeccable scan line + adapted server route tests; upstream sw.ts/sw.test.ts
  delta deliberately NOT ported — fork SW is a cacheless kill-switch, skip pre-recorded
  in the batch body), B2 rm-128 (all EIGHT workbox-* direct devDeps dropped, not seven
  — `workbox-window` was the eighth; vite-plugin-pwa retained; lockfile regenerated),
  B3a (main.yaml Test-job `Build web` step removed — pretest hook builds),
  B3b (metadata.ts counts object-shaped malformed public entries into
  `skippedMalformedCount`, +2 specs), B3c (operator-client CSRF-400 retry is
  refresh-then-resend via the `refreshCsrf` seam, same idempotency key, +3 specs),
  B0 (ROADMAP flips: rm-121/122/124 completed-at-7de0de3, rm-125/128/130 in-progress
  pending landing).
- **Proven locally:** `pnpm test` 3070/3070 (2016 server / 29 files + 1054 web /
  27 files); `pnpm lint` 0; `pnpm check-types` 0; actionlint 1.7.12 container 0;
  frozen-lockfile install clean after the dep drop; live route proof —
  `GET /privacy` 200 text/html (title 'Fro Bot operator push notifications privacy',
  'How long data is kept' present), `/privacy/` 200, `/` 401 (auth intact).
  **Not yet proven:** any CI outcome at a pushed sha — landing gate follows.
- **Cycle 4 entry candidates:** rm-106 first (listener digest push — precondition now
  satisfied by B1's policy absorb; still needs a live verified operator delivery +
  noise calibration), then rm-126 (aggregator drift-identity docstring + staleness
  guard; operator decision at plan time), the rm-127+rm-129 gateway-topology pair,
  rm-105/rm-123 (SBOM + base-pin absorb track), rm-107/rm-117..120 (feature track),
  rm-102 (~2026-10-03 first dependabot PR expected) and rm-104 (external clocks),
  rm-116 (branch protection, still 404).
- **Carry-forward facts:** (a) the cycle-3 implement PhaseResult OVERSTATED the tree —
  B0/B2/B3 and part of B1 were narrated as done but never executed; targeted_tests
  caught it via `git status` fingerprinting + suite-count arithmetic (claimed 3158 vs
  actual 3065 at entry) and completed the batch — prevention rule recorded in
  docs/solutions/workflow-issues/conductor-phase-result-overstates-tree-verify-by-fingerprint-2026-09-20.md;
  (b) the engine's `npm test -- --runInBand` template remains unrunnable on Vitest 4
  (cac rejects jest flags — recurring since cycle 1); `pnpm test` is the canonical gate;
  (c) metadata specs live in `test/metadata.test.ts` (an implement-phase narrative named
  a nonexistent `test/metadata-parse.test.ts`); (d) B3c deliberately diverges from the
  cloned `fro-bot/agent` v0.78.0 mirror (refresh-then-resend vs same-token resend),
  documented at the retry site in `src/gateway/operator-client.ts`.
- **Rejection ledger** (from research phase, do not re-derive): #493 clonedeps skip,
  vitest 5 / TypeScript 7 adoption, resurrecting renovate.
