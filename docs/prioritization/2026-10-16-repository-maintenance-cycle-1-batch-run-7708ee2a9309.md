# Repository maintenance cycle:1 batch selection — 2026-10-16 (run 7708ee2a9309)

Base 7042635. Ledger at selection: 252 defs (248 at base + this run's roadmap-phase mints
rm-1468..rm-1471, attempt 24cde84d), 0 dups, max rm-1471. Inputs: this run's assess
(c7990a92, adversarial, porcelain-verified) + research (5dcec434, upstream/ecosystem lanes).

Multi-run competing-claims discipline governs: unlanded sibling families — 0772bfc2
(rm-1464..rm-1467 + rm-252 rider at base 06095e9), b32edf886 (its own rm-1465 cherry-pick
batch + roadmap-f105a8b5 prose-trap record; note cross-lineage rm-1465 id collision with
0772bfc2 — first-landed-wins renumber applies, do not depend on either id), 74d2adffdc53
(its mint collides with the LANDED rm-1452 — must renumber), 40bcd47a and 3d6aa134 (pending
landings) — are content claims this batch must not preempt. This batch claims no id and no
surface any of them already claims (verified by the congestion audit below).

## Selection axes

impact (reliability/user leverage at the operator surface) · risk (regression blast radius) ·
effort (S = hours, M = day) · deps (external gates) · strategic (posture value).

## Congestion audit (freshest probe 2026-10-16, this run, 13 in-flight worktrees)

Content-level scan (git status + diff greps on package.json/src/server.ts/test across
dashboard-864ca327c8/run-*):

- U1 surfaces — scripts/release-channel-staleness.ts, test/release-channel-staleness.test.ts,
  scripts/compute-release-tag.ts: ZERO in-flight claims anywhere.
- U2 surfaces — @hono/node-server / serveStatic mounting: ZERO content claims. The
  package.json/pnpm-lock congestion (19c024286fc4 = @octokit pairs 6.3.0/6.3.1;
  747806ff17e3 = @octokit/plugin-retry 7.1.2; fecd3997128b = unexplained;
  3d12d72f478a = @opencode-ai/plugin 1.19.0, the rm-856 rider IN FLIGHT;
  47f9aaefa379/fcfde1ea38da/e394f27cac1d = staged landing lanes) never touches hono deps.
  src/server.ts congestion (8ebc9eed rm-1453..1457 fog lane; 8fd22b8b #631 push-subscription
  read; 9d5c156d #643 finished-run restore; 1a261b63 ErrorBoundary+advisory stash;
  bb09bc7b #619 contract lane + environment theme) is all disjoint from the static-mount
  hunks — landing merge-rebase only, no content fight.
- AppShell.tsx footer (upstream #641): IN FLIGHT at run-47f9aaefa379 (AppShell.tsx +
  AppShell.test.tsx modified) — rm-1471 excluded from this batch accordingly.
- @opencode-ai/plugin 1.19.0 + @octokit pairs: contested by 3d12d72f's in-flight rm-856
  rider — first-landed-wins; U3 lands the uncontested set first (see below).

## The batch: 'Release-channel truth + static-transport hardening + in-window refresh'

Three code units + one documentation rider. All completable end-to-end this cycle at base
7042635; no gateway dependency, no Actions dependency (validation is local: node 24.21.0
PATH, the standard pnpm gates; no workflow files touched).

### U1 — LEAD: rm-1468 release-channel staleness truth-up (reliability 82.0, candidate)

- impact: HIGH — the channel's only tripwire is provably lying: foreign upstream tags
  green-wash it (pristine clone 2026-10-16 → healthy/newestTag 2026.10.25/ageDays 2, where
  .24/.25 commits are not ancestors of fork main), it parses the fork's YYYY.MM.PATCH calver
  as a calendar date (script :48-52 caps components at 2 digits, :80-84 rejects patch>31 as
  'day out of range' — while compute-release-tag.ts :95-98 mints unbounded max(N)+1), the
  test (:40) pins the mis-parse, and the channel it guards has produced zero GitHub Releases
  ever, so it cannot red for its own failure class.
- risk: LOW — script + tests + doc truth; no runtime serving surface.
- effort: M.
- deps: none.
- strategic: honest release-channel posture is prerequisite truth for any future
  HAS_RELEASE_APP flip (rm-280 lane) and for the operator-trust story; assess-phase headline.
- acceptance: as minted (shared parser with compute-release-tag, fork-authored tag scoping
  via the merge-base probe method, test-pin replacement, ROADMAP :490-491 truth-up,
  pristine-clone before/after demo).
- contestation: none (surfaces unclaimed in every worktree).

### U2: rm-1469 @hono/node-server 2.1.5 — serve-static verb restriction (reliability 76.0)

- impact: HIGH — on pinned 2.1.3 the verb-unrestricted app.use mounts at src/server.ts:1236/
  :1241 serve operator runtime assets in response to POST/PUT (proven bite-site); 2.1.5
  (2026-10-13) fixes exactly that, plus aborts the request signal on HTTP/2 stream reset
  (the SSE stranded-connection classes rm-261/rm-477).
- risk: LOW-MED — dependency bump + regression tests; lockfile churn shared with U3.
- effort: S-M.
- deps: none (npm release is out; no gateway coupling).
- strategic: keeps the rm-277/rm-498 hono-pair security line current; supersedes rm-760's
  2.1.4 target (its rider cross-references this def — no re-landing of the stale target).
- acceptance: as minted (POST/PUT/DELETE against each mounted operator asset → 404/405,
  GET/HEAD + ETag path intact, SSE abort verification, rm-760 cross-ref).
- contestation: none (zero content claims on hono deps or static mounts).

### U3: rm-760 in-window freshness execution + rm-285 audit-floor re-probe (one lockfile pass)

- impact: MED — in-range patch/minor refresh (react 19.3.1, @playwright/test 1.64.1,
  fast-check 4.10.2, hono 4.13.13, @types/node 24.19.2) keeps the audit floor current and
  rides the SAME lockfile pass U2 touches; rm-285's remaining acceptance is exactly this
  pass's live `pnpm audit -r` = 0 re-probe (floors already in-range for the specifiers).
- risk: LOW — in-range only; majors deliberately excluded (typescript 7/vitest 5/jsdom 30/
  vite-plugin-pwa 2 = rm-1449 sweep; node 26 = rm-139, decision due 2026-10-28 per
  b32edf886's record; pnpm = rm-140 evaluation).
- effort: S.
- deps: none.
- contestation: @opencode-ai/plugin 1.19.0 + @octokit pairs are 3d12d72f's in-flight rm-856
  rider — U3 lands the uncontested set; contested components ride only if rm-856 has not
  landed by implement time (first-landed-wins, lockfile re-derived at landing).

### U4 (documentation rider): ledger truth-up

- rm-177 status flip → implemented pending landing: defect not live at HEAD (2026-10-16
  probe: zero //-lines inside any query/fragment template in src/github/*.ts) and the
  structural guard exists (test/query-shape-guard.test.ts:47 'GraphQL query-shape guard
  (rm-177)') — the row is a stale truth.
- rm-740 claim truth-up (:490-491) rides U1's landing as already specified in its
  acceptance.
- risk/effort: zero code; ROADMAP edit + guard tests + lint parity.

## Not selected (exclusion ledger)

- rm-1471 release-version footer — in flight at run-47f9aaefa379 (AppShell.tsx modified)
  and selected by b32edf886's batch B2; fold on contact (my def already carries the map).
- rm-1470 static-files ETag absorb — gated behind the rm-252 absorb machinery (upstream
  re-copy + overlay conventions); a standalone port is high-risk/low-coherence.
- rm-252 absorb batch, rm-1446 push-health UI + subscription-list read — estate-blocked:
  deployed gateway v0.119.2 speaks contract 1.9.0; absorb needs the estate at ≥ v0.122.1 /
  contract 1.11.0 same-window verdict (b32edf886 reached the same classification).
- rm-280 release-app census — its REST endpoint defect is fixed upstream (v0.120.0), so the
  lane re-gates on the absorb; rm-132 protection-priority — actions-blocked.
- rm-116 branch-protection fill, rm-284 CI-side clause, rm-1450 enable/disable decision —
  actions-darkness-blocked (workflows hard-disabled since 2026-10-09; the dispatch probe
  422s while GET /permissions lies healthy).
- rm-022 playwright dir scaffolds, rm-100 optimization tiers, rm-1449 majors sweep, rm-271
  private-repo integration — effort-dominated, sequenced to their own cycles
  (b32edf886 concurs).
- rm-276 upstream watch — externally settled: probe-and-decide is absorbed into every
  absorb gate rider (this run's rm-252 tail rider carries it again).
- rm-742 conductor-ref sweep --apply — push-gated (313-heads datum recorded this run);
  not an implement-phase unit.
- rm-891 / rm-857..864 (40bcd47a, 3d6aa134) — pending sibling landings, not this run's to do.
- rm-856 octokit/plugin refresh — in flight at 3d12d72f; U3 defers its contested components.

## Validation plan

node 24.21.0 on PATH; pnpm check-types, pnpm lint, pnpm test (pretest rebuilds the client);
U1 pristine-clone demo (node scripts/release-channel-staleness.ts --json in a /tmp clone —
foreign-only-newer must not read healthy); ROADMAP edits re-proven with the three guard
suites + ROADMAP eslint stdin parity (this run hit and cured two markdown traps: bare
`[...]` link-label, `#digits:` list items). No workflow files touched (no actionlint gate);
no commit/push/pr/ci in this cycle's boundaries.

## Deliverables

1. scripts/release-channel-staleness.ts (U1)
2. test/release-channel-staleness.test.ts (U1)
3. scripts/compute-release-tag.ts (U1 — shared-parser alignment, if the shared-convention
   route is chosen)
4. package.json + pnpm-lock.yaml (U2 + U3)
5. regression tests for the static-mount verb restriction (U2 — test/server-static*.test.ts
   or the nearest existing static-serving suite)
6. ROADMAP.md — status flips (rm-1468, rm-1469, rm-177 rider, rm-760 rider, rm-285 re-probe
   note) on top of this run's already-in-tree roadmap-phase delta
7. this batch doc (+ the compound doc at the compound phase)
