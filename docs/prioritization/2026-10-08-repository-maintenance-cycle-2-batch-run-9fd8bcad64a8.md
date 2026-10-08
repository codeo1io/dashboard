# Dashboard roadmap prioritization — 2026-10-08, repository-maintenance cycle:2 batch (conductor run 9fd8bcad64a8442b82c8215da58f4f2a)

Base `b658cb6` == origin/main (fetch re-probed unmoved this phase). Run lineage: assess
`fef9a24f` (baseline f66e547, evidence tree /tmp/assess-9fd8bcad64a8) → research `24d080fb`
(baseline e8d220c, scratch /tmp/at-research-24d0) → roadmap `8a4d7ae3` (base advanced
9aceea8d → b658cb6 by ff; minted rm-755..rm-758 + 5 riders + census comment; guard pin
toBe(758); prior attempt 27f5a2f2 was a provider reap with a byte-clean tree — redone) →
**prioritize 0c7ebc3a (this selection)**. In-tree ledger at selection:
`node scripts/roadmap-census.ts` → **240 defs / 0 dups / max rm-758** — candidate 77,
implemented 113, in-progress 2, blocked-external 2, completed 34, partially 2, open 2,
landed 2, superseded 6. Tree carries exactly the roadmap phase's two dirty files
(`ROADMAP.md`, `test/roadmap-integrity-guard.test.ts`); no other drift.

## Method

The 77-item candidate pool was ranked by impact (user/operator/security exposure), risk
(blast radius + reversibility), effort (surface count + validation depth), dependencies
(sequence locks, parallel-port ownership by unlanded sibling batches, deploy/CI gating),
and strategic value (which standing obligations become self-enforcing). Two hard filters
applied before ranking:

- **Parallel-port filter** — never select content owned by an unlanded sibling batch:
  rm-745..rm-750 (run 5bd710d8, dirty worktree), rm-751..rm-754 (run f266ce30, dirty
  worktree), the rm-252/rm-157 contract-1.8.0/gateway lane (run 9289efaa's unlanded batch
  carries the implemented flip), rm-282 (floors closed-by-content by sibling rm-285), and
  rm-187 (third sequential lock on `src/listener/store.ts`). Verified against both dirty
  sibling diffs this phase — neither claims rm-673, rm-755, rm-756, or rm-758
  (f266ce30's single `rm-755` string is its extension comment's "next free" note).
- **End-to-end-in-cycle filter** — every selected unit must be completable with
  locally-provable acceptance (implement + targeted/full tests + lint + check-types), so
  the run's validation/push stages confirm rather than carry the batch. rm-758 fails this
  filter (its acceptance IS a green Design-Check/Lint on a PR); it is deferred, not
  dropped.

## Selected batch — "standing guards made truthful" (three units)

| id | unit | why it leads the cycle |
| --- | --- | --- |
| rm-755 | cve-tripwire NODE_IMAGE flavor fix (one line + seam probe) | the pool's only TIME-BOXED item: first scheduled fire Mon 2026-10-12 06:53Z is deterministically red (verified first-hand — `node:24-slim@sha256:` cannot substring-match the trixie Dockerfile pin, the :54 seam greps empty, :56 exits 1 before trivy); also unblocks rm-648's standing green-at-parity acceptance and keeps the Monday watch set readable; trivial effort, zero conflicts, expedited `workflow_dispatch` (trigger present) proves it at push stage |
| rm-756 | read-only guard-pair verb-shape closes, red-first corpus in BOTH guard files | critical invariant #1 (read-only by construction) has a first-hand-proven enforcement hole — bare-verb last segments (`gh.repos.delete(`) and non-stem write methods (`octokit.checks.rerequestRun(`, `octokit.codeScanning.uploadSarif(`) pass BOTH matchers (node replication this run); hardens the pair the 2a9dd25 landing just adjudicated as layered defenses; fully local-testable; boundary vs unlanded rm-747 pre-documented in the def (disjoint classes, union-by-content cure acceptable) |
| rm-673 | security.txt refresh-runway assertion (≥60 days) in test/server.test.ts | automates a quarterly obligation currently pinned as a manual duty (Expires 2026-12-24, nothing fails between quarters); test-only, red-first-cheap, zero conflicts (verified unclaimed by siblings); same theme — a standing obligation becomes CI-enforced |

**Coherence:** all three units convert silently-rotting obligations (a tripwire that cannot
fire green, an invariant guard with a proven hole, an expiry nobody watches) into
self-enforcing checks — the highest value-per-risk shape available this cycle. Combined
effort is small (≈1 line + two guard extensions + one assertion), all red-first provable,
all locally validated end-to-end.

## Ranked remainder (top of stack, deferred with reasons)

1. **rm-149 OAuth PKCE S256 (+ rm-281 CodeQL recipe)** — highest strategic security value
   in the pool, but auth-critical surface deserves a headliner slot with full attention,
   not a rider in a guard-themed batch. Next-cycle headliner candidate #1 (rm-281 rides it).
2. **rm-117 security-posture panel** — operator-facing feature (aggregator snapshot +
   GraphQL/REST counts + UI); multi-surface with optional-permission degradation design.
   Headliner candidate #2.
3. **rm-674 Monday-cron consolidation** — good value (5/5 workflows +7-8h late on 10-05),
   workflow-only; deliberately sequenced AFTER rm-755 lands so the consolidation's first
   trial isn't entangled with a red tripwire. Candidate #3.
4. **rm-758 actionlint 2.0.6 + impeccable 4.x** — CI-validation-dependent acceptance
   (Design Check green on a PR); ride the next push-validated cycle. Candidate #4.
5. **rm-103 automated upstream-absorb cadence** — strategic but large; existing drift
   workflows already carry the watching half. Candidate #5.
6. **rm-757 vite-plugin-pwa 2.0.0 eval** — decision item; fold into rm-108's next regen
   window or a research-capable cycle.
7. **rm-153/rm-226 session-cache decision pair** — interlocked decisions; next cycle's
   research opener.
8. **rm-114/rm-220 SSE parser family** — substantive cross-bundle refactor; headliner
   scale, not a rider.
9. **rm-118 per-repo scoped tokens** — security-good; needs mint-budget design first.
10. **rm-104 (priority 98.0)** — the render generator lives OUTSIDE this repo (fleet
    hermes-roadmap tooling); not implementable in-repo — re-ranked as external-owner.
11. **rm-279 (priority 96.0)** — the pathological Lint hang is CURED (paragraph-split
    landed; green push-to-main runs since 2026-10-03 per its own riders); the residual
    decomposition half is belt-and-braces with low marginal value.
12. **rm-745..rm-754, rm-252, rm-157, rm-282, rm-187** — parallel-port/sequence-blocked
    (see Method); never re-select under this filter.

## Risks

- **rm-756 × rm-747 integrate conflict** (both edit the guard test files): pre-declared
  boundary in rm-756's def; union-by-content at integrate, shared denylist cure acceptable.
- **rm-755's CI proof half** (dispatch green) rides the run's push stage; the implement
  phase still delivers the full local proof (seam probe resolves the pinned digest,
  stale-flavor census zero, actionlint-equivalent yaml sanity, lint).
- **Batch is deliberately small** — three units leave cycle headroom for the integrate
  union of sibling batches; over-selecting would multiply conflict surface, not value.

## Validation plan (implement stage)

Per unit, red-first where applicable: rm-755 — before/after seam grep against Dockerfile +
repo-wide stale-flavor census; rm-756 — corpus cases added to both files failing before the
matcher change and passing after (both suites green, zero false positives on live tree);
rm-673 — red-first runway fixture, restore, green. Batch gates: `pnpm lint`,
`pnpm check-types`, `pnpm test` (full, server + web), roadmap guards green at 240/0/758.
