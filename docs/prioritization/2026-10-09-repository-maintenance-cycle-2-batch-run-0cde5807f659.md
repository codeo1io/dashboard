# Dashboard maintenance — cycle 2 batch (2026-10-09, run 0cde5807f659)

module: dashboard
tags: `[cve-tripwire, gate-readiness, pre-gate-sweep, upstream-census, codeql-refresh, repository-maintenance]`
problem_type: batch-record
base: 559642a (work-order base == origin/main at dispatch; assess/research/roadmap all executed at this base, tree carrying the cycle:2 ledger composition: 3 mints rm-784/785/786 + 7 riders + extension comment, census 240/0/786, guard pin 786)

## Frame

Repository-maintenance cycle 2, run `0cde5807f65947d089a52434601b20db`, requirement
`repository-maintenance:23476361a99040a587fc7fbe7b1523a5:cycle:2:/work/projects/dashboard`.
Phase lineage: assess `4b899d53` (adversarial pass at 559642a — tripwire
broken-on-arrival top finding), research `2f0fbe25` (upstream tip 6821788, 24-commit
window dispositioned, registry/gateway/workflow posture), roadmap `29abc342`
(mints rm-784/785/786 + 7 dated riders + cycle-2 extension comment, guard pin
744→786), prioritize `d20ac8a5` (this selection).

## Selected batch — 'Pre-gate Monday-2026-10-12 readiness batch' (3 items)

Selection driver: the 2026-10-12 Monday cluster is the first scheduled validation of
three cured/rebuilt gates (audit 03:37Z per rm-285, base-drift 04:13Z per rm-689,
canary 05:23Z per rm-280) plus the FIRST-EVER fire of the weekly cve-tripwire
(06:53Z), which assess proved broken-on-arrival at HEAD. Everything selected is
deadline-bound to that cluster or directly protects the census machinery that
tracks it; everything else defers.

1. **rm-784 (security, p92)** — cve-tripwire NODE_IMAGE literal vs the trixie
   Dockerfile pin: the Resolve step's grep matches 0 bytes on HEAD, so the first
   fire reds before trivy runs. Cure: reconcile NODE_IMAGE to 'node:24-trixie-slim'
   (or re-derive the grep from the Dockerfile ARG tag so it cannot rot again).
   Effort: tiny (one workflow line + actionlint). Deadline: hard (06:53Z Monday).
   Evidence: the landed diff + a workflow_dispatch fire whose Resolve step prints a
   digest, or the scheduled fire concluding not-red-at-Resolve.
2. **rm-689 (reliability, p34) with the codeql fold** — the pre-gate sweep this def
   was minted for: refresh the Dockerfile base digest (registry probe same-day),
   bump fro-bot.yaml's agent pin v0.117.5→v0.118.2 (paper pin, workflow stays
   disabled), eslint 10.11.0→10.12.0 (upstream-convergent), pnpm/action-setup
   digest re-pin →v6.1.0 (4 sites), and — folded in per the 2026-10-09 rm-650
   rider — codeql-action v4.38.2@2892aa5e→v4.38.3@24c5418 (2 sites, codeql.yaml
   :56/:62). Effort: mechanical but lockfile-touching (eslint bump regenerates
   pnpm-lock.yaml under the pinned pnpm 11.28.4). Deadline: same Monday layer
   (04:13Z base-drift). Evidence: per-item parity probes + actionlint + the gates
   the sweep front-runs.
3. **rm-785 (process, p30)** — stale local `refs/heads/autonomy-upstream/main`
   mirror (5689103, 34 behind remote) silently captures short-form refnames; this
   run's research under-counted the drift window to zero first-hand. Cure: delete
   the mirror branch + mandate the explicit refs/remotes form in the rm-252 absorb
   recipes. Effort: tiny. Value: protects every future census/absorb probe,
   fleet-wide.

Batch shape: ~5-7 touched files (.github/workflows/cve-tripwire.yaml,
.github/workflows/codeql.yaml, .github/workflows/{main,audit,canary,release}.yaml
for pnpm/action-setup, .github/workflows/fro-bot.yaml agent pin, package.json +
pnpm-lock.yaml for eslint, ROADMAP.md recipe riders). All executable surfaces are
`.github/workflows/*` + package.json/pnpm-lock.yaml — the implement-fold KTD13
attestation must declare exactly the engine-derived set.

## Not selected (with reasons, owners recorded)

- **rm-104 (p98, reliability)** — roadmap-render hardening. Highest-priority open
  item but large, architecture-bound (vendored-path exclusion + stack-correct
  evidence + lint-clean output), no Monday dependency; needs its own cycle.
- **rm-279 (p96, reliability)** — Lint-job timeout on every push-to-main. Standing
  red, but the def's fix path cites 'PR #521' which does not resolve in this fork
  (gh pr view 521 → GraphQL error, checked 2026-10-09) — the cure needs
  re-scoping (defuse ROADMAP lint signals in-fork + decompose the 15m npm ci)
  and does not gate the Monday cluster (separate workflow, push-triggered).
- **rm-158 / rm-369 (in-progress)** — already claimed by active lanes (contract
  window landing 89c7398 / open-lane work); double-claim avoided.
- **rm-786 (p26, reliability)** — fresh mint (push-client CSRF-retry 'this'
  fragility), real but latent (all current callers use method access) and off-theme
  (adds web-client + full gate-battery surface to a workflow/lockfile batch).
  Recorded as the head candidate for the next batch.
- **rm-249 and the standing majors (TS 7 / vitest 5 / jsdom 30 / pnpm 12 / Node
  26 LTS)** — product/gate decisions with their own cadence (rm-133/rm-139/rm-140
  riders re-confirmed this cycle); no deadline pressure.

## Verification expectations (for implement)

- actionlint (container form) on every touched workflow.
- Census after batch composition stays 240/0/786 (statuses only flip on selection;
  implement may flip to landed on completion with riders).
- eslint bump: lockfile regenerated under the pinned pnpm 11.28.4, `pnpm lint`
  green on touched files; digest parity probes recorded for Dockerfile + pins.
- NO CI runs this turn; the Monday cluster itself is the live proof window
  (03:37Z audit, 04:13Z base-drift, 05:23Z canary, 06:53Z cve-tripwire) — outcomes
  to be recorded as riders on rm-285/rm-689/rm-280/rm-784 respectively.

## Stewardship addendum (2026-10-09, stewardship 9e6e644a — overlap split)

Change-unit decision recorded at stewardship: the open sibling lane PR #447
(conductor/run-788aa489c1d5, rm-759/760/761) ALREADY carries two legs this
batch's rm-689 sweep description listed — verified first-hand against the live
PR diff: pnpm/action-setup v6.0.10->v6.1.0 at its three workflow sites
(audit.yaml:71, lockfile-guard.yaml:61, visual.yaml:78; minted rm-761 in that
lane) and the eslint 10.11.0->10.12.0 registry refresh (minted rm-760 there,
together with vite 8.3.4 and @hono/node-server 2.1.4 — which this ledger
routed to rm-108's window anyway). Executing them here would double-claim a
landing lane. SPLIT: this batch's rm-689 execution narrows to the legs no open
lane owns — Dockerfile:34 base-digest refresh, fro-bot.yaml:347 agent pin
v0.117.5->v0.118.2, and the codeql-action v4.38.2->v4.38.3 two-site refresh
(codeql.yaml:56/:62; that lane's 2026-10-08 rider re-confirmed v4.38.2 as
newest BEFORE v4.38.3 published later that day — no conflict, ours is the
newer registry fact). Residual noted: the composite action
.github/actions/setup/action.yaml:16 also pins pnpm/action-setup@0977fd99
(v6.0.10) and is NOT in PR #447's file set — after #447 lands, that site goes
stale digest-wise; recorded as a follow-up rider target, NOT this batch (it
would semantically collide with rm-761's scope while that PR is open).
rm-784 and rm-785 are untouched by the split.
