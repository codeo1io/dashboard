---
module: repository-maintenance
run: adc266709cd04ae58db551baceb14427
cycle: 1
batch: implement
date: 2026-10-18
---

# repository-maintenance cycle 1 — implement batch (run adc266709cd0)

Base: `64cd2f6a` (== origin/main at phase start). Post-adoption fork-posture
restoration batch selected by the prioritize phase (delegate/prioritization-47d61d14.md)
and contracted by the stewardship phase (delegate/14c007165dd148e1b538ee93daee07f3.json).

## Delivered

1. **rm-1518 — Fro Bot secret-presence gate re-restored**
   (`.github/workflows/fro-bot.yaml`). The 2026.10.43 adoption merge (c51597ad)
   reverted the rm-1450 gate wholesale: the fork has no `FRO_BOT_PAT` secret, so every
   scheduled/dispatched run would fail red at the PAT-consuming steps. Re-restored in the
   house-proven form — job-level `env.HAS_FRO_BOT_PAT: ${{ secrets.FRO_BOT_PAT != '' }}`
   (the secrets context is not available in a job-level `if:`) plus per-step
   `if: (…not schedule/dispatch…) || env.HAS_FRO_BOT_PAT == 'true'` guards on Checkout,
   Setup, and Run Fro Bot, and a `::warning::` skip-notice step. Also re-restored the
   same adoption's collateral: `runs-on: ubuntu-24.04` (rm-188), `timeout-minutes: 20`
   (rm-603), `actions/checkout` v6.1.0 → v7.0.1 (rm-1451 rider). `AGENTS.md` truthed:
   the `disabled_manually (verified 2026-09-19)` claim is replaced by the live state
   (active + gate restored + how to re-arm).

2. **rm-1520 — darkness-watch wiring + probe bounds**
   - NEW `.github/workflows/actions-darkness-watch.yaml`: Monday 09:07Z post-family
     census (sentinel family ends 07:23Z), `actions: read`, runner pinned,
     `timeout-minutes: 10`, alert-only by design (exit 3 = DARK mirrors upstream-drift's
     exit-1 contract), dispatch-triggerable with `ACTIONS_DARKNESS_NOW` pinned probes.
     A scheduled lane cannot detect a TOTAL blackout (its own run creation would be
     dark) — the runbook probe stays authoritative for that case; documented in-file.
   - `scripts/actions-darkness-watch.ts`: `fetchJson` now carries
     `signal: AbortSignal.timeout(20_000)`; the global `/actions/runs?per_page=100`
     page is replaced by per-candidate-workflow `runs?per_page=1` queries — the global
     page truncates older workflows' latest runs during busy weeks and reads them as
     never-ran/stale (false DARK). Verified live post-edit: `verdict=DARK exit 3`,
     12 candidates, 6 dark (audit/base-drift/canary/upstream-drift stale+owed,
     cve-tripwire/release-channel never-ran) — matching the known Oct 5+ blackout.
   - `scripts/graphql-canary.ts`: same `AbortSignal.timeout(20_000)` bound; verified
     live post-edit (both templates OK, exit 0).
   - `codeql.yaml` (branches scope + `ubuntu-24.04` + `timeout-minutes: 20` +
     `SEMMLE_TYPESCRIPT_HOME` + Setup step) and `scorecard.yaml` (`ubuntu-24.04` +
     `timeout-minutes: 15`) adoption reverts also restored; `release-channel.yaml`
     setup-node v7.0.0 → v7.1.0 (rm-1451 rider).

3. **rm-1519 (leg a) — version truth in the image**
   `Dockerfile` builder stage now carries `ARG DASHBOARD_VERSION=dev` +
   `ENV VITE_DASHBOARD_VERSION=${DASHBOARD_VERSION}`. The adoption Dockerfile rewrite
   dropped the pair while `release.yaml:203` kept passing `--build-arg DASHBOARD_VERSION`,
   so release images fell back to the `'dev'` footer
   (`web/src/shell/AppShell.tsx:163`) and the codeo1io release-notes link never
   rendered. Vite bakes `VITE_*` process env at build time — the builder ENV is the
   whole wiring; local builds unchanged. Legs (b)/(c) (release posture, link gating)
   stay separate decisions.

4. **rm-1521 — clonedeps pin parity**
   `.slim/clonedeps.json` re-anchored v0.78.0 → v0.122.3 (both dependency entries,
   `updatedAt` refreshed) to match the real CI pin (`fro-bot.yaml:313`,
   `fro-bot/agent@7d273ac…  # v0.122.3`); `AGENTS.md` mirror doc re-anchored the same
   way (was v0.122.1). NEW `test/clonedeps-pin-parity.test.ts` guards all three
   artifacts against future drift, and trips if a future absorb re-reverts the
   rm-1518 gate (the silent-revert class this repo has now suffered twice).

5. **rm-142 rider — visual born-red cure: ALREADY LANDED, not duplicated**
   At 2026-10-17T19:20Z (mid-implement), sibling merge `f5927919` (run 3d12d72f)
   landed the cure on main: operator-dark PNG 341452 → 346452 bytes, blob
   `222cac991c82…` — byte-identical to the cure blob this run verified recoverable
   via `refs/pull/868/head`. The visual push run on `f5927919` is SUCCESS (first
   green since the born-red). This batch therefore carries NO PNG delta; the
   acceptance is satisfied by the landed bytes and the integrate merge keeps them.

6. **ROADMAP.md ledger** — applied `roadmap-delta-adc26670-fb331df1-cycle1.patch`
   (45 insertions, mints rm-1518..1521; census 272 defs / 0 dups / max rm-1521).
   The sibling landing's ROADMAP rows (rm-1457..1459) are a disjoint band — no
   collision; integrate 3-way merges both.

## Verification

- `corepack pnpm exec vitest run test/clonedeps-pin-parity.test.ts
  test/actions-darkness-watch.test.ts` → 15 passed (guards for parity + gate +
  darkness math).
- `corepack pnpm exec vitest run test/roadmap-render-guard.test.ts
  test/roadmap-length-guard.test.ts test/roadmap-integrity-guard.test.ts` →
  15 passed; `node scripts/roadmap-census.ts` → 272 defs / 0 dups / max rm-1521.
- `corepack pnpm exec eslint <all changed files>` → clean (after two rounds:
  unused-capture-group → non-captured; `${{`-in-string → unicode-escaped opener +
  template literal).
- `docker run --rm -v $(pwd):/repo:ro -w /repo rhysd/actionlint:latest …` over all
  five touched workflows → rc 0.
- `corepack pnpm check-types` → clean (server + web + .opencode).
- Live executions: `node scripts/actions-darkness-watch.ts` → DARK/exit 3 (true
  state); `node scripts/graphql-canary.ts` → OK/exit 0.

## Deferred (next cycles)

Branch-protection fill (rm-878/rm-116) after this lands; UI-growing absorbs
(rm-1935 PWA banner, #646 markdown run-output port) each owing their own in-image
regen; release-posture legs (b)/(c); Node-26 toolchain window (2026-10-28);
stale-PR disposition (#860/#798/#790/#787); TS7/vitest-5 dependency unit.
