# Maintenance cycle 1 batch — run 783256c777724996a5016df4752af76c

**Batch B1: restore gate sovereignty on the reconciled base.**
Selected by the prioritize phase (attempt `31a95f1d`); stewardship request
emitted by attempt `d096bcd6`; implemented by attempt `2f86e1b9` on branch
`conductor/run-783256c77772` in the run worktree. Roadmap mints landed with
this batch: **rm-993** (gates-green claim protocol — acceptance doc:
`docs/solutions/workflow-issues/gates-green-claim-protocol-2026-10-13.md`) and
**rm-994** (PR-stack census — first recorded census below); riders on rm-100
(gate-repair specifics), rm-252, rm-779, rm-139, rm-760.

## World-move during the run (recorded, not redone)

Between the stewardship and implement phases `origin/main` advanced
`f85fb7d → 6acea88` (d42b978 "chore(deps): update fro-bot/agent to v0.121.0"
(#612, landed) + 6acea88 upstream merge with a 1-file net diff). Reconcile
target U0 therefore became 6acea88. Verified on the new main: the three gate
defects (index.css:792 stray opener, runtime.ts gapEl, operator-stream.js const
order) and the 235-def ROADMAP were unchanged, so all units stood.

## Units and verification (per the rm-993 protocol; focused scope)

| Unit | Change | Verification |
|---|---|---|
| U0 | Adopted the 8-file `2d67bd5..6acea88` delta into the working tree (`git checkout origin/main -- …`): `test/operator-stream-core.test.ts` (649-line rewrite), `public/operator-stream.js`, `Dockerfile`, `.github/workflows/{fro-bot,scorecard}.yaml`, `test/{compute-release-tag,fork-exclusion-guard,prose-residue-guard}.test.ts` | `git diff origin/main -- <8 files>` empty after checkout (see `git diff --name-only` below) |
| U1 | `web/src/index.css:792` — deleted the stray `[data-role="run-output-coalesced"] {` opener | `pnpm build:web` RC=0 (tailwind+PWA plugins complete; was CssSyntaxError) |
| U2 | `web/src/operator/runtime.ts:378` — added `gapEl` to the `discoverCardStreamTargets` destructure (function returns it; the `:392` shorthand was the TS18004 + the 6 web-leg failures' single root cause) | `pnpm check-types` RC=0 (3 legs); `web/src/operator/runtime.test.ts` 58/58 (was 6F: initOperatorStream 0 calls) |
| U3 | `public/operator-stream.js` — hoisted `APPROVAL_FETCH_TIMEOUT_MS` (with its rm-594 doc comment, "above" dropped) above `buildApprovalClient` | `pnpm lint` RC=0 (4× no-use-before-define gone) |
| U4 | `ROADMAP.md` — applied spool patch `roadmap-delta-4ba96849.patch` (ext #45) | 237 defs / 0 dups / max rm-994; diff vs origin/main = the patch only |
| U5 | `docs/solutions/workflow-issues/gates-green-claim-protocol-2026-10-13.md` — new (rm-993 acceptance) | present |
| U6 | `AGENTS.md:94` — Fro Bot state line re-verified live 2026-10-13: workflow `active`, repo secrets list EMPTY, Actions dark since 2026-10-09 (newest run 2026-10-09T01:59:31Z) | `gh api …/actions/workflows`, `…/actions/secrets`, `…/actions/runs?per_page=1` |
| U7 | This document (batch doc + census) | present |

Focused gate sweep (implement-phase budget; repo-wide sweep reserved for the
validation gate): `pnpm check-types` RC=0 · `pnpm lint` RC=0 · `pnpm
build:web` RC=0 · `test/operator-stream-core.test.ts` 793/793 (was
transform-failed at dispatch base) · `web/src/operator/runtime.test.ts` 58/58
(was 6F). Run on host node v22.22.0 (engine `>=24` warns, non-fatal — the
provenance item tracked as the fleet's gate-verdict runtime finding).

## rm-994 census — open PR stack (re-verified 2026-10-13, 10 rows)

| PR | opened | class | disposition |
|---|---|---|---|
| #624 | 2026-10-12T18:48:21Z | CI-validation stub (conductor/ci-de4000ffb906) | keep — owning run may be active |
| #622 | 2026-10-12T18:23:28Z | CI-validation stub (conductor/ci-44745038cf95) | keep |
| #621 | 2026-10-12T17:02:51Z | CI-validation stub (conductor/ci-f6c3126d4952) | keep |
| #620 | 2026-10-12T15:05:48Z | CI-validation stub (conductor/ci-e9a6f41aa1b0) | keep |
| #618 | 2026-10-12T11:02:36Z | outage-response batch on STALE base `conductor/ci-base-08e286effa04`; +cve-tripwire.yaml/+lockfile-guard.yaml (not on main); ROADMAP riders + rm-779 rework | do NOT merge as-is — content-bind at owning lane's integrate |
| #533 | 2026-10-10T02:59:53Z | stale CI-validation stub | close-by-content after its batch lands |
| #521 | 2026-10-10T01:18:57Z | stale CI-validation stub | close-by-content after its batch lands |
| #518 | 2026-10-09T23:25:46Z | maintenance batch (rm-802/803) predating the union | content-bind; riders superseded by landed render |
| #509 | 2026-10-09T22:52:16Z | maintenance batch (rm-137/760) | content-bind; digest sites superseded by main |
| #508 | 2026-10-09T22:15:22Z | maintenance batch (rm-838/840/841) | content-bind |

Landing rule (rm-994): while Actions is dark, nothing from the stack lands
without a recorded census + a clean-tree gate sweep on the rebased result;
on recovery (dispatch not-422 / any run newer than 2026-10-09T01:59:31Z / a
check-run on a conductor PR), land in base-recency order after re-validation.

## Deliberately excluded

- `Dockerfile:16` digest repair — owned by unlanded ext #39/#41 rm-979..985
  bands; content-binds at their integrate (must_remain_separate guard).
- Agent/contract adoption (rm-966-class) — precondition is green gates; next
  cycle. Note main already carries v0.121.0 in fro-bot.yaml since d42b978.
- pnpm-12 / TS-7 / vitest-5 majors — rm-139 calendar riders.
