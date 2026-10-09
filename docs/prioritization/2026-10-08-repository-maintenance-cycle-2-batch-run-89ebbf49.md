# Repository maintenance cycle-2 batch (run 89ebbf49)

## Selected

Two change-units plus the roadmap ride, selected by impact/risk/effort with two
live clocks as forcing functions and fleet congestion as the tie-breaker (full
ranking and declinations in the prioritize selection doc, spool scratch
`delegate/58e07afd…-scratch/prioritize-selection-2026-10-08.md`):

- **CU-A — cve-tripwire digest-resolve repair (rm-755).** Deadline-driven: the
  first scheduled fire Monday 2026-10-12 06:53Z would deterministically red
  rm-648's weekly gate (the resolve grep finds no pin). Convergent lane
  sanctioned by the roadmap claiming comment ("pick either, they converge").
- **CU-B — code-scanning Trivy alert hygiene (rm-761).** Unique lane: 43 open
  Trivy rows frozen at `updated_at 2026-09-16T20:30:21Z` across seven weeks of
  green releases — the alert channel disagreed with the Enforce gate by
  construction.
- **Ride — roadmap extension.** The roadmap-phase delta already in the worktree
  (8 dated riders, mints `rm-755`/`rm-759`/`rm-760`/`rm-761`, claiming comment)
  plus this implement's status flips.

## Method

Ranking inputs: this run's assess (`806a1eee`, findings F1/F2/F3), research
(`d05c0002`, streams A–D), roadmap (`cfb8636d`, adoption-verified mints); live
re-probes at prioritize time (origin/main `559642aa`, code-scanning API, sibling
worktree sweep). Declined lanes and why: `rm-759`/`rm-760`/`rm-673` already hold
unlanded sibling vehicles (8521c80a, 9fd8bcad) — an N-th convergent vehicle is
negative value; the dependency window (`package.json` + `pnpm-lock.yaml`) is
contested by 788aa489's dirty composition; the upstream 1.8.0 absorb is a
decision-dated (2026-10-13) dedicated cycle; branch-protection fill and
conductor-ref reap are push-stage remote mutations by their own definitions.

## Context

Base `b658cb60` == roadmap-phase HEAD; origin/main advanced twice mid-run
(`9868058`, then `559642aa` — robots.txt rm-713 + web monitoring/listener
landing) with zero workflow, guard-test, or entry-point overlap, so all batch
surfaces were re-verified byte-identical to live main before editing. Baseline
health all green at assess (lint / check-types / full test battery 62+31 files).

### CU-A — cve-tripwire digest-resolve repair (rm-755)

- `.github/workflows/cve-tripwire.yaml:35` — `NODE_IMAGE: 'node:24-slim'` →
  `'node:24-trixie-slim'`, matching `Dockerfile:34`
  (`node:24-trixie-slim@sha256:173f1258…fb66`). The rm-744 Trixie migration
  swept base-drift's six tag sites and missed this one (landed 8 h earlier the
  same day).
- `test/workflow-image-parity.test.ts` — NEW guard tying every `node:24-*`
  image-tag constant across the workflow fleet to the Dockerfile `ARG` value.
  Adopted from run 8521c80a's convergent unlanded vehicle with the runner-pin
  describe trimmed (that unit rides their own batch — `base-drift.yaml:34` is
  still `ubuntu-latest` on main).
- Proof: seeded-red first (`['cve-tripwire.yaml: node:24-slim']` offender +
  the tripwire env assertion), then green after the one-line cure; live resolve
  grep against the Dockerfile returns the pinned digest; actionlint
  container-form rc=0.

### CU-B — code-scanning Trivy alert hygiene (rm-761)

- `.github/workflows/release.yaml:336-350` — the Trivy SARIF gen step now
  carries `ignore-unfixed: true` (with an explanatory comment): uploaded alerts
  mirror exactly what the Enforce gate blocks. The category stays the
  digest-independent constant `trivy/release-image`, so instances dropped from
  the SARIF auto-close their stale code-scanning rows on the next upload — the
  mechanism that drains the frozen 43. (Per-digest category was the def's other
  accepted option; it loses mechanically: it fragments tracks and never drains.)
- Summarize step now states the filter ("fixed-only (ignore-unfixed), matching
  the Enforce gate") so the operator summary cannot over-read the alert list.
- `test/release-sarif-parity.test.ts` — NEW fence: exactly two trivy-action
  steps, same immutable action pin + version, same freshly-built digest
  image-ref, same scanners/severity, `ignore-unfixed: true` on BOTH, category
  constant with no interpolation, and the uploaded SARIF file is the one the
  scan step wrote. Seeded-red (SARIF block lacked `ignore-unfixed`), then green.
- `docs/solutions/best-practices/trivy-base-image-alerts-unfixable-by-design-2026-08-30.md`
  — dated Update section recording the freeze forensics, the cure, the expected
  drain, and the push-stage residual (manual sweep for stuck rows; re-derive the
  open count after the first post-landing release).
- Deferred by the def's own acceptance: the steady-state open-count proof and
  any dismissal sweep (needs a real post-landing release run).

### Ride — roadmap extension

- `ROADMAP.md` — the in-worktree roadmap-phase delta (8 riders under
  rm-102/139/157/252/681/648/744/689, the four mints, claiming comment at
  :2016) plus this phase's flips: `rm-755` and `rm-761`
  `status: candidate` → `status: implemented 2026-10-08 (run 89ebbf49 cycle:2
  implement e98f974a …)`.
- `test/roadmap-integrity-guard.test.ts` — id-ceiling pin `toBe(761)` (roadmap
  phase; unchanged here).

## Landing notes

- Convergences to reconcile by content at integrate: CU-A duplicates
  9fd8bcad's delivered-unlanded rm-755 (same id, same content — their ROADMAP
  ride renumbers theirs as rm-756 on landing order) and 8521c80a's CU1 (same
  cure + the parity test whose filename/shape this batch adopts); CU-B's
  release.yaml hunks are disjoint from 69b161e1's unlanded notify-listener jobs
  (job-level + `needs:`), so the 3-way is expected clean.
- No commit/push/CI in this phase by work-order scope; everything rides the
  integrate/landing gates.

## Outcome

- Focused validation, all green: both new suites seeded-red-then-green
  (2 files / 10 tests); roadmap guard battery
  (`roadmap-integrity`/`roadmap-length`/`prose-residue`) green after the status
  flips; census 240 defs / 0 dups / max `rm-761`; eslint clean on both new
  tests, the touched solutions doc, the batch doc, and ROADMAP via stdin;
  `pnpm check-types` rc=0; actionlint container-form rc=0 on both touched
  workflows.
- Post-landing obligations (recorded on the defs and above): first scheduled
  tripwire fire green (Mon 2026-10-12 06:53Z); code-scanning open count
  re-derived after the first post-landing release.

## Lesson

A green enforcement gate says nothing about the truth of the alert channel it
feeds: the frozen 43 stayed open precisely because every upload re-asserted
them, while the gate — the only thing anyone watched — filtered them. When two
consumers derive from one scan with different filters, fence the coupling in a
test (same pin, same target, same filter, stable category) so the disagreement
class cannot re-enter silently.
