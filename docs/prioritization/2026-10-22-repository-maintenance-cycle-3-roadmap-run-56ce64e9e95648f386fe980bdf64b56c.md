# Repository maintenance cycle 3 — roadmap band + truthful security surface batch

Run `56ce64e9e95648f386fe980bdf64b56c` (repository-maintenance cycle:3), base `02146a1`, roadmap band `631bcc5f` + implement `c4e413917`. Carries the band minted by this run's roadmap phase and records the batch selected by prioritize `5f8bfe77` ("truthful security surface 3") from assess `d73c472c` and research `7e758522`.

Band note: the roadmap phase's spool patch was swept before implement, so the band was reconstructed in-content at implement — same mint id (rm-2310), same 16 riders, census verified live after the graft.

## Selected batch (8 change-units)

- Band — mint `rm-2310` (fork-exclusion guard re-derivation, implemented same batch), 16 riders, promotions of `rm-1524`, `rm-856`, `rm-259` to implemented.
- U1 — security.txt runway: `src/server.ts` `Expires` refreshed to `2027-01-24` ahead of the 2026-10-25 floor crossing (rm-673 rider, rm-245 cadence).
- U2 — cve-tripwire revival: the four jq filters at `.github/workflows/cve-tripwire.yaml:90/:94/:104/:110` gain the objects guard (`jq '[ .. | objects | .Vulnerabilities[]? ]'` — the postfix `?` alone guarded only the iteration, so jq exited 5 before any verdict; both ever-run gate runs were red), and `TRIVY_VERSION` unifies to `v0.76.1` together with `.github/workflows/release.yaml:384/:423`, killing the triple-split (rm-1961 rider).
- U3 — base-drift honest watch: dedupe counts only runs whose compare job genuinely ran green (skip-suppressed successes no longer mask fires), main-branch and dispatch fires always compare, and the compare step derives every image family's live tag from the Dockerfile's own pinned refs instead of a hardcoded `node:24-slim`, comparing each pin against its own family — landing rm-856; the buildx imagetools readback and registry HEAD fallback stay pinned by `test/base-drift-digest-readback.test.ts` (green unchanged).
- U4 — `Dockerfile` `NODE_IMAGE` re-pinned to the live `node:24-trixie-slim` digest `43b9ba1142b8dcf33fa8f922ca1be85714adc444e0586c7cf7726daaeabc1bea`, re-derived live via the runbook's buildx readback with a registry HEAD cross-check so the first honest per-family verdict is green (oven/bun pin deliberately untouched — bun 1.4.4 rides the absorb lane).
- U5 — rm-2310 landing: `test/fork-exclusion-guard.test.ts` re-derived red-first against upstream #705's relocated write surface (wiki tree under src, wiki routes, a wiki-write client in `src/github`, an `@fro.bot/wiki-write-core` dependency in the manifest or lockfile), the AGENTS regex assertion widened, and `AGENTS.md` invariant 1 rewritten in lockstep with `test/prose-residue-guard.test.ts` allowlist updates; rm-259's disposition paragraph delivered by the same prose.
- U6 — `.github/workflows/codeql.yaml` init/analyze digests moved to `9b3254085494b55a0f7c4c2b3d2d52cc712ce370` (`v4.39.1`, verified against the live tag); release.yaml upload-sarif and scorecard.yaml stay at the 6f2ac81 acceptance floor pending rm-888's remaining work.
- U7 — `.github/dependabot.yml` retires only the vitest semver-major ignore arm (vitest 5.0.5 adopted in-tree, full suite green, re-evaluation passed); the typescript arm stays pending rm-271.

## Ledger actions

Mint rm-2310; riders on rm-252, rm-888, rm-133, rm-1961, rm-648, rm-1524, rm-196, rm-856, rm-271, rm-673, rm-139, rm-692, rm-1450, rm-1464, rm-259, rm-1504; promoted rm-1524, rm-856, rm-259. Deferred lanes stay deferred: rm-252 absorb (agent v0.125.1, bun 1.4.4), rm-1464 rulesets, rm-2307 license/first-signed-release, rm-2059 Fro Bot truth-flip, rm-2308 debris, rm-196 vite 8.3.5, rm-271 remaining majors, rm-139 node-26 gate (2026-10-28).

## Deliverables

- `ROADMAP.md`
- `docs/prioritization/2026-10-22-repository-maintenance-cycle-3-roadmap-run-56ce64e9e95648f386fe980bdf64b56c.md`
- `src/server.ts`
- `.github/workflows/cve-tripwire.yaml`
- `.github/workflows/release.yaml`
- `.github/workflows/base-drift.yaml`
- `.github/workflows/codeql.yaml`
- `.github/dependabot.yml`
- `Dockerfile`
- `AGENTS.md`
- `test/fork-exclusion-guard.test.ts`
- `test/prose-residue-guard.test.ts`

## Verification

Focused guard suite green: roadmap integrity/render/ledger/length guards, fork-exclusion guard (red-first proof recorded below), prose-residue guard, security-txt expiry guard, base-drift digest-readback guard, dockerfile-context guard, workflow-hardening guard. Census after this batch: 326 defs / 0 dups / max rm-2310. Red-first proof: a staged wiki path under src and a staged wiki-write-core dependency each turned the fork-exclusion guard red and were removed for green. Full repository-wide gates are reserved for the later validation phase per the work-order budget.
