---
title: Registry attestations are verified at the registry, not via gh attestation
date: 2026-09-25
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: release_pipeline
severity: medium
applies_when:
  - Verifying supply-chain attestations on ghcr.io/codeo1io/dashboard images
  - Auditing whether a Release build carries provenance/SBOM
  - "gh attestation verify returns 404 for a digest that clearly has attestations"
---

# Problem

`gh api repos/codeo1io/dashboard/attestations?digest=sha256:<digest>` 404s even
though the pushed image *does* carry attestations. The two stores are different:
docker/build-push-action embeds attestations **in the registry manifest** (OCI
attestation-manifest entries in the pushed index), while `gh attestation
verify` only sees attestations written to GitHub's repository attestations
API. The Release workflow pushes to GHCR via `GITHUB_TOKEN`, which produces
registry-side attestations only — the GitHub-side API stays empty and 404s.

Live evidence (2026-09-25, pre-sbom/mode=max): the `:latest` index
`sha256:9543359e…` carries an `unknown/unknown` attestation-manifest entry
whose layer annotation is `in-toto.io/predicate-type: https://slsa.dev/provenance/v1`
(provenance v1 at the build-push-action default `mode=min`), while the
GitHub-side attestations API 404s for the same digest.

# Verification recipe (registry side)

```sh
# 1. Find the attestation manifest in the pushed index
docker buildx imagetools inspect ghcr.io/codeo1io/dashboard:latest
#   -> index digest; look for the unknown/unknown attestation entry.
# NB: on this runner's buildx (v0.30.1), `--format '{{.Manifest.Digest}}'` is
# silently IGNORED for attestation-bearing indexes — it prints the pretty dump
# and exits 0. Parse the Digest line with awk instead.

# 2. Fetch an anonymous GHCR token and read the raw attestation manifest
TOKEN=$(curl -s "https://ghcr.io/token?scope=repository:codeo1io/dashboard:pull" | jq -r .token)
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.oci.image.manifest.v1+json" \
  "https://ghcr.io/v2/codeo1io/dashboard/manifests/<attestation-manifest-digest>" \
  | jq '.annotations["com.docker.reference.attestation.manifest"] // .artifactType'
# artifactType application/vnd.docker.attestation.manifest.v1+json confirms the
# attestation-manifest; the in-toto layer annotation names the predicate type
# (provenance v1; with sbom: true an SPDX predicate appears as well).
```

# Fix

`.github/workflows/release.yaml` build-push-action step now sets `sbom: true`
and `provenance: mode=max` (rm-105). Before that change the image had
provenance v1 at `mode=min` and **no SBOM attestation**.

Do not reach for `gh attestation verify` for this pipeline: it verifies the
GitHub-side API store, which this fork's `GITHUB_TOKEN`-only publication path
never populates (no repo secrets — see the App-token gating note in
`docs/solutions/` / rm-142-era work). Registry-side inspection above is the
authoritative check.
