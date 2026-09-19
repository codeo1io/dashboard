---
title: raven-actions/actionlint needs pipx the self-hosted runner lacks — use the container form (and beware the tag line)
date: 2026-09-19
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - Check Workflows job red with 'Unable to locate executable file: pipx' on the self-hosted runner
  - Swapping raven-actions/actionlint for the rhysd/actionlint container image
  - Pinning a container action version in this repository's workflows
symptoms:
  - Main workflow fails at the Lint Workflows step with 'Unable to locate executable file: pipx'
  - The failure persists across commits because it is environmental, not content-dependent
  - A docker pull of rhysd/actionlint:vX.Y.Z returns 'not found' despite that version existing as a GitHub release
problem: >
  raven-actions/actionlint installs pyflakes via pipx. The single self-hosted runner
  (agent-runner-dashboard) has no pipx, so every run of the action fails before linting
  anything. Separately, the rhysd/actionlint Docker image does not publish v2 tags at
  all — "actionlint v2.2.0" seen in release APIs is raven-actions/actionlint's own
  wrapper version, a different artifact. Pinning rhysd/actionlint:v2.2.0 reproduces a
  hard 'not found' failure identical in effect to the pipx failure it replaces.
solution: >
  Replace the wrapper step with the container form, pinned to the real image-line
  latest (1.7.12 as of 2026-09-19):
  docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color
  Validate the exact command locally before landing — the v2.2.0 tag error was caught
  by a local run, not by review. Dropping pyflakes loses nothing here: no workflow
  run block in this repository contains python (verified by grep). The runner runs
  docker already (release.yaml smoke tests), so the container form adds no capability
  requirement.
verification:
  - 'docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color exits 0 on all repo workflows'
  - 'curl -s https://hub.docker.com/v2/repositories/rhysd/actionlint/tags?page_size=25 lists the real available tags'
  - Main workflow Check Workflows job green at the pushed sha
references:
  - "Main run 35413084207 — failed step log ('Unable to locate executable file: pipx')"
  - docs/prioritization/2026-09-19-cycle-1-batch.md (rm-100a)
tags: [actionlint, ci, self-hosted-runner, docker, pipx]
---
