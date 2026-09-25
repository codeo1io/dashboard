---
date: 2026-09-25
topic: dashboard maintenance cycle 1 (engine) — batch outcome, learnings, and next-cycle standing set (post-828a1e6)
mode: delegated-conductor
run: c8b5d2ece18f4a7d82676f0218ada3fe
phase: compound
attempt: 64d0bdd5a32b4850899946ae3ee95949
skill: ce-compound (non-interactive, lightweight — in-process, no subagents). Scope note: this artifact records PRE-REVIEW cycle evidence only (assessment → research → roadmap → prioritization → implementation → targeted/full test outcomes); review and shipping outcomes are carried forward by the next cycle's assessment.
---

# Dashboard maintenance — cycle 1 batch outcome + next-cycle context (2026-09-25)

## Batch selected and implemented (prioritize 3898f986 → implement 70f8663f)

Batch theme: **operational hardening + discoverability** (deliberately disjoint
from the parallel a78da601 lineage's "ledger & citation truth" claim, which
owns ROADMAP.md and the citation sweep this cycle).

| Unit | Ref | Surface | Outcome (pre-review) |
| --- | --- | --- | --- |
| B1 listener ingest dedupe hardening | rm-227 → **rm-232** | `src/listener/store.ts` check-then-insert → single `INSERT … ON CONFLICT (source, dedupe_key) WHERE dedupe_key IS NOT NULL … read_at = messages.read_at RETURNING id`; +2 tests | implemented, focused battery green, full-suite green via authoritative GitHub-hosted validation |
| B2 container HEALTHCHECK | rm-228 → **rm-233** | `Dockerfile` tail (between EXPOSE/CMD): node-native fetch probe to the public `/api/healthz` (node:24-slim has no curl/wget), 4.5s in-process watchdog; +2 guard tests (continuation-joined directive matching) | implemented, green as above |
| B3 docs/solutions index | rm-229 → **rm-234** | new `docs/solutions/README.md` indexing all 80 docs by category + `test/docs-solutions-index.test.ts` 4-way guard (index exists, no orphans, no dead links, frontmatter complete); 2 docs' frontmatter gaps repaired | implemented, green as above |

Diff at handoff: 6 modified + 2 new tracked files (+115/−33) plus the two
frontmatter repairs; worktree branch `conductor/run-c8b5d2ece18f` based on
`828a1e6`.

## Validation receipts (recorded, not re-run here)

- Focused battery (implement phase): `pnpm lint` 0 errors; `pnpm check-types`
  (server + web + .opencode) clean; impacted suites 37/37; empirical
  node:sqlite probe (SQLite 3.53.3) proving partial-index ON CONFLICT
  semantics (dupe idempotence, NULL-key freshness, rm-169 read_at
  preservation).
- targeted_tests (b8daf229): work-order targeted_command exit 0 — the
  harness's own fallback routed to the authoritative GitHub-hosted validation;
  ephemeral PR #208, all 9 checks SUCCESS (snapshot `245a594`, base `47fd68c`).
- full_tests (e10187ef): `validation.full_command` verbatim, exit 0 —
  ephemeral PR #209, all 9 checks SUCCESS (snapshot `d71a733`, base
  `04dafa8`), i.e. the batch is full-suite green **against the live tip in
  merge context**, not just against its 828a1e6 base.
- origin/main moved under the run: `828a1e6` → `47fd68c` → `04dafa8` (other
  runs' integrates). Nothing in this batch conflicted; re-validation rode the
  live base each time.

## Compounded learnings (this phase)

- New solution doc:
  `docs/solutions/database-issues/listener-dedupe-partial-index-atomic-upsert-2026-09-25.md`
  (check-then-insert TOCTOU → atomic partial-index upsert; includes the
  "repeat the partial predicate in the conflict target",
  "read_at self-reference preserves acks", and "prove engine semantics with a
  20-line probe before wiring tests" rules). Indexed in
  `docs/solutions/README.md` under a new `database-issues` category.
- Reusable process lessons from this cycle (recorded in conductor memory,
  candidates for future solution docs if they recur): mid-validation turn
  timeout → pickup-not-redo on re-dispatch (on-disk edits are the artifact);
  guard tests must join directive continuation lines before matching
  (otherwise the probe on the continuation is invisible); direct vitest
  invocations bypass `pretest`, so rebuild `web/dist` first or suites hitting
  `/` 404.

## Id-space state at handoff (for the next cycle's roadmap phase)

- This run's staged roadmap (spool `roadmap-a2629eab.diff`, base `828a1e6`)
  mints rm-227..rm-231 and appends 7 dated signals. **Renumber at compound
  (64d0bdd5):** cycle-13 (run aaa84dff) landed e407953 minting its OWN
  rm-225/226/227 above a live open-PR census that cannot see spool-staged
  roadmap artifacts, colliding with this lineage's rm-227 — landed meanings
  win, so the converged artifact re-issued as
  `roadmap-compound-64d0bdd5.{md,diff}` (superseding roadmap-a2629eab whole)
  renumbers 227→232, 228→233, 229→234, 230→235, 231→236 against live
  main e407953 and marks
  implemented+validated (spool `roadmap-compound-64d0bdd5.md` +
  `.diff` — a superset of the a2629eab diff).
- Three-way in-flight collision zone below the ceiling: 5ae8aaf7 lineage
  staged rm-222/223 (ledger repair) + rm-224 (inbox); 71991cb3 lineage staged
  rm-222..226; this run minted strictly above the union ceiling. Resolution
  rule stays renumber-by-content at landing.
- Landing base for the roadmap extension has moved (main at `04dafa8` when
  last measured); verify the live ROADMAP before applying — other lineages'
  integrates may have renumbered.

## Next-cycle standing set (deferred with reasons — top picks first)

1. **Monitoring panel (rm-107 lineage)** — still the top unmet product need
   (`/api/monitoring` dead route at `src/routes/api.ts:9,82`). Deferred
   because it needs web/ work + visual baselines on the fragile
   mixed-provenance rolling image (#3307) and cannot fit end-to-end alongside
   this batch; deserves a dedicated batch/cycle with its own visual-baseline
   plan.
2. **rm-235 relocate ROADMAP integrate ledger** — deferred this cycle only
   because ROADMAP.md was owned by the parallel a78da601 lineage (conflict
   census); unowned next cycle.
3. **rm-236 dependabot window-open protocol (~2026-10-03)** —
   pnpm/action-setup untagged v4-era pin vs v6.1.0 (2-major jump expected at
   window-open) and jsdom 30.1.1 (only major not in rm-133's ignore block);
   time-gated, re-evaluate at window-open.
4. Run-card provenance (research R1): `WorkflowRun.displayTitle/runAttempt`
   still absent from `src/github/aggregator.ts`; rm-222 lineage unlanded —
   re-mint hazard, verify live ROADMAP ids before claiming.
5. Assess findings not in this batch: F6 serial upstream auth round-trip →
   in-flight rm-207 (bf5d7753); F8 unread-badge poll swallow → rm-215 lineage
   + rm-224 claim; F9 no LICENSE/SECURITY.md → rides unlanded PR #43.

## Cycle meta-lesson (dispatch hygiene)

The dispatch frame was 55 commits stale (7809df6 vs authoritative 828a1e6)
and the canonical checkout sits parked on `cloud/visual` with a diverged
local main (assess F2, worst instance on record). Every phase re-derived the
authoritative base via fetch + ls-remote before touching anything — keep
doing that until the checkout-parking root cause is fixed.
