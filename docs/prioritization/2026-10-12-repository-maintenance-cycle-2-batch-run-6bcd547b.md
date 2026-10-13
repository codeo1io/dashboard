---
module: dashboard
tags: [repository-maintenance, cycle-2, batch, rm-100, rm-954, rm-956, rm-957, rm-958]
problem_type: maintenance-batch
---

# Repository-maintenance cycle 2 — batch record (2026-10-12, run 6bcd547b5fd4)

Batch `green gates, honest drift, docker truth`, implemented at base `6ec2328`
(shared stewardship worktree; clean porcelain at assess open).

## Inputs

- assess `4194de21` (gate census from a COLD node_modules: `pnpm test` 9F/3007P in
  4 files, `pnpm check-types` 7× TS2322 static-assets, `pnpm lint` 63 problems;
  docker digest drift; Actions dark + protection shell)
- research `f0449d80` (OPERATOR_CONTRACT_VERSION 1.10.0 at fro-bot/agent v0.120.0
  vs fork pin 1.9.0; fail-closed drift blackout verified in-tree at
  src/gateway/operator-sse-reader.ts:517-523)
- roadmap ext #40 `98d7e89b` (mints rm-953..960; carrier patch applies clean at
  6ec2328; spool postimage 237 defs)
- prioritize `0a3d83a7` (this selection; scoring table + dependency analysis in
  spool scratch-0a3d83a7/2026-10-12-cycle-2-batch-selection.md)
- stewardship `04780c25` (17 file:line surfaces across 15 files, every citation
  re-verified live before emission)

## What landed

- **Gates green (rm-100 rider, LEAD)** — every failing surface cured at its root:
  `validateDynamicId` exported (public/operator-stream.js),
  `APPROVAL_FETCH_TIMEOUT_MS` hoisted above its first consumer (4×
  no-use-before-define), operator-sse-reader.test.ts CRLF-split fixture converted
  to interpolated field names (3 failures), fork-exclusion-guard pnpm pin updated
  to 11.28.5 with `pnpm pm ts` probe of packageManager, static-assets.test.ts
  mock snapshot completed with enumerationIncomplete/refreshDurationMs/
  refreshDegraded (7× TS2322) + 16 lint errors, prose-residue-guard cured by the
  main-lane `docs/plans/` exclusion (landed on main in b8fb532; supersedes this
  batch's original plan-doc prose-qualification — do not diverge from main's
  landed cure), ROADMAP.md trailing spaces stripped + bare bracket label-ref
  escaped. Additionally restored main's lane debts on this base:
  compute-release-tag GIT_CEILING_DIRECTORIES (TMPDIR-inside-a-git-repo ceiling).
- **rm-954a drift honesty** — `nextStreamState` carries `driftObservedVersion`;
  operator-sse-reader.ts and the client gate the echoed version through
  `safeVersionEcho` (version-grammar regex, `unknown` otherwise); the drift
  notice names both sides ("client 1.9.0, gateway X") and states that a page
  refresh will not clear it. No behavior change to the fail-closed blackout
  (still `shouldReconnect: false`).
- **rm-956 docker truth** — Dockerfile:16 digest re-pinned to the live
  `sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66`
  (24-trixie-slim, re-probed at implement time 2026-10-13 — unchanged),
  pnpm 11.28.5 across image + packageManager coherence, `mkdir -p /data/listener`
  prepared writable for the runtime user (prevents the
  read-only-`/data` listener-store failure mode), HEALTHCHECK against the public
  `/api/healthz` route (no auth dependency), `.dockerignore` gains `tests/`.
- **rm-957 + rm-958-lite truthing** — AGENTS.md Fro Bot paragraph rewritten to
  dated facts (state `active` re-probed 2026-10-13, zero repo secrets,
  HAS_FRO_BOT_PAT graceful defusal, cron silence explained by the repo-wide
  Actions disablement since 2026-10-09, 422 dispatch probe 2026-10-12);
  fro-bot.yaml stale `disabled_manually` comments retired (comments-only, guard
  steps untouched); Cloned Dependency Source rewritten pin-manifest-only
  (nothing under `.slim/` is tracked; fresh worktrees have no clone);
  gateway-access.md gains "The listener `/data` volume" section (graceful
  degradation: fail-closed catch leaves the channel unmounted, dashboard serves
  on, health check unaffected).
- **Carrier + web leg** — ROADMAP.md carrier landed (rm-953..960 + riders, 237
  defs); package.json `test` split into `test:server` / `test:web`;
  `.github/workflows/main.yaml` CI test job split into server + web legs (each
  `vitest run` against its own config) so the previously-masked web leg is
  independently visible and red-immune to the pretest chain.

## Non-goals (explicitly deferred)

- rm-135 absorb batch #3 (upstream #600-#608): needs green gates to ride; NOT
  done here — the tree's approval-stacking and effective-status content came in
  via main-lane alignment (see Implementation record), not as an absorb.
- Engine/Node-26 fleet: separate track.
- rm-116 protection fill: blocked on Actions resurrection (see below).
- Fixing CI: Actions are disabled repo-wide (out of repo control).

## Implementation record (2026-10-13, implement attempt 8c0d64b9)

The first implement attempt (b204f432) died of a provider failure mid-turn and
left its work uncommitted. Verified against this work order and adopted: the
tree was aligned to main's landed lane hardening where the batch's gate cures
overlapped it (b8fb532, on origin/main since 2026-10-12: rm-261 abort paths,
rm-854 multi-line data join, rm-853 gap detection, rm-477 appendStreamChunk,
rm-594 approval timeouts, #600/#602 approval-precedence and one-Cancel-control
content, rm-690 cache policy, rm-180 port grammar — six files byte-identical to
origin/main), which supersedes re-deriving those cures independently. Corrected
in this attempt: ROADMAP.md was found synced to origin/main's ledger (235 defs,
missing this run's mints) — restored to base 6ec2328 and the validated carrier
patch applied (237 defs). Completed the five missing doc surfaces above and
re-probed the docker digest.

## Verification

- `pnpm lint` — 0 problems (63 → 0).
- `pnpm check-types` — clean (server + web + .opencode).
- `pnpm test` — both legs green via the split scripts (server + web), run with
  `TMPDIR=/tmp` (delegate TMPDIR lives inside a git repo and breaks
  compute-release-tag's outside-a-git-repo test).
- `pnpm build:web` — client builds (web/dist fresh for static-assets assertions).
- Dockerfile digest re-probed at implement time against auth.docker.io.

## Follow-on hooks

- CI remains unrunnable until repo Actions are re-enabled (resurrection tracked
  by the fleet's ext #39-class item); the workflow split is validated by
  actionlint-clean syntax + local leg runs only.
- This lane's carrier tops at rm-960; the shared dashboard mint frontier is
  spool-census-based, NOT lane-derivable — other extensions minted up to rm-994
  on 2026-10-12, so consult the spool census (not this file) before minting.
