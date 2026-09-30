---
title: renovate.yaml reintroduced by upstream sync — deleted external workflow silently returned
date: 2026-09-21
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
tags: ['renovate', 'upstream-sync', 'workflow-hygiene', 'app-secrets']
applies_when:
  - Absorbing upstream merges that can resurrect previously deleted workflow files
  - Auditing .github/workflows for reusable workflows that execute on foreign-hosted runners
  - Checking that a reintroduced CI surface has its required app secrets configured before it fires
---

# renovate.yaml reintroduced by upstream sync (2026-09-21)

## What happened
- 5e6a8bf deliberately deleted `.github/workflows/renovate.yaml`: it calls an
  external reusable workflow (`bfra-me/.github/...@sha`) whose jobs execute on
  bfra-me's GitHub-hosted runners, billing-blocked for this account, and the
  required app secrets (APPLICATION_ID/PRIVATE_KEY) were never configured —
  the job has never succeeded here.
- Merge 57c9c6b ("sync with autonomy-upstream/main") silently reintroduced it.
- The fleet audit (hosted-runner-audit.sh) flagged it at 2026-09-21T03:00Z as
  a NEW violation, failing the watchdog sweep (correct behavior).
- Same pass: `visual.yaml` still had `runs-on: ubuntu-latest` (standing
  violation) — converted to `self-hosted` per repo convention (6 other
  workflows already self-hosted; runner `gh-runner-dashboard.service`).

## Standing rule for upstream syncs
When merging `autonomy-upstream/main`, ALWAYS drop
`.github/workflows/renovate.yaml` in the merge commit. Its presence is a
fleet-audit violation by construction (external reusable workflow = hosted
runner + missing secrets), never a working job on this fork.
