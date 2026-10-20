# 2026-10-21 · repository-maintenance cycle:3 · roadmap extension — run 1d01cf5230b7

**Phase:** roadmap (attempt d01d000cb3d049b4a0e3c99e5bc7f262), composing on research attempt 500770d192c54a599408db03d83860e7 and assess attempt cb880307a628448098e1576f455ceffb of the same run.
**Base:** 76005aa == origin/main (verified unmoved before and after mint; tree otherwise clean).
**Deliverable left uncommitted in the run worktree for the integrate/landing pipeline** — commit/push/pr/ci are prohibited at this phase.

## What was minted and why

Two decision-record defs, chosen because the 2026-10-21 research phase wall-probed EVERY sibling worktree ROADMAP plus main and found both lanes unclaimed; every other researched candidate was already owned (def'd on main or minted by an unlanded sibling envelope) and is recorded as rider evidence instead:

- **`rm-2150` (track: compliance, priority 70.0, candidate)** — repository visibility decision. Live evidence: `gh api repos/codeo1io/dashboard` → `private:false, visibility:public, fork:true, parent:fro-bot/dashboard, created 2026-08-10T03:59:04Z`. The fork publishes internal runbooks, roadmap ids, and operator conventions to the open web while the estate's repo-creation policy is private-by-default. GitHub cannot convert a fork to private in place, so acceptance enumerates exactly three dispositions (accept-public with audited rationale / private-duplicate with canonical-remote switch / support-forced-detach) and requires a dated, operator-attributed decision rider.
- **`rm-2151` (track: compliance, priority 40.0, candidate)** — license decision. Live evidence: no LICENSE/COPYING in `git ls-files`, no `license` field in package.json, upstream parent itself spdx-null. Acceptance: LICENSE file + package.json field, or a deliberate-unlicensing rider tied to rm-2150's disposition (private duplicate ⇒ no file needed; accept-public ⇒ license expected).

## Rider added to an existing def

`rm-252` (upstream absorb window) gained a dated rider with the 2026-10-21 window bundle from research: 32 unabsorbed commits at tip f37600d (PR #696, fro-bot/agent v0.125.0 — workflow-pin parity converges with the ca-certificates estate cure), latest upstream release 2026.10.59; dev-dep major burst #690–695 dispositioned onto existing defs (rm-1524 vitest5, rm-282 jsdom-pair with 30.1.1→30.1.3 drift note, rm-1960 repair lane for vite-plugin-pwa 2.0.0); operator cures #678/#679/#682 in-window (#682 maps onto this fork's mountLoader flake sites); #683 release-skip now upstream-native — absorb supersedes fork-first ports, and the two unlanded sibling envelopes that minted it must reconcile by title at fold (deliberately NO def-id citations of those bands: neither is on main, and dangling narrative refs trip the render guard); contract ceiling extends to 1.13.0; fork agent pin still v0.123.1.

## Not minted, with evidence (ownership probed)

- ErrorBoundary render-crash gap — def `rm-514` on main (triple-contested unlanded); the assess phase's "fresh" label was corrected by the research phase. Never re-mint.
- trivy v0.76.0 / actions-cache v6.1.0 / PR#683 port / integrity-guard hardening / impeccable 4.7.0 — minted by TWO unlanded sibling envelopes (bands unprintable in def text; reconcile by content at fold, first-landed-wins).
- TypeScript 7 — re-verified hard-blocked live: typescript-eslint 8.72.0 peer range `>=4.8.4 <6.1.0` vs fork 6.0.3.
- scorecard.yaml timeout restoration — owned by an unlanded fog lineage; setup-qemu v4 major — owned by the drift-sweep def (outage-gated); provenance/SBOM — already shipped (rm-105); pnpm-residue cluster — owned by the standing adopt-fold envelope.

## Mint-band discipline

Ids rm-2150/rm-2151 verified free across main AND every sibling wall before mint (contiguous fresh band above the rm-2142 wall frontier; bands rm-2033-2037, rm-2119-2122, rm-2135-2138 and maxima rm-2139/rm-2140/rm-2141/rm-2142 all reserved to unlanded lineages).

## Deliverables

- `ROADMAP.md` — 2 new defs (rm-2150, rm-2151) + 1 dated rider on rm-252; +7 lines, zero deletions; completed history preserved.
- `docs/prioritization/2026-10-21-repository-maintenance-cycle-3-roadmap-run-1d01cf5230b7.md` — this document.

## Gate record (this phase)

- `node scripts/roadmap-census.ts` → **327 defs / 0 dups / max rm-2151** (pre-mint 325/0/rm-2032 re-verified first).
- `node scripts/roadmap-ledger-check.ts` → rc=1 unchanged: exactly the 2 pre-existing PROVEN-STALE claims (rm-1523 cites 389d60ef, rm-843 cites d00d095) — main-wide drift, owned by the unlanded verify-and-adopt envelope; no new claim introduced (upstream shas in the rider do not resolve in this fork and are never flagged by design).
- Targeted vitest over the five roadmap guard suites: integrity, render, length, ledger-check, prose-residue — all green (see phase_result evidence_refs for the exact counts).
- eslint on ROADMAP.md + this document: clean.
- `git status` at close: `M ROADMAP.md` + this untracked doc only.
