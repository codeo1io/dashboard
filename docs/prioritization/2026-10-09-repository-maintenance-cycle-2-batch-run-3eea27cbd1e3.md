# Prioritized batch — repository-maintenance cycle 2 — run 3eea27cbd1e3

**Selected batch (2 items, S–M, one implement window):**
`rm-163` (operator-experience, 54.0, scoped to the live metadata half) +
`rm-501` (operator-experience, 44.0, logout half) — batch name
`'push-metadata distinguishability + bounded logout'`.

Theme: operator network discipline — a contract regression must never
masquerade as "no subscription", and a hung logout exchange must never
permanently wedge the operator affordance. Both are client-side
(web/src/push/subscribe.ts, web/src/shell/AppShell.tsx + tests), disjoint
files, no shared server surface.

Selection was made at base 364272b (this tree, clean ledger 245 defs /
0 dups / max rm-778 re-derived first-hand; baseline `git show
HEAD:ROADMAP.md | grep -c 'status: open (selected'` = 0). **Main moved
past the base mid-run**: origin/main is now 88e423a (autonomously
integrate run cbe70604af06, "surface degradation truth in views, guard
degraded links (batch rm-780/187)"). Both selected items were
re-screened at tip: still `status: candidate`, no other lane's selection
on either id, and both defect sites verified unchanged at tip code.
The implement should land on top of 88e423a (rebase or fold at
integrate) — notably rm-501's implementation should ride the
fetch-timeout seam that landing introduced (web/src/api/fetch-timeout.ts).

## Why these two (value / risk / effort / dependency / strategy)

- **rm-163 (54.0)** — malformed push-subscription metadata currently
  folds into `metadata: undefined` (`hasValidSubscriptionMetadataShape`
  false branch, subscribe.ts:155-160 at tip), indistinguishable from "no
  subscription", unlogged. A contract regression hides as absence —
  exactly the degradation-truth class the ledger closes elsewhere.
  Effort S: a distinguishable outcome (surfaced + logged), pinning
  tests. **The abort half of the acceptance is cured by content at
  tip** — subscribeOptIn threads the abort signal into subscribePush,
  compensates every pre-success window with `subscription.unsubscribe()`
  plus an aborted/subscribe-failure kind split, and the post-success
  fall-through returning `'subscribed'` is a recorded deliberate choice
  (gateway holds the record; dropping the local copy would desync).
  Selection is scoped accordingly, and the cure is recorded in the
  selection rider.
- **rm-501 (44.0)** — logout half named "this def's next-cycle lead" by
  the def's own 2026-10-08 compound rider: handleLogout chains bare
  `await fetch` on /operator/session/csrf (:214) and
  /operator/auth/logout (:241), pre-mount fallback pair equally bare
  (:49, :68), `loggingOut` latch never releases on a hang; zero
  AbortSignal/timeout use in the file at tip. Effort M (bounded chain +
  latch release + never-resolving tests), the listener half already
  landed via 530bd1a9, rm-276 convergence partner landed (historical).

## Fleet congestion audit (what was excluded and why)

Liveness evidence: delegate-spool event scan (6h window, ~13:30Z),
fleet conductor dbs hold no dashboard-campaign registry; every claim
below cross-checked against the lane's CURRENT batch doc + worktree
porcelain, per the collision-diligence rules. PENDING-CONTENT pairing
(duplicate implementation folded at integrate) is the fleet's standing
disposition for recoverable-lane overlap.

**Claimed by live/active lanes (id + file contention):**
- rm-252 (80.0) — aec9c3e8 cycle-2 batch (rm-252/rm-254/rm-806; last
  dispatch roadmap 281min before selection).
- rm-117 (70.0) — 91776e25 cycle-1 lead (code-scanning REST half +
  web rendering; at full_tests) — also blocks rm-112's residual
  view-consumption half (its own status defers to the rm-107 decision).
- rm-149 (66.0) — 155f9770 cycle-3 ('oauth-pkce-hardening'); rm-281
  (62.0) is sequence-blocked on its landing (test/auth-pkce.test.ts
  absent from main) — both auth-surface items excluded.
- rm-289 (38.0) + new-workflow files — 1930644a cycle-1 (at implement).
- rm-788/rm-789 — cb189044 cycle-3 (at full_tests): cve-tripwire.yaml
  digest-resolution cure (the Monday 06:53Z tripwire deadline item),
  .dockerignore, dockerfile-context test. My assess F1's owner.
- rm-797/rm-799 — c4617181 cycle-2 (succeeded, unlanded, imminent):
  package.json/Dockerfile/zizmor/workflow files.
- rm-599/rm-797(routes)/rm-798 — 38e72854 cycle-2: src/routes/api.ts +
  public/operator-stream.js consumers — **this is why the whole SSE
  record-layer family (rm-253/rm-220/rm-114/rm-484) stays excluded**
  despite rm-162-era maturity (first-class file-contention exclusion,
  zero id overlap notwithstanding; lane salvaged 11:31Z, claims ride).
- rm-137 + rm-760(refresh) — 493bbbf2 cycle-2 (post-prioritize, quiet
  234min+): action-digest pins + dep refresh; verified unlanded at tip
  (upload-artifact still v7.0.1 in workflows).
- rm-818..821 — 5989eb97 cycle-2 (at implement): server.ts shell cache,
  operator-sse-reader, its mints.
- rm-517(staleness module)/Dockerfile/README/release-runbook —
  405e9004 cycle-2 compound (validated, unlanded): **src/server.ts
  contention excludes rm-226 (44.0, session-cache half landed rm-419;
  residual availability half + doc) and rm-183 (38.0, rate-limit
  collapse detector)** this cycle.
- rm-501 fold note: **salvage-stale sibling claim** — run e8c99e0e's
  cycle-2 'client network-bound truth' (prioritize
  ffbf656fcce34a26916595193803a384) selected rm-501+rm-485+rm-784 on a
  238-def / max-rm-784 stale base; salvaged 07:04:32Z, zero dispatch
  activity since, absent from both sibling fleet audits (06:25Z,
  07:19Z). Re-claimed per the dead-lane pending-content rule; recorded
  in the selection rider; byte-convergent fold by content at whichever
  integrate lands first.

**Gated / stale / non-selectable (trap map honored):**
- rm-104 (98.0) upstream-generator-gated acceptance; rm-703 (76.0) and
  rm-162 (60.0) and rm-194 (50.0) landed-by-content residues.
- rm-279 (96.0) / rm-103 (85.0) — workflow-yaml decomposition/merge on
  the same CI surface three live lanes edit (cb189044 cve-tripwire,
  1930644a NEW workflow, 493bbbf2 pins, c4617181 unlanded landing).
- rm-282 (74.0) premise stale: dependabot wall re-measured ZERO open
  alerts + zero open dependabot PRs (this run's roadmap rider on
  rm-102, 2026-10-09).
- rm-249 (72.0) product-gated (joint with rm-138); rm-224 (48.0) /
  rm-218 (46.0) product track.
- rm-107 (65.0) + rm-119 (52.0): M-L joint-plan mandate + file overlap
  with 38e72854 (routes/api.ts) and 91776e25 (panel) — also gates
  rm-216 (51.0, renders inside that surface) and rm-195 (40.0, sequenced
  behind the rm-107 decision).
- rm-116 (58.0): filling required checks on main while GitHub-side
  Actions is DISABLED repo-wide (since 2026-10-09 ~02:00Z — every
  full_tests dispatch times out; workflow_dispatch POST returns 422)
  would brick main merges — actively wrong shape until that lifts.
- rm-108 (60.0): decision matrix scheduled to fold at the rm-133
  ignore-window expiry 2026-10-21.
- rm-187 (47.0): **landed mid-run at origin/main 88e423a** (cbe70604's
  rm-780/187 batch — parseLinksCell guard + degradation views);
  verified implemented at tip; excluded on live truth despite
  still-candidate status at this base.
- rm-512 (46.0) superseded-by-content per its own mint text.
- rm-250 (36.0) DMR preflight rendering — payload-truth unverified from
  a worktree (deployed gateway at v0.113.2, pin bump v0.118.2
  UNDEPLOYED per research); rm-513 (36.0) Dockerfile/healthcheck —
  Dockerfile jam (405e9004 + c4617181); rm-689 (34.0) same Dockerfile
  jam + Monday base-drift fire belongs to the cve-tripwire lane;
  rm-659 (36.0) investigation-class standing open; rm-120 (36.0)
  runbook file overlaps 1930644a's red-watch runbook section.
- rm-759/760/761 implemented (dep/snapshot/action refresh landed via
  546c93c per this run's assess).

## Selection risk

- Duplicate-work risk on rm-501 if salvage lane e8c99e0e resurrects —
  bounded by the fold note + fleet pending-content precedent (two live
  lanes re-claimed ddb41af7's PR-#465 content the same morning).
- Base drift risk: selection screened at both 364272b and tip 88e423a;
  implement must re-verify the two defect sites before editing (tip
  line numbers cited in the riders).
- Parallel-minter margin: 8cecf1d7 is mid-roadmap (no batch doc yet)
  and may enter prioritize next; this batch's files (push/subscribe,
  AppShell) have zero drift across all 91 sibling worktrees, so only
  id-space discipline matters — no new ids minted here (riders + flips
  only; census unchanged 245/0/778).

## Verification (this phase)

- census pre-edit and post-edit: 245 defs / 0 dups / max rm-778
  (`node --experimental-strip-types scripts/roadmap-census.ts`).
- roadmap integrity + length guards green post-edit.
- eslint ROADMAP.md + this doc clean.
- rider ownership: selection rider at ROADMAP.md:1619 sits inside
  rm-501's block (def at :1610); rider at :2362 inside rm-163's block
  (def at :2358) — direct region reads, not reconstructed extents.

## Phases so far (this run)

- assess (base 364272b, read-only): ledger ground truth + provenance/
  auth/listener/shutdown surfaces — no unowned defects; three findings
  all owned spool-side (cve-tripwire NODE_IMAGE ×3 dead/recovered,
  operatorRuntimeCaching statSync rm-754 dead-lane, contract window
  coherent-by-design).
- research (base 364272b, read-only): gateway flip-gate resolved with
  deploy-side truth — fro-bot/agent v0.118.3 serves contract 1.8.0
  with SSE checkout provenance; infra pin bump v0.118.2 UNDEPLOYED
  (last deploy 2026-09-21); 27 upstream commits unabsorbed.
- roadmap (base 364272b): extension #31 — ten dated riders, zero new
  ids, census unchanged.
- **prioritize (this phase): the two flips + riders above.**

## Fleet liveness at selection (~13:30Z)

Active dispatches: cb189044 (full_tests), 28cd8f6c (assess), d41744e7
(implement), e586a5dc/c10aac17 (stewardship), 1930644a (implement),
8cecf1d7 (roadmap→implement). Quiet-but-claimed (≤6h): 155f9770,
493bbbf2, aec9c3e8, 405e9004, 5989eb97, 91776e25, 38e72854, 91f3d37f,
d823703c, 471d3910, ddb41af7. Salvage-burst 07:00–07:05Z reaped a
cohort (incl. e8c99e0e) with no re-dispatch since. GitHub-side Actions
DISABLED since ~02:00Z — all full_tests dispatches time out; no
ephemeral PR carries content overlapping this batch's files (5 open
transient conductor/ci-* PRs + probe, file lists checked).

## Implementation record (implement attempt a0a3066ea0a447d6b6516f696d33d6b5)

Both units implemented; base ADVANCED mid-batch from 364272b to 88e423a
(ff-only + stash-pop rider union — all four conflicts rider-class
keep-both) so rm-501 rides the landed fetch-timeout seam.

**rm-163 (web/src/push/subscribe.ts, web/src/views/Notifications.tsx):**
`getPushSubscriptionMetadata` now returns `metadataMalformed: true` +
a boundary `console.warn('[push] malformed subscription metadata …')`
for any non-404 payload that is neither the metadata shape nor the
legit EMPTY object (empty object stays genuine absence — it is the
server's real "no subscription" wire form). `runReconcileSweep` treats
that read as inconclusive: `{skipped: true, metadataMalformed: true}`,
no handoff derivation, no action, cache object returned UNCHANGED
(identity). Notifications.tsx renders a `role="alert"` notice
(`push-metadata-malformed` testid) instead of letting the state masquerade
as 'not_subscribed'. Tests: 5 malformed bodies + absence/valid contrast
(getter), inconclusive-skip + cache-identity (sweep), banner (view).

**rm-501 (web/src/shell/AppShell.tsx):** all four logout fetches
(gateway csrf :214, gateway POST, arctic csrf, arctic POST) ride
`withGetSeamTimeout` (web/src/api/fetch-timeout.ts, GET_SEAM_TIMEOUT_MS);
each seam `'timeout'` outcome fails closed — gateway-csrf hang falls back
through the Arctic contract (same treatment as the 404 branch), arctic
hang redirects to login, POST hang redirects after the settled-value
check now also tests `=== 'timeout'`. The `loggingOut` latch and
`logoutInFlight` guard release in a `finally`. Tests: 3
never-resolving-fetch hang tests (fake timers advancing
GET_SEAM_TIMEOUT_MS) asserting redirect + latch release.

**Incidental cure (recorded):** AppShell.test.tsx's `stubLocation`
inherited the previous test's redirected stub (`window.location.href`
read at call time), making later redirect `vi.waitFor`s pass vacuously
and race the fetch chain — a pre-existing order-dependence that my
seam's extra microtask hops flipped live. Fixed by capturing the
pristine href at module load. Diagnostic: the ORIGINAL test file also
failed against the new source in full-file order while passing with
`-t` isolation.

**Ledger:** both def-lines flipped to implemented (house syntax, this
attempt); implement census-claim comment appended (post-merge 247/0/780)
per the newest-claim guard interlock; zero ids minted.

**Verification (focused battery):** check-types rc=0 (all 3 programs);
targeted web suites 170/170 incl. App.test.tsx (impacted importer);
roadmap guards 9/9; census healthy; eslint ROADMAP.md rc=0 (web/ is
wholly excluded from root lint by design — eslint.config.ts global
ignores; check-types + vitest are the web gates). Full `pnpm test`
(build:web + server suites) reserved for full_tests.

## Pre-review cycle outcome (compound f432a909, 2026-10-09)

Validation outcomes consumed verbatim from the recorded PhaseResults — nothing re-run at compound.

- **targeted_tests (d330b19c)**: engine-mapped scope for the run's single changed testable
  surface `src/listener/store.ts` (ff-absorbed from the mid-run 364272b→88e423a base advance —
  NOT a batch edit) — 5 listener/snapshot suites, 59 tests, rc=0; digest re-derived through the
  engine and matched the dispatch value byte-for-byte.
- **full_tests (d8a32ae9)**: verbatim `github_ci_validate.py` first — ephemeral PR #490 sat
  check-dark its whole 3600s poll (repo-wide Actions run-creation outage since
  2026-10-09T01:59:31Z; sibling PRs #486-#493 identical) and timed out with zero check-runs; the
  script's swept-TMPDIR cleanup crash stranded `conductor/ci-base-74d24365772a`. Supervisor
  approved (17:07Z) the standing outage cure: all six Main-workflow jobs content-identical
  locally — lint rc=0, impeccable@3.2.1 `[]`, check-types rc=0, `pnpm test` 65f/2478t root +
  33f/1223t web, actionlint 1.7.12 container rc=0, 48-module strip-only import loop rc=0.
  Runner confirmation + stranded-ref cleanup ride the first authorized push-gate turn after
  recovery (see report `delegate/d8a32ae932884ead8d63aca64c3d82be-report.md`).

### Prevention rule minted this cycle (KTD13)

The implement fold of attempt `a0a3066e` was rejected SOLELY for a missing
`validation_evidence.changed_surfaces` attestation. Prevention: before emitting any fix/test-bearing
PhaseResult, derive the attestation through the engine's own code first-hand —
`changed_surfaces(run.workspace_base_sha, worktree)` from the live engine module — and declare
exactly its executable subset. Run rows live in the campaign `conductor.db`
(`workspace_base_sha` column); the classification that matters: `web/**` and `test/` singular are
NON-executable, `src/`, `tests/`, `scripts/`, `.github/workflows/` prefixes are executable. A
mid-run ff base advance inflates the delta vs the stale dispatch base — the executable subset can
name a file the batch never authored (here `src/listener/store.ts`); declare it anyway.

### Next-cycle leads (pre-review context, in priority order)

1. **rm-163 / rm-501 landing** — both fully implemented and validated in this tree; nothing
   remains but the landing pipeline (gated by the Actions outage) and post-landing guard pin /
   census confirmation.
2. **rm-778 sweep after recovery** — the outage cohort keeps growing the stranded
   `conductor/ci-*` base-ref census; sweep only once the pipeline creates runs again, or each
   ephemeral validation strands more.
3. **vite 8.3.4 minimumReleaseAge window** (ext #31) — crossed 2026-10-09T12:07Z; opener
   available for the next dependency-batch selection.
4. **rm-157 deferred display half** — deploy-gated on the infra gateway pin actually moving to
   v0.118.2+ (research: pin bumped 2026-10-07 but the last Deploy Gateway run is 2026-09-21 —
   undeployed); recheck before spending a batch.
5. **2026-10-13 rm-252 absorb-window decision** — per ext #31; the standing read-only invariant
   disposition governs.
6. **rm-313 full-tree actionlint cleanup** — one un-actionlinted workflow file remains (main.yaml,
   node-20 runners); rides a workflow-touching batch.
