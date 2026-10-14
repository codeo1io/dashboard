# Dependency sweep — standing cadence

Last verified: 2026-10-15 (run 9c5a7d19155c cycle:3, rm-1438 + rm-196)

The fork's Dependabot config (`.github/dependabot.yml`) is nominally the dependency
automation, but its PR lane has been non-productive: exactly one pull request ever
(#345, jsdom 26 → 27, opened 2026-05-28, closed unmerged, never retried) as of
2026-10-15, while in-range refreshes repeatedly go un-PR'd. Until that root cause is
resolved (tracked at rm-1437, fed by the anomaly note below), the standing cadence in
this runbook is the owner of record for dependency currentness.

## Cadence and trigger

- **Standing review:** every repository-maintenance cycle's assess phase re-runs the
  lane probes (see Verification below) and records drift in its findings.
- **Sweep trigger:** any of — an open Dependabot alert with no matching open PR; an
  in-range refresh older than ~30 days; a dated roadmap rider (e.g. Node LTS
  transitions, toolchain-major windows) naming a prerequisite baseline.
- **Land the sweep as a lockfile rider:** the sweep is a small, single-purpose
  landing that cites its roadmap row(s) (currently rm-196 for in-range refresh,
  rm-1438 for this cadence) and ships the full local gate set green.

## Procedure

1. Probe drift: `pnpm outdated -r` (or `npm view <pkg> version` for exact pins) against
   the registry. Only **in-range** updates are in scope — majors are explicitly out
   (rm-108 / rm-133 / rm-271 own the major-upgrade ladder).
2. Honor **`minimumReleaseAge`** (1440 minutes, `pnpm-workspace.yaml`; mirrored in
   `.github/dependabot.yml`). A release inside the window is held, not taken: pnpm
   enforces this on `pnpm update` itself. Example proven live 2026-10-15:
   `@playwright/test` 1.64.1 (published 2026-10-14T11:58Z) was inside the window, so
   the sweep took 1.64.0 and left 1.64.1 as the next sweep's target.
3. Apply: edit exact pins in `package.json` (same-major only), then
   `pnpm update <names...>` for range packages. Floor-raises of declared ranges are
   acceptable when same-major (rm-196 acceptance wording).
4. **Playwright lockstep:** any `@playwright/test` bump MUST be paired with the
   visual-regression container image digest at `.github/workflows/visual.yaml`
   (`mcr.microsoft.com/playwright:vX.Y.Z-noble@sha256:…`). Fetch the digest:
   `curl -sI -H 'Accept: application/vnd.oci.image.index.v1+json' \
   https://mcr.microsoft.com/v2/playwright/manifests/vX.Y.Z-noble | grep -i docker-content-digest`
5. Gates: `pnpm install --frozen-lockfile`, `pnpm check-types`, `pnpm lint`,
   `pnpm build:web`, focused vitest for touched surfaces (full suite at the merge gate).
6. Postcondition: `pnpm outdated` shows the touched names at in-range latest.

## Stall tripwire (out-of-band)

The alert-vs-PR comparison lives OUTSIDE this repository on purpose: an in-repo watcher
dies with the CI pipeline, and this account's Actions run-creation has been dark since
2026-10-09. The fleet-side script
(`conductor-delegate-spool/scripts/dependabot-stall-tripwire.sh`) compares OPEN
Dependabot alerts against OPEN Dependabot-authored PRs:

- alerts > 0 and no PRs → **STALLED** (exit 1) — the lane failed to convert an alert;
- alerts > 0 and PRs present → **GREEN**;
- alerts = 0 → **UNKNOWN, not GREEN** (exit 2): a zero-alerts readback cannot
  distinguish a clean lane from a dead creator — resolve by pairing with the
  standing-review drift probe above and the #345 history.

The script carries a `--fixture` mode (canned alert/PR JSON) used to prove the STALLED
verdict end-to-end (forced-red); re-run that proof when touching the script.

## Anomaly note — PR #345 (feeds rm-1437)

Search API `repo:codeo1io/dashboard is:pr author:app/dependabot` returns exactly one
result ever: #345 (jsdom 26 → 27, 2026-05-28, closed unmerged, never retried). PR
creation is GitHub-side, so the 2026-10-09+ Actions run-creation outage does not
explain it, and `.github/dependabot.yml` has been present and enabled throughout —
the config header's claim to be the fork's dependency automation is unmet.
Distinguish (a) repo-side PR-creation health (this file, the config, the alerts
endpoint) from (b) account-level outages before concluding anything; rm-1437 owns the
root-cause ladder.
