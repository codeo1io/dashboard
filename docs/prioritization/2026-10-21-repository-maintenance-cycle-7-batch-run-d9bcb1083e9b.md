# Repository-maintenance batch — cycle 7, run d9bcb1083e9b (2026-10-21)

Selected by prioritize (attempt 796552c1295448f295a10c36601842cf):
**Currency + integrity sweep** — the rm-252 agent-pin leg plus five freshly
minted defs, riding the cycle:7 roadmap mint already in this tree (+48/-0,
uncommitted): defs rm-2033..rm-2037, the rm-252 window rider, and the carrier
re-census appended to the 2026-10-15 batch doc. The tip tree is healthy
(assess battery all green at the same base) and the top assess finding
(Main CI dark, run 39491274385) self-healed — 6/6 jobs completed success
2026-10-20T20:47:09Z — so this batch spends the cycle on currency and
guard-rail strength, not repair.

## Selection (ordered; rationale = impact x risk x effort)

1. **S0 — ledger landing rider.** The roadmap mint (rm-2033..rm-2037 defs +
   rm-252 rider + carrier re-census) rides this batch's landing verbatim. It
   is the cycle's census re-anchor; every later member's def must survive to
   landing for the guard's newest-carrier claim to hold.
2. **S1 — rm-252 pin leg: fro-bot/agent v0.123.1 to v0.125.0 at
   `.github/workflows/fro-bot.yaml:357`.** The HIGH-value member: every agent
   pin below v0.125.0 carries the upstream PR #1893 workspace ca-certificates
   build break (the pinned Alpine revision left the package index, so
   workspace image builds fail), and upstream's own current tip commit IS
   PR #696 adopting exactly v0.125.0 — parity and cure converge on one
   digest. Config-layer release, no operator-contract delta (ceiling stays
   1.13.0); the Fro Bot workflow stays schedule-gated by the absent
   FRO_BOT_PAT secret, so nothing fires on landing. Effort: one digest-pin
   edit. Authority: the rm-252 rider recorded 2026-10-20 by this run's
   research + roadmap phases.
3. **S2 — rm-2033: trivy scanner v0.72.0 to v0.76.0** at the three sites
   (`.github/workflows/cve-tripwire.yaml:35`, `.github/workflows/release.yaml:384`
   and `:423`). CVE-database freshness feeds both the scheduled cve-tripwire
   gate and the release promote CVE gate; upstream took the same bump
   (window PR #686). The action digest pin (v0.36.0) is current and excluded.
4. **S3 — rm-2035: actions/cache v5.1.0 to v6.1.0** at
   `.github/actions/setup/action.yaml:43` — the drift-tracker-invisible pin
   class; upstream-adopted (window PR #688). One digest edit.
5. **S4 — rm-2036: integrity-guard deliverables-leg hardening** in
   `test/roadmap-integrity-guard.test.ts` (:200 bare DELIVERABLES_HEADING
   match; :152/:211 existsSync-only presence legs). The ledger just crossed
   330 defs and the guard is its only anti-drop tripwire; the bypass class
   is exactly how the 2026-10-09 landing silently dropped 53 files.
   Test-only change with red-first negative fixtures.
6. **S5 — rm-2037: impeccable 4.6.0 to 4.7.0** (detect-first) at
   `.github/workflows/main.yaml:85` + `AGENTS.md:77` together. Engine 0.1.16
   adds typography checks; the acceptance encodes the hold path — if 4.7.0
   finds an unscopable false-positive class, record the hold and keep the
   pin (a silent no-bump is the failure mode to avoid).
7. **S6 — rm-2034: WEB_TEST_FILE_PATTERN port** (upstream PR #683) into
   `scripts/should-release.ts` + the corpus contract in
   `scripts/release-paths.ts` (:38 hard-releases every web path today), with
   red-first legs in `test/should-release.test.ts`. Largest member
   (code + tests + corpus-lock interplay); ordered last.

**Cut rules:** if scope or battery time strains, drop S6 first, then S5 (its
hold path), then S4. Never drop S0–S3. The batch stays coherent without any
suffix member.

## Parallel-envelope reconciliation (must-read before landing)

The sibling envelope from run 318fb8c0 (unlanded, ids rm-2135..rm-2138)
minted four of these topics in parallel (trivy bump, #683 port, cache bump,
integrity-guard hardening); this run minted the same topics as rm-2033..
rm-2037 (impeccable is unique to this run). Both bands are off-main today.
Rule per the fleet mint-dedup convention: **first-landed-wins by content** —
if the sibling envelope lands first, this batch yields the contested def
lines at integrate (keeps its content where identical, records the
carve-out in the landing rider, and never re-mints); if this batch lands
first, the sibling owes the same. Never a third mint of any of these topics.

## Deferred, with rationale

- rm-252 full absorb (window 32 commits): estate-gated, whole-cycle effort
  (contracts 1.12.0/1.13.0 via window PRs #672/#685, operator fixes, the
  dev-majors wave). Only its pin leg rides here.
- rm-1449 / rm-1524 dev-majors wave (vitest 5, jsdom 30, jest-dom 7,
  vite-plugin-pwa 2): multi-suite migration, upstream-proven; a clean
  next-cycle batch, not a rider on a currency sweep.
- rm-139 Node 26: in_progress with its 2026-10-28 gate a week out and a
  base-image decision attached; deliberately not rushed into this batch.
- rm-878 branch-protection fill: live rulesets mutation on the GitHub side;
  sequenced alone so a config failure cannot mask a code failure.
- @playwright/test 1.64.1: forbidden by the closed Visual-gate parity def
  (pin/baseline/image triple must stay paired) — withdrawn at roadmap phase.
- TS 7.0.2: blocked, typescript-eslint 8.72.0 peer-caps typescript below
  6.1.0 — re-verified this cycle, non-candidate.

## Deliverables

- `ROADMAP.md`
- `docs/prioritization/2026-10-15-repository-maintenance-cycle-1-batch-run-3d6aa134904b.md`
- `.github/workflows/fro-bot.yaml`
- `.github/workflows/cve-tripwire.yaml`
- `.github/workflows/release.yaml`
- `.github/actions/setup/action.yaml`
- `.github/workflows/main.yaml`
- `AGENTS.md`
- `scripts/should-release.ts`
- `scripts/release-paths.ts`
- `test/should-release.test.ts`
- `test/roadmap-integrity-guard.test.ts`

## Gate record

- Assess battery at the same base (recorded in the cycle:7 assess phase
  result; the /tmp log files were swept between turns): check-types rc=0,
  lint rc=0, bun audit clean (815 pkgs, 0 advisories), tests green
  (89 files / 3929 root + 41 files / 1852 web), census 325/0 at pre-mint
  base with ledger-check informational stale cites only.
- Fresh this session at the same base, post-roadmap-mint:
  `node scripts/roadmap-census.ts` healthy; roadmap ledger-check PROVEN-STALE
  set unchanged (the two known informational cites); targeted vitest on the
  roadmap guard pair green (2 files, 18/18); eslint on both mint-touched
  files rc=0. The implement phase owns the full re-run battery on the
  batch tree.

Ledger census at authoring: **(330 defs / 0 dups / max rm-2037)** — the
cycle:7 mint on the pre-mint base of 325/0; machine-verified by the guard's
newest-carrier check (this doc is now the newest marker carrier).
