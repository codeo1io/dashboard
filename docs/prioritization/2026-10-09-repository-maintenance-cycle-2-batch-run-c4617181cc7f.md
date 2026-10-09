---
module: dashboard
tags: ['prioritization', 'repository-maintenance', 'cycle-2', 'batch-selection']
problem_type: maintenance-planning
run: 'c4617181cc7f42698950cebd1e4cf043'
cycle: 2
---

# Dashboard maintenance batch (2026-10-09, run c4617181cc7f)

Authoritative batch-selection record for repository-maintenance cycle:2 run
`c4617181cc7f` (prioritize attempt `3367aac280474c7cb52184dfde1bda2c`), base
`7055c52` carrying this run's roadmap layer (census 244 defs / 0 dups / max
rm-800, guard pin 800; origin/main at selection: `546c93c`, 2 ahead — the
standing INTEGRATE OBLIGATION in the cycle-2 extension comment applies; none of
the three selected surfaces is touched by `7055c52..546c93c`: package.json,
Dockerfile, test/fork-exclusion-guard.test.ts, README.md unchanged, and the
workflow gate lands as a new step).

## Inputs

- assess `53587f1f60c6426c946a4b6a02908174` — fresh adversarial read of every
  src/ module at 7055c52 + the 2 unmerged main commits (546c93c) reviewed; F1
  NODE_IMAGE tripwire hazard, F2 protection shell, F3 pnpm install integrity
  (no `+sha512`, corepack bootstrap), F4 README citation drift.
- research `73ea932a6fab4a18a68b91169511f234` — six-lane first-hand sweep
  (upstream absorb window, npm majors, trivy/tripwire currency, corepack
  removal evidence, contract-1.8.0 provenance UI demand, zizmor).
- roadmap `7801cab84bd6409082b77bbf3fd002dc` — four mints rm-797..rm-800 + six
  dated riders + cycle-2 extension comment (frontier re-derived across all 72
  sibling worktrees + landed main rm-778 + PR #448 head rm-703); prior roadmap
  attempt 780a5702 died of a provider failure with zero durable work —
  forensics recorded, phase redone from scratch.

## Selection floor

The unresolved pool in THIS tree: 73 candidates after the roadmap layer (the
fresh cycle-2 mints rm-797..rm-800 plus 69 standing) + 2 open + 2 blocked. The
floor for selection: (a) THIS run's own evidence-backed discoveries with
acceptance criteria authored this cycle — no secondhand scope; (b) zero content
overlap with any LIVE sibling lane's selected batch (fleet scanned); (c)
locally verifiable end-to-end this cycle — no external clock, release, or
gate dependency; (d) small enough to implement/review/fold inside one cycle
(the rm-703 playbook). Three items clear the floor; rm-798 fails (c) — it is
hard-sequenced behind open PR #448's landing (reader-twin vendoring) and is
excluded despite minting fresh this run.

## Selected batch — 'supply-chain hygiene + citation truth'

| # | Item | Def / ownership | Surfaces | Effort | Verification |
|---|------|-----------------|----------|--------|--------------|
| B1 | pnpm install integrity: `+sha512` packageManager suffix OR digest-pinned standalone installer; bootstrap survives Node 25/26 corepack removal | `rm-797` (this run's mint, selected LEAD) | `package.json:57`, `Dockerfile:38/:52`, `test/fork-exclusion-guard.test.ts:64-66`, + dated compatibility note | M | `npm view pnpm@11.28.4 dist.integrity` cited; guard-test exact-pin flips to format+hash in the same change (or Dockerfile switches to the standalone installer); frozen-lockfile install green in CI; compat note records the Node-26 survivability |
| B2 | zizmor workflow-security gate beside actionlint (template-injection / untrusted-context class) | `rm-799` (this run's mint) | `.github/workflows/` gate job (container form, exact version pin), dated findings baseline note | S-M | workflow diff + actionlint rc=0 + the pinned zizmor run log on the baseline; accepted findings listed with dispositions (tripwire's standing-unfixed posture, no fail-on-fresh noise) |
| B3 | README dependency-table citation drift (hono 4.13.11 cited vs pinned 4.13.13) | `rm-800` (this run's mint) | `README.md` dependency table only | S | README diff; grep proof at the landing commit that cited values match package.json |

Zero cross-member file overlap; no member depends on another's landing; every
acceptance is checkable by this repo's own gates (vitest, eslint, check-types,
census, actionlint, the zizmor run itself). Deadline driver for B1: rm-139's
node-26 go/no-go (2026-10-28) — the corepack bootstrap path has an
evidence-backed expiry at Node 25 (v25.0.0 notes, PRs #57617/#59835), so
landing this batch closes the trust-and-shelf-life gap well inside the window.

## Claimed-and-excluded (congestion audit)

Fleet liveness verified first-hand (sqlite3 over the campaign stores, 2026-10-09
~02:4xZ): LIVE = 38e728540707 (prioritize, dashboard-main-06962913f2ac3bd2),
d1a0b216493d (implement, 3ba3c174), 788aa489a768 (implement, 57aa4107),
91776e259752 (implement, 57aa4107), 89ebbf499587 (implement, 3ba3c174),
cbe70604af06 (push, 162abb8870d480ad), ddb41af7e0bd (full_tests,
dashboard-fix-ci-setup-fast), 648e4eef (assess, 57aa4107), 0e0090a0
(prioritize, 3ba3c174); my campaign dashboard-main-5fa817b749ba87c3 holds only
this run. Dead lanes with worktrees on disk: 438dea88, c08cfec6, 32f33f1b,
30e60935, 9289efaa (failed implement — PR #448 remains its open artifact),
1dd9e2c4, ebdce89e (10-04). Every candidate considered, named by owner or defer
reason:

- **rm-798 provenance UI (this run's mint)** — EXCLUDED: hard-sequenced behind
  open PR #448 (dead lane 9289efaa's artifact, run-recorded); selecting it
  would mint work that cannot land this cycle.
- **NODE_IMAGE tripwire cure (assess F1)** — owned LIVE: d1a0b216 selected its
  rm-793 (implement phase now; batch 'gate-health + operator...'), historically
  triple-claimed (rm-755/779/782/788). Not re-selected.
- **routes/api.ts truth (healthz no-store + boundary comment)** — owned LIVE:
  38e728540707 selected its rm-599 + its rm-797 this same hour.
- **security-posture panel + per-cycle API budget** — owned LIVE: 91776e25
  selected rm-117 + rm-162 (cycle:1 batch, still in implement).
- **PR #444 conflict-stall cures / action digest re-pins / trivy bump /
  playwright bump / web lint gate / docs taxonomy / guard twins / upstream
  #583-#586 candidates** — sibling-owned unlanded (rm-781..rm-796 family map
  in the cycle-2 extension comment); d1a0b216's rm-794 (upstream #583/584) and
  candidates rm-795/796 are that LIVE lane's.
- **impeccable design-check sha512 pin** — owned LIVE: ddb41af7 (full_tests);
  content-disjoint from B1 (devDependencies region vs packageManager field).
- **rm-116 branch-protection fill** — deferred, not excluded for ownership: the
  2026-10-12 Monday CI layer is the forcing function; no live selection found
  (full-wall scan), but the value depends on checks-in-force truthfulness that
  Monday's tripwire/base-drift fires settle first. Natural cycle-3 lead.
- **rm-139 node-26 window / rm-140 pnpm major / rm-133 TS 7.x re-eval /
  rm-271 currency ladder (vitest 5.0.3, vite-plugin-pwa 2.0.0, jsdom 30.1.2)** —
  standing candidates with dated gates (10-21, 10-28) or soak-cut policy;
  deliberately not crowded into this batch. rm-797/B1 is explicitly disjoint
  from rm-140's major decision.

## Selection risk

- **Parallel id-collision on rm-797**: sibling 38e728540707 minted its OWN
  rm-797 (routes/api.ts docs truth) from the same rm-796 ceiling within the
  hour — different content, zero file overlap; BOTH walls' riders name the
  pairing for the mechanical integrate renumber (the documented same-hour
  collision pattern). No selection conflict.
- **package.json merge-order**: ddb41af7 (LIVE, full_tests) may touch
  package.json devDependencies (impeccable pin) — different region from B1's
  packageManager line; worst case a trivial union.
- **Workflow merge-order**: B2 adds a gate step to the Main workflow while
  ddb41af7 touches the design-check pin region of the same file — coordinate at
  integrate; both are additive edits.
- **B1 fallback path**: if corepack on the CI image refuses a `+sha512`
  packageManager (format support), the acceptance's option (b) (standalone
  digest-pinned installer in the Dockerfile) is the pre-authorized fallback —
  the def's acceptance is written as either-or for exactly this reason.

## Verification

- Selection flips verbatim-format `status: open (selected 2026-10-09, run
  c4617181cc7f cycle:2 prioritize 3367aac28047, 'supply-chain hygiene +
  citation truth')` on rm-797/rm-799/rm-800, original parentheticals preserved
  as `(previously candidate, ...)` with rm-N numbers stripped from the flipped
  def-lines (phantom-scan hygiene); selection riders appended at each block's
  last content line with the 32-char attempt id.
- Census unmoved by selection edits: `node scripts/roadmap-census.ts` → 244
  defs / 0 dups / max rm-800 (statuses shift candidate 73 / open 5); guard pin
  stays 800; `vitest run test/roadmap-integrity-guard.test.ts` green.
- Congestion scans dated and reproducible: campaign-store liveness (sqlite3),
  full-wall claim scan (`grep -F 'status: open (selected' run-*/ROADMAP.md`),
  content-keyword scans (sha512 / zizmor / citation), live batch-doc reads
  (38e72854's and d1a0b216's docs named in the riders).
