# Repository-maintenance roadmap — cycle 4, run 18ef6d162e3f (2026-10-21)

Minted by roadmap (attempt c630f7da07d94a9a9117be6158151537), from research
a541a4d5fd66404e86ec61ae99fccc50 at origin/main tip 76005aa, tree otherwise clean.

## What this extension mints

Four candidate def lines plus one absorb-lane rider, all evidence-backed
first-hand this cycle:

- **rm-2141** (reliability, p45.0) — Workflow fleet state-assert: a checked-in
  expected-state manifest plus a scheduled assertion job that turns silent
  workflow disable/ghost-active/stale-run-list into a red check. Grounds: Fro
  Bot workflow 330819996 `disabled_manually` since 2026-10-19T11:46:21Z while
  AGENTS.md still calls it ACTIVE; ghost Lockfile Guard 375606447 active with
  no file in-tree; rm-1450's darkness rider (all 8 scheduled watchers silently
  unrun, 10-11..10-14). Deliberately narrow sibling of rm-1450 — that def owns
  the enable/disable decision, this one owns only the assertion capability.
- **rm-2142** (reliability, p44.0) — `web/src/sw.ts:83`
  `cleanupOutdatedCaches()` runs at module eval time, before the new install
  completes and while the previous worker may still depend on
  previous-format precaches; Workbox documents the call for activate. Post
  rm-1960 re-anchor: the def must answer rm-1960's header comment that
  documents the current ordering as intended (move, or record the dismissal
  with evidence).
- **rm-2143** (operator-experience, p21.0) — iOS home-screen icon:
  `web/index.html:8` points apple-touch-icon at an SVG iOS ignores; adopts the
  salvage rm-249 rider lineage (2026-09-29 remediation + 2026-10-04 correction
  of record, with its tooling inventory) by content rather than minting over
  it.
- **rm-2144** (maintainability, p20.5) — `scorecard.yaml` is the only one of
  13 workflows with zero `timeout-minutes`; bound the analysis job and pin the
  convention with the workflow-hardening guard.
- **rm-252 rider** — window 31→32 behind via exactly one untagged commit #696
  (agent pin v0.125.0); operator contract still 1.13.0 at v0.125.0 (read
  first-hand); the pin-parity bump converges with the ca-certificates cure and
  the Fro Bot re-enable precondition on the same v0.125.0 target.

## Id-space discipline (probed live this turn)

Fresh mints start at rm-2141, above every unlanded def-line ceiling probed
first-hand across the sibling worktree walls (maxima 2117, 2119, 2120, 2122,
2128, 2134, 2138, 2139), the git blob history across all refs (max 2138), and
the delegate spool's dashboard-family claims (reservations through 2140). The
spool's rm-22xx tokens were verified agenttrace-FOREIGN and excluded per the
established ext-#37 rule. The rm-252 rider records the same note in the ledger
itself, fog-marking the three adjacent envelope bands.

## Corrections of record (research phase, carried here to prevent future wrong mints)

- The root ErrorBoundary gap is OWNED by rm-514 (in_progress, triple-contested)
  — two sibling assess artifacts called it unowned; no fourth collision may be
  minted.
- The no-LICENSE gap is OWNED by rm-147 (blocked-external).
- rm-1960 (autoUpdate + top-level skipWaiting + clients.claim) landed
  2026-10-21; `web/src/sw.ts` is 274 lines and the pre-landing line anchors are
  stale.

## Deferred with rationale

- trivy scanner v0.76.0, #683 web-test-only release skip, actions/cache v6.1.0,
  integrity-guard hardening, impeccable 4.7.0 — already claimed by TWO live
  unlanded envelope bands (first-landed-wins by content; never a third mint).
- setup-node/release-channel + setup-qemu/release.yaml pin stragglers — owned
  by rm-1451's pin-drift sweep, unchanged this cycle.
- TypeScript 7 cohort — hard-blocked: typescript-eslint 8.72.0 peer ceiling is
  exactly `>=4.8.4 <6.1.0` and 6.0.3 is the newest in-ceiling typescript.
- Agent pin bump to v0.125.0 — rides the rm-252 absorb lane, not a mint.
- rm-139 Node 26 gate fires 2026-10-28 — owned by that def's date gate.

## Deliverables

- `ROADMAP.md`

Ledger census after this mint: **329 defs / 0 dups / max rm-2144** — 325 at
HEAD 76005aa plus this cycle's four roadmap-phase mints rm-2141..rm-2144. The
census claim above is machine-verified by the newest-carrier check.
