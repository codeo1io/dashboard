---
module: dashboard
tags: [repository-maintenance, cycle-2, batch, rm-965, rm-966, rm-967, rm-100]
problem_type: maintenance-batch
---

# Contract Coherence Batch — record (2026-10-13, run 8136454d4f97)

Batch `Contract Coherence Batch` (prioritize ab299745), implemented at dispatch
base `6ec2328` on the re-anchored frame. HEAD is still `6ec2328`
(`conductor/run-8136454d4f97`); the delta is uncommitted per phase policy.

## Attempt forensics (this phase)

- `536a6aa` — provider death at 43s, message_count 1: nothing durable.
- `6ce00bd` — ran 16:19:17→17:05:29Z (2026-10-12), message_count 30, reaped
  `exit_reason=failed` (provider). No result envelope, no scratch dir. Its full
  pi transcript survived on disk
  (`.pi/agent-cliproxy-only/sessions/--home-agent-...-run-8136454d4f97-8136454d--/2026-10-12T16-19-34-276Z_conductor-8136454d4f97-primary-pi-retry-8da6e6edd4.jsonl`)
  and the worktree carried its uncommitted delta. **Adopted** after
  hunk-by-hunk verification against the stewardship units A–E.
- `60d974f` — provider death at 35s, message_count 3: nothing durable.
- `dc1a89e` (this record) — adopted 6ce00bd's delta, closed the remaining leg,
  re-anchored the staged reconcile to `origin/main=6acea88`, re-ran gates.

The staged 40-file reconcile (content = origin/main) predates the implement
attempts: 6ce00bd found the worktree already re-anchored to f85fb7d content
(staged, HEAD 6ec2328) when it started — the stewardship re-anchor realized as
a staged checkout. This attempt refreshed it to 6acea88 (see below).

## Live main moves handled during the phase

- Stewardship anchored `origin/main=f85fb7d`. During implement, main moved:
  `d42b978` (PR #612, fro-bot/agent CI pin v0.120.0 → v0.121.0) + `6acea88`
  (1-file upstream merge). Resolution: `git checkout origin/main --
  .github/workflows/fro-bot.yaml` — the staged reconcile tree now byte-equals
  origin/main (40/40 files, `git diff --cached origin/main` empty). v0.121.0
  speaks contract 1.10.0 (stewardship + research 1597c234 first-hand), so
  rm-966's pin-coherence goal is satisfied by main's own bump; keeping v0.120.0
  would have been a gratuitous downgrade diff vs main.

## What landed (unstaged delta over the re-anchored frame)

- **rm-965 (LEAD, reconcile)** — pre-satisfied: main's `96bfbb0` union merge +
  `2d67bd5` upstream absorb landed the reconciliation; the worktree's staged
  content = origin/main. Rider legs that remained on this frame: web
  `src/index.css:792` stray opener removed (brace census balanced),
  `web/src/operator/runtime.ts:378` `gapEl` destructure restored, `package.json`
  test-leg split (`test:server` / `test:web` run separately, both RCs visible —
  the `&&` chain hid the web leg).
- **rm-966 (1.10.0 adoption)** — `src/gateway/operator-contract/version.ts`
  `1.9.0 → 1.10.0`; `responses.ts` mirrors upstream #1787/#1788 closed sets
  (`OPERATOR_PUSH_TRIGGER_KINDS = ['approval','question','run_failed']`,
  `OPERATOR_PUSH_HEALTH_STATUSES = ['ready','degraded','unknown']` + types);
  `parse.ts` session `push` validated-when-present / stripped-when-malformed
  (fail-open, gateway parity); `index.ts` exports + omission note;
  `public/operator-stream.js:33` `PINNED_CONTRACT_VERSION = '1.10.0'`;
  `public/operator-stream.d.ts` gained `APPROVAL_FETCH_TIMEOUT_MS` (this
  attempt — tests typecheck against the d.ts, which missed it and broke
  check-types) and `observedContractVersion` on `StreamState`. Pin-parity is
  asserted by the pre-existing lockstep tests (`test/operator-stream-core.test.ts`
  describe 'contract pin lockstep parity', `test/operator-fixture-harness.test.ts:2736`).
  Absorb-trap containment: the `#600` absorb (landed via main's `2d67bd5`)
  retains `APPROVAL_FETCH_TIMEOUT_MS`, re-hoisted above `buildApprovalClient`;
  **this attempt landed the missing bounds regression** —
  `describe('buildApprovalClient — approval-path fetch bounds (rm-594 regression)')`
  spies `AbortSignal.timeout` and pins every approval-path `browserFetch`
  (refreshCsrf + decide csrf/POST + list) to `APPROVAL_FETCH_TIMEOUT_MS`.
  Workbox `@7.4.1` pins N/A (no workbox devDeps in this repo).
- **rm-967 (drift observability)** — `src/gateway/operator-sse-reader.ts`
  exports `OperatorContractDriftError` (kind/clientVersion/observedVersion) and
  its drift log payload carries both versions, never the runId;
  `operator-stream.js` drift state carries `observedContractVersion`
  (first-write-wins) and the drift notice renders pinned + observed versions +
  "Dashboard update required." (no "refresh the page" on the drift path).
- **rm-100 riders** — Dockerfile:16 digest repinned to
  `173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66`
  (stewardship re-probe; 6ce00bd confirmed live 200 on 2026-10-13); the other
  gate cures (lint 62E+1W, TS2322 mocks, prose-residue docs/plans exclusion,
  pnpm pin, compute-release-tag ceiling) arrive with the main-frame adoption
  and were verified green on this tree.
- **ROADMAP.md** — the roadmap-phase mint (rm-965..rm-970 + riders, patch
  `roadmap-delta-61e11867.patch`) applied by content onto the re-anchored
  ledger; census 241 defs / 6 new unique ids / next free rm-971 (8
  pre-existing duplicate def-line ids are a f85fb7d-frame graft-era condition,
  documented in the ext #39 addendum, not re-minted). rm-966 status and the
  ext #39 addendum were amended by this attempt to record completion + the
  v0.121.0 adoption. Length guard green.

## Gates (first-hand, this attempt, TMPDIR=/tmp, host node v22.22.0 — engine
`>=24` warning only, pre-existing on every lane)

- `pnpm check-types` → RC 0 (all three legs: server, web, .opencode)
- `pnpm lint` → RC 0 (whole repo, cache warm; includes ROADMAP + operator-stream.js)
- `pnpm build:web` → RC 0 (validates the index.css brace cure)
- `pnpm vitest run test/operator-contract-conformance.test.ts
  test/operator-sse-reader.test.ts test/operator-stream-core.test.ts
  test/roadmap-length-guard.test.ts` → 4 files, **1145/1145**
- `pnpm vitest run test/operator-fixture-harness.test.ts` → **218/218**
- `pnpm vitest run --config web/vitest.config.ts src/operator/runtime.test.ts
  src/operator/stream-reattach.test.ts` → 2 files, **62/62**

Focused/impacted selection per the phase budget; the full `pnpm test` sweep +
web leg and the Dockerfile digest replay (full 40-char base sha
`6ec23280652c1073886fab835923f16d16530f1b`) are reserved for the validation
gate.

## Verify

- `git -C <this worktree> diff --cached origin/main` → empty (reconcile frame).
- `git diff` → the 15-file batch delta above; `git diff 6ec2328 --name-only |
  wc -l` → 40 staged paths + untracked census 45 total engine-delta paths.
- `grep -n "OPERATOR_CONTRACT_VERSION" src/gateway/operator-contract/version.ts
  public/operator-stream.js` → both `1.10.0`.
- Gates as listed; each RC is reproducible verbatim.

## Deferred (unchanged from prioritize)

- rm-968 drift tripwire (needs a live dry-run dispatch; Actions dark since
  2026-10-09), rm-969 remote-ref GC (stewardship), rm-970 clonedeps honesty,
  branch-protection fill (after this batch lands green), platform majors +
  Node 26 LTS (dated-matrix riders). Next gateway-minor watch: v0.122.0 exists
  (2026-10-12, patched OpenCode 1.19.0 harness) — pin bumps ride PRs like #612.
