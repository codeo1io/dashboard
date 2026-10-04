<!-- Landed in-tree 2026-10-04 by this run's compound phase (attempt 76c39175) as the cycle-1 batch record, per the house convention this document names below. Source verbatim: delegate spool prioritize artifact 3e24568a (batch-2026-10-04.md); the two addenda after the batch are compound-phase additions. -->

# Prioritized batch — repository-maintenance cycle 1, run 733651705ae24ae69bf4bdc764ee0201

- **Base:** `227375247414e025902a29148c22c10d7244aacc` == `origin/main` (worktree `run-733651705ae2-73365170`; porcelain before this phase = ` M ROADMAP.md` — the roadmap-phase deliverable, preserved untouched)
- **Prioritize attempt:** `3e24568a79ec4721bffe346209d4b823` · 2026-10-04 · ce-plan skill, pipeline mode (decisions-not-code)
- **Inputs (this run's own prior phases, used not redone):** assess `a066e17f` · research `eaec6497` · roadmap `0765a82b` (uncommitted `rm-607` def + 2 riders, +10/-0 in the worktree)
- **Method:** fleet census re-derived THIS turn under the diff-HEAD law (staged-blindness law); every grep/cite below was executed this turn and its output was on the desk (PROJECT_RULES #16233 — no remembered evidence). Open-pool enumeration by priority from `ROADMAP.md` at base + the worktree diff.

## Selected batch — close the CSRF refresh-then-resend class, then arm the operator

| unit | item | track/priority | effort | droppable |
|---|---|---|---|---|
| B1 | `rm-607` cancel-client stale-CSRF 400 retry (code) | reliability 38.0 (this run's mint) | S | no (anchor) |
| B2 | `rm-485` server launchRun retry — declined by its own decision path | reliability 32.0 | XS–S | yes (last-but-one) |
| B3 | `rm-254` gateway-access.md v0.116.0+ upgrade section | docs 40.0 | S | yes (drop first) |

Drop order: B3 → B2. B0 rider (house convention): this run's uncommitted ROADMAP delivery (rm-607 def + rm-484/rm-272 riders) rides the batch; implement appends the status flips (rm-607 → implemented; rm-485 → declined-by-decision per its own acceptance's decision arm; rm-254 → implemented).

Theme: rm-130 established refresh-then-resend for the CSRF-400 class; its members are decideRunApproval (fixed, rm-130), browser submitLaunch (fixed), browser cancel (B1 — the only member with a live caller still broken), server launchRun (B2 — zero callers; record why it stays unimplemented). B3 truths the runbook for the gateway version the operator surface actually runs against. All three complete end-to-end in a delegate env: code+tests locally, docs+ledger text, no live gateway, no gh writes, no external decisions.

---

### B1 (anchor) — rm-607: browser cancel client re-sends the STALE CSRF token on its one 400 retry

**Defect (verified fresh this turn):** `public/operator-stream.js` cancel client builds `init` once (~:1351-1357: `method:'POST'`, `redirect:'error'`, headers `x-csrf-token: csrfToken` + `idempotency-key`); on HTTP 400 it re-POSTs the byte-identical `init` (:1368-1376, comment: "One retry only on HTTP 400, reusing the SAME idempotency key and init."). A session-expired 400 therefore burns the retry on a known-stale token and the control dies.

**Twins to mirror (verified fresh):** decideRunApproval at `public/operator-stream.js:1115-1128` — 400 → `refreshCsrf()` → re-POST with the FRESH token and the SAME idempotency key; refresh failure maps http→`{kind:'http',status}` / else network. Browser submitLaunch at `public/operator-launch.js:135-143` — same discipline.

**Pin to flip (verified fresh):** `test/operator-stream-core.test.ts:3525-3544` ("error: HTTP 400 triggers exactly ONE retry with the SAME idempotency key") pins `csrfTokens[0] === csrfTokens[1] === 'csrf-token-abc'` (same-token retry); the approval twin's test at :3197 pins the refreshed-token shape. The fix REQUIRES this test rewrite (documented in rm-607's def and in this run's assess/research).

**Fix shape:** mirror the approval twin inside the cancel client's 400 branch — `refreshCsrf()`; on failure map the error exactly like :1115-1128; on success rebuild init headers with the fresh token, SAME idempotency key, retry exactly once.

**Acceptance mapping (rm-607):** csrfTokens[0] ≠ csrfTokens[1] on a 400-retry; csrfTokens[1] equals the refreshed token; idempotency keys identical across both calls; exactly one retry; a persistent second 400 surfaces the session-expired path (no third call); zero regressions in the rest of `operator-stream-core.test.ts`.

**Effort/risk:** S / low — one hunk + one test block; exact landed twin precedent. **Deps:** none.

**Verification (implement):** red-first — flip the pin test to the twin shape first, watch it fail on current code; then fix; focused `pnpm exec vitest run test/operator-stream-core.test.ts`; then full gates foreground: `pnpm check-types`, `pnpm lint`, `pnpm test` (web caveat below).

---

### B2 — rm-485: server launchRun CSRF-400 retry — CLOSE via the decline path

**State (verified fresh this turn):** server-side `launchRun` at `src/gateway/operator-client.ts:551-582` POSTs once and returns raw failure at :575 — no retry. The interface docs for the other three mutating methods state "one CSRF-400 retry reusing the same key" (:252-253 decideRunApproval, ~:275 subscribePush, ~:285 unsubscribePush); `launchRun`'s interface entry (:229-232) states no retry contract — the asymmetry rm-485 flags.

**Zero production callers (re-derived this turn, do not trust memory):** `grep -rn launchRun src/ public/ web/src/ scripts/` → only `operator-client.ts` itself, its `.d.ts`, and `public/operator-launch.js`'s SEPARATE browser client (own `launchRun` at :278 whose state machine already refresh-then-retries at :135-143). Test callers only at `test/operator-client.test.ts:178+`. No `src/`, `web/src/`, `scripts/` caller of the server-side method.

**Decision:** decline the code path via rm-485's own acceptance arm — "a recorded decision declines it, corrects the asymmetry documentation, and names why the browser twin suffices for every current caller". Rationale: the only current consumer of a launch CSRF flow is the browser module (already correct); a retry on a zero-caller method is unexercisable dead code.

**Deliverables:** (1) `launchRun`'s interface doc (:229-232 block) states its contract explicitly — no server-side retry; consumers own the 400-refresh-resend, citing the browser twin — so all four mutating methods state retry contracts symmetrically; (2) ROADMAP status line records the decline + rationale + zero-caller evidence; (3) optional cheap doc-pin test asserting the four contract strings (keeps the docs self-locking).

**Effort/risk:** XS–S / low. **Deps:** none. **Pointer note:** 84860aac's deferral table lists rm-485 "(decision close)" and 146d73f2's names it "cheap docs-riding member next cycle" — pointer-level only, no active claim (no sibling diff flips its status or edits operator-client.ts docs — verified this turn).

---

### B3 (droppable rider) — rm-254: gateway-access.md v0.116.0+ upgrade section

**Target state (verified fresh this turn):** `grep -c '0\.116' docs/runbooks/gateway-access.md` → **0** — the section does not exist. rm-254 is the SOLE open item owning this content: the 2026-09-29 rider's plan to mint the 401-remap as rm-255 and the image-coupling note as rm-256 NEVER landed — on main those ids carry different, implemented content (rm-255 = database-id join, :986; rm-256 = lint --cache, :992).

**Deliverable (rm-254 acceptance, :980-983):** a v0.116.0+ upgrade section in `docs/runbooks/gateway-access.md` covering — image coupling (gateway + workspace images upgrade or roll back TOGETHER); bearer-token-on-every-route (except `/healthz` + `/readyz`); the 401→operator-actionable workspace-unavailable semantic; a pre-upgrade checklist item requiring the dashboard's contract support (rm-252) at/past the target gateway version before the pin moves; and a pin-parity table (deployed gateway version · fork workflow pin · mirror contract version). Facts on file for the table (implement re-verifies each before writing): runbook deployed-pin semantics v0.114.1 · `fro-bot.yaml` pin v0.115.1 (digest 930ffc9f) · mirror contract 1.6.0 (`src/gateway/operator-contract/version.ts:15`, `public/operator-stream.js:32`) · upstream v0.117.0 / contract 1.8.0. Citations from the v0.116.0/v0.117.0 release notes (read-only `gh api`).

**Boundary:** docs only — no pin moves (rm-157/rm-252 are sequenced behind a live-gateway change), no 401-remap code (that fold belongs to the rm-157 family), no rm-183 content (its acceptance adds a different verification step to the same file; unclaimed, left for its pointer lane).

**Effort/risk:** S / low. **Pointer note:** 84860aac lists "rm-254/rm-181 (docs)" as deferred pointers — no active claim (fresh sweep: the only `gateway-access.md`/`rm-254` hits in sibling diffs are historical rider text).

---

## Fleet census + race map (re-derived this turn, ~04:3xZ)

19 dirty worktrees at/near this base. ACTIVE implementation claims — do not touch:

- 38ee3e1c: rm-187, rm-501 (+rm-482 rider), rm-597, rm-596-eslint-plugin
- 146d73f2: rm-286, rm-594, rm-596-push-cards, rm-595
- 2c3b4c64: rm-608, rm-609 (implemented in-tree, uncommitted)
- 84860aac: rm-614, rm-615 (stewardship done 597de7e2)
- 3b584779: rm-617 + rm-484 (corrected batch after the rm-616 retraction, stewardship 7d9a9b44)
- b528f707 (same base): rm-556, rm-557, rm-558 (implemented in-tree, uncommitted)
- 63b5848a: rm-568–573 (incl. the rm-487 fold); 7a4d9070: rm-555; caa4003d: rm-584; 41067ca6: rm-586–593; d1850b2e: rm-599–606; fefc4067: rm-600–605; 9114bc6c: rm-608–610; 667b8384: rm-611; 80e84092: rm-612/613; b3491252: rm-618; 86c2dd13: rm-619–621 (id ceiling; next free rm-622)
- 733651705 (THIS RUN): rm-607 — confirmed in 84860aac's do-not-touch table; zero sibling claims on the cancel-CSRF content (content grep across all dirty diffs, this turn)

84860aac's "raced lanes — do not touch" table (read this turn) matches this census. Known same-day id-collisions to reconcile BY CONTENT at integrate (never by bare id): rm-594, rm-596 (38ee3e1c vs 146d73f2), rm-608/609 (2c3b4c64 vs 9114bc6c).

Fresh lane notes: cdb57400's assess (68faa576, this base) found the aggregator scrubLastGood dual-key gap (rm-198 window) + an a11y activation gap — unclaimed NOW but owned by that lane's upcoming roadmap mint; this batch takes neither.

## Adjudication ledger — the rest of the top-36 open pool

- rm-104 (98.0): hermes-roadmap RENDER signals (vendored impeccable paths) — external render cycle, not repo code. Not cycle material.
- rm-279 (96.0): fleet believes cured-by-content at the next integrate; acceptance carries a big companion ledger refactor. Contested + M. Skip.
- rm-103 (85.0) / rm-252 (80.0): standing upstream-absorb watch / never-absorb policy item. Standing.
- rm-157 (72.0) / rm-281 (62.0): live-gateway sequenced. Skip.
- rm-117 (70.0) / rm-205 (55.0): code-scanning watch items; rm-205's final leg needs a future base-digest bump re-scan — not completable end-to-end this cycle.
- rm-106 (70.0): external privacy policy. rm-108 (60.0): standing ecosystem watch. Standing.
- rm-116 (58.0): sequence-gated on required checks; fleet-deferred (d620213c). rm-146 (38.0): blocked on rm-116.
- rm-149 (66.0): PKCE — Effort-2 auth surface, not exercisable in a delegate env (fleet consensus deferral).
- rm-107 (65.0) / rm-119 (52.0) / rm-227 (30.0) / rm-224 (48.0): feature/product scale — fleet-consensus deferred; rm-119 is the strongest future headliner among them (workflow-level conclusions in the snapshot) but needs REST polling + snapshot schema + web surface = its own cycle.
- rm-114 (45.0) / rm-253 (50.0) / rm-484 (36.0): SSE single-sourcing convergence family — rm-484 actively claimed by 3b584779; convergence deferred by both pointer lanes.
- rm-118 (42.0) + rm-183 (38.0): 84860aac's named next-cycle pointers; rm-118 is Effort-2 token repositories[] scoping needing its own cycle. Honored.
- rm-289 (38.0): time-gated — first live window 2026-10-05 03:37–05:23Z (Monday cluster); 146d73f2's declared next-cycle headliner; implement against fresh facts after the window.
- rm-159 (32.0): needs push authority (prohibited in these phases). rm-199 (31.0): decision-gated. rm-254 taken as B3. rm-120 (36.0): XS watch-setup rider, unclaimed — spare unit if a batch member collapses mid-cycle.
- rm-226 / rm-282 / rm-141 / rm-517: close-as-content at integrate or owned by other lineages. rm-271 (34.0) / rm-215 / rm-165 / rm-139 / rm-140 / rm-147 / rm-250: standing watches/external.

## Verification + implement-phase notes

- Gates FOREGROUND with generous timeouts (standing OP note — backgrounded gate chains get reaped in this harness).
- Web suite on main still carries the rm-548 localStorage env red class (4 files/100 tests) — apply `NODE_OPTIONS='--localstorage-file=/tmp/x'` for web vitest; 2c3b4c64's rm-608 cure is in THEIR uncommitted tree, NOT on main — do not re-derive or re-mint; server suite 54 files/2354 tests green at base (this run's assess, first-hand).
- Per PROJECT_RULES #16233: re-execute every grep this batch's docs depend on in the implementing turn; a remembered result never beats a fresh re-derivation.
- Per this phase's hygiene rules the batch doc lives in the delegate spool only; if the implement phase follows the in-tree house convention it may copy it under `docs/prioritization/` as its own deliverable.

## Pre-review validation outcomes (compound addendum, 2026-10-04, compound attempt 76c39175)

Recorded outcomes of the implemented batch (implement d9f248c5 → targeted_tests
8ef7d6c4 → full_tests 0474301d), consumed here as evidence only — no tests
re-executed in the compound phase:

- **Batch as it validated** (worktree `run-733651705ae2-73365170` @ base
  227375247, uncommitted): `ROADMAP.md`, `docs/runbooks/gateway-access.md`,
  `public/operator-stream.js`, `src/gateway/operator-client.ts`,
  `test/operator-stream-core.test.ts` modified +
  `test/operator-client-retry-contract.test.ts` untracked; +116/-14 across the
  5 tracked files; porcelain identical pre/post validation.
- **targeted_tests 8ef7d6c4** — the work-order targeted_command verbatim:
  impacted-selector 7 files / 476 tests green around `src/gateway/operator-client.ts`
  (gateway-auth-session-cache, gateway-auth, operator-client, operator-contract-conformance,
  operator-copy, operator-route-redirect, operator-ui), plus the supplementary
  focus 2 files / 370 tests green (`operator-stream-core` incl. the flipped pin
  and the persistent-400 negative; `operator-client-retry-contract` ×5).
- **full_tests 0474301d** — the authoritative `github_ci_validate.py --repo .`
  verbatim, rc=0 via the ephemeral-pr route: draft PR #371 at snapshot
  8dedaf2eacf8d3d98f6b3a3dfd0d94d8c9fc6164 on validation base 47d212b6,
  ALL 10 checks SUCCESS (Main ×6 incl. full `pnpm test` on Node 24 — the
  flipped pin passes there; CodeQL/Analyze; Dependency Review; visual fired on
  `public/**`), PR closed + both `conductor/ci-*` refs deleted and verified
  empty. Pre-flight local battery: check-types rc=0, lint rc=0, vitest root
  55 files / 2359 tests (= base 54/2354 + the new doc-pin suite's +1/+5).
- **Validation digest of record:**
  `validation:v1:2330d185b9f9bd1b24c3264f69c9d6672efccb849c1f492f88d0a8d1acb0b029`
  (dispatch-time digest copied verbatim per the emission rule; identical in
  the targeted and full results).
- B1 red-first proof retained in the implement result: the flipped pin failed
  `expected 3, received 2` on unfixed code before the fix was applied.
- Reusable lessons extracted this cycle:
  `docs/solutions/security-issues/csrf-400-retry-stale-token-pin-test-2026-10-04.md`
  (pinning-test-locked defect + per-header retry discipline + red-first flip)
  and
  `docs/solutions/workflow-issues/jsdoc-contract-tests-normalize-wrapped-docstrings-2026-10-04.md`
  (docstring contract tests must normalize wrapped JSDoc). ROADMAP riders with
  this same evidence sit on rm-607, rm-485, and rm-254.

## Next-cycle context (compound addendum, 2026-10-04)

Standing pointers for the next repository-maintenance cycle, from this cycle's
own phases (review/ship outcomes are NOT folded here — the next assessment
carries them):

1. **CSRF refresh-then-resend class: CLOSED — do not re-mint.** All four
   mutating members now state+test their contracts (rm-130 helper,
   browser submitLaunch, browser cancel rm-607, server launchRun rm-485
   declined-with-contract); the class self-locks via
   `test/operator-client-retry-contract.test.ts` and the flipped pin. Any new
   mutating member must copy the twin branch and extend the doc-pin suite.
2. **First scheduled dependabot window is a live experiment** (rm-289,
   146d73f2's declared headliner): the weekly npm version-update run had never
   fired; first window 2026-10-05 03:37-05:23Z ET-offset per the sibling's
   probe. A next-cycle assessment landing after that window should read the
   grouped `['*']` PR for un-ignored direct majors (jsdom 29→30, jest-dom
   6→7, @types/node 24→26 — dependabot.yml ignores vitest+typescript majors
   only) BEFORE extending the ignore block; also remember `gh pr list
   --author 'app/dependabot' --state all` (author~dependabot misses app PRs).
3. **84860aac's pointers remain the doc lane**: rm-118 (pin-family coupling —
   "all four at once" still 3/4: action pin v0.115.1 vs contract 1.6.0 vs
   runbook v0.114.1 vs releases v0.117.1) and rm-183 (gateway-access.md
   verification step — deliberately untouched by B3; pointer lane).
4. **rm-120 is a spare XS rider** (retry-state teaching-test lane, drawn to
   rm-130's implementation facts); **rm-119 (P1 auth-view dependency
   pruning)** stays the future headliner behind that lane's roadmap mint.
5. **cdb57400's aggregator findings** (scrubLastGood needed for dual-key
   GitHub databaseIds; a11y gap — only one page exposes a skip-link) are owned
   by that sibling's roadmap mint — reconcile by content, do not re-derive.
6. **Local-vs-CI test truth**: local full `pnpm test` shows the rm-548 web
   localStorage env red class on Node ≥25/26 (4 files/100 tests); CI is
   authoritative green on Node 24 (this cycle's full validation: 55f/2359t).
   2c3b4c64's rm-608 owns the cure (their uncommitted tree). Until it lands,
   apply `NODE_OPTIONS='--localstorage-file=/tmp/x'` for local web vitest or
   trust CI — do not re-diagnose.
7. **Fleet id-space discipline**: this cycle minted only rm-607 (sole owner in
   id-space and content at the 02:21Z census — extension #12 in ROADMAP.md
   carries the three-wave census record). That census is time-stamped and
   stale by now; any next mint re-runs the diff-HEAD census across fleet
   worktrees (staged-blindness law) and reconciles by content per the house
   convention.
8. **Ecosystem snapshot** (research eaec6497617c, 2026-10-04 ~03:15Z): fro-bot
   releases unmoved at v0.117.1 (wiki+deps) with a 4-feature gap to the
   runbook; typescript-eslint 8.71.0 peer `>=4.8.4 <6.1.0` (TS7 still
   blocked); Node v26.10.0 current / Krypton LTS ~2026-10-28; pnpm npm-latest
   12.9.1 vs GitHub-release 12.8.1. Same-day riders on rm-108/rm-139/rm-252 in
   d1850b2e/fefc4067's uncommitted trees carry these — do not duplicate.
