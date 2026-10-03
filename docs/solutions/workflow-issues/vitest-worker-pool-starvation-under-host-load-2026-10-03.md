---
title: 'Vitest worker-pool starvation under host load (uv_thread_create / ForksPoolWorker EPIPE)'
date: '2026-10-03'
category: 'workflow-issues'
module: 'test-runner'
tags: ['vitest', 'forks-pool', 'flaky-tests', 'fleet-load']
problem_type: 'infrastructure'
component: 'vitest'
severity: 'medium'
---

# Vitest worker-pool starvation under host load

## Problem

On a loaded host (fleet load > 20 concurrent jobs) vitest's forks pool — which
defaults to one fork worker per CPU — fails at worker STARTUP or in worker IPC.
The failure classes seen first-hand in this fleet:

1. **`uv_thread_create: Resource temporarily unavailable`** — a worker aborts
   before running a single test file. The run exits 1 while every file that DID
   start reports green, so the summary looks like "all tests passed, exit 1".
   If suites are `&&`-chained (as `pnpm test` chains server + web), the later
   suites never run at all. Instance: run `2df5b285` (gates attempt
   `f6f4bdde`, 2026-10-01) — 47 files / 2146 tests green, exit 1, three
   workers failed to start; orphaned `forks.js` workers from REMOVED `/tmp`
   gate clones were still pinning host threads ~26 minutes later.
2. **`ForksPoolWorker.send` EPIPE** — a worker's IPC pipe breaks mid-suite.
   Instance: run `6e3689681bd0` (2026-10-02) at host load ~19.5/14 — the web
   workspace suite crashed with an EPIPE after the server suite had already
   gone 50/2334 green; a solo re-run of the exact same tree was rc=0 (3505).

Both are infrastructure failures, not code regressions: the tree was
byte-identical between the red run and the green re-run.

## Response protocol

- **Treat pool/worker/IPC errors as infra, not regression.** Before reporting a
  gate red on either signature, re-run the suite solo (`pnpm test`, or the
  specific workspace) once. A green re-run on the same tree closes it.
- **Sweep orphans before gates on a contended host:**

  ```sh
  pgrep -af 'vitest.*forks.js' || true
  pkill -f 'vitest.*forks.js' || true   # only workers from finished/removed runs
  ```

- Do not purge Actions caches or "fix" tests in response to these signatures —
  the assertions never failed.

## Mitigation (in-repo)

`vitest.config.ts` and `web/vitest.config.ts` cap the worker pool
(`maxWorkers: 4` server, `maxWorkers: 2` web, tracked as rm-502).
This bounds thread creation at worker startup and the pool's memory/IPC
footprint, which is what starves first under load. The caps trade a little
throughput on an idle host for determinism on a loaded one; the 48-file server
suite stays comfortably parallel at four forks.

## How to verify

```sh
grep -B1 -A1 'maxWorkers' vitest.config.ts web/vitest.config.ts
pnpm test   # both suites green with the caps in place
```
