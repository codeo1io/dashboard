# Dashboard maintenance batch (2026-10-09, run ab16a466a77c) — repository-maintenance cycle 2

Selected 2026-10-09 (run ab16a466a77c prioritize 2be69a509c2c47499c2e306dd9302746) at base
`559642a` == `origin/main`; this is the canonical in-tree batch record for the landing.
Source artifacts: this run's assess `7b2e6a01446749e1a7debbba28fc5ddf`, research
`f6b60e4ab2a142d29dd049789e56507f`, roadmap `ecaec1066afc4b2b9f2dd90eef73a7b6`.

- **Selected:** `action-pin digest parity + operator-contract runbook` — 3 change-units, one landing.
- **Method:** candidates taken from this cycle's fresh assess + research survivors only (the two
  mints rm-782/rm-783 plus the rm-252 absorb slice narrowed by the 2026-10-09 rider); double-claim
  check run LIVE against the two open sibling PRs — PR #447 (run 788aa489) touches
  audit/lockfile-guard/visual workflows and its only `v0.118.2`/window hits are rider prose, PR #444
  (run c026a644) touches `release.yaml` with zero codeql/upload-sarif/uses changes; no sibling
  claims an action-pin guard or a contract-bump runbook.
- **Context:** fleet congestion moderate (2 open sibling lanes, neither in this surface). The rm-252
  absorb decision is due 2026-10-13 and its actionable set is exactly two pin lines; rm-782 locks the
  invariant those lines exercise, so the batch is one coherent supply-chain hygiene theme.

## U1 — LEAD `rm-782`: workflow action-pin digest guard

New `test/workflow-action-pin-guard.test.ts`: scan every `.github/workflows/*.yaml`/`*.yml` `uses:`
line — remote refs must be digest-pinned (`@` + 40-hex sha) AND carry a `# vX.Y.Z`-style version
comment; local composite refs (`./.github/actions/*`) exempt; live census count pinned in the test
(compose-time: 16 unique uses / 15 remote / 1 local); failure output names file:line. Implementation
re-censuses live before pinning (per the selection rider). Resolves rm-782 (candidate → open →
implemented at landing).

## U2 — `rm-252` slice: codeql v4.38.3 + agent v0.118.2 pin parity

Four codeql-action sites `2892aa5e19bbd11bc0cff5427e3b750a04d9e3c2` →
`24c54180a607b1449ed407dd24f251e4e9147c8d` (`# v4.38.3`, upstream #589; tag-sha verified via gh api
this run): `codeql.yaml:56` (init), `:62` (analyze), `release.yaml:357` (upload-sarif),
`scorecard.yaml:51` (upload-sarif). Plus the agent pin `fro-bot.yaml:347` `v0.117.5` → `v0.118.2`
digest `77f2bad7d68ac38279cd0fa28f38b26a0cd15dfb` (paper pin — workflow `disabled_manually`, no
`FRO_BOT_PAT`; hygiene parity only). Closes the 2026-10-13 actionable set recorded on rm-252's
2026-10-09 rider; `upload-artifact` v7.0.2 deliberately NOT taken (sibling-owned by 405e9004). rm-252
itself stays open (absorb-window management is standing).

## U3 — `rm-783`: operator-contract bump consumption runbook

New `docs/runbooks/operator-contract-bump.md`: read upstream contract release → bump the pin in
`src/gateway/operator-contract/version.ts` → run operator-contract conformance → verify the infra
gateway co-deploy interlock (≥ v0.118.1 for 1.8.0) → cross-link from AGENTS.md conventions; worked
example = the PENDING 1.6.0 → 1.8.0 consumption (corrected at stewardship: the fork is pinned at
1.6.0 at `version.ts:15` / `public/operator-stream.js:32` / conformance `:182`; upstream `a82871d`
#573 is upstream's own adoption). Source template: upstream #578 (dcac6cf8). The runbook documents
the procedure — this batch does NOT bump the contract. rm-757 sibling adjacency pre-flagged: fold by
content at integrate if both land (ext #35 convention).

## Scope fences / non-selections (rationale)

- `rm-116` (branch-protection fill) — NOT selected: the payload is a live GitHub settings mutation
  (gh api PUT on the protection object), which belongs to a gate that owns remote writes with its own
  revert path; not a repo-edit implement unit. Re-probe the live object at the next cycle.
- `rm-187` (guard `src/listener/store.ts:51` `JSON.parse`) — real but off-theme and non-urgent
  (HMAC-gated ingest); next batch.
- `rm-257` (web/ lint gate) — medium effort with coupled cleanup (10 `as any` in
  `Notifications.test.tsx` would surface simultaneously); schedule standalone.
- `rm-781` (unlanded-batch reconciliation queue) — sibling lane 32f33f1b owns it; not double-claimed.

## Expected landing shape (for implement)

- Executable delta (fold attestation): `.github/workflows/codeql.yaml`,
  `.github/workflows/release.yaml`, `.github/workflows/scorecard.yaml`,
  `.github/workflows/fro-bot.yaml` — the four workflow files only; the guard test lives under
  `test/` (singular, non-executable per the engine classifier) and the runbook/docs are non-executable.
- Validation: guard suite must reflect census at implement time; `pnpm lint` (yml/quotes on touched
  yaml — version comments stay plain), `pnpm check-types`, full suite per the implement turn's gates.
- Narrative correction (2026-10-09, stewardship 64c01518): the earlier research-phase claim that
  contract 1.8.0 was "consumed at main's 559642a landing" was a misattribution of upstream `a82871d`
  (#573) — the fork's live pin is 1.6.0 at three sites. The batch's codeql/agent pin lines are
  unaffected.
