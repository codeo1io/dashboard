---
title: CI digest readbacks — empty extraction must be an extraction error, and know your tool's output format
date: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: ci_workflows
severity: high
applies_when:
  - A workflow compares a pinned image digest (Dockerfile FROM, lockfile) against the live registry digest
  - Piping any `docker` inspection command into `awk`/`grep` to extract a field
  - Interpreting a digest-drift gate that has never once been green
  - Reading digests from `docker manifest inspect --verbose` output
symptoms:
  - The gate fails on every run with an empty "live digest" while the registry truth shows parity
  - `docker manifest inspect node:24-slim | awk '/^Digest:/'` yields zero bytes at exit 0
  - A "drift" report whose live digest is a per-platform manifest digest, not the index digest
solution: |
  Found by run 6fe26972 assess (2026-09-24): `.github/workflows/base-drift.yaml`
  extracted LIVE_DIGEST via
  `docker manifest inspect node:24-slim | awk '/^Digest:/{print $2; exit}'`.
  Plain `docker manifest inspect` emits JSON with NO `^Digest:` line (that line
  belongs to `docker buildx imagetools inspect`'s default pretty dump), so
  LIVE_DIGEST was always empty and `pin != empty` fired unconditionally — 4/4
  recorded runs failed while the registry actually matched the pin. The
  historical "drift" readings (`live 5cbc7cab`) were per-platform manifest
  digests from `--verbose` dumps — a different digest class than the index
  digest the pin compares against.

  Fix (cycle-12 B2): swap to the repo's proven convention —
  `docker buildx imagetools inspect node:24-slim | awk '/^Digest:/{print $2; exit}'`
  — and treat an empty result as a hard `extraction error` (exit 1), never as a
  drift verdict. Proven at parity on-runner: the buildx read returned
  sha256:0e0ff40c39bc… == the Dockerfile pin, so the first scheduled fire
  (2026-09-28 04:13Z) is expected green.

  Two sibling traps in the same family (already fixed in release.yaml, 18a1ee6):
  `--format '{{.Manifest.Digest}}'` is silently IGNORED for attestation-bearing
  OCI indexes (prints the pretty dump, exits 0) — parse the `Digest:` line
  instead; and prefer a token-authed registry HEAD (`Docker-Content-Digest`
  header, with an explicit `Accept` for the index media type) when you need the
  index digest without any docker CLI quirks.
prevention: |
  Any CI step that extracts a field by text-matching a CLI's output must prove
  the extraction can produce a NON-empty value before its verdict logic runs —
  empty means the probe broke, never that drift occurred. When comparing
  digests, state which digest class (index vs per-platform manifest) each side
  is, and verify the readback command's actual output format on the runner that
  will execute it (`wc -c` the awk once) — `docker manifest inspect` and
  `docker buildx imagetools inspect` share a subcommand shape but emit
  different formats.
tags:
  - ci
  - docker
  - digests
  - drift-gates
  - extraction-errors
related:
  - docs/solutions/workflow-issues/docker-manifest-inspect-no-digest-header-false-drift-2026-09-24.md
---
