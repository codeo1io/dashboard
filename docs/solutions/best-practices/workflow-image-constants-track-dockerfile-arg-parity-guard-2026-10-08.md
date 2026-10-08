---
title: Workflow image-tag constants must track the Dockerfile ARG — pin the pair with a parity guard
date: '2026-10-08'
category: best-practices
module: dashboard
problem_type: prevention
tags: [ci, docker, workflows, parity, cve-tripwire, image-pinning]
component: .github/workflows/cve-tripwire.yaml
---

## Rule

When a workflow pins a container image by tag (e.g. `NODE_IMAGE: node:24-trixie-slim`)
and the Dockerfile independently pins the same image by `ARG …@sha256:<digest>`, the
two surfaces MUST be tied by a parity guard — a test that asserts the workflow tag
equals the Dockerfile ARG tag AND simulates the workflow's digest-lookup
precondition byte-for-byte. This repo's fence is `test/workflow-image-parity.test.ts`.

## The failure this prevents

Rotating the Dockerfile base image (here `node:24-slim` → `node:24-trixie-slim`,
digest `sha256:173f1258…`) without the workflow constant following silently blinds
the workflow's digest-grep precondition: the grep for `<workflow-tag>@sha256:<64-hex>`
matches nothing and the job exits 1 deterministically on its next scheduled fire —
red for a reason that has nothing to do with the vulnerability gate it guards. Before
the parity guard existed, that drift was discoverable only by reading both files side
by side or by waiting for the Monday 06:53Z cron to fail.

## Mechanism

- `Dockerfile:34` — `ARG NODE_IMAGE=node:24-trixie-slim@sha256:173f1258…` is the
  single source of truth for the node image tag+digest.
- `.github/workflows/cve-tripwire.yaml:35` — `NODE_IMAGE` must carry the same TAG so
  the digest grep (`:56`) can resolve the pin and the fixed-only gate
  (`:80-107`) can compare against live Trivy output.
- `test/workflow-image-parity.test.ts` — fails on any drift: workflow node:24 tag ≠
  Dockerfile ARG tag, digest-grep simulation returning empty, or `runs-on`
  uniformity breaking. It reads both files as text, so it has no import edge on the
  workflow — it is a batch-acceptance suite, NOT selected by impacted-test mapping
  (see the targeted-runner blind-spots doc); run it explicitly in focused batches.

## Applying the rule elsewhere

Any pairing of "tag constant in CI" × "digest pin in Dockerfile/manifest" needs the
same fence: trivy-based tripwires, release builders, devcontainers. The guard should
assert tag equality and the resolvability of the digest from the pinning file — tag
equality alone misses a workflow that re-derives its own digest.

## Verification recipe

Grep the Dockerfile for the workflow's tag and require a 64-hex digest to resolve:

```sh
grep -oE "node:24-trixie-slim@sha256:[0-9a-f]{64}" Dockerfile
# pre-cure control: grep for the OLD tag returns EMPTY — that is the exit-1 path
```

`actionlint` (container form) stays the syntax gate; the parity suite is the
semantic gate. Recorded from repository-maintenance cycle:1, run
`8521c80a2583448594f57380855a6b50` (CU1; ledger rm-648, riders carry the validation
outcomes).
