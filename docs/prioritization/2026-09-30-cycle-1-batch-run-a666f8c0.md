# Dashboard maintenance — cycle 1 batch, run a666f8c0 (2026-09-30)

module: dashboard
tags:
  - dependencies
  - security
  - upstream-absorb
  - workflows
  - docs
problem_type: batch-record

Frame: `31995a2` (run `a666f8c061504d8c88cdd6c087ec890f`, repository-maintenance
cycle 1; origin/main re-probed 18:07Z still `31995a2` — the sibling floors batch
has NOT landed). Selected by prioritize attempt
`c743c6abde17460fa8137e1d1f6627f7` (the prior attempt `0cfe0796` was reaped by
a provider abort 147s in — 5 events, 6 messages max, zero durable artifacts in
spool or worktree, ROADMAP.md mtime still the roadmap phase's 16:34:51 — so
this selection is authored fresh, consuming this run's assess `79ea06d5`,
research `f5243ae6`, and roadmap `3bced0c0` artifacts; every load-bearing
file:line claim below re-derived live at base 31995a2 this attempt).

## The cycle's mandate

One theme: **runtime and gateway-contract currency — close the tree's only
runtime-scope dependency-security exposure (the in-range hono pair), land the
14-commit upstream window's actionable pins as a content-absorb, and carry the
v0.117.0 gateway-contract docs rider.** Every member is a pin edit, an
in-range lockfile refresh, or a docs line — zero `src/` logic surface, zero
workflow-semantics change, no external sequencing, and the entire batch is
verifiable by the repo's existing gates end-to-end this cycle.

## Fleet contention map (probed 18:07–18:12Z; the decisive constraint)

The spool shows FOUR sibling maintenance runs on this repo with selections
live or in flight; my selection must not double-land any of them:

| run | cycle | batch (its own tree's rm-ids) | state |
|---|---|---|---|
| 0a6430c9ba13 | 1 | floors rm-286 + security_updates rm-287 + auth body-cap rm-288 | implement persist 16:34Z; validation green 16:39Z; UNLANDED |
| f91bcdc2c6f7 | 2 | shard Lint rm-294 + residue janitor rm-295 + advisory audit step rm-293 | selected 17:08Z |
| 23d39aa7467e | 2 | floors rm-276 + audit gate rm-278 + comment truth rm-280 | selected 18:10Z |
| d997d9a88aad / afab8dbb | 2 | floors-lineage rm-276/277 in their trees | roadmap minted |

- The **dev-transitive floors class is triple-claimed** (0a6430c9's rm-286,
  23d39aa7's rm-276, d997d9a88aad/afab8dbb's rm-276) — selecting it here would
  be the fourth parallel landing of a 4-line change. EXCLUDED.
- 23d39aa7's selection explicitly freezes runtime deps ("runtime deps
  (hono 4.13.9, @hono/node-server 2.1.1) unchanged") and declares the absorb
  window "nothing to absorb this cycle" (it superseded only the fast-uri
  commit via floors). f91bcdc2's doc notes the absorb set was **deferred as
  unowned** by 0a6430c9 ("pure dep chores … low" marginal value vs the two
  known history-merge conflict points).
- **My ledger's rm-276 (main.yaml :33-35 comment-truth) is content-claimed by
  TWO sibling batches** (f91bcdc2 B1 truths it while sharding; 23d39aa7's
  rm-280 truths it). EXCLUDED from my file set entirely — dedupe by content;
  once either lands, my rm-276's acceptance is satisfied and should fold.
- Cross-fleet rm-id note for the implement/commit phases: rm-276/277 mean
  DIFFERENT content in different trees (mine: comment-truth + decomposition;
  23d39aa7's/d997d9a88aad's: floors + dependabot-inert). Reconcile by content
  at landing, never by bare id.

## Selected batch

### B1 (anchor) — rm-252/rm-157: upstream window pins as content-absorb

- **fro-bot.yaml:340**: `fro-bot/agent@930ffc9fed93d5a6e5f2c0f9a51b4bc2fcf1e15e # v0.115.1`
  → `fro-bot/agent@e6efc1f13ed05056cc9ba68d6f8fb5e71bed8ca6 # v0.117.0`
  (digest + comment byte-matched to `autonomy-upstream/main:.github/workflows/fro-bot.yaml:313`,
  re-derived this attempt). v0.117.0 released 2026-09-27T22:45:58Z (gh api);
  window still unmoved (upstream tip `f4a1aeb`, `git rev-list --count
  HEAD..autonomy-upstream/main` = 14). The workflow stays `disabled_manually`
  — pin bump ONLY, no re-enable (no `FRO_BOT_PAT` secret exists; re-enabling
  resurrects the failing cron per AGENTS.md).
- **package.json:57** `packageManager`: `pnpm@11.27.1` → `pnpm@11.28.0`
  (matches upstream #537; npm latest is 12.8.1 but 12 is rm-271's major
  window — do not outrun upstream).
- **package.json:33** `@bfra.me/eslint-config`: `0.52.2` → `0.54.0`
  (upstream #529; peer `eslint ^10.4.0` verified live vs our 10.11.0).
- **Method: content-absorb as direct edits, NOT a history merge** — the house
  precedent is rm-103's note that the 2026-09-20 absorb's CONTENT landed as
  direct edits via rm-111. This neutralizes 0a6430c9's two cited conflict
  points (fork has no `.github/renovate.yaml`; `release.yaml` fork-diverged)
  without carrying the wiki-writer/upstream-only files the diff would drag in.

### B2 — the runtime security pair, in-range lockfile refresh (rm-271's trio, security-reframed)

- **@hono/node-server 2.1.1 → 2.1.3** and **hono 4.13.9 → 4.13.11**
  (lockfile resolutions re-derived this attempt; specifiers `^2.1.1` /
  `^4.13.9` at package.json:22/:28 admit both — lockfile-only refresh, no
  manifest edit). These are the 2026-09-29T06:10/06:15Z coordinated security
  releases fixing the `serveStatic` double-decode middleware bypass. The fork
  imports `serveStatic` from `@hono/node-server/serve-static` at
  **src/server.ts:28** and serves `web/dist` at `/` through it — this is the
  tree's ONLY runtime-path dependency-security exposure, it is
  **audit-invisible** (advisory not yet GHSA-indexed; `pnpm audit --prod` is
  green at this HEAD precisely because nothing is indexed), and no automation
  will ever propose it. Every sibling batch explicitly leaves runtime deps
  frozen.
- **fast-check 4.9.0 → 4.10.2** (dev rider, package.json:46, mature 11d).
- **Age-gate fit (re-derived):** `minimumReleaseAge: 1440`
  (pnpm-workspace.yaml:13) gates resolutions younger than 24h. Targets
  2.1.3/4.13.11/4.10.2/0.54.0/11.28.0 are all ≥36h mature — **no
  `minimumReleaseAgeExclude` entry and no gate weakening needed**.
  **hono 4.13.12 is deliberately NOT targeted**: published 2026-09-30T09:43Z
  (8.5h old) — blocked by the gate; it becomes a trivial post-maturity rider
  after 2026-10-01T09:43Z. The security cure is complete at the 4.13.11+2.1.3
  pair (peer check live: @hono/node-server@2.1.3 peers `hono: ^4`).

### B3 — rm-254 rider: v0.117.0 failure-semantics line in the gateway runbook

- `docs/runbooks/gateway-access.md` gains a "what a failed start looks like
  now (v0.117.0)" line beside its 401/bearer/image-coupling facts: generic
  stderr + exit 1 (no stack) since v0.117.0, where provenance/journal records
  land, and checkout auto-advance semantics. Verified this attempt:
  `grep -cE 'stderr|exit' docs/runbooks/gateway-access.md` = **0** — the
  runbook documents none of the failure-mode contract that the pin bump
  adopts. Docs-only; rides B1's commit.

## Selection screen (impact / risk / effort / dependencies / strategic)

- **Impact — HIGH.** B2 cures the only runtime-scope security exposure
  (middleware-bypass class, prod serve path) — higher-stakes scope than the
  triple-claimed dev-transitive floors, which it complements rather than
  duplicates. B1 ends a 2-release pin lag on the gateway contract this app
  mirrors (clonedep rationale in AGENTS.md) and adopts v0.116/v0.117
  semantics (control-API bearer everywhere but /healthz,/readyz;
  unprivileged 10001:10001 workspace user; startup-failure surface). B3 makes
  the new failure contract operator-readable.
- **Risk — LOW.** All members are version pins, an in-range refresh, or docs.
  No workflow semantics change; no `src/` logic; existing gates cover
  everything (honoured end-to-end by the 48-file server suite + 30-file web
  suite that exercise hono on every request).
- **Effort — SMALL-MED.** One implement phase: 3 pin lines + lockfile
  re-resolve + one runbook paragraph; gates + actionlint.
- **Dependencies — NONE external.** v0.117.0 released; all npm targets
  mature past the age gate; no gateway deploy needed (docs note only).
  Internal: lands clean on `31995a2` or atop a floors landing (the only
  file overlap with any sibling batch is `pnpm-lock.yaml` — mechanical
  re-resolve on the merged tree, no semantic overlap; floors cap
  dev-transitives, mine move runtime resolutions).
- **Strategic.** The only unclaimed dependency-security territory left in
  the fleet; keeps the absorb window from rotting while its history-merge
  cost is explicitly deferred; leaves the triple-claimed floors class to the
  run that owns it; and it does not touch `.github/workflows/main.yaml` at
  all, keeping my file set disjoint from f91bcdc2's batch (Lint/Test/audit
  riders) apart from the shared lockfile.

## Batch acceptance (aggregated)

1. fro-bot.yaml pin line reads digest `e6efc1f1…` + `# v0.117.0`,
   byte-matched to upstream :313; workflow state untouched
   (`gh workflow list` still shows it disabled).
2. package.json: `pnpm@11.28.0`, `@bfra.me/eslint-config 0.54.0`;
   lockfile resolves hono `4.13.11`, `@hono/node-server 2.1.3`,
   fast-check `4.10.2`; runtime deps otherwise zero movement; no
   `minimumReleaseAgeExclude` additions.
3. `pnpm audit --prod` still 0 (baseline from assess at this HEAD); full
   gates green: `pnpm check-types`, `pnpm lint` (0.54.0 rule deltas triaged
   or scoped — new findings surfaced by the config bump must be fixed or
   explicitly waived in the commit message, never blanket-ignored),
   `pnpm test` (both suites), actionlint container-form on fro-bot.yaml.
4. Runbook paragraph present; `grep -cE 'stderr|exit'` ≥ 1.
5. No edits to `.github/workflows/main.yaml`, `pnpm-workspace.yaml`,
   `src/` — the disjointness claims above stay verifiable in the batch diff.

## Deferred, with reasons

- **Floors / security-updates / auth body-cap** — owned and in flight
  (0a6430c9 cycle-1; triple-claimed across trees). See contention map.
- **My rm-276 (comment truth)** — content claimed by f91bcdc2 B1 and
  23d39aa7 rm-280; fold my ledger entry when either lands.
- **rm-277 (server.ts/aggregator.ts decomposition, mine)** — its acceptance
  demands per-extraction landings with full-suite green; its cheap
  "dated keep-decision" branch is best taken AFTER the absorb+floors churn
  settles. Right-sized as a future cycle's headliner, not a rider.
- **rm-257 (web lint coverage — 65 files / 13 447 LOC, zero coverage)** —
  real value, MED-HIGH effort, unknown-findings risk (a first lint pass can
  balloon), different theme. Natural next-cycle headliner.
- **rm-120 (clonedep refresh v0.78.0 → v0.117.0, 39 releases of drift)** —
  heavy reference-tree refresh; B3 documents the contract deltas meanwhile.
- **rm-271 majors (vitest 5 / jsdom 30 / pnpm 12 / impeccable@4)** — TS
  ceiling re-confirmed this attempt (typescript-eslint 8.71.0 peers
  `>=4.8.4 <6.1.0` vs our typescript 6.0.3); deliberate hold to 2026-10-21;
  pnpm 12 would outrun upstream's 11.28.0.
- **hono 4.13.12** — age-gated (8.5h old); post-maturity rider.
- **rm-102 (dependabot census decision)** — window closes 2026-10-03;
  watch item, not implementable now.

## Cycle outcome (compounded 2026-10-01, compound 13d756a2)

Landed batch (uncommitted worktree delta at HEAD `31995a2`, 9 files total):

- B1 dependency/pin absorb: `fro-bot.yaml` agent pin `v0.117.1` window entry (`e6efc1f` `v0.117.0` adopted; `v0.117.1` published 2026-10-01T23:21Z after the batch froze), `pnpm` `11.27.1` to `11.28.0` (`package.json` `packageManager` + `Dockerfile` both stages), `hono` `4.13.11`, `@hono/node-server` `2.1.3`, `@bfra.me/eslint-config` `0.54.0`, `fast-check` `4.10.2` (`package.json` + `pnpm-lock.yaml`), coordinated `test/fork-exclusion-guard.test.ts` assertions, `docs/runbooks/gateway-access.md` `v0.116.0`/`v0.117.0` failure-contract section (`rm-254` acceptance).
- Validation record (consumed, not re-run here): targeted 16 suites / 609 tests green + actionlint + check-types + eslint all `rc=0` (`e14d0d00`); full suite green twice at the settled tree — PR `#328` 13/13 checks (attempt `7eec08e4`) and PR `#329` 9/9 checks (attempt `42cfd27d`), validator `ok=true`.
- full_tests pre-flight riders on the same delta: `ROADMAP.md` monolith split (4 `signals` lines 8203/7967/4911/4533 chars to 13 clause-wrapped chunks, max 2681 — CI Lint 35-min cliff; split proven at PR `#324` and re-proven `#328`/`#329`, Lint 58s) and two base-carried lint-debt cures (`docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md` trailing spaces, `docs/prioritization/2026-09-29-cycle-19-batch.md:4` backtick-wrapped bracket label) — see `docs/solutions/workflow-issues/full-lint-preflight-base-debts-and-monolith-split-2026-10-01.md`.
- Re-fire ledger (provider failures, nothing lost): prioritize `0cfe0796`, stewardship + implement `97cb364a` pass-1, targeted `95370347`/`8b7740b7`, full_tests `7eec08e4`/`e104a5a9`/`07a2fe62`/`f0e484cc`, compound `60cc166b`/`8e9d35aa`. One content rejection among these was real and is corrected: the `e104a5a9` full_tests result declared a locally re-derived `validation_digest` and was mechanically rejected by the `R5` emission-restamp gate; `42cfd27d` re-ran the validation and declared the engine-supplied digest verbatim.

Next-cycle candidates (concrete):

1. `rm-360` (minted this cycle, priority 82) — npm-audit registry flip: the undici 7.x GHSA wave is live in the registry; main was audit-RED at `5bf15e1` with 19 advisories and NO scheduled audit signal (PR `#325` closed unmerged, PR `#315` open but `mergeable_state DIRTY`). Re-derive audit on current main first; floors via ONE lineage or the jsdom `30.1.1` durable exit.
2. `rm-276` fold — comment-truth rider remains content-claimed by siblings (`f91bcdc2` B1, `23d39aa7` `rm-280`); fold on either landing, do not triple-land.
3. Absorb window next refresh: `hono` `4.13.12` matured (published 2026-09-30T09:43Z, age-gate clear since 2026-10-01T09:43Z); agent `v0.117.1` published 2026-10-01T23:21Z (journal manifest among assets — verify release notes before adopting); upstream tip was `f4a1aeb1` at research time.
4. `rm-271` toolchain riders: `ubuntu-26.04` runner label LIVE (x64+arm64) while `ubuntu-latest` still maps 24.04; TypeScript `7.0.2` is dist-tags `latest` (re-eval can advance from 2026-10-21); Node `v26.10.0` exists `lts:false`; pnpm latest `12.8.1` while the repo rides 11.28.0.
