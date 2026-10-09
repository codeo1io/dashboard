---
title: zizmor workflow-SAST gate — container pin, dated baseline, and the line-anchor off-by-one
date: 2026-10-09
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - Adding/adjusting rules.<id>.ignore entries in .github/zizmor.yml
  - A baselined zizmor finding suddenly failing the Check Workflows job
  - Choosing a container pin for zizmor (the woodruffw image is stale)
  - Re-baselining after editing a workflow that has accepted findings
tags: [supply-chain, ci, github-actions, security-audit, zizmor]
---

# zizmor workflow-SAST gate + baseline (rm-799)

## What landed

A zizmor step in the `check-workflows` job (`.github/workflows/main.yaml`),
right beside the actionlint step — same house conventions: container form
(assumes nothing from the runner image), exact version pin, explicit
`--config`. actionlint checks workflow syntax/schema; zizmor audits
workflow-security semantics taint-style (template-injection,
cache-poisoning, github-app, excessive-permissions, self-repository, …).

Baseline file: `.github/zizmor.yml` — every finding present at landing is
triaged there with a dated disposition; anything not baselined fails the
gate (no fail-on-fresh noise, mirroring the cve-tripwire's
standing-unfixed posture).

## Trap 1: the official image moved orgs — the woodruffw tag is stale

`ghcr.io/woodruffw/zizmor` stops at 1.7.0 (the Python era) — **no v1.30.x
container exists under that path**. The project moved to `zizmorcore`:

```
ghcr.io/zizmorcore/zizmor:1.30.1@sha256:a2eb396d886c053073405c7a980f2139ba2248ec172243cfa3841e57196e8101
```

`name:tag@digest` is accepted by `docker run` and double-pins the image
(tag checked, digest enforced).

## Trap 2: config ignore line anchors are the DISPLAYED line (off-by-one vs --format json)

`rules.<id>.ignore` entries are `file[:line[:col]]`. The line must be
zizmor's **displayed** 1-based line — the `--> .github/workflows/foo.yaml:402`
anchor from its text output. If you derive anchors from `--format json`
instead (as a first pass did here), every entry is **one line short** and
silently matches nothing while file-level entries (bare `'main.yaml'`)
work fine, which makes it look like the config half-loaded.

Mechanism (zizmor 1.30.1, `crates/zizmor/src/config/mod.rs::ignores`):
the rule compares `rule.line == start_point.row + 1` against the JSON's
0-based row, i.e. entry-line = json-row + 1 = the text output's line.

Also relevant: **one matching anchor ignores the entire finding**,
including its secondary locations (route-step, subfeature, …) — you only
ever need the primary anchor, not every row the finding touches.

## Trap 3: inline discovery vs --config

Without `--config`, zizmor discovers `.github/zizmor.yml`/`zizmor.yml`
near the scanned inputs. With an explicit `--config`, **no other config is
discovered or loaded** — the gate's invocation passes
`--config /repo/.github/zizmor.yml` explicitly, so the baseline is
deterministic regardless of where it runs from.

## Baseline policy

- `self-repository`: file-level ignores (uniform class — all
  `./.github/actions/setup` composite-action uses; this fork consumes
  them only from its own checked-out tree). File-level is also immune to
  line shifts.
- Everything else: line-pinned to the primary anchor with a dated
  disposition comment. `excessive-permissions` (base-drift `issues:
  write`), `github-app` (release token scope), `cache-poisoning`
  (release build cache), and the `template-injection` set
  (repo-owned-context interpolations on maintainer-only triggers) are
  accepted-as-designed; scope-down refinements are candidates for a later
  cycle, recorded in the baseline's comments.

## Re-baselining recipe (a baselined finding goes red after an edit)

1. Run the exact gate command locally; read the `--> file:line:col`
   anchor of the red finding.
2. If the finding is the same accepted one, just shifted: update the
   entry's line in `.github/zizmor.yml` in the same change.
3. If it's new: triage it — fix the workflow or add a dated entry with a
   disposition. Never delete an entry without a disposition trail.
4. Re-run to `No findings to report (N ignored, 50 suppressed)` and rc=0.

## First-run census (2026-10-09)

74 raw findings: 24 unsuppressed (5 high, 8 low, 11 informational), all
triaged into the baseline; 50 persona-suppressed internally. Gate green
on first run, rc=0, alongside actionlint rc=0.
