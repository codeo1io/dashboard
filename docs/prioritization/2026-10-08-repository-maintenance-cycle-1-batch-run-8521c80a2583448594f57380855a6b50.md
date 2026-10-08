# Cycle-batch selection — run 8521c80a (repository-maintenance cycle 1), 2026-10-08

Base at selection: b658cb60 (dispatch; fetch mid-cycle shows origin/main at 9868058 —
run 530bd1a9's landing, chronological-union applies at integrate, no anchor collision).
Tree at selection: `M ROADMAP.md` only (this run's riders-only roadmap extension #33 —
9 dated riders, zero mints; every candidate there is owned by unlanded sibling claims
per the reconcile-by-content map recorded in that extension).

## Inputs & guards

- Assess (attempt 782417e8, base b658cb60 == origin/main at fetch): health all green
  first-hand — frozen-lockfile install rc=0, eslint rc=0, check-types rc=0,
  `pnpm test` rc=0 (server 62 files/2438 tests + web 31 files/1183 tests); census
  236 defs / 0 dups / max rm-744 == guard pin. Five live-evidenced findings F1–F5
  (all unledgered on main at assess time).
- Research (attempt 046168fc, same base): upstream static (4a90eab, 23 unabsorbed,
  0 open PRs); both 1.8.0 gates open; audit rc=0; trixie registry digest == pin
  (base-drift Monday stays green); in-range dep/action bumps catalogued.
- Roadmap (attempt 87970e21): riders-only delivery + the id-space ownership map —
  the relevant fact for selection is that F1–F5 are claimed by UNLANDED sibling
  mints (89ebbf49 rm-755/759/760/761; 9fd8bcad rm-755..758; 788aa489 rm-759..761;
  f266ce30 rm-751/754). None has landed; Monday's deadline does not wait for lineage
  reconciliation. This batch adopts by content and the integrate folds duplicate
  meanings (landed meanings own ids).
- Ledger open surface at selection: 74 `status: candidate` defs; open non-docs
  lanes: rm-699, rm-686, rm-647, rm-632, rm-597, rm-116, rm-117, rm-115, rm-103,
  rm-252.

## Selection floor

Screened in (must/may):

- F1 cve-tripwire NODE_IMAGE mismatch — the ONLY item on the ledger with a hard
  external deadline: first scheduled fire Mon 2026-10-12T06:53Z exits 1
  deterministically (digest grep empty → misleading precondition error).
  One-line cure restores green-at-parity (rm-648's acceptance semantics,
  re-verified live: only FIXED HIGH/CRITICAL fail).
- F4 `runs-on: ubuntu-latest` at cve-tripwire.yaml:40 — same file, same batch;
  sole non-pinned site of 13 workflows (rm-188 regression).
- F2 read-only guard cross-product hole — 6 live write-capable escape shapes
  against BOTH guard corpora; hardens the repo's #1 security invariant.
- F3 `isMainEntryPoint` symlink false-negative — silent headless boot under
  symlinked entry; live repro; entry suite has zero symlink cases.
- (conditional) trivy engine v0.72.0 → v0.75.0 — only if release notes verify
  benign (research flagged the 3-minor lag as a check-owed datum).

Screened out (with reasons):

- F5 operatorRuntimeCaching per-request statSync (rm-478 rider): f266ce30's
  stewardship batch rm-751/rm-754 carries a DESIGNED cure in flight — duplicating
  an in-flight design wastes the fold; not deadline-bound.
- Dep chore batch (rm-196 rider set: vite 8.3.4, eslint 10.12.0,
  @hono/node-server 2.1.4, @playwright/test 1.64.0 + visual.yaml mcr lockstep,
  actions minors): routine, zero urgency (audit rc=0, all in-range); churn dilutes
  a deadline-critical batch. Also overlaps unlanded 788aa489 rm-760.
- rm-116 (branch-protection fill): live platform mutation, medium effort/risk,
  never deadline-bound; standing strategic item stays deferred.
- rm-117/rm-115 (security panel, status page), rm-686 (goal shortlist),
  rm-647/rm-632/rm-597 (route snapshot coverage, pino redaction, observations
  endpoint), rm-699 (auto-suggest releases): feature-scale work, not this cycle.
- rm-103/rm-252 absorb window: gated on the 2026-10-13 decision; upstream static.
- Code-scanning consolidation (89ebbf49 rm-761), actionlint/impeccable majors
  (9fd8bcad rm-758), pnpm/action-setup (rm-761 lineages): owned unlanded, not
  deadline-bound.

## Selected change-units

| ordinal | adopts | title | track | priority | sizing | risk | deps |
|---|---|---|---|---|---|---|---|
| 1 | rm-755 lineages + rm-648 acceptance | cve-tripwire coherence: NODE_IMAGE `node:24-slim` → `node:24-trixie-slim` (:35) + `runs-on: ubuntu-24.04` (:40) + parity guard test tying every workflow image-tag constant to the Dockerfile ARG | ops/security | 90 | 0.5 CU | low (one workflow file + one test) | none |
| 2 | rm-760/rm-756 lineages + rm-649 | read-only guard cross-product closure: seed both corpora with the 6 escape shapes (red-first), then close (namespace allowlist extension + verb list + `request()` verb-literal coverage) | security | 80 | 1 CU | low-med (tests only; no production write path added) | none |
| 3 | rm-759/rm-756 lineages + rm-702 | `isMainEntryPoint` symlink reconciliation: realpath both sides of the :1667 comparator + symlinked-entry case in the entry suite | correctness | 70 | 0.5 CU | low (server.ts entry guard + test) | none |

Conditional rider on CU1: trivy engine bump v0.72.0 → v0.75.0 after a
release-notes check; drop without prejudice if notes show behavior changes.

Total: ~2 CU — fits one implement turn end-to-end with a single validation
battery; zero cross-deps; every CU is evidence-backed by this run's assess
(attempt 782417e8 F1/F4/F2/F3, live line-level evidence in
delegate/782417e8…-scratch/assess-evidence-2026-10-08.md).

## Post-batch projection

- CU1 lands → rm-648's green-at-parity acceptance is restored pre-deadline;
  rm-188's regression cleared; the Monday 06:53Z fire goes green (first fire
  becomes a live gate run, not an incident).
- CU2 lands → the two guard corpora fail-closed on the six escape shapes;
  read-only invariant test surface strengthened without touching production code.
- CU3 lands → symlinked entry boots deterministically; entry suite covers the
  realpath class.
- Ledger: no new ids minted by this run; implement records status-flip evidence
  against the sibling-claimed ids' MEANINGS, integrate reconciles by content
  (map in ROADMAP extension #33).

## Verification contract (implement phase)

1. Red-first corpus: the six escape shapes as committed test cases BEFORE the
   guard closure edit (run targeted suites; expect 6 failures), then green after.
2. `actionlint` container-form on the modified workflow; `yml/quotes`-clean
   single quotes.
3. Local tripwire simulation: run the digest-resolve grep logic against the
   edited workflow + Dockerfile and show it returns the pinned digest
   `sha256:173f1258…`.
4. Full gates: `pnpm install --frozen-lockfile` rc=0, `pnpm lint` rc=0,
   `pnpm check-types` rc=0, `pnpm test` rc=0.
5. Entry suite: symlink case present and passing; direct entry via symlink
   reproduces `match: true` post-fix.
6. Tree closes with only the batch payload (workflow, guard tests, server.ts,
   entry test, ledger/evidence riders).
