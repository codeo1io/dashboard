---
title: Container digest pins — compare the multi-arch index digest, not a platform manifest
date: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - Validating a Dockerfile `FROM <image>@sha256:<digest>` pin against the registry (base-drift checks, absorb planning)
  - Reading a pushed image's digest back from the registry in CI (Release verification)
  - A drift report or measurement names a digest that does not match the pin and you need to know which digest you are actually looking at
tags:
  - docker
  - multiarch
  - digest-pin
  - base-drift
  - ci-readback
---

## Problem

A multi-arch image reference carries **two kinds of digests**: the top-level
**index** (manifest-list / OCI image index) digest — which is what
`FROM node:24-slim@sha256:<digest>` pins — and the per-platform **manifest**
digests inside that index (one per arch/OS, plus attestation manifests). Every
inspection tool surfaces both, in different fields, and more than one workflow
and planning artifact in this repo has compared the pin against the wrong one
or parsed an output format that does not contain the digest at all.

Three concrete instances, all from the same 2026-09-24 cycle:

1. **Planning mismeasurement (cycle-10 batch doc, B3).** The drift citation for
   `node:24-slim` was `sha256:5cbc7cab…` — which turned out to be the **amd64
   platform manifest** digest from `docker manifest inspect --verbose`'s
   `manifests[]` list. The Dockerfile pins the **index** digest
   (`sha256:0e0ff40…`), and the index digest was registry-current: the
   "drift" did not exist, and the digest half of the change was a no-op. Found
   only by pulling the verbose dump and comparing field-by-field before
   editing.
2. **Release readback (fixed earlier at 18a1ee6).**
   `docker buildx imagetools inspect --format '{{.Manifest.Digest}}'` is
   **silently ignored** for attestation-bearing OCI indexes on this buildx
   (v0.30.1): it prints the default pretty dump and exits 0, so a naive
   `--format` parse reads nothing or the wrong line. The workflow now parses
   the first `^Digest:` line of the pretty dump instead.
3. **Latent (as of writing): base-drift.yaml's first scheduled fire.** The
   weekly drift check extracts the registry digest with
   `awk '/^Digest:/{print $2; exit}'` over `docker manifest inspect <ref>`
   **without** `--verbose`. The non-verbose output is the raw index JSON
   (`schemaVersion` / `mediaType` / `manifests[]`) — it has **no top-level
   `Digest` line at all**, so the extraction yields nothing. A drift check
   that extracts nothing must fail loudly rather than silently compare a pin
   against an empty string.

## Solution

Decide once, in one place, what "the digest of an image" means, and use
readbacks that provably surface it:

- The pin to compare against a `FROM …@sha256:` reference is always the
  **multi-arch index digest** — the digest `docker pull` would record for the
  tag when the platform is irrelevant.
- The proven local extraction is `docker buildx imagetools inspect <ref>`
  (pretty dump): the **first** `Digest:` line is the index digest.
  (`--format` templates are unreliable here; see instance 2.)
- Do NOT rely on either `docker manifest inspect` form for the index digest
  (both checked empirically 2026-09-24 against `node:24-slim`, docker CLI
  29.1.3): the plain (non-verbose) form emits the raw index JSON, which has
  no top-level `Digest:` line at all, and the `--verbose` form emits the
  per-platform `manifests[]` list — a top-level `Descriptor.digest` never
  appears, so an index-digest extraction from it yields nothing.

## Why this works

The Dockerfile pin and the tag's index digest describe the same object — the
manifest list the registry resolves the tag to. Platform manifests are
interior nodes of that list: they change when a single arch rebuilds, and a
pin can never target them via a tag-level `@sha256:` reference. Any comparison
that mixes the two will report phantom drift (instance 1) or silently extract
nothing (instance 3).

## Prevention

- When a drift report names a digest, **re-derive it yourself** with one of the
  two correct readbacks before planning a change — a platform-manifest digest
  in a report is a measurement bug, not drift.
- Verify extraction commands against a known attestation-bearing index before
  trusting them in CI (the `--format` failure only reproduces on those).
- Any drift/verification step whose digest extraction returns empty must
  **fail the job** — an absent measurement is a broken check, not a pass.
- Hardened at review-fix (2026-09-24, riding the cycle-10 batch):
  base-drift.yaml now extracts via the buildx pretty-dump first `Digest:`
  line and fails the job with a distinct `::error::` message when the
  extraction comes back empty — an extraction failure is reported as a
  broken check, never as drift.

## Related

- `docs/solutions/best-practices/` — the registry readback fixed at 18a1ee6 in
  `.github/workflows/release.yaml` (attestation-bearing index behavior).
- ROADMAP `rm-103` (upstream absorb / digest churn signal history) and
  `rm-105` (Release verification via the `^Digest:` line readback).
- Cycle-10 batch doc B3 (docs/prioritization/2026-09-24-cycle-10-batch.md) —
  the no-op discovery, recorded as DEV-1 in the implement PhaseResult.
