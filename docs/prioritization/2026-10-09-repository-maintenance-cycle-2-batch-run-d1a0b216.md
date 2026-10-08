# Repository maintenance — cycle 2 run d1a0b216 (2026-10-09, prioritize c402eb57)

Run requirement lineage: repository-maintenance:8dd2b900059048a98be7a80ce5661deb:cycle:2:/work/projects/dashboard
Phases so far: assess a96cfc89 (redo of infra-dead cf20c6c0, not adopted) · research 43c1d5e3 ·
roadmap 21cf3b7d (mints rm-793..rm-796 above the all-lineage frontier rm-792; census 244 defs /
0 dups / max rm-796) · prioritize c402eb579abd4d3f8f452062af51df3c (this doc). Base 7055c52;
origin/main advanced mid-run to 546c93c (run 788aa489's landing) — integrate obligation stands
in the roadmap extension comment.

## Selected batch (prioritize c402eb57) — 'gate-health + operator-lifecycle'

| Member | Why selected (impact / risk / effort / dependencies) | Verification plan |
| --- | --- | --- |
| rm-793 cve-tripwire NODE_IMAGE↔Dockerfile pin reconcile + cross-file fence (P1 anchor) | ONLY def time-boxed before a hard deadline: the first scheduled cve-tripwire fire Mon 2026-10-12 06:53Z is red by construction (workflow 'node:24-slim' can never match the Dockerfile trixie pin; 'Resolve pinned digest' exits 1 before trivy). Impact high (a known-DOA red on the fleet's Monday watch converts signal into noise), effort trivial (one tag + one fence test), risk low, zero dependencies. Ownership transferred from the rm-712 fold rider (ROADMAP.md:1884). Optional same-touch: TRIVY_VERSION v0.72.0 → v0.75.0. | fence test in test/base-drift-digest-readback.test.ts asserting workflow NODE_IMAGE tag == Dockerfile ARG tag; actionlint container-form on the touched workflow; registry probe digest == pinned stays green; the Monday 06:53Z fire (or a manual same-logic dry run) concludes green |
| rm-794 operator run-stream lifecycle hardening (#583/#584) (second unit) | Two verified-live defects on ONE seam (public/operator-stream.js) that serves both mount surfaces (SPA via web/src/operator/runtime.ts:167 + the /static twin): indefinite 'Connecting…' for runs older than gateway retention (unseeded reducer at attach, unreachable no-snapshot branch, gateway holds subscription open post-reset) and stale cancel-control accumulation across collapse/re-expand. Impact medium-high (operator-facing correctness), effort low-medium, risk low (no auth/network surface change; disposed controls can't POST), no dependencies; natural follow-on to the landed rm-744 family. Upstream has no PRs — fork-native fix, later a rm-252 parity-map entry. | regression test in the exact expand → collapse → re-expand → complete cycle (one control per card, none on terminal) + old-retention terminal card lands terminal (never Connecting… forever); both mount surfaces exercised; every existing suite importing the touched seams re-run |

## Deliberately NOT selected (with owners / reasons)

- rm-795 launch-card timestamps + waiting state — small tail of the same operator family, no
  deadline; keep the batch end-to-end completable this cycle; first candidate for the next cycle
  (or an implement-phase absorption ONLY if the two units land trivially — not planned).
- rm-796 sanitized-Markdown output render — capability-grade: sanitizer choice, streaming
  re-render budget, and security review (no-raw-HTML, URL scheme policy) deserve their own cycle,
  not a rider on a gate-health batch.
- npm @playwright/test 1.64.0 + mcr v1.64.0-noble paired bump (rm-108 rider) — baseline-regen
  discipline (two-green rule) + minimumReleaseAge 1440 + digest triple-probe make it a poor
  fit for a time-boxed batch; next cycle candidate.
- actions refresh set (rm-196 rider: setup-node v7.1.0, codeql-action v4.38.3, upload-artifact
  v7.0.2) — upload-artifact is the 405e9004 sibling lane's family and main's 7ee3b45 may already
  carry part; reconcile against the advanced main before touching.
- rm-689 pre-gate base-digest sweep (sibling run 23edabab's candidate) — partially STALE (the
  trixie re-pin landed; Monday's 04:13Z base-drift fire is now expected GREEN per assess
  a96cfc89 and today's registry probe) and carries that lineage's ownership (agent-pin digest,
  eslint 10.12.0, pnpm/action-setup v6.1.0); not this batch's to absorb.
- rm-157 contract-1.8.0 absorb + agent-pin catch-up — open sibling PR #448 (run 9289efaac79f)
  owns it; v0.118.3 (2026-10-08T22:57Z, carries PR #1743) already routed to rm-157 as a rider.
- rm-116 branch-protection fill — live protection-object surgery with admin-override semantics;
  low-risk per the fleet's green ephemeral PRs but structurally its own change, not a rider.

## Deadline and integrate obligations

- HARD: rm-793 must land before Mon 2026-10-12 06:53Z (first cve-tripwire fire) or that fire is
  a known-DOA red. Monday 04:13Z base-drift fire expected GREEN (trixie digest == pinned,
  re-probed 2026-10-09).
- Integrate: union onto the advanced main (546c93c, ledger 244/778); re-derive census + guard pin
  on the merged tree (248 defs if dedupe-free, max rm-796); the integrate-authored same-date
  census comment supersedes the 2026-10-09 claims in this tree.

## Process context

- Selection markers in ROADMAP.md: rm-793/rm-794 def lines flipped candidate → open (selected
  …), first status token kept parseable; selection rider bullets at each def block tail.
- node_modules is swept between phases: `pnpm install --frozen-lockfile` (~7 s) before local
  suites; census via `node scripts/roadmap-census.ts`; guard via
  `npx vitest run test/roadmap-integrity-guard.test.ts`.
- Validation for this repo routes to the ephemeral-PR cloud path (public repo, ADMIN); verify
  delivery by artifact refs, not run status.
