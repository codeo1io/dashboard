# Repository-maintenance cycle 1 — compound learnings, run 3d6aa134904b (2026-10-16)

Cycle: repository-maintenance:596dca18 cycle 1 over `/work/projects/dashboard`,
base HEAD 3e3664c, branch conductor/run-3d6aa134904b. This document compounds
pre-review cycle evidence only (assess → research → roadmap → prioritize →
stewardship → implement → targeted_tests → full_tests); review and landing
outcomes land after this step and the next cycle's assessment carries them.

## What this cycle proved

**Headline adversarial finding (assess bca15720).** The 2026-10-09 landing
merge 3e3664c destroyed its own batch's claimed deliverable:
test/roadmap-integrity-guard.test.ts was carried MODIFIED on the batch side
(parent 06396b4) while the main-side parent had deleted it, and the merge
resolved modify-vs-delete as DELETE. The batch doc
(docs/prioritization/2026-10-09-...d8fdf8b79ad5.md:6) still claimed it as a
deliverable with census 247 while the live ledger sat at 237 defs for six
days with no guard on main noticing. Root cause is structural: batch docs
declare deliverables in prose no parser can check, and the landing pipeline
has no post-merge deliverable-presence step.

**The cure is now in the tree (implement 5cad71b9 / re-dispatch 0f5280de).**
Both guard halves re-landed — scripts/roadmap-census.ts (zero-dependency
census CLI) and test/roadmap-integrity-guard.test.ts (schema + corruption
red-proof) — plus a NEW deliverable-presence mechanism: any
docs/prioritization doc carrying a `## Deliverables` section declares
repo-relative paths in backticked bullets, and the guard fails if any
declared path is absent or if the newest carrier's census claim diverges from
the live ledger. The 2026-10-15 batch doc is the first carrier. A landing
that drops a declared file now goes red instead of silent.

**Validation state (targeted_tests b37aba218, full_tests 4a0e25f5).**
Targeted: five focused gates green (guard 11/11 with the length-guard,
census CLI 245/0/864, lint-clean on all touched files, tsc 0). Full: the
seeded verbatim full_command routes to GitHub ephemeral-PR CI, which is
outage-blocked (Actions hard-disabled; two-sided probe re-proven — newest
run 37872407109 @ 2026-10-09T01:59:31Z, dispatch 422 "Actions has been
disabled", GET permissions still lies enabled:true), so validation ran as
the supervisor-approved local six-job Main-workflow mirror: install rc=0,
lint 48 errors ALL in ROADMAP.md (the frozen band), impeccable@3.2.1 detect
clean, check-types 0, pnpm test 3078 + 1213 passing, actionlint clean,
scripts-load clean. Deviation documented in the full_tests scratch report.

## Prevention rules adopted (durable)

1. Batch docs declare deliverables via the `## Deliverables` marker section,
   not prose — the roadmap-integrity guard enforces presence. Any cycle doc
   that names new files uses the marker.
2. Known renderer-owned ledger debt is carried as EXPORTED baselines in
   scripts/roadmap-census.ts (TRAILING_WS_BASELINE=47,
   BARE_BRACKET_BASELINE=1), not as magic numbers — lowering a baseline is
   the rm-864 path and must be an explicit, greppable edit.
3. Lint parity band: the ledger's markdown lint census is 48 (47
   trailing-spaces + 1 renderer-owned label-ref at ROADMAP.md:19). A
   full-repo lint above 48, or ROADMAP-only findings appearing anywhere
   else, is a new regression — investigate, never widen the band.
4. Ledger def lines are the machine-readable surface: status vocabulary is
   candidate / in_progress / implemented (+ the closed-entry forms), and the
   census script's def-regex is the parser of record. Minting checks
   id-freedom first; the guard pins the ceiling (now rm-864) so drift is
   caught.

## Status flips recorded this cycle

rm-857, rm-862, rm-863: candidate → implemented 2026-10-16, pending landing,
each with its implement-outcome evidence line appended in ROADMAP.md.
rm-858/859/860/861/864 remain candidate with deferral rationale in the
prioritize artifact (9ae85affe): absorb gated on gateway contract
ship-together; runtime rollback sequenced after the absorb rework; majors
are separate validated batches; render-guard remainder is the rm-864 path.

## Context for the next cycle

- rm-858 (absorb 1bcd98a..55d1001, p90) is the standing highest-value item.
  Prerequisites re-verified this cycle: window carries zero write-capability
  surfaces; agent v0.122.3 ships security fixes; the operator contract is
  exact-match both sides so adoption must be coordinated with the gateway
  deployment (fro-bot/.github PR 3512 family), and the rm-861 push-display
  route decision must be recorded BEFORE the absorb lands.
- rm-864 remainder: lower the census baselines by fixing the renderer-side
  empty-acceptance emission (47 lines) and the :19 label-ref; then tighten
  the tripwires toward absolutes. Taxonomy collapse (236/237 defs render
  track: reliability) and the 3 dangling refs (rm-13640, rm-553, rm-678)
  are open render-hygiene inputs.
- The 52-file standing silent-drop condition (pre-existing main-side
  deletions the 2026-10-09 batch carried unchanged: census script lineage,
  release.md runbook, cve-tripwire/lockfile-guard workflows, guard tests,
  ErrorBoundary, 40+ docs) is NOT cured by this batch — only detectable
  going forward via the marker. A dedicated restore/re-adjudication pass is
  a candidate for a future cycle; several of those files have since-evolved
  successors on main, so restoration needs per-file adjudication, not bulk
  checkout.
- Process traps hit this cycle (recorded so the next cycle skips them):
  node_modules is swept between delegate attempts (re-run
  pnpm install --frozen-lockfile before any gate); the impacted-tests
  wrapper's file pool is git-ls-files (TRACKED only), so brand-new test
  files are invisible to it — `git add -N` first when narrow scope must be
  proven; dead provider-killed attempts are verified non-adoptable via
  their 4-line event logs before redoing.

## Verification pointers (recorded evidence, not re-run here)

- Guard + census: implement 0f5280de and targeted_tests b37aba218 results
  under the conductor delegate spool; `node scripts/roadmap-census.ts` and
  `npm exec -- vitest run test/roadmap-integrity-guard.test.ts` re-verify in
  any checkout with node_modules present.
- Full mirror logs: delegate/4a0e25f5...-scratch/ jobs 01-07.
- Ledger now: 245 defs / 0 dups / max rm-864, statuses implemented 7 /
  candidate 8 / in_progress 230.
