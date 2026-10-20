# Repository maintenance cycle 4 — roadmap (run `16f30f8b851946f896f55018137120eb`)

## Run

- Base `76005aa` == `origin/main` at compose (fetch clean, no drift since the assess). Cycle lineage: assess `814a37c0` (gates all green at tip) → research `f09e9de1` (window + ecosystem probes, wall-collision screen) → this roadmap `87053032`.
- Method: ce-ideate adapted to the delegate surface; every candidate probed against the main ledger and all 18 dirty sibling worktree walls before minting (mint-dedup rule honored throughout).

## Mints (1)

- `rm-2141` (docs, 30.0, candidate) — runbook truth: `docs/runbooks/release.md:28` (outage class-B row) still says the lockfile-pair check is "manual until it is restored", while `.github/actions/setup/action.yaml:50` runs `bun install --frozen-lockfile` in every CI run through the shared composite, so a lockfile/digest mismatch fails CI immediately. Acceptance: the row is truthed (composite named as the standing automatic pair check; dropped-workflow history kept era-qualified), `bun run lint` rc=0, roadmap guards green. Sources: assess `814a37c0` finding 3; research `f09e9de1` R2 — both file reads first-hand 2026-10-21; wall grep for the row and the phrase returned zero hits.

## Riders (4)

- `rm-252` — window re-measure: behind_count 32 at fetch 2026-10-21T00:06:04Z; the +1 is upstream `f37600d3` (2026-10-20T23:23:10Z) pinning fro-bot/agent v0.125.0 (#696), collapsing the pin-target choice to one (upstream-parity == ca-certificates-cured v0.125.0); operator contract re-verified first-hand at the tag = 1.13.0 (fork 1.11.0); upstream release 2026.10.59 predates the commit, so a 2026.10.60 carrying the pin is expected; 0 open upstream PRs.
- `rm-139` — gate premise probe: nodejs.org/dist at 2026-10-21 — v26.12.0 `lts=false`, v24.22.0 Krypton active; the 2026-10-28 flip window is one week out and unmet.
- `rm-742` — growth datum: origin carries 432 `conductor/` refs live (ls-remote count 2026-10-21; the same-day assess counted 435).
- `rm-1960` — correction of record: the sibling-assess hazard reading of `web/src/sw.ts:83` (module-top-level `cleanupOutdatedCaches` deleting the active worker's precache at eval time) is disproven at the pinned workbox-precaching@7.4.1: the function registers an `activate` listener (GoogleChrome/workbox tag v7.4.1, workbox-precaching cleanupOutdatedCaches module, source fetched live 2026-10-21), and activation only fires after install succeeds — the stranding mechanism cannot occur. No def minted; none should be.

## Screened out with owners (mint-prevention)

- Root ErrorBoundary — owned by the triple-contested def in the ledger (a recent assess read it "unowned"; that reading is false). scorecard timeout-minutes restoration — owned unlanded (fog band). apple-touch-icon SVG — `rm-249` rider plus its correction of record. LICENSE — `rm-147` blocked-external. SBOM + build provenance — landed in the release pipeline (`rm-105` closed). setup-qemu major drift — owned def. The dropped guard workflow `375606447` — owned by an unlanded sibling wall def. Roadmap-guard existsSync leg — claimed by unlanded envelope defs. Dependabot comment-rot — folds into the fog residue-rider class.
- Ecosystem quiescence (37 surfaces probed live 2026-10-21): every actions + npm reading was identical to the 2026-10-20 sibling probes; the standing unlanded bumps remain the frontier; Node 26 still non-LTS; TS 7 still peer-blocked; playwright and axe stay rejected/blocked per standing riders.

## Mint band

- `rm-2140` deliberately skipped — reserved for the pending dependabot-darkness candidate per the fleet band discipline recorded 2026-10-21; standing unlanded bands (`rm-2033-2037`, `rm-2129-2134`, `rm-2135-2138`, wall max `rm-2139`) re-probed live at compose.

## Deliverables

- `ROADMAP.md` — extension #52: `rm-2141` mint + 4 riders (`rm-252`, `rm-139`, `rm-742`, `rm-1960`) + the extension comment; census after extension: 326 defs / 0 dups / max rm-2141.
