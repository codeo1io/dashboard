# 2026-10-21 repository-maintenance cycle:4 roadmap extension — run af26c83c2d4f

Extension #52 on the ledger, composed at base 76005aa == origin/main (porcelain
clean at compose except the two deliverables below). Composed by reaped roadmap
attempt e7ac9cf298a34b15a73e72ddd851e0fa; verified, corrected and completed
by adoption attempt 5754ea7e4cab4e0eb77f84f04a0d6792 (see Renumber below). Inputs: this run's assess
attempt 45d97d6d (four fresh findings; full battery green at base: check-types,
lint, test all rc=0, bun audit 0 vulns over 815 packages, census 325 defs /
0 dups / max rm-2032, ledger-check rc=1 pre-existing pair only) and research
attempt abbb602b (live actions/ecosystem/registry probes, unchanged absorb-window
snapshot, the vitest-5 four-package bundle intel).

## Mints (3)

- `rm-2200` reliability 62.0 — post-swap mixed-version renderer chunk load
  settles silent: one-shot guarded reload at the renderer seam
  (web/src/operator/renderer-source.ts:19 lazy chunk, web/src/operator/runtime.ts
  settle-without-retry, web/src/sw.ts eager activation). Client renderer-seam
  half only; ownership greps found no def owning the seam reload.
- `rm-2201` maintainability 40.0 — conductor run-head PR residue has no sweep:
  scripts/conductor-pr-janitor.ts:65 CONDUCTOR_HEAD_PATTERN matches only
  conductor/ci- heads while four run-head PRs (#787, #798, #860, #998) regrew
  after the 2026-10-17 manual triage closed #508/#509.
- `rm-2202` maintainability 34.0 — pnpm-era prose residue in CI scripts:
  scripts/should-release.ts:37 rule-2 docstring still says pnpm-lock.yaml while
  the code at :333 matches bun.lock, :139 says pnpm lint, and
  scripts/gzip-static-sidecars.ts:4 says pnpm build:web.

Ids sit at rm-2200-2202, deliberately ABOVE the whole contested rm-215x window:
two sibling roadmap phases minted rm-2154 inside this attempt's first renumber
window (b6876797 at 05:12:30Z, 85715d76 at 05:18:03Z), so the band jumped
clear with headroom over every observed in-flight pick (origin/main still
76005aa, census 325 defs / 0 dups / max rm-2032). The actions/tools ladder content (cache
v6.1.0, trivy scanner v0.76.0, impeccable 4.7.0, web-test-only release skip,
base-drift construction fix, Fro Bot state truthing, integrity-guard hardening)
is content-claimed by standing first-landed-wins sibling envelopes and is
deliberately NOT re-minted here.

## Renumber (adoption attempt 5754ea7e4cab4e0eb77f84f04a0d6792)

The first graft minted rm-2141-2143 at 01:18Z on a main-only wall probe. The
adoption re-probe of every dashboard-864ca327c8 worktree found the band
already content-claimed by earlier same-day grafts: 16f30f8b rm-2141
(runbook truth closure, 01:03Z), f59e6936 rm-2142-2145 (01:09Z), later
18ef6d16 rm-2141-2144 (02:58Z) and 592e2a89 rm-2146/2147 (04:27Z), fog
ceiling rm-2153 (cdbc2327). The three mints were renumbered in place —
rm-2141 to rm-2154, rm-2142 to rm-2155, rm-2143 to rm-2156 — the first
clean band above the ceiling; no other content changed and no rider moved.

That renumber was itself raced: b6876797 minted its own rm-2154 at 05:12:30Z
(the SAME renderer-heal finding from its independent cycle:4 research,
priority 48.0 — content duplicate across sibling envelopes, reconcile by
title at landing, first-landed-wins) and 85715d76 minted rm-2154 at
05:18:03Z (operator-suite load tolerance, priority 55.0), both inside the
renumber window. The band was then jumped clear to rm-2200-2202 — above the
entire contested rm-215x window, with headroom over every observed in-flight
pick; provenance chains rm-2141→rm-2154→rm-2200 (and siblings for the other
two mints) are recorded in each def's mint note and the ledger tail comment.

## Riders (5)

- `rm-1524` — vitest-5 is a FOUR-package bundle upstream (vitest 5 #694,
  jsdom 30 #692, jest-dom 7 #691, typed jest-dom matchers #695); the dated
  re-eval this def waits on is 2026-10-21.
- `rm-271` — the pnpm 12 leg is obsolete since the 2026-10-19 bun adoption;
  registry refreshes typescript 7.0.2 / vitest 5.0.5 / jsdom 30.1.3 /
  jest-dom 7.0.1.
- `rm-139` — v26.12.0 lts false live read; node:26.12.0-trixie-slim published
  2026-10-14; ubuntu-latest still aliases 24.04.
- `rm-1451` — straggler census re-read: exactly two live stragglers
  (setup-node release-channel.yaml:55 v7.0.0, setup-qemu v3.7.0 vs v4.4.0);
  codeql v4.39.0 and five other actions all current.
- `rm-252` — cycle:4 window snapshot plus adoption re-probe: the research
  window read 32 behind at PR #696 with agent v0.125.0 newest ('no absorb
  decision forced'), then the adoption-time live re-probe found the window
  had moved — 33 behind at 4bf77d9 = PR #698, the one-commit fro-bot/agent
  v0.125.1 pin bump (published 2026-10-21T04:15:12Z); contract ceiling
  1.13.0.

## Deliverables

- `ROADMAP.md` — three def mints (rm-2200, rm-2201, rm-2202), five dated
  riders, extension #52 comment at the render tail.
- `docs/prioritization/2026-10-21-repository-maintenance-cycle-4-roadmap-run-af26c83c2d4f.md` — this carrier doc.

Census after edit: 328 defs / 0 dups / max rm-2202. Next free rm-2203.
Zero status flips; Completed and Superseded sections untouched; guard floors
unchanged (defs >= 200, max >= 856).

## Verification

node scripts/roadmap-census.ts reports 328 defs / 0 dups / max rm-2202;
node scripts/roadmap-ledger-check.ts stays rc=1 with only the pre-existing
stale pair; roadmap integrity, render, length and prose-residue guard suites
green; eslint ROADMAP.md and this doc rc=0.

## Adoption record (attempt 30b38f2a49654bc4989575bf0a21f9cd)

Reaped attempt 5754ea7e4cab4e0eb77f84f04a0d6792 completed this extension
(the rm-2200-2202 jump clear of the contested rm-215x sibling window) but
its typed result JSON never reached the spool — session reaped 2026-10-21
05:22Z with the event log intact and the envelope absent, a transport
artifact. Attempt 30b38f2a re-verified every leg first-hand and adopts the
work unchanged; ROADMAP.md carries no further edit from the adopting
attempt. Legs re-verified:

- identity: HEAD 76005aab721d5904401a85368a56573878dfb4b4 == origin/main
  (fetched this turn, base unmoved since dispatch); worktree porcelain = M
  ROADMAP.md (+31, pure insertions — zero status flips) plus this carrier
  only; `git ls-files .conductor` empty.
- census: node scripts/roadmap-census.ts = 328 defs / 0 dups / max rm-2202.
- ledger-check: rc=1 with ONLY the pre-existing PROVEN-STALE pair (rm-1523
  at ROADMAP.md:543, rm-843 at ROADMAP.md:712).
- guards: five suites 27/27 green (roadmap-integrity, roadmap-ledger-check,
  roadmap-render, roadmap-length, prose-residue).
- lint: local eslint (repo node_modules) rc=0 over ROADMAP.md and this doc.
- structure: riders verified under their owning defs — rm-252 rider at
  :241, rm-1524 at :593, rm-271 at :1187, rm-139 at :1636, rm-1451 at :1851;
  mints rm-2200/rm-2201/rm-2202 seated at :2076-2098 as status candidate;
  extension #52 tail comment lands after #51; zero flips, Completed and
  Superseded untouched.
- environment note: node_modules had been swept from this worktree after
  the reaped session; restored via bun 1.4.3 install with bun.lock
  byte-identical before/after (sha256 b17db30e…) — no repo content changed.

Census re-verified after this adoption record: 328 defs / 0 dups / max
rm-2202.

Currency amendment (same attempt): the rm-252 rider's research-window
snapshot was re-probed live at adoption — upstream had moved to 4bf77d9 =
PR #698 (agent v0.125.1, published 2026-10-21T04:15:12Z; behind=33 /
ahead=371, merge-base b48ae13b unmoved). Rider, ledger tail comment and
this doc's rider bullet were amended to record BOTH observations rather
than land a stale 'unchanged' claim; nothing else in the extension moved.
Post-amendment census: 328 defs / 0 dups / max rm-2202.
