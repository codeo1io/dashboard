---
module: dashboard
tags: ['prioritization', 'cycle-3', 'repository-maintenance']
problem_type: batch-selection
---

# repository-maintenance cycle:3 batch — run df0dd46d97a1

## Run context

- requirement: repository-maintenance:35f60ac9d96a4f37a6fa28398abeaf07:cycle:3:/work/projects/dashboard
- run: df0dd46d97a14da3a18e23db71224fb0 (prioritize attempt d9c528df93c446d0944f76030917593f)
- base: 559642a (2026-10-08 dispatch base; origin/main tip 7055c52 as of this phase)
- worktree: /home/agent/.hermes/conductor-worktrees/dashboard-864ca327c8/run-df0dd46d97a1-df0dd46d
- ledger at selection: 238 defs / 0 dups / max rm-787 (this run's roadmap phase minted rm-787; census comment of record at ROADMAP.md :2038, dated 2026-10-09)

## Prior evidence consumed (not re-derived)

1. Assessment (attempt 0df3986c): repo-wide adversarial read at 559642a. Headline: cve-tripwire.yaml:35 NODE_IMAGE literal 'node:24-slim' vs Dockerfile:21 'node:24-trixie-slim@sha256:173f1258…' — resolve grep matches nothing (exit 1, reproduced), first scheduled fire Mon 2026-10-12 06:53Z would red; zero recorded runs ever; no test/script references the workflow (coupling-guard gap). No regressions found in the server core, redaction path, or action pins.
2. Research (attempt 620a374e): upstream window 24 commits (merge-base c1f760e, tip 6821788); registry/release latests; Docker Hub digest triple parity (live == pinned == upstream); open-PR claim map (#447 rm-760 lane: eslint 10.12.0/vite 8.3.3 + upload-artifact v7.0.2/setup-node v7.1.0; #448 operator-contract 1.8.0); lockfile floors satisfied; katex 0.19.0 not needed.
3. Roadmap (attempt 265ae62b): minted rm-787 (CI scanner currency) above all-lineage ceiling rm-786; riders on rm-103 (upstream census), rm-157 (agent tip), rm-648 (Monday-red re-derivation + claim map).

## Selection rationale (impact / risk / effort / dependencies / strategic value)

Candidate field surveyed: open/candidate defs ranked by ledger priority (rm-104 98.0, rm-279 96.0, rm-103 85.0, rm-252 80.0, rm-282 74.0, rm-249 71.0, rm-157 72.0, …) plus this run's fresh candidates C1–C7. Disposition of the top alternatives:

- rm-104 (98.0, fleet-render defect prediction) and rm-249 (71.0, push receive path): multi-cycle standing themes, not completable end-to-end this cycle.
- rm-279 (96.0, Main Lint job cancelled at the timeout-minutes ceiling): highest-value standing item, but lives in .github/workflows/main.yaml whose upload-artifact/setup-node sites are claimed by open PR #447 (rm-760) — file-level overlap with an unlanded sibling lane makes it the wrong cycle for it.
- rm-103 (85.0, upstream drift window): standing absorbing item; its absorbable remainder IS this batch's scope (see below) plus the agent pin, which has no def and serves only a disabled workflow.
- Tripwire literal fix (research C1): def-claimed five times (rm-755 x2 on 89ebbf49 e98f974a and 9fd8bcad 0753e587, rm-779 cbe70604, rm-782 33b30ba2, rm-784 0cde5807) and additionally cured in-batch by the 8521c80a lane on 2026-10-08 (rider at that ledger's :1853: 'CURED in-batch — cve-tripwire.yaml:35 NODE_IMAGE -> node:24-trixie-slim'). Not ours to build; monitored via rm-648's claim map.
- codeql-action re-pin 2892aa5e -> 24c54180 (research C3 / rm-787's second arm): CLAIMED — selected into sibling ab16a466's cycle:2 batch TODAY (selection rider at that ledger's :1194, prioritize attempt 2be69a50) and already landed upstream via 8521c80a's CI-absorb landing (fro-bot/dashboard #589, commit 6821788 lineage). Ceded; see rm-787's selection rider.
- eslint 10.12.0 / vite 8.3.3 / upload-artifact v7.0.2 / setup-node v7.1.0: claimed, open PR #447 (rm-760).
- vite-plugin-pwa 2.0.0 / @vitejs/plugin-react major: rm-757 / rm-764 (other lanes); deferred window item regardless.
- Coupling-guard test (research C2): inside 0cde5807's rm-784 scope. Excluded.

### Selected: rm-787, trivy binary arm ONLY — 'CI scanner currency: trivy binary 0.72.0 -> 0.75.0, mirrored pair'

Why this is the highest-value coherent completable batch:

- Unclaimed, deliberately: all three touching sibling lanes explicitly left it open — 8521c80a's rider: 'trivy action pin stays v0.36.0 — no bump (trivy binary bump v0.72.0->v0.75.0 remains open, riding the standing absorb window rm-103)'; ab16a466's selection rider: 'the remaining trivy binary bump … carry as noted candidates for the next absorb'; c37a8576's sweep rider freezes without it. This batch IS the next absorb.
- Deadline-coupled: the Monday 2026-10-12 06:53Z first-ever cve-tripwire fire will exercise whatever binary is pinned. Three minors of scanner+DB fixes (published 2026-10-01) land BEFORE the gate's first observation instead of after it.
- Trivial, atomic, verifiable: exactly two mirrored pin sites (cve-tripwire.yaml trivy-action version input; release.yaml Enforce-stage args), one change, actionlint + registry-probe verification, no ignore-list semantics.
- Strategic: keeps the mirrored-pair invariant (a split pin re-creates the scanner parity gap the ignore-unfixed freeze guards) and establishes scanner-currency as a standing absorb discipline on the newest security layer.

## Batch scope (exact)

1. rm-787 (trivy arm): raise the trivy binary pin v0.72.0 -> v0.75.0 at BOTH mirrored sites in one change: `.github/workflows/cve-tripwire.yaml` (trivy-action `version:` input) and `.github/workflows/release.yaml` (Enforce-stage trivy args). Codeql-action arm is OUT of this batch (ceded; recorded on the def).
2. No other files. No ROADMAP content beyond the selection marker + riders recorded by this phase.

## Out of scope (recorded, with owner/status)

- cve-tripwire NODE_IMAGE literal: five def claims + 8521c80a's in-batch cure (rm-648 tracks acceptance).
- codeql-action digest: ab16a466's selected cycle:2 batch; upstream already at 24c54180.
- eslint/vite/action re-pins: open PR #447 (rm-760).
- agent pin v0.118.2, operator-contract 1.8.0: PR #448 lane / rm-157 rider datum; no def change.
- pwa/plugin-react majors: rm-757/rm-764; deferred window.
- Coupling-guard test: rm-784's scope (0cde5807).

## Delivery contract

1. Implement from this worktree at the batch base; branch `batch/df0dd46d97a1` if the engine requests a branch.
2. Staged scope must equal the two workflow files' pin lines (plus ROADMAP selection/markers already recorded) — nothing else rides.
3. The ROADMAP census comment of record stays this run's (2026-10-09, 238/0/787) unless a mint happens (none planned); the guard pin stays 787.
4. Landing merge message follows house convention: `merge: autonomously integrate run df0dd46d97a1 (cycle:3 batch 'CI scanner currency: trivy binary 0.75.0 mirrored pair')`.
5. Post-landing flips: rm-787 def-line `status: implemented YYYY-MM-DD (run df0dd46d97a1 … implement <attempt8> …)` plus completion rider; census comment refresh rides the landing per house convention.
6. Acceptance for rm-787's trivy arm: both sites show v0.75.0; actionlint clean; a same-day registry probe (api.github.com aquasecurity/trivy latest = v0.75.0) recorded in the implementation notes; the first tripwire fire's scan banner shows trivy 0.75.0 (post-landing observable, not a blocker for landing).
7. Risk class: low — two-line pin bump in CI definitions, no runtime surface, no ignore-list changes.
