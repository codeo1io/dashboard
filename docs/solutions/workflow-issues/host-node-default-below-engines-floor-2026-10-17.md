---
title: Host node default sits below engines floor — local gates run on an unsupported runtime and only warn
date: 2026-10-17
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - "Every corepack pnpm invocation prints: '[WARN] Unsupported engine: wanted: {\"node\":\">=24\"} (current: v22.22.0)'"
  - package.json engines.node is a floor the local runtime silently violates
  - CI is green (it runs Node 24) while local reproduction runs a different major
problem: >
  The dashboard requires Node >=24 (engines.node), but the host PATH resolved
  `node` through ~/.local/bin/node -> /usr/bin/node = v22.22.0. pnpm only warns,
  so check-types/lint/test all "pass" on a runtime the project does not support.
  That masks runtime-dependent behavior (strip-only TS semantics, undici, test
  runner differences across majors): a local green gate is weaker evidence than
  it looks, and failures that only reproduce on Node 24 look phantom locally.
solution: >
  Point the host default at an installed supported line before trusting local
  gates. v24.21.0 was already present under ~/.nvm/versions/node/v24.21.0 — the
  gap was default selection, not availability. Cure applied 2026-10-17 (run
  d495512fd2cc cycle:1 U4, rm-1495): repoint the ~/.local/bin/node symlink from
  /usr/bin/node to /home/agent/.nvm/versions/node/v24.21.0/bin/node (the nvm
  default alias is unset on this host, and non-interactive shells do not source
  nvm at all, so the symlink is the load-bearing selector). npm/npx stay on the
  system links; corepack resolves through whichever node invokes it, which is
  now 24. Reversal: ln -sf /usr/bin/node ~/.local/bin/node.
verification:
  - '`node --version` in a fresh shell reports v24.21.0'
  - 'corepack pnpm exec vitest run <focused suite> emits no Unsupported-engine warning line'
  - 'A Node-26 window (rm-139, 2026-10-28 LTS promotion) supersedes this pin — re-derive then'
references:
  - ROADMAP.md rm-1495 (minted 2026-10-17, run d495512fd2cc roadmap phase)
  - docs/prioritization cycle:1 selection 'security-pin convergence + floor-truth'
tags: [node, engines, nvm, local-gates, runtime-fidelity]
---
