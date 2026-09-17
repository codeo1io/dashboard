---
title: Pinned base digest current but distro fix exists — patch in the runtime stage
date: 2026-09-17
category: security-issues
module: dashboard
component: docker
problem_type: release_gate_failure
severity: high
applies_when:
  - The Trivy enforcement gate (release.yaml "Enforce fixed HIGH/CRITICAL") fails on OS packages
  - The pinned node:24-slim digest matches what the registry currently serves
  - The failing CVEs have a non-empty Fixed Version in the distro archive
  - Renovate is absent, so digest pins only move by hand
tags:
  - trivy
  - docker
  - debian
  - release-gate
  - base-image
  - apt
---

# Pinned base digest current but distro fix exists — patch in the runtime stage

## Problem

The release workflow's enforcement scan (`ignore-unfixed: true`, `exit-code: 1`)
failed on three HIGH CVEs in `libpcre2-8-0 10.42-1` (CVE-2026-86145,
CVE-2026-89157, CVE-2026-89161) — all fixed in `10.42-1+deb12u1`.

Triage per
[`trivy-base-image-alerts-unfixable-by-design-2026-08-30`](../best-practices/trivy-base-image-alerts-unfixable-by-design-2026-08-30.md)
step 2 asks: is the pinned digest current? It was — the registry served the
exact pinned digest, and that live image still contained `10.42-1`. The fix
existed only in the Debian archive; Docker Hub had not rebuilt the base with it.
So neither a digest bump (nothing newer to move to) nor suppression (the CVEs
are fixable — suppressing fixable findings is not the accepted posture) applies.

## Solution

Upgrade exactly the affected package in the **runtime stage** — the only stage
that ships — before package-manager removal:

```dockerfile
RUN apt-get update \
      && apt-get install -y --no-install-recommends --only-upgrade libpcre2-8-0 \
      && rm -rf /var/lib/apt/lists/*
```

`--only-upgrade` + a named package keeps the delta against the pinned digest
auditable; `rm -rf /var/lib/apt/lists/*` keeps the layer lean. Builder and
prod-deps stages are discarded, so they need no patch.

## Verification

- `docker build` through all stages succeeds; runtime image reports
  `libpcre2-8-0 10.42-1+deb12u1` (`docker run --entrypoint dpkg <img> -l libpcre2-8-0`).
- The enforcement scan passes on the built image; the reporting scan (all
  severities, exit 0) still shows whatever unfixable findings the base carries —
  that channel is visibility by design.

## Why not the alternatives

- **Bump the digest:** nothing newer exists; the pin was already current.
- **`.trivyignore`:** suppression of *fixable* findings inverts the gate's
  purpose; the accepted-bounded posture covers only unfixed CVEs.
- **Broad `apt-get upgrade`:** unbounded delta against the pinned digest makes
  the shipped image harder to audit than the base pin intends.

When a future rebuilt base absorbs the fix, the `--only-upgrade` step becomes a
no-op candidate for removal at the next digest bump.
