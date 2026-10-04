# Dashboard maintenance — repository-maintenance cycle 2 batch (2026-10-04, run 845265c83109)

- **Run / phase**: conductor run `845265c831094c8fbb2e8b8658018e66` (repository-maintenance `e74af7caea26479d8887c8f94b387e96`, cycle 2), phase **implement**, attempt `91f125b28e9143f9ae59a3d900a9ea0d`.
- **Base**: `1f443716c4c975f95f6ccbb1b3461db5aff23799` (== origin/main at this run's assess; porcelain at implement start: ` M ROADMAP.md` only — this run's roadmap-phase drift `rm-560` mint + riders, preserved and extended, never reverted).
- **Batch** (selected by prioritize `ad0a25f8`, described by stewardship `b869a560`): **"Node-26 web-suite readiness + rate-limit deny-path hygiene"** — B1 jsdom 29.1.1→30.1.1 (+ riders), B2 `rm-560` denial-log sampling, B3 429 `Retry-After`.
- **Skill routing disclosure**: no `ce-*` skill package is installed in this delegate env (`~/.agents/skills` → agent-reach only; repo `.agents/skills` → impeccable only) — the fleet's recorded house process for implement phases was followed directly.

## What landed (all in-tree, uncommitted per fleet pattern)

### B1 — jsdom 29.1.1 → 30.1.1 + the durable Node-26 env seam (rm-548 durable half, rm-133 rider)

- `package.json:48` `"jsdom": "30.1.1"`; `pnpm install` refreshed the lockfile (+100/−100 lines, jsdom-family scoped: `@asamuzakjp/*`, `@csstools/*`, `whatwg-url@17`, `tough-cookie`, `w3c-xmlserializer`, `html-encoding-sniffer`, `bidi-js`; engines line now `^22.22.2 || ^24.15.0 || >=26.0.0` — exactly the research-C4 Node-26 floor).
- **Lockfile fact (fresh grep this run)**: `undici@7.30.0` is GONE, replaced by `undici@8.11.2` — jsdom 30's own `undici ^8` range sits OUTSIDE the `undici@7: '>=7.30.0 <8.0.0'` override selector (jsdom is the sole undici consumer; dev-scope). The override is now dormant until some range re-enters 7.x; `rm-271`'s majors window still owns any prod-scope undici-8 question. Dated comment rider added at `pnpm-workspace.yaml` (above the override).
- Dated decision-comment rider added to the `.github/dependabot.yml` ignore block (jsdom majors were never ignored and stay open; the 2026-10-21 re-evaluation still owns only vitest 5 + TypeScript 7).
- **CORRECTION OF RECORD (falsified hypothesis)**: the prioritize/research theory that the red was "an unsupported-generation combination" cured by the bump alone is FALSE — re-verified first-hand immediately post-bump, the red set was **byte-identical** (4 files / 100 failed / 1072 passed). Root cause re-derived this run: **Node 26.10.0 pre-defines `globalThis.localStorage` as an OWN configurable getter** (`node -e` descriptor probe) that warns (`--localstorage-file was not provided`) and returns `undefined`, which pre-empts the vitest jsdom environment's storage install **regardless of jsdom generation** — `window.localStorage.clear()` in `App.test.tsx:25` throws `TypeError: Cannot read properties of undefined (reading 'clear')`, and the same signature owns all 4 red files (`App` 25, `AppShell` 30, `Notifications` 37, `InstallPrompt` 8).
- **Durable env seam landed**: `web/src/test-setup.ts` now rebinds `globalThis.localStorage` to a fresh in-memory `Storage` literal **per test file** (full standard interface). Design notes: no `--localstorage-file` flag axis (one shared backing file across concurrent fork workers = clear/set races across the 31-file suite); jsdom's own storage instance is unreachable in this env (`window === globalThis`), so there is nothing to re-borrow; a per-file literal is the only sound seam. This is an environment seam, not the per-test shim of sibling d0305cd7's salvage branch (the documented split + "bump-removes-shim" rule recorded at selection still holds: main never carried the shim, verified absent again at stewardship).
- **Result**: web suite **31 files / 1172 tests GREEN on Node 26.10.0 with zero flags** (`npx vitest run --config web/vitest.config.ts`; documented baseline 4 files/100 red).

### B2 — rm-560: sampled rate-limit denial logging (`src/server.ts`)

- Deny branch (was `logger.warning('Rate limit exceeded', {ip, path})` on EVERY denial) now emits via exported `sampleRateLimitDenial(ip, pathClass, path, now)`:
  - **first** denial per (ip-key, path-class): `'Rate limit exceeded — first denial (sampled, rm-560)'` with `{ip, pathClass, path}` — identity fields preserved for operator follow-up;
  - then at most **one summary per 60 s** per key: `'Rate limit exceeded — interval summary (sampled, rm-560)'` with `{ip, deniedCount, distinctPathCount, topPathClass}` — class-only, **no raw path**;
  - in-window repeats: `null` — zero per-denial lines at steady state.
- Length caps: ip 64 (mirrors the limiter's XFF key cap), path 128 + ellipsis marker (the rm-560 nit: a crafted ~16 KB pathname used to ride every line). Context field names deliberately avoid `logger.ts`'s sensitive-substring list (no `key`/`auth`/… — they would be `[REDACTED]`).
- The sampled map is swept on the limiter's own cadence (`EVICT_STALE_AGE`) so it stays bounded exactly like `rateLimitMap`; `resetRateLimitForTesting()` clears both maps.
- `checkRateLimit`'s boolean contract is untouched (all existing exports/tests unchanged).

### B3 — 429 carries `Retry-After` (RFC 9110 §10.2.7) on the rm-560 def

- New exported companion `rateLimitRetryAfterSeconds(ip, now)` = `ceil((windowStart + RATE_LIMIT_WINDOW_MS − now)/1000)`, floored at 1; the deny branch returns `c.text('Too Many Requests', 429, {'Retry-After': …})`.
- **`RateLimit-*` draft headers deliberately excluded** (research C5 decline: draft-11, expires 2026-11-24) — pinned by test.
- Scope note vs sibling lane `fefc40679c69` (prioritize-only, implement pending): its `rm-601` (decoded-pathname classification) + `rm-602` (Retry-After **+ no-store**) are convergent claims on this same limiter block. Per rm-560's scope rider, **first-content-landing wins**: this run lands the Retry-After content; the no-store clause and the pathname-classification arm are NOT absorbed here (out of this batch's stewardship scope) and remain that lane's/ledger's to reconcile by content at integrate.

## Verification (all commands run this attempt, foreground)

| Gate | Command | Result |
| --- | --- | --- |
| Focused limiter/auth suite | `npx vitest run test/auth.test.ts test/rate-limit-class.test.ts test/rate-limit-config.test.ts` | **3 files / 88 tests green** (4 new rm-560/B3 cases) |
| Impacted root files (429/jsdom-env/reset users) | `npx vitest run test/{installations,operator-client,operator-launch-core,operator-runtime,operator-sse-reader,operator-stream-core,operator-ui,operator-route-redirect,operator-fixture-harness}.test.ts` | **9 files / 1110 tests green** |
| Web project (B1 blast radius) | `npx vitest run --config web/vitest.config.ts` | **31 files / 1172 tests green** (baseline 4f/100t red) |
| Types | `pnpm check-types` | rc=0 (one real error caught+fixed: summary context `pathClass` made optional) |
| Lint | `npx eslint src/server.ts test/auth.test.ts package.json pnpm-workspace.yaml .github/dependabot.yml` | rc=0 (`web/src/test-setup.ts` is eslint-ignored by config — client tree) |
| **Live probe (rm-560 acceptance)** | `RATE_LIMIT_MAX_PUBLIC=4 DASHBOARD_PORT=3128 node src/server.ts`, 8× `curl /api/healthz` | 4× 200 then **4× 429 each with `retry-after: 60`**; server log: **exactly 1** `Rate limit exceeded` warn line (assess baseline: 4 lines for 4 denials). Transcript: spool `91f125b28e9143f9ae59a3d900a9ea0d-scratch/rm560-probe-{server.log,curl.txt}` |

New tests in `test/auth.test.ts`: (1) warn-spy burst — exhaust `'unknown'` then 8 middleware denials → exactly 1 warn line containing `"pathClass":"operator"`/`"path":"/operator"`; (2) sampler unit — first → silent repeats → second-class first → one class-only summary at ≥60 s with `{deniedCount:6, distinctPathCount:3, topPathClass:'operator'}`, interval reset, key independence; (3) cap nit — 20 KB path → ≤129 chars + ellipsis, ip ≤64; (4) Retry-After — header present, integer in 1–60 s, body unchanged, no `ratelimit-` headers.

## ROADMAP ledger (no new mints; this run's prior drift preserved+extended)

- `rm-560` → **implemented** + landed-evidence clause (B2+B3 both on this def; ×5 unlanded Retry-After family retires by content at integrate).
- `rm-133` rider → LANDED-CORRECTED: jsdom 30.1.1 landed; the bump-alone theory falsified first-hand; the durable cure is bump + test-setup rebind; integrate folds sibling `2c3b4c64`'s `rm-608` (same rebind by content) and `d0305cd7`'s `rm-548` interim shim (superseded by the durable pair).
- Def census unchanged: 197 defs / 0 duplicate def-lines / max `rm-560`.

## Changed files (porcelain at finish)

```text
 M .github/dependabot.yml        (comment rider)
 M ROADMAP.md                    (rm-560 flip + rm-133 rider correction; pre-existing drift preserved)
 M package.json                  (jsdom 30.1.1)
 M pnpm-lock.yaml                (+100/−100, jsdom family + undici 7.30.0→8.11.2)
 M pnpm-workspace.yaml           (comment rider)
 M src/server.ts                 (rm-560 sampling + Retry-After; ~+150 lines)
 M test/auth.test.ts             (+4 cases)
 M web/src/test-setup.ts         (localStorage rebind seam)
?? docs/prioritization/2026-10-04-repository-maintenance-cycle-2-batch-run-845265c83109.md   (this file)
```

Repository-wide validation (`pnpm test` full root suite, release gates) is reserved for the later full_tests / merge-release phase per the validation budget.
