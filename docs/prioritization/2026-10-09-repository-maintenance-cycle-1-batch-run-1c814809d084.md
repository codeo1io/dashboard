---
module: dashboard
tags: [repository-maintenance, cycle-1, batch, rm-838, rm-841, rm-840]
problem_type: maintenance-batch
---

# Dashboard maintenance batch (2026-10-09, run 1c814809d084)

Repository-maintenance cycle:1 batch **'redaction-integrity + upstream-parity +
digest-hygiene'** (selected at prioritize 7c8ff52e from this run's assess 706a60f0 +
research 9cdd4f8d + roadmap 8cd4316c; base 88e423a == origin/main). Three units, all
implemented in this run's worktree. Offline-verifiable by design — GitHub Actions is
repo-wide disabled since 2026-10-09 ~02:00Z (422 dispatch re-probed at assess).

## U1 — rm-838 (security): two-key rehydrate scrub

The rm-198 fail-closed scrub matched `lastGoodSnapshot` rows on `node_id` only, while
both live guards carry a databaseId secondary (`buildWorkingSet` rejects a repo whose
derived databaseId is denied; the working-set query excludes `redactedDatabaseIdIn(...)`).
A deny entry keyed by explicit `database_id` could not scrub a snapshot row whose node_id
had the legacy base64 `...Repository<digits>` shape.

- `src/github/aggregator.ts` — new `repoDenylisted(repo, metadata)`: primary
  `redactedNodeIds.has(node_id)`, then `deriveDatabaseId(node_id)` (the file's own
  documented decode) tested against `redactedDatabaseIds`. `scrubLastGoodAgainstDenylist`
  filters through it, restoring buildWorkingSet's two-key posture. New-format opaque
  node_ids (no derivable id) stay keyed on the primary only.
- `test/aggregator.test.ts` — red-first test in the rm-198 describe: a boot snapshot
  carrying a legacy-format node_id row (`Buffer.from('010:Repository123456789').toString('base64')`,
  same fixture form as the existing legacy-id tests) against a deny entry keyed ONLY by
  explicit database id 123456789. RED on the old scrub (the row was served by name);
  GREEN after. 101/101 in the file.

Note: the assess finding described the legacy format as `oldformat:<digits>` — the real
encoding is the base64 `...Repository<digits>` form (verified against `deriveDatabaseId`
in `src/github/metadata.ts` before implementing; the format guess in the finding was
wrong, the hole was real).

## U2 — rm-841 (dependencies): katex cap + toml floor parity

- `pnpm-workspace.yaml:82` — toml floor `'>=4.2.0'` → `'>=4.3.0'` (GHSA-82x6-q7mm-w9cf;
  resolved parser chain unaffected at 5.0.0 — prophylactic parity with upstream #582).
- `pnpm-workspace.yaml:123` — katex cap `'>=0.18.2 <0.19.0'` → `'>=0.18.2 <1.0.0'`
  (admit upstream #581's patched 0.19.0 line).
- `pnpm-lock.yaml` overrides mirror `:11`/`:14` moved identically; `pnpm update katex`
  moved resolution 0.18.10 → 0.19.0 (a plain `pnpm install` keeps locked in-range
  versions — the explicit update was required). Lock diff = 12 lines exactly: the two
  override pairs + the katex version swap and its two mapping sites; zero transitive
  movement. `pnpm audit` clean; `pnpm install --frozen-lockfile` re-verified after.

## U3 — rm-840 (workflow): codeql-action v4.38.3 digest refresh

All FOUR sites (the def's original "3 sites / release.yaml:200 / scorecard.yaml:23" cites
were stale — stewardship 6bc6962a re-grepped them):

- `.github/workflows/codeql.yaml:56` (init), `:62` (analyze)
- `.github/workflows/scorecard.yaml:51` (upload-sarif)
- `.github/workflows/release.yaml:357` (upload-sarif)

`2892aa5e19bbd11bc0cff5427e3b750a04d9e3c2 # v4.38.2` →
`24c54180a607b1449ed407dd24f251e4e9147c8d # v4.38.3` (peeled first-hand via
`commits/v4.38.3`; the annotated tag object is 3c3f2d5…). actionlint container-form green
on all three touched files. upload-artifact pins (release.yaml:350, scorecard.yaml:44,
visual.yaml:101/:109) deliberately UNTOUCHED — that half folds with the unlanded
405e9004 lane per rm-761's fold note. Post-landing Analyze acceptance is deferred to
Actions re-enable, not voided.

## Verification recipe

```text
pnpm build:web                      # pretest parity for suites hitting /
npx vitest run test/aggregator.test.ts          # 101/101 (incl. rm-838)
npx vitest run test/roadmap-integrity-guard.test.ts   # 8/8 at pin 841
npx tsc --noEmit -p tsconfig.json   # clean
docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:latest \
  .github/workflows/codeql.yaml .github/workflows/scorecard.yaml .github/workflows/release.yaml
pnpm audit && pnpm install --frozen-lockfile   # clean / consistent
node scripts/roadmap-census.ts      # 251 defs / 0 dups / max rm-841
```

## Coordination (integrate obligations)

- rm-839 folds superseded into 159ec0eba87d's first-selected rm-837 (single
  implementation; this run did NOT touch test/listener-store-degradation.test.ts).
- rm-840's upload-artifact half: either/or with the 405e9004 lane's unlanded re-pin.
- This run's roadmap composition (ROADMAP.md + guard pin 780→841) and this batch ride
  together; the two spool-patch roadmaps (91f3d37f @ rm-835, 159ec0eb @ rm-837) must be
  re-applied before any later composition.
- Additive-edit discipline near PR #479's aggregator API-budget region (rm-162) — the
  scrub change is localized to the rm-198 region and touches nothing else in the file.

## Cycle outcome (compound)

Pre-review compounding only (compound de5d5a2dc93c4b62ba704eace542f3fd,
2026-10-09) — consumes the recorded targeted_tests (ca9955776bc94d5e8e09ac44e023728f)
and full_tests (2f92cda858ad4caa8e5783e4fdb816a5) outcomes; no test execution, no
status flips, no id mints; review and shipping happen after this step.

Outcome: the batch is pre-review-green at BOTH scopes. Targeted: the engine's
impacted mapping routed local `node targeted=4` (no fallback degeneration),
173/173 green over the four changed surfaces. Full: the supervisor-approved
account-level-Actions-disable deviation route (7th instance) — this lineage's
verbatim `github_ci_validate.py` burn produced ephemeral PR #498 carrying exactly
this batch's 10-file delta, check-dark across the full 3600 s (canonical timeout,
PR + refs reaped clean), then the local content-identical mirror of all six
Main-workflow jobs went green first-try (frozen install, lint 0 errors,
impeccable `[]`, check-types, 2479 + 1212 tests, actionlint 1.7.12, import loop
48/48). Digest `validation:v1:f44e71f7a3fcee7850daf3deba40299db2d37f78941288a3bfc5f42f0b583a21`
declared by full_tests, re-derived byte-identical — nothing executable changed
post-implement. ROADMAP compound riders appended at rm-838 / rm-840 / rm-841;
cycle compound comment #15 at the file tail carries the unchanged census claim.

### Reusable lessons

- Burn-once economics in the Actions-disable era: one verbatim burn per lineage
  is the evidence; never re-burn while dispatch 422s (recipe + trap list in
  `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-09-fulltests-burn-once-clock-forensics.md`).
- The burn doubles as snapshot-fidelity proof: `gh pr diff <n> --name-only` ==
  the batch delta, file-by-file, before the wait begins.
- Date riders from host + GitHub clocks, never the delegate context date
  (this session's context ran a day ahead; both authority clocks said 2026-10-09).
- Check `ls node_modules/.bin | wc -l` before any battery — the external-install
  wipe recurred here (0 entries; frozen install is the cure, 6.6 s).

### Next-cycle candidates (owners named, no claims transferred)

- rm-840 Analyze acceptance + first tripwire fire → first authorized turn after
  Actions re-enable (trigger: any run newer than 37872407109).
- Verbatim full_tests re-run + stranded `conductor/ci-*` sweep (23 heads,
  rm-778's def owns the sweep design) → first authorized push-gate turn
  post-recovery.
- rm-839 fold into 159ec0eba87d's rm-837 at integrate (standing obligation
  above; unchanged by this phase).
- pnpm 11.28.5 bump under rm-760's held-version window (eligibility lifted
  2026-10-10T06:42Z; reconcile with unlanded rm-797) → next refresh cycle.
- rm-252 absorb window re-census before the next compose (upstream moves daily;
  this cycle's census: tip 1ecbb81, 27 commits, 4-item unabsorbed set).
