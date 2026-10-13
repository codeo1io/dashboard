---
module: dashboard
tags: ['upstream-adoption', 'merge-collateral', 'fork-only-hardening', 'security-invariant', 'conductor', 'independent-review']
problem_type: workflow-issue
---

# Upstream adoptions silently dropping fork-only hardenings (2026-10-13, independent-review case `4491e285`)

## Problem

Absorbing upstream `fro-bot/dashboard` content by file-adoption (take
upstream's whole file) is lossy against fork-only hardenings that live in
files upstream never had them in. The 2026.10.17-series adoptions (through
upstream merge `6acea88`) dropped **three** `in_progress` ROADMAP
hardenings with no textual conflict at all — upstream's file simply didn't
contain the fork's lines, so the merged tree inherited upstream's clean
version and the resolution delta looked like noise, not loss:

- **rm-709** (https-only detailsUrl boundary): dropped from BOTH the server
  (`extractFailingCheckDetails`) and the client (`parseFailingCheckDetail`),
  with their tests — while `Monitoring.tsx` still rendered `detailsUrl`
  straight into an `href`. The drop reopened a `javascript:` link vector on
  the authenticated board.
- **rm-156/rm-107** (refresh watchdog pair): the server kept emitting
  `refreshDurationMs`/`refreshDegraded`, but the client whitelist, DTO
  fields, degraded banner, and tests vanished — a one-sided contract drift
  where the observable symptom is a silently missing UI signal.
- **rm-780** (GET-seam wall-clock bound): `web/src/api/fetch-timeout.ts` and
  its suite were deleted outright; both seams lost their 15 s race while a
  2026-10-10 rider still cited the deleted file as a live surface.

## Detection rules (what made these findable)

1. **In-progress defs are load-bearing.** A merge whose delta touches files
   named in an `in_progress` ROADMAP def's acceptance/evidence must be
   diffed against the fork's last-good content for those exact surfaces —
   `git show <last-fork-commit>:<path>` — not just resolved textually.
2. **Both halves of a contract.** When a DTO field exists on the server, its
   client whitelist entry and tests are part of the same acceptance; losing
   only one side is a regression, never supersession.
3. **Riders citing files that vanish** are a direct tell — grep the rider's
   cited paths against the merged tree.
4. **No retirement record means restore.** Authority order (safety
   invariants > current acceptance criteria) resolves "upstream looks newer"
   in favor of the fork hardening when nothing retired it: no Closed flip,
   no superseding rider, no replacement mechanism.
5. **Render surfaces raise severity.** A dropped sanitizer behind a raw
   `href` render is a live XSS vector, not a style regression.

## Cure applied

Restored all three families verbatim from the pre-adoption fork tree
(`88e423a`), kept upstream's structural form where it diverged (the degraded
banner fitted into the current `MonitoringBoard` structure rather than
reverting it), recorded dated riders on `rm-709`/`rm-156`/`rm-780` and an
addendum in the integrate graft comment, and re-ran targeted gates
(aggregator 101/101, the four web suites 43/43, `check-types` rc=0, `lint`
rc=0). Dated riders on the defs are the durable record — a future reviewer
diffing def riders against the tree can see the restore lineage.
