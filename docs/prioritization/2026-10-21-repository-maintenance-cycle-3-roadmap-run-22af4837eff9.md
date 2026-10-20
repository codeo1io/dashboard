# Repository maintenance cycle 3 roadmap extension — run 22af4837eff9 (dashboard)

Repository-maintenance 1041f5923b9748739bb91179c369ab54 cycle:3, roadmap attempt
e951cc9552b54866bff4532cd60e0c3e, 2026-10-21, base 76005aa (origin/main; worktree ff'd
from the assess base 192193d6, both gates-green — Main CI 39468970456).

Inputs consumed (not redone): assess 2418f5c0 (11 findings, local gates rc=0
3920+1856) and research f3ccbb84 (absorb-window 31-behind at c9845786, release
2026.10.59; artifacts in the delegate spool and /tmp/absorb-22af4837.json).

Minted (deduped against the live ledger + 301 fetched sibling conductor/run-*
refs; wall = rm-2118, extension wall = #56):

- `rm-2119` — operator contract 1.11.0→1.13.0 catch-up + fro-bot/agent pin
  v0.124.1, deployment-gated (research P1).
- `rm-2120` — should-release web-test-only skip precision, port upstream
  3be510b1 / PR #683 (research P2 tail).
- `rm-2121` — standing low-hardening cohort: `__Host-` cookie prefix,
  fixture-harness body caps, gzip orphan sidecars, monitoring fetch timeout,
  server entry argv compare (assess lows, verified unowned).
- `rm-2122` — census-truth carrier filename-order + exact-equality false-red
  tripwire in the landed roadmap-integrity guard (assess medium).

Riders appended: rm-252 (window disposition map), rm-271 (upstream absorbed the
majors cohort #691-695 — converge trigger satisfied; pnpm-12 arm dead
post-Bun), rm-1464 (live rulesets re-probe: still zero rulesets, legacy shell
still empty).

Screened out, no mints — dedupe held: toolchain majors (rm-271 lane), rulesets
fill (rm-1464), playwright 1.64.1 (rm-881 no-churn anti-candidate), in-CI
workflow lint (already exists at main.yaml:149-158), outage-runbook pnpm
re-truth and rm-1523/rm-843 landed-flips (unlanded rm-2012/rm-2013-class
envelopes own them).

Ledger census at authoring: 329 defs / 0 dups / max rm-2122
(node scripts/roadmap-census.ts, run twice post-edit).

## Deliverables

`ROADMAP.md` (3 riders + extension #57 + mints rm-2119..rm-2122) and this
record. Guard battery re-run at the edit: roadmap-integrity-guard green,
render guard green, eslint ROADMAP.md clean, ledger-check unchanged (the two
known PROVEN-STALE cites rm-1523/rm-843 only). Implement notes: none yet — the
four mints are candidate-status; no code changed in this phase.
