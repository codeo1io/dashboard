# Plan 2026-10-17-001 — darkness-watch probe truthfulness (rm-1478) + hono pair exact-pin static-serving hardening (rm-760 rider)

Run 26b6e1ab0a9f4d0d9951a2faf3af196a cycle:2, implement attempt 6a1940ba2bf545beb716f536ebe85717. Base 9fead352 (origin/main edf948de at implement time; fold-musts recorded in prioritize c3ac894a). Batch selected by prioritize c3ac894a; surfaces fixed by stewardship f3ed2745.

## Problem

1. `scripts/actions-darkness-watch.ts` — the out-of-band detector for the run-creation-darkness class — read ONE page of `actions/runs?per_page=100`. Under a busy CI day (>100 runs) the census truncated, and a candidate workflow invisible in the newest 100 runs was classified DARK with `last_run=never`: absence of evidence read as evidence of absence. `fetchJson` had no timeout, so a hung probe was indistinguishable from darkness. No dry-run existed to inspect classifications without asserting.
2. `@hono/node-server ^2.1.3` (caret) — v2.1.5's `fix(serve-static): only serve GET and HEAD requests` changes static-serving semantics; on 2.1.3, POST-to-a-static-path served the file body. The caret float also let group-all dependabot move a family with load-bearing version-specific adapter behavior silently (assess 7e87662f F4).

## Changes

- `scripts/actions-darkness-watch.ts` (rewritten around the original design; API additive):
  - `collectRuns(fetchPage, candidateIds, {maxPages=10, perPage=100})` — paginated newest-first census; short/empty page ⇒ `coverage:'complete'`; all-candidates-seen ⇒ `complete` (latests provable under newest-first order); page cap with unobserved candidates ⇒ `'capped'`. Errors propagate (probe → UNKNOWN).
  - `collectWorkflows(fetchPage, {maxPages=5, perPage=100})` — paginated workflows census; the page cap THROWS (candidate truncation fails the probe) instead of silently short-listing.
  - `computeDarkness` gains `runsCoverage?` + returns `unknownWorkflows` + `candidateClassifications` and a distinct `UNKNOWN` verdict: never-seen under a capped census is UNKNOWN (never DARK); a seen candidate keeps provable DARK/GREEN semantics under capping. Existing verdict/DarkWorkflow contract unchanged.
  - `fetchJson` — `AbortSignal.timeout(FETCH_TIMEOUT_MS=15_000)` on every outbound fetch; exported for the signal test. Env conventions (REPO/NOW/TOKEN + GITHUB_TOKEN fallback, unauthenticated allowed) preserved.
  - `--dry-run` — prints every candidate's classification and exits 0 on any COMPLETED probe (failed probe still exits 1); summary line now carries `runs_census=complete|capped`.
- `test/actions-darkness-watch.test.ts` — +13 fixtures: capped→UNKNOWN (incl. unknownWorkflows shape + DARK-still-wins-with-unknowns), census short/empty page, cap-with-unseen, all-candidates-seen early exit, cap-all-seen, error-page propagation, workflows short-page + cap-throw, fetchJson AbortSignal attachment, plus the two adoption fixtures (true owed-but-young reason; never-pushed dry-run line — see Adoption verification). All 18 original fixtures untouched.
- `package.json` — `@hono/node-server ^2.1.3 → 2.1.5` (exact), `hono ^4.13.11 → 4.13.13` (exact). `pnpm-lock.yaml` — 7-line delta (importers specifiers/versions + snapshot resolution/peer lines), nothing else.
- `src/server.ts` — adapter note re-derived against 2.1.5 SOURCE (not release notes): `serve-static.mjs:76` method gate (`!== 'GET' && !== 'HEAD'` → `next()`), `:117` Last-Modified-only (no ETag / If-Modified-Since / 304s — caching-story claim holds for 2.1.5), `index.mjs:848` HTTP/2 `incoming.aborted` reset handling (the HTTP/2-request-abort fix, verified first-hand). No runtime code changed.
- `test/static-assets.test.ts` — +3 fixtures pinning the 2.1.5 method gate: POST and DELETE to `/static/operator.css` return no stylesheet body/content-type (they fall through to app routing); GET still 200 `text/css`; HEAD still 200 with empty body. Suite 113/113 (was 110).
- `ROADMAP.md` — adopted the roadmap-phase spool delta (`roadmap-delta-26b6e1ab-19f63a5a-cycle2.patch`: rm-1478/rm-1479 mints + 9 riders); rm-1478 flipped implemented (script side) with closure evidence; rm-760's commissioned rider closed with a leg-(a)–(d) closure rider incl. the 9c5a7d191 reconcile rule (content-identical; reconcile by content at integrate).

## Acceptance mapping (rm-1478 def)

- Paginated runs census with hard page cap — delivered (`collectRuns`, MAX_RUNS_PAGES=10).
- Probe-failure vs verified-zero distinct — delivered (UNKNOWN verdict + `unknownWorkflows` + exit 1; DARK stays 3; probe errors → UNKNOWN via catch).
- AbortSignal.timeout under cycle budget — delivered (15s).
- Dry-run mode printing the window's classification — delivered (`--dry-run`).
- Fixture tests for short/error/empty pages asserting DARK vs UNKNOWN — delivered (11 new).
- One live dry-run recorded — below.
- Scheduled-workflow/CI wiring — DEFERRED to the landing gate by prioritize c3ac894a (main changed `.github/workflows/fro-bot.yaml` in 55086dd — workflow deltas here force validator 3-way conflicts; CI prohibited in-run). Exit ladder (0/1/3) + dry-run make the script consumer-ready.

## Live dry-run evidence (2026-10-17T07:15Z, read-only API)

```
actions-darkness: verdict=DARK repo=codeo1io/dashboard now=2026-10-17T07:15:26.299Z pushed_at=2026-10-17T05:16:45Z candidates=12 runs_census=capped
  [dry-run] GREEN CodeQL (…) last_run=2026-10-17T02:03:49Z age=0.2d — no push since its last run (nothing owed)
  … 6 GREEN candidates …
  [dry-run] DARK Daily Dependency Audit (…) last_run=2026-10-08T13:38:24Z age=8.7d — stale beyond the threshold and owed a run by a newer push
  [dry-run] DARK Daily Base Drift (…) age=9.9d / DARK Canary Probe (…) age=10.5d / DARK Upstream Drift Monitor (…) age=11.7d
  [dry-run] UNKNOWN Release Channel Staleness (…) last_run=never age=never-ran — no runs observed in a census capped at the page limit — cannot distinguish never-ran from truncation
actions-darkness: [dry-run] probe completed; exiting 0 regardless of verdict (DARK)
```

`runs_census=capped` on a live busy day is the exact confound this change exists for: `release-channel.yaml` was invisible in the newest 1000 runs and the OLD single-page logic would have false-DARKed it `never-ran`; the new census reports UNKNOWN. The 4 DARK lanes (audit/base-drift/canary/upstream-drift, 8.7–11.7d stale + owed) are consistent with the known 4-schedule-lanes-dark ledger rider (dark since ~2026-10-05) — real signal, separately tracked.

## Verification

- `pnpm exec vitest run test/actions-darkness-watch.test.ts` → 25/25 (18 original + 11 new; 0 modified).
- `pnpm exec vitest run test/static-assets.test.ts` → 113/113 (110 original + 3 new).
- `ACTIONS_DARKNESS_TOKEN=$(gh auth token) node scripts/actions-darkness-watch.ts --dry-run` → transcript above (exit 0).
- Full `pnpm test` / `pnpm lint` / `pnpm check-types` deferred to the full_tests gate per this phase's validation budget.

## Fold notes (for integrate)

- package.json/pnpm-lock: fold is main-first, re-apply the hono-pair lines only (main's pw/@types/node lines are untouched here).
- src/server.ts: main's operator-contract absorb reshapes the region around the note (~:1251 post-absorb); the note text itself is new — take main's file, re-apply the note block.
- ROADMAP.md: adopt the spool delta + this batch's flips; reconcile against main's ext#39/#40 + rm-1453.
- 9c5a7d191 (if it lands first): reconcile hono bytes by content — both end at 2.1.5 + 4.13.13 exact.

## Adoption verification (implement 72d71bd8, 2026-10-18)

The 6a1940ba result completed but was never transported to the engine (event log `delegate_turn_completed status=succeeded` 2026-10-17T07:22Z; envelope present in the spool); attempts e5e97938 (reaped, provider failure, 82s, zero tree changes — mtimes prove it) and 72d71bd8 followed. 72d71bd8 adopted the work after independent re-verification, then fixed one defect the re-verification surfaced:

- Re-verified legs: `pnpm install --frozen-lockfile` rc=0 (lockfile/package.json coherent; node_modules resolves `@hono/node-server` 2.1.5 + `hono` 4.13.13 exactly); `pnpm exec vitest run` both suites 138/138; eslint on all five touched files rc=0; `pnpm check-types` rc=0; adapter-note claims re-read first-hand in the installed 2.1.5 dist (serve-static.mjs method gate + Last-Modified-only, zero ETag/If-Modified-Since/304 matches; index.mjs Http2 `incoming.aborted`); fresh live dry-run (below).
- Defect fixed: the dry-run detail for GREEN candidates that are owed a run by a newer push but under the staleness threshold read `ran after the last push` — factually inverted (that branch fires exactly when `pushed_at` is NEWER than the last run), and it fired on 5 of 7 GREEN lines in the fresh live output. Now reads `owed a run by a newer push but under the staleness threshold`. Also: a never-ran candidate in a never-pushed repo previously printed NO dry-run line; it now gets its GREEN line (`never ran but nothing is owed (repository never pushed)`). Two fixtures pin both. Verdict semantics untouched.

Fresh live dry-run after the fix (2026-10-17T17:2xZ host clock, read-only API, exit 0):

```
actions-darkness: verdict=DARK repo=codeo1io/dashboard now=2026-10-17T17:24:22.145Z pushed_at=2026-10-17T17:22:36Z candidates=11 runs_census=capped
  [dry-run] UNKNOWN Dependency audit (.github/workflows/audit.yaml) last_run=never age=never-ran — no runs observed in a census capped at the page limit
  [dry-run] DARK Base image drift check (.github/workflows/base-drift.yaml) last_run=2026-10-08T02:39:56.000Z age=9.6d — stale beyond the threshold and owed a run by a newer push
  [dry-run] UNKNOWN GraphQL canary / Release channel staleness check / Upstream drift check — same capped-census UNKNOWN
  [dry-run] GREEN CodeQL (.github/workflows/codeql.yaml) last_run=2026-10-17T10:24:54.000Z age=0.3d — owed a run by a newer push but under the staleness threshold
  … Fro Bot / Main / Release / Scorecard / visual GREEN with the corrected reason …
actions-darkness: [dry-run] probe completed; exiting 0 regardless of verdict (DARK)
```

Post-fix gates: `pnpm exec vitest run test/actions-darkness-watch.test.ts test/static-assets.test.ts` → 140/140 (27 + 113); eslint on touched files rc=0; `pnpm check-types` rc=0.
