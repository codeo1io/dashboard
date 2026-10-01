# Dashboard maintenance — cycle 1 batch (2026-10-01)

module: dashboard
tags: `[security, audit, supply-chain, oauth, hardening, maintenance]`
problem_type: batch-record

Frame: `5bf15e1` (run `42d556cd0bbf47f9917c5e3c951821af`, prioritize attempt
`277ded2bc4fd434484adc2eecb09b02d`). Batch selected from the 2026-10-01
assess/research/roadmap chain (attempts `65c895a602c54669b6260c0adebc8fc5`,
`cebed0bed3524b3495de275eb4c1d4e9`, `49bac1ce83174aca94ecaf874138932c`) over
the full open-item inventory enumerated from ROADMAP.md's Open section this
same day.

## The cycle's mandate

Main is verifiably dirty on the security axis RIGHT NOW: `pnpm audit
--recursive` at `5bf15e1` reports 19 advisories (8 high, 8 moderate, 3 low)
because the npm registry ingested the undici 7.x GHSA ranges after 2026-10-01
01:30Z, and nothing on main could have noticed — no scheduled audit signal
exists, and the two PRs that would have fixed or detected this (floors #315,
workflow #325) are stranded open-conflicting and closed-unmerged. One theme:
**make main verifiably clean, keep it clean, and close the assessed
hardening gaps while we are in the security frame.** Every unit is
zero-external-dependency (no live gateway, no upstream release, no operator
decision), independently testable, and none touches the operator stream.

## Selected units

- **B1 — rm-360, audit-zero floors re-land (security 95, effort S, risk
  low).** Raise the four override floors in `pnpm-lock.yaml:8-12` to the
  registry floors (undici 7.29.1, fast-uri 3.1.8, brace-expansion 2.1.7 and
  5.0.12), lockfile-only, `package.json` byte-identical (the `pnpm update`
  specifier-rewrite trap is documented; restore + plain `pnpm install`
  re-syncs importers). Proof: `pnpm audit --recursive` reports 0. Impact: the
  only unit that changes a live red state; also unblocks every other run's
  validation that a red base poisons.
- **B2 — rm-361, scheduled audit signal (security 90, effort S, risk low).**
  Land a schedule-only `audit.yaml` (weekly cron, `pnpm audit --recursive`,
  no install), absorbing stranded PR #325's body verbatim where
  byte-identical. Proof: actionlint (container form) green; a forced dispatch
  is red on a deliberately re-lowered floor. Impact: converts today's
  one-off flip into a standing gate; without it B1 decays silently.
- **B3 — rm-149, OAuth PKCE S256 for operator login (security 66, effort M,
  risk medium).** The authorize redirect is state-only today — `grep -c
  code_challenge` across `src/` and `web/src/` is 0 at `5bf15e1` (re-verified
  this cycle; `src/routes/auth.ts:26-27` carries the state cookie). Add
  S256 code challenge/verifier to the login round-trip both sides with tests.
  Impact: closes the ledger's top open security candidate inside the batch's
  theme; it is the only pre-existing open security item that fits the
  zero-dependency constraint (rm-249 is decision-gated, rm-117/118 are
  smaller-priority leftovers ranked below the new 45/50s by impact).
- **B4 — rm-363, cookie-key read-path hardening (security 50, effort S,
  risk low).** Route `loadCookieKey` through the same open flags and size
  bound as `readSecretFile` (`src/session.ts:133-141` vs
  `src/secrets.ts:87-130`); fail closed at boot; symlink/oversize test.
- **B5 — rm-362, lastGood scrub dual-key parity (security 45, effort S,
  risk low).** `scrubLastGoodAgainstDenylist` gains the database-id key the
  fresh-build path already enforces (`src/github/aggregator.ts:1078-1086` vs
  `:559-566`); regression test pins the fail-closed case.

Sequencing: B1 first (everything validates on a green base), B2 second (the
new check rides the same PR), B3/B4/B5 independent and parallel-safe. Total
effort one M plus four S — inside the precedent of the five-unit cycle-11 and
cycle-19 batches.

## Deferred, with reasons

- rm-104 (reliability 98, roadmap-render hardening): documentation-tooling
  defect classes whose last live failure evidence is the 2026-09-20 fleet
  render; the specific repeated class (bare-array prose breaking `pnpm
  lint`) is now caught pre-landing by the added-lines eslint gate used by
  every roadmap batch since. No runtime or security impact on the served
  product; the live audit-red state outranks it this cycle. Remains the top
  docs-tooling item.
- rm-102 (90, dependabot first-PR proof): in-progress, blocked on an
  external timer (dependabot's first PR), not batchable.
- rm-103 (85) + rm-252 (80) (upstream-absorb cadence and contract 1.8.0
  catch-up): the natural NEXT-cycle lead. Both touch `fro-bot.yaml`,
  `package.json` and the lockfile; landing an absorb batch on an audit-red
  base multiplies validation pain (base-carried debt fails other runs'
  gates). Sequenced after B1/B2 re-green main. rm-252's rider (v0.117.1
  matured 2026-10-01T23:21Z, v0.117.0 write-surface never-absorb note) is
  already on the entry.
- rm-249 (72, push service worker): decision-gated on the rm-106/rm-138
  product joint; not autonomously batchable.
- rm-116 (58, required checks on main): deferred for a POSITIVE dependency —
  the required-check set should include the audit check B2 adds; filling
  protection mid-cycle while the check suite changes would churn required
  checks under our own landing. Do it right after this batch lands.
- rm-271 (34, toolchain majors window): the durable jsdom 30 / undici 8 exit
  for the same undici exposure is deliberately kept OUT of B1 — floor-only is
  near-zero risk, majors entangle test fixtures; rm-271 stays its own window
  so B1 cannot fail for jsdom-major reasons.
- rm-364 (dx 30, docs index) and rm-365 (product 25, open-PR itemization):
  below the cut on impact; rm-365 is owner-decision-gated by its own entry.
- Remaining open candidates (rm-226/227/205/194/195/230/257/274 and lower):
  ranked below the selected five on impact × readiness; no batch conflict.

## Verification frame for the implement phase

Per-unit: B1 `pnpm audit --recursive` == 0 + `pnpm check-types`/`pnpm test`/
`pnpm lint` green, lockfile diff limited to the four override rows plus
resync, `package.json` untouched; B2 actionlint container green + dispatch
proves red-on-dirty; B3 new auth tests pinning challenge/verifier round-trip
plus existing `test/auth.test.ts` green; B4 `test/session.test.ts` new
symlink/oversize cases; B5 `test/aggregator.test.ts` new fail-closed case.
Batch: full validation gate on the ephemeral PR, all checks green.
