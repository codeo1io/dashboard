---
date: 2026-09-20
topic: dashboard maintenance cycle 2 — scoring and batch selection
mode: delegated-conductor
run: 270220e7481a4b3c954bb552eb9b6b84
phase: prioritize
attempt: 3ece467689e7423599ebb73947186643
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent cycle-1 batch a829541a). Deviations declared: no subagent surface in this session, frames run in-process and disclosed (convention #3768); interactive gates replaced by autonomous adjudication per work order. Cycle-label disclosure: the engine labels this stream cycle 1 (`repository-maintenance:61db36452b6a4e43aeec76650f39e4d4:cycle:1`), but the repo lineage already carries `2026-09-19-cycle-1-batch.md` (run cf5527c1) — this batch follows repo lineage numbering as cycle 2 per convention.
---

# Dashboard maintenance — cycle 2 batch (2026-09-20)

## Live frame facts (re-measured this cycle, not carried stale)

- Fork tip `2f3a884` == `origin/main` == run-worktree HEAD (verified 2026-09-20 via `git fetch origin` + `git rev-list --left-right --count HEAD...origin/main` → 0/0). No fleet render landed mid-run since the assess phase.
- Main run 35479225529 @2f3a884: **failure** — Lint red (NEW: fleet render's bare-array construct at ROADMAP.md:20:32; green at parent 5b8a2b3 via run 35459361435) and Check Workflows red (fro-bot.yaml:266 — step-level `if:` referencing `secrets` invalidates the whole file). CodeQL run 35479225585 @2f3a884: **failure** (`Cannot find module typescript` — autobuild has no deps-install; checkout git-clean wipes node_modules). Release green last at fc7b834 (35420789813).
- Local at the run worktree: `pnpm lint` exit 0 (roadmap phase restored the file), `pnpm check-types` exit 0, 3017/3017 tests green (assess phase, 2026-09-20).
- Upstream `autonomy-upstream/main` is 4 commits ahead of the merge-base `6f4e620`: `86c1e6a` node digest 0e0ff40 (#492), `3efa4b1` node digest a9d7043 (#491), `54a5669` codeql-action 1c5b675 (#489 — content already in our tree via 3075f4a), `7fab758` hono 4.13.8 (#488). Live `node:24-slim` tag = 0e0ff40 (2026-09-19) and ships libpcre2-8-0 10.42-1+deb12u1 — the in-image patch retires on absorb and Trivy HIGHs clear at the base.
- Upstream PR #481 (redacting logger) still OPEN — fast-follow trigger not active.
- Cycle-1 landed (3075f4a): container actionlint, codeql-action digest 1c5b675, `.github/dependabot.yml`, AGENTS.md Fro Bot note. First dependabot PR still pending (window ~2026-10-03).
- Staged payloads pending this cycle's commit gate: `ROADMAP.md` (restore+extend revision), `docs/ideation/2026-09-20-repository-extensions-ideation.md`, this file.

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
|-----|--------|-------|--------|----------|-----------|-------|----------|
| rm-100b fro-bot.yaml secrets-if → job-env gate | 5 | 5 | 4 | 5 | 4 | 23 | PASS — batch #1 |
| rm-100c CodeQL deps-install (posture b) | 5 | 4 | 4 | 5 | 5 | 23 | PASS — batch #2 |
| rm-111 upstream absorb (0e0ff40 + hono 4.13.8 + retire patch) | 5 | 3 | 3 | 4 | 5 | 20 | PASS — batch #3 |
| rm-110 checkSuites first:100 + fixture | 3 | 4 | 4 | 5 | 3 | 19 | PASS — batch #4 (held in cycle 1 for file-scope only; addendum named it first candidate) |
| rm-113 CI pin hygiene (setup-node v7, checkout unify) | 3 | 3 | 5 | 5 | 3 | 19 | PASS — batch #5 (same workflow files the batch already touches) |
| rm-112 aggregator degradation/staleness semantics | 4 | 3 | 2 | 5 | 4 | 18 | HOLD — needs plan phase (server semantics + UI surface); bigger than remaining cycle budget |
| rm-105 SBOM + provenance | 4 | 2 | 3 | 4 | 4 | 17 | HOLD — Release pipeline; land on the green base this batch creates |
| rm-114 SSE parser single-sourcing | 3 | 3 | 3 | 5 | 3 | 17 | HOLD — gateway + browser bundle; next cycle |
| rm-103 absorb-cadence workflow | 4 | 2 | 3 | 2 | 4 | 15 | HOLD — depends on green CI (G1); next cycle by design |
| rm-107 operator status panel | 3 | 2 | 2 | 4 | 4 | 15 | HOLD — needs plan phase |
| rm-115 ack CSRF tokens | 2 | 2 | 3 | 5 | 3 | 15 | HOLD — low severity hardening |
| rm-106 listener digest push | 3 | 2 | 2 | 3 | 4 | 14 | HOLD — plan + upstream #238 policy |
| rm-104 render hardening | 4 | 5 | 2 | 2 | 4 | 17 | HOLD — generator lives fleet-side (`/work/projects/hermes-roadmap`); advisory issue, not in-repo |
| rm-102 dependabot first-PR proof | — | — | — | — | — | — | Waiting item (~2026-10-03); verification-only, no implement slot |
| rm-108 major-upgrade matrix | — | — | — | — | — | — | Policy refresh satisfied by the roadmap phase this cycle; no batch slot |

## Gates and adjudications

- **G1 in-repo controllable** — rm-104 fails (fleet repo); rm-103 needs green CI first (defeats itself). rm-111's Trivy proof needs a Release run but the change is fully in-repo — passes with an honest-status caveat.
- **G2 bounded effort** — the CodeQL fix is bounded by the proven run-333ad19e diagnosis (pnpm install --frozen-lockfile before codeql-init, runs-on unchanged per PR #1 policy); no runner-env deep investigation inside this cycle (A1 precedent).
- **G3 verifiable in-cycle** — Main/CodeQL conclusions at the pushed sha; Release Trivy zero-HIGH; `pnpm test` 3018 (rm-110's +1); actionlint container exit 0.
- **G4 coherent theme** — "make origin/main green at every required gate and converge the base with upstream". rm-112/106/107 (features) and rm-105 (Release feature-work) break the theme.
- **G5 no prohibited-phase work** — this turn performs no commit/push/pr/ci; selection only.
- **A1 (CodeQL honest status):** if Analyze stays red after the deps-install step, report per fleet rule #3381 — shipped+locally-proven with outcome pending is not "failed" — and defer; do not chase unbounded runner-env work.
- **A2 (rm-111 ordering):** absorb upstream FIRST (clean merge on untouched files), then apply fork-side workflow edits on top; preserves fork exclusions (#3206) and avoids conflict noise. If the merge touches codeql.yaml, the fork's deps-install edit reapplies after.
- **A3 (Trivy contingency):** if HIGHs persist after 0e0ff40, verify the pinned digest actually ships the rebuilt libpcre2 (`docker run --rm node@<digest> dpkg -s libpcre2-8-0`) before anything else; if the rebuild is not real, KEEP the in-image patch (do not unpin to a stale digest) and record honest status.
- **A4 (lint rider):** the ROADMAP.md lint fix is already satisfied in-revision (roadmap phase); Main Lint green arrives free with landing — no batch slot spent.
- **A5 (runner serialization):** single self-hosted runner — proof runs queue; cancel stale queued Main runs before observing a fresh target (#3391) and expect Release 7–31 min behind Main.

## Selected batch — restore-gates v2 + upstream convergence (5 items + docs rider)

Order matters; single runner serializes everything (#3264):

1. **rm-111 — upstream absorb.** Merge the 4-commit drift (net-new: node 0e0ff40 pins, hono 4.13.8; codeql-action digest no-op vs our tree) resolving fork exclusions: no write code path, stricter read-only doc wording (#3206), and re-point 4aa5d07's metadata-source rename stays ours. Remove the in-image libpcre2 patch (Dockerfile:37-46) now that the base ships 10.42-1+deb12u1. Files: Dockerfile, package.json, pnpm-lock.yaml, upstream-touched docs.
2. **rm-100b — fro-bot.yaml job-env gate.** Replace the step-level `secrets` reference at fro-bot.yaml:266 with the job-level env pattern (`env.HAS_TOKEN == 'true'`, mirroring release.yaml's HAS_RELEASE_APP contract). Files: `.github/workflows/fro-bot.yaml`.
3. **rm-100c — CodeQL deps-install.** Add `corepack enable && pnpm install --frozen-lockfile` before codeql-init in codeql.yaml; runs-on stays self-hosted (PR #1 policy). Files: `.github/workflows/codeql.yaml`.
4. **rm-110 — checkSuites first:100 + >10-suite fixture.** Re-land the proven run-333ad19e diagnosis (aggregator.ts:137 `first: 10` → `first: 100`; new fixture test). Files: src/github/aggregator.ts, test/aggregator.test.ts.
5. **rm-113 — pin hygiene.** setup-node v6 → v7.0.0; unify dual checkout pins to v7.0.1. Files: .github/workflows/*.yaml.
6. **Docs rider (no selection weight):** ROADMAP.md revision + ideation doc + this batch doc ride the cycle's commit gate; expected side effect: Main Lint green at the pushed sha.

**Degrade order** if cycle budget tightens: drop #5 → drop #4 → #1+#2+#3 must land (they are the point: green gates). **Contingency:** see A1–A3; actionlint container validation (`docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color`) gates all workflow edits before landing (convention #3273, #4265).

## Non-goals this batch

No operator-facing features (rm-106/rm-107/rm-112), no Release-pipeline feature work (rm-105), no absorb-automation design (rm-103), no vendored-path work (superseded rm-001/rm-002), no CodeQL runner-env deep investigation beyond the bounded deps-install step (A1), no SSE/parser refactor (rm-114), no CSRF hardening (rm-115), no majors (rm-108 matrix governs those by dated triggers).

## Next-cycle heads

rm-112 (aggregator degradation semantics — plan first), rm-103 (absorb cadence, now on a green base), rm-105 (SBOM+provenance), rm-114 (SSE single-sourcing), rm-106/rm-107 (plan phase), rm-115 (hardening micro-batch), rm-104 (fleet-side hermes-roadmap issue), rm-102 verification (~2026-10-03).

## Cycle-2 outcome addendum (2026-09-20, run 270220e7, compound-phase — pre-review)

Status at the compound phase, using pre-review cycle evidence only. Review, push, and
CI outcomes are deliberately NOT claimed here; the next cycle's assessment verifies
them against origin/main.

Implemented in the run-270220e7 worktree (base 2f3a884, working tree, unpushed):

- rm-111 — Dockerfile pins 2fe369e → 0e0ff40 (all three), in-image libpcre2 patch
  retired with a note; hono 4.13.8 content-merged into the lockfile (raw upstream diff
  did not apply; hand-merge, recipe now documented — see lessons); codeql-action digest
  confirmed already-current in our tree (no-op).
- rm-100b — fro-bot.yaml gate rewritten to job-level env `HAS_FRO_BOT_PAT` + per-step
  `if:` + warn-and-skip step, mirroring release.yaml's proven contract. Real actionlint
  error captured before the fix (job-level `if:` may reference only
  github/inputs/needs/vars).
- rm-100c — codeql.yaml Setup composite step (`./.github/actions/setup` →
  `pnpm install --frozen-lockfile`) inserted before codeql-init; runs-on stays
  self-hosted (PR #1 policy).
- rm-110 — `checkSuites(first: 100)` in BOTH query variants (aggregator.ts:137, :174)
  + 12-suite fixture asserting the cross-suite sum and the emitted query string.
- rm-113 — all 10 checkout pins unified to v7.0.1 (repo-wide single digest);
  setup-node v6 → v7.0.0 at three sites including the `.github/actions/setup`
  composite (a pin surface beyond this doc's original inventory).
- Docs rider — restored+extended ROADMAP.md, ideation doc, this batch doc.

Local gates at the final implement tree, all exit 0: `pnpm install --frozen-lockfile`
(+hono 4.13.8), container actionlint on all workflows, `pnpm lint`, `pnpm check-types`,
`pnpm test` = 1998 server + 1020 web = 3018/3018 (+1 = the rm-110 fixture). Targeted
validation (separate phase): aggregator suite 51/51, actionlint on the four changed
workflows, full suite re-run; fingerprint proved zero executable-surface drift during
validation. Engine validation digest declared:
`validation:v1:b1332d8d7c24d0e79df2f2cb2d53702053b2a5790de8d4946b26b9bd6b7fabda`.

Still open (next phases/cycle): Main lint+Check Workflows, CodeQL Analyze, and Release
Trivy zero-HIGH proofs at the pushed sha (ci phase); rm-102 dependabot first-PR window
(~2026-10-03); rm-104 fleet-side generator fix.

Lessons compounded into docs/solutions (this phase):

- `docs/solutions/workflow-issues/fleet-roadmap-render-clobber-recovery-2026-09-20.md`
  — twice-observed render hazard + the `git show <render>^:ROADMAP.md` recovery recipe.
- `docs/solutions/workflow-issues/upstream-lockfile-content-merge-2026-09-20.md` —
  why raw lockfile diffs fail on a diverged fork, the five mirroring sections a bump
  touches, and why `--frozen-lockfile` is the only trustworthy proof.

Next-cycle heads (carried forward, refreshed): rm-112 (aggregator degradation
semantics — plan first), rm-103 (absorb cadence on a green base), rm-105 (SBOM +
provenance), rm-114 (SSE single-sourcing), rm-115 (ack CSRF hardening), rm-104
(fleet-side hermes-roadmap fix), rm-102 verification ~2026-10-03. Major-drift windows
from research to watch: TypeScript 7.0.2 (native, side-by-side with 6.x), Vitest 5,
Node 26 LTS entry 2026-10, jsdom 30 — governed by rm-108's dated triggers, not ad-hoc.
