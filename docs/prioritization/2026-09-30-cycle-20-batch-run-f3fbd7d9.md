# Dashboard maintenance — cycle 20 batch (2026-09-30, run f3fbd7d9)

module: dashboard
tags: `[security, batch, cycle-20, hono, serve-static, fast-uri, rate-limit]`
problem_type: batch-record

## Frame

- Run: `f3fbd7d9582d43c4bda4f80283127c56` (repository-maintenance campaign
  `3c9303772e0d46de8468b3c1d4b0019e`, cycle 2 of this campaign; ledger cycle 20
  — the run-suffixed filename avoids collision with the parallel sibling
  campaign's cycle-20 batch record).
- Base: HEAD `31995a2022bacb0e597e7c78aed0d08162fae477` (origin/main), clean at
  dispatch; the batch sits uncommitted in the run worktree (13 modified + new
  files), exactly as implement left it.
- Phase lineage consumed as pre-review evidence (this document compounds them;
  it does not re-run them): assess `f8b3f78a053e48688283d9d32dd334cd`,
  research `d3b8cc37d43048c79b6fe4778860d14e`, roadmap
  `ab1e68e925074a91a368f95f94b059dd` (re-fire certification of attempt
  `7708432681934fc7a061cad87e0b10fc`), prioritize
  `d5bbe4a5c29c48d898099cc329665137`, stewardship
  `7dff51695be24b638b3d78c58b674523` (re-fire certification of
  `8bd2a9cbe6d94999a142291b53be6a7c`), implement
  `eb7a0ae6338a45a080378f864b9b0e91`, targeted_tests
  `3f654118d5794e638137169d500e82d2`, full_tests
  `c7c685056d514784ab123e28990b8b9f`.
- Mandate: close the 2026-09-29/30 published attack surface this run's own
  assess and research surfaced (the Hono serveStatic double-decode GHSA pair),
  plus the two defects that compound it (unbounded pre-auth logout body read,
  budget-free logout pair) and the stale fast-uri floor. Selection: rm-281
  (lead) + rm-280 + rm-282 + rm-283, with rm-196's ready rider riding the same
  lockfile operation. rm-284 deliberately deferred (see candidates).

## rm-281 — serveStatic double-decode advisories (lead)

- Change: `pnpm update` lands hono 4.13.9→4.13.11 and @hono/node-server
  2.1.1→2.1.3 (package.json `^4.13.11` / `^2.1.3`); both GHSA-fixed lines
  reached. Acceptance's 4.13.12 target was age-gated OUT (published
  2026-09-30T09:43Z vs `minimumReleaseAge` 1440) and is d.ts-only — the
  advisory fix IS 4.13.11.
- Gate tightened: 5 new tests in `test/static-assets.test.ts` pin the bypass
  class (single-encoded, double-encoded, `/assets` mount, session-less
  traversal variants — all deny — plus a sentinel asserting repo-root
  Dockerfile content never appears in a response); a %-filename walk of
  `public/` + `web/dist` (zero literal-`%` files) proves 2.1.3's default
  %-rejection is safe, `allowPercentInPath` stays unset.
- Evidence: `pnpm audit --recursive` shows zero findings for the pair;
  README's Stack/Server bullet cites both GHSAs with the rm id.

## rm-280 — bounded pre-auth body read (shared reader)

- Change: NEW `src/read-body.ts` hoists `readBodyCapped` +
  `MAX_REQUEST_BODY_BYTES=16384` (renamed from listener's
  `MAX_INGEST_BODY_BYTES`; `src/listener/contract.ts` keeps its own distinct
  module-local `MAX_BODY_BYTES=8192`); `routes/listener.ts` and
  `routes/auth.ts` (logout) both consume the shared incremental reader —
  wire BYTES READ, not post-hoc UTF-16 code units.
- Gate tightened: 3 new `/auth/logout` 413 shapes in `test/auth.test.ts`
  (endless-chunked cancelled at the 3rd 8KiB chunk without draining,
  finite-no-content-length, lying-content-length); rm-268's honest-header
  test stays green.

## rm-283 — logout pair joins a rate class

- Change: `src/server.ts` `sensitiveRoutes` now includes `/auth/logout` and
  `/auth/logout-csrf`, with a recorded-decision comment at the gate
  superseding rm-275's narration-only state; README's `RATE_LIMIT_MAX_PUBLIC`
  row re-trued to match.
- Gate tightened: 3 new tests in `test/rate-limit-class.test.ts` — 61st
  POST `/auth/logout` 429s after 60x403, 61st session-less GET
  `/auth/logout-csrf` 429s, and logout floods do not consume the operator
  budget (class isolation).

## rm-282 — fast-uri floor

- Change: `pnpm-workspace.yaml` `fast-uri@3` floor `'>=3.1.5 <4.0.0'` →
  `'>=3.1.8 <4.0.0'`, advisory GHSA-58mr-gqgx-xq4g named in the overrides
  comment (house style); lockfile re-resolves 3.1.6→3.1.8 at every render.
- Gate tightened: NEW `test/override-floors-guard.test.ts`
  (fork-exclusion-guard pattern) asserts the floor tuple and advisory name,
  with presence-only pins of sibling floor selectors (values left to their
  owning mints — deliberate, to avoid cross-lineage collisions at integrate).
- Evidence: `pnpm audit --recursive` zero GHSA-58mr/fast-uri mentions; 16
  residual findings are the undici/brace-expansion floor clusters outside
  this batch.

## rm-196 rider — lockfile refresh (rode the same operation)

- The vite half was already resolved (lockfile sat at vite 8.3.1, manifest pin
  unchanged), so the rider reduced to `pnpm update hono @hono/node-server`;
  `pnpm build:web` green (PWA precache: 3 entries).

## Outcome (recorded pre-review validation — not re-run here)

- Local (targeted_tests 3f654118): `pnpm check-types` rc=0; repo-wide
  `eslint .` rc=0 in 94s; derived node-target scope 20 suites/721 tests rc=0;
  full vitest 49 files/2309 tests rc=0.
- Authoritative ephemeral-CI, twice: PR #307 (targeted, head
  `6753f5ebba70`) and PR #321 (full_tests, commit `f64bbd0ecb8a`, base
  `87c3689d5a07`) — ALL 9 checks SUCCESS each time (Lint 41s, Test 1m18s,
  Check Types 31s, Design Check 32s, Check Workflows 15s, Test Scripts Load
  26s, Dependency Review 6s, CodeQL 3s, Analyze 1m19s). No visual check in
  either set: that workflow is path-filtered and the batch touches no web/
  source — do not re-fire hunting a tenth check.
- Digest invariance: `validation_digest('31995a2…', '.')` ==
  `validation:v1:e7df6f13708a63a55fae31726b5d0f2550c3f01c74bf2a6a52023192c045efe1`
  MATCH=True pre- and post-cloud (re-derived twice in full_tests).
- Ledger state after this phase: rm-280/281/282/283 status `implemented
  2026-09-30 in-tree, validated pre-review … pending landing`; census 159
  ids, zero duplicates.

## Reusable lessons (this cycle's own evidence)

1. **Honest-header tests let the defect class age through review once.**
   rm-268's cap was pinned only by a truthful-content-length test; the
   unbounded shapes (chunked, no-content-length, lying header) all passed
   through. When a bound is the fix, pin the wire shape, not the polite one.
2. **Markdown monolith lines rider-kill the remote Lint job.** The inherited
   7317/7967-char ROADMAP lines were split (byte-exact roundtrip) BEFORE
   cloud validation; after the split the same tree passed Lint in 41s twice
   while an un-split sibling tree's Lint job died at the cap that same night.
   Recipe + added-lines bar documented in
   `docs/solutions/workflow-issues/roadmap-monolith-lines-kill-cloud-lint-split-recipe-2026-09-30.md`.
3. **Version floors age-gate the security line honestly.** 4.13.12 was
   one day old at implement time; the age gate held, the advisory's actual
   fixed line (4.13.11) landed, and the d.ts-only remainder became a recorded
   next-cycle in-range rider instead of a gate exception.
4. **Presence-only floor pins avoid cross-lineage collisions.** Parallel
   maintenance campaigns at the same base mint sibling floor items; the
   override-floors guard pins only what THIS lineage owns and asserts
   presence-only for the rest.

## Next-cycle candidates (concrete, in priority order)

1. **rm-284** (operator-experience 44) — freshest open item, untouched by
   this batch (no web/ source landed); timeout/abort discipline for listener
   acks + the logout chain; rides ONE handleLogout refactor with the sibling
   lineage's rm-276 (3f3abfdd) if that lands first.
2. **In-range lockfile riders** — fast-check 4.10.2, @opencode-ai/plugin
   1.18.33, and hono 4.13.12 (d.ts-only; age-eligible from 2026-10-01T09:43Z,
   i.e. in-range next cycle).
3. **Residual audit clusters** — undici GHSA-8436-99hf-9mmv (>=7.0.0
   <7.29.1, via jsdom) and the brace-expansion GHSA-q2hr cluster: 16 findings
   at the close of this batch; floor work belongs to the floor-cluster
   lineage, coordinate at integrate to avoid twin floors.
4. **Toolchain majors window (rm-271)** — vitest 5.0.3, jsdom 30.1.1,
   @testing-library/jest-dom 7.0.1, eslint-plugin-erasable-syntax-only 0.7.2,
   pnpm 12.6.0; typescript 7.0.2 stays blocked on the typescript-eslint peer
   (rides rm-133's 2026-10-21 dependabot re-evaluation); impeccable@4
   decision (pin + `.impeccable/config.json` bump together, or record why
   not).

## Dist-tags measured (cited per rm-271's evidence clause)

Measured 2026-09-29 (run 262f170c) and re-scoped 2026-09-30 (run f3fbd7d9
research d3b8cc37, one package per invocation): typescript 7.0.2 (pin
6.0.3), vitest 5.0.3 (pin 4.1.11), jsdom 30.1.1 (pin 29.1.1), pnpm 12.6.0
(pin 11.27.1; upstream 11.28.0), @testing-library/jest-dom 7.0.1 (pin
6.9.1), eslint-plugin-erasable-syntax-only 0.7.2 (pin 0.4.2),
@opencode-ai/plugin 1.18.33 (pin 1.18.32, in-range), fast-check 4.10.2,
impeccable 4.1.0 (CI pins 3.2.1), hono 4.13.11 (landed this batch; 4.13.12
age-gated), @hono/node-server 2.1.3 (landed this batch).
