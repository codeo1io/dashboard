---
title: Supply-chain release-age gate time-gates fresh npm versions — schedule lockfile refreshes by maturity timestamp
date: 2026-09-25
category: docs/solutions/workflow-issues
module: tooling
problem_type: workflow_issue
component: development_workflow
severity: medium
tags: [pnpm, minimum-release-age, lockfile, dependency-refresh, supply-chain, rm-133]
applies_when: planning or executing an in-range dependency refresh, or pinning a manifest version that was published within the last 24 hours
---

# Supply-chain release-age gate time-gates fresh npm versions — schedule lockfile refreshes by maturity timestamp

## Context

`pnpm-workspace.yaml` carries the supply-chain gate `minimumReleaseAge: 1440`
(rm-133): pnpm refuses to resolve any package version younger than 24 hours.
The gate is the repo's defense-in-depth against freshly-published compromised
packages, so bypassing it (`--force`, config edits) is never the right move.

During the 2026-09-25 cycle-1 batch (run 4e7c674, rm-186), the planned
in-range refresh targeted hono 4.13.9 and vite 8.3.1 — both published
2026-09-24. `pnpm update` silently resolved to the newest **mature** versions
instead (hono ^4.13.8 floors; vite stayed 8.3.0), so the batch landed "partial"
without any error pointing at the gate.

## Guidance

- **Derive publish + maturity timestamps before scheduling a refresh.**
  `npm view <pkg>@<version> time` (or the registry's `time[version]` field)
  gives the publish time; add 24h for the `minimumReleaseAge: 1440` maturity
  point. If maturity is in the future, the item is time-gated — record the
  exact unlock timestamp in the roadmap item (see rm-186's status line for the
  pattern) and schedule the refresh for the next cycle instead of retrying
  blind.

- **A silent no-op is the failure mode, not an error.** When a requested
  version is underage, resolution falls back to the newest mature version
  with no gate-specific message. Verify the resolved version after
  `pnpm update` (`pnpm list <pkg>`, lockfile grep) rather than trusting the
  command's exit code.

- **Manifest pins to an underage version don't stick.** Editing
  `package.json` to the fresh version and re-installing leaves the lockfile at
  the mature version — the manifest then overstates the lockfile. Either wait
  for maturity or land the manifest pin together with the lockfile move after
  the timestamp passes.

- **The right next-cycle rider is fully derivable.** When an item lands
  partial, the roadmap signal should carry: the blocked versions, their
  publish timestamps, their maturity timestamps, and the exact command to run
  (`pnpm update hono vite` plus the manifest pin). rm-186's 2026-09-25 update
  is the worked example — both timestamps passing turned the item into a
  ready next-cycle rider with zero re-research.

## Applicability

This applies to any in-range dependency refresh, dependabot-style pin bump,
or urgent hotfix adoption of a just-released version. The gate will keep
doing its job; the only question is whether the batch planned around it.
Major-version pins additionally ride the rm-133 2026-10-21 decision gate.

## Related

- rm-133 (minimumReleaseAge supply-chain gate, major-pin decision 2026-10-21)
- rm-186 (the partial-landing item this was learned from; hono 4.13.9 /
  vite 8.3.1 matured 2026-09-25T01:32Z / 12:26Z)
