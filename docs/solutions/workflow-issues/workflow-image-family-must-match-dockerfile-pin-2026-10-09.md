---
title: Digest-resolving workflows must match the Dockerfile image-name family
date: 2026-10-09
category: workflow-issues
module: dashboard
problem_type: workflow_issue
tags: [ci, github-actions, cve-tripwire, dockerfile, base-image, pin-parity, digest-pinning]
component: ci_workflows
---

# Digest-resolving workflows must match the Dockerfile image-name family

## Problem

Two surfaces in this repository encode the same fact — the base-image
family — in two places with no parity check between them:

- `Dockerfile` pins the family + digest:
  `ARG node:24-trixie-slim@sha256:173f1258…` (re-pinned bookworm → trixie
  at commit ad8f21e, 2026-10-07).
- `.github/workflows/cve-tripwire.yaml` resolves its base image at runtime
  by grepping the Dockerfile for `$NODE_IMAGE@sha256:<64 hex>` with
  `NODE_IMAGE: 'node:24-slim'` still set to the pre-repin name.

The grep matched nothing after the re-pin, so the workflow's
`Resolve pinned digest` step exited 1 **before trivy ever ran**. Because
the tripwire is schedule-only (first scheduled fire Mon 2026-10-12 06:53Z;
the workflow had never executed — `total_count: 0`), the break was
invisible to every CI gate and would have surfaced as a deterministic red
on the first cron fire:

```
grep -oE "node:24-slim@sha256:[0-9a-f]{64}" Dockerfile   # → empty
```

## Root cause

A name-only grep cannot fail at lint time — actionlint validates workflow
syntax, not cross-file string parity — so the defect class only fails at
runtime, and a never-yet-fired scheduled workflow has no runtime before its
first cron. Changing a Dockerfile image pin without sweeping every workflow
consumer of that image *name* leaves a time bomb with a cron fuse.

## Solution

Cure (2026-10-09, run c37a857620e1, adopted by content from the unlanded
9fd8bcad lane's rm-755): align the family in the same change as any pin
move —

```diff
-        NODE_IMAGE: 'node:24-slim'
+        NODE_IMAGE: 'node:24-trixie-slim'
```

Validated green in the full battery (ephemeral CI PR #453, 10/10 checks).
The Hub digest for `node:24-trixie-slim` equals the pinned `173f1258…`,
so the resolve step now finds the pin.

## Prevention

- **Any Dockerfile base-pin change must sweep the workflow consumers of the
  image name in the same change**: `grep -rn 'node:24' .github/workflows/`
  and `grep -rn NODE_IMAGE .github/workflows/` before landing the pin.
- **Adopt the parity fence** — a `workflow-image-parity` test that parses
  the workflow(s) and the Dockerfile and asserts the image-name family
  matches (exists in the unlanded 8521c80a lane as
  `test/workflow-image-parity.test.ts`; next-cycle adoption candidate), so
  the pair is CI-pinned instead of runtime-discovered.
- **Treat a never-yet-fired scheduled workflow's first fire as an
  acceptance test**: trigger the `workflow_dispatch` proof from main at
  landing time, not after the cron reds — a schedule that has never run
  proves nothing until it does.
- Failure signature for triage: `Resolve pinned digest` exits 1 with an
  empty grep output; check `grep -oE "$NODE_IMAGE@sha256:[0-9a-f]{64}"
  Dockerfile` first.

## Related

- `docs/solutions/best-practices/container-cve-census-2026-09-25-no-fixed-versions.md`
  — the standing container-CVE census the tripwire watches over.
- `docs/solutions/best-practices/trivy-base-image-alerts-unfixable-by-design-2026-08-30.md`
  — why trixie rows stay unfixed and the watch is document-and-watch.
- ROADMAP rm-689 (sweep owner), rm-648 (time-box + cure-owner resolution),
  and the 9fd8bcad lane's rm-755 (cure artifact provenance).
