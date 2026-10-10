# Cycle-batch selection — run c07a6b75 (repository-maintenance cycle 1, 2026-10-10)

Run: c07a6b75011b4f6fa4114f11427e092c · intent 0f43cd187e2d4f2aa56a0a69ace81023 cycle:1 · prioritize attempt 9158799335864509ad11280514b98bb4 · compose base ae9ee8e (== this run's anchor; origin/main e6b6a94 at selection, hunk-disjoint, union at integrate).

## Selection

**Single-member batch with cessation: rm-899 — re-derive the container-CVE census on the trixie base with Debian-tracker dispositions (census-truth core).**

- Scope: a dated trixie section inside `docs/solutions/best-practices/container-cve-census-2026-09-25-no-fixed-versions.md` re-deriving the open-alert census from the current release-image SARIF, with per-CVE Debian-tracker dispositions and the 2026-10-10 first-hand docker probe transcript (util-linux/libmount1/libblkid1/bsdutils 2.41.5-0+deb13u1, Installed == Candidate on the pinned digest sha256:173f1258…). The optional base-drift tracker-row emission is DEFERRED (see exclusions).
- Impact: closes the unowned re-check obligation that fired on the 2026-10-07 trixie re-pin (assess F2) — the fleet's container-truth record currently describes a base the image no longer uses. Impact HIGH for truth, LOW for risk: docs-only, no runtime surface, no test-pin coupling beyond guards.
- Effort: S (one doc, evidence already gathered first-hand this run: SARIF census composition 49-open with 36-instance util-linux family + tracker rows + probe transcript).
- Cessation: no second member — every other candidate lane is owned or gated (registry below). A second member would double-build.

## Scoring over the candidate pool

| candidate | impact | risk | effort | verdict |
|---|---|---|---|---|
| rm-898 adopt contract 1.9.0 | critical | high (2 seams + auth/CSRF + fixtures) | L | EXCLUDED — already built unlanded by cb6061a358f2 (implement 0805faf1: 1251 lines, 22 files) |
| rm-899 census re-derivation (core) | high-truth | low | S | **SELECTED** |
| rm-779 cve-tripwire digest reconcile | high | medium | S | DEFERRED — declared 3+-lineage collision zone (pass-over rule; next fire 2026-10-12 06:53Z once Actions recovers) |
| rm-871 machine-classified window digest | medium | low | M | EXCLUDED — Actions-dark: unvalidatable end-to-end while run-creation is dead (33ede5's precedent) |
| rm-870/rm-872 observed-version instrument | high | low | S/M | EXCLUDED — composed unlanded by 33ede5's prioritize-07fe7e16 carrier |
| rm-874/875/876 served-truth batch | high | medium | M | EXCLUDED — composed unlanded by 4c0ec7a5's prioritize-acd1bcce carrier |
| rm-601/673/599/513 identity+served truth | high | medium | M/L | EXCLUDED — composed unlanded by 38954995's prioritize-298fc74d carrier (rm-513 HEALTHCHECK/VOLUME included) |
| rm-865-868 (snapshot shape, stream retry, walkers) | medium | medium | M | EXCLUDED — built unlanded by 461586fe |
| rm-842 deps compound (vite 8.3.4, pnpm) | medium | low | M | EXCLUDED — built unlanded by sibling; deps interlock also rides cb6061a3 |
| rm-252 absorb decision | high | — | — | DECISION DUE 2026-10-13, decision-first (not implementable this cycle); riders already recorded |
| rm-116 branch protection fill | high | high | S | GATED — CI-dark; cannot validate enforcement while Actions is dead |
| rm-831 outage watch | medium | low | S | OWNED unlanded by run-ba5f6d7ddd67 |
| rm-153/838-852/853-856/895-897 bands | mixed | — | — | EXCLUDED — unlanded sibling bands (633717c23b19 PR 535; e5b718478274; 4474e5ab) |

## Fleet collision diligence (first-hand this phase)

- Spool sweep for `rm-899` claims: only this run's artifacts. Census-doc content sweep: every other container-cve-census mention in the spool is landed-history rider prose, not a trixie re-derivation build.
- Open PRs (15): PR 535 (633717c23b19, rm-838-852 + sse-reader + listener), PR 534, PR 533 (fetch-timeout + guard test) — none touches the census doc. ROADMAP/guard-test overlap is the standard conductor union at integrate.
- The 1.9.0 lane: `implement-cb6061a358f2-0805faf1.patch` verified (22 files incl. version.ts, operator-stream.js + d.ts, run-responses/run-status, operator-copy, sse-reader, server.ts, window fixtures, deps interlock, batch doc). Adopt-by-content at integrate under one-meaning-one-id with the rm-850 claim; the observability slice (rm-870/872) stays with 33ede5's carrier.

## Contract-1.9.0 escalation disposition (records the fired trigger)

fro-bot/agent v0.119.0 (2026-10-09T23:07:49Z) pins contract 1.9.0 and gates gateway deployment on dashboard support (research first-hand). The escalation rider + mint landed in this run's roadmap patch (rm-157 rider, rm-898). The implementation exists unlanded (cb6061a3); the dashboard-side window flip therefore rides the integrate lane, not a new build. Nothing further for this cycle's implement phase.

## Implement guidance (next phase)

1. Apply the composed carrier (this patch) at ae9ee8e; rebase if integrate moved the tail.
2. Author the dated trixie census section; cite: SARIF composition (49 open: 36 util-linux family + CVE-2025-69720 ×3 + CVE-2026-16742 ×2 + 54369 + 9538 + 6 Scorecard rows), Debian tracker rows (all four: `trixie] - util-linux <no-dsa> (Minor issue)`), the docker probe (Installed == Candidate, no fixed version), and the watcher state (tripwire digest mismatch rm-779-family deferral + Actions outage freezing base-drift weekly).
3. Flip rm-899 to implemented with a rider; re-derive the census count; run the staged battery (census script, roadmap guards, lint; docs-only change needs no full vitest rebuild, but a green `pnpm lint` is mandatory for the yml/md rules).

## Verification recipe for the integrator

`git apply --check` the composed carrier at a clean ae9ee8e tree; apply; `node scripts/roadmap-census.ts` (254 defs / 0 dups / max rm-899, statuses: rm-899 open); `vitest run test/roadmap-integrity-guard.test.ts test/roadmap-prose-residue-guard.test.ts test/roadmap-length-guard.test.ts` green; `pnpm lint` 0 errors / 10 warnings baseline. Reverse-apply restores pristine.
