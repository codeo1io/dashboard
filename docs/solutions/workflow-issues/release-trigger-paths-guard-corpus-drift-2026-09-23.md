---
title: Release trigger skipped image-affecting changes — workflow paths filter and guard corpus had both drifted
date: '2026-09-23'
category: workflow-issues
module: ci
problem_type: release-gap
component: [release workflow, should-release guard, CI triggers]
severity: medium
applies_when:
  - A workflow uses an on.push.paths filter AND a guard script both decide whether a release runs
  - Any build input (Dockerfile COPY sources, composite actions, workspace/lock config) changes without a release run
tags: [ci, release, guard-drift, corpus-sync-test, rm-144]
---

# Problem

The Release workflow and its `scripts/should-release.ts` guard decide release
triggering in two places: the GitHub-side `on.push.paths` filter (which runs
FIRST and can suppress the workflow entirely) and the repo-side guard corpus
(`isHardReleasePath` in `scripts/should-release.ts`; since the review round
the corpus itself is exported from `scripts/release-paths.ts` as
`HARD_RELEASE_FILE_PATHS` / `HARD_RELEASE_DIR_PREFIXES`). Both listed
Dockerfile, lockfile, the guard itself, and the tag script — but neither listed
`pnpm-workspace.yaml` (carries the security `overrides` and pnpm security keys
and is COPYd into BOTH Dockerfile stages).

A first cut also added `.github/actions/setup/**` on the theory that "every
workflow job runs the composite action" — independent review disproved the
premise (grep `./\.github/actions/setup` across `.github/`: main, codeql and
fro-bot use it; release.yaml has ZERO uses) and the entry was dropped: it
would have triggered full Release runs republishing a byte-identical image.
Only add paths that feed the image or the Release workflow itself.

Consequence: a change to workspace security overrides could alter the shipped
image while skipping the Release workflow outright — the guard never even ran,
because GitHub filtered the event before the job existed. Found by adversarial
assessment (run 998b4953, 2026-09-23) while diffing the trigger surface
against the Dockerfile COPY set.

# Root cause

Two triggering corpora maintained by hand in different files with no test
binding them to each other or to the actual build inputs.

# Solution

1. Extend BOTH corpora together: `on.push.paths` in
   `.github/workflows/release.yaml` and `isHardReleasePath` in
   `scripts/should-release.ts` — one change, both sides (rm-144, cycle 7).
2. Define the corpus ONCE and lock it BIDIRECTIONALLY: the hard-path corpus
   lives in `scripts/release-paths.ts` (pure data, importable — the guard
   script itself has top-level CLI code and must not be imported);
   `isHardReleasePath` consumes it, and `test/should-release.test.ts`
   yaml-parses the workflow's release `on.push.paths` and asserts BOTH
   directions — every corpus entry must appear in the workflow filter (a
   one-sided guard addition re-opens missed releases), and every workflow
   entry must be a known corpus member or a named, commented
   trigger-only-delegated entry (`WORKFLOW_TRIGGER_ONLY_PATHS`: package.json
   is decided by the guard's package-field diffing; pnpm-lock.yaml runs the
   workflow but the guard currently skips lockfile-only changes — a known,
   commented gap, next-cycle candidate). Additions AND removals on either
   side fail CI with a named diff.
3. Behavioral tests pin the intent: `pnpm-workspace.yaml` alone is
   hard-release; directory prefixes match their whole tree (`src/x` yes,
   `srcx` no).

# Prevention rule

> Any repo where a workflow `on.push.paths` filter and a guard script
> co-decide a gate needs a test binding the two corpora file-exactly — and a
> test binding the corpus to the build inputs (everything the Dockerfile
> COPYs into build stages). The platform filter runs before your code: a
> guard cannot compensate for a path the workflow never triggers on.

# Detection commands

- Corpus parity: `node_modules/.bin/vitest run test/should-release.test.ts`
- Workflow validity: `docker run --rm -v "$PWD:/repo" -w /repo
  rhysd/actionlint:1.7.12 -no-color` (bare form — never pass composite
  actions as args)
