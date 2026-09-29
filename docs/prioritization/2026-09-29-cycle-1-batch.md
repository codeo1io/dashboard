# Dashboard maintenance — cycle 1 batch (2026-09-29)

> Selected by the prioritize phase of conductor run `6ce22646320f4ceebcb8bf10c0a501b8`
> (attempt `3d4fc152acf44ac3a2ed2601a0a651fa`), at worktree base `d89ffe7` —
> `origin/main` tip at selection time (zero drift, so conflict risk with main is minimal).
> Grounding evidence chain: assess `9f2bc02d` (fresh adversarial assessment at `7849a0d`,
> findings re-verified at `d89ffe7`), research `1bb33d8a` (upstream/ecosystem verification),
> roadmap `799bf275` (items minted/amended the same day, uncommitted in the worktree).

## Method

Candidates = all 46 open ROADMAP items at `d89ffe7` (census 131 ids, 0 dups, max
`rm-252`), scored on impact (user-visible value / harm prevented), risk (blast radius of
the change and of NOT doing it), effort (single-cycle fit per the house bar: prior
prioritize rounds reject Effort-2 auth-surface work as multi-cycle), dependencies
(decision gates, live-system access, deployment order), and strategic value (does it keep
the product's core promise — a reliable single-operator window onto the fleet and the
gateway). Fresh evidence from this run outranks stale priority numbers: several
high-number items carry 2026-09-20-era anchors whose defenses have since landed, and the
house rule is that landed meanings supersede stale statuses.

## The batch: "keep the operator window deterministic" (reliability track)

One theme, three items, all server-side or static assets, all locally verifiable, no
decision gates, no live-gateway dependency for implementation (fixture-driven), all
directly grounded in this run's own evidence rather than old findings.

### B1 — Operator-contract absorb 1.6.0 → 1.8.0 (rm-157, headline)

Why now, decisively: the gateway upstream (`fro-bot/agent`) advanced its operator
contract `1.6.0 → 1.7.0 → 1.8.0` across four releases in five days (verified from
`packages/gateway/src/operator-contract/version.ts` at each tag via GraphQL, not release
prose). The dashboard still pins `1.6.0` in **two independent places**, and its drift
check is exact-equality fail-closed — so the first gateway deployment at ≥ v0.115.0
bricks the operator view until this lands. The split is already live in-repo:
`.github/workflows/fro-bot.yaml:340` pins agent `930ffc9f` (= v0.115.1, contract 1.7.0)
while the deployed gateway remains v0.114.1 (1.6.0), and ROADMAP rm-103's signals record
queued PR #521 (agent v0.115.0) already carrying the new contract upstream. This is no
longer the deferred "after any gateway-side change" item of cycle 9 — the gateway-side
change has shipped; only the deployment order remains, and the dashboard must land first.

Scope (fresh finding shapes it): the constant exists in TWO copies, violating the
mirror's own provenance rule (`src/gateway/operator-contract/version.ts:15` says "no
second copy should exist", yet `public/operator-stream.js:24` hard-codes
`'1.6.0'` independently, and `:49` is the check that production actually executes —
verified this phase that `src/gateway/operator-sse-reader.ts` has zero production
callers, its exact-equality check at `:494` being server-side shadow code). The absorb
must therefore touch all three surfaces or a green test suite can coexist with a bricked
production check:

- refresh the vendored mirror (17 files under `src/gateway/operator-contract/`) from
  agent v0.117.0, preserving per-file provenance headers;
- bump and parse the new shapes in the production client script
  (`public/operator-stream.js`): run-status checkout provenance and the
  workspace-preparation failure kind (contract 1.7.0 additions);
- keep the server reader (`src/gateway/operator-sse-reader.ts`) in lockstep;
- decide and record the version-acceptance design: accept the known-compatible set
  {1.6.0, 1.7.0, 1.8.0} with additive, feature-detected parsing; fail closed on anything
  else (unknown versions still brick safely — drift defense preserved, only the
  knowingly-absorbed range opens);
- decide and record the 401 semantics from agent v0.116.0 (401 → operator-actionable
  workspace-unavailable WITHOUT a contract bump — today's code maps every 401 to
  auth-required, which now mislabels an actionable state);
- versioned fixtures for both new shapes and the 401 reclassification;
- rider: single-source lock — a test asserting the client script's constant equals the
  mirror's constant, so the two-copy seam that this absorb just traversed can never
  silently diverge again (same class of seam as the double-interface-widening incident
  recorded in ROADMAP);
- rider: refresh the reference clone + `.slim/clonedeps.json` manifest to agent v0.117.0
  (mechanical).

Impact 10 (prevents core-feature outage, one deployment away); Risk 7 (vendored diff
discipline; fail-close semantics must survive the range change); Effort M (bounded: no
UI, no infra); Dependencies: clone refresh only.

### B2 — Transport determinism: fetch-seam, deadline coherence, abort (rm-221)

The assess headline, proven rather than asserted: `src/github/installations.ts:334-346`
constructs the production installation-enumeration client bare (`new Octokit({auth,
request:{timeout}})`) with NO `createBoundedFetch`, while both siblings enforce the seam
(`src/github/app-client.ts:131`, `:212`); this repo's own landed rm-156 finding is that
Octokit's `timeout` request key does not bind on hung upstreams — the bound the code
believes it has is inert, and the enumeration path can hang ~300s per request under
undici defaults. The gate is blind: `test/transport-timeout-contract.test.ts:32`'s
TIMEOUT regex accepts a bare `timeout:` key (suite verified 5/5 green with the gap
present). Adjacent coherence gaps at the same node, absorbed into this item:
`src/github/aggregator.ts:865`'s 15s per-refresh deadline sits BELOW
`app-client.ts:48`'s 30s per-request bound, so one slow repo-list page starves the whole
serial enumeration (`aggregator.ts:1124`); and `deadlineOr`/`withDeadline`
(`aggregator.ts:921-929`) never abort losing requests.

Scope: add the fetch seam at `installations.ts` (mirror the siblings); tighten the
contract-gate regex to demand the seam and add a hung-upstream fixture that reds against
the bare client; reconcile the deadline hierarchy (per-request fetch bound must sit
under the call-site budget — 10s bound under the 15s refresh deadline, or an explicit
budget-aware deadline); make `deadlineOr`/`withDeadline` abort losers via the same
signal. Impact 8 (closes a proven-inert control on the production enumeration path);
Risk 5 (timing behavior changes must be pinned by tests); Effort M.

### B3 — Validated links read-back (rm-187, small rider)

Re-verified unlanded this run: `src/listener/store.ts:44-53` casts `JSON.parse(row.links)`
unvalidated — the only store read-back without a validation guard (the snapshot store's
pattern is the template). Item was sequence-blocked behind PR #113's store deltas, which
landed long since (by content, per the `ed88959` integrate) — unblocked. Impact 4; Risk
2; Effort S. Rides the batch because it is the same defensive-parse discipline as B1/B2
and completes inside the cycle's margin.

## Sequencing

B1 first (it is the contract source of truth the others compile against; also the
time-critical half), B2 second (independent files), B3 last. Verification gate before
handoff: `pnpm check-types`; targeted suites (operator-contract parser,
operator-stream, transport-timeout-contract, listener store, prose-residue-guard) with
`web/dist` built first (direct vitest bypasses pretest); then full `pnpm test`. No
commit/push in this phase — the later phases own that.

## Considered and not selected (with reasons)

- rm-251 (visibility, 55.0): decision-gated like rm-147 — needs the owning operator's
  choice plus live GitHub action; not implementable autonomously this cycle.
- rm-252 (code-scanning/Dependabot surfaces): genuine product value on an already-minted
  permission envelope, but it is an aggregator+schema+web feature — the natural NEXT
  cycle once the contract window is safe. Not mixed into a reliability batch.
- rm-104 (roadmap render hardening, 98.0): highest stale number, but the cited breakage
  is 2026-09-20-era and its defenses largely landed (rm-131); no live breakage
  reproduced in this run (this run's own ROADMAP edit validated cleanly, prose-residue
  guard 2/2). Re-validate before spending a cycle.
- rm-149 (OAuth PKCE, 66.0): a prior prioritize round explicitly rejected it as an
  Effort-2 auth surface violating the single-cycle pattern; no fresh exploitability
  evidence this run. Precedent stands.
- rm-249 (push-only service worker, 72.0): prior deferral holds — tied to rm-106's
  upstream push capability and a dead-notification UI decision.
- rm-107/rm-199 (degraded-flag surfacing): no consumer exists yet (re-verified zero
  `web/src` consumers); a product-panel decision, not a reliability rider.
- rm-116 (branch protection fill): live GitHub admin action, not repo code; rides the
  operator's decision alongside rm-251.
- rm-108/rm-133 (dependency majors incl. TS7): peer-gated, re-eval window 2026-10-21.
- rm-139 (Node 26): window opens 2026-10-28.
- rm-153 (session roundtrip): a decision-recording item, cheap but standalone; not
  load-bearing for this batch.

## Risks

1. Mirror drift discipline — the 17 vendored files must be diffed against the refreshed
   clone, not hand-reconstructed (byte-verification per file).
2. Fail-close semantics — the range-acceptance change must keep rejecting unknown
   versions; fixtures must prove rejection, not just acceptance.
3. The two-copy seam — if B1 refreshes only the mirror, production still checks 1.6.0;
   the lock test (B1 rider) is the guard, and it must be red before the fix and green
   after.
4. Deployment ordering — this batch is the dashboard half; the gateway must not deploy
   ≥ v0.115.0 before it lands. Recorded here so the operator sees the ordering
   constraint, not as code.
5. Timing behavior (B2) — the new deadline hierarchy changes observable refresh
   behavior; tests must pin the new order explicitly.
