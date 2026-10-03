# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-04, run 38ee3e1c)

module: dashboard
tags: `[reliability, operator-experience, server, web, release-integrity, batch-record]`
problem_type: batch-record

Frame: base `227375247` (== origin/main, re-fetched and confirmed unmoved at
prioritize time). Run `38ee3e1c4f5c49b5b4bf28753e273696`, repository-maintenance
cycle:1. Phases: assess `ffab7490e9fe466ab8e8c2f6105cd74a` (7 findings on a
first-hand push-subtree + live static/PWA probe pass; gates check-types rc=0 /
lint rc=0 / server 54 files 2354 tests green, web red = exactly the known
Node-26 localstorage class), research `eb0dee9b30934c11bf56ecb8f59f13cb`
(ownership resolution of all 7 findings + registry measures), roadmap
`d3697e2aa14748b78837aea54f17d669` (re-dispatch; this worktree's uncommitted
ROADMAP.md +33/-0: mints rm-594..rm-597 + riders on
rm-501/rm-482/rm-272/rm-249/rm-498/rm-108; 202 defs / 0 dups / eslint rc=0 /
5 guard suites 25/25), prioritize attempt `af2f908704b2499aaa01f5ea0ae078db`
(this document).

Sibling census at this phase (staged-safe `git diff HEAD` law, 22 dirty
worktrees): all-lineage uncommitted ceiling rm-617 (3b584779 minted
rm-616/rm-617 mid-phase), next free rm-618. Decisive fact: exactly ONE dirty
sibling worktree carries non-ROADMAP code — 7a4d9070's rm-555 `/assets` lane
(`src/server.ts` +66 / `test/static-assets.test.ts` +107 / README). Every
other implementation lane is unclaimed code-space; the rest of the fleet is
at roadmap/prioritize stage. This batch claims only lanes the census shows
unclaimed, and treats every sibling mint as an owned lane.

## The cycle's mandate

One theme: **take the ledger's own top unblocked reliability debt plus this
run's first-hand operator-facing and release-integrity findings — four
members, every one either queued for this cycle by the ledger itself or
carrying this run's fresh evidence, all verified unraced at census.**
Budget: one full-suite validation pass; zero time gates; exactly one
lockfile-touching member kept to a two-line diff; no member depends on a
sibling lane landing.

Selection reasoning (impact x risk x effort x dependencies x strategic
value), over the full open ledger:

- **rm-107 (65.0)** and **rm-116 (58.0)** outrank everything below but are
  not in-tree implementable this cycle: rm-107 is feature-scale
  (monitoring-of-monitoring panel, needs its own design-first cycle), rm-116
  is a live GitHub mutation surface (ops, not tree work) held at
  decision-first by fleet consensus. Deferred, not skipped — pointers below.
- **rm-187 (47.0)** is the highest open priority that IS implementable in
  the tree, was double-locked for nine days by PRs #23/#113, and both locks
  are now released — with this cycle explicitly named as its landing slot by
  a landed sibling roadmap note. First slot.
- **rm-501 (44.0)** is the second-highest in-tree implementable priority,
  the ledger's standing "freshest open candidate", and this run's assess +
  rider own the freshest evidence (the fourth unbounded fetch and the two
  false-invariant comments). Its old fold-set siblings (rm-512/rm-520) are
  absent from the dirty census — expired claims, no race.
- **rm-597 (14.0)** and **rm-596 (18.0)** are this run's own mints: two
  small, self-locking decision items that close assess F5 and the research
  rule-surface drift respectively. Cheap, independent, zero external deps.

## B1 — rm-187: one corrupt links cell must not brick GET /api/listener/messages

- **Why first.** Highest open in-tree-implementable priority (47.0). The
  item's own block says "first candidate the moment either lock lands and
  this item's acceptance block stays the authoritative spec"; the sequence
  locks (PRs #23, #113) are merged, recorded as released by two sibling
  roadmap phases on 2026-10-04, and 2c3b4c64's landed extension #13 names it
  "the natural first slot of the NEXT cycle's implement batch" — then took a
  different batch. This is that cycle.
- **Live re-verified this phase:** `src/listener/store.ts:51` —
  `links: JSON.parse(row.links) as readonly ListenerLink[]` unguarded inside
  `rowToMessage`, the row mapper for the messages listing (`:173`). One row
  with non-JSON in `links` (schema drift, truncated write, manual edit)
  throws and 500s the whole endpoint, hiding every message behind one bad
  row. No dirty sibling worktree touches `store.ts`.
- **Change (per the item's authoritative acceptance).** The mapper treats a
  corrupt links cell as degraded data — empty list, other row fields intact,
  never throws; the endpoint 200s with the healthy rows. Degradation is
  observable (counter export or a log line via the house `src/logger.ts`
  seam — implement picks the one that fits store.ts's current zero-logger
  shape) so silent data loss cannot recur.
- **Tests.** Seed corrupt-links + null + empty variants in
  `test/listener-store.test.ts` (mapper level) and pin the endpoint 200 with
  remaining rows in `test/listener-routes.test.ts`; negative-verified
  red-before-green.
- **Effort/risk.** Small; low risk; server suite is fully green (54 files /
  2354 tests) so verification is unimpeded.

## B2 — rm-501: bound the four logout fetches and release the latch (web)

- **Why.** Operator-experience 44.0; the ledger's standing "freshest open
  candidate" since 2026-09-30, untouched by any landed batch (no web/ source
  has landed since). This run's assess (ffab7490 F1) + rider own the
  freshest census: FOUR unbounded fetches on the logout paths — the Arctic
  CSRF GET (`web/src/shell/AppShell.tsx:49`) and its logout POST (`:68`),
  the operator CSRF GET (`:188`) and its logout POST (`:215`) — while
  `logoutInFlight` (`:174-175`) is set on entry and released on NO exit
  path: one hung fetch permanently latches the logout control until reload.
  Two comments (`:66-67`, `:217-219`) claim `Promise.allSettled` bounds a
  hang — it bounds only the teardown race, never a hung FETCH; both are
  false invariants and get corrected with the code.
- **Change.** Bound all four fetches (house client pattern — the
  `web/src/push/subscribe.ts` teardown discipline / an
  `AbortSignal.timeout`-style bound — implement picks ONE seam and reuses it
  four times); release the latch on every exit path; fix both comments.
  Tests pin a never-resolving fetch for both surfaces (Arctic + operator)
  and latch recovery after a hung-then-aborted logout.
- **Verification without racing the sibling web-red lane.** The standing
  local red (Node 26.10 experimental webstorage; App/AppShell/
  Notifications/InstallPrompt, 100 tests) is owned by sibling lane rm-608
  (2c3b4c64, implement-ready) — this batch does NOT touch the cure. Instead:
  (1) verify the web suites fully green locally via the zero-edit recipe
  sibling research eb6870e6 proved first-hand —
  `NODE_OPTIONS='--localstorage-file=<tmp>' npx vitest run --config
  web/vitest.config.ts` from the repo root (AppShell 30/30 rc=0 proven, zero
  tracked-file edits); (2) full `pnpm test`: web red must remain EXACTLY the
  standing class — count-accounted (base 100 plus any new tests placed in
  the four red files, every failure at the localstorage seam, none new);
  (3) ephemeral CI on node:24 runs web fully green (fleet-proven: d620213c's
  compound saw web 1171 passed in CI).
- **Rider within B2 (committed): rm-482 rider — delete the production-dead
  minter.** This run's research corrected rm-482's census:
  `mintRuntimeIdempotencyKey` (`web/src/operator/runtime.ts:145-154`) has
  zero callers — `createOperatorRuntime` delegates to
  `/static/operator-launch.js` via the `:329` dynamic import, which mints
  its own key. Deleting it (plus its direct tests) removes a `Math.random`
  fallback twin that rm-482's acceptance demanded gone. `runtime.test.ts` is
  a GREEN file (not among the four red), so verification is unimpeded.
- **Effort/risk.** Medium; the risk is concentrated in the verification
  dance above, all steps pre-proven by sibling phases.

## B3 — rm-597: .dockerignore joins the hard-release corpus

- **Why.** This run's mint closing assess F5: `scripts/release-paths.ts`
  hard-codes the image-affecting corpus but omits `.dockerignore`, and
  `.github/workflows/release.yaml`'s `on.push.paths` filter (which runs
  BEFORE the guard) omits it too — an edit that reshapes the build context
  (and therefore image contents) can land with no release decision at all.
  Sibling rm-584 is the `release-paths.ts`-self-corpus twin (different file,
  different defect); no content collision.
- **Change.** Add `.dockerignore` to `HARD_RELEASE_FILE_PATHS` and to the
  workflow's paths filter in the same commit; the corpus-sync lock
  (`test/should-release.test.ts`) fails CI on a one-sided move, so the
  acceptance is self-locking. Decision record (image-affecting rationale)
  stays in the item per its acceptance.
- **Effort/risk.** Small; low risk; both sides move under an existing
  guard's enforcement.

## B4 — rm-596: eslint-plugin-erasable-syntax-only 0.4.2 -> 0.7.2 (decision-first)

- **Why.** This run's mint: the plugin that enforces the server's
  strip-only TS discipline (an AGENTS.md invariant) trails npm-latest by
  three minors, and 0.6.0 added an export-aliases rule — the RULE SET
  changes, so the expected-zero-findings claim must be measured, not
  assumed.
- **Change.** `package.json` devDep `0.4.2` -> `0.7.2` (two-line lockfile
  diff, the batch's only lockfile touch); `pnpm lint` rc=0 before/after with
  the findings delta recorded; grep that no `erasableSyntaxOnly` escape
  hatch is added; decision note (rule diff + measured outcome) recorded in
  the item.
- **ID note.** Sibling 146d73f2's same-day rm-596 mint (Re-entry for
  dismissed push cards) is content-distinct — same block claimed above the
  same ceiling rm-593 without seeing each other. Reconcile-by-content at
  integrate per the fleet convention (landed meanings own ids; the loser
  renumbers); no action now.
- **Effort/risk.** Small; low risk; drops cleanly if budget tightens.

## Explicitly deferred — the race and deferral ledger

1. **rm-107 (65.0) composed operator status panel** — feature-scale; needs a
   design-first cycle of its own; not this run's first-hand evidence. First
   reconsideration next cycle.
2. **rm-116 (58.0) branch-protection fill** — live GitHub API mutation
   (ops surface, not tree work); decision-first per fleet consensus; blocked
   on agreeing the Main-job + CodeQL strict/admin-enforced check set.
3. **Web-red cure (rm-548 lane; sibling rm-608 x2 + rm-591 decision-first)**
   — sibling-implement-ready (2c3b4c64 B1); racing = direct collision. This
   batch ADOPTS that lane's zero-edit verification recipe for B2 instead.
4. **rm-594 /assets immutable posture (this run's mint, 36.0)** — sibling
   7a4d9070's rm-555 carries a COMPLETE unlanded implementation
   (`src/server.ts` +66 / `test/static-assets.test.ts` +107 / README);
   racing = integrate collision. This run's item already reconciles-by-
   content (its rider takes the shell-variant posture position).
5. **rm-595 429 Retry-After (this run's mint, 22.0)** — two prior same-day
   sibling claims own the mint space (rm-589 by 41067ca6; rm-602 by fefc4067
   under the verbatim heading); their lane.
6. **hono in-range rider (rm-498 rider, 4.13.12)** — d.ts-only gain;
   `pnpm-lock.yaml` is the fleet's highest-conflict file; rides the rm-271
   in-range window / minimumReleaseAge convention instead of this batch.
7. **rm-249 rider (dead DEV Simulate Push button)** — rides rm-249's
   deferred push-revival item; not standalone work.
8. **Ecosystem majors** — TS 7.0.2 peer-blocked (ts-eslint 8.71.0 <
   6.1.0), vitest 5 / jsdom 30 (rm-548-adjacent sibling lanes), Node 26 LTS
   promotion 2026-10-28 (rm-139's window), pnpm 12 (rm-140): all tracked
   with time gates; no action this cycle.
9. **rm-272 rider** — documentation-only; already landed as rider text.
   Nothing to implement.
10. **Stale lineages with real code dirty** (5bf98ac301ad:
    `src/github/aggregator.ts` + three workflows, mints rm-309..311) —
    landing-backlog watch, not this run's to race or reap.

## Sequencing and drop order

All four members are independent. Recommended order: B1 -> B3 -> B4 (all
server/toolchain, one fast targeted pass), then B2 (web, the verification
dance). If budget tightens, drop in order B4 -> B3 -> B2r; B1 and the B2
core are the cycle's value floor.

## Validation plan (implement / compound)

- Per-member targeted suites red-before-green where applicable (B1
  listener-store + listener-routes; B3 should-release corpus-sync; B4 lint
  delta; B2 zero-edit-recipe web suites + red-count accounting).
- Full gates: `pnpm check-types` rc=0; `pnpm lint` rc=0; `pnpm test` with
  server fully green and web red EXACTLY the standing rm-548 class,
  count-accounted; ephemeral CI full-matrix green on node:24 per the fleet
  pattern.
- Riders/status flips appended to rm-187, rm-501, rm-597, rm-596 (and the
  rm-482 rider) in the ROADMAP at compound; Outcome appended to this
  document.

## Outcome

(appended by the implement/compound phases)
