# Dashboard repository-maintenance cycle 2 compound record (2026-10-18, run 6b6520e98d7c459dbc6fa04634f638dd)

module: dashboard
tags: `[repository-maintenance, compound, adoption, corpus-parity, absorb-window]`
problem_type: compound-cycle-record

campaign: repository-maintenance 09d31b4e1f7a4b0aa658afa177a19a6d cycle: 2
status: cycle_compounded_pre_review (pre-review cycle evidence only)
base: 64cd2f6a (run base, HEAD of this worktree) / origin/main 655bfe50
(ledger wall at compound)
attempts: compound ebc11b536aac4872b30517195fb50c7d (delivery-dead, provider
failure ~10:01Z; its typed result never landed — transport artifact, not a
judgement; sub-work adopted after verification) -> re-dispatch
878ee103924d4493bf70669cbc49ef7e (verification legs + cures + completion)

Scope: pre-review cycle evidence only (assess/research/roadmap/prioritize/
stewardship/implement/targeted_tests/full_tests). Review and shipping outcomes
are the next cycle's assessment inputs. No test execution at compound.

## Phase chain

assess d6464406 (fresh gates green at 64cd2f6a: check-types 0, lint 0,
5267/5267 passed; visual workflow failure 2026-10-17T10:24:46Z identified as
the born-red visual baseline; Fro Bot schedule green / PR-event skipped;
gh secret list EMPTY) -> research db89fa51 (born-red visual cure FETCHABLE
from closed PR #880 via refs/pull/880/head = 97d5b89, 8 files +461/-8 incl.
the regenerated dashboard-operator-dark baseline 341452->346452B + rm-142
provenance header; dependency frontier probed) -> roadmap 7207b38c (minted
the rm-1973..rm-1976 band + riders spool-side, worktree never edited;
mid-phase ANCHOR CORRECTION: origin/main moved 64cd2f6a -> f5927919, the
wall re-derived from main) -> prioritize f1fe4d45 (13-row ranked table ->
batch 'uncontested-seam reliability micro-batch' = rm-1973 + rm-1974, no
sibling implement ownership, no contested file surfaces) -> stewardship
02ffa606 (structured request, no Git topology; surfaces re-truthed against a
main that had moved again) -> implement c27e91b4 (3-path delta landed
uncommitted; MID-PHASE RE-SCOPE: a sibling landed the @hono/node-server bump
on main, bump half NOT redone) -> targeted_tests a184792d (3-file hygiene
battery 8/8 green; dispatch digest 00ce386a declared verbatim —
changed_testable_surfaces=[] under the surface policy) -> full_tests
d28ab22a (ephemeral CI: run 1 RED on the rm-248 corpus-parity guard, cured,
run 2 ALL GREEN; emission digest c2833062) -> compound (this doc).

## Batch composition and journey

Selected: rm-1973 (absorb-verified dependency parity doctrine +
@hono/node-server ^2.1.3 -> 2.1.5) + rm-1974 (impeccable hook subprocess
deadline guard). Final worktree delta at HEAD 64cd2f6a, EIGHT paths,
uncommitted:

- hook.mjs under .agents/skills/impeccable — wall-clock budget
  (IMPECCABLE_HOOK_TIMEOUT_MS, default 10s, invalid/negative fall back),
  loud stderr + audit entry + exit 124 on overrun, timer armed before the
  stdin read, disarmed via try/finally.
- test/impeccable-hook-deadline-guard.test.ts — new probe suite, 4/4 green.
- docs/solutions/workflow-issues/union-merge-absorb-dep-parity-2026-10-17.md
  — new doctrine doc (the proven #644 8d867b9b lockfile-only drop class;
  union-merge absorb rule with manifest/lockfile parity check).
- docs/solutions/workflow-issues/ephemeral-ci-base-stale-release-paths-2026-10-18.md
  — new trap doc (adopted from the dead compound attempt after verification).
- scripts/release-paths.ts + .github/workflows/release.yaml — corpus sync
  to main's bytes (the full_tests cure, see below).
- ROADMAP.md — main-anchored ledger wall (655bfe50) + this run's band +
  compound riders + census-claim tail comment.
- docs/prioritization/2026-10-18-repository-maintenance-cycle-2-compound-run-6b6520e98d7c.md
  (this doc).

Mid-run origin/main advance 64cd2f6a -> f5927919 (born-red visual cure
landing) -> 57f50594 (operator-push cure) -> 505cc466 -> debde800
(mass-folds) -> 389d60e -> 5ab50da -> 655bfe50 (wall at compound). The
worktree base itself never needed a rebase — no batch surface ever contended
with a landing; every advance was absorbed by re-truthing probes.

## Supersession record (highest-value learning)

The @hono/node-server bump half of rm-1973 was landed on main by a SIBLING
fold while this cycle was in flight (implement-phase probe: main package.json
reads ^2.1.5). Resolution: NOT redone — first-landed-wins per the stewardship
single-writer hint; rm-1973's doctrine half is this cycle's net new work,
delivered in the worktree and pending landing. Separately, the react 19.3.1
refresh (upstream #647, MERGED 2026-10-17T18:50:07Z — the run's research
phase had last seen it OPEN at 18:46:59Z) remains unabsorbed on the fork:
fusable at the next absorb window, cross-ref rm-252's compound rider.

## Validation record (recorded, not re-run)

- targeted a184792d: changed_testable_surfaces=[] / required_scope=none
  under the surface policy (hook.mjs lives under .agents/, the new test file
  classifies non-executable, the doc is .md) — dispatch digest
  validation:v1:00ce386afdef9ce9c081b393e09d26d376e5c07308e8757074217d72d9a54009
  declared verbatim (nothing executable changed that turn); local hygiene
  battery 3 suites / 8 tests green.
- full d28ab22a: github_ci_validate.py VERBATIM (twice). Run 1 (Main run
  39113809739) RED: the Test job failed at the rm-248 corpus-parity guard —
  main's release.yaml carried an on.push.paths entry (the gzip-static
  sidecars script, landed on main after this run's base) unknown to the
  candidate's corpus module. The ephemeral base couples MAIN's workflows to
  the CANDIDATE's corpus TS, so the guard reds in CI while the local suite
  stays green against the older worktree release.yaml. Cure: both corpus
  sides synced to main's bytes. Run 2 (Main run 39114509328) ALL GREEN:
  server 3614 passed / 1 skipped, web 1656 passed. Emission digest re-derived
  post-fix
  validation:v1:c2833062eb8628bf6d7dcb29922112758dc75d8c164cd.
  Reusable lesson documented in the new trap doc + the rm-248 rider.

## Prevention rules (this cycle's cures)

1. Corpus-parity guards couple across the ephemeral seam: when the run base
   is behind main, diff BOTH corpus sides (workflow paths block <-> corpus
   TS module) against origin/main BEFORE any full validation dispatch, even
   with a locally green guard suite.
2. Mid-run sibling landings: re-probe main for each batch surface at every
   phase boundary; a landed half is adopted, never redone
   (first-landed-wins).
3. Ledger anchoring: mint/extend bands against the LIVE main wall, never a
   stale worktree copy (this run's roadmap anchor correction, re-applied by
   the compound re-anchor at 655bfe50).
4. Delivery-dead attempts leave durable work: read the worktree + event log,
   verify every adopted claim against live sources, and run the guards the
   dead attempt could not (five rider/heading blank lines cured here).
5. Untracked new files need `git add -N` to ride a captured delta patch.

## Next-cycle candidates (ranked, existing ids only)

1. rm-1975 — Node-26 evaluation at the 2026-10-28 LTS gate (v24 active
   support ENDED 2026-10-20; time-boxed).
2. rm-1976 — majors queue: the vitest-5 window closes 2026-10-21; jsdom 30
   and jest-dom 7 standing majors, each landing separately.
3. rm-252 — absorb window grew to upstream 69ec5ba: #647 react 19.3.1
   fusable; #646 Markdown run output needs visual-baseline-regen sequencing
   (CSS height shift; the html:false analysis stands); #654 impeccable
   3.6.1; #656 hook-bridge hardening (reconcile-by-content vs rm-1974's
   bound — adopt the stronger); #657 design-check pin.
4. rm-142 — residual @playwright/test 1.64.1 tri-bump (pin + MCR image +
   baseline lockstep, one reviewed change).
5. rm-1973/rm-1974 landing flips — implemented-pending-landing -> done at
   the land event (the commit gate owns the flip).
6. Fro Bot cron — FRO_BOT_PAT still unprovisioned (assess probe); scheduled
   runs cannot pass until it exists.

## Fold map

Batch delta (4 modified + 4 new, eight paths) is UNCOMMITTED in worktree
run-6b6520e98d7c-6b6520e9 at HEAD 64cd2f6a; fold lands batch + ledger band +
this doc together. The compound postimage SUPERSEDES two earlier spool
captures: the roadmap-phase delta (roadmap-delta-6b6520e98d7c-7207b38c-
cycle2.patch, anchored at the f5927919 wall — its band is carried entire,
re-anchored at 655bfe50) and the implement-phase delta capture
(implement-delta-6b6520e98d7c-c27e91b4.patch, 3 paths). Landing verification
owns: the status flips; census re-check (291 defs / 0 dups / max rm-1976 on
the compound wall); reconciliation with sibling fog bands above rm-1977 by
content, first-landed-wins.
