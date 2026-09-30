# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-09-30, run 7ce48fe53b134794bdf5c7589d900f1e)

module: dashboard
tags: `[reliability, security, dependencies, docs, ci]`
problem_type: batch-record

Base: HEAD `31995a2` (origin/main, verified unmoved 2026-09-30T20:3xZ; last three
Main push runs #330/#335/#353 all cancelled at the Lint 35m timeout). Worktree
carries this run's uncommitted roadmap extension (roadmap attempt `3eacc876`,
repaired by `9b2344a7`: items rm-284..rm-289 at ROADMAP.md:917-947 plus dated
riders on rm-139/rm-252/rm-271 and a provenance comment at :143). Campaign:
`repository-maintenance:d0e0c29f78d74fcfb03e1654a8f897e0:cycle:1`.

## Selection method

Scored every open roadmap item (121 at this frame) plus this run's assess/research
findings on impact (user-visible failure / invariant breach), risk (blast radius ×
reversibility), effort, hard dependencies (gateway deployment, live settings,
upstream releases, dependabot windows, product decisions), and strategic value
(unblocks other items). Standing rule from prior cycles: the batch must be
completable end-to-end **locally** this cycle — no live-gateway, no CI-admin, no
dep-registry dependency, no pending product decision.

Live premises re-probed 2026-09-30T20:3xZ before selection: main tip `31995a2`;
Main push runs #330/#335/#353 cancelled (Lint job 35m19s timeout, `main.yaml:36`);
**zero dependabot-authored PRs ever** (`pulls?state=all` → 0 — the 11-day-old
~2026-10-03 window premise has failed); `minimumReleaseAge: 1440` ACTIVE
(`pnpm-workspace.yaml:13`); all 23 open PRs are conductor ephemerals (`ci-*`/`run-*`
refs, codeo1io author) — no feature PR touches this batch's files.

Two coherence constraints shaped the pick: (1) surface-collision discipline — this
batch owns ROADMAP/docs/prioritization, the pnpm manifest+lockfile, two test files,
one new src module + its two importers, and README's env table; no `web/src`, no
server routes, no parser files; (2) no racing standing dispositions **except with
fresh falsifying evidence** — B2 reverses cycle-19's dependabot-window deferral on
documented new evidence (see its disposition note), the only such reversal.

## Selected: feedback-loop truth batch (four automated signals, four falsehoods)

Theme: every automated feedback signal this repo relies on is currently lying or
dead. CI Lint has timed out for ~5 days on every tree derived from main (all
conductor validation landings are blocked). The security audit surface carries two
open high dependabot alerts plus a security fix pair no scanner can ever see. The
env-docs guard is blind to a live-read env var. The rm-225 GraphQL canary — built
precisely to catch "green CI over broken reality" — has never once run green. One
batch, four truth repairs, zero product decisions.

### B1 — `rm-284` Lint unblock: ROADMAP paragraph-length cliff (priority 97.0, effort S) — batch lead

- Scope (current worktree frame, post-roadmap-extension): ROADMAP.md `:188` (rm-103
  signals, 7317ch) and `:421` (rm-157 signals, 7967ch) split into blank-line
  paragraph form (blank line + 2-space indent, same list item, ~2.4K fragments,
  split only at single spaces with plain-text neighbors — content byte-exact on
  rejoin); `:236` (4911ch) and `:426` (4533ch) get the same treatment so the new
  guard clears. `docs/prioritization/2026-09-29-cycle-19-batch.md:4` — bare
  `tags: [security, …]` bracket list backtick-wrapped (the markdown/
  no-missing-label-refs error that sat masked beneath the timeout; this doc adopts
  the backticked form from the start). Length guard: a Vitest guard asserting no
  non-comment ROADMAP.md line exceeds 4_000 chars (mechanism is implement's
  choice; house precedent is a guard test).
- Re-probe at implement: a sibling candidate tree (run 36766834836, head
  `conductor/ci-d4bcfafb03c0`) already validates with Lint green in 37s — if its
  cure lands on main first, B1 shrinks to the guard + label-refs fix against the
  new main.
- Acceptance (from rm-284): rejoin diff empty (whitespace-only change); CI Lint on
  the candidate completes well under the 35m timeout (the validator's own Lint job
  is the proof); guard test green; no non-comment line >4K remains.
- Evidence expectation: `git diff` shows whitespace/paragraph-separation only on
  those paragraphs; guard test output; candidate Lint job duration via the GH API.

### B2 — `rm-285` audit-zero: transitive floors + the audit-invisible hono pair (priority 92.0, effort S)

- Scope: `pnpm-workspace.yaml:25-33` floors → brace-expansion@2 `>=2.1.7`,
  @5 `>=5.0.12`, fast-uri@3 `>=3.1.8 <4.0.0`, undici@7 `>=7.29.1 <8.0.0`; lockfile
  re-resolve only — `package.json` specifiers (`^4.13.9`/`^2.1.1`) already admit
  the pair hono 4.13.11 + @hono/node-server 2.1.3, no manifest edit.
- Disposition reversal (fresh evidence, documented): cycle-19 deferred the in-range
  trio to "the ~2026-10-03 dependabot window" per rm-137's clause "while
  minimumReleaseAge is inactive on main". Both preconditions are now false:
  minimumReleaseAge:1440 is ACTIVE, and the window has produced **zero PRs in 11
  days**. The pair half is a SECURITY fix (serveStatic double-decode, 2026-09-29
  releases) that is **permanently audit-invisible** — per-advisory REST sweep
  2026-09-30T20:1xZ: all 5 indexed hono GHSAs patch at ≤4.13.5/≤4.12.34 and all 6
  indexed @hono/node-server GHSAs at ≤2.0.9/1.x, so no scanner can ever flag the
  fork's 4.13.9/2.1.1 (the fork serves static via
  `@hono/node-server/serve-static`, `src/server.ts:28`). Waiting is not a
  disposition here; it is a non-resolution.
- Acceptance (from rm-285): live `pnpm audit -r` exit 0 **re-probed at implement
  time** (advisory metadata drifts hourly — gate only on the live probe; the audit
  needs no install, manifest+lock only); lockfile resolves fast-uri 3.1.8,
  brace-expansion 2.1.7/5.0.12, undici 7.29.1, hono 4.13.11, @hono/node-server
  2.1.3; dependabot alerts #29/#30 close after landing (post-landing signal);
  full `pnpm test` green on the re-resolved tree.
- Evidence expectation: fresh `pnpm audit -r` rc=0 output recorded in the cycle
  doc; pnpm-lock diff; GHSA-hrr3-gc8f-f4qj citation (fast-uri 3.x vulnerable
  <3.1.8, published 2026-09-29T23:54:25Z — the floor is advisory-enforced, 3.1.7
  insufficient).
- Fleet note: floors are sibling-claimed BY CONTENT in ≥3 trees (rm-276 family);
  first to land wins, the rest fold by content at integrate — never bare id.

### B3 — `rm-287` env-docs guard: widen the census to GATEWAY_* (priority 30.0, effort XS)

- Scope: `test/env-docs-guard.test.ts` census widened to GATEWAY_-prefixed
  variables read in `src/`; README env table gains
  `GATEWAY_ALLOWED_OPERATOR_LOGINS` (read at `src/server.ts:232`; rm-219 allowlist
  semantics: opt-in, unset/blank ⇒ no restriction).
- Acceptance: guard green with the widened census; every src-read GATEWAY_* var
  has a README row; `pnpm test` green.
- Evidence expectation: guard + README diffs; guard suite output.

### B4 — `rm-288` canary: registry isolation so the canary needs no install (priority 72.0, effort M)

- Scope: move `REPO_STATUS_QUERY_REGISTRY` (+ `RegisteredQueryTemplate` + the two
  template constants, `src/github/aggregator.ts:309-330`) into a dependency-free
  module (`src/github/query-registry.ts`: types + template strings only, ZERO
  imports); aggregator re-exports the unchanged names (API-stable);
  `scripts/graphql-canary.ts:24` import retargeted; `test/query-shape-guard.test.ts`
  re-targeted. Workflow file untouched — the isolation is what makes the existing
  install-free job work.
- Local end-to-end proof (no CI-admin): (1) module-resolution proof — the canary
  entrypoint, run from a pristine directory with NO node_modules, advances past
  resolution (today it dies 12s in with ERR_MODULE_NOT_FOUND `@bfra.me/es` via
  `aggregator.ts:32` → `src/result.ts:12`); (2) live green run —
  `GITHUB_REPOSITORY=codeo1io/dashboard GITHUB_TOKEN="$GH_TOKEN" node
  scripts/graphql-canary.ts` executes every registered template against the real
  API (the script's own sha256 digest log names each template). The
  2026-10-05 05:23Z scheduled cron is the free CI confirmation after landing.
- Rejected alternatives (recorded in rm-288): a pnpm install step in
  `canary.yaml` (cures one instance, ~1min per weekly cron, keeps the class);
  inlining `src/result.ts` (violates the documented extraction seam,
  `src/result.ts:1-11`).
- Acceptance: canary imports zero runtime deps; local green run output (both
  registered templates, real API); query-shape-guard green re-targeted;
  check-types/lint/test green.
- Evidence expectation: local canary run log in the cycle doc; git diff shows the
  aggregator re-export; import-graph check (the new module imports nothing).

### B0 — batch baseline (house convention)

- `pnpm build:web` (web/dist must exist), `pnpm check-types`, targeted suites
  (query-shape-guard, env-docs guard, the new roadmap length guard) at base
  BEFORE B1 starts; same battery + full `pnpm test` after B4. B2 adds the live
  `pnpm audit -r` == 0 probe (manifest+lock only, no install) before and after
  the re-resolve. Targeted `npx eslint <changed files>` on non-re-fire turns;
  never as the final gate before the phase-result JSON.
- File-surface ownership: `ROADMAP.md`, `docs/prioritization/**`,
  `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `test/env-docs-guard.test.ts`,
  `test/roadmap-length-guard.test.ts` (new), `README.md`,
  `src/github/query-registry.ts` (new), `src/github/aggregator.ts`,
  `scripts/graphql-canary.ts`, `test/query-shape-guard.test.ts` — no `web/src`,
  no server routes, no parser files.

## Deliberately excluded (rationale recorded, no deferral notes minted)

| Candidate | Why not this cycle |
|---|---|
| rm-104 (98.0) absorb automation | Its premise evidence (the first dependabot PR) is closing UNMET ~2026-10-03 (0 PRs in 11 days) — the failure must be recorded and the dependabot-truth story decided first; that is its own cycle, not a rider here |
| rm-252 (80.0) upstream absorb | Needs the dedicated absorb cycle (pnpm 11.28.0 + eslint-config 0.54.0 riders + the write-capability exclusion review); window re-measured unmoved (agent v0.117.0, upstream tip f4a1aeb) |
| rm-286 (44.0) rate-limit admission cap | Prebuilt archived artifacts exist (red test a808dced + diff b8c6ea0f) but need re-validation against the limiter's current shape; a second code subsystem would break this batch's surface coherence — named lead for the next cycle |
| rm-289 (38.0) scheduled-workflow failures unwatched | Coupled to the alert-route infrastructure decision (rm-179's never-landed route) — not locally completable end-to-end |
| rm-271 majors (vitest 5 / jsdom 30 / pnpm 12 / TS 7) | Their own acceptance requires one evaluation window per major, no bundled mega-PR — next-cycle material |
| rm-116 (58.0) branch-protection fill | Live-settings stewardship turn with re-read verification (cycle-10 fill demonstrably did not persist), not an implement unit |
| rm-139 (24.0) Node 26 window | Time-gated 2026-10-28 by its own dated rider (LTS promotion re-verified via endoflife.date) |
| rm-249 (72.0) push-only SW substrate | Still gated on the rm-106 product decision; unchanged since 2026-09-23 |
| rm-102 (90.0) dependabot evidence gate | Gate closes ~2026-10-03 unmet — watchlist, and the decision it forces is not this batch's story |

## Watchlist

- **2026-10-03**: rm-102's 14-day dependabot evidence gate closes UNMET (0 PRs).
  The next cycle must record the failure and decide the dependabot-truth story
  (config reach vs minimumReleaseAge vs platform).
- **Sibling pre-landing**: if the `conductor/ci-d4bcfafb03c0` lineage (Lint green
  in 37s) lands on main before implement dispatch, B1 shrinks to the guard +
  label-refs fix — re-probe `origin/main` at dispatch, do not re-split what main
  already split.
- **hono 4.13.12** (routine, published 2026-09-30T09:43:03Z) matures
  2026-10-01T09:43Z — optional in-range rider on B2's re-resolve after maturity;
  NOT the security line (that is 4.13.11 + @hono/node-server 2.1.3).
- **2026-10-05 05:23Z** canary cron: B4's free CI confirmation — or the next red
  if B4 slips (no regression: the canary is red today).
- **Fleet floors contention**: ≥3 sibling trees claim the floors by content
  (rm-276 family); reconcile by content at integrate, first-lander wins.
