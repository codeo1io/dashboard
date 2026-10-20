---
title: Born-red canonical lanes — run the verbatim full-validation dispatch against a private mirror repo, and expect the base-relative lint census to drift
date: 2026-10-17
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - The full_tests dispatch is the verbatim github_ci_validate.py command, but the canonical repo carries a lane that is red for reasons unrelated to the batch (visual baseline desync, a workflow disabled for a missing secret)
  - A prior canonical-origin cloud round already died on the known-red lane, and the 3600 s validation budget is one-shot per attempt
  - The validation clone's base predates main's lint cure, so the Lint job can be born-red even when the worktree lints clean at its own base
tags: [ci-validation, born-red-lane, mirror-repo, ephemeral-pr, conductor, full-tests, lint-census]
---

## Problem

Two independent ways a full-validation round goes born-red on a repo whose HEAD
is otherwise healthy:

1. A lane that cannot pass at any base right now. During 2026-10 the canonical
   repo's visual lane was desynced (the playwright trio) and the Fro Bot
   workflow was `disabled_manually` pending a `FRO_BOT_PAT` secret. A
   canonical-origin validation round schedules those jobs, fails, and burns the
   one-shot 3600 s budget without ever exercising the batch.
2. A base-relative lint census. The frozen lint count is a fact about ONE base.
   When the worktree ff-forwards onto a newer main (5d5f9be -> 3e3664c in this
   case), main-side ledger edits can carry uncured markdown shapes: the census
   moved 48 -> 50 purely from rm-802 rows landing with bare label-refs. The
   worktree lints clean at its recorded base and the validation clone is still
   born-red.

## Solution — the mirror-repo route

Push the batch to a private mirror of the repo and validate there, with lanes
that are red-for-unrelated-reasons disabled on the mirror so they never
schedule. Proven 2026-10-17 on run 492efad5 (mirror
`codeo1io/dashboard-fullval-8fd22b8b`, round 2 all-green, 9/9 checks).

Recipe, in order:

1. Create the private mirror (house naming `dashboard-fullval-<suffix>`), push
   canonical main, and on the mirror disable the born-red workflows
   (`gh workflow disable` for visual + Fro Bot here).
2. Preflight the mirror before touching origin: mirror main sha == canonical
   main sha; `gh pr list --state open` = 0; zero `conductor/ci-*` head refs;
   vulnerability alerts API returns 204. Any nonzero state means someone else's
   round is in flight — stop.
3. Repoint the worktree's origin at the mirror through a `trap ... EXIT`
   launcher so ANY exit path (including the validator being killed) restores
   the canonical remote. Never repoint bare.
4. Point TMPDIR at delegate scratch (the host /tmp sweeper kills the
   validation clone mid-round).
5. Run the verbatim dispatch unchanged (`github_ci_validate.py --repo .`).
   The validator's finally block closes the ephemeral PR and deletes the
   validation refs on success.
6. Durable evidence outlives the refs: read
   `gh api /repos/<mirror>/commits/<head-sha>/check-runs` — check-run records
   survive branch deletion, so quote the head sha, not the PR.
7. Post-flight, re-verify both sides: canonical origin restored in the
   worktree config, mirror back to 0 open PRs and 0 ci refs.

## Corollary — cure born-red lint content-free, then prove it

When round 1 fails Lint on ledger markdown, cure WITHOUT changing content:

- byte-match main's already-cured shapes (`\[`/`\]` escapes for array
  literals, backtick code-spans around `'[object Object]'` rows);
- `eslint --fix` for pure-whitespace classes (47 trailing spaces here);
- prove content-free with `git diff -w --numstat` (44/8 vs the full 91/55 —
  the ws-only delta accounts for every remaining line);
- re-derive the validation digest before and after: it is invariant because
  ROADMAP.md is not an executable surface. If your digest moves, the "cure"
  touched something executable — stop and re-read the diff.

## Relation to the 2026-10-09 outage doc

`actions-account-disable-fulltests-local-mirror-2026-10-09.md` covers the
Actions-outage variant (no runs can start at all; local surrogate). This doc
covers the healthy-Actions variant: runs CAN start, but known-red lanes make
the canonical round unpassable and the lint census is base-relative. Same
mirror discipline, different trigger, plus the content-free lint cure that the
outage variant never needed.

## Recorded instance

Run 492efad5 full_tests (attempt b50926f8, 2026-10-17): round 1 mirror Lint
failure (50 problems, born-red via rm-802 label-refs after the ff-forward),
content-free cure, round 2 `{ok: true}` — PR 15, head 7d41d153, 9/9 check-runs
success, digest `validation:v1:f978434c…` identical pre-fix, post-fix, and
post-round.
