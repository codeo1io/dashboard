# Dashboard maintenance — cycle 2 batch (2026-09-30, run ff300a3a971f)

module: dashboard
tags: `[security, supply-chain, maintenance, batch-record]`
problem_type: batch-record

Frame: base `31995a2` (== origin/main, verified unmoved at 2026-09-30T19:4xZ — the
19:06Z conductor CI validation PR #302 was closed, not merged). Run
`ff300a3a971f4475a324bb8e08e6c9c7`, repository-maintenance cycle:2. Phases: assess
`7109e31df7fe4de1b0e7c78df42a85ad`, research `0c0e2f1e155949d8ab26152753d2a4b9`,
roadmap `23a26e1b4e8d4a3aa7dde781703e15fb` (roadmap-authored; confirmed and
refined by the prioritize phase — attempt `0ffd38f2887f49fab2563b396c9bebd2`,
selection record in the final section).

## The cycle's mandate

Two themes from fresh evidence. First, **make the advisory truth match the
resolve truth**: 19 dev-scope advisories (8 high) sit open purely because four
override floors sit below the patched lines, and a live scratch resolve proved
the zero-advisory state is reachable today. Second, **kill one silent failure
class on the production posture path** (gateway-session ackCsrf) — deferred to a
follow-on batch, recorded here so it is owned.

## Id-space note (read before prioritizing)

The 2026-09-30 id audit found five stranded lineages colliding at
`rm-276..rm-280` (plus `rm-286..rm-289` in one of them) with mutually different
meanings. This cycle minted above the contested ceiling: `rm-290..rm-294`.
Content-map twins for merge-time reconciliation by content:

- rm-290 == stranded `ccc5c225` rm-276 (hono pair)
- rm-291 == stranded `0a6430c9` rm-286 == stranded `ccc5c225` rm-277 (floors)
- rm-292 == stranded `0a6430c9` rm-287 (Dependabot inert)
- rm-293 — unclaimed elsewhere (CI audit gate)
- rm-294 — unclaimed elsewhere (ackCsrf gateway gap)

## Proposed batch (priority order)

### B1 — rm-291: floors to the patched lines, `pnpm audit --recursive` to zero

- **Scope.** `pnpm-workspace.yaml` only (four floors + GHSA rationale comments),
  then re-resolve `pnpm-lock.yaml`. No `src/` change. Floors:
  `brace-expansion@2 >=2.1.7 <3.0.0`, `brace-expansion@5 >=5.0.12 <6.0.0`,
  `fast-uri@3 >=3.1.8 <4.0.0`, `undici@7 >=7.29.1 <8.0.0`. `toml >=4.2.0`
  untouched.
- **Why proven.** Research scratch `audit-probe` resolved exactly the target set
  (undici 7.30.0, fast-uri 3.1.8, brace-expansion 2.1.7, hono 4.13.12,
  @hono/node-server 2.1.3, jsdom 29.1.1) → `pnpm audit` rc=0. Acceptance is the
  LIVE audit re-run at implement time — advisory metadata drifted hourly on
  2026-09-30, so recorded metadata never gates.
- **Also expected to close Dependabot alerts #29/#30** (fast-uri) on
  re-resolve; verify and dismiss-with-evidence if they linger.

### B2 — rm-290: hono pair lockfile refresh (audit-invisible security fix)

- **Scope.** Same lockfile re-resolve as B1: `@hono/node-server` 2.1.1 → 2.1.3
  and `hono` 4.13.9 → 4.13.12 (or 4.13.11 if before 2026-10-01T09:43Z
  `minimumReleaseAge` maturity; 4.13.12 then rides as a post-maturity follow-up).
  Specifiers `^2.1.1`/`^4.13.9` already admit both — `package.json` untouched.
- **Why it cannot ride Dependabot.** No GHSA exists for the 2026-09-29
  serveStatic double-decode fix; the fork imports the surface at
  `src/server.ts:28`. Manual tracking is the only channel.

### B3 — rm-293: CI `pnpm audit` gate, opened on an already-zero tree

- **Scope.** `main.yaml` step post-install (frozen lockfile, same pnpm as the
  test job) running `pnpm audit --recursive`, failing on any finding; one
  AGENTS.md gates-list line. Lands in the SAME batch as B1 so main never
  reddens from pre-existing debt.
- **Negative proof.** Validation-clone pattern: scratch branch reintroducing a
  sub-patched floor must redden the step.

### Sequenced out of this batch

- **rm-292 (Dependabot enabled-yet-inert).** The live enable-truth read and the
  post-B1 alert-closure verification need the landed state; the implement phase
  should record the pre-land alerts JSON, the verify/stewardship phase the
  after-state. Mechanism evidence already banked: failed update run
  `36745179690` (`security_update_not_possible`, latest-resolvable 3.1.6 vs
  lowest-non-vulnerable 3.1.8, zero conflicts).
- **rm-294 (ackCsrf gateway-session gap).** Code change across server + web +
  two docs with its own red-before-green tests; independent of B1–B3. Strong
  next-batch candidate.

## Riders (in-range currency, zero-risk)

- `@opencode-ai/plugin` 1.18.32 → 1.18.33.
- `@types/node` 24.13.3 → 24.19.0 (exact-pin direct edit).
- Dockerfile `node:24-slim` digest refresh (line tip 24.21.0; three stages).
- `fro-bot/agent` pin v0.115.1 → v0.117.0 (sha `e6efc1f1` verified): CLAIMED by
  the unlanded cycle-1 batch (run a666f8c0) — do NOT double-claim; if cycle-1
  lands first this rider drops, reconcile by content per the fleet rule.

## File-set guard for this batch

Touch only: `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
`.github/workflows/main.yaml` (audit step), `AGENTS.md` (gates line), plus the
riders' `package.json`/`Dockerfile`/`fro-bot.yaml` lines. Overlap with the
unlanded cycle-1 batch is `pnpm-lock.yaml` only, on different lines (floors vs
runtime pair). Do not touch `src/` in this batch (rm-294 owns the next one).

## Non-goals (owned elsewhere)

Majors window incl. undici 8 / jsdom 30 / pnpm 12 / TS 7 / impeccable@4 —
rm-271. Upstream absorb and gateway contract growth — rm-252. Enumeration
budget observability — rm-221's 2026-09-30 rider.

## Prioritize-phase selection record (2026-09-30T22:0xZ, attempt `0ffd38f2`)

**Verdict: B1 `rm-291` + B2 `rm-290` + B3 `rm-293` confirmed as this cycle's
implementation batch**, riders as proposed, `rm-294` designated next batch.
The proposal above is roadmap-authored; this section is the prioritize
phase's independent record — census, live re-probes, fleet claims, scoring,
and the explicit rejection of alternatives.

### Census and funnel

Open-section census at selection time: **120 ids — 45 pure `candidate`, 56
`implemented <date> (… pending landing …)`, 2 `in-progress`, 2
`blocked-external`, 14 `completed` flip-stragglers, 1 `partially`**. The 56
implemented-pending-landing ids (incl. rm-178 p91, rm-166 p88, rm-142 p86,
rm-251 p85, rm-105 p80, rm-112 p75, rm-225 p76) belong to unlanded lineages —
they are the landing queue, not a selection queue. Selection therefore runs
over the 45 pure candidates plus this cycle's new mints, prioritized by
ledger priority within impact/risk/effort/dependency constraints.

### Live re-probes at selection time (2026-09-30T22:0xZ, all green for B1)

- `pnpm audit --recursive` (worktree, registry-live): **19 advisories — 3 low
  / 8 moderate / 8 high** — identical to the assess read ~2.5h earlier.
- `gh api .../dependabot/alerts?state=open`: **#29 + #30 (high, fast-uri)
  still open** — the closure claim stands.
- `git ls-remote origin main` == `31995a2` — base unmoved.
- `gh pr list --state open`: only ephemeral conductor-CI validation PRs plus
  the two known unlanded landing PRs (#196, #206) — **no open PR claims the
  dependency-currency file space** (pnpm-workspace.yaml floors, pnpm-lock
  re-resolve, main.yaml audit step).
- In-tree absence checks: pnpm-workspace.yaml:25-33 floors still 2.1.2 /
  5.0.7 / 3.1.5 / 7.29.0; zero `pnpm audit` occurrences anywhere under
  .github/workflows/; `code_challenge` absent across src/ and web/src/.

### Why the higher-ledger-priority items are not this batch

- **rm-104 (p98, render hardening)** — the defect's actor is the fleet render
  generator; every cure half (vendored-path exclusion, stack-correct evidence,
  lint-clean output) lands outside this repo. Cannot complete end-to-end here.
- **rm-102 (p90, first dependabot PR)** — window closes ~2026-10-03;
  verification-only, nothing to implement.
- **rm-103 (p85, automated absorb cadence)** — automates an absorb whose next
  big step (rm-252) is L-effort multi-cycle; premature now, churn + fleet
  coordination surface. Next-cycle opener candidate.
- **rm-252 (p80, gateway absorb)** — L effort, live-gateway verification; its
  own riders make it multi-cycle.
- **rm-249 (p72) / rm-106 (p70)** — dependency-blocked (gateway-side contract
  extension + product decision on push delivery).
- **rm-149 (p66, OAuth PKCE)** — genuine candidate (grep `code_challenge` = 0
  at base), but its file set (src/routes/auth.ts, src/auth/oauth.ts, auth
  tests) is contended by unlanded auth lanes (open PR #196; the closed #302's
  auth-pkce cluster) — merge risk without fleet dedupe. Deferred.
- **rm-116 (p58, required checks on main)** — ordering hazard twice over:
  enabling required checks mid-cycle would block this cycle's own landing, and
  Main's Lint job is cancelled-at-35m on main (run #353, 2026-09-30) —
  requiring it now would brick merges until the ROADMAP lint cliff is cured
  (that cure itself rides an unlanded integration lane).
- **rm-117 (p44, posture panel)** — real but M-effort UI+API work; lower value
  density than the selected batch.

### Scoring of the selectable set (impact / risk / effort / dependencies / strategic)

| item | impact | risk | effort | deps | strategic | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| rm-291 floors | High: closes 8 high + 8 mod + 3 low advisories; 2 open HIGH alerts | Low: dev-scope, lockfile-only, live-proven resolve | S | none (B3 rides it) | advisory truth == resolve truth | **select** |
| rm-290 hono pair | Med-High: audit-invisible security fix on a served surface (server.ts:28) | Low: in-range re-resolve, maturity-gated | S | rides B1 re-resolve | closes an automation blind spot | **select** |
| rm-293 audit gate | Med: recurrence prevention, CI truth | Low when opened on a zero tree | S | needs B1 first (same batch) | self-enforcing posture | **select** |
| rm-294 ackCsrf | High: silent capability loss on the prod posture path | Med: auth-adjacent, src+web+docs+tests | M | independent | next batch headliner | **next** |
| rm-149 PKCE | Med-High | Med: contended file set | M | none | auth hardening | defer |
| rm-292 dependabot truth | Med: automation-truth record | Low | XS probes | needs B1 landed | evidence for the standing item | sequence |

The three selected units share one file set and one verification pipeline
(install → live audit → check-types → tests), tell one story, and no unit
depends on anything outside the batch. That coherence — not any single score —
is the selection argument.

### Fleet claim map (anchor by content, never bare id)

The dashboard fleet id ceiling moved twice this cycle: stranded refs at
rm-276..280/286..289, sibling lanes to rm-298, and the spool ceiling now reads
**≥ rm-308** (sibling runs a22e43a2 and f716b7e7 roadmap mints). rm-291..294
sit below the live ceiling and numerically collide with sibling meanings, so
this batch is anchored **by content**: floors / hono pair / audit gate.

- floors twins: rm-276 (d997d9a8, a666f8c0), rm-282 (a923284c), rm-286
  (0a6430c9), rm-291 (f91bcdc2), rm-298 (f716b7e7, 84973783), rm-303
  (a22e43a2)
- audit-gate twins: rm-278 (d997d9a8), rm-293 (f91bcdc2), rm-299 (f716b7e7),
  rm-304 (a22e43a2)
- hono-pair twins: rm-290 (ff300a3a), rm-285 (f89673c5), a666f8c0 B2, rm-306
  (a22e43a2)

Sibling f716b7e7's independent dual-channel probe (registry advisory-bulk +
OSV, 2026-09-30 ~18:4xZ) corroborates this batch's exact floor set — multi-
lane convergence is itself evidence the selection is the fleet's best. Landing
is first-wins with content-dedupe: if a sibling lands first, B1/B2 collapse to
verification and B3 remains this lane's differentiating deliverable. Any NEW
mint this cycle (none is needed) must re-probe the spool ceiling and go
≥ rm-309.

### Implement-time drift guidance (refinements to carry forward)

- Undici metadata seesawed three times on 2026-09-30 (fix line read 7.29.1,
  then above it, then 7.29.1-clean). The floor stays `>=7.29.1 <8.0.0`; the
  lockfile resolves 7.30.0 (published 7.x tip; 7.30.1/7.31.1 unpublished) under
  every reading; **the gate is the LIVE post-resolve `pnpm audit --recursive`
  == 0 at implement time** — never recorded metadata, never bulk-OSV.
- hono 4.13.12 matures 2026-10-01T09:43Z (minimumReleaseAge 1440): if the
  implement phase runs before maturity, take 4.13.11 + @hono/node-server
  2.1.3 and list 4.13.12 as the post-maturity follow-up rider.
- After the floors land, verify alerts #29/#30 close; if they linger (inert
  security-updates — rm-292 evidence), dismiss with the resolve evidence.

### Rejected batch alternatives

- **rm-294-led batch** — highest single-item code impact, but M-effort across
  server + web + two docs with red-before-green tests halves completion
  certainty in a completion-locked cycle, and it is independent of the floors
  story. Designated next batch.
- **PKCE-led batch (rm-149)** — contended auth file set, no batch synergy.
- **Absorb-cadence batch (rm-103)** — premature per above.
- **Floors-only (B1+B2 without B3)** — leaves the cured state unguarded; the
  recurrence class (advisory drift invisible to CI, three independent proofs)
  is exactly what the gate closes, and it costs one workflow step when opened
  on an already-zero tree.

### Next-batch inputs (recorded, not selected)

- rm-294 ackCsrf (content-unclaimed by siblings at selection time).
- rm-292 pre/post-land alerts JSON (implement + verify record it).
- Sibling-noted rm-305 (a22e43a2: boot-snapshot redaction gap extending landed
  rm-198) — **unverified by this cycle's assess** (our read found the
  redaction surface landed and heavily tested); needs its own verification
  before any implementation claim.
- rm-103 + rm-116 as next-cycle openers, after this cycle's landing.

## Prioritize-phase salvage adoption (2026-10-01T03:4xZ, attempt `d05ec082b2864f9b9159e3f389b7fa87`)

Provenance: attempt `0ffd38f2887f49fab2563b396c9bebd2` wrote the selection
record above (2026-09-30T22:01-22:12Z) and was provider-reaped before its
envelope landed; attempt `17972010193642d7bf731846a3eb46c4` re-fired
2026-10-01T02:04Z and died pre-edit (no scratch, no worktree writes — file
mtimes prove the doc untouched since 22:11:49Z). This attempt verified and
adopts the record. Verification legs, all green at 2026-10-01T03:2xZ:

- Doc integrity: worktree copy byte-identical to the authoring attempt's
  `batch-doc-final.md`; ROADMAP.md 54 insertions / 3 deletions, 159 id defs,
  0 duplicate ids, max `rm-294`, cycle mints at lines 925-949.
- Census reproduced exactly: 120 open defs = 45 `candidate` + 56
  implemented-pending-landing + 14 completed flip-stragglers + 2 in-progress
  + 2 blocked-external + 1 partially.
- Base preconditions hold: `pnpm-workspace.yaml` override floors still
  `2.1.2` / `5.0.7` / `3.1.5` / `7.29.0`; zero `pnpm audit` occurrences
  under `.github/workflows/`; `code_challenge` count 0 across `src/` +
  `web/src/`.
- Live: `pnpm audit --recursive` == 19 (3 low / 8 moderate / 8 high),
  identical to both earlier reads; dependabot alerts #29 + #30 (fast-uri,
  high) still open.

World moves since 22:12Z — neither changes the selection:

- origin/main moved `31995a2` -> `5bf15e1` (landing of run `c06f7bf3d796`),
  a docs-only delta (`ROADMAP.md` + one prioritization doc): no batch surface
  touched, so the batch's code files stay conflict-free against main.
- Sibling PR #325 (run `23d39aa7467e`: `audit.yaml` + floors + dependabot)
  was CLOSED UNMERGED at 2026-10-01T01:05:55Z (`mergedAt` null); PR #315
  (cycle-1 floors lane) remains OPEN but CONFLICTING/DIRTY. The
  dependency-currency cure now has NO live claimant — first-wins dedupe no
  longer defers anything, and this lane implements the full batch fresh.

Verdict reaffirmed unchanged: **B1 `rm-291` floors + B2 `rm-290` hono pair +
B3 `rm-293` CI audit gate** this cycle; `rm-294` next batch; `rm-292` rides
implement/verify probes. Two implement-time refinements added 2026-10-01:

- `pnpm update <pkg>` rewrites the `package.json` specifier even for
  in-range bumps — for a lockfile-only bump, restore `package.json` from
  HEAD and run plain `pnpm install` (re-syncs importer rows, keeps
  resolutions).
- hono `4.13.12` matures 2026-10-01T09:43Z; if implement runs before that,
  take `4.13.11` + `@hono/node-server 2.1.3` and list 4.13.12 as the
  post-maturity follow-up rider.
