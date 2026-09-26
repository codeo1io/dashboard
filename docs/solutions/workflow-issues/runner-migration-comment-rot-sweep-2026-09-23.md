---
title: Runner-class migration left six stale present-tense rationale comments narrating the retired topology
date: '2026-09-23'
category: workflow-issues
module: ci
problem_type: stale-documentation
component: [workflows, composite actions, dependabot, AGENTS.md]
severity: low
applies_when:
  - Migrating CI execution topology (runner class, host, pool) while comments narrate the old world
  - Any comment explains WHY an infra choice exists using present-tense claims about current state
tags: [ci, migrations, comment-rot, documentation-hygiene, rm-147-lineage, runner-migration]
---

> **Provenance (2026-09-26 integrate, conflict case 9f604f39):** authored by run 998b4953's
> cycle-7 batch under its lineage id `rm-147`; main's landed rm-147 (blocked-external license)
> owns that id, and the sweep itself CONVERGED with main's landed hosted-era comment truthing —
> every site this doc records now carries main's landed wording, because main later pinned ALL
> workflows to `ubuntu-24.04` (including `base-drift.yaml`), which both falsifies this doc's
> `ubuntu-latest` present-tense framing and MOOTS the recorded KEEP-self-hosted exception for
> `base-drift.yaml` (preserved below as authored history; the batch doc's landing header maps
> the disposition). What SURVIVES from this doc is the standing rule: on any topology change,
> sweep the narrated-rationale corpus repo-wide with NO path or extension scope — the scoping
> lesson is general and re-learned twice on main's side too.

# Problem

The d73fbe7/aa9937f migration moved all fork CI to GitHub-hosted
`ubuntu-latest` (ending the single-self-hosted-runner era), but the comments
narrating that era survived as present-tense claims: `codeql.yaml` ("Runs
self-hosted per PR #1 policy"), `main.yaml` (pipx "self-hosted runner"
rationale), `release.yaml` (buildx version note), `AGENTS.md` ("the ONE
self-hosted runner"), `.github/dependabot.yml` (grouping rationale), and —
discovered only during the sweep — `.github/actions/setup/action.yaml`
(pnpm-store persistence on a self-hosted runner). Six sites in six files,
all false at the migrated tip.

The implement-phase sweep was scoped to `.github/` + `AGENTS.md`, and that
scope HID four more stale sites — `vitest.config.ts:10`,
`web/vitest.config.ts:13`, `test/dockerfile-context.test.ts:12`, and a
borderline historical test name at `test/fork-exclusion-guard.test.ts:52` —
found only by independent review's repo-wide grep. Ten sites total, all
truthed by the end of the review round.

Why it matters beyond cosmetics: every stale "we run on X because Y" comment
is a landmine for the next maintainer (and the next agent) reasoning about
build reproducibility, tool availability, or cache locality from the
documentation instead of the config.

# Root cause

Migration commits changed `runs-on:` and tool steps but treated rationale
comments as untouchable prose. Comments age at a different rate than config:
nothing fails when they go false.

# Solution (cycle 7, rm-147)

- Truthed all six in-scope sites to historical framing ("landed during the B5
  self-hosted era", "kept after the ubuntu-latest migration for
  host-independence") — history preserved, false present-tense removed —
  then the review round truthed the four out-of-scope sites the path-scoped
  sweep had missed.
- Recorded the ONE deliberate exception as a decision, not a stale claim:
  `base-drift.yaml` stays `self-hosted` (10m weekly cron, negligible load,
  runner exists) — documented in
  `docs/prioritization/2026-09-23-cycle-7-batch.md` before the workflow's
  first landed cron (2026-09-28) so the runner-class choice is intentional.
  (MOOTED 2026-09-26, see provenance above: main's later ubuntu-24.04 pins
  moved `base-drift.yaml` to a hosted runner as well, so no self-hosted
  exception exists on the resolved tree.)

# Prevention rule

> When changing execution topology, sweep the narrated-rationale corpus
> repo-wide — comment lines included — and rewrite each hit as either history
> (dated, past-tense) or current truth. A path-scoped sweep (`.github/` +
> `AGENTS.md`) hides vitest configs and test files that narrate the same
> era; scope only AFTER the full pass, never INSTEAD of it. Deliberate
> exceptions get a dated decision record in the cycle batch doc — a
> present-tense comment is never the place for a standing decision.

# Detection command

`grep -rn 'self-hosted' . --exclude-dir={.git,node_modules,web/dist,.agents,docs/solutions,docs/prioritization}`
repo-wide post-sweep yields only historical/truthed lines — re-run after any
topology change (no path scope, no extension filter: the extension-less
Dockerfile lesson and the vitest-config lesson both came from scoping).
