---
module: dashboard
tags: [repository-maintenance, cycle-1, batch, prioritize, rm-1464, rm-1466, rm-855, rm-1467]
problem_type: maintenance-batch
---

# Repository-maintenance cycle 1 — batch selection (2026-10-16, run 0772bfc24b72)

Batch **silent-drift integrity contracts + operator truth chip**, selected at base
`06095e9` on a tree already carrying the roadmap phase's uncommitted ledger deliverable
(`ROADMAP.md` +113/-20, census 248/0 dups/max rm-1467).

Estate at selection (re-derived 2026-10-16, all read-only): origin/main moved 9 commits
past base to `7042635` (PKCE S256 binding rm-149 in `src/auth/oauth.ts`; rm-743 Dockerfile
HEALTHCHECK — base tag UNCHANGED at `node:24-trixie-slim@sha256:173f12…`, Dockerfile:16;
release-channel-staleness salvage run 405e9004); upstream window widened to 26 unabsorbed
commits; Actions still dark (last run 37872407109 @2026-10-09) with the standing
enabled:true/zero-runs contradiction — full-suite validation rides the local six-job Main
mirror recipe, not CI.

## Inputs

- assess `f432f5f6` (8 findings; headline: managed render 5d5f9be destroyed six def bodies)
- research `056609ac` (6 candidates R1-R6, live-probed sources)
- roadmap `8d3c450a` (adopted from reaped sibling `34685733`; mints rm-1464..rm-1467,
  verbatim recovery of rm-842/843/853/854/855/856, five implemented flips, seven riders)

## Selected batch (4 items)

1. **`rm-1464` — managed-render losslessness guard (reliability 48.0, LEAD).**
   Impact: the render eats acceptance text — the fold gate's source of truth — invisibly to
   id accounting (intra-def loss; id-set delta was clean). Risk: additive test/script only.
   Effort: M. Dependencies: none (compares consecutive ROADMAP renders in local git
   history; red-side proof = doctored render with one hollowed acceptance must trip).
   Contest: unlanded `rm-1459` lineage carries a hollow-46 carve-out that TOLERATES the
   damaged shape — reconcile by UNION of invariants, never the carve-out; first-landed-wins
   (both spool variants absent on 7042635 — probed).
2. **`rm-1466` — close the public value-export .d.ts drift (reliability 34.0).**
   Three live names: `APPROVAL_FETCH_TIMEOUT_MS` (operator-stream.js:2020),
   `formatRelativeTime` + `markCardExpandedForLaunch` (operator-run-index.js) — 0 .d.ts
   declarations each. Parity test derives BOTH sides from the files (no hand-maintained
   list). Declare-or-remove decided with a recorded decision at implement. Contest: unlanded
   sibling `rm-1462` allowlist names exactly this set — reconcile-by-content at integrate.
3. **`rm-855` — pin X-GitHub-Api-Version at every GitHub egress client (reliability 22.0).**
   Set once at Octokit construction (default headers); the one manual pin at
   `src/auth/oauth.ts:130` already covered; GraphQL documented versionless. Effort: S;
   zero sibling claims; no behavior change today. NOTE for implement: PKCE landed in
   src/auth on 7042635 — re-read the construction sites on the forward base before editing.
4. **`rm-1467` — Monitoring upcoming-maintenance chip (operator-experience 20.0).**
   scheduled-maintenances.json filtered to scheduled/in_progress, rendered beside the
   rm-1447 banner; fail-open (no chip on any fetch/parse failure); bounded text per the
   rm-1447 clamp convention; incidents.json is the incident source if ever needed
   (unresolved-incidents.json is HTTP 404 — do not design against it). Effort: S/M;
   uncontested.

Coherence: items 1-3 make silent corruption/drift structurally detectable at the three
contracts that guard truth (ledger render, public .d.ts, GitHub egress); item 4 converts
one class of external quiet (planned maintenance) into operator-visible truth on the
freshly landed rm-1447 pattern. All four are locally verifiable end-to-end (vitest +
eslint + check-types; no dispatch, no write paths, no estate dependency) — completable in
one implement cycle.

## Exclusions (evidence-backed)

- **`rm-252` absorb (80.0) + `rm-1465` overlay (38.0)** — estate-blocked: deployed gateway
  v0.119.2 advertises contract 1.9.0; the fork pin is 1.9.0 (operator-stream.js:33) and
  upstream floor is 1.11.0 (:35) — absorbing now fail-closes the live operator stream to
  drift at operator-stream.js:1022. rm-1465's own acceptance gates it to ride the absorb
  batch. Window datum refreshed: 26 commits (#615-#641 +1).
- **`rm-1452` contract-parity tripwire (implemented, unlanded)** — implemented in sibling
  run 74d2adff's worktree; first-landed-wins; files absent on 7042635 (probed) so the
  contest is live — do not re-implement.
- **`rm-1451` (18.0) / `rm-191` (78.0) pin sweeps** — unlanded sibling sweep (e394f27c
  worktree) already stages v0.122.3 + codeql 6f2ac81; contest, and rm-1451 is
  outage-gated by its own status line.
- **`rm-1449` majors (26.0)** — typescript 7 / vitest 5 / jsdom 30 / vite-plugin-pwa 2 /
  jest-dom 7 migrations are cycle-scale efforts on their own; not batchable here.
- **`rm-856` base-drift ARG derivation (50.0)** — stays DEFERRED by its own recorded
  pass-over rule; triggers re-derived this selection: Dockerfile base tag UNCHANGED at
  7042635 (the landed Dockerfile delta is the rm-743 HEALTHCHECK only), rm-779/rm-793
  still in_progress, cve-tripwire/base-drift untouched in the 9-commit window.
- **`rm-1450` Fro Bot truth (22.0)** — decision-gated (enable/disable is a recorded
  operator decision, not a delegate call) and its doc half rides the unlanded rm-1410
  tail — contested surface.
- **Top-band standing tracks** (rm-022/100/177/279/284/285/135/111/178/166/280/647…,
  priorities 85-100) — multi-cycle standing work with era riders needing their own
  re-derivation, several CI-visibility-gated (unprovable while Actions is dark), several
  partially superseded by later landings (e.g. rm-284's lint cliff vs the 0-error local
  lint proven at base). None is end-to-end completable inside this cycle.

## Batch mechanics for implement

- Expected surfaces: new render-losslessness test/script (rm-1464); new derive-both-sides
  parity test + `public/operator-stream.d.ts` + `public/operator-run-index.d.ts`
  declarations-or-removal (rm-1466); Octokit construction default headers across
  `src/github/*` + `src/auth/oauth.ts` (rm-855, re-read post-PKCE); Monitoring view +
  snapshot/client wiring + tests (rm-1467).
- Gates: check-types, eslint changed-files, full vitest (root+web), plus the three ledger
  guard suites (roadmap-length, prose-residue, should-release) since ROADMAP.md is in the
  delta. Full validation via the local six-job mirror recipe (Actions dark).
- Landing: base-forward to >=7042635; re-derive rm-1464..1467 occupancy (wall max is
  rm-1452 at 7042635 — family clear today); first-landed-wins vs rm-1459/rm-1462 lineages
  by union-of-invariants/content merge; ROADMAP flips for the four items ride the same
  merge as this doc and the roadmap phase's ledger delta.

## Verification of this selection

- Open pool: 226 open of 248 defs (status census re-derived this session).
- Contest probes on 7042635: `test/public-dts-drift-guard.test.ts`,
  `scripts/conductor-pr-janitor.ts`, `scripts/check-gateway-contract-parity.ts`,
  `test/check-gateway-contract-parity.test.ts` all absent; ROADMAP max id rm-1452.
- Trigger re-derivation for rm-856: `git diff 06095e9..origin/main -- Dockerfile`
  (HEALTHCHECK only), `git show origin/main:Dockerfile | grep ARG NODE_IMAGE` (tag
  unchanged), rm-779/rm-793 status in_progress on 7042635's ledger.
