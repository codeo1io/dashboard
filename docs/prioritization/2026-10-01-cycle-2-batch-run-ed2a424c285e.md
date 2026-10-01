# Dashboard repository-maintenance — cycle 2 batch (2026-10-01, run ed2a424c285e)

module: repository-maintenance
tags: `[reliability, operator-experience, web-client, push]`
problem_type: batch-record

Base: HEAD `31995a2` == origin/main (unmoved at selection). The worktree carries
only this run's roadmap extension (candidates `rm-276`..`rm-282` at
ROADMAP.md:905-947, phase `roadmap:ec8d5dcb`, +61/-8, zero duplicate ids) plus
this batch record. Nothing else is modified; nothing is committed.

## Fleet state at selection — the binding constraint

This prioritize pass censused every sibling worktree under
`dashboard-864ca327c8` (86 run trees; `git status` per tree, targeted diffs,
one salvage lineage) before scoring. The rule applied is the standing fleet
rule from the sibling cycle-2 doc: *choose the highest-priority work NOT
already in flight elsewhere in the fleet*. The census found the obvious
security batch already multiply-implemented, uncommitted, at this same base:

| Content (this tree's id) | Owning in-flight run(s) | State at selection |
|---|---|---|
| Transitive override floors (`rm-276`) | 23d39aa7467e — complete: all four floors, live `pnpm audit -r == 0` at 2026-09-30T20:26Z, undici steward numeral `>=7.30.0`; f3fbd7d9 — fast-uri floor; f89673c5 — selected, not implemented | implemented in flight |
| CI audit gate (`rm-278`) | 23d39aa7467e — `.github/workflows/audit.yaml` landed in-tree | implemented in flight |
| Dependabot inertness mechanism (`rm-277`) | 23d39aa7467e — root cause named and landed in its `dependabot.yml` comment (floor-inertness proven live 2026-09-30) | documented in flight |
| Logout body-read cap (`rm-280`) | f3fbd7d9 — `src/read-body.ts` shared bounded reader + auth tests (wire-byte cap, chunked-cancel) | implemented in flight |
| `main.yaml` comment truth (`rm-282` leg 2) | 23d39aa7467e (its rm-281); f91bcdc2c6f7 also on `main.yaml` for lint-shards | trued in flight |
| hono/@hono/node-server refresh | a666f8c0 (+ f3fbd7d9 regression pins) | implemented in flight |
| Lint-cliff base-debt trio | f3fbd7d9, a923284c, 7ce48fe5 (cured trees); f89673c5 (selected) | cured in flight — this batch reuses the cure bytes (B0) |
| Composed monitor panel `rm-107` (65.0) | be59a16e — `/api/monitor` + `Monitoring.tsx` + aggregator telemetry, 11 files | implementing |
| Main-Lint decomposition | f91bcdc2c6f7 — `scripts/lint-shards.ts` | implementing |
| Gateway operator contract `rm-252`/`rm-253` | d997d9a88aad — operator-contract fixtures, 17 files | implementing |
| Notifications copy truth + actions-cache | ba122f21835b | implementing |
| Cycle-20 batch rm-138/rm-136/rm-134/rm-140 | 1bcde4590bae — committed f3e4d1c 2026-10-01T00:31Z: rm-134 abort-plumbing through `PushClient` + `runReconcileSweep` (signal dep, entry/mid-read abort guards; subscribe.ts hunks :29/:104/:142/:579/:595/:615/:644/:683/:717) + rm-140 assets headers (src/server.ts); rm-138/rm-136 are named in its batch doc but absent from the salvage commit | implemented in flight — sweep-window contention for rm-281's re-arm |
| Absorb-with-floors rm-307/rm-308 | 173ce2aadf09 — committed 679daed 2026-10-01T04:00Z (base 278d350, pre-cycle-19): strict VAPID parser + PRODUCTION `getCurrentKeyVersion` wiring (`createCurrentKeyVersionSource`, TTL-coalesced fetch+cache) + pnpm-workspace floors + fro-bot.yaml; subscribe.ts hunks :17/:127/:647/:757-append + Notifications.tsx | rm-308 IS rm-281's wire clause (id divergence) — committed after the 21:45Z census snapshot |
| OAuth PKCE `rm-149` (66.0) | complete prior art on salvage branch `conductor/run-2ee1c4841e9d` (commit `f515ec1`, on origin too — corrected at adoption): `src/auth/oauth.ts` S256 + `test/auth-pkce.test.ts` (184 lines) | stranded, unlanded — landing-pipeline material, not fresh implement |
| Push lifecycle `rm-163` (54.0) | hunk-adjacent only — 1bcde4590bae rm-134 and 173ce2aadf09 rm-308 edit other regions of subscribe.ts | SELECTED — B1 regions (:151-163, :436-450) appear in neither lane's hunks |
| Sweep re-arm `rm-281` (36.0) | wire clause claimed by 173ce2aadf09's rm-308; re-arm clause unclaimed | SELECTED — re-arm clause only; wire clause folded (B2) |
| Listener digest surface `rm-279` (48.0) | none | UNCLAIMED — deferred (sequencing, below) |

## Selection method

Five-axis scoring (cycle-8 house shape: Impact / Delay / Effort, 5 = cheapest /
Dep-free, 5 = no external landing dependency / Strategic), over the seven fresh
candidates plus every standing open item, under four hard filters:

1. **No duplicate implement** — content already implemented by an in-flight
   sibling tree is excluded regardless of score; it advances by landing, and by
   this tree's ledger flipping to implemented-by-reconciliation at integrate.
2. **Locally completable end-to-end this cycle** — no live gateway, no CI
   admin, no registry/advisory clock, no pending product decision (the rule the
   last three cycles applied).
3. **One surface family per cycle** — the batch owns `web/src/push/**` and its
   web tests only, plus base-debt doc/ROADMAP bytes in B0; no server routes, no
   pnpm/manifest files, no `.github/**`, no gateway sources.
4. **Hunk-disjoint from in-flight lanes (re-adjudicated at adoption)** — the
   census at selection said no sibling tree touches the push family; that is
   no longer true: two committed lanes now hold `subscribe.ts` deltas
   (1bcde4590bae rm-134, 173ce2aadf09 rm-308 — both committed after the
   census snapshot). The batch survives on verified hunk-disjointness for B1
   (:151-163 and :436-450 appear in neither lane's diffs) and a
   merge-tolerance gate for B2 (adjacent window, disjoint statements —
   Watchlist). ba122f21835b still owns only the Notifications view + copy.

## Five-axis scoring (1-5)

| Ref | Imp | Delay | Eff | Dep | Strat | Total | Standing |
|---|---|---|---|---|---|---|---|
| `rm-163` push abort-race + metadata folding (54.0) | 4 | 4 | 3 | 5 | 4 | 20 | SELECTED B1 (lead) |
| `rm-281` sweep re-arm + seam disposition (36.0) | 3 | 3 | 4 | 5 | 4 | 19 | SELECTED B2 |
| `rm-276` transitive floors (58.0) | 5 | 5 | 3 | 4 | 4 | 21 | EXCLUDED — implemented in flight (23d39aa7467e complete, f3fbd7d9 partial) |
| OAuth PKCE `rm-149` (66.0) | 5 | 4 | 3 | 5 | 5 | 22 | EXCLUDED — complete prior art stranded on the salvage lineage; integration fleet owns landing |
| Logout read cap `rm-280` (38.0) | 4 | 4 | 4 | 5 | 4 | 21 | EXCLUDED — implemented in flight (f3fbd7d9 read-body seam) |
| CI audit gate `rm-278` (40.0) | 4 | 4 | 4 | 4 | 4 | 20 | EXCLUDED — landed in flight (23d39aa7467e audit.yaml) |
| `rm-127` gateway-login topology (56.0) | 4 | 3 | 4 | 5 | 4 | 20 | DEFER — first alternate; lead of the next auth-truth cycle |
| `rm-282` leg 1 identity-log contract | 3 | 3 | 5 | 5 | 3 | 19 | DEFER — rides the `rm-127` auth pairing |
| `rm-279` listener digest surface (48.0) | 4 | 3 | 2 | 5 | 4 | 18 | DEFER — pairs with be59a16e's monitor panel once it lands; today it doubles new-operator-surface churn in one window |
| `rm-282` leg 2 main.yaml comment | 3 | 3 | 5 | 5 | 2 | 18 | EXCLUDED — trued in flight (23d39aa7467e) |
| `rm-277` dependabot mechanism (44.0) | 3 | 3 | 4 | 4 | 3 | 17 | EXCLUDED — root cause named and landed in 23d39aa7467e's dependabot.yml |
| `rm-282` leg 3 healthz nulls | 2 | 2 | 5 | 5 | 3 | 17 | DEFER — `api.ts` carries be59a16e's in-flight monitor block |
| `rm-162` installation memoization + ETag (60.0) | 3 | 2 | 3 | 5 | 3 | 16 | DEFER — no live pressure (cycle-8's recorded words still true); `aggregator.ts` carries be59a16e's in-flight telemetry |
| `rm-104` fleet-render clobber guard (98.0) | 4 | 4 | 4 | 1 | 3 | 16 | STANDING — generator/render external; repo-side guard sub-leg noted there |
| `rm-102`/`rm-103` (90/85) | — | — | — | — | — | — | evidence-gated on the first dependabot PR (~2026-10-03) |
| `rm-106` (70) / `rm-249` (72) / `rm-157` (72) / `rm-116` (58) / `rm-139` / `rm-108` (60) / `rm-271` | — | — | — | — | — | — | gateway / product-decision / live-gateway / live-settings / time-window / majors-window gated (standing) |

## Selected: push-flow lifecycle correctness (`rm-163` + `rm-281`)

Theme: the push flow's lifecycle edge cases still lie after cycle-19 hardened
its bounds. A logout racing the gateway subscribe POST can leave a live
server-side push record while the flow reports a terminal outcome
(`rm-163`); the reconcile sweep treats "unchanged" as terminal and never
re-arms after gateway-side drift, so a subscription deleted server-side stays
stale forever without an operator focus event (`rm-281`). Both are pure
web-client correctness, red-before-green testable with the patterns cycle-19
itself landed in `subscribe.test.ts` (deferred signals, fake timers,
never-settling promises), and the batch's edit points are hunk-disjoint from
both committed sibling lanes on the same file (verified against their diffs
at adoption).

### B1 — `rm-163` post-success abort race + metadata contract folding (priority 54.0, effort M) — batch lead

- Scope: `web/src/push/subscribe.ts:436-450` — the post-success abort
  fall-through (comment at `:441-444` records cycle-19's deliberate keep-both
  stance: dropping the local copy would desync). This unit DECIDES between the
  acceptance's two resolutions — move the abort check before the POST, or
  compensate after success with `subscription.unsubscribe()` plus a gateway
  delete — implements the chosen one, and updates the recorded-stance comment
  with the decision and its reasoning. `web/src/push/subscribe.ts:151-163` —
  malformed gateway subscription metadata currently folds into
  `metadata: undefined` (shape check at `hasValidSubscriptionMetadataShape`);
  surface a distinguishable, logged, testable state instead of silence.
  `web/src/push/logout-abort.ts` (26 lines, abort at `:24`) — the logout abort
  helper only aborts; if compensation is the chosen resolution it lands at the
  abort consumer, not in the helper.
- Acceptance (from ROADMAP rm-163): post-success abort either checks before the
  POST or compensates with unsubscribe + gateway delete; malformed metadata
  surfaces a distinguishable, logged, testable state instead of folding into
  absence.
- Evidence expectation: web test cases for both windows — a deferred-signal
  abort-race over the POST, and the malformed-metadata branch — green in
  `web/src/push/subscribe.test.ts`; a logout-mid-subscribe trace shows no
  orphaned gateway subscription; the decision comment updated in-place.

### B2 — `rm-281` reconcile-sweep re-arm + seam disposition (priority 36.0, effort M-)

- Scope: `web/src/push/subscribe.ts:677-716` — the sweep's unchanged guard
  (`:710`) and min-interval skip (`:716`) treat unchanged as a terminal state.
  Add re-arm conditions so gateway-side drift (subscription deleted
  server-side) re-syncs without requiring an operator focus event, with tests
  proving a drifted gateway subscription is re-detected while a true no-op
  sweep still short-circuits. The "why" note lands in `subscribe.ts` and the
  ROADMAP rider — NOT in `notifications-copy.ts`, which ba122f21835b owns
  in flight.
- Seam disposition (RE-ADJUDICATED at adoption — the dead attempt's paragraph
  here was fabricated): ROADMAP:941's acceptance cites no
  `src/gateway/digest.ts` (zero `digest.ts` hits in ROADMAP.md) — the dead
  seam is IN-TREE: `subscribe.ts:651` declares the optional
  `getCurrentKeyVersion` dep, `:738` reads it, and the production caller
  (Notifications.tsx:97-103) never feeds it, so `reconcile.ts:66-68`'s
  stale_key branch is unreachable in production. The wire-or-delete decision
  is now TAKEN by sibling 173ce2aadf09's rm-308 (production
  `createCurrentKeyVersionSource` fetch+cache, wired at the caller): this
  batch FOLDS the wire clause to that lane — record the fold at compound; do
  not re-wire (duplicate) and do not delete (would collide with rm-308's
  in-flight shape). This batch implements the re-arm clause only,
  metadata-sourced so it composes with rm-308 whatever its landing fate: the
  sweep cache gains last-known `metadata.active` / `metadata.keyVersion`
  captured from the sweep's OWN metadata read, and the unchanged guard
  re-arms when either drifts. Merge-tolerance: those edits sit in the
  640-740 window where 1bcde4590bae's rm-134 inserts abort guards —
  re-derive live anchors at dispatch (three-way-merge gate, Watchlist).
- Acceptance (from ROADMAP rm-281): sweep re-arms on gateway drift; the dead
  seam is wired or deleted with the decision recorded — satisfied here by
  implementing the re-arm clause and recording the wire-clause FOLD to
  173ce2aadf09's rm-308 as the decision.
- Evidence expectation: sweep re-arm tests green; unchanged-guard still
  short-circuits a genuine no-op sweep; decision recorded here and in the
  ROADMAP rider.

### B0 — batch baseline + base-debt Lint trio pre-fix (house convention, effort XS)

- At base, before B1: `pnpm build:web` (web/dist must exist — direct vitest
  hits `/`), `pnpm check-types`, targeted push suites (`subscribe.test.ts`,
  `notifications-copy.test.ts`), scoped lint on files this batch touches.
  Same battery plus full `pnpm test` after B2. Never lint as the final gate
  before the phase-result JSON.
- Base-debt pre-fix BEFORE any cloud run — re-adjudicated at adoption: legs 1
  and 2 of the original trio are DISCHARGED BY MAIN. origin/main moved
  31995a2 → 5bf15e1 (integrate of run c06f7bf3d796) landing exactly the
  leg-1/leg-2 content: the two ROADMAP monolith status lines split (rm-103 /
  rm-157 signals; blank-line + 2-space fragments) and the cycle-19 batch
  doc's tags list backtick-wrapped. DO NOT re-split ROADMAP in-tree (this
  tree's riders are hunk-adjacent; re-splitting would conflict with main's
  landed bytes at integrate — let integrate take main's side), and do not
  edit the cycle-19 tags line (byte-identical on main; an in-tree edit is
  harmless but pointless). The one remaining in-tree base cure: (3)
  `eslint --fix` the 11 trailing-space hits in
  `docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md` (whitespace-only;
  11 verified by `grep -cE ' +$'`). The 35-minute Lint cliff itself is
  already cured on main by the landed splits; after the pr-233 fix this
  batch's base lint-gate risk is zero. Verify the touched doc lints clean,
  then re-run the doc-only invariance battery (digest declarable per the
  targeted_tests precedent — no executable surface touched).

## Deliberately excluded (rationale recorded, no deferral notes minted)

- `rm-276` floors, `rm-278` audit gate, `rm-277` mechanism, `rm-280` read cap,
  `rm-282` leg 2 — implemented or discharged in sibling trees this window;
  this tree advances them by reconciliation at integrate, not re-implement.
  Third copies of the floors would also stack a third lockfile re-resolution
  on the same two files two other lanes are editing.
- OAuth PKCE `rm-149` — the top unclaimed standing item on score, excluded on
  the census: a complete tested implementation already exists on the stranded
  salvage lineage (`conductor/run-2ee1c4841e9d`, `f515ec1` — on origin too,
  corrected at adoption, integration-fleet-owned). Re-implementing would fork
  the fix; the item's path to production is adjudication and landing, the PR
  #196/#206 class of work, not this cycle's implement. Main's rm-149 rider
  (landed at 5bf15e1) now also constrains the landing: S256 sites must stay
  CodeQL alert-clean.
- `rm-279` digest — highest unclaimed operator-experience item, but it composes
  with be59a16e's monitor panel; building it before that lands doubles new
  operator-surface churn in one window and stacks a second lane on `api.ts`.
  Named next-cycle lead once the panel lands.
- `rm-127` topology + `rm-282` leg 1 — the recorded auth-truth pairing
  (cycle-8 nominated `rm-149`+`rm-127` as an auth-focused cycle; PKCE is now
  prior art, so the pairing reduces to `rm-127` + identity-log truth). First
  alternate if B1/B2 scope shrinks; otherwise next cycle.
- `rm-162` memoization/ETag — 60.0 but no live pressure (cycle-8's recorded
  deferral still holds) and `aggregator.ts` carries be59a16e's in-flight
  telemetry block; a third hand on the same file mid-flight is how integrate
  conflicts are made.
- `rm-104` — render/generator-external; the repo-side guard sub-leg stays
  recorded there. `rm-102`/`rm-103` — first dependabot PR owed ~2026-10-03.
  `rm-252`/`rm-253` — d997d9a88aad's dedicated lane. `rm-106`/`rm-249`/
  `rm-250`/`rm-247` — gateway/decision-gated. `rm-157` — live-gateway-gated.
  `rm-116` — live-settings stewardship turn. `rm-139`/`rm-108`/`rm-271`
  majors — time/eval-window gated. `rm-119`/`rm-216` — designed jointly with
  `rm-107`, which be59a16e owns mid-flight.

## Watchlist

- The ~2026-10-03 dependabot window (`rm-102`/`rm-137`/`rm-271`) may move
  `package.json`/`pnpm-lock.yaml` — zero overlap with this batch's files
  (`web/src/push/**`, web push tests, ROADMAP riders, the B0 trio docs).
- Sibling landing order: if 23d39aa7467e/f3fbd7d9 land first, re-verify at
  implement dispatch that the push family is still untouched by their deltas
  (it is, as of this census) and that B0's remaining cure bytes still
  reconcile (pr-233 only — legs 1-2 are main's now).
- main moved 31995a2 → 5bf15e1 during this phase (ROADMAP splits + cycle-19
  tags + rm-149 rider; zero push-family files — selection unaffected). At
  implement dispatch re-derive the main tip and the live subscribe.ts bytes
  BEFORE editing (three-way-merge gate): if 1bcde4590bae's rm-134 or
  173ce2aadf09's rm-308 has landed, rebase B2's anchors onto the landed
  shape; B1's regions are unaffected either way.
- ba122f21835b owns `notifications-copy.ts` and `Notifications.test.tsx` in
  flight — B1/B2 must not edit them; copy-level impact, if any, is recorded in
  `subscribe.ts` and the ROADMAP rider instead.
- The stranded salvage lineage (`PKCE`, logger-ndjson, security-headers,
  aggregator-pool, Monitoring tests) and PR #196/#206 remain the integration
  fleet's adjudication queue — not this batch's surface.

## Next-cycle context

Reconcile-by-content map (id drift across in-flight frames is expected;
content, not ids, decides): floors = `rm-276` here / `rm-276` in 23d39aa7467e
(complete) / `rm-282` in f3fbd7d9 / `rm-298` in 849737832a52 / `rm-282` in
a923284c; audit gate = `rm-278` here and in 23d39aa7467e; logout cap =
`rm-280` here / `rm-283`-adjacent in f3fbd7d9's frame; `main.yaml` comment =
`rm-282` leg 2 here / `rm-281` in 23d39aa7467e. Landing order wins the id;
renumber in-register at the integrate conflict case (#14948 precedent). The
push lifecycle (`rm-163`) and rm-281's RE-ARM clause are unique to this tree;
rm-281's wire clause now has a cross-frame twin — rm-308 in 173ce2aadf09 —
and reconciles by fold, not landing order.

Post-landing obligations: (a) verify this batch's B0 trio bytes match the
sibling cures (identical bytes reconcile trivially; divergent bytes mean the
recipe was not followed); (b) flip this tree's `rm-277` to
implemented-by-reconciliation citing 23d39aa7467e's landed root-cause comment;
(c) record `rm-281`'s seam decision in-register — the in-tree dead seam at
subscribe.ts:651/:738, and the wire-clause FOLD to 173ce2aadf09's rm-308 —
with this doc as the authority (corrected at adoption; the original text
here rested on a fabricated citation);
(d) carry `rm-279` (digest, pairing with the landed monitor panel), `rm-127` +
`rm-282` leg 1 (auth-truth cycle), and `rm-282` leg 3 as the standing
next-cycle leads; (e) the integration fleet adjudicates the stranded
`conductor/run-2ee1c4841e9d` lineage and PR #196/#206 — never bulk-close as
empty.

## Adoption and repair provenance (attempt 70f2580f, 2026-10-01)

This document was authored by the reaped first attempt of THIS phase
(58088e996b10428c8392e8987d7ef363, prioritize): its delegate turn started
2026-09-30T21:39:38Z, wrote this file at 21:45:49Z, was reaped at 21:51:25Z
(provider-family infrastructure failure), and died with three failed restart
stabs — no typed result artifact exists (`delegate/58088e99*.json` absent;
`done/58088e99*.json` is the dispatch envelope only, no `phase_result` key).
The completing attempt (70f2580f) ADOPTED the document after a full
salvage-audit, per the work-order forensics protocol: every load-bearing
claim re-verified live, and the repairs below are the delta.

Verified intact: base HEAD 31995a2 (origin/main was 31995a2 at selection);
roadmap extension ids rm-276..rm-282 at ROADMAP.md:905/912/919/926/933/940/947
with priorities 58/44/40/48/38/36/26, +61/-8, 161 id lines, zero duplicates;
standing priorities (rm-163 54.0, rm-104 98.0, rm-127 56.0, rm-162 60.0,
rm-149 66.0, rm-157 72.0, rm-249 72.0, rm-116 58.0); code claims —
subscribe.ts:436-450 post-success fall-through with the keep-both comment at
:441-444, :151-163 metadata folding behind
`hasValidSubscriptionMetadataShape` (defined :63, checked :157), sweep guard
:708-716, logout-abort.ts exactly 26 lines with the abort at :24,
notifications-copy.ts at `web/src/views/` (not push/), reconcile.ts:66-68
stale_key branch, Notifications.tsx:97-103 feeding only getLocalSubscription
+ pushClient (the seam dead in production), no `src/gateway/digest.ts`;
f3fbd7d9's `src/read-body.ts` committed (206a4ba, tree clean);
23d39aa7467e floors in pnpm-workspace overrides with the rm-276 root-cause
comment; f91bcdc2c6f7 `scripts/lint-shards.ts`; d997d9a88aad committed-clean
(f484ce4); be59a16e's monitor-panel delta (aggregator/api/server/monitoring/
Monitoring).

Repairs (fabrications and decay found at adoption):

1. B2's seam-disposition paragraph was FABRICATED — ROADMAP:941 contains no
   `src/gateway/digest.ts` citation (zero `digest.ts` hits in ROADMAP.md);
   the dead seam is in-tree at subscribe.ts:651/:738. Replaced wholesale,
   the wire-or-delete decision re-adjudicated as a FOLD to 173ce2aadf09's
   rm-308, and obligation (c) rewritten to match.
2. Fleet-census decay: the census method (`git status` per tree) caught only
   UNCOMMITTED state, so it missed two COMMITTED subscribe.ts lanes —
   1bcde4590bae's row mislabeled (its salvage commit f3e4d1c,
   2026-10-01T00:31:50Z, is rm-134 abort-plumbing + rm-140, not the sentry
   fixtures its batch doc names) and 173ce2aadf09 (committed 679daed,
   2026-10-01T04:00:17Z, post-census) was absent entirely. Both corrected;
   filter 4 and B1's closing claim re-adjudicated from "no sibling touches
   subscribe.ts" to verified hunk-disjointness (B1's :151-163 and :436-450
   appear in neither lane's hunk lists — checked against both diffs; B2's
   guard/cache window is adjacent to 1bcde4590bae's rm-134 insertions at
   :644/:683/:717, hence the three-way-merge gate). The adoption scan is
   merge-base-corrected (own delta vs fork point) across all 103 run trees —
   the raw `31995a2..HEAD` direction lies for pre-cycle-19 lineages.
3. B0 legs 1-2 discharged by main: 5bf15e1 landed exactly the ROADMAP
   monolith splits and the cycle-19 tags backtick-wrap; zero push-family
   files in the delta. The cited `3f654118-scratch/split_cliff_paragraphs.py`
   does not exist in the spool (swept or never written), and the cliff
   pointers were +14 stale (true in-tree lines L175 = 7317ch, L408 = 7967ch;
   the lengths and the exempt >5K set at 112/114/223 were correct). B0
   reduced to the pr-233 trailing-space fix (11 hits verified).
4. The PKCE salvage branch is not local-only —
   `origin/conductor/run-2ee1c4841e9d` exists. Exclusion unchanged; main's
   rm-149 rider (5bf15e1) adds the S256 CodeQL constraint to the landing.
5. Fleet recount: 103 `run-*` trees (86 at selection). The count is not
   load-bearing; the merge-base-corrected contention scan governs, and its
   result is stated in repair 2.

Batch verdict UNCHANGED by the repairs: select `rm-163` (full acceptance) +
`rm-281` (re-arm clause; wire clause folded to rm-308) + B0 reduced to the
pr-233 rider. Verification transcript:
`delegate/70f2580f8ef946499d537636616ef153-scratch/adoption-audit.md`.
