# Dashboard repository-maintenance — cycle 3 batch (2026-09-30, run a9072bb2)

module: dashboard
tags: `[security, supply-chain, ci, lint, reliability, docs, maintenance]`
problem_type: batch-record

Base `31995a2` == origin/main tip (merge of run 26210bbbb6514465a576835dae1442ef),
clean tree apart from this run's certified roadmap extension, uncommitted by
design: items `rm-276`..`rm-279` + 6 dated riders + 2 provenance comments,
`ROADMAP.md` only, 33 insertions / 6 deletions, worktree bytes identical to the
certified spool copy (sha256 `832f5690c0496c130f2f275283f4b21862815f01f1b05a0a7d970bd8e63ea2cd`).
Inputs consumed, not redone: assess `a912e3b8` (three fresh findings + gate
baselines), research `fb0f6062` (Dependabot / upstream / npm-registry evidence),
roadmap `559f0b57` (re-fire certification of `96fc18e2`'s complete delta).
Batch selected by prioritize attempt `6c6aaf2a92114926ba003be6250b9a7b`.
Authoritative date is the host clock (2026-09-30); engine stamps reading
2026-10-01 are a day ahead.

## Selection method

- Every OPEN ledger item plus this run's findings were scored on impact, risk,
  effort, dependencies, and strategic value. Standing rule from the cycle-19
  precedent: the batch must be completable end-to-end LOCALLY — no live-gateway
  dependency, no CI-admin/live-settings op, no dependency-registry window, no
  pending product or engine decision.
- Coherence frame for a repository-maintenance cycle: maintenance-plane truths,
  not one product surface. The cycle's own headline facts set the theme —
  **main is unlandable** (24 consecutive non-green Main runs after
  2026-09-29T16:03:34Z; Lint killed at its 35-minute rider while all five
  sibling jobs went green) and the repo's **only open security alerts** (two
  HIGH fast-uri Dependabot alerts) are both live. Every other lane's landing
  signal is degraded until those two close.
- Id-space note: this tree's ledger max is `rm-279` (this run's mints). Sibling
  lanes hold in-flight mints `rm-280`..`rm-311` in their own worktrees — no
  collision with this batch; landing reconciles by content.

## Selected: restore-a-landable-green-main batch

Two reds that gate every other landing (the CI Lint cliff, the open HIGH
alerts) plus the two small truths this run surfaced (the auth cookie Secure
resolver, the hook-bridge timeout audit). No unit touches a deployed surface;
all four are provable inside the cycle.

### B0 — batch baseline (house convention)

- Gates at base, from assess `a912e3b8` on this exact tree: `pnpm
  check-types` rc 0; full suite 3452/3452 green (49.1s server + 8.1s web);
  `timeout 300 ./node_modules/.bin/eslint ROADMAP.md` rc 124 (the cliff,
  reproduced in isolation) while `eslint AGENTS.md` lints clean in
  single-digit seconds on the same ESLint 10.11.0.
- `pnpm audit --recursive` currently FAILS on the two HIGH fast-uri alerts
  (it needs no node_modules — it reads pnpm-lock.yaml/pnpm-workspace.yaml and
  queries the registry). Capture its output pre/post in the implement phase.
- CI baseline: 24 non-green Main runs after 2026-09-29T16:03:34Z (last green
  `36594909492`); run `36718506006` Lint cancelled 13:00:08→13:35:27 with all
  five siblings green (Test 89s); run `36692888877` carries the annotation
  'The job has exceeded the maximum execution time of 35m0s'.
- Re-verify each of these at implement start before editing anything.

### B1 — `rm-277` Main unlandable: Lint dies at its rider (priority 92.0, effort M) — batch lead

Cure choice RECORDED here per the item's acceptance: **option (c), the ledger
splits — in its paragraph-split form.** The minted acceptance names three
structural cures; this batch selects the blank-line-paragraph recipe
(`docs/solutions/workflow-issues/roadmap-paragraph-length-quadratic-lint-cliff-2026-09-30.md`
class): insert blank lines / re-prefix list items so no single physical line
carries multi-thousand-character paragraph mass. Multi-file ledger
re-architecting (the other reading of (c)) would break every `rm-XXX`
cross-reference in docs, code, and tests — not a cycle unit.

- NOT option (b): narrowing the markdown rule set is barred by the
  engine-space `rm-13640` contract ("do not narrow the markdown rule domain").
- Option (a) (ROADMAP.md leaves the default lint glob, replaced by a bounded
  substitute check — structural census invariants plus changed-lines lint via
  the stdin-instrument pattern) is the PRE-DECIDED ESCALATION for next cycle
  if the split proves insufficient; see the rule below.

Scope, measurement-driven and content-preserving (no wording edits, blank-line
insertion and list re-prefixing only):

1. Split the two proven monolith signals lines: `rm-103` signals at
   ROADMAP.md:175 (7317 chars) and `rm-157` signals+acceptance at :408 (7967
   chars). The :408 split MUST also restore the collapsed newline — the
   acceptance text is glued onto the signals line as `)- acceptance:` (the
   reglue defect confirmed in-tree this turn).
2. Re-time the whole-file gate. While it still fails to complete, extend down
   the measured offender list: `rm-108` signals :223 (5173), `rm-159` signals
   :413 (5023), then any remaining line over ~4K chars (the historical
   extension/integrate comment block at :108-:122 is 4006-5222 chars each and
   is in scope if measurement demands it).
3. Proof for the phase: `./node_modules/.bin/eslint ROADMAP.md` completes
   rc 0 with the wall time recorded — target well inside the ~14.4m
   healthy-cold whole-repo baseline so the current runner-epoch multiplier
   (~2.4x) still fits the UNCHANGED 35m rider — and full `pnpm lint`
   terminates cold without a timeout. `timeout-minutes: 35` at
   .github/workflows/main.yaml:36 must be unchanged by this fix.

Why this cure: it was proven on a sibling lane's tree of the same shape (the
`45b7f87a` integration resolution split exactly these two blocks and got
whole-file rc 0), it changes no lint policy, it has zero contract tension, it
is reversible, and it permanently lowers the cost term for every future run
while the rider stays honest. Known overlap: that same unlanded resolution
carries the same splits — landing reconciles by content (both sides are
blank-line insertions; keep one).

Escalation rule (pre-decided): if the first post-landing Main run's Lint job
still misses its rider, next cycle executes option (a) — and only then,
sequenced with the `rm-13640` validator-poll-window contract.

Folded rider (assess F3 doc-truth, deliberately unminted by the roadmap
phase — adopted here under rm-277's own files): truth the Lint rider comment
at main.yaml:33-35 (it says '20 min self-kills', but the rider has been 35
since the 2026-09-29 bump, and 'the Test job's 40' never existed — Test is
20) and the stale setup header at `.github/actions/setup/action.yaml:5`
(present-tense 'ubuntu-latest' claim after `rm-188` pinned all 16 sites to
ubuntu-24.04). Comment-only edits; per the `#14937` house trap, no comment
line may START with the bare lowercase word 'ESLint's sibling spelling —
rephrase rather than lead with it.

Going forward, this lane's own phases keep every new signals line wrapped
(the convention the split is forcing retroactively).

### B2 — `rm-276` two live HIGH fast-uri alerts: floor sits below both patched lines (priority 70.0, effort XS)

- pnpm-workspace.yaml:27 — `fast-uri@3: '>=3.1.5 <4.0.0'` raised to
  `'>=3.1.8 <4.0.0'` with a GHSA rationale comment in the adjacent
  toml-override style (:28-31 is the pattern). Covers both alerts: #29
  `GHSA-58mr-gqgx-xq4g` (vulnerable =3.1.6, patched 3.1.8) and #30
  `GHSA-qw65-cvwx-89v3` (CVSS 7.5 authority injection, vulnerable >=3.0.0
  <3.1.7, patched 3.1.7).
- Lockfile re-resolved so the `fast-uri@3` resolution (pnpm-lock.yaml:2416,
  currently 3.1.6) and every `ajv@8.20.0` snapshot edge read 3.1.8.
- Sibling floors (`brace-expansion@2`/`@5`, `undici@7`) trued to their patched
  lines in the same pass, or each left-behind floor carries a dated inline
  reason — implement verifies each against live advisories plus the audit
  output before trueing (the roadmap provisional named 2.1.7 / 5.0.12 /
  7.29.1 as candidate patched lines; true only what an advisory demands).
- Acceptance in-cycle: `pnpm audit --recursive` exits 0; `pnpm lint` and
  `pnpm test` green at the re-resolved tree. Post-landing obligation: both
  alerts close on GitHub (auto-close on the default-branch fix, or recorded
  dismissals referencing the landing commit).
- Upstream `fro-bot/dashboard` PR #538 (open, lockfile-only 3.1.8) is the
  same cure — this floor raise subsumes its content for this fork; record it
  as an `rm-252` absorb-window rider.

### B3 — `rm-278` cookie Secure attribute trusts client-reachable X-Forwarded-Proto (priority 52.0, effort M)

- One shared, unit-tested resolver for both mint sites — src/routes/auth.ts:78
  (OAuth state cookie) and :154 (24h operator session cookie) — replacing the
  exact `=== 'https'` match. Design chosen: parse the `x-forwarded-proto`
  token list and accept https from the TRUSTED (last, own-proxy) hop.
  Rationale: behind the repo's documented OVERWRITING proxy the header is a
  single token minted by the proxy (behavior unchanged); behind an APPENDING
  chain `'https, https'` currently mints a non-Secure cookie over real HTTPS
  (the bug) while the last hop still reads the proxy's own observation; and a
  client-injected leading `'https'` cannot force Secure when the proxy
  observed http (`'https, http'` stays non-Secure). No new env — the limiter's
  `RATE_LIMIT_TRUSTED_PROXY` opt-in stays untouched, so
  test/env-docs-guard.test.ts and the README env table need no churn; the
  topology assumption is recorded in `docs/runbooks/security-posture.md`.
- Tests (in `test/auth.test.ts`, which exists at base) pin, per the item's
  acceptance: exact `'https'`; appended `'https, https'`; `'http, https'`;
  `'https, http'`; plain-HTTP with no header; https URL with no header.

### B4 — `rm-279` hook-bridge abandoned-race timeout never cancels the hook work (priority 22.0, effort XS)

- Audit `.opencode/impeccable/hook-bridge.ts:143-152` (withTimeout racing a
  TIMEOUT_SENTINEL): enumerate callers and whether the abandoned work is
  cancellable at acceptable cost (AbortSignal / subprocess kill). EITHER wire
  cancellation OR land the recorded-decision comment (deliberate abandonment
  + its cost) at the site — the item accepts both endpoints.
- The upstream mirror (fro-bot/agent #193) rides the `rm-252` absorb window
  when upstream lands its fix; do not invent a mirror before that.

## Deliberately excluded (rationale recorded, no deferral notes minted)

| Candidate | Why not this cycle |
|---|---|
| `rm-104` (98.0) roadmap-render hardening | The defect class lives in the engine's render step, external to this tree; this run's phases already apply the repo-side mitigations (stdin-instrument lint, census greps). A repo-side ROADMAP invariant guard test is a natural next-cycle rider once B1's split settles the file mid-change |
| `rm-252` (80.0) v0.117.0 absorb window | Needs a dedicated cycle (pin bump + contract 1.7/1.8 parser work + deployment sequencing). PR #538's fast-uri content is subsumed by B2 now |
| `rm-116` (58.0) branch-protection fill | Blocked by B1's own outcome — required checks cannot go green while Lint dies at its rider; also a live-settings stewardship turn with re-read verification, next cycle after two green Main runs |
| `rm-102` / `rm-103` (90.0 / 85.0) dependabot evidence + absorb automation | Evidence-gated on the first dependabot window ~2026-10-03 (standing disposition). B1 splits rm-103's signals block as lint hygiene only — the item itself stays candidate |
| `rm-139` (24.0) Node 26 window | Time-gated 2026-10-28; this run's dated rider already records the live platform facts |
| `rm-271` npm moves (hono 4.13.12, vitest 5.0.3, etc.) | Minors belong to `rm-137`'s ~2026-10-03 dependabot disposition; majors require one evaluation window each per their own acceptance |
| `rm-133` TS 7 | Peer-blocked (typescript-eslint peers ts <6.1.0); re-evaluation 2026-10-21 per .github/dependabot.yml |
| canary 2026-10-05 cron failure | Proven structurally broken (no install step; `ERR_MODULE_NOT_FOUND` via the graphql-canary → aggregator import chain) by a SIBLING lane's research against this same base — not minted in THIS ledger. A workflow cure's green proof is post-landing (cron/dispatch on main), failing the local end-to-end rule; the watchlist carries it for next cycle |
| PR #196/#206 adjudication + PR #305 green-tree salvage (`rm-131`/`rm-217` stream) | Stewardship-track duties (archive-then-close, never bulk-close), not implement units; note that PR #305's tree already proved a cured Lint runs 1m8s — evidence FOR B1's cure class |

## Watchlist

- Monday 2026-10-05 05:23Z: the canary cron fires and fails structurally
  (sibling-lane finding, see excluded table). Next cycle must verify this
  ledger tracks it (rm-179 lineage) or hand it to the owning lane.
- rm-102/rm-137 dependabot window ~2026-10-03 may touch package.json /
  pnpm-lock.yaml — reconciles by content against B2's lockfile (a floor raise
  is conflict-light).
- Sibling in-flight lanes hold mints rm-280..rm-311 in their own trees; expect
  textual overlap on B1's split blocks (the 45b7f87a resolution) and possibly
  pnpm-workspace.yaml comments — reconcile by content at landing; landed
  meanings own the ids.
- The 2026-09-29T16:40Z runner epoch: B1's value stands regardless (the cost
  is superlinear by construction), but if Lint completes under 20m again
  before landing, record the epoch's end at compound time.
- B1/B2 post-landing obligations: two consecutive green Main run ids recorded
  at rm-277; both alerts closed at rm-276.

## Landing notes (pre-implement, 2026-09-30)

- Files this batch owns: `ROADMAP.md`, `pnpm-workspace.yaml`,
  `pnpm-lock.yaml`, `.github/workflows/main.yaml` (comment truth only),
  `.github/actions/setup/action.yaml` (comment truth only),
  `src/routes/auth.ts`, `test/auth.test.ts`,
  `docs/runbooks/security-posture.md`,
  `.opencode/impeccable/hook-bridge.ts`, plus this batch doc. No `web/`, no
  gateway files, no parser files.
- Hygiene: actionlint container-form if any workflow LINE changes (comment
  edits still re-run it); single-quote YAML string values (`yml/quotes`); no
  comment line may lead with the bare word that trips the ESLint
  inline-config parser; keep every new markdown paragraph wrapped short —
  this doc included.
- Validation battery for implement: `pnpm check-types`; full `pnpm test`
  (pretest builds web/dist); targeted ESLint on changed non-ROADMAP files;
  ROADMAP whole-file ESLint rc 0 with wall time recorded (B1's headline
  proof); `pnpm audit --recursive` rc 0 (B2); stdin-instrument lint for any
  ROADMAP block edited mid-phase, per the roadmap phase's proven pattern.
