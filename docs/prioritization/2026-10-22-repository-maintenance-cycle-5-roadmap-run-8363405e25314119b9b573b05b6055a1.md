# Repository-maintenance cycle:5 roadmap record — run 8363405e25314119b9b573b05b6055a1

Date: 2026-10-22. Requirement: `repository-maintenance:1f463c9c1bf3422789a9cb1865f036f7:cycle:5`.
Roadmap attempt `b47bab9b3d5c4a4ca5741b4b2f7721ff`. This record grafts the cycle's
assess (`6b3c902de7c3426286c8e50a0fa29757`) and research
(`86cedaac331d4a67aeb6c4b668c276f8`) evidence into `ROADMAP.md` at base `8597282`
(== `origin/main`, porcelain clean at compose). No test/validation command beyond the
guard battery below was executed for this record.

## Batch (six mints + four riders, band rm-2206–rm-2211)

Mints (each verified content-unowned on `origin/main` and across every conductor
run wall before minting; band sits above the 2026-10-21/22 fog ceiling — the
`42466e744796` wall renders max rm-2204 with a next-free note at rm-2205):

1. **rm-2206 — wiki-write exclusion guard covers the relocated server-side
   surface.** `test/fork-exclusion-guard.test.ts:45-58` still guards the
   `wiki-writer/`-era names only, while upstream #705/#708/#709 moved the write
   capability into `src/wiki/**`, the `src/routes/wiki` route, the write client
   in `src/github/fro-bot-app-client`, `web/src/wiki/**`, the `Wiki*` views,
   the `web/src/api/wiki` client, and a published `@fro.bot/wiki-write-core`
   `0.1.3` dep.
   Acceptance: guard path-absence checks + `package.json`/`bun.lock` denylist +
   AGENTS.md invariant re-derived lockstep + one machine-readable path list +
   negative-test proof.
2. **rm-2207 — cve-tripwire lane cure.** jq `.. | .Vulnerabilities[]?` exits 5 on
   non-object nodes (reproduced this cycle; sites `cve-tripwire.yaml:90/94/104/110`;
   2/2 runs ever red). Fix to `.. | objects |` + unify `TRIVY_VERSION` to `v0.76.1`
   across `cve-tripwire.yaml` and `release.yaml` + repair the false `:7` mirror
   comment. (The 2026-10-19 rm-2090 mint for the jq bug never landed — zero
   mentions on main — so this is not a re-mint.)
3. **rm-2208 — base-drift compare truth.** Per-image digest matching (each `FROM`
   pin vs its own tag), recency dedupe that does not count skip-suppressed
   successes (run `39756796415` skipped both compare jobs while the live
   `24-trixie-slim` digest `43b9ba1` diverged from the `Dockerfile:16` pin
   `7f486cab`), and a same-batch re-pin with truth-fire proof.
4. **rm-2209 — debris retention automation.** Wire the existing, tested, but
   invocation-less `scripts/sweep-stale-conductor-refs.ts` +
   `scripts/conductor-pr-janitor.ts` to a weekly dry-run workflow; extend
   retention to `refs/preserve/` (453 heads / 427 preserve / 5 stale PRs on
   origin, +8/+5 in two days; `refs/preserve` has zero roadmap mentions before
   this def). Apply stays behind rm-742's sanctioned push gate.
5. **rm-2210 — structural carrier/doc gates.** Make the roadmap
   `## Deliverables` check non-opt-in (the 2026-10-21 `6abf380ea73b` carrier has
   none) and enforce solutions-doc ↔ `README.md` index same-commit landing (the
   fresh `7bbc86e` Main failure at the docs-solutions-index guard's orphan
   check).
6. **rm-2211 — release-channel power decision.** The CalVer pipeline is complete
   but unpowered (`HAS_RELEASE_APP` false → `gh release create` silently skips).
   Deliverable is the DECISION: provision the App, re-gate on `GITHUB_TOKEN`
   with `contents: write`, or record dormancy through rm-740's existing seam.

Dated riders: rm-252 (window 12-behind through `2026.10.68`; deps-only absorb set
file-exact and all-latest — agent `v0.125.1`, trivy `v0.76.1`, codeql `v4.39.1`,
node digest `43b9ba1`; #706 renovate-only N/A; pin-parity bundle named),
rm-259 (exclusion surface re-derived first-hand; recipe reconciles into rm-2206 at
fold), rm-1961 (skip-suppression re-proven live while real drift stood), rm-139
(`v26.12.1` still lts=false; the 2026-10-28 gate stays timed).

Deliberately NOT minted: license (owned by the mirror-upstream def), renovate
switch (rm-136 doctrine), Node-26 adoption (lts=false at gate), scorecard
Maintained/Code-Review zero-fix (structurally out of reach single-operator).

## Deliverables

- `ROADMAP.md`
- `docs/prioritization/2026-10-22-repository-maintenance-cycle-5-roadmap-run-8363405e25314119b9b573b05b6055a1.md`

## Verification

Guard battery in the run worktree after the graft: census
`333 defs / 0 dups / max rm-2211`, ledger-check stale set unchanged
(the pre-existing PROVEN-STALE pair only), roadmap-integrity/length/render guards
green, eslint clean on `ROADMAP.md` and this doc. Exact commands and outputs are
recorded in the roadmap phase result
`delegate/b47bab9b3d5c4a4ca5741b4b2f7721ff.json`.
