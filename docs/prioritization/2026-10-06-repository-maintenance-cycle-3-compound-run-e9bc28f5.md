# Dashboard maintenance — cycle 3 compound record (2026-10-06, run e9bc28f5)

module: dashboard
tags: `[compound, repository-maintenance, cycle-3, validation-record, next-cycle-candidates]`
problem_type: batch-record
base: 306a972 (batch base) — origin/main at compose: ac61ff3 (moved 4x on 2026-10-06: 3d07cf9 → fe928ca → c210933 → ac61ff3)

## Frame

Repository-maintenance campaign `78c96f994f0b4ce0a4cd89770f606b59`, cycle 3,
run `e9bc28f55ed24038bce3613649c6e9af`, compound attempt
`a65df4212ca74b358b50f17faa07540b`. This document compounds PRE-REVIEW cycle
evidence only (assessment, research, roadmap, prioritization, stewardship,
implementation, test outcomes); review and shipping happen after this step and
the next cycle's assessment carries them forward. No tests were executed at
compound — every validation number below is consumed verbatim from the
recorded phase artifacts.

Phase lineage (completed attempts / infra-reaped priors — five reaps this run,
all with zero durable output, all redone from scratch; reap-at-low-message-count
is transport, not verdict):

- assess `53cf8f1d` (prior `b616b543` reaped)
- research `3790e54f` — candidates R1–R5, id census (committed max rm-613,
  sibling uncommitted claims through rm-671, next free rm-672 at research time)
- roadmap `edce1098` — extension #14: minted rm-674 + riders R1/R3/R4/R5 on
  rm-285/rm-271/rm-137/rm-143 (+16/0)
- prioritize `c8a6bea0` (prior `7214ec57` reaped at 22s) — batch selected:
  **'Unfreeze, floor-complete, ledger-repair'**
- stewardship `2ed16179` — structured stewardship_request, no git topology
- implement `227047c5` (prior `d67aeb77` reaped provider-family) — byte-adoption
  of PR #389's validated head `conductor/ci-6f0d0d063134` (8 files hash-proven)
  + independent lockfile regen under pinned pnpm 11.28.4 (blob `a9dfc490`,
  byte-identical to sibling c5b7cd7d's derivation) + ledger union-splice
- targeted_tests `a18c8704`
- full_tests `736cc62b` (fail-closed record; prior `575822be` reaped at
  dispatch) and `f95c7f3f` (RC=0)
- compound `a65df421` (prior `f6d5a115` reaped at message_count 2, ~37s, zero
  durable trail — verified: no scratch dir, no result JSON, no worktree mtime
  past 11:24:50Z)

Worktree state at compound (untouched by this phase, md5 of porcelain stable
at `3545fb…` since 736cc62b): 3 added + 5 modified staged paths (the batch),
unstaged ledger extension on ROADMAP.md (32/0 vs HEAD), post-stage regen
residue on pnpm-lock.yaml (20/18) and pnpm-workspace.yaml (9/0).

## Validation record of record (pre-review)

- **targeted a18c8704** — dispatch `targeted_command` probed `--print-only`
  first: `impacted-tests: shared build/test configuration changed;
  fallback=full` (package.json ∈ FULL_IMPACT_FILES forces the ephemeral-PR
  route, prohibited on this turn) → in-worktree focused battery instead: 11
  vitest guard suites green, actionlint 1.7.12 (container) rc=0, eslint rc=0
  (2 'File ignored' notices only), `pnpm install --frozen-lockfile` rc=0,
  `pnpm audit` rc=0 **0 vulnerabilities** against the regenerated lockfile
  (engines WARN is advisory-only; CI pins node 24). Declared digest
  `validation:v1:9cade959…` @base 306a972.
- **full_tests 736cc62b** — full_command VERBATIM → rc=1 in 5s, fail-closed
  PRE-push at the `git apply --3way` stage: add/add on
  `.github/workflows/lockfile-guard.yaml` (batch carried fleet 62-line
  `c3f7b6d9`; mid-run main shift `3d07cf9 → fe928ca` had landed its own 58-line
  `97a8ebf6`). Zero remote debris. Also discovered: **PR #389 CLOSED unmerged
  2026-10-06T07:54:36Z** (was OPEN/MERGEABLE 11/11 at this run's 07:5x probe).
- **full_tests f95c7f3f** — in-phase cure: guard byte-harmonized
  `c3f7b6d9 → 97a8ebf6`, **comment-only** (20 changed lines, all `#`;
  stripped-diff empty; actionlint rc=0), re-staged → full_command VERBATIM →
  **RC=0**: ephemeral draft PR **#402**, 11/11 checks SUCCESS (Analyze/CodeQL,
  CodeQL, Dependency Review, Lint, visual, Check Workflows, **Lockfile Guard**,
  Check Types, Test Scripts Load, Design Check, Test), head `7be773d54b07`,
  validation base ref `conductor/ci-base-958352dc1515`, closed unmerged
  11:28:08Z, both `conductor/ci-*` refs deleted — zero debris. Emission digest
  `validation:v1:76030301…` @base 306a972 **supersedes 9cade959** (comment-only
  byte changes move the content hash).

## Ledger state at compound

216 definitions / 0 dups / max rm-674. This cycle minted exactly one id
(rm-674); riders added: 4 research riders (roadmap phase) + 3 compound riders
(this phase, on rm-285 / rm-116 / rm-674) + the compound header annotation.
**ZERO status flips at compound** — status transitions are ship-phase
decisions. The live ROADMAP also carries the origin run cfa9f94b's
extension #28 + 8 riders (rode in via the byte-adoption; union-spliced by implement).

## Deliverable form

Spool patch `compound.patch` (this attempt's scratch dir): ROADMAP.md riders +
header annotation, plus this record and
`docs/solutions/workflow-issues/ci-validate-prepush-apply3way-addadd-workflow-collision-2026-10-06.md`
(prevention rules for the add/add collision class). Digest-immune by surface
classification — ROADMAP.md and docs/** are non-executable, so folding cannot
move `validation:v1:76030301…`. The worktree is untouched by compound.

## Fold obligations (next sanctioned tree-mutating phase)

1. `git apply` the compound patch; then re-run the census + roadmap guard gates
   **in that phase** (compound ran none).
2. Re-probe `origin/main` tip; hash-compare ALL batch workflow files against it
   (at compose the tip's guard is `1ab27c9`, 68 lines — the batch's validated
   `97a8ebf6`, 58 lines, already trails it) and comment-only harmonize BEFORE
   any github_ci_validate route, re-deriving the digest after.
3. Reconcile the staged batch against the live tip per-file: main `ac61ff3` is
   the conductor-landing of the origin run cfa9f94b's own batch, so most
   functional cure bytes are expected already on main — verify blob parity
   against the LIVE tip (rewinds happen), and treat this run's residual ship
   value as ledger riders + record docs + the union'd ledger, not re-landing.

## Next-cycle candidates (concrete, evidence attached)

1. **rm-674 implementation** (Monday-cron consolidation) — acceptance fully
   drafted in the ledger; first re-derive the latency band from fresh
   2026-10-12 Monday fires (the +6h58m..+8h39m band is a single-day sample)
   and re-check rm-670's ≥9h alert-threshold premise.
2. **Docker `--only-upgrade` layer** — decidable YES on the pinned
   `node:24-slim` digest (libpcre2-8-0 `10.42-1+deb12u1→u2`, perl-base
   `5.36.0-7+deb12u3→u4` both carried by the base's own sources); forcing
   function: code-scanning 62 open rows, newest CVE-2026-103111 (pcre2,
   2026-10-02T13:54:17Z) keeps release.yaml's Enforce gate (exits 1 on
   HIGH/CRITICAL) red until it lands.
3. **rm-116 fill** — Lockfile Guard demonstrated green in ephemeral CI (PR
   #402); sequence cure-first-then-fill once the floors cure is verified on
   main.
4. **Node-26 LTS window 2026-10-28** (24.x maintenance entry 2026-10-20) — the
   Trivy-corpus rebasable edge; re-probe endoflife.date at cycle time.
5. **Scorecard posture-doc refresh** — exactly 3 open rows remain (LicenseID,
   CIIBestPracticesID, MaintainedID, all 2026-09-16); the Code-Review row
   auto-closed at the 2026-10-05T15:06:34Z re-score; re-derive the below-8 set
   from a fresh pull at writing time.
6. **In-range bumps** (research R3): @types/node 24.13.3→24.19.1, eslint
   10.11.0→10.12.0 (evaluate where Main's Lint actually executes post-cure);
   hono 4.13.11→4.13.13 should ride a cure-regen, not a standalone bump.
7. **Majors window ~2026-10-21 re-eval** (rm-133): typescript 7.0.2 still
   gated by the typescript-eslint `<6.1.0` peer; vitest 5 / jsdom 30 / undici 8
   defer unchanged.
8. **Post-landing watches**: the 9-open dependabot set closing; Main matrix
   re-green at Setup; stranded ref `conductor/run-a2def4ce34dc` (superseded by
   the ci-6f0d0d063134 lineage — delete-or-absorb decision for the next
   assessment).
9. **Process carry-overs**: run event-log forensics before redoing any reaped
   phase (5/5 reaps this run had zero durable output); the audit time-defeat
   recipe (audit a /tmp 3-file copy at the cure head — package.json +
   pnpm-workspace.yaml + pnpm-lock.yaml — never the broken worktree) ;
   `pnpm install --prod` pruning hazard on this worktree's node_modules
   (restore with a full frozen install before any test gate).
