---
date: 2026-09-19
topic: dashboard maintenance cycle 1 — scoring and batch selection
mode: delegated-conductor
run: cf5527c113994eb088ec95caebbcfdda
phase: prioritize
attempt: a829541aea8e467a9b5625956b5fd1f3
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent hermes-infra cycle-16). Plan-writing deferred to later phases. Deviations declared: no subagent surface in this session, research/flow frames run in-process and disclosed (convention #3768); interactive gates replaced by autonomous adjudication per work order.
---

# Dashboard maintenance — cycle 1 batch (2026-09-19)

## Live frame facts (re-measured this cycle, not carried stale)

- Fork tip `0bc9a32` == `origin/main` (confirmed 2026-09-19T02:4xZ; `git ls-remote origin main`).
- Main workflow still red at `0bc9a32` (run 35413084207, Lint + Check Workflows) and CodeQL Analyze still red (run 35413084216); last green Main at `3c5adad` (2026-09-15T01:44Z). Scorecard and Release green at `0bc9a32`.
- Lint sub-failure already resolved in-revision: ROADMAP.md rewritten (roadmap phase, this run); `pnpm lint` exit 0 repo-wide. Landing it turns Main's Lint job green at the pushed sha.
- Upstream `autonomy-upstream/main` still 2 commits ahead: `7fab758` (hono 4.13.8) + `54a5669` (codeql-action digest `1c5b675`, a pure 4-line swap across codeql.yaml/release.yaml/scorecard.yaml — verified via `git show`).
- Upstream PR #481 (redacting logger) still OPEN — fast-follow trigger not active.
- Runner: single self-hosted `agent-runner-dashboard` (Linux X64) online; Docker proven on it (release.yaml smoke tests run `docker run` there) — container actionlint is feasible.
- Staged payloads pending the cycle's commit/push gate: `ROADMAP.md` (rewrite), `docs/ideation/2026-09-19-repository-extensions-ideation.md`.
- No prior batch for this repo/maintenance stream (cycle 1; `docs/prioritization/` did not exist).

## Supersession (from roadmap phase)

- `rm-001` (complexity refactor) and `rm-002` (test coverage): superseded — all 21 flagged paths each are vendored `.agents/skills/impeccable/**`; pytest/ast acceptance evidence is impossible in this stack. Preserved verbatim-intent under ROADMAP.md "Superseded items". No other revocations.

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
|-----|--------|-------|--------|----------|-----------|-------|----------|
| rm-100a actionlint container form | 5 | 4 | 4 | 4 | 5 | 22 | PASS — batch #1 |
| rm-102 land dependabot.yml | 4 | 4 | 5 | 5 | 4 | 22 | PASS — batch #3 |
| rm-100b codeql-action digest swap | 4 | 3 | 5 | 3 | 5 | 20 | PASS — rider, honest-status caveat |
| rm-109 fro-bot disable-state ops doc | 3 | 3 | 5 | 5 | 3 | 19 | PASS — batch #4 |
| rm-104 roadmap render hardening | 4 | 5 | 2 | 2 | 4 | 17 | HOLD — generator lives in `/work/projects/hermes-roadmap` (out-of-repo) |
| rm-110 aggregator checkSuites pagination | 3 | 2 | 4 | 5 | 3 | 17 | PASS-score, HELD off-batch — not on batch files |
| rm-105 SBOM + provenance | 4 | 2 | 3 | 4 | 4 | 17 | HOLD — Release pipeline; better on a green base, next cycle |
| rm-107 operator system-status panel | 3 | 2 | 2 | 4 | 4 | 15 | HOLD — needs plan phase |
| rm-103 upstream-absorb cadence workflow | 4 | 2 | 3 | 2 | 4 | 15 | HOLD — depends on green CI first (G1) |
| rm-106 listener digest push | 3 | 2 | 2 | 3 | 4 | 14 | HOLD — needs plan + upstream #238 policy |
| rm-108 major-upgrade watchlist | — | — | — | — | — | — | Policy only; roadmap entry is the deliverable, refresh is next-cycle docs act |

## Gates and adjudications

- **G1 in-repo controllable** — no landing dependency outside this repo's commit/push gate. rm-104 fails (different repo); rm-103 depends on CI green (defeats its own purpose this cycle).
- **G2 bounded effort** — no open-ended investigation. The CodeQL *runner-env deep fix* fails G2 (unbounded); the digest *swap* passes (4 lines, cherry-pickable from `54a5669`).
- **G3 verifiable in-cycle** — outcome checkable at the pushed sha (`gh run list/view --workflow main.yaml|codeql.yaml`) or locally (`pnpm lint`, `pnpm test`).
- **G4 coherent theme** — "make the gates green and keep them green" (reliability restoration). Feature work (rm-106/107) and Release changes (rm-105) break the theme.
- **G5 no prohibited-phase work** — this turn performs no commit/push/pr/ci; selection only.
- **A1 (rm-100b as rider):** digest swap only; if CodeQL stays red after it, report root cause honestly per the #3381 precedent (shipped+re-validated vs pending outcome) and defer runner-env work — do not chase unbounded investigation inside this cycle.
- **A2 (rm-110 held):** PASS-score but excluded — touches `src/github/aggregator.ts` + its tests, files the batch otherwise never touches; next-cycle head (fleet precedent: riders restricted to files the batch already touches).
- **A3 (rm-104 mitigation):** the clobber risk is real (highest Delay score) but the generator is fleet-side; mitigation is landing the roadmap diff in this cycle's commit gate before any new render, plus an advisory note in the PhaseResult for a future hermes-roadmap issue.
- **A4 (lint non-item):** the ROADMAP.md lint fix is already satisfied in-revision; the batch does not re-do it. Main Lint green arrives free with landing.

## Selected batch — restore-gates batch (4 items + landing rider)

Order matters; single runner serializes everything (#3264):

1. **rm-100a — Check Workflows green via container actionlint.** Replace the `raven-actions/actionlint@3d39aea` step (needs pipx the runner lacks) with the docker `rhysd/actionlint` form; repo-validated invocation exists (`docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -no-color`, convention #3273/#3274). Files: `.github/workflows/main.yaml`. Fallback if image pull fails: actionlint binary installer in-step.
2. **rm-100b rider — codeql-action digest swap.** Apply `54a5669`'s 4-line digest change (`b96794f` → `1c5b675`) to codeql.yaml/release.yaml/scorecard.yaml (cherry-pick or hand-apply; do NOT take the hono commit). Files: 3 workflow yamls.
3. **rm-102 — land `.github/dependabot.yml`.** Grouped updates, npm + docker + actions ecosystems, weekly cadence (serialized runner — grouped = one queue occupant). Prior cycle's identical fix never landed (root-caused in assess); this cycle's commit gate carries it. Files: `.github/dependabot.yml`.
4. **rm-109 — fro-bot disable-state ops doc.** Document the `disabled_manually` state + re-enable consequence (missing `FRO_BOT_PAT` → failing cron) in AGENTS.md ops notes or `docs/solutions/` per convention. Files: docs only.
5. **Landing rider (no selection weight):** ROADMAP.md rewrite + ideation doc ride the cycle's commit/push gate; expected side effect: Main Lint green at pushed sha.

**Degrade order** if cycle budget tightens: drop #4 → drop #3 → #1+#2 must land (they are the point of the batch).

**Contingency:** if container actionlint cannot run on the runner, fall back to in-step pipx bootstrap (`python -m pip install --user pipx && pipx ensurepath`) only if python exists on the runner; else actionlint curl-installer pinning v2.2.0. If dependabot validation is wanted pre-landing, `dependabot config -f` dry-run or GitHub's API acceptance is the check (not a prohibited CI activity — validation only).

## Non-goals this batch

No operator-facing features (rm-106/rm-107), no Release-pipeline changes (rm-105), no upstream-automation design (rm-103), no vendored-path work (superseded rm-001/rm-002), no CodeQL runner-env deep investigation beyond the digest swap (A1), no workbox/PWA changes.

## Next-cycle heads

rm-110 (aggregator checkSuites pagination — first candidate), rm-103 (once CI green), rm-105, rm-104 (hermes-roadmap repo), plan-phase entries rm-106/rm-107.

## Cycle 1 outcome addendum (2026-09-19, run cf5527c1, compound phase)

Written pre-review/pre-landing from cycle evidence only; review and shipping outcomes are
NOT reflected here — cycle 2's assessment carries them.

- **Implemented (staged in run worktree, uncommitted at time of write):** rm-100a
  (main.yaml actionlint → `rhysd/actionlint:1.7.12` container; tag correction — the
  image line has no v2 tags, `v2.2.0` was the raven wrapper's version), rm-100b
  (4/4 codeql-action digests → 1c5b675), rm-102 (`dependabot.yml`, 3 ecosystems
  grouped), rm-109 (AGENTS.md fro-bot disable-state note). Rider docs: ROADMAP.md
  rewrite + ideation doc + this file.
- **Proven locally:** `pnpm lint` exit 0; 3017/3017 tests (1997 server + 1020 web);
  actionlint container exit 0 on all workflows. **Not yet proven:** any CI outcome at
  a pushed sha — landing gate follows.
- **Cycle 2 entry candidates (this batch's held items):** rm-110 first (PASS-score,
  held only for file-scope), then rm-103 once Main is green, rm-105 (SBOM+provenance),
  rm-106/rm-107 need a plan phase, rm-104 lives in /work/projects/hermes-roadmap
  (fleet-side; file an advisory issue there).
- **Carry-forward facts:** (a) CodeQL digest swap may not clear the fork-runner
  autobuild failure (`package.json: Main file not found`, CLI 2.27.0) — report
  honestly per fleet rule #3381, deep fix is unbounded; (b) upstream PR #481
  (redacting logger) still OPEN — fast-follow trigger on next upstream absorb;
  (c) digest-pin the actionlint container tag (1.7.12) by hand next cycle — dependabot's docker/github-actions ecosystems cannot touch `docker run` image refs inside workflow `run:` blocks, so the tag stays hand-pinned (the batch's one execution surface pinned only by tag; repo convention pins Actions by SHA); (d) the
  engine's `npm test -- --runInBand` template is unrunnable on Vitest 4 (cac rejects
  jest flags) — `pnpm test` is the canonical gate; (e) verify landing before
  crediting (docs/solutions/best-practices/verify-fix-landed-before-crediting-cycle-2026-09-19.md).
- **Rejection ledger** (from research phase, do not re-derive): saved-views (weak
  grounding), snapshot-history brainstorm-first, multi-operator subject-replacement,
  CI fixes (already this batch — no double-count).
