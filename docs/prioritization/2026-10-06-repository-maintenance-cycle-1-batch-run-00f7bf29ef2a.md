# Dashboard maintenance — cycle 1 batch (2026-10-06, run 00f7bf29ef2a)

module: dashboard
tags: `[residue-sweep, healthz, adoption, ephemeral-ci, guard-tests, workflow-statics, conductor-debris, branch-protection]`
problem_type: batch-record
base: 306a972 == origin/main at assess/roadmap (wall day 4+; main moved to 3d07cf9 during implement and to ac61ff3 by full_tests — this batch's validation rode the ephemeral route, not main)

## Frame

Repository-maintenance cycle 1, run `00f7bf29ef2a4490949101a19f4221f6`,
compound attempt `8907a1d3cfa84c8aab3a128bc21288fc` (authored this document
2026-10-06 ~18:00Z, reaped provider-side at 18:02Z before folding it; adopted
and completed by attempt `dca08305a7014d79b43f698188cdc6d8` at ~23:5xZ, which
verified every checkable claim first-hand and landed the ROADMAP riders +
status records this document references; written pre-review from cycle
evidence only). Phase
lineage: assess `5eaaa40d` (main unbuildable and unprotected: frozen-install
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`, 9 open dependabot alerts incl
HIGH #29/#30/#32, protection shell with `checks: []` + `enforce_admins: false`,
62 code-scanning alerts, Lockfile Guard workflow active-but-absent-from-main),
research `f5dbd02b` (extension surface saturated: 215 committed ids max rm-613
plus 58 unlanded sibling ids rm-614..rm-671; posture ZE), roadmap `72c43eeb`
(extension #13: 6 dated riders + rm-139 inline append, +7/−1, zero mint),
prioritize `142b9345`, stewardship `2945f3c4`, implement `f35e137b` (adopted),
targeted_tests `00727348`, full_tests `6af9143f`.

## Selection

Batch: **'Standing residue sweep + healthz seal'** over the prior cycle's
standing-residue residue class. Selection turning point: the highest-impact
candidate (PR #389's cure snapshot, impact 10) was **live-claimed** by sibling
run `8b1672ef` (prioritize result `7ff002a8` completed 22:34Z, implement
ordered) — excluded here to avoid a head-on collision; the slot went to the
next-highest non-competing batch. PR #389 was later CLOSED unmerged
(2026-10-06T07:54:36Z); its 9-file snapshot `6f0d0d063134` remained fetchable
and MERGEABLE-shape with 11/11 green checks at head.

## Implementation — verified adoption, not redo

Implement completed on attempt 7 of 7 after six provider-dead predecessors.
Forensics (record: `delegate/f35e137b…-scratch/implement-verification-2026-10-06.md`):
the named attempt `add29a9d` did no tree work; the true author was `75ed284e`
(reaped 01:34:47Z after authoring 01:26–01:30Z — the fast-forward merge of
`origin/conductor/ci-6f0d0d063134` into branch `conductor/run-00f7bf29ef2a` at
01:26:00Z per reflog); two completed envelopes (`75eb4ac8` 02:33Z, `57cd5cdf`
05:11Z) both verified first-hand against the work order's identity/batch/tree
census before adoption. Lesson: the work order names only the LAST dead
attempt — grep the spool events dir for the run id and adjudicate every
attempt's typed artifact before redoing a phase.

Tree state at validation: HEAD `6f0d0d063134` (the adopted cure commit: floors
reconciliation `pnpm-workspace.yaml`, regenerated `pnpm-lock.yaml`, Dockerfile
heal, `lockfile-guard.yaml` NEW, package.json pin, fork-exclusion guard, ROADMAP
riders, docs) + five worktree entries authored by this run: `M ROADMAP.md`
(extension #13 riders), `M src/routes/api.ts` + `M test/dashboard.test.ts` +
`M test/server.test.ts` (healthz seal: body `{ok:true}`, placeholders
`lastFetch`/`rateLimit` dropped, pinning test retargeted), `??
.github/workflows/residue-sweep.yaml` (NEW: dry-run-by-default, 14-day age
floor, `conductor/run-*` preserved unconditionally, PRs close before refs
delete).

## Validation outcome (pre-review)

- Targeted: green over all 4 changed testable surfaces
  (`lockfile-guard.yaml`, `residue-sweep.yaml`, `package.json`,
  `src/routes/api.ts`) — eslint rc=0, tsc rc=0, actionlint container rc=0,
  guard suites + server suite 56/56, healthz `-t` 3/3; digest copied verbatim
  per the zero-executable-change rule.
- Full (`github_ci_validate.py --repo .`, detached per the long-call rule):
  **round 1 RED** 16:36:12Z — 2383 passed / 2 failed, both repo-wide workflow
  guards on the NEW workflow (rm-166 `--format` literal ban; rm-527
  persist-credentials key absent). Cured in-phase (see
  `new-workflow-guard-suite-precheck-2026-10-06.md`). **Round 2 GREEN**
  16:44:16Z — ephemeral PR #410, head `conductor/ci-5568e7b03383`, val-base
  `conductor/ci-base-6baeb6c6c115`, 10/10 SUCCESS; PR closed 16:46:47Z and
  branch refs deleted by the route — zero push-deletable debris
  (re-verified at the authoring attempt's close 17:5xZ and again by the
adopting attempt ~23:5xZ — PR #410 still CLOSED, both validation branch refs
still absent).
- Digest re-derived twice cross-call, oracle-verified (the engine's own
  validation_policy.validation_digest reproduced the dispatch digest
  byte-for-byte on the untouched pre-fix tree):
  `validation:v1:98a47d1e7c3ff6961b507156d58a37542f61fee3c61c1f43967eeab6d13d452b`.

## Reusable lessons landed

- `docs/solutions/workflow-issues/new-workflow-guard-suite-precheck-2026-10-06.md`
  — run both repo-wide workflow guard suites locally before any full round
  when `.github/workflows/` gains or edits a file.
- Adoption-over-redo forensics pattern (spool events + typed delegate records
  as ground truth; named attempt ≠ author) — recorded in the implement
  verification doc above and in conductor-level fleet memory.
- The ephemeral route's base carries origin/main's CURRENT workflow set —
  guard debt can arrive from outside your diff.

## Next-cycle candidates (concrete, for the next assessment)

1. **rm-116 branch-protection fill** — reserved by sibling `8b1672ef`'s
   verdict as post-landing ops; verify live ownership first (protection was
   still a shell at this cycle's assess: `checks: []`,
   `enforce_admins: false`). Contexts: Main jobs + CodeQL +
   `Lockfile Guard`, strict, admin-enforced.
2. **residue-sweep first dispatched dry-run + first live dispatch** — rm-159's
   remaining acceptance; needs a push-authorized phase. The dangling PR #390
   (open, head ref deleted) folds into the first live dispatch rather than a
   manual close.
3. **Lockfile Guard on main** — in-tree via the adopted snapshot; absent from
   main at base. Confirm the workflow is live at the landed tip.
4. **Dependabot burn-down verification** — 9 open at assess (HIGH #29/#30/#32)
   with 30 fixed-all-time and #45 a floors-collateral (brace-expansion);
   re-census after cure landing and adjudicate the remainder.
5. **Fro Bot workflow** — still `disabled_manually`; no `FRO_BOT_PAT` secret
   provisioned (assess). Decide provision-or-remove; do not re-enable blind.
6. **rm-282 fast-uri ^4 escape clause** — fast-uri 4.2.1 published 2026-10-04;
   ajv@8 pins `^3.0.0` and `npm view ajv@9` is empty, so no in-range path;
   the escape-clause decision (accept out-of-range / pin override / wait) is
   recorded unmade in this cycle's research rider.
7. **Windows** — rm-271 agent probe 2026-10-21; Node 24 EOL 2026-10-20 and the
   rm-133/rm-139 Node-26 window through 2026-10-28.
8. **Roadmap extension posture** — research posture ZE stands until the 58
   unlanded sibling ids (rm-614..rm-671) burn down; re-probe the live id
   ceiling before any mint.

## Traps recorded for the fleet

1. New-workflow authoring redden the repo-wide guard suites in cloud CI —
   pre-check locally (solutions doc above).
2. The work order's attempt id is not the author — adjudicate typed records
   before redoing a phase.
3. Main-side workflow replacements in the ephemeral base mean your red may be
   someone else's guard update — read the failing guard's provenance before
   blaming your diff.
4. The `--format` ban is deliberately blunt; the cure is a rewritten command,
   never a weakened guard.

## Review disposition (2026-10-07, review 52e54b5b — NEEDS_CHANGES; fix attempt 6236e88b)

Fixed in-tree at review-fix (pre-delivery, all validated by the fix-turn
targeted run):

- **F2** push-time sweep checklist authored at
  `docs/solutions/workflow-issues/push-time-ref-residue-sweep-checklist-2026-10-07.md`
  — rm-159's acceptance clause "checklist recorded in a solutions doc" is met;
  remaining halves: first dispatched dry-run log + first live dispatch.
- **F3** residue-sweep dry-run polarity hardened: the env
  `${{ inputs.dry-run || 'true' }}` trap is gone (a UI-unchecked boolean false
  used to stringify and silently stay DRY with no live path); LIVE now requires
  the exact trimmed lower-case literal `'false'` — fail closed; the input
  description is accurate again.
- **F4** malformed census lines (blank/short readback, ref deleted between
  census and resolution) SKIP with a log line instead of killing the job under
  `set -e` via `date -d @` / `[ -ge ]`.
- **F5** extension ordinal `#13` retired from our ROADMAP provenance comment
  (main carries four other `#13` extension comments); extensions attribute by
  run-id only.

**F1 — binding DELIVERY-phase disposition** (review verdict: not curable inside
review scope; the commit/push/pr phases MUST encode all of the following):

1. Byte-adopt origin/main's side on ALL FOUR stale-base files
   (`.github/workflows/lockfile-guard.yaml`, `Dockerfile`,
   `pnpm-workspace.yaml`, `pnpm-lock.yaml`) — nothing net-new rides them;
   `package.json` is ALREADY byte-equal to main, so the pin-cascade does not
   apply. Rationale: landing the branch-side variants verbatim regresses
   main's newer cure (9-key override set incl. source-map-js/katex floors vs
   our 7; vulnerable resolutions `source-map-js@1.2.1` / `katex@0.16.47` in our
   lockfile) and re-breaks the add/add 3-way apply on the ephemeral route.
2. ROADMAP three-way union BY CONTENT: ours 215 defs ∪ main's 225 — zero-mint,
   riders per the 8319b391 chronology convention, extensions attributed by
   run-id; re-verify 0 dup ids after the union.
3. Re-derive `pnpm audit` AND the emission validation digest on the RESOLVED
   tree: `lockfile-guard.yaml` is EXECUTABLE (digest WILL move); the
   pnpm-lock/pnpm-workspace pair and Dockerfile are non-executable (digest
   invariant to them).
4. Byte-equal file surfaces never regress (8 already byte-equal to main per
   the review: package.json, pnpm-lock.yaml, pnpm-workspace.yaml, Dockerfile,
   lockfile-guard.yaml, fork-exclusion test, 2 docs — after step 1 that count
   grows to 12).
