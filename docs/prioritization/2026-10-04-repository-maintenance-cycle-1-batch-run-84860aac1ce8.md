# Dashboard maintenance — cycle 1 batch (2026-10-04)

Run `84860aac1ce8` (repository-maintenance cycle:1) · base `227375247` == `origin/main`
(fetched 2026-10-04T03:01Z, unmoved) · prioritize attempt `fd4686a5` · inputs: this
run's assess `694aad14`, research `49bcba2f`, roadmap mints rm-614/rm-615 (attempt
`fa303fc5` re-delivery, uncommitted +13/-0 in this worktree).

## The cycle's mandate

One theme: **operator session-expiry surfaces — classify the failure at the
server, and lock the deployed origin's crawl surface.** Two members, both this
run's own mints, both verified unraced at selection (fleet census 03:01Z plus
content-class greps across every dirty sibling diff). Budget: one full-suite
validation pass; zero lockfile edits; zero time gates; no member depends on a
sibling lane landing.

Selection reasoning (impact × risk × effort × dependencies × strategic value)
over the FULL open ledger, not just this run's findings:

- **rm-149 (66.0, PKCE S256)** is the highest unclaimed, unblocked open
  priority — and this batch explicitly RECORDS the adjudication both same-day
  sibling selections left implicit: it stays deferred. Grounds: (a) standing
  cycle-8 deferral — an Effort-2 auth surface violates the single-cycle
  pattern; (b) its strongest acceptance evidence (a live authorization-code
  exchange with a real GitHub OAuth app) is not exercisable from this delegate
  environment — unit tests + grep leave an auth-surface change under-validated
  by this repo's own auth-change standards; (c) it is the natural headliner of
  a dedicated auth-theme cycle, with its recorded CodeQL constraint
  (`js/insufficient-password-hash` false-positive on the S256 sites) binding
  at implement time. Not skipped — parked with a named vehicle.
- **rm-107 (65.0)** and **rm-116 (58.0)** outrank everything else below but are
  not in-tree implementable this cycle (feature-scale panel; live GitHub
  mutation surface held at decision-first by fleet consensus) — same
  disposition as both same-day sibling batches. **rm-117 (70.0)** joins them
  (feature panel).
- **rm-249 (72.0) + rm-138 (30.0)** are joint-decision-gated (product +
  architecture decisions owed first). **rm-157 (72.0)** needs a live gateway
  this repo cannot reach. **rm-281 (62.0)** is external-lineage. **rm-282
  (74.0)** is close-as-content — `pnpm audit --recursive` was rc=0 at this
  run's assess; nothing to absorb.
- **rm-187 (47.0)** and **rm-501 (44.0, +rm-482 rider)** are claimed by
  sibling 38ee3e1c's batch; **rm-286 (44.0)** by 146d73f2. Raced, not ours.
- **rm-141 (47.0)** is a verification-half residual (the pool landed); its
  "before/after refresh-timing measurement" is not retroactively reproducible
  without resurrecting the serial walker — a determinism-suite-only landing
  would be a half-item. Deferred.
- **rm-487 (28.0)** was examined for a third slot and is RACED: sibling
  63b5848a's unlanded batch selected it as B2, and its session-channel mint's
  acceptance explicitly folds "rm-487's badge re-arm" as a same-batch rider.
  (Also noted first-hand: rm-487's ledger line cites App.tsx:151-156, but the
  `authExpired` latch and the false "full-page navigation" comment live at
  App.tsx:66/:131-133/:143 at this base — implement-time re-derivation is owed
  by whoever owns it.)
- **rm-118 (42.0)** (installation-token `repositories[]` scoping — real
  capability narrowing) is the best next-cycle candidate on this list: M
  effort, mint-cache keying semantics to design, no fresh evidence in this
  run. **rm-183 (38.0)** (limiter collapse warning) small but unrelated to
  this run's evidence. **rm-289 (38.0)** waits for its live window
  (2026-10-05). **rm-250 (36.0)** waits for the deployed gateway pin.
  **rm-484 (36.0)** and the SSE family wait on the 45.0 single-sourcing
  convergence item. **rm-513/rm-514** were M-effort-deferred by the 2026-10-03
  cycle. **rm-146** is blocked on rm-116. **rm-147** blocked-external.
  **rm-485 (32.0)** is close-by-decision material, not batch material.
- **rm-614 (28.0)** and **rm-615 (8.0)** are this run's own mints, carry this
  run's fresh first-hand evidence, and are unraced. They are the batch.

## B1 — rm-614: gateway-auth 302s misclassified as `unavailable` — arm (a), server-side Sec-Fetch-Dest

Decision at selection (the mint is decision-first with two arms): **arm (a),
server-side `Sec-Fetch-Dest` discrimination.** Arm (b) (client-side
`res.redirected` parity in all three public bundles) is declined for this
cycle: three shipped-bundle edit sites vs one server helper; every current and
future operator client is fixed at once (including any surface a future edit
misses); and the classification the bundles need already exists on their side —
`operator-run-index.js` classifies 401/403 → `authFailure` (:221-224), and the
stream twin folds 400/401/403 → session-expired via landed rm-130
(operator-stream.js:1569/:1934), which is exactly the
"reload affordance, not a retry loop" contract at :1682. `Sec-Fetch-*` are
forbidden headers (unspoofable from page script); absent header keeps today's
302 — default-preserving for curl/health checks/non-browser principals.

Implement scope:

- One helper in `src/server.ts` (e.g. `denyGatewayAuth(c, path)`): if
  `sec-fetch-dest === 'empty'` → `c.text('Unauthorized', 401)`, else today's
  `c.redirect(GATEWAY_LOGIN_REDIRECT, 302)`. Replace the SIX redirect sites in
  the `/operator/*` proxy middleware: no-cookie (:843), invalid gateway origin
  (:849), session-validation failure (:904), expired-session (:910),
  non-positive operatorId (:916), empty login (:920). rm-165's allowlist 403s
  (`c.text('Forbidden', 403)`) are the in-middleware non-redirect precedent —
  untouched, different meaning (validated-but-not-allowed vs
  unauthenticated).
- 401, not 403: 403 already carries the allowlist meaning in this middleware
  and both fire the same bundle branches; keep the classes distinct.
- Implement-time check (in scope, still arm (a)): `operator-launch.js`'s
  non-ok branch — if it lacks any 401/authFailure classification, add the
  minimal classification there so the launch surface renders its auth state
  instead of a generic error.
- Tests (first pins of this surface — `GATEWAY_LOGIN_REDIRECT` has ZERO
  occurrences in `test/` today): for a representative protected path, assert
  302 when `Sec-Fetch-Dest: document`, 302 when the header is absent, 401 when
  `Sec-Fetch-Dest: empty` — across the no-cookie and validation-failure
  sites; assert the allowlist 403 path is unchanged.

Evidence for the implement phase: new server tests green; `grep -c
'Sec-Fetch' src/server.ts` ≥ 1; a curl transcript against the dev server
(`Sec-Fetch-Dest: empty` → 401, `Sec-Fetch-Dest: document` → 302); no change
to any redirect behavior for header-less clients.

## B2 — rm-615: robots.txt + X-Robots-Tag noindex

`web/public` ships only the two icons and the manifest — the deployed origin
has zero robots surface (`grep -ri 'x-robots|robots' src/ web/src` = 0), and
no privacy-claims coupling (`web/src/privacy/claims.ts` has no
index/crawl/search tokens). Scope:

- `web/public/robots.txt` (RFC 9309: `User-agent: *` / `Disallow: /`) — builds
  into `web/dist` root and is served at `/robots.txt` by the static mounts.
- `X-Robots-Tag: noindex` on the SPA shell handler — one header covers `/`,
  `/privacy`, and every client route (they are all the same shell); keep the
  icon/manifest/asset mounts clean (immutable, already ETag'd).
- Tests: `/robots.txt` 200 with the exact file content; `X-Robots-Tag`
  present on `/` and a client-route path, absent (or unchanged) on `/assets/*`.

Effort S, self-locking, no lockfile. Note: `web/public/**` is inside the
visual workflow's path filter — a legitimate visual run fires; that is
expected, not a red.

## Deferred — pointers for later cycles

rm-149 (auth-theme headliner, CodeQL constraint binds at implement) ·
rm-107/rm-117/rm-116 (decision-first, fleet consensus) · rm-249+rm-138 (joint
decision) · rm-157/rm-281/rm-289/rm-250 (external/live windows) · rm-282
(close-as-content) · rm-141 (verification half; measurement not retroactively
reproducible) · rm-118 + rm-183 (best unclaimed next-cycle candidates) ·
rm-484 + SSE family (45.0 single-sourcing convergence) · rm-485 (decision
close) · rm-513/rm-514 (M-effort) · rm-146 (blocked on rm-116) · rm-147
(external) · rm-226 (gateway-session availability half) · rm-254/rm-181
(docs).

## Raced lanes — do not touch (fleet census 03:01Z, all unlanded)

38ee3e1c: rm-187, rm-501 (+rm-482 rider), rm-597, rm-596-eslint-plugin ·
146d73f2: rm-286, rm-594, rm-596-push-cards, rm-595 · 2c3b4c64: rm-608,
rm-609 · 7a4d9070: rm-555 · 63b5848a: rm-568–573 incl. rm-487's fold ·
caa4003d: rm-584 · 41067ca6: rm-586–593 · d1850b2e: rm-599–606 · fefc4067:
rm-600–605 · 73365170: rm-607 · 9114bc6c: rm-608–610 · 667b8384: rm-611 ·
80e84092: rm-612/613 · 3b584779: rm-616/617 · b3491252: rm-618. Known
same-day id-collisions to reconcile BY CONTENT at integrate (never by bare
id): rm-594 (38ee3e1c vs 146d73f2), rm-596 (38ee3e1c vs 146d73f2), rm-608/609
(9114bc6c vs 2c3b4c64). All-lineage uncommitted ceiling at census: rm-618;
next free rm-619.

## Validation plan (implement + validation phases)

- Gates: `pnpm check-types`, `pnpm lint`, `pnpm test` (pretest rebuilds
  `web/dist`).
- Standing red, do not chase: web 4 files/100 tests `window.localStorage`
  (rm-548 class; cure = sibling 2c3b4c64's rm-608 lane — red-count
  accounting: exactly that class, zero NEW red).
- Zero-edit web-green recipe if needed (does not race rm-608):
  `NODE_OPTIONS='--localstorage-file=/tmp/<file>'` per the 38ee3e1c B2 recipe.
- B1 is server-side only below the visual filter; B2 touches `web/public/**`
  → visual runs (legitimate).
- No `pnpm-lock.yaml` edit; no workflow edit; no dependency change.
