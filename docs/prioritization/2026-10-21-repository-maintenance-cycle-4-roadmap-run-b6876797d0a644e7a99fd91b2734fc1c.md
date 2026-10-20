# Repository-maintenance cycle 4 roadmap — run b6876797d0a644e7a99fd91b2734fc1c

Roadmap write of 2026-10-21 at base 76005aa == origin/main (tip verified unmoved live). Phase lineage: assess e3231686836140b5bd23050124bbea37 (succeeded, full adversarial battery green at base), research 7f86ac5daf51456c8c3ea03a83473604 (succeeded — the redo after the 8268e817 session-reap; its dossier is the candidate record), roadmap 9db02a379af043f2b0031886261b8813 (this write).

## Census

326 defs / 0 dups / max rm-2154

One mint above the live fleet wall maxima (the highest sibling claim at write time sits below the minted id; ids below the mint were verified claimed across the walls before minting). Re-verified with `node scripts/roadmap-census.ts` after the write.

## Deliverables

- `ROADMAP.md` — minted rm-2154 (renderer-strand heal client half: one guarded reload plus transient notice when the output-renderer chunk 404s; reliability, priority 48.0, status candidate) with concrete acceptance (per-hash loop guard, notice through the setOutputRendererLoader seam, non-404 rejections notice-only, red-first seam test, service-worker placement half excluded by title) and file/line evidence (web/vite.config.ts:40 autoUpdate, web/src/operator/renderer-source.ts:19 literal-path import, web/src/operator/runtime.ts:564-570 settle-on-rejection). Appended four dated riders: rm-252 (window 32 at upstream f37600d through release 2026.10.59, zero open upstream PRs, agent tip v0.125.0 vs fork pin v0.123.1 at fro-bot.yaml:357, plus the actions/cache tag-order corrective: v6.1.0 is newest by tags and the fork uses actions/cache in zero workflows), rm-689 (OSV CVE-2023-45853 still open, modified 2026-10-21T02:50:06Z, no fix_version; tripwire gate still dead at its scalar-index jq defect), rm-139 (nodejs.org/dist live: v26.12.0 still lts:false, 2026-10-28 gate 7 days out, @types/node 26.6.5 pairing), rm-860 (typescript-eslint 8.72.0 peer ceiling typescript <6.1.0 holds — TS 7 adoption still blocked at the lint boundary; typescript 7.1.0-beta train datum).

## Rejected mint candidates (research dossier of record, 7f86ac5d)

- cve-tripwire jq defect — three sibling lineages already carry it; never a third mint. The assess-phase live evidence (failed runs 39265652862 on main schedule 2026-10-19 and 39451635447 2026-10-20; local scalar-index repro; the alert path being unreachable alongside the gate) is evidence for the existing families, not a new def.
- Rate-limit headroom tile — the limiter counts requests, not quota headroom (a metering lie); fold into a state-assert lane only if that lane ever mints.
- Fro Bot live-state truthing — owned by the rm-1450 decision arm and the rm-1410 wording lane; the assess-phase reversal datum (workflow 330819996 disabled_manually again while AGENTS.md:100 still claims ACTIVE) rides those defs, not a new mint.
- TS 7.0.2 adoption — blocked at the typescript-eslint peer ceiling; recorded as the rm-860 dated rider instead.
- Playwright 1.64.1 / axe-core 4.14.0 bumps — explicitly declined/parked: the 1.64.1 bump is refused by the pin/baseline/guard triple (ROADMAP rm-881 close-out) and axe 4.14.0 is gated behind the visual a11y remediation pass (rm-2005, which trims the bump while its gate fails at 4.14.0).
- Dependabot darkness — fresh corroboration only (one PR ever, 2026-10-02; axe-core 4.14.0 and playwright 1.64.1 drift produced zero PRs); probe again on or after 2026-10-24 before treating it as a defect rather than cadence.

## Fleet discipline notes for integrate

- The mint id was chosen strictly above every unlanded sibling claim at write time; if a later wall lands an id collision the reconcile rule is first-landed-wins by content, with the renderer-heal scope reconcilable by title against any absorb-narrative def.
- This doc is the newest marker-bearing carrier; its census claim above is the live-ledger truth for the integrity guard.
