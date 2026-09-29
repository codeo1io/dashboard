---
title: Full-suite gate (github_ci_validate) on a loaded shared box — buffered stdout, nohup launcher, concurrent-run cancel races
date: 2026-09-29
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: low
applies_when:
  - 'A conductor full_tests phase runs `github_ci_validate.py --repo .` and the tool call approaches its window with an EMPTY log'
  - 'The same script is (or may be) running simultaneously from other conductor worktrees on this box'
  - 'Interpreting an impacted-tests runner file list that includes `web/src/**` files while vitest reports fewer test files than listed'
tags:
  - github-ci-validate
  - full-tests
  - nohup
  - buffered-stdout
  - concurrent-runs
  - vitest-project-filter
---

## Problem

The authoritative full gate (`github_ci_validate.py --repo .`) can outlive a
tool call: it snapshots the worktree, pushes `conductor/ci-<sha12>` branches,
opens an ephemeral PR, and waits on all 10 GitHub checks — well over 15
minutes on a normal day. Three traps compound on a shared box:

1. **Empty log ≠ hang.** The validator's stdout is fully buffered when
   redirected; the log stays 0 bytes until process exit. A call that times
   out and shows an empty log may have been healthy the whole time.
2. **Concurrent runs race.** Other conductor delegates on the same box run
   the same script against their own worktrees. Foreign runs can hold
   repository ref-locks during the push step, and two attempts pushing the
   SAME snapshot sha cancel each other's GitHub check runs (observed: one
   run's Lint check CANCELLED by a concurrent run). Identify foreign
   processes with `pgrep -af github_ci_validate` + `/proc/<pid>/cwd` before
   concluding YOUR run misbehaved.
3. **A re-run of the same tree cancels the first run** (same sha12 → same
   branch → GitHub cancels the older run set). Sequence retries; do not
   double-launch.

## Cure

Run it via a script-file + `nohup` launcher so it survives tool-call
timeouts, then poll the PID (not the log — it only fills at exit):

```bash
cat > /tmp/<attempt>-launch.sh <<'EOF'
#!/bin/bash
cd <worktree>
python3 .../github_ci_validate.py --repo . > /tmp/<attempt>-ci.log 2>&1
echo "exit=$?" >> /tmp/<attempt>-ci.log
EOF
nohup /tmp/<attempt>-launch.sh > /tmp/<attempt>-nohup.log 2>&1 &
```

Poll with `ps -p <pid>` + `tail /tmp/<attempt>-ci.log` every ~5 minutes. The
final log line is the verdict JSON (`"ok": true` + per-check states +
`pr_url`) followed by `exit=0`. Local fixes are picked up by simply
re-running the same command — it re-snapshots the CURRENT worktree.

## Rider: the impacted-tests file list vs the root vitest project

`run_repo_impacted_tests.py` derives impacted files across BOTH the server
and web trees, but the root vitest project's include is `test/**` only — so
`web/src/**` entries in its exec line are silently filtered and the reported
"Test Files N" is smaller than the listed file count. That is not a failure;
validate web-side changes with the web project config explicitly
(`vitest run -c web/vitest.config.ts web/src/<suite>`).
