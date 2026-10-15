---
module: roadmap
tags: ['repository-maintenance', 'cycle-1', 'compound', 'push-fallback', 'static-transport']
problem_type: workflow-issue
owner: dashboard
run_id: 8ebc9eedc94640f5a98282d4620ed418
---

# Repository-maintenance cycle 1 compound — run 8ebc9eedc946 (2026-10-17)

Base 3e3664c068804de21849bd3daaa667b1e3eaffbe; batch riding the landing gate as an
8-file uncommitted delta (+ this doc). Pre-review evidence only — review and shipping
outcomes land after this step and the next cycle's assessment carries them forward.

## Batch (selected at prioritize, implemented, validated)

"Push-display invariant restore + static-transport refresh":

1. **rm-1454 (a) — always-safe SW push fallback.** `web/src/sw.ts` gained `push` +
   `notificationclick` listeners rendering a GENERIC CONSTANT notification (zero payload
   trust; no payload field ever interpolated), `notificationclick` focuses an existing
   client or opens `/`. Kill-switch purge/unregister semantics untouched. Restores the
   mandatory invariant declared by `docs/plans/2026-07-08-001-feat-operator-push-notifications-dashboard-plan.md:92`
   ("the dashboard flag gates the consent UI, not the SW handler"), which the kill-switch
   adoption had silently violated — the assess-phase F1 finding: a flag-on operator could
   mint subscriptions that could never display. Tests: `web/src/sw.test.ts` 20/20 incl.
   payload-distrust (crafted hostile payload must not leak into strings) and focus-vs-open
   paths.
2. **rm-1455 scoped — static transport refresh.** Lockfile-only: `@hono/node-server`
   2.1.3→2.1.5, `hono` 4.13.11→4.13.13 under untouched `^` ranges. 2.1.5 is
   behavior-bearing (serveStatic answers GET/HEAD only — node-server #405; listener
   aborts the request signal on HTTP/2 stream reset — #404). New
   `test/static-assets.test.ts` (115 tests) pins: GET/HEAD-only serveStatic, no file read
   on non-GET static requests, per-path-class cache-control (immutable `/assets/*`,
   no-cache manifest/icons/`sw.js`/`registerSW.js`). Adapter comment in
   `src/server.ts` records both notes.

## Validation record (consumed, not re-run here)

- targeted_tests (ee08449): engine impacted-command RC 0 — 22 suites, 836/836, incl.
  static-assets 115/115; fresh `sw.test` 20/20. Digest verified byte-identical to
  dispatch (426d959a…) via engine recompute with full base SHA.
- full_tests (45a1275): `github_ci_validate.py --repo .` VERBATIM → `ok=true`,
  ephemeral PR #796 (ci-870b631bcd84 → ci-base-d7b7dfae7504), ALL 11 checks green
  (CodeQL, Dependency Review, Lint, visual 1m22s, Design Check, Check Types, Test 1m52s,
  Check Workflows, Test Scripts Load; Fro Bot skipping); PR + refs auto-cleaned. Local
  mirror: check-types RC 0; `pnpm test` 59f/3073t + 34f/1223t; lint RC 0.
- Emission digest (base 3e3664c, pre-review-fix tree): `validation:v1:650eacc9559b5fd6cb8410e0393a968202f7823a3c756e20ea1d6030e9499b91`.
  The digest string embeds the base SHA as a suffix — at a different landing base (main
  has advanced past 3e3664c) the fold must re-derive, not copy. The review-fix turn
  changed executable surfaces (Playwright reconcile: package.json, pnpm-lock.yaml,
  baseline PNG) and declares the digest its own retest computes.

## Full_tests cures that entered the batch (lesson-bearing)

- **Playwright caret-float born-red visual lane.** At base AND origin/main the visual
  lane was red: `@playwright/test` specifier `^1.63.0`, lockfile resolving 1.64.0, vs the
  digest-pinned 1.63.0 container image — Playwright refuses the version mismatch. Cure:
  exact-pin `1.63.0` in `package.json` + lockfile (caret killed) and regenerate the
  operator-dark baseline IN the pinned image (uid-mapped recipe: `-u 1000:1000`, node
  v24.21.0 ro-mount, pnpm via `npm --prefix`), md5 `e397a0539cf3fc84cd5129a5675d766a` /
  316204 bytes — byte-identical across two regen rounds, 3/3 green without
  `--update-snapshots`. SUPERSEDED AT REVIEW (2026-10-17): origin/main landed the
  rm-142 triple (@playwright/test 1.64.0 exact + v1.64.0-noble image 06a9939e + guard
  test/visual-playwright-image-lockstep.test.ts); the 1.63.0 pin was green in PR #796
  only against then-base 9fead352 and reds the lockstep guard at landing — the fold
  drops the local pw hunks and adopts main's 1.64.0 triple (see fold map). The
  caret-float DIAGNOSIS stands; the 1.63.0 cure does not. Prevention rule
  (review-amended): **Playwright triple-lockstep — the manifest pin, the lockfile
  resolution, AND the visual container image digest must name ONE Playwright version;
  a caret on @playwright/test is a red lane, and an exact pin alone is no sufficiency
  proof: a green visual run is moment-true only — trust nothing but a containerized
  repro against the actual landing base.**
- **Actions outage ENDED mid-cycle.** Assess saw the account-level outage (day 7, zero
  runs since 2026-10-09T01:59:31Z); full_tests' ephemeral PR executed every check. All
  outage-blocked ledger items (branch-protection fill rm-116-class, PR reaping, #112
  verification) are now unblocked. Detection rule going forward: probe
  `gh api /repos/…/actions/runs?per_page=1` before treating "Actions dark" as current
  fact — the state flips without landing anything.

## Prevention rules (cycle lessons, durable)

1. **Plan-document invariants are executable tests' missing specs.** The push plan's
   "always-safe handler regardless of flag state" line was a documented invariant with no
   pinning test; the kill-switch adoption broke it silently for months. When adopting a
   destructive SW (or similar) change, grep the plan docs for "must always"/"mandatory"
   clauses and mirror each as a test before landing.
2. **Caret floats on container-pinned tools are born-red lanes** (Playwright rule above).
3. **Emission-time digest discipline**: every fix-bearing phase re-declares the digest
   the CURRENT tree computes; a dispatch-time digest is only valid if literally nothing
   executable changed. Recompute with the FULL base SHA — the digest suffix embeds it,
   and an abbreviated SHA silently produces a different (wrong) digest.
4. **devDeps-pruned worktrees recur between folds** (twice this month): before running
   any suite, check `node_modules/vitest` exists; cure is `corepack pnpm install
   --frozen-lockfile` (full, never `--prod`) — zero tracked-file change.
5. **Collision-twin landing discipline** (ledger #18588/#18813): sibling runs minted
   overlapping id families (rm-1453..1457 twins across at least this run and 74d2adff /
   747806ff with DIFFERENT content). At landing, re-derive id occupancy from origin/main,
   re-hash both twins live, land the UNION of hardenings, and renumber losers. Never
   trust an "adopted byte-identical" rider — it describes a moment, not the landing.

## Next-cycle candidates (ranked, evidence in cycle artifacts)

1. rm-1453 — #639 run-list ordering port (deferred this cycle to 74d2adff's in-flight
   claim; verify what landed before re-minting).
2. Node 26 adoption gate (rm-139 family) — v26 LTS 2026-10-28, v24 security-only since
   2026-10-20; Dockerfile digest pin + engines floor + @types/node.
3. rm-878/rm-879 residual clauses — now RUNNABLE (Actions revived): live-query canary,
   manual-dispatch parity, branch-protection fill.
4. Ephemeral-PR debris reaping — 8 stale `conductor/ci-*` PRs (#720 #712 #710 #709 #706
   #705 #533 #521) + 2 maintenance branches (#508 #509); lineage-verify via
   `gh pr view --json files` before closing (sibling runs may own them).
5. Rider sweep: agent v0.122.3 (security fixes), codeql-action 6f2ac81 (v4.39.0),
   @types/node 24.19.2, @opencode-ai/plugin 1.19.0.
6. rm-1456 impeccable v4 (mirror upstream #598), rm-1457 watchlist (#628/#586/#112).
7. Upstream #631 subscription-list parse + #619 contract 1.11.0 — gateway-facing, fold with the
   push-host family when gateway ships approval run IDs (#640).

## Fold map for the landing gate (review-amended + reconciled 2026-10-17)

- Tree delta: ROADMAP.md, package.json, pnpm-lock.yaml, src/server.ts,
  test/static-assets.test.ts, operator-dark baseline PNG, web/src/sw.test.ts, web/src/sw.ts
  (+ this untracked doc).
- **Playwright reconcile (F1 cure) — APPLIED IN-TREE during review-fix 2026-10-17:**
  the local 1.63.0 hunks were dropped and MAIN's 1.64.0 triple adopted directly
  (manifest 1.64.0 exact + lock + v1.64.0-noble@06a9939e image + lockstep guard test);
  NEVER revert to 1.63.0. package.json and the operator-dark PNG are now byte-identical
  to origin/main (git diff origin/main → empty for both; PNG = main's current
  1.64.0-era baseline — the cycle's earlier e397a053 regen was 1.63.0-era and stale).
  The lockfile's ONLY delta vs main is the @hono/node-server 2.1.3→2.1.5 region; the SW
  push fallback is the other unique carrier.
- **Untracked-doc mechanics (F4a):** `git add -N` (or stage) this doc before fold
  dispatch — merge commits drop untracked files; the validation clone's diff only sees
  tracked/intent-to-add paths (house lesson, ledger #18843 lineage).
- **ROADMAP union reconcile (F4b):** rm-1453..rm-1457 verified UNCLAIMED on main (no id
  collision at review time); fold must still union-reconcile this ROADMAP against
  main's ledger at the ACTUAL landing base — main is moving (landed 55086dd on
  2026-10-17); re-check the window before landing.
- **Digest:** re-derive at the ACTUAL fold base (digest strings embed the base SHA); the
  review-fix turn declares its own retest digest, not any recorded one.
- Risk class of the executable delta: medium (server transport semantics + SW behavior
  + dependency resolutions) — covered by the turn's passing retest record; no escalation
  owed beyond it.
- ROADMAP statuses: rm-1454/rm-1455 → implemented (dated riders in-tree, rm-1455 rider
  records the supersession, the in-tree reconcile, and the deferred acceptance legs);
  rm-1453/1456/1457 annotated candidates. Census 242, zero duplicate ids, zero trailing
  whitespace.
