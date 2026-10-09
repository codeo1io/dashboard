# 2026-10-09 · repository-maintenance cycle:2 · batch run 8dd690c8 — oauth-pkce-and-runner-pin-guard

Selected 2026-10-09 (run 8dd690c85b504dc2998808bf3e011ce1, prioritize attempt
99d3a3682d604521894890670b6b15f6) at base 364272b6669bb8c8e20591ba063d24fdfc6753a2
(HEAD == origin/main, porcelain: ROADMAP.md + test/roadmap-integrity-guard.test.ts
modified by this run's roadmap phase, census defs=247 dups=0 max=rm-805 healthy).

## Inputs

- assess lane (run 8dd690c8): HEAD 364272b == origin/main, census 245/0/rm-778 at
  dispatch, runner-pin census (zero mechanical runs-on guards in test/ or scripts/;
  one non-comment ubuntu-latest site at .github/workflows/cve-tripwire.yaml:40).
- research lane (attempt 2ebe347b): upstream tip 22e2e46 (25 commits, zero open PRs),
  agent v0.118.3 released / main at contract 1.9.0 unreleased (#1749), dep-wave floor
  arithmetic @04:13:37Z (playwright 1.64.0 + plugin 1.18.35 eligible; @hono/node-server
  2.1.4 unlocks 04:42Z; vite 8.3.4 unlocks 12:07Z this day), scorecard 7.4 @01:56Z.
- roadmap phase (attempt fdc15cab): mints rm-804/rm-805 + nine dated riders + extension
  #38; full frontier audit (landed ceiling rm-778; dashboard-lineage committed refs to
  rm-801; dirty walls to rm-803; foreign spool to rm-853 excluded).
- Fleet liveness (all campaign stores, 2026-10-09T05:04–05:06Z): RUNNING — d1a0b216,
  d8fdf8b7, cb189044, c4617181, cb0cfe96, f510a33e, e8c99e0e (and 38e72854/84133641
  running as of 04:12–04:30Z). FAILED same morning — c37a8576 (03:54Z), cbe70604
  (05:06Z). Two fresh lane deaths the same morning → capacity risk is real; batch kept
  deliberately tight.
- Claim scan (`grep -h 'status: open (selected'` across every worktree wall + committed
  ci refs): 14 standing selections (list under Claimed-and-excluded); zero on rm-149
  and rm-805.

## Selection floor

Rule applied: an item is selectable iff it is (a) a discrete def on the landed main
ledger (visible to the census, id unclaimed in the scan), (b) completable end-to-end
this cycle with no soak-window/floor/dependency gate, (c) zero file overlap with any
live lane's batch, (d) not a standing watch, cured-by-content residual, or close
candidate. Two items cleared the floor.

## Claimed-and-excluded

Standing claims (excluded): d1a0b216 → rm-689, rm-793, rm-794 ('cve-tripwire-and-rate-
limits', RUNNING); 38e72854 → rm-157, rm-159, rm-196 ('contract-absorb-execution',
RUNNING mid-implement on the contract file set); 438dea88 → rm-116, rm-214
('post-landing fill'); cb189044 → rm-776 ('repo-stewardship-workbook', RUNNING);
84133641 → rm-787 ('runner-truth-and-re-numbering'); c08cfec6 → rm-790, rm-791;
ddb41af7 → rm-645, rm-782; 0cde5807 → rm-789 ('ref-scanner-refresh'); 89ebbf49 →
rm-680, rm-711; 3f6a3fe1 → rm-777; 392bad29 → rm-689, rm-751, rm-752; c026a644 →
rm-157, rm-722. Note two live double-claims (rm-157: 38e72854 + c026a644; rm-689:
d1a0b216 + 392bad29) — integrate-time reconciliation, not this batch's problem.

Dead-lane claims (re-implementable by content, fold-note rule; not needed here):
c37a8576 failed → its rm-213/rm-750 selection dies with the lane; cbe70604 failed
05:06Z → its wall mints (rm-779/780) die with it.

Deferred with reasons (unclaimed, triaged): rm-804 (my mint — file overlap with
38e72854's live contract-absorb implement; trigger event not yet occurred: no released
gateway serves 1.9.0; select after the absorb lands and the 1.9.0 release is cut);
rm-281 (52.0, incident-correlation alerting, approach-2 re-verified 2026-10-08 — TOP
deferred lead for the next cycle; medium feature surface under 7-lane congestion);
rm-760 (dep refresh — floor-split: vite 8.3.4 floor-blocked until 12:07Z this day and
the playwright half needs the in-image container regen, a dedicated cycle; claimed only
by the completed 9289efaa); rm-778 (ci stale-ref sweep would delete live validation
lanes' PRs #459/#463 mid-flight); rm-249 (72.0, TOML wasm — native-module embedding
risk); rm-117 (70.0, runtime integrity scan — effort); rm-703 (76.0, rides the next
container bump); rm-104/rm-103/rm-108 (standing watches, riders current); rm-279
(96.0 — cured-by-content, its 2026-10-07 rider says preventive-only and weighs closing
next cycle), rm-280 (90.0 — adoption-evidence pass landed 2026-10-06, close candidate),
rm-282 (74.0 — floors half closed-by-content at tip, close candidate).

## Selection

- rm-149 — OAuth PKCE (S256 code_challenge + short-lived HttpOnly verifier cookie +
  code_verifier at exchange). Priority 66.0, security. Highest-priority discrete
  unclaimed completable item on the ledger. Surface: src/routes/auth.ts + auth tests;
  no live batch touches auth. Read-only invariant untouched (authorization-redirect
  hardening only).
- rm-805 — mechanical runner-pin guard (this run's mint). One new test file in the
  fork-exclusion-guard family; zero overlap; negative-check requirement stands.

## Selection risk

- PKCE: GitHub OAuth-app PKCE support is asserted by the def's signals (grep
  code_challenge → 0 hits at the recorded base — no prior art in-repo); risks are the
  HttpOnly cookie plumbing against the PWA client and keeping the existing state
  check intact alongside the new challenge. Bounded by the acceptance's greppable
  evidence (code_challenge hits at src/routes/auth.ts + new auth tests green).
- Guard: YAML runs-on parsing must handle matrix expressions (runs-on:
  ${{ matrix.os }}) and the one dated ubuntu-latest site without false reds —
  implement records the disposition in the batch doc; negative check is mandatory.
- Capacity: two lanes died this morning; this batch is two contained items so a
  provider death mid-implement leaves a small salvageable delta.

## Verification

- Census unchanged by selection edits: defs=247 dups=0 max=rm-805, 'census healthy'.
- test/roadmap-integrity-guard + test/roadmap-length-guard green; eslint on
  ROADMAP.md + this doc green.
- The two def lines read exactly `status: open (selected 2026-10-09, run 8dd690c85b50
  cycle:2 prioritize 99d3a3682d60, 'oauth-pkce-and-runner-pin-guard')` with the prior
  status preserved in a (previously …) tail; each block carries a `- selection rider
  (2026-10-09, run 8dd690c85b50 cycle:2 prioritize 99d3a3682d604521894890670b6b15f6):`
  bullet.

## Implementation record (implement, 2026-10-09, attempt 0ce4b26f)

### rm-149 — OAuth PKCE (S256), implemented

- `src/auth/pkce.ts` (new): `s256CodeChallenge` (BASE64URL(SHA-256(verifier)),
  RFC 7636 §4.2), `generatePkcePair` (`randomBytes(32).toString('base64url')` →
  43 chars, minimum legal §4.1 length), `PKCE_VERIFIER_PATTERN` shape const,
  `PkcePairGenerator` injection seam; header records the CodeQL
  js/insufficient-password-hash (alerts #74/#75) disposition — S256 is an
  RFC-mandated SHA-256 use, and no code path hashes a cookie-sourced value.
- `src/auth/oauth.ts`: `createAuthorizationURL(state, scopes, codeChallenge)`
  adds `code_challenge` + `code_challenge_method: 'S256'` to the authorize URL;
  `validateAuthorizationCode(code, codeVerifier)` RFC-shape-gates the verifier
  (TypeError before the wire) and adds `code_verifier` to the exchange POST.
  Interface change is additive — all in-repo fakes remain assignable.
- `src/routes/auth.ts`: `/auth/login` mints the pair and sets a second
  short-TTL HttpOnly `oauth_pkce_verifier` cookie mirroring the state cookie
  (same TTL/Path=/auth/SameSite=Lax/rm-604 Secure expression — cookie sites
  must not drift); `/auth/callback` requires a well-formed verifier cookie
  after the state check (missing/junk → 403, exchange never called, verifier
  never re-set), deletes it one-time-use, and passes it to the exchange.
- `src/server.ts`: `DashboardAppConfig.pkcePairGenerator` opt-through.
- `test/auth.test.ts`: 9 new tests in `OAuth PKCE (S256) — rm-149` — binding
  (`s256CodeChallenge(INJECTED) === url.code_challenge`, cookie-untainted),
  verifier-cookie attribute mirror, happy path (verifier reaches the
  exchange), absent-verifier → 403/0 exchanges/no session, tampered pairing →
  401 via fake-enforced bad_verification_code, malformed cookie → 403
  pre-exchange, client wire-gate, `generatePkcePair` shape/uniqueness.

### rm-805 — workflow runner-pin guard, implemented

- `test/workflow-runner-pin-guard.test.ts` (new, fork-exclusion-guard family,
  no YAML parser so dated-reason comments stay addressable): scans every
  `.github/workflows/*.{yaml,yml}`; floating literals (`*-latest`/`latest`)
  violate UNLESS an adjacent comment (same line, contiguous block above, or
  the block above the job header — through one job-header line) carries a
  YYYY-MM-DD date; `runs-on: ${{ matrix.* }}` resolves inline and block
  matrix values within the job block (all pinned → pass, any floating → same
  dated-reason rule, fromJSON/env-style unresolvable → violation with a
  record-the-disposition message); pinned literals and labels pass.
- Mandatory negative checks: permanent synthetic fixtures (planted
  un-commented `ubuntu-latest` → 1 violation at the right line; UNdated
  adjacent comment → still a violation; quoted/bare floats; matrix
  floating/block-floating/unresolvable) PLUS a live planted-workflow red run:
  `.github/workflows/zz-rm805-negative-probe.yaml` (runs-on: ubuntu-latest,
  no comment) → live-scan test failed naming the probe; removed → 7/7 green.
  Fixture `${{ … }}` strings are built by concatenation (`'$' + '{{ … }}'`)
  so eslint's no-template-curly-in-string stays clean.
- `.github/workflows/cve-tripwire.yaml`: the fleet's sole floating site now
  carries the dated rm-805 reason (scan target + actions digest-pinned, alias
  cannot change what is scanned; re-eval by 2027-01-06 against the rm-188
  ubuntu-24.04 retirement watch). No workflow semantics changed.
- Live census at implement: 20 `runs-on` sites, 19 pinned `ubuntu-24.04`, 1
  dated floating — guard green.

### Verification (implement phase, focused battery)

- `vitest run test/auth.test.ts test/workflow-runner-pin-guard.test.ts` → 83/83.
- `tsc --noEmit` (server) green; eslint clean on all 7 touched/new files +
  the workflow.
- 487/487 across the nine auth-adjacent suites (session, endpoint-parity,
  static-assets, operator-route-redirect, gateway-auth, rate-limit-class,
  dashboard, operator-ui, operator-fixture-harness) after `pnpm build:web`
  (documented targeted-vitest `web/dist` trap — initial failures were
  environmental, class-proven before the build).
- New solution doc: docs/solutions/security-issues/oauth-pkce-s256-operator-login-2026-10-09.md.
