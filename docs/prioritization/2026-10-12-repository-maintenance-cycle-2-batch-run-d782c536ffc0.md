# Repository-maintenance cycle 2 batch — green-lineage + version-truth + recovery-contract (run d782c536ffc0)

- date: 2026-10-12 (selected) / 2026-10-13 (implemented)
- run: repository-maintenance:2a33b314687a4d468c2a9c6f79e1ef8d:cycle:2:/work/projects/dashboard
- base: 6ec2328 (worktree `conductor/run-d782c536ffc0`), uncommitted delta by design
- phase chain: assess 10b4d0e0 → research 67e6e3ea → roadmap b2ee3fed →
  prioritize 5f8285e1 → stewardship 38f9f8e9 → implement (this batch)
- implement attempts: 2a7bbb09 (dead 429 @ 23s, nothing durable) → 284b2de8
  (dead 429 @ 1254s, B1/B3/B6/B7-partial landed uncommitted) → e5203850
  (adopted 284b2de8's tree delta, completed B2/B4/B5 + re-adjudications)

## Why this batch (from prioritize 5f8285e1)

The lineage at 6ec2328 was red in four independent classes, all cheap to cure
and all durable: (1) the gate inventory — check-types 7x TS2322, lint 62E+1W,
vitest 9 failures across 4 files; (2) the pnpm pin had split three ways
(package.json 11.28.5 / Dockerfile 11.28.3 / guard-literal 11.28.3) and the
split class regrows under per-file pinning; (3) Dockerfile:16 pinned a digest
that no longer exists on the registry (HTTP 404) while the live tag moved;
(4) the Actions outage (repo disabled since 2026-10-09) has no recovery
ordering recorded anywhere, and the rm-843 permissions allowlist was reverted
live to `all` with no contract to re-probe.

## What landed

- **B1 Gate cures** (static-assets.test.ts mock typing x7, operator-stream.js
  APPROVAL_FETCH_TIMEOUT_MS hoist + `validateDynamicId` export restored,
  operator-sse-reader rm-265 ready-frame interpolated from
  `OPERATOR_CONTRACT_VERSION` instead of hardcoded 1.6.0, prose-residue
  allowlist + in-doc qualification note, ROADMAP lint: backticked the
  impeccable module array + 41 trailing-space acceptance lines) — mostly from
  adopted attempt 284b2de8.
- **B2 Version-truth class-kill (rm-1013)** — Dockerfile drops BOTH
  `corepack prepare pnpm@11.28.3` lines (corepack resolves pnpm through
  package.json's `packageManager`, the single pin); test/fork-exclusion-guard
  flips from literal-version asserts to the split's ABSENCE (exactly one
  `pnpm@<version>` literal across pin-bearing files; zero `corepack prepare
  pnpm@` in Dockerfile). rm-131's acceptance re-adjudicated from the literal
  11.27.0 assert; rm-140's three-files-in-one-change clause retired (adoption
  is now a one-file bump). pnpm 12 DEFERRED — dated re-evaluation comment
  sits next to the guard assertion per rm-140.
- **B3 Dockerfile:16 digest repair** — pinned to the live `24-trixie-slim`
  index digest `sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66`
  (probed 2026-10-12 via registry auth token; re-probed 2026-10-13 at
  implement — unchanged).
- **B4 Actions-permissions expected-state contract (rm-1012)** —
  docs/solutions/workflow-issues/actions-permissions-expected-state-contract-2026-10-13.md:
  re-adjudicated allowlist from the workflows census (7 patterns), one-command
  re-probe, apply recipe. Ships DORMANT per the item's own clause: Actions is
  still dark (422 dispatches), and the apply rides the recovery runbook's
  step 2 so a stale-narrow list cannot red-herring the catch-up.
- **B5 Recovery-contract runbook (rm-1014)** —
  docs/runbooks/actions-recovery-order.md: 4 steps (prove-runs-register →
  guards-sentinel-first + permissions apply → engine decision + grouped
  update burst → dated platform bumps only after the 1.9.0-adoption
  reconciliation), each with owner, skip-condition, and
  precondition-already-changed clause; one-time validation clause.
  gateway-access.md gains the fro-bot/agent #1784 sign-in-stores-full
  outage-mode note (gateway v0.120.0).
- **B6 rm-252 rider** (absorb-window currency, rides B7's delta) — window
  re-measured 7→9 at ab3c68a; #611 (02a712e) rides free (agent pin
  v0.119.3→v0.120.0 + scorecard v2.5.0); #610 (1b42562) is renovate.yaml-only
  and MUST NOT ride (fork-exclusion invariant). fro-bot.yaml:347 still pins
  v0.119.1 — bump to v0.120.0 at the next absorb. Pre-registration resolved:
  v0.121.0 landed on schedule with agent-side contract still 1.10.0 and
  upstream still on 1.9.0 with no adoption PR open — the rm-966 clock is
  real.
- **B7 Roadmap extension #42 applied with renumber** — the pre-registered
  rm-985/986/987 did not survive the fleet's same-day mint movement
  (sibling ext-#42 collision caught at prioritize; frontier re-census at
  apply time); landed as **rm-1012 / rm-1013 / rm-1014**, content identical,
  full census at ROADMAP.md (cycle-2 extension #42 comment). 232 defs / 0
  dups / next free rm-1016 after the post-apply amend (rm-1015 spool-claimed
  by run 6f039c58ed8d's b6cf1eb6 postimage; rm-1012 double-minted vs fd2496c3
  — bind by content at integrate).

## Deliberately NOT done here

- No absorb of upstream window commits (strand-adoption risk; next absorb
  bumps fro-bot.yaml to v0.120.0).
- No live permissions PUT (dormant, ordered per rm-1014).
- No pnpm 12 / Node 26 / TS 7 / vitest 5 moves (dated riders; rm-140
  deferred with comment).
- Repo-wide `pnpm test` — reserved for the validation gate; this phase ran
  the impacted set (see below).

## How to verify

- `pnpm check-types && pnpm lint` — both green.
- `pnpm build:web` then (TMPDIR=/tmp) `pnpm exec vitest run
  test/static-assets.test.ts test/operator-sse-reader.test.ts
  test/prose-residue-guard.test.ts test/validate-dynamic-id-parity.test.ts
  test/fork-exclusion-guard.test.ts test/operator-stream-core.test.ts` — all
  green (direct vitest bypasses pretest: build first).
- `grep -c '^- id: `rm-' ROADMAP.md` → 232; `grep -o '^- id: `rm-[0-9]*'
  ROADMAP.md | sort | uniq -d` → empty.
- Digest probe: registry auth token → manifest-by-tag `docker-content-digest`
  equals the pinned value above.
- `gh api repos/codeo1io/dashboard/actions/permissions` → currently `all`
  (the contract documents the expected `selected` state + apply).
