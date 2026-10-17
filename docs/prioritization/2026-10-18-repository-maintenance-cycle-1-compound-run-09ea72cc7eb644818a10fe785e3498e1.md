# Cycle 1 compound disposition — repository-maintenance run 09ea72cc7eb644818a10fe785e3498e1

Composed 2026-10-18 by the compound phase (attempt 5fbcb04c, reaped provider-side after
authoring; verified from the durable trail, corrected, and re-issued by compound attempt
42d05cbf) from pre-review cycle evidence only. Base 54ea2657 on conductor/run-09ea72cc7eb6
(pre-absorb fork tip; origin/main 64cd2f6a not an ancestor). No local test execution in the
compound phase — every validation outcome below is consumed from the recorded phase results.

## Batch selected and delivered — BATCH T "truth instrumentation"

Prioritize (36c154d4) ranked every unresolved finding by (impact x confidence)/effort
under two hard constraints: completable this cycle at base without ci/push, and NOT
sibling-owned unlanded (fog walls rm-1410/1411/1513/1516/1517/1935 honored). Three units:

- CU-T1 [HIGH] darkness-watch correctness — scripts/actions-darkness-watch.ts:120-161
  computeDarkness + :205-235 single-page runs fetch: any workflow idle past the
  newest-100 window was a FALSE 'never-ran' at >=100 runs/day (live: total_count 2766,
  page-1 oldest 07:40:11Z). DELIVERED (+126/-10): collectRuns page-number walk to an
  EMPTY page (definitive end; GitHub answers 200 with zero rows past the last page) or
  the coverage bound min(now-48h, pushed_at); 'never' only when runsExhausted=true,
  else 'pre-coverage' (still dark by bound soundness); AbortSignal.timeout(20s);
  MAX_RUN_PAGES=40 -> UNKNOWN; Link header never a terminator (live forensics below).
  Def minted rm-1991 (reliability 74.0) — see the numeral-arbitration note below.
  Tests +167 lines: traversal, bound-stop, maxPages throw, invalid-date continuation,
  pre-coverage vs never.
- CU-T2 [MED-LOW] static-assets.test.ts:97-101/:122/:926 falsified banners (registerSW.js
  'NOT emitted'; 'deny-by-default NavigationRoute') replaced with current-truth
  assertions: dist index.html carries the vite-plugin-pwa:register-sw script tag;
  registerSW.js registers /sw.js at scope '/'; sw.js contains unregister() and NO
  NavigationRoute. Decision-neutral toward the SW update-path lane (fog rm-1935).
- CU-T3 [LOW] AGENTS.md:94-99/:105-107 state-truth (Fro Bot variable-state re-probe
  guidance, 2026-10-17 probe active with secrets empty; clonedeps mirror re-provisioned
  at v0.122.2 = fro-bot.yaml:352 pin 06469674). Owner rm-109.

## Numeral arbitration (correction on adoption)

The reaped authoring attempt minted this def as rm-1518 at 2026-10-18T05:29Z on a census
taken at roadmap time (13:35Z Oct 17, next free rm-1518). Between those timestamps, run
adc26670's roadmap patch (2026-10-17T16:05Z) minted rm-1518..rm-1521 and its worktree wall
still holds them dirty. Re-probed 2026-10-18 by this attempt across live main (API read:
def-line max rm-1483), every sibling dirty wall (max run-eaf76a21 rm-1985), and the spool
patch set (1ce4f84e ext#54 minted rm-1988..rm-1990; rm-1997..rm-2026/2044 adjudicated
prose non-claims; 'form-2026' date-fragment grep noise excluded) — all-lineage frontier
rm-1990, so the def is RENUMBERED rm-1991 (zero mentions anywhere pre-mint) per the
rm-853 earlier-claim convention, and re-seated into the 74.0 render-priority band (the
reaped authoring had placed it ahead of rm-850's 78.0). Next free after this cycle:
rm-1992. The reaped patch compound-delta-09ea72cc-5fbcb04c.patch is VOID on this point.

## Validation record (pre-review, consumed as recorded evidence)

- targeted (d99beafc): seeded run_repo_impacted_tests command VERBATIM — narrow
  scope proved ('node targeted=1' -> test/actions-darkness-watch.test.ts), fallback
  never engaged; 19/19 green. Companion static-assets 145/145. Digest re-derived
  before AND after: validation:v1:acc174a1acb015e6098541e6a21bff11d7caee67b9cda4ee0c23076b136e4ab0
  (identical to dispatch — validation-only turn).
- full (f4cea182): authoritative full_command via github_ci_validate.py -> RC0
  ok:true, ephemeral PR #950 (commit 7b8d2fb6, validation base a2ab1368, closed
  2026-10-18T04:33:11Z, conductor/ci-* branches cleaned). Foreign-red cure rode the
  validated tree: scripts/release-paths.ts + .github/workflows/release.yaml checked
  out from origin/main (0-diff vs main) per the should-release parity class.

## Reusable lessons (prevention rules)

1. GitHub /actions/runs pagination traps (live-proven 2026-10-17): (a) Link rel="next"
   href uses the /repositories/{id}/ URL form, whose responses OMIT the Link header —
   following the literal next URL ends pagination silently; (b) even with canonical
   page URLs, rel="next" VANISHES mid-traversal on reused connections; (c) the
   definitive list end is an EMPTY page (200, zero workflow_runs). Rule: page by number,
   stop on empty page, never trust Link. Sweep canary/base-drift next cycle.
2. An instrument's verdict is only as good as its coverage: the 2026-10-17 "six
   never-ran workflows" outage evidence was a pagination artifact, retired by the fix
   (rm-1437 compound rider). Rule: instruments must distinguish 'never observed' from
   'not covered' (pre-coverage label) before feeding outage narratives.
3. Fleet dedupe worked, with one late-stage gap closed: zero-mint intake at roadmap
   time (ext#50), then a single evidence-backed mint at compound when the
   implement+validation record existed — but the reaped compound mint trusted a
   roadmap-time census 16h stale. Rule: re-probe the mint frontier (live main + every
   dirty wall + the spool patch set) at the MOMENT of minting, every time, including
   when adopting a reaped attempt's already-numbered work.

## Next-cycle candidates and context

- Sentinel window: 2026-10-19 03:37-07:23Z is the first full post-recovery Monday
  cohort check (rm-1437) — with a truthful instrument now standing.
- Fro Bot: ACTIVE, secrets still empty; first un-gated daily fire 2026-10-18T00:00Z;
  gate restoration 5723bb0a unlanded. Verify either direction before assuming.
- Link-sentinel sweep: canary + base-drift scripts page GitHub APIs (rm-1991 rider).
- Upstream window (rm-252 rider): 2026.10.44 head, exactly #646 markdown output (32
  files, NEW dep markdown-it@15.0.3 published one day before adoption — supply-chain
  review owed); port owned by fog rm-1513 (absorb-first ordering recorded).
- Node: v24 maintenance 2026-10-20, v26 LTS 2026-10-28 (rm-139 owns the gate; pin
  census banked in its rider).
- Deps: @hono/node-server 2.1.5 is the only prod-dep drift; dev majors sit in the
  open sweep item; in-range refresh lands WITH the rm-252 absorb chain (rm-102 rider).
- Numeral frontier for the next mint: rm-1992 (this cycle took rm-1991; live walls
  move fast — re-probe per lesson 3).

## Artifacts this cycle leaves for landing

- Worktree delta (validated by PR #950): AGENTS.md, scripts/actions-darkness-watch.ts,
  test/actions-darkness-watch.test.ts, test/static-assets.test.ts, plus the foreign-red
  cure pair scripts/release-paths.ts + .github/workflows/release.yaml (0-diff vs main).
- Spool: implement-delta-09ea72cc-4ddb7545.patch (the 4-file batch delta),
  compound-delta-09ea72cc-42d05cbf-cycle1.patch (CUMULATIVE roadmap delta: ext#50
  riders + rm-1991 mint + rm-1437 correction rider + this doc — SUPERSEDES
  roadmap-delta-09ea72cc-805ea577-cycle1.patch and voids
  compound-delta-09ea72cc-5fbcb04c.patch; apply the cumulative patch alone).
