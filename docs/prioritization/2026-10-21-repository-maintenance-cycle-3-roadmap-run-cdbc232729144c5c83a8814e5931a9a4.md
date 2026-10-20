---
module: dashboard
tags: [repository-maintenance, cycle-3, roadmap, rm-2152, rm-2153]
problem_type: maintenance-roadmap
---

# Repository-maintenance cycle 3 — roadmap record (2026-10-21, run cdbc2327)

Roadmap extension for the repository-maintenance cycle-3 run
cdbc232729144c5c83a8814e5931a9a4 (roadmap attempt 4a73f3b3126740f5b802226e7ac79eb1),
at base 76005aa == origin/main. Consumes this run's assess (adversarial,
whole-tree, gates first-run green) and research (9a57744ce565490caa84b830e1bcc567:
absorb-window re-probe, npm registry sweep of 30 packages, gh api releases for 15
action/tooling repos, digest-to-tag resolution of all 15 repo pins) without redoing
them.

## Mints

Two fresh lanes, minted above the all-lineage unlanded frontier (sibling walls hold
the rm-2033-2037, rm-2119-2122, rm-2135-2138 bands and the rm-2139-2141 maxima;
verified free across every run-* worktree before minting):

- `rm-2152` — base-drift truth pass: the drift job resolves the live
  `node:24-slim` digest but loops over every `sha256:` pinned in the Dockerfile,
  whose pins are `node:24-trixie-slim` and `oven/bun` — so the job is red by
  construction whenever it runs (run 39494944829), while the workflow_run fallback
  legs (rm-1961) skip the drift job entirely, making green conclusions carry zero
  drift evidence. Acceptance: tag-matched readbacks per pin with a parity table, a
  workflow-statics test pinning the inspect pairs, one full-green drift run.
- `rm-2153` — unregister the ghost lockfile-guard workflow registration:
  gh api workflows/375606447 returns state=active pointing at the
  workflows/lockfile-guard.yaml slot under .github/ while that path has zero commits
  in the landed ancestry. Acceptance: one-time gh api DELETE (or tombstone add-then-delete),
  404 re-read, runbook record; no workflow file added to the tree.

## Riders (evidence refreshes on existing defs)

- `rm-252` — window re-measured: behind=32, ahead=371, releases through 2026.10.59,
  tip f37600d3; contract advanced twice in-window (#672 1.12.0, #685 1.13.0 —
  ceiling re-derivation owed to 1.13.0); fro-bot/agent v0.125.0 released vs the
  v0.123.1 pin; upstream's five-file actions-major sweep (#688) and authored
  test-stack migrations (#694/#695/#692/#691/#693); wiki-writer #675 stays
  excluded; #678/#679 already fork-side patch-equivalents.
- `rm-1451` — fresh 15-pin census: actions/checkout cured (all 19 sites at the
  single v7.0.1 digest), remaining stale pair is setup-node v7.0.0 at
  release-channel.yaml:55 and setup-qemu v3.7.0 at release.yaml:194 (latest
  v4.4.0; the docker-org /latest endpoint under-report healed).
- `rm-860` — the pure-ecosystem framing is half-false now: upstream authored the
  vitest 5 / jsdom 30 / jest-dom 7 / vite-plugin-pwa 2 migrations, so port recipes
  exist; TS 7.0.2 remains blocked (typescript-eslint 8.72.0 peers typescript below
  6.1.0, re-verified live); @types/node 26 stays gated on rm-139.
- `rm-1961` — verification datum arrived: schedule run 39240720940 completed
  success 2026-10-19T10:53:50Z, the first green scheduled canary ever; the
  canary.yaml:18 never-fired comment is now false (one-line fix owed); the status
  flip stays owed at landing verification.

## Gate record

Executed in the run worktree after the edits (node_modules re-established with
`bun install --frozen-lockfile`, 807/869 no changes):

- `node scripts/roadmap-census.ts` -> `327 defs / 0 dups / max rm-2153`
- `node scripts/roadmap-ledger-check.ts` -> rc=1, the two pre-existing
  PROVEN-STALE claims only (rm-1523, rm-843 — informational, non-gate), unchanged
  in kind, line-shifted by the rider insertions
- `npx eslint ROADMAP.md` -> rc=0
- roadmap guard suites via `node_modules/.bin/vitest run` (targeted): recorded in
  the phase result evidence refs

## Deliverables

- `ROADMAP.md` — 2 new candidate defs (`rm-2152`, `rm-2153`) and 4 evidence
  riders (`rm-252`, `rm-1451`, `rm-860`, `rm-1961`), +16 lines, left uncommitted
  for the landing pipeline

Post-mint census: 327 defs / 0 dups / max rm-2153.
