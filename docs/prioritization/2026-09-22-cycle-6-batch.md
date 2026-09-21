---
date: 2026-09-22
topic: dashboard maintenance cycle 6 — scoring and batch selection (post-92688a2)
mode: delegated-conductor
run: 2ae7d10a68d04c1b88e536e280a4e405
phase: prioritize
attempt: 7516d5c000ad41e690eff43ca5a5dc34
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent cycles 1-3 and 5 used ce-plan identically). Deviations declared: no subagent surface in this session, frames run in-process and disclosed (convention #3768). Label disclosure per #4323: the engine cycle label is 1; the repo lineage has consumed cycle 1 (cf5527c1), cycle 2 plus its batch-2 re-scope (916783f), cycle 3 (7de0de3), and cycle 5 (493b82f lineage) — cycle 4 is STRANDED in open PR #9 — so this is lineage cycle 6 and the artifact is named accordingly.
---

# Dashboard maintenance — cycle 6 batch (2026-09-22)

## Live frame facts (re-measured this phase, not carried stale)

- `origin/main` = `92688a2` (2026-09-21T21:33Z, upstream absorb merge) — unchanged since the assess phase; `git rev-list --count origin/main..autonomy-upstream/main` = 0, upstream fully absorbed.
- PR #9 re-probed live: state OPEN, head `f8ff412`, `mergeable: CONFLICTING` (the expected four-file conflict set confirmed). Payload is SIXTEEN files — materially larger than the assess headline recorded: `.github/workflows/base-drift.yaml` (new), `.github/renovate.json5` (removed), `src/github/aggregator.ts` + `test/aggregator.test.ts` (the rm-126 drift-identity implementation, not just its lock test), `pnpm-workspace.yaml` (minimumReleaseAge: 1440), README badge + endpoints, plus five docs/solutions files, the cycle-4 batch doc, and the research artifact — all absent from main (`git log --all -- .github/workflows/base-drift.yaml` → f8ff412 only).
- Base-digest drift is LIVE and unchanged since 2026-09-21T21:35Z: Dockerfile pins `sha256:0e0ff40c…` (verified again at origin/main this phase) while `docker manifest inspect node:24-slim` returns `sha256:5cbc7cab…` — a rebuilt, security-fixed base is shipping that main's pin silently trails, with no detector on main and dependabot's docker window not opening until ~2026-10-03.
- Tip CI at 92688a2 (observed this phase): CodeQL success (14m14s), visual success, Scorecard success; Main QUEUED and Release in_progress behind it on the single serialized runner (#3264/#3391) — tip Main is unproven, not red; the queue wait itself is fresh rm-107/rm-119 evidence.
- Local gates at 92688a2 were fully green in this run's assess (lint 0, types 0, 3115/3115).
- Worktree state for the implement phase: base `d0d17fc` is 10 commits behind origin/main; ROADMAP.md is already at the 92688a2 version plus this run's uncommitted restructure (staged copy is the origin/main version from the checkout, worktree copy carries the edits).

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Merge stranded PR #9 payload (rm-135, subsumes rm-123) | 5 | 5 | 3 | 5 | 5 | 23 | SELECTED B1 (anchor) |
| fro-bot.yaml ownership truthing (rm-136, scope adjusted) | 3 | 3 | 5 | 5 | 3 | 19 | SELECTED B2 (rider) |
| visual.yaml pin alignment, pins only (rm-137 half) | 2 | 2 | 5 | 5 | 2 | 16 | SELECTED B3 (droppable last) |
| Status surface rm-107 + rm-119 (joint) | 3 | 3 | 2 | 5 | 4 | 17 | DEFER (feature track; queue evidence appended this cycle) |
| Aggregator degradation semantics (rm-112) | 4 | 3 | 2 | 5 | 3 | 17 | DEFER (medium feature; its 4th absorbed acceptance closes via B1's renovate.json5 removal) |
| Branch protection (rm-116) | 4 | 4 | 3 | 2 | 4 | 17 | DEFER (third red-landing instance closed at 493b82f; ops/API decision — stewardship) |
| Drift-identity remainder (rm-126 post-B1) | 3 | 3 | 2 | 5 | 3 | 16 | PARTIAL via B1; remainder DEFER (consumer decision for /api/monitoring) |
| Gateway pair rm-127 + rm-129 | 3 | 3 | 3 | 5 | 3 | 17 | DEFER (topology decision pair) |
| SBOM + provenance (rm-105) | 4 | 2 | 2 | 4 | 4 | 16 | DEFER (Release churn; needs live Release proof) |
| Majors matrix (rm-108) | 3 | 2 | 4 | 5 | 2 | 16 | DEFER (TS7 hard-gated by typescript-eslint peer; rm-139/rm-140 split out) |
| Security panel (rm-117) / scoped tokens (rm-118) / gateway watch (rm-120) | 3 | 2 | 2 | 4 | 4 | 15 | DEFER (feature track) |
| SSE single-source (rm-114) / CSRF ack (rm-115) / PWA vestige (rm-138) | 2 | 2 | 3 | 5 | 3 | 15 | DEFER (hardening; rm-138 recommendation recorded below) |
| Listener digest push (rm-106) | 4 | 3 | 1 | 2 | 3 | 13 | DEFER (unblocked by rm-125 landing; needs live delivery proof — strong next-cycle candidate) |
| Absorb cadence (rm-103) | 3 | 2 | 2 | 4 | 3 | 14 | DEFER (drift 0) |
| pnpm 12 (rm-140) / Node 26 (rm-139) | 2 | 1 | 3-4 | 5 | 3 | 14 | DEFER (time-gated / evaluation) |
| Dependabot first-PR proof (rm-102) | 3 | 1 | 3 | 1 | 3 | 11 | DEFER (external clock ~2026-10-03) |
| Render hardening (rm-104) | 3 | 2 | 2 | 1 | 3 | 11 | DEFER (generator external; recovery recipe landed 2026-09-20) |

Selection rule applied: one anchor + mechanical riders with zero file overlap against the anchor (fleet's proven shape, cycles 2/3/5). rm-135 dominates: it is simultaneously the only live-security-delta item (drift measured live twice), the unlock for three open items (rm-123 fully, rm-126's core semantics, rm-112's dead-config acceptance), and a recovery of already-green work (Main 35597011430 + CodeQL 35597013457 passed on its branch push). Both riders are small, locally verifiable, and touch files PR #9 does not (fro-bot.yaml; visual.yaml).

## Selected batch — "land the stranded truth batch + finish workflow/prompt truthing"

Three work units plus one standing sequencing rule. One landing; CI proof at the pushed sha (Main + CodeQL minimum).

### B1. Land the stranded cycle-4 payload (rm-135; subsumes rm-123; lands rm-126's core)

Apply PR #9's payload (head `f8ff412`, branch `conductor/run-5351fd4e039a`) onto `origin/main` `92688a2` — cherry-pick or merge, resolved per file:

- `ROADMAP.md` — main's restructured roadmap WINS WHOLESALE (this run's roadmap phase already reconciled numbering: landed rm-131/132/133 keep their landed meaning, and the stranded batch's roadmap additions are represented as rm-135); accept the branch's roadmap additions only where they name facts main's roadmap lacks, under new numbering.
- `.github/dependabot.yml` — keep main's 2f4d118 ignore block; re-apply the branch's intent on top (diff during implement; branch predates 2f4d118, so prefer main then add).
- `docs/solutions/workflow-issues/pwa-service-worker-*.md` and `web/vite.config.ts` — changed-in-both; reconcile by hand preferring main's current content, re-applying the branch's intent (workbox-drop context).
- Clean applies expected for the remaining twelve files (changed on the branch only), including `src/github/aggregator.ts` + `test/aggregator.test.ts` (rm-126 count-only drift semantics + lock test — main's post-absorb aggregator did not touch the branch's edit region per merge-tree).
- `pnpm-workspace.yaml`: `minimumReleaseAge: 1440` ADDED alongside main's existing Exclude list (not replacing it).
- `.github/renovate.json5`: branch deletes it — accept (closes rm-112's fourth absorbed acceptance; fro-bot.yaml claims retargeted in B2).

Sequencing rule for the implement phase: reset the worktree to `origin/main` `92688a2` FIRST (base is d0d17fc, 10 behind), carrying forward the uncommitted ROADMAP.md restructure, this batch doc, and `.conductor/` breadcrumbs; then apply B1–B3. Stage by explicit file list, never `git add -A` (#3256). Before CI observation, cancel any stale queued runs on the single runner (#3391).

- acceptance: PR #9 payload live on main (merge or verified-equivalent cherry-pick) with all four conflicts resolved per the rules above; base-drift.yaml passes the actionlint container gate and its first scheduled run logs pinned and live digests; minimumReleaseAge active with the Exclude list intact; README badges resolve against codeo1io/dashboard and the endpoints inventory names /privacy and the listener routes; renovate.json5 absent; suite green at the landing sha with the expected count bump from the branch's tests (3115 baseline; driftCount lock test plus branch aggregator tests); ROADMAP.md lint-clean after the reconciliation.
- evidence: `gh pr view 9 --json state,mergedAt`; `git log origin/main -- .github/workflows/base-drift.yaml`; actionlint container exit 0; `pnpm test` count; Main + CodeQL green at the pushed sha.

### B2. fro-bot.yaml dependency-ownership truthing (rm-136; scope adjusted)

Rewrite the maintenance prompt's ownership paragraph (fro-bot.yaml:128 "Renovate owns routine dependency and version bumps") to name dependabot as the fork's bump owner (weekly window, rm-102) with the major pins noted (rm-133). SCOPE NOTE resolved this phase: the branch's renovate.json5 deletion rides B1, so this rider touches fro-bot.yaml ONLY — no double-handling.

- acceptance: the paragraph names dependabot and the window; no remaining doc sentence claims Renovate owns bumps on this fork; actionlint container exit 0.
- evidence: fro-bot.yaml diff; repo grep for Renovate-ownership claims; actionlint container output.

### B3. visual.yaml pin alignment, pins only (rm-137 half; droppable last)

Align visual.yaml to the repo's sha-pin discipline — checkout at line 35 (v5.0.0-era commit pin) and the floating `upload-artifact@v4` tags at lines 61/69 move to the v7.0.1 commit pin family used by every other workflow. The npm minors (eslint 10.11.0, erasable-syntax-only 0.7.2, @types/node 24.13.6) are EXPLICITLY NOT in this batch — they ride the first dependabot window (~2026-10-03) per rm-137's own acceptance, and manual same-day adoption is riskier while minimumReleaseAge is (before B1) inactive.

- acceptance: `git grep -nE "checkout@|upload-artifact@"` shows one pin family across workflows; actionlint container exit 0; no package.json/pnpm-lock changes.
- evidence: grep output; actionlint container output; diff confined to visual.yaml.

## Deferred decisions pre-recorded

- rm-138 (PWA kill-switch vestige): recommendation recorded for a future cycle — STRIP the precache wiring (keep the injectManifest kill-switch minimum), because the cacheless SW is deliberate privacy posture and the current half-state generates a precache manifest nothing serves; final call stays with the implement cycle that picks it up.
- rm-126 remainder: after B1, the open question is only `/api/monitoring`'s consumer (wire into the rm-107/rm-119 status surface or delete with its tests) — decide at that feature track's plan time.

## Rider overlap and dependency notes

- B1 ↔ B2: PR #9 does not touch fro-bot.yaml — no overlap; B2's renovate.json5 half moved into B1.
- B1 ↔ B3: PR #9 does not touch visual.yaml — no overlap.
- B1 subsumption bookkeeping: on landing, rm-123 flips to completed citing B1 evidence; rm-126 gains a partial-landing note (core semantics landed; consumer decision open); rm-112's absorbed acceptance for renovate.json5 closes citing B1.
- This batch does not touch the read-only/security invariants; the fork-exclusion guard (rm-131) runs as part of the suite and is the standing absorb defense (#3206/#3210).
