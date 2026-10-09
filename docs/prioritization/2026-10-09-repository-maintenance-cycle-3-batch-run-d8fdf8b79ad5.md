# Dashboard roadmap prioritization — 2026-10-09, repository-maintenance cycle:3 batch (conductor run d8fdf8b79ad54a68883810c1fc29a2da)

Worktree base `364272b` (== origin/main, re-verified at selection: `git fetch origin` +
`rev-list --left-right --count HEAD...origin/main` → 0 0). Porcelain at phase start =
exactly the roadmap-phase deliverable pair `ROADMAP.md` +
`test/roadmap-integrity-guard.test.ts` (census 247 defs / 0 dups / max rm-803,
re-derived first-hand this phase). Run lineage: assess `636e56d7` → research
`69d2bf22` → roadmap `862f88e2` (redo after the provider-aborted attempt 732ed459 left
zero durable work; minted rm-802 + rm-803, 9 dated riders, extension #40, guard pin
778 → 803) → **prioritize `9d27147cfe834` (this selection)**.

## Inputs

- This run's assess (`636e56d7`): exactly two unresolved findings, both minted by the
  roadmap phase — F1 → rm-802 (snapshot-store logPersistProblem flattens the
  size-bound `{ bytes: size }` payloads at src/github/snapshot-store.ts:109/:120
  through the :46 `String()` coercion into `'[object Object]'`; the byte count is lost
  from the operator log exactly when an oversized-cache diagnosis needs it; fail-open
  semantics unaffected), F2 → rm-803 (docs/solutions frontmatter convention has no
  machine check; renovate-upstream-sync-regression-2026-09-21.md evades it).
- This run's research (`69d2bf22`): all registry / Scorecard / upstream-window data
  was recorded as dated riders on standing defs at the roadmap phase
  (rm-105/108/116/120/139/147/252/650/760) — watch data, not batch units. The
  2026-10-13 actionable set recorded on rm-252's rider is concurrently owned by
  sibling ab16a466's implement (digest legs; see audit).
- Fleet liveness (campaign stores, first-hand this phase): 15+ lanes running, almost
  all in implement / full_tests / review — the audit below names every claim.

## Selection floor

The batch must be implementable end-to-end within this cycle (implement → tests →
review → validation → landing gates), repo-scope only, and file-clean against every
live lane and open PR. rm-802 + rm-803 are the only pool items that are BOTH
unclaimed by content across every wall AND file-clean: both are this cycle's own
first-hand assess findings, both touch surfaces that just quiesced (PR #447 merged
into this base), both are small, and they share one truth theme — the evidence the
system leaves behind (operator log fields, docs conventions) must be faithful.

## Claimed-and-excluded (congestion audit — every probe live this phase, not inherited)

- cve-tripwire NODE_IMAGE cure (RED BY CONSTRUCTION until fixed; first scheduled fire
  Monday 2026-10-12 06:53Z): rm-793 selected by d1a0b216 (RUNNING implement, cycle:2
  'gate-health + operator-lifecycle', alongside rm-794 operator run-stream
  hardening); dead-lane history rm-755 (89ebbf49) and rm-781 (32f33f1b, 'pre-Monday
  tripwire parity'). The active claim wins; if d1a0b216 dies before Monday, the fix
  is re-implementable by content with a fold note in the rider — no new mint.
- rm-116 (branch-protection fill) + rm-792: 438dea88 (running implement).
- rm-117 + rm-162: 91776e25 (running implement).
- rm-279: f510a33e (running implement).
- rm-485 + rm-501 + rm-784 ('client network-bound truth'): e8c99e0e (running
  implement) — and rm-784 is DOUBLE-SELECTED by 0cde5807 (running implement); a
  same-hour parallel-selection collision, both walls' docs naming their own side.
- 0cde5807's rm-689 execution legs: Dockerfile:34 base-digest refresh,
  fro-bot.yaml:347 agent pin, codeql.yaml:56/:62 — while ab16a466 (running implement)
  executes the codeql-action digest set across codeql.yaml:56/:62, release.yaml:357,
  scorecard.yaml:51 + the same fro-bot.yaml pin: a second live-live file overlap.
- rm-599 + rm-797: 38e72854 (running implement); rm-797 double-selected by c4617181
  (running implement, rm-797/799/800 'supply-chain hygiene + citation truth').
- rm-782 + rm-783: DOUBLE-SELECTED by 33b30ba2 AND ab16a466 (both running implement)
  — the third live-live collision; integrate reconciles by content.
- rm-787 ('CI scanner currency'): dead lane df0dd46d97a1 (no runs row; wall is
  residue only) — content adjacent to ab16a466's active digest work.
- rm-674 (consolidate the five Monday crons, priority 40.0): UNCLAIMED but
  file-contested NOW — ab16a466's live implement edits scorecard.yaml / release.yaml
  digest sites and d1a0b216 / 0cde5807 hold other in-flight workflow churn;
  rewriting the schedule blocks of audit / base-drift / upstream-drift / canary /
  scorecard against edits on those exact files is a merge-conflict factory. DEFERRED
  to the first cycle after the current workflow churn lands; the +7-8h Monday queue
  latency datum stands on the def.
- rm-659 (run-history tamper forensics; open, unclaimed, security 36.0): acceptance
  is audit-log export + Actions-write credential enumeration + escalation of record —
  an org-owner-token deliverable, not a repo implementation unit; fits a
  stewardship-type phase, not this batch.
- rm-675 (roadmap-sync emitter obligations): deliverable lands in the EXTERNAL
  renderer before any next managed render — outside this repo's tree.
- rm-108 majors wave / rm-139 Node window (2026-10-20/28) / rm-252 absorb decision
  (2026-10-13): windowed or strategically deferred; registry data preserved on the
  dated riders minted at the roadmap phase.
- rm-102 (dependabot enablement) / rm-147 (license): outside repo scope / blocked on
  the operator decision.

## Batch selected for this cycle (implement-phase scope): 'log-fidelity + docs-hygiene'

- **U1 rm-802 (reliability, 30.0) — structured log fidelity at the size bound.**
  src/github/snapshot-store.ts:46 coerces the `{ bytes: size }` over-bound payloads
  (:109, :120) to `'[object Object]'`. Acceptance: structured payloads log as
  structured fields (the :146 shape), Error-instance message extraction kept, and a
  spy-proven test that an over-bound cache warning carries the numeric byte value
  (red before, green after). Impact: restores the one diagnostic datum an
  oversized-cache investigation needs. Risk: minimal (log path only; fail-open
  return semantics untouched). Effort: small.
- **U2 rm-803 (docs, 14.0) — frontmatter fence.** Add the missing frontmatter block
  to docs/solutions/workflow-issues/renovate-upstream-sync-regression-2026-09-21.md
  (module/tags/problem_type consistent with its neighbors) + a light test/ guard that
  fails when any docs/solutions markdown file lacks a frontmatter block (red against
  the current tree, green after the fix). Impact: makes machine-checked the
  convention the whole fleet writes against. Risk: minimal. Effort: small.

Priority arithmetic: every pool def above these two by priority number is either
sibling-claimed (audit above) or strategically deferred / windowed; these two are the
highest-value items simultaneously unclaimed, file-clean, and completable this cycle.
Dependencies: none between U1 and U2.

## Selection risk

- rm-802 edits a file that just took a landing (PR #447, merged 2026-10-08): the hunk
  sets are disjoint (log helper :43-48 + two call sites vs read-before-bound), and
  the merged legs are already in this base — implement re-reads the file at batch
  base regardless.
- rm-803's new guard test lives under test/ (singular, NON-executable per the engine
  classifier): the batch's executable delta is expected to be U1's src/ change only —
  the implement fold's changed_surfaces attestation (KTD13) must declare the
  engine-derived set, not the human-intuitive file list.
- Three live-live double-selections exist elsewhere in the fleet (rm-782/783,
  rm-784, rm-797) plus a codeql.yaml digest overlap (0cde5807 vs ab16a466) — none on
  this batch's surfaces; integrate-phase reconcile will need those batch docs'
  pairing notes.
- The fleet's Monday 2026-10-12 06:53Z tripwire deadline rides d1a0b216's lane, not
  this batch; if that lane dies, the standing dead-claim re-implementation path
  (fold note in the rider, no new mint) applies.

## Verification

Def-line status flips candidate → open on rm-802 and rm-803 with this doc's path in
the selection markers; one selection rider appended per def block; selection edits do
not move the census by construction — post-selection census re-derived first-hand
this phase: 247 defs / 0 dups / max rm-803, healthy (statuses now open 4 / candidate
73; in-progress 2); guard pin 803 untouched. Battery at selection:
`node scripts/roadmap-census.ts` rc=0; roadmap-integrity-guard + roadmap-length-guard
vitest green; eslint green on ROADMAP.md, this doc, and the guard test file under the
lockfile toolchain (`pnpm install --frozen-lockfile --prefer-offline` rc=0 in this
worktree). No vitest suite runs at prioritize; the implement phase owns test
execution.
