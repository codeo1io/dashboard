# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-04, run 7e6ab9da)

module: dashboard
tags: `[reliability, observability, workflow, batch-record]`
problem_type: batch-record

Frame: base `227375247` (== origin/main, porcelain at dispatch exactly the
roadmap phase's uncommitted ` M ROADMAP.md` +13/-0 — this run's own extension,
riding the worktree per fleet pattern). Run
`7e6ab9daeb50456298eded139e16f014`, repository-maintenance cycle:1. Phases:
assess `96595abfa87b41f8a210ffcb0bb646ed` (prior attempt `c4a16c4f`
reap-failed at 33s with zero work — rejected with event-log forensics, phase
redone from scratch), research `8acbcb96218447f186a0e608f517213f`, roadmap
`5120eb445a8d47519cbfa391de87789b` (mints rm-622 + 5 riders; fleet census
ceiling rm-621 across all 167 sibling worktrees), prioritize attempt
`7c8e3fa726d34074a7e9ae32e398fae8` (first pass; its result JSON went
unadopted), re-dispatched as attempt `55cd8ca809d64445b4211d9cb801e39d` —
selection RE-VALIDATED against a fresh 177-worktree census, not assumed:
B1/B2 confirmed clean, B3 rm-286 dropped as content-claimed by a live
sibling implementation lane (see "Re-validation"). This document is the
authoritative batch record.

## The cycle's mandate

One theme: **bound and observe the maintenance loop's own failure surfaces.**
Two reliability members, all self-contained, all independently testable
in-tree, zero live-sibling collisions (each re-verified unclaimed at the
re-dispatch census — see "Re-validation"), zero time gates that expire this
cycle, and no member touching a surface another lane has in flight:

- **B1 / rm-622 (reliability 42.0, this run's mint)** — the design-check
  detector timeout abandons a live subprocess tree instead of cancelling it.
- **B2 / rm-289 (reliability 38.0, open since 2026-09-30, re-verified
  unclaimed)** — scheduled guard workflows can sit red for days with no alert
  route; the canary's 2026-09-28 failure was noticed by a human 3+ days
  later. **Time-sensitive:** the first-ever scheduled fire of
  `upstream-drift` (Mon 2026-10-05 05:17Z) and the rest of the Monday early-
  UTC cluster (audit 03:37Z — audit's own first fire, base-drift 04:13Z,
  canary 05:23Z) are the item's first live test window — landing B2 before
  that window means the watcher's first dispatch produces real evidence from
  real fires.

The first pass's third member (**B3 / rm-286**, rate-limiter key-store
admission cap) was **DROPPED at re-validation**: run-146d73f2's live
worktree now carries the full admission-cap implementation uncommitted (the
diff literally comments `(rm-286)`), and their cycle-1 batch doc selects it
as their own B1. Re-taking it would duplicate a landing lane — the exact
anti-race failure this fleet punishes. Full evidence and disposition in
the "Dropped at re-validation" section; the scope correction it carried
(archived PR #233 U3 half-landed) is preserved there for the record.

## Why not the ledger's top-priority candidates (grounded, not hand-waved)

- `rm-104` (98.0) / `rm-279` (96.0) — the Main-Lint/ROADMAP-pathology saga:
  cured in practice (green Main runs; the paragraph-split cure landed), status
  fields stale, and the surface is content-claimed by multiple live lanes.
  Re-attacking races siblings on a cured symptom; rm-279's own next step is a
  mootness/closure re-assessment, not code.
- `rm-284` (97.0), `rm-285` (92.0), `rm-288` (72.0), `rm-280` (84.0) —
  `implemented ... in-tree` 2026-09-30 awaiting their own lineages' integrates.
  Selectable by no one but their owners.
- `rm-149` (66.0, OAuth PKCE) — main still has zero `code_challenge` hits
  (re-grepped this phase), but the content is claimed by the unlanded
  `2ee1c4841e9d` lineage, whose validation branch carries
  `test/auth-pkce.test.ts` (rm-281's signals cite it at :125). Racing a
  landing lane on the same auth seam guarantees an integrate conflict for no
  gain.
- `rm-103` (85.0, absorb cadence) — its automation
  (`upstream-drift.yaml`) landed days ago; the item's own rider says the
  first scheduled fire (Mon 05:17Z) is the live watch point. Acting before
  the first fire re-derives what the fire will show for free.
- `rm-252` (80.0, gateway absorb window) — multi-cycle; today's rider already
  recorded the release-aligned target (2026.10.8 + ghcr digest) and the
  no-op-absorb proof for upstream PRs #538/#549.
- `rm-249` (72.0), `rm-274` (30.0), `rm-514` — the SW/logout/ErrorBoundary
  standing set is the fleet's most-contested cluster (unlanded sibling claims
  rm-501/512/514/519/520/523 + the 2365e728 family). Deliberately not raced.
- `rm-116` (58.0, branch protection fill) — the live-API fill has now been
  deferred by two implement phases as outside implement authority; its
  observability half is exactly what B2 generalizes (alert on guard reds)
  without touching the protection object. The fill stays sequence-gated for a
  push-authorized phase; re-probe at landing per the standing rider.
- `rm-139` (24.0, node:26-slim rebase) — the rebasable edge is Node v26 LTS
  promotion ~2026-10-28; selecting now forfeits the window's payoff.
- `rm-281` (62.0) — rides a specific landing lineage's CodeQL check; not
  standalone tree work. `rm-226` (44.0) — same `src/server.ts` gateway-auth
  middleware region as unlanded sibling ack-CSRF work; adjacent-surface risk
  outweighs its value this cycle. `rm-481` — engine-side infrastructure,
  outside the tree.

## Re-validation (re-dispatch attempt `55cd8ca8`, 2026-10-04)

Fresh census over all 177 run worktrees (id claims via per-worktree
`git diff HEAD -- ROADMAP.md` `^- id:` extraction; in-flight surfaces via
per-worktree porcelain + `src/server.ts` hunk headers):

- **B1 / rm-622 confirmed clean.** Zero worktrees carry any uncommitted
  change under `.opencode/impeccable/` (hook-bridge.ts, plugin.ts,
  plugin.test.ts all untouched fleet-wide); no id claim on rm-622; the
  sibling id ceiling in uncommitted trees is rm-634 (run-5411da39, with
  run-ebdce89e at rm-632 and run-a86ee3dc at rm-633), with this run's own
  rm-622 the only mint in ITS tree. Code facts re-verified
  first-hand at base 227375247: `DETECTOR_TIMEOUT_MS = 5000` exported
  (:33 area), `CreateHookOptions.runDetector` seam (:135-139), `withTimeout`
  racing without cancelling (:143-152), sentinel → no-op degrade (:237),
  `createDefaultRunner` spawning `node …/hook.mjs` via Bun `$` (plugin.ts
  :16-30), and plugin.test.ts pinning only the no-op half (:196-203).
- **B2 / rm-289 confirmed clean and premises re-probed live.** No worktree
  has a `watchdog` workflow or any new `.github/workflows/` scheduled file
  (the dirty workflow edits are d1850b2e's codeql/dependency-review/
  fro-bot/scorecard pins, b528f707's release.yaml, 5bf98ac3's stale
  base-drift/canary/visual trio). Live re-probes this attempt:
  `gh api repos/codeo1io/dashboard --jq '{has_issues,private}'` →
  `{"has_issues":false,"private":false}` (the `::error::` + exit-1 channel
  remains the only alert route, exactly as designed); the canary's latest
  run is STILL the 2026-09-28T11:46:01Z `failure` (no run since — the
  3-days-unnoticed premise stands); cron lines re-verified in-tree
  (audit `'37 3 * * 1'`, base-drift `'13 4 * * 1'`, upstream-drift
  `'17 5 * * 1'`, canary `'23 5 * * 1'`, plus scorecard `'27 6 * * 1'` and
  codeql Wed `'31 7 * * 3'` — the watcher's query set should cover the full
  guard set, not only the Monday four); `base-drift.yaml:114-125` guarded
  `has_issues` probe pattern re-read; the persist-credentials census guard
  floor re-read (`test/workflow-persist-credentials-guard.test.ts:60`
  `expect(allSteps.length).toBeGreaterThanOrEqual(16)` — a new workflow
  with a checkout must set `persist-credentials: false` to keep the census
  green; a checkout-free watchdog adds only census-safe steps).
  One adjacency, not a collision: run-73365170's worktree appends a new
  `## Upgrading the gateway past v0.116.0` section (+59 lines, mid-file)
  to `docs/runbooks/gateway-access.md`. B2's runbook content should land as
  a NEW file (e.g. `docs/runbooks/guard-watchdog.md`) or an EOF append —
  pure additions auto-merge either way, but keep it regionally disjoint.
- **B3 / rm-286 dropped — content-claimed.** See the next section.

## B1 — rm-622: cancel the detector subprocess tree on hook-bridge timeout

- **Scope.** `.opencode/impeccable/hook-bridge.ts` `withTimeout` (:143-152)
  races the detector promise against `DETECTOR_TIMEOUT_MS` (5000, exported
  :33) and, on the sentinel, degrades `createHook` to a no-op (:237/:239-243)
  — but the LOSING `runDetector` promise is never cancelled. The default
  runner (`.opencode/impeccable/plugin.ts:16-30`) spawns
  `node …/hook.mjs` via the injected Bun `$` shell and returns the bare
  promise, so one slow design-check scan past 5s strands a whole process
  subtree per occurrence with nothing observing it. Seam by design:
  `CreateHookOptions.runDetector` (:135-139). Upstream corroboration:
  fro-bot/dashboard#193 (open since 2026-07-10).
- **Change.** Thread cancellation into the seam: `withTimeout` accepts an
  `AbortSignal` (or an options-level cancel callback) and aborts it on the
  sentinel; the default runner kills the Bun-spawned process tree on abort;
  `createHook` constructs the signal at the race site (:197/:231). Keep the
  existing no-op degrade behavior for the hook caller.
- **Acceptance.** `plugin.test.ts` extends the existing no-op test (:196-203)
  with (1) a cancellation assertion — the signal is aborted / kill invoked
  when the runner exceeds the timeout — and (2) a late-resolve test proving
  the abandoned promise cannot surface as an unhandled rejection. The
  pure-Node seam stays testable per the file's design contract; the
  Bun-runtime path, if CI cannot execute it, is evidenced by a local Bun
  transcript plus the recorded reason (house rule: record validation
  evidence byte-exactly, never read cleared output as green).

## B2 — rm-289: alert route for scheduled-guard failures (land before the Monday window)

- **Scope.** Four scheduled guard workflows can fail silently:
  `audit.yaml` (Mon 03:37Z), `base-drift.yaml` (Mon 04:13Z),
  `upstream-drift.yaml` (Mon 05:17Z, first fire ever on 2026-10-05),
  `canary.yaml` (Mon 05:23Z). The canary's only-ever run failed
  2026-09-28T11:46Z and sat red 3+ days before a human noticed — no
  notification, no issue, no panel. Acceptance option (a) of the item:
  a GITHUB_TOKEN-only self-watch.
- **Change.** New `.github/workflows/watchdog.yaml`: scheduled daily +
  `workflow_dispatch` (dry-run mode), `permissions: {contents: read,
  issues: write}`, GITHUB_TOKEN-only; queries each guard workflow's latest
  conclusion via the Actions API
  (`/repos/{repo}/actions/workflows/{id}/runs?per_page=1`); on any
  `failure`/`cancelled`/`startup_failure` conclusion: `::error::` annotation +
  unconditional `exit 1` (the primary alert channel — this repo has
  `has_issues=false`, live-probed this phase), plus best-effort issue-open
  guarded by a live `has_issues` probe exactly per the established
  `base-drift.yaml:114-125` pattern (skips cleanly when the API 410s). New
  runbook section in `docs/runbooks/` naming the failure mode, the channel
  precedence (red run + annotation first; issue only if ever enabled), and
  the Monday window.
- **Acceptance.** A dispatch dry-run (read-only mode: report what it WOULD
  alert on, no exit 1) whose output demonstrates negative-proof against the
  2026-09-28 canary failure — i.e. the detection predicate, pointed at the
  historical run list, selects that run. First scheduled run after landing
  produces its own Actions conclusion. Workflow satisfies house gates:
  `persist-credentials: false` if any checkout step exists (guard census
  stays ≥16/16), `timeout-minutes` on every job, single-quoted YAML strings
  (eslint `yml/quotes`), actionlint via the container form, Design Check pin
  untouched.
- **Sequencing note.** If this batch lands before Mon 2026-10-05 03:37Z the
  watcher's first dispatch observes the whole cluster; if it lands after, the
  dry-run still proves the predicate against the cluster's real results and
  the first scheduled fire is the following day. Either ordering satisfies
  the acceptance; earlier is strictly better.

## Dropped at re-validation — rm-286: admission cap for the rate-limiter key store

The first pass selected this as B3 with a scope correction (kept for the
record): the stale-window sweep half of the archived PR #233 U3 ask EXISTS
on main (`sweepRateLimitMap` at `src/server.ts:245-251`, amortized every
`EVICT_INTERVAL` calls at :259-263); the missing half was the admission
bound — `rateLimitMap.set(ip, entry)` at `:269` is unconditional, so a
client rotating source addresses (or first-XFF hops under
`RATE_LIMIT_TRUSTED_PROXY`) grows the map without limit between sweeps.

**Drop evidence (fresh census, this attempt).** `run-146d73f2`'s worktree
carries the complete implementation uncommitted: `RATE_LIMIT_MAX_KEYS =
envIntOrDefault('RATE_LIMIT_MAX_KEYS', 10_000)` beside
`RATE_LIMIT_MAX_PER_CLASS`, an `admitRateLimitKey()` admission gate wired
into `checkRateLimit`'s `rateLimitMap.set` site with a fail-closed return
(denying the NEW arrival, never evicting an existing key), a
`rateLimitStoreSize()` accessor for tests, and the matching
`test/rate-limit-config.test.ts` extension — the diff's own comment reads
`(rm-286)`. Their batch doc
(`docs/prioritization/2026-10-04-repository-maintenance-cycle-1-batch-run-146d73f2.md`)
selects it as **their B1** in a 4-member cycle-1 batch (rm-286 + rm-594 +
rm-596 + rm-595), implemented-in-worktree. Additionally, the limiter
region is a multi-lane seam right now: run-845265c83109 holds an
uncommitted rm-560 sampled-denial-logging lane in the same block
(`rateLimitDenialLogMap` state at the :145 area plus deny-branch edits in
`buildDashboardApp`), and run-fefc40679c69 carries the raw-pathname
classification lane (hunks at :155/:221/:754/:858). rm-286 is therefore
owned by content; this run does not re-take it. If that lineage dies
unlanded, re-derive against then-current main before re-homing (the
archived U3 scope in `docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md`
remains the source of truth).

## Handoff notes for implement

- The roadmap phase's uncommitted ` M ROADMAP.md` (+13/-0: rm-622 mint + 5
  riders + extension #11 comment) rides this worktree into the landing per
  fleet pattern; content-reconcile (never bare-id) if a sibling integrates
  first — the fleet ceiling at this run's mint was rm-621, and the twin
  clusters are enumerated in the extension #11 comment.
- B2's workflow must not regress the standing guards:
  `test/workflow-persist-credentials-guard.test.ts` (≥16 census), actionlint
  container form, `yml/quotes`. B2 also gets `concurrency` discipline if it
  dispatches during a landing.
- B1 evidence: if the repo's CI cannot execute the Bun path, run it locally
  (`bun .opencode/impeccable/plugin.ts`-adjacent harness) and record the
  transcript + reason in the implement notes — do not silently skip.
- rm-286 (dropped at re-validation) is owned by run-146d73f2's live lane —
  no limiter-region work in this batch; if integrate reconciles their tree,
  nothing here overlaps it. rm-221 (bare-Octokit pagination
  throttle/retry at `src/github/installations.ts`) is the batch's recorded
  first alternate: verified unclaimed at this census (zero worktrees dirty
  on installations.ts; the only sibling mentions are dated rider-text
  reprints inside stale extension comments) — take it NEXT cycle, not as a
  mid-cycle third member; its remaining scope is M effort on the
  auth-adjacent mint path and B2's deadline does not want the dilution.
- Re-probe at landing: `gh api repos/codeo1io/dashboard --jq .has_issues`
  (if issues ever become enabled, B2's issue channel activates via the
  existing guarded path — no change needed), and branch protection state for
  rm-116's standing rider.

## Next-cycle candidates (recorded, not selected)

1. **Monday-window evidence read** (rm-289/rm-252/rm-282 riders): the
   2026-10-05 early-UTC cluster is the first live test of the drift-report
   mechanism and the watchdog; the next assess/research reads it.
2. **rm-116 fill** — remains sequence-gated for a push-authorized phase;
   check names verified on record (six Main jobs + CodeQL `Analyze`).
3. **rm-279 mootness closure** — weigh closing as cured-by-content on the
   accumulating green-Main evidence.
4. **rm-139** at the Node v26 LTS window (~2026-10-28).
5. **rm-221** (28.0) — the only clean-surface local candidate left at this
   census (installations.ts untouched fleet-wide); remaining scope is the
   throttle/retry seam + per-instance cache scoping + injectable clock.
6. **rm-286 disposition** — owned by run-146d73f2's lane; if it lands, fold
   this run's archived-scope knowledge (sweep half already on main) into
   the ledger at compound; if their lane dies unlanded, re-derive before
   re-homing (see "Dropped at re-validation").
