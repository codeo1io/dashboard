# Prioritize — repository-maintenance cycle:3 batch selection

- run: 19ea6b41a7b8434ab8de877e118d3aec (repository-maintenance:acd094b44dfb48d9b10377814f8ca42f, cycle:3)
- phase: prioritize (attempt 420a39e1383b48dfac6870e1118086b7); base HEAD 55aedc97 == origin/main, in-tree uncommitted roadmap delta from the roadmap phase (+21/-0, mints rm-2055/rm-2056)
- selected: 2026-10-18T21:3x–22:0xZ UTC
- prior-attempt forensics: attempt 6d0627bd died of a provider failure ~5 min in (event log = heartbeats + `session_reaped`/`exit_reason=failed`, restart at 5m1s, no typed artifact, no scratch anywhere) — nothing durable to adopt, redone from scratch.

## SELECTED BATCH — "landing-pipeline governance fill + post-outage ledger epilogue"

One coherent theme: make landings trustworthy. Every element either enforces a
gate the repo has been missing (branch protection), retires stale surfaces the
landing pipeline trips over (dead PRs, stale digest prose), or closes
met-at-HEAD ghosts so the ledger stops over-reporting open work.

### 1. rm-878 — branch-protection fill (ANCHOR, ops + doc reconcile)

- Live state re-probed 2026-10-18T21:4xZ: `required_status_checks.checks: []`,
  `strict: false`, `enforce_admins.enabled: false` — the empty shell AGENTS.md
  warns about ("Nothing structurally blocks red-check merges until rm-116
  lands") is still the live object.
- Execution shape (for implement): mutate IN PLACE via
  `gh api -X PUT /repos/codeo1io/dashboard/branches/main/protection` with the
  full body preserved (never delete+recreate — check-list loss trap), required
  checks = Main-workflow job conclusions + CodeQL derived from a fresh green
  Main run — 2026-10-18 reference run 39129950649 at HEAD 55aedc97 yielded:
  Check Types, Lint, Test, Design Check, visual, Test Scripts Load,
  Check Workflows, Release guard (Main jobs) + Analyze (CodeQL workflow);
  skip Release / Dispatch infra deploy / Scorecard analysis (conditional lanes).
  `strict: true`, `enforce_admins: true`, no required reviews.
- AGENTS.md reconcile: the two rm-116 references at AGENTS.md:125/:127 rewrite
  to the filled live state. DO NOT touch the Fro Bot para at :94 this cycle —
  it is content-claimed by open PR #787 + unlanded lanes (see deferrals).
- Landing-gate interplay, pre-declared: after enforcement our OWN landing is
  the first test; if the merge trips enforcement, use the documented override
  dance (temporarily `enforce_admins.enabled=false`, land, re-enable in the
  same session) and re-probe — never delete the object.
- Why now (strategic): the queued era (markdown port lane, impeccable v4 port,
  14-commit absorb window) multiplies landings; enforcement lands BEFORE that
  wave, so every future landing inherits it. The campaign's most-repeated
  incident class (red-check merges, dropped files, false-green merges) is
  exactly what this closes.

### 2. rm-888 — completion of the codeql-action re-pin item (ops + ledger)

- Digest floor MET AT HEAD (discovered this phase): all four sites sit at
  `6f2ac81` — codeql.yaml:32/:38, scorecard.yaml:42, release.yaml:386 (the
  def's signals text at 24c5418/:56/:62/:357/:51 is stale). Live action tip is
  3db7caf9014b962f9392088c0fcaf53eeddf47db (>= floor; an optional bump, record
  it, don't force it). No workflow-file edits owed.
- Owed legs: (a) PR #508 disposition — content-check its diff vs HEAD; the
  digest re-pin payload is superseded by main's landed 6f2ac81 → close with a
  dated superseded-by comment (rm-517 convention: closures only, no
  force-push, no merge; if any NON-digest payload in it is still unlanded,
  name it in the comment); (b) PR #509 same treatment (dep + action-digest
  refresh — verify the dep halves against the lockfile before declaring
  superseded); (c) rm-191's acceptance digest reference retargets off the
  stale 2892aa5 to live reality; (d) first-landed-wins recorded (main's lane
  already won the digests).
- Both PRs confirmed open 2026-10-18 (`gh pr list`: 998, 860, 798, 790, 787 —
  no #508/#509 in the default list output; re-probe at implement).

### 3. Ledger epilogue — met-at-HEAD truth closes (zero-code, evidence rides implement)

| def | priority | close evidence (re-verify at implement) |
| --- | --- | --- |
| rm-100 | 100.0 | gates green at HEAD 55aedc97: check-types rc0, lint rc0, test 81 files/3640 tests green (assess attempt 977dbdd0) + green CI run 39129950649 |
| rm-284 | 97.0 | `pnpm lint` rc0; CI `Lint :: completed/success` on 55aedc97; zero ROADMAP lines >4000 chars (re-scan at implement) |
| rm-885 | 90.0 | run creation demonstrably revived: green Main run 39129950649 on a main-line SHA, PR checks executing on #998 (opened 19:11Z today), scorecard runs live; root cause = externally imposed (rm-1437's rider carries the 422 evidence) |
| rm-282 | 74.0 | floors live + `pnpm audit --prod` clean (re-probed 2026-10-18T21:4xZ); `pnpm audit -r` exit 0 re-probe at implement (#860's rm-285 rider recorded it 2026-10-16) |
| rm-890 | 74.0 | the ephemeral PRs it names (#776/775/761/760/759/533/521) are already reaped; open set re-census recorded; its four line-by-line re-verifications ride THIS batch's closes (rm-131/177/285 already flipped by #860; rm-178 stays owned by the 475b46bc lane) |

None of these five are flipped by open PR #860 (its diff flips rm-177/285/131/251/873/874 only — verified via `gh pr diff 860`).

### 4. Supersede / reclassify / defer riders (decisions recorded now, flips ride implement)

- **rm-022 (100.0) SUPERSEDE-by-rm-2055**: all 20 "untested modules" live under
  `.agents/skills/impeccable/scripts/` — the exact vendored tree rm-2055
  deletes (upstream #661). Writing 20 test files there would be destroyed by
  the flagship port; also run 6b6520e9's lane already carries an
  impeccable-hook-deadline guard test covering one of those modules (an
  UNLANDED file — not at HEAD). Also note the def's recorded
  acceptance references `python -m pytest` — an ingest artifact, not a repo
  convention.
- **rm-021 (90.0) RECLASSIFY**: the flagged complex functions live in
  `web/dist-fixture/assets/index-*.js` — committed BUILD FIXTURES (minified
  dist output), not source. Refactoring minified fixtures is a non-goal;
  reclassify the def (complexity scans must exclude dist-fixture paths).
- **rm-863 (94.0) SUPERSEDED-by-adoption**: main's 2026.10.43 adoption already
  delivered the 1.11.0 operator-contract code-side catch-up (rm-252 merge
  rider's own correction); the deployment-gated proof it still names is stale.
- **rm-279 (96.0) PREMISE-HEALED + DEFER**: CI Lint is green at 53s-class on
  main (and local rc0); the 60-min cliff pathology no longer reproduces. The
  remaining decomposition + ROADMAP mega-line split targets main.yaml (3
  unlanded lanes) and ROADMAP.md (37 unlanded lanes) — the worst merge surface
  in the estate for the least marginal value. Defer until the lane forest
  drains.
- **rm-2055 (82.0, THIS RUN'S MINT) DEFER to next-cycle flagship**: (a)
  congestion — main.yaml 3 lanes (05696568/377dee0b/adb01769), the vendored
  hook launcher file under the impeccable skill's scripts dir is 1 lane
  (6b6520e9 — its guard test targets the launcher rm-2055 deletes),
  `.impeccable/config.json` 1 lane
  (05696568); (b) dependency — absorb-verify's post-#648 Bun-aware
  re-derivation is in flight elsewhere (run-a5970272's absorb-truth lane /
  rm-2060 mint) and rm-2055's acceptance gates on it; (c) one-mega-port-at-a-time
  — the markdown port (fog rm-1513 / fog rm-2045 shape) is already in flight as
  377dee0b's 33-file lane. Re-select once the gate lands + the markdown lane
  lands.
- **rm-2056 (77.0, THIS RUN'S MINT) PRE-ARMED, observation time-gated**: live
  2026-10-18T21:4xZ — all 15 workflows ACTIVE; cve-tripwire (378215895) and
  release-channel (386325413) still ZERO runs ever; Fro Bot schedule census
  banked (10-18T03:24Z failure 39093521474, 10-17T03:19Z success 38998347282).
  The Monday cluster fires 2026-10-19T03:37–07:23Z — bank outcomes
  opportunistically if the cycle's clock crosses the window, else the def's
  own next-cycle window. Dependabot re-kick is claimed TWICE by sibling lanes
  (12093800's and a5970272's dated .github/dependabot.yml comment touches,
  both 2026-10-18) — no third touch; honor first-landed.
- **rm-889 (78.0) HONOR-CLAIM**: open PR #787 (40bcd47ae79f, 2026-10-16)
  already carries BOTH arms — cron `'0 0 * * *'`→`'37 2 * * *'` with
  convention comment, AGENTS.md "verify-live" rewrite, HAS_FRO_BOT_PAT
  skip-gates — and unlanded lanes 0790be13 (skip-gate) + c3182ce7 (para
  flatten) re-carry halves. No duplicate work this cycle; the def closes when
  #787-class content lands.

### Deliberately not selected (content-claimed by in-flight lanes — honor, don't duplicate)

| item | claimed by (verified by content this phase) |
| --- | --- |
| rm-886 (86) digest re-derive | run-475b46bc's diff literally implements `173f1258→7f486cab`; 0790be13 carries 7f486cab too |
| rm-647 (85) libpcre2 | rides rm-886's fresh-base disposition (same lanes) |
| rm-864 (93) render-guard census | run-bfa6eefc's lane (census-expected constant + render-guard tests) |
| rm-178 (91) digest-extraction convention | run-475b46bc's base-drift.yaml rework (pullability job, fail-closed extraction) |
| rm-280/225/179 canary family | run-743f2e47's lane (canary/query-registry/aggregator) |
| rm-154/708/703/166 release family | release.yaml 9-lane congestion (base-drift.yaml 4 lanes) |
| rm-883 (66) lockfile window | the absorb lane's rider; 4-lane package.json/pnpm-lock congestion; react bump touches the client bundle (visual gate) |
| rm-876 (85) absorb matrix | gated on rm-252's window + the Bun-aware gate re-derivation |
| rm-249 (72) push-SW decision | collides with the sw.ts/README truth lanes (f376b019 etc.) and the rm-2032/rm-2033 truth family |

### Batch properties

- Impact: closes the single standing structural hazard (empty branch
  protection) + retires ~10 ledger defs (5 truth closes, 3
  supersedes/reclasses, 1 completion, 1 re-census note); unblocks honest
  roadmap state for the mega-port era.
- Risk: one live mutation (protection PUT) with in-place + documented-override
  recipes; two PR closures under the rm-517 convention (comments only).
- Effort: small — no code files touched except one AGENTS.md paragraph +
  ROADMAP ledger; everything else is ops, verification, and docs.
- Dependencies: none unmet (check-name derivation source run already green at
  HEAD).
- Congestion: ROADMAP.md (inherent, append-only riders, fold by content) +
  AGENTS.md:125-127 para (no sibling lane targets that para; the :94 para is
  explicitly left to its claimants). Zero workflow-file edits.
- End-to-end in this cycle: yes — every element completes within the
  implement phase; the only time-gated evidence (rm-2056's cluster outcomes) is
  explicitly scoped as opportunistic.

## Evidence commands (this phase)

- `gh api repos/codeo1io/dashboard/branches/main/protection` → empty shell
- `gh api repos/codeo1io/dashboard/commits/55aedc97/check-runs` → green check-name set
- `gh run list -R codeo1io/dashboard --workflow=fro-bot.yaml --event schedule --limit 5`
- `gh workflow list` (15 active), `gh secret list -R codeo1io/dashboard` (empty)
- `gh pr list` / `gh pr diff 787` / `gh pr diff 860 --name-only` / `gh pr diff 998`
- `git -C ../run-475b46bcaae1-475b46bc diff Dockerfile .github/workflows/base-drift.yaml` (claim checks)
- `grep -rn "codeql-action" .github/workflows/` (all four sites at 6f2ac81)
- `awk 'length($0)>4000' ROADMAP.md` (empty), `pnpm audit --prod` (clean)
- sibling-lane congestion sweep: 37 dirty non-ROADMAP lanes across conductor-worktrees/dashboard-864ca327c8/run-*

## Implement record (attempt 803a5129, 2026-10-19)

Executed across FOUR provider-reaped attempts before this one — adopted,
not redone:

- 293919c7 (01:0xZ): all ten def-line flips + riders (components B/C/D),
  the AGENTS.md reconcile, and a 10-context live PUT at 01:06:29Z. That
  PUT's content was defective (visual/Release guard/Scorecard analysis
  never run on pull_request) and did not persist (empty shell re-observed
  09:36Z).
- 6ecc8a7f (09:4xZ): corrected 7-context in-place PUT 09:41:12Z (double
  GET-verified); PR #508/#509 disposition comments 09:46Z.
- e56ca330 / fc5e502b: provider deaths within ~30s/~100s, no durable work.
- 803a5129 (this attempt, 16:2xZ): verified the whole trail first-hand
  (live protection GET = 7 contexts strict+admin; PR states + comments;
  ROADMAP/AGENTS diffs vs base), re-reconciled AGENTS.md:123-133 and the
  rm-878 rider to the seven-context truth, corrected the rm-888 close
  facts, re-probed check-name validity against post-Bun-migration main tip
  09fb4e4 (all seven required names live in its check-run set), and re-ran
  the focused guards (render/length/integrity suites; census; >4000-char
  scan; scoped eslint on AGENTS.md + ROADMAP.md; pnpm audit; .conductor
  emptiness).

Deviations from the batch doc's execution shape: (1) required contexts =
SEVEN PR-universal checks, not ten — the doc's derivation included lanes
that never execute on pull_request and would have permanently blocked PR
merges; (2) dismiss_stale_reviews skipped (any reviews object blocks the
direct-push landing pipeline); (3) PR dispositions landed as dated comments
on already-closed PRs (gh-autoprune closed them 2026-10-17, before this
batch was selected).

Landing notes: origin/main has advanced far past base 55aedc97 (now 09fb4e4
— Bun-migration world; absorb owed at integrate); the rm-878 truth text is
live-object-accurate as of 2026-10-19T16:32Z; this run's own landing is the
first test of enforcement (override dance documented in AGENTS.md).
