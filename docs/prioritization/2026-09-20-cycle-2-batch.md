---
date: 2026-09-20
topic: dashboard maintenance cycle 2 — scoring and batch selection
mode: delegated-conductor
run: f4622d7ef78c49a7ae97725fe4d1b683
phase: prioritize
attempt: e5fd498f7cd94714823ceaf1452bd1a8
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill; same fleet precedent as cycle 1). Deviations declared: no subagent surface in this session (convention #3768); interactive gates replaced by autonomous adjudication per work order. Lineage note: engine labels this run cycle:1 (run requirement repository-maintenance:99c7f089:cycle:1); by repo lineage this is cycle 2 (second prioritization batch after 2026-09-19-cycle-1-batch.md) — disclosed per the lineage-numbering convention.
---

# Dashboard maintenance — cycle 2 batch (2026-09-20)

## Live frame facts (re-measured this cycle, not carried stale)

- origin/main at `5b8a2b3`, UNCHANGED since this run's assess (worktree `b2ef125` is its content twin — no re-merge needed). Verified `git fetch origin` + `git rev-list --count HEAD..origin/main` → 1 (the PR-4 branch commit vs its squash-merge; content-identical, established at assess).
- Two red gates at HEAD, re-verified this run: Main/Check Workflows red on `fro-bot.yaml:266` (job-level `if:` referencing the `secrets` context; actionlint container `rhysd/actionlint:1.7.12` exits 1 at 266:47 locally, reproducing CI run 35459361435) and CodeQL red (`Cannot find module 'typescript'`, run 35459361364; `codeql.yaml` has NO deps-install step — grep confirms init at line 32 with no pnpm step between checkout and init).
- Upstream drift 4 commits (7fab758, 54a5669, 3efa4b1, 86c1e6a); latest base digest `0e0ff40`; hono 4.13.8 = convergence only (advisory DB probed: no GHSA affects 4.13.7).
- No open PRs on codeo1io/dashboard; no dependabot PRs yet (first expected ~2026-10-03).
- main UNPROTECTED (branch-protection 404, rulesets empty) — structural enabler of the red-check merge, addressed by rm-112 (held this cycle, see G1').
- Local gates at the assess tree: check-types 0, lint 0, tests 3017/3017 — source is healthy; both P1 fixes are workflow-file edits.
- Roadmap pool after the roadmap phase: 17 unresolved items (rm-100..rm-108, rm-110..rm-118; rm-109 completed).

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
|-----|--------|-------|--------|----------|-----------|-------|----------|
| rm-100a fro-bot.yaml env-gate rewrite | 5 | 5 | 5 | 4 | 5 | 24 | PASS — batch #1 |
| rm-100b codeql deps-install step | 5 | 4 | 5 | 4 | 5 | 23 | PASS — batch #2 |
| rm-111 base absorb 0e0ff40 + retire libpcre2 patch + hono 4.13.8 | 4 | 3 | 4 | 3 | 4 | 18 | PASS — batch #3 |
| rm-110 checkSuites first: 100 + fixture | 3 | 3 | 4 | 5 | 3 | 18 | PASS — batch #4 |
| rm-117 binding-docs metadata-source sync | 3 | 2 | 5 | 5 | 4 | 19 | PASS — rider, batch #5 |
| rm-112 merge-hygiene baseline (protection + drift) | 5 | 4 | 3 | 2 | 5 | 19 | HOLD — fails G1' (defeats this cycle's own landing mechanism) |
| rm-115 gate-health roll-up | 3 | 3 | 2 | 4 | 4 | 16 | HOLD — must be designed jointly with rm-107 as one surface |
| rm-103 upstream-absorb automation | 4 | 2 | 3 | 2 | 4 | 15 | HOLD — depends on green CI first (cycle-1 G1 precedent); manual absorb IS rm-111 |
| rm-113 security-posture panel | 4 | 2 | 2 | 3 | 4 | 15 | HOLD — needs plan phase; App-side permission registration unverified |
| rm-114 per-repo scoped tokens | 3 | 2 | 2 | 4 | 4 | 15 | HOLD — security-core change; own cycle + review |
| rm-104 roadmap render hardening | 4 | 5 | 2 | 2 | 4 | 17 | HOLD — generator lives out-of-repo |
| rm-107 operator system-status panel | 3 | 2 | 2 | 4 | 4 | 15 | HOLD — plan-phase work |
| rm-105 SBOM + provenance | 4 | 2 | 3 | 4 | 4 | 17 | HOLD — Release pipeline change; ride after green base |
| rm-106 listener digest push | 3 | 2 | 2 | 3 | 4 | 14 | HOLD — plan + policy work |
| rm-116 gateway-contract drift watch | 2 | 2 | 3 | 4 | 3 | 14 | HOLD — process item, no red gate |
| rm-118 aggregator hygiene batch | 2 | 1 | 3 | 5 | 2 | 13 | HOLD — code churn + policy decisions; hygiene-themed cycle |
| rm-108 major watchlist | — | — | — | — | — | — | Policy only; roadmap entry refreshed this cycle is the deliverable |

## Gates and adjudications

- **G1 in-repo controllable** — no landing dependency outside this repo's commit/push gate. rm-104 fails (different repo); rm-103 fails (needs green CI, which is this batch's output).
- **G1' does not defeat the cycle's own landing mechanism** — NEW this cycle. rm-112 scores 19 but enabling required-status-checks protection on main would REJECT the direct-push landing this engine's commit/push gates perform (and queue every future landing behind the single serialized runner). Enabling protection is a landing-mechanism policy decision (direct push vs PR flow) that belongs to the operator/engine, not a maintenance rider. rm-112 is the next-cycle headliner WITH that decision surfaced.
- **G2 bounded effort** — every in-batch item is a known, previously-implemented or mechanical change: env-gate pattern proven at 886c28e; deps-install step proven in run-333ad19e's tree; base absorb proven in the same tree; first: 100 + fixture proven there too (suite 3018); docs sync is text.
- **G3 verifiable in-cycle** — rm-100a/b provable at the pushed sha (Main + CodeQL runs green); rm-111 provable at the Release run (Trivy zero HIGH/CRITICAL) + local gates; rm-110 provable locally (test count 3017→3018); rm-117 provable by grep + lint.
- **G4 coherent theme** — "restore the red gates and LAND the orphaned proven fixes" (reliability restoration + truth-in-docs). Every item is either a live-red repair or a previously-implemented-but-unlanded fix (the recurring unlanded-batch failure mode this run's assess pinned) or the doc-truth rider on the same theme.
- **G5 no prohibited-phase work** — selection only; no commit/push/pr/ci this turn.
- **A1 (rm-110 admitted, reversing cycle-1's A2 file-scope heuristic):** cycle 1 held rm-110 for touching files the batch otherwise never touched. This cycle admits it ON THEME: the batch's explicit purpose includes landing run-333ad19e's orphaned implement batch (of which rm-110 was part), and its Dep-free is 5 (locally provable, no CI dependency). The file-scope heuristic served coherence then; coherence now demands the orphan be landed.
- **A2 (rm-117 as rider):** docs-only, 4 files, zero behavioral surface; rides the theme's truth-in-docs leg and retires a P2 assess finding (F5) that would otherwise age another cycle.
- **A3 (rm-111 target):** absorb to `0e0ff40` (upstream latest), NOT a9d7043 — superseding run-333ad19e's target; the in-image libpcre2 patch retires in the same change per the state-change rule (Dockerfile's patch-describing comment updated in the same commit).

## Selected batch (this cycle's implement scope)

1. **rm-100a** — `fro-bot.yaml:266` job-if → job-env gate (`env: HAS_FRO_BOT_PAT: ${{ secrets.FRO_BOT_PAT != '' }}` at job level, `if: env.HAS_FRO_BOT_PAT == 'true'` style per the release.yaml 886c28e precedent). Acceptance: actionlint container exit 0 at the tree; Check Workflows + Main green at the pushed sha.
2. **rm-100b** — `codeql.yaml`: `pnpm install --frozen-lockfile` between checkout and codeql-init (bare-pnpm form; runs-on stays self-hosted per PR #1 policy). Acceptance: CodeQL Analyze green at the pushed sha.
3. **rm-111** — Dockerfile pins `2fe369e` → `0e0ff40`-equivalent at all three FROM lines; libpcre2 patch block retired with its comment updated in-commit; hono → 4.13.8 (`pnpm update`, lockfile churn accepted). Acceptance: Release Trivy zero HIGH/CRITICAL at pushed sha; pnpm test 3000+ locally.
4. **rm-110** — `checkSuites(first: 10)` → `first: 100` at aggregator.ts:137 and :174 + >10-suite fixture test. Acceptance: suite 3017→3018 locally; no MonitoringDto behavior change.
5. **rm-117 (rider)** — AGENTS.md/README.md/copilot-instructions.md + metadata.ts doc comments/tests: `fro-bot/.github` → `codeo1io/.github` as the metadata denylist source. Acceptance: grep clean across binding docs; pnpm lint exit 0.

Landing note: the worktree also carries this run's ROADMAP.md update and the ideation doc (uncommitted) — they ride the same landing gate.

## Out-of-batch (top of next cycle)

rm-112 (with the landing-mechanism decision surfaced), rm-113, rm-115+joint rm-107 design, rm-103 (once green), rm-105.

## Cycle outcome (2026-09-20, compound phase — pre-review record)

All five selected items were implemented in the run worktree (uncommitted, staged for the landing gate) and the required full-scope validation passed with zero fixes needed beyond the first implementation pass:

- rm-100a — SHIPPED WITH A DESIGN CORRECTION: the acceptance above predicted the release.yaml 886c28e job-env gate; local actionlint rejected that form too (`context "env" is not allowed here` — a job-level `if:` admits only github/inputs/needs/vars). Shipped form is the needs-gate pattern: tiny `secret-gate` job (self-hosted, timeout 5, `permissions: {}`) exports `has_pat` from step-level env; fro-bot job branches on `needs.secret-gate.outputs.has_pat`. Prevention doc: `docs/solutions/workflow-issues/job-level-if-cannot-read-secrets-or-env-needs-gate-2026-09-20.md`.
- rm-100b — `Setup build environment` (`./.github/actions/setup`, mirroring Main's jobs) inserted between checkout and codeql-init.
- rm-111 — all three Dockerfile pins at 0e0ff40 (== upstream 86c1e6a); libpcre2 patch retired per the state-change rule; hono 4.13.8 in the lockfile with package.json deliberately kept at ^4.7.11 (`pnpm update` rewrites the manifest range — reverted; lockfile importer specifier corrected instead).
- rm-110 — `checkSuites(first: 100)` at aggregator.ts:137/:174 + 12-suite regression test (asserts the sent query and the summed failingChecks).
- rm-117 — all four doc sites read `codeo1io/.github`; grep clean.

Gates at the implemented tree: actionlint container 1.7.12 exit 0 (was exit 1 at fro-bot.yaml:266:47), `pnpm lint` 0, `pnpm check-types` 0, `pnpm test` 1998 + 1020 = 3018/3018, `pnpm install --frozen-lockfile` 0. The engine's generic `npm test -- --runInBand` template is rejected by Vitest 4 (CACError) — repo gates substituted, per standing convention. Targeted-tests dispatch validation (scope full) declared digest `validation:v1:b055dbc9da7826e5175f282b120b20d2e822c31eabd478ef9d99ce71d7ad99c9` verbatim with a byte-identical tree fingerprint.

Outstanding (deferred to the landing/review gates by phase rules): Main green, CodeQL green, Release Trivy zero-HIGH at the pushed sha; suite 3018 on origin/main.

Lesson for the next cycle (recurring failure mode, now twice consecutive): run-333ad19e's fix batch stranded in its worktree and had to be re-derived here. "Implemented" is not "landed" — the next cycle's assess must FIRST re-verify landing of any prior cycle's unlanded fixes (this run's batch included) before scoring new work. The headliner decision remains rm-112: branch protection would reject the engine's direct-push landing mechanism until landing moves to a PR flow — an operator/engine decision, not a maintenance rider.

## Post-review addendum (2026-09-20, review-fix phase — supersedes the live-frame facts above)

The "live frame facts" quoted above were true at prioritize time (00:15:58Z) and
STALE by compound (02:49Z): origin/main advanced 5b8a2b3 → 2f3a884 via a fleet
render commit ("docs: refresh autonomously-maintained ROADMAP.md (fleet sync
2026-09-20...)") direct-pushed at 2026-09-20T00:36:41Z — between this cycle's
stewardship (00:19) and implement (02:20) phases; no post-stewardship phase
re-checked until review (IR-1/IR-3).

Gate reality at 2f3a884 (re-verified live at review-fix time): Main run
35479225529 FAILURE (Lint red on the render's own ROADMAP.md:20:32
`markdown/no-missing-label-refs`; Check Workflows red on the PRE-FIX
fro-bot.yaml:266 secrets-context `if` — the render landed on top of 5b8a2b3
without this batch's fixes) and run 35479225585 FAILURE (CodeQL). The batch's
code/workflow/lockfile files are IDENTICAL between worktree HEAD b2ef125 and
2f3a884 — the only differing file is ROADMAP.md, which is therefore the sole
landing conflict site.

Landing-gate instructions (IR-1 required action, recorded here because landing
is outside this phase's boundary):

1. Re-derive the live frame at push time (origin/main tip, gate states, open
   PRs) — never reuse this doc's stale facts.
2. Resolve the ROADMAP.md conflict by taking the WORKTREE's curated version
   wholesale: it carries all 18 items (rm-100..rm-118) with this cycle's
   implementation notes and both review notes; the fleet render's deletions
   (the manual-revision comment, items rm-100..rm-110, the rm-001/rm-002
   supersession reverts) and its lint-breaking bare-array construct must NOT
   survive the merge. No three-way merge that resurrects render deletions.
3. Verify after landing: `pnpm lint` exit 0 (proves the render's construct is
   gone), `gh run list --branch main -L 3` green at the pushed sha, and suite
   3018 on origin/main.
4. rm-104 (generator hardening) and rm-112 (branch protection / landing
   mechanism) each carry this second-instance evidence in ROADMAP.md — the
   next prioritize pass must weigh them with it.

Review findings disposition (all seven): IR-1 documented here + roadmap;
IR-2 escalated in rm-104/rm-112 signals; IR-3 this addendum; IR-4 corrected
going forward (breadcrumbs now carry live UTC clock stamps; fs mtime remains
authoritative); IR-5/IR-6 deferred to the next docs batch per their own
required actions (recorded in rm-117/rm-110 review notes); IR-7 no action
(deviation already documented in ROADMAP and the cycle-outcome section).
