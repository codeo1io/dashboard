---
title: 'Repository maintenance cycle:2 batch — pre-Monday tripwire parity + stalled detailsUrl re-author'
module: `ROADMAP`
tags: [`prioritize`, `selection`, `cycle-2`, `run-32f33f1b`]
problem_type: `batch-selection`
---

Selector: prioritize attempt `3de7b9a293f64b4aa7b2c21f7b309187`,
repository-maintenance cycle:2, base `559642a` (== origin/main fetched at
phase open; worktree carries this run's uncommitted roadmap patch from the
roadmap phase). Inputs consumed: assess `aaa27ee0`, research `d6122126`,
roadmap `46236a9e` (census 238 defs / 0 dups / max rm-781).

## Selected batch

**'pre-Monday tripwire parity + stalled detailsUrl re-author'** — anchor def
`rm-781` (flipped candidate → open, priority 24.0 → 70.0), two units:

### U1 — cve-tripwire NODE_IMAGE parity cure + first parity guard

- **Why now**: `cve-tripwire.yaml:35` ships `NODE_IMAGE: 'node:24-slim'`
  against the Dockerfile ARG `node:24-trixie-slim@sha256:173f1258…`; the
  digest-grep against Dockerfile is empty (assess, first-hand). The workflow
  has ZERO runs ever; first scheduled fire **Monday 2026-10-12 06:53Z** is a
  deterministic red and leaves the base-image CVE watch dark until cured.
  No test pins the env today (`grep -rn cve-tripwire test/` → 0 hits).
- **Scope**: fix the env to the Dockerfile's pinned
  `node:24-trixie-slim@sha256:<digest>`; add `test/workflow-image-parity.test.ts`
  asserting exact equality (digest included) between the workflow env and the
  Dockerfile ARG, plus Dockerfile sentinel presence — the drift class becomes
  a red test instead of a silent weekly red.
- **Provenance/fold**: re-author at current base per the uncommitted-delta
  lesson (KTD14); three unlanded sibling claims fold at integrate —
  89ebbf49's implemented rm-755, cbe70604's candidate rm-779, the 2026-10-08
  compound-doc candidacy. Selection rider recorded on rm-648.
- **Acceptance**: parity test green at the fixed pair; actionlint on the
  workflow; census/guards stay green; the Monday fire lands on a cured main
  (landing gate owned by the integrate phase).

### U2 — detailsUrl https-only boundary (supersedes stalled PR #444)

- **Why now**: the repo's only open PR (#444, run c026a644's lane) degraded
  mergeable UNKNOWN → **CONFLICTING** (live probe 2026-10-09) after main
  advanced; its release.yaml readback hunks are already duplicate-cured on
  main (5aab7c7's END-block cure per the lane's own compound record), so its
  unique payload is the detailsUrl boundary — and that payload is a
  DOM-sink-class gap live on main: `src/github/aggregator.ts:656`
  (`detailsUrl: run.detailsUrl ?? ''`) and `web/src/api/monitoring.ts:55-59`
  (any string passing `typeof` reaches the `href` sink at
  `web/src/views/Monitoring.tsx:164`).
- **Scope**: https-only validation at the server extraction seam (drop
  non-https to empty), client mirror parse in `web/src/api/monitoring.ts`
  (contract-drift-fail-closed drop), tests on both layers
  (aggregator extraction gate + monitoring field contract: https kept,
  http/javascript/about-blank dropped).
- **Provenance/fold**: third claim on the rm-450 lineage (lane c026a644's
  implementation, sibling rm-450, 63b5848a's same-content mint — ext#12's
  dedupe map); re-authoring here executes rm-781's supersede path; PR #444
  retires at integrate. Selection rider recorded on rm-225.
- **Acceptance**: field-contract tests green proving only https URLs survive
  both layers; check-types + targeted suites green; sink closes with the
  parser, view unchanged.

## Considered, not selected (rationale)

- **rm-781 emitter+impeccable adjudication (69b161e1 lane)**: highest
  strategic value in the queue but a 25-file validated batch needing
  re-author AND remote secret/variable provisioning before its alert can be
  proven live — too large to co-batch with a deadline cure; stays with the
  queue for a dedicated cycle.
- **rm-133 TS 7.0.2 bump**: research proved all three projects compile-clean,
  but the gate (typescript-eslint peer cap `<6.1.0`) is external and
  unmoved; the def's own 2026-10-21 re-eval window owns it.
- **rm-157 contract 1.8.0 / agent v0.118.2 absorb**: deploy-gated on the infra
  gateway ≥ v0.118.1 co-deploy — external dependency, not actionable.
- **rm-116 branch-protection fill**: remote-config action (no repo diff),
  standing first-post-landing item — integrate-phase territory.
- **Upstream 24-commit absorb window**: alert-only designed red, large and
  deploy-coupled; absorb window work stays batched separately.
- **katex 0.19.0**: screened DEAD (GHSA-238p-pmpm-9mq7 patched at 0.18.2,
  fork floor 0.18.10) — recorded on rm-252's rider, no work.

## Batch coherence

Both units are small, test-first, deadline- or risk-driven, share the
"land stalled validated cures at current base" theme (exactly rm-781's
reason for existing), and complete end-to-end in one cycle (implement →
validate → integrate) without external gates.

## Next-cycle candidates

1. rm-781 remainder: emitter+impeccable batch re-author + alert-live proof.
2. rm-133 2026-10-21 re-eval (tsc axis proven clean; watch the cap).
3. rm-157 absorb once the infra gateway co-deploys ≥ v0.118.1.
4. rm-116 protection fill (with Main-job conclusions + CodeQL, strict,
   admin-enforced).

## Validation plan for the implement phase

- Census + ledger guards stay green (no new defs; the flip keeps the first
  status token parseable: `open (selected …)`).
- eslint on every touched file; actionlint (container form) on
  cve-tripwire.yaml; check-types; targeted vitest suites for the parity
  guard, aggregator, and monitoring field contracts (web/dist prebuilt per
  the pretest recipe).
