# Dashboard maintenance — repository-maintenance cycle 1 compound record (2026-10-18, run f509562edb7a445e91dec5c581687a54)

module: dashboard
tags: `[repository-maintenance, compound, validation, ephemeral-ci, base-drift, lockfile-guard, logger-redaction, base-gap]`
problem_type: compound-cycle-record

Campaign `repository-maintenance:ccf5235e4932449f9864dc2f937bd209:cycle:1`,
compound attempt `0de1b79d11954360b1c3b5ec00b89ab5` (redo of provider-reaped
`ed6fe7e6323f4c2eada27d8c87abff7b` — no typed artifact, zero executed
commands, zero tree residue), base `f521ec783cab` (== origin/main at dispatch;
origin/main has since advanced — 3c69b89 via 55086dd, then past debde800's
corpus heal — integrate notes below). Status at composition: PRE-REVIEW —
review and shipping happen after compound; the next cycle's assessment carries
them forward. Scope discipline: NO test execution at compound; the recorded
targeted/full outcomes are consumed as evidence.

## Cycle outcome

Batch "truth-in-detection" — 6 change-units, all pre-review:

- U1 `rm-1478`: base-drift.yaml derives BOTH the compare tag and the pinned
  digest from the Dockerfile `ARG NODE_IMAGE=` line (rm-779 pattern), hard-fail
  when no digest-pinned ARG is found; zero literal `node:24-slim` remains
  (grep-proof, comments included). The digest-re-bump arm was already
  satisfied on main (55086dd re-pin; Release 38992359530 green
  2026-10-17T01:47Z).
- U2 `rm-1479` (in-tree half): lockfile-guard.yaml re-landed byte-identical
  to the 99925c1 payload (68 lines, cmp-verified) — ghost workflow
  registration 375606447 becomes real again at landing.
- U3 `rm-1482`: `'cookie'` + `'session'` appended to DEFAULT_SENSITIVE_FIELDS
  in src/logger.ts; regression suite in test/auth.test.ts (5 cases); collision
  grep — zero current callers log those fields.
- U4: AGENTS.md Fro Bot paragraph truth (workflow ACTIVE; FRO_BOT_PAT absent,
  secrets total_count 0; HAS_FRO_BOT_PAT gate skips schedule fires).
- U5: ROADMAP.md ledger layer — roadmap-phase mints rm-1478..rm-1482 + 6 dated
  riders; implement-phase riders and the rm-178/rm-166 verified-delivered
  closures.
- U6 (unplanned, full_tests): release.yaml + scripts/release-paths.ts
  base-gap immunity port, byte-mirroring main's debde800 heal hunks — see the
  findings below and the rm-248 rider.

Attempt lineage of record: assess 48ec0d1f, research f2ea3758, roadmap
a2595e6d, prioritize 45952d17, stewardship c62ce091, implement 870b1571 →
709ee4b5 → 7b4c012a (KTD13 attestation repair; zero tracked bytes written),
targeted_tests 85105fe3 (redo of reaped 26992634), full_tests 437c9d6b,
compound ed6fe7e6 (reaped) → 0de1b79d (this record).

## Validation ledger (pre-review, consumed here)

| phase | attempt | outcome | salient evidence |
|---|---|---|---|
| targeted_tests | `85105fe3` | green | vitest 3 files / 77 tests (auth, base-drift-digest-readback, workflow-persist-credentials-guard); eslint rc=0; server tsc rc=0; actionlint container 1.7.12 rc=0 both workflows; run_repo_impacted_tests fast-mode fallback green |
| full_tests | `437c9d6b` | passed on execution 4 | engine github_ci_validate.py VERBATIM; PR #902 @ b5181d8a, validation_base_commit 71b18c07; Test/Lint/Check Types/Lockfile Guard/Design Check/Dependency Review/Test Scripts Load SUCCESS, Fro Bot skipped-by-design; emission digest `validation:v1:0fb1f647…` |

Failures 1–3 of the full gate (runs 39075095330 / 39075518715 / 39076128667)
failed ONLY test/should-release.test.ts path-parity — inherited from
transiently-gapped bases on main (11ce348a, 71b18c07; healed at debde800),
cured by U6. Full diagnosis and prevention rule:
`docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-18-transient-base-gap-path-parity.md`.

## Compound layer contents

- four validation-outcome riders (rm-1478, rm-1479, rm-1482 — landing
  verification owns the final flips — and the rm-248 corpus-pairing rider
  carrying U6) + the `cycle:1 compound tail` comment owning the newest census
  claim: 254 defs / 0 dups / max rm-1482 / next free rm-1483, unchanged by
  compound.
- this record and the solutions entry named above.
- ZERO mints, ZERO status flips, ZERO def-line edits; the compound delta is
  markdown-only (ROADMAP.md riders + 2 new untracked docs), so the
  executable-surface digest cannot move — `validation:v1:0fb1f647…`
  re-derived byte-identical after composition with the engine's own
  `validation_policy.validation_digest`.

## Findings (recorded)

- MEDIUM (upstream main, fleet-wide): transiently-gapped release-trigger
  corpus pairing makes ANY ephemeral-CI validation red when it inherits a
  gapped base — a flaky-gate hazard for all runs, not just this one. This
  batch carries the pairing in-tree (self-healing); the durable cure
  (atomic two-sided landing) is unminted — next-cycle lead.
- LOW: a forced base-drift run against THIS base's Dockerfile (still
  `173f1258`, predating main's re-pin) reddens as GENUINE drift — the
  sentinel working as designed; green arrives at the landing fold with
  main's Dockerfile bytes.
- INFO (engine-side, hermes-conductor, not this repo): `test/` missing from
  EXECUTABLE_PREFIXES ('tests/' plural) — dashboard test files classify
  non-executable in fold deltas; filed as provisional work from run 43cf6bc3,
  still open.

## Next-cycle entry points (ordered)

1. Landing verification for the six-unit batch — status wording flips at the
   land event; the fold's changed-path census must include U6 (10-path
   census: 7 tracked M + 3 untracked) and the KTD13 attestation must declare
   the full census.
2. rm-1479's ruleset-or-retire decision — live repo-settings change
   (repository RULESET requiring Main + CodeQL + the guard, strict +
   admin-enforced; workflow-vs-ls-tree parity proof; non-empty GET /rules).
   Protection shell + /rules 404 stand until then.
3. Durable corpus-atomicity cure — unminted; next free rm-1483 in this
   ledger, re-probe the all-lineage frontier before minting (sibling lanes
   have claimed higher bands, e.g. rm-1499 in the 2026-10-17 union-repair
   lane).
4. rm-102's dependabot root-cause-or-retire decision — automation dead 15+
   days at assess despite weekly cadence in three ecosystems.
5. Node 26 family move sequenced behind rm-1478's derivation (v24 maintenance
   starts 2026-10-20; v26 LTS 2026-10-28; node:26-trixie-slim already
   published) — rm-139 rider.

## Integrate obligations

- The worktree ROADMAP.md is the campaign ledger atop base f521ec783cab;
  main's render-epoch ledger diverged (stewardship c62ce091 surfaced both
  states). Integrate reconciles by content per the graft regime — union
  riders chronologically, keep the higher census, re-derive the guard pin
  from the unioned tree.
- U6's hunks mirror main's debde800 heal — verify the landing merge does not
  duplicate the `scripts/gzip-static-sidecars.ts` paths entry.
- rm-178/rm-166 closures and the AGENTS.md truth paragraph ride this batch
  unchanged.

## Verification of this compound layer (no test execution)

- `git status --porcelain` → 7 tracked M + 3 untracked (adds the two docs
  this layer wrote); HEAD f521ec783cab unmoved.
- census recount: 254 def lines / 0 dups / max rm-1482 — unchanged.
- digest re-derivation: `validation:v1:0fb1f647…` byte-identical pre/post
  composition (markdown-only delta, AE1).
- riders located by grep at their defs; tail comment owns the newest-claim
  slot by document order.
