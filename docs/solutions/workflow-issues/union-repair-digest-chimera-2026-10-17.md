---
title: A conflict-repair merge silently fabricated a Docker digest that never existed
date: 2026-10-17
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - A merge conflict touches a pinned digest (Dockerfile ARG values, workflow container pins)
  - A conflict-repair or union-style merge claims to reconcile two competing pins
  - docker buildx fails manifest-not-found for a digest that cites a live tag
tags: [release, docker, digest-pin, merge-repair, supply-chain]
---

# A conflict-repair merge silently fabricated a Docker digest that never existed (2026-10-17)

## Problem

Every Release build on push-to-main failed at the image-build step with
`docker.io/library/node:24-trixie-slim@sha256:173f125896c3…: not found`
(run 38979846409, 2026-10-16), while the tag itself was alive on Docker Hub.
The last green Release was 2026-10-09. Nothing in the workflow or release docs
had changed.

## Symptom shape

- `docker buildx` fails with **manifest unknown / not found** for a digest
  that cites a **live, correct tag** (`node:24-trixie-slim`).
- The digest string does not match ANY historical digest of that tag —
  Docker Hub's registry API (`GET /v2/library/node/manifests/sha256:…`,
  anonymous token) returns 404 for it, not 401/429: the value was never
  published at all.
- Git blame points the line's last change at a **conflict-repair or
  union-style merge** ("repair the three-way union of …", "re-base the red
  gate to green …"), not at a dependency bump.

## Root cause

During the Oct-6→Oct-9 window two conductor lanes landed **competing digest
pins** for the same base image (a `24-trixie-slim` pin and a different-image
pin). The Oct-12/13 fork-only "three-way union repair" merges resolved the
`ARG NODE_IMAGE` conflict by **splicing bytes from both sides**: the resulting
64-hex digest shared its 12-hex prefix with the real shared pin
(`173f125896c3b47ddf056…`) and its tail with the competing lane's digest —
a value that had never existed on Docker Hub. Union-merging a
cryptographically-addressed identifier is meaningless: the result addresses
nothing.

Two independent blind spots let it survive a week:

1. **No release-path verification between Oct 9 and Oct 16** — the Release
   workflow only runs on release-path pushes, so the dead pin sat latent on
   main until the next release-scope landing.
2. **Digest churn looked like the explanation.** The registry really had
   rotated the tag on 2026-10-14 (`last_updated`), so "Docker Hub moved it"
   was plausible — but the real old manifest was still addressable history;
   our value simply was not it.

## Cure

- Re-pin `ARG NODE_IMAGE` to a digest **re-derived from a single named
  source** and probed before merge:
  - upstream's own bump (fro-bot/dashboard #620 →
    `sha256:7f486cabe892bff8fef04c0f7da8dba84a560be3e4e2740b7a86afc57ebec315`), or
  - the live tag digest (`GET …/manifests/24-trixie-slim`, read
    `docker-content-digest`), or
  - a fresh local `docker buildx imagetools inspect`.
  The three must agree byte-for-byte; if they disagree, STOP — one of them is
  not what you think it is.
- Mechanical prevention (pullability check) is owned by the sibling guard
  lane (`rm-1478`, base-drift job): a scheduled job that resolves the pinned
  digest against the registry and goes red on 404. This doc owns the
  **discipline**, the guard owns the **alarm**.

## Discipline (the rule this file exists to record)

> Pinned digests are **addresses, not text**. When a merge conflict touches a
> digest (or any pinned identifier), resolve it by choosing ONE side's entire
> value — then re-verify that value against its source (registry, lockfile,
> upstream diff) before the merge lands. Never union, average, or
> hand-reconstruct an identifier from multiple sides' bytes.

Corollaries:

- A conflict-repair merge that "makes the gate green" on a supply-chain pin
  has not resolved anything — it has fabricated an address. Green ≠ correct.
- `git log -S <digest-prefix> -- <file>` on BOTH sides of the conflict is the
  fastest forensic: if the merged value appears in neither parent, it was
  fabricated by the merge itself.
- The 12-hex-prefix trick generalizes: two 64-hex digests that share a long
  prefix but then diverge are almost never two real manifests — digests do not
  have common ancestors.

## Evidence trail

- Worktree `Dockerfile:16` chimera `173f125896c3|087845bfb…` vs shared-real
  `173f125896c3|b47ddf056…` (both derivable via
  `git log -S '173f1258' -- Dockerfile` across the fork and upstream).
- Registry probes 2026-10-17: chimera → 404; tag → digest
  `7f486cabe892…ec315`; tag `last_updated` 2026-10-14T20:39:52Z.
- Upstream fro-bot/dashboard PR #620 (bfcc69c, 2026-10-14) bumps
  exactly `173f1258…b47ddf056` → `7f486cab…` — proof the old pin was real and
  the fork's value was not a rotation artifact.
- Roadmap: rm-689 (cure), rm-1499 (this discipline), rm-1478 (pullability
  guard), research evidence log
  `delegate/be2eef7e28174c0ba9961d03277b0bc4-evidence.md` (2026-10-17).
