---
title: Base-drift workflow red on EMPTY live digest — guard the extraction, red distinctly, fall back to the registry
date: 2026-09-24
last_updated: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - A weekly digest-drift workflow reds on a schedule while the registry actually reports pin == live
  - The workflow's live-digest capture is a bare command substitution (`$(docker manifest inspect …)`) under `set -euo pipefail`
  - Rate limiting (HTTP 429 from the registry CLI path) or any CLI failure silently yields an EMPTY string that then compares unequal to the pin
symptoms:
  - "workflow conclusion failure with 'digest drift' framing while `curl` against auth.docker.io + registry-1.docker.io proves zero drift"
  - "empty-vs-pin comparison reports drift for a digest that was never fetched"
  - "`::warning::` workflow notices interleaved with the captured digest value on stdout"
cause: |
  Three stacked shell hazards in one step:
  1. An empty capture is indistinguishable from a real digest — no post-extraction emptiness check.
  2. Under `set -euo pipefail`, a failing CLI inside `$( )` aborts the step before any guard can run, so `|| true` guards are REQUIRED inside the substitution, not around it.
  3. `echo "::warning::…"` writes to stdout — the same channel captured by the command substitution — polluting the digest with a workflow-notice string.
resolution: |
  Fixed in the cycle:1 batch (rm-177, 2026-09-24) in `.github/workflows/base-drift.yaml`:
  - Live-digest extraction lives in one `extract_live_digest()` function: primary `docker manifest inspect`, then a fallback that mints an anonymous token at `auth.docker.io` and HEADs `registry-1.docker.io` reading the `docker-content-digest` header.
  - Every command substitution carries `|| true` internally so a hard CLI failure reaches the guard instead of tripping `set -e`.
  - All `::warning::`/diagnostic echoes go to stderr.
  - Both-digests-empty reds with the DISTINCT message "live digest EXTRACTION FAILED (empty) — NOT drift", so an extraction failure can never masquerade as drift. The pre-existing empty-PIN guard completes the both-nonempty precondition.
  Proven live at fix time: registry digest `sha256:0e0ff40c39bc…` == Dockerfile pin (run 35970747110's earlier red was a false positive of exactly this class).
prevention:
  - "Any captured CI value must be emptiness-checked AFTER capture, and the failure branch must be semantically distinct from the comparison branch."
  - "Under `set -euo pipefail`, guard INSIDE every command substitution (`$(cmd || true)`); a guard outside never runs."
  - "Never let `::warning::`/`::error::` echoes reach a captured stdout — redirect notices to stderr."
  - "Registry-backed checks need a fallback path that does not depend on the Docker CLI's rate-limit-prone anonymous route (token + registry HEAD)."
related_components:
  - .github/workflows/base-drift.yaml
  - Dockerfile (node:24-slim digest pin)
tags: [ci, workflows, shell, drift, false-positive, rate-limit]
---
