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

<!-- LANDING PROVENANCE 2026-09-25 (integrate of run d6455cdc, PR #113, conflict case 331964b6): authored in that lineage under its own id rm-178; the landed main id for this repair is rm-171 (cycle-13 B4, run 11d3a522) — NEW src/shutdown.ts + serve() wiring with a 9s bounded drain — which credits this batch as first reporter. Code anchors below were measured at the lineage's base 7809df6. -->

# PID-1 Node dropped SIGTERM; graceful shutdown was dead code (rm-178)

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
