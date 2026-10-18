---
module: dashboard
tags: [repository-maintenance, cycle-2, batch-selection, rm-856, rm-740, rm-252, rm-780]
problem_type: maintenance-batch
owner: repository-maintenance 144ffbbcc57a4d7f98c31927b85cbc32
run_id: 77d7cc3e69bd41f997bdbe0b9b873142
attempt_id: 823cbc11444148aead66fbfc022dee65
base: 5ab50da0
selected: 2026-10-18
---

# Cycle 2 batch: Monday-revival truth pass plus currency pair

Selection for run 77d7cc3e69bd41f997bdbe0b9b873142 at base 5ab50da0. Coherent
theme: every scheduled sentinel that fires on 2026-10-19 must be able to tell
the truth on its first post-suspension run, and the two cheap currency fixes
that carry no estate risk ride along. Four legs, all tree-local, all fully
verifiable in this worktree, none gated on an external decision.

## Leg 1 — rm-856: base-drift compares the pinned tag, not a hardcoded alias

The lead, deadline-driven. The node:24-slim and node:24-trixie-slim aliases
stopped agreeing on 2026-10-18 (24-slim moved to sha256:a5f4366e while the
trixie family still pins byte-equal to the Dockerfile ARG at sha256:7f486cab,
verified twice by registry HEAD probes). .github/workflows/base-drift.yaml
inspects the hardcoded node:24-slim name at lines 68 and 80 while line 90
greps every sha256 pin out of Dockerfile, so the first post-disable Monday
fire at 2026-10-19T04:13Z exits 1 on a false comparison unless this lands
first. Cure: derive family and digest from the Dockerfile:16 ARG NODE_IMAGE
value using the resolve pattern rm-779 already landed for cve-tripwire, then
inspect that exact tag in both the buildx leg and the curl-fallback leg.

- files: .github/workflows/base-drift.yaml
- acceptance: the workflow text contains no literal node: tag outside the
  Dockerfile-derived variable; a local simulation of the curl leg over both
  24-slim and 24-trixie-slim live digests reports green when the pinned
  digest is current and red only on true drift; actionlint passes on the
  edited workflow via the container form.
- verification: run the extraction sed against Dockerfile, probe the registry
  by HEAD for the derived tag, and actionlint the workflow file.
- deadline: best case lands before the 2026-10-19T04:13Z cron; worst case the
  cron reds once falsely and every subsequent Monday is truthful — the cure
  stays first-priority either way because the red it removes is standing.

## Leg 2 — rm-740 amendment: staleness parse accepts the channel's own tags

scripts/release-channel-staleness.ts rejects third tag components above 31
as day out of range while the channel minter emits year.month.patch, so the
newest-selection is blind above .31 — demonstrated live on 2026-10-18 when
the check reported newest 2026.10.31 against a tree holding 2026.10.47.
Latent in CI only because the origin tag ceiling is 2026.10.25.

- files: scripts/release-channel-staleness.ts, test/release-channel-staleness.test.ts
- acceptance: parseCalverTag accepts any third component the minter can emit;
  ordering stays numeric per component; age stays creatordate-based; the day
  fixtures at test line 40 keep passing as the legacy subset; the header
  comment no longer claims day semantics; the patch-shaped fixture set gains
  a case above 31 proving newest-selection sees it.
- verification: corepack pnpm exec vitest run with maxWorkers 2 over the
  staleness suite plus a live node run of the script with dash dash json.

## Leg 3 — rm-252 rider execution: agent pin to v0.123.0

Upstream released fro-bot/agent v0.123.0 at 2026-10-18T02:49:02Z (durable
operator sessions, fail-run-promptly on provider rejection, coordination-lock
release for cancelled runs, dev-file globs under dot-directory worktrees) and
the operator contract holds at 1.11.0, byte-confirmed against the pinned
contract constant on live main. The fork pins v0.122.3.

- files: .github/workflows/fro-bot.yaml, AGENTS.md
- acceptance: the pin line moves to the v0.123.0 commit sha with its comment
  updated; the AGENTS.md clonedeps tag mention moves to v0.123.0 in the same
  edit; the vendored mirror is re-provisioned at the new tag without any
  tracked-file change; the fro-bot workflow stays actionlint-clean.
- adjacency: the sibling gate re-land batch edits the PAT gate region of the
  same workflow and the Fro Bot status region of AGENTS.md — disjoint lines,
  merges cleanly, no territory overlap.

## Leg 4 — rm-780-family fold: store warning through the logger seam

The bare console.warn in src/listener/store.ts at the parse helper prints
raw error message text that can embed a V8 snippet of the offending cell,
bypassing the logger chokepoint the fork established for exactly this
discipline.

- files: src/listener/store.ts
- acceptance: the warning routes through the shared logger with a bounded,
  non-embedding message shape; behavior for callers is unchanged; the store
  suite passes.
- verification: corepack pnpm exec vitest run with maxWorkers 2 over the
  listener store suite plus eslint on the touched file.

## Rejected for this cycle

- upstream markdown rendering absorb: a 33-file display-plus-dependency
  surface that also needs a pnpm re-lock of markdown-it against an upstream
  lockfile that moved to Bun, plus the gateway-estate verdict that a prior
  absorb rejection already tied to the deployed estate — own cycle, not a
  rider.
- react 19.3.1 window member: claimed by the sibling dependency-currency
  ladder batch; re-selecting duplicates territory.
- impeccable pin move: the sibling operator-experience batch owns the 4.x
  probe and the ignoreValues semantics question; my one-line 3.6.1 idea
  subsumes into that leg.
- Fro Bot PAT gate and its AGENTS.md status line: owned end to end by the
  sibling hygiene batch, including the secrets decision this batch must not
  preempt.
- workflow dispatch preflight: executing workflows on main is a CI action
  outside this run's allowed tree-local scope; the dispatch-first idea also
  predicted base-drift green, which the alias break falsified — curing the
  comparison is the correct order.
- Node-26 triple bump: gated by the standing 2026-10-28 decision with fresh
  digest evidence already recorded.
- monitor-revival adjudication riders: by construction they can only be
  written after the 2026-10-19 fires; next cycle owns them.

## Sequencing

Leg 1 first and alone if time-boxed — it is the only item with a calendar
deadline. Legs 2 through 4 are independent, order-free, and each fits a
single focused edit. All four land tree-local with no secrets, no dispatch,
no absorb window, and no contract change.
