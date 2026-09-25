---
title: Node ran as PID 1 with no SIGTERM handler, so container stops never drained anything
date: 2026-09-24
category: runtime-errors
module: dashboard
problem_type: lifecycle_bug
component: server
severity: medium
symptoms:
  - "docker stop / orchestrator scale-down sent SIGTERM and nothing happened — no drain, no log line, killed only by the timeout KILL"
  - "grep 'SIGTERM|SIGINT|process.on' over src/ and scripts/ returned zero hits; only a server 'close' listener existed and nothing ever called server.close()"
root_cause: pid1_signal_dispositions
resolution_type: code_fix
related_components:
  - src/shutdown.ts
  - src/server.ts
  - Dockerfile
tags:
  - graceful-shutdown
  - docker
  - pid1
---

# PID-1 Node dropped SIGTERM; graceful shutdown was dead code (rm-171)

> **Landing note (2026-09-25, integrate of run d6455cdc candidate ed889597, conflict case 3f2790f4):** this lesson was authored by the d6455cdc batch as its item rm-178; the repair converged with the landed rm-171 (which credits this run as first reporter), so the citation is renumbered to the landed id. The mechanics below are the candidate's converging variant; the landed shape differs in named details — src/shutdown.ts exposes `installShutdownHandlers` (not `createGracefulShutdown`/`installGracefulShutdown`), drains aggregator → listener store → `server.close()` in that order, and the review-hardened force-exit deadline is 9 s, not 10 s. The PID-1 premise and the prevention rule stand as written.

## Problem

The Dockerfile runs `CMD ["node", "src/server.ts"]` — Node is PID 1 in the container. The
Linux kernel applies no default signal dispositions to PID 1, so an unhandled SIGTERM is
silently DROPPED (not, as with ordinary processes, a default terminate). The server had no
`process.on('SIGTERM')` handler at all, and while `server.addListener('close', ...)` stopped
the aggregator, nothing ever invoked `server.close()` — the drain path existed but was
unreachable. Result: every stop waited out the full stop-timeout window and then SIGKILLed,
losing in-flight requests and any aggregator state transition.

## Fix (2026-09-24, run d6455cdc B3)

- New `src/shutdown.ts`: `createGracefulShutdown` performs a bounded drain — stop hook (stops
  the aggregator), `server.closeAllConnections()`, `server.close()`, `exit(0)`; a forced
  `exit(1)` fires on the deadline (default 10 s) or on a close error; a double-signal latch
  makes second SIGTERM/SIGINT no-ops instead of double-stop races.
- `installGracefulShutdown` wires SIGTERM/SIGINT once-handlers with injectable
  `target`/`exit` (tests use an EventEmitter target — never real process signals).
- Wired inside `createDashboardServer` only; `buildDashboardApp` stays signal-free so tests
  and embedders never inherit handlers.

## Prevention rule

**Any container whose CMD is the runtime itself (node/python/…) must install explicit
SIGTERM/SIGINT handlers — PID 1 gets no kernel defaults.** Grep for `process.on('SIG'` in CI
or review whenever `server.close` appears in a codebase: a close listener with no caller is a
lifecycle bug, not dead-but-harmless code. Keep drain bounded (a deadline that force-exits) —
an unbounded close is just a slower hang — and keep signal wiring out of anything tests
import, or the test runner inherits your handlers.
