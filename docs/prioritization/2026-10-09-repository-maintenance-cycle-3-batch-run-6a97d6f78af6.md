# cycle:3 batch record — non-push shell cache policy (run 6a97d6f78af6)

- run: 6a97d6f78af64249912b25d808cf09a6 (repository-maintenance cycle:3)
- base: 546c93c (clean at dispatch; origin/main moved to 364272b mid-run via
  PR #448 — post-base contract-window landing, no def/census delta at this
  base's ledger; re-fetched and re-probed at selection)
- selected: 2026-10-09 by prioritize 0536ea40618d4e21aba245618bed0615
- items: rm-802 (non-push '/' shell Cache-Control)

## Inputs

Consumed, not redone: assess 3dd0aeb5 (F1-F5 at 546c93c; gates all green —
lint, check-types, 63+32 test files, audit clean, census 244/0/rm-778),
research 90ecd9f3 (24-commit upstream window, registry publish clocks, TS7
re-verification), roadmap 766ed49c (extension #40: rm-802 minted above the
all-lineage ceiling rm-801, six riders, screened-out-with-owners set).
Prioritize-phase probes run first-hand this phase: fleet liveness across the
campaign stores, full-wall claim scan (`status: open (selected` over every
run-*/integration-* wall), current-batch-doc overlap scan over every live
lane, and premise re-verification against freshest origin/main.

## Selection floor

rm-802 is the only ledger item simultaneously (a) above the value floor —
operator-facing stale-bundle breakage after every deploy until the heuristic
expires, the same failure class rm-690 cured for `/assets/*`, left unfixed on
the last un-policied static surface; (b) zero-contention — minted this cycle
by this run, no sibling claim on any wall; (c) small enough to complete
end-to-end in one cycle (effort S: one status-guarded middleware + one
red-first describe block); and (d) not window-gated. Everything with a
Monday-2026-10-12 deadline is owned by live lanes (next section); everything
else sits behind dated windows (rm-252 absorb disposition 2026-10-13, rm-108
TS7 re-eval 2026-10-21, rm-139 node gate 2026-10-28) or below the floor on
value.

## Claimed-and-excluded (congestion audit)

Every higher-priority candidate and its owner; liveness from the campaign
stores at selection (~04:2xZ), claims from the full-wall def-line scan:

- cve-tripwire first-fire cure (NODE_IMAGE tag mismatch; Monday 06:53Z fire
  RED BY CONSTRUCTION until cured): rm-782 on 33b30ba2 AND ab16a466 (both
  running implement) plus rm-793 on d1a0b216 (running implement) —
  triple-claimed, live. Excluded; this run's roadmap ext #40 records the
  screening and the sibling claims.
- Monday readiness action pins: rm-784 on 0cde5807 and e8c99e0e (both
  running implement); the codeql 24c5418 / upload-artifact cf430e0 digest
  parity was verified content-satisfied by this run's research. Excluded
  (owned).
- Held-set dep refresh (vite 8.3.4 age-eligible 2026-10-09T12:07Z,
  @hono/node-server 2.1.4 04:42Z): rm-689/rm-785 on 0cde5807 (running
  implement), with ddb41af7's in-tree implemented playwright/visual-baseline
  refresh awaiting reconcile. Excluded (owned; shared lockfile surface).
- routes-api healthz no-store: rm-599 + rm-797 on 38e72854 (running
  implement). Same Cache-Control posture family as this batch but a different
  surface and different files (src/routes/api.ts vs src/server.ts +
  test/static-assets.test.ts) — named here so integrate treats them as
  siblings, not duplicates.
- Operator UX #583-#586: rm-794/rm-795/rm-796 on d1a0b216 (running
  implement). Excluded.
- CI gate and context seal: rm-788/rm-789 on cb189044 (full_tests — nearly
  landed). Excluded.
- PKCE auth hardening: rm-149/rm-187 on cb0cfe96 (running implement).
  Excluded.
- Other live implement-phase claims: rm-116/rm-792 on 438dea88, rm-117/rm-162
  on 91776e25, rm-279 on f510a33e, rm-485 + rm-501 on e8c99e0e, rm-781/rm-783
  on ab16a466, rm-797/rm-799/rm-800 on c4617181; cbe70604 in ci. Excluded.
- Dated-window deferrals (below floor this cycle by deferral, not value):
  rm-252 absorb disposition 2026-10-13 (rm-253 twin rides it), rm-108 TS7
  re-eval 2026-10-21, rm-139 node gate 2026-10-28, rm-760 held-set clocks
  documented in its 2026-10-09 rider.

## Selection risk

- Same-file contention: live lane 405e9004 (independent_review; batch U1
  rm-741) edits src/server.ts in the rate-limiter region — disjoint from the
  static-serve arm (:1150-1180); textual merge at integrate, no semantic
  interaction (Retry-After response headers and shell request caching are
  orthogonal). Lane 84133641's current batch doc only cites server.ts (ledger
  work, no code edit).
- Post-base drift: origin/main moved to 364272b (PR #448) after this run's
  base; the gap premise was re-verified ON 364272b (:1176 unchanged, no
  commits touch the static region since). Any further landing touching the
  static-serve region before implement must be re-probed
  (premise-verified-live discipline).
- Cure-shape risk: no-cache (revalidation family), NOT no-store — this arm's
  body is not identity-reflecting (the push-enabled meta is injected only in
  the other arm); a no-store copy-paste from the injected arm would
  over-invalidate. The companion test pins the injected arm's no-store to
  prevent drift in the other direction.

## Verification (what implement must deliver)

- Red-first: the new describe block fails against the unmodified non-push arm
  and passes with the middleware in place.
- Status-guarded: the header is set on 200 responses only.
- Companion pins stay green: `/assets/*` immutable (rm-690) and the injected
  arm's no-store (rm-172) — proving no cross-arm drift.
- Battery: `pnpm lint`, `pnpm check-types`, `pnpm test` green; census
  unchanged (245 defs / 0 dups / max rm-802 — selection edits do not mint);
  eslint clean on ROADMAP.md and this document.
