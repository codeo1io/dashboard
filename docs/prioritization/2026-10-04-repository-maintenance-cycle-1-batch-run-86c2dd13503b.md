# Dashboard maintenance — cycle 1 batch (2026-10-04, run 86c2dd13503b467e814d074afc26246e)

- Conductor: repository-maintenance `7f70fe65cf7242a29a96dd338ce9f1e6` cycle:1
- Base: `227375247` == origin/main; worktree carries this run's ROADMAP.md mints
  (+21/-0: rm-619, rm-620, rm-621, riders on rm-144/rm-259, extension #19)
- Prioritize attempt: `6c9044b651594673b8e78cd8d33a3dbb`

## The cycle's mandate

Pick the highest-value COHERENT batch completable end-to-end this cycle without
colliding with any sibling lane. Sibling claims verified first-hand twice:
once at this run's roadmap phase (census over every worktree's actual
`git diff HEAD -- ROADMAP.md`, not self-reports) and once NOW via each
worktree's live porcelain (code-claim map, not intent):

- **2c3b4c64** (code active): rm-608 (Node-26 web-test localStorage cure,
  `web/src/test-setup.ts`), rm-609 (stale SPA shell, `src/server.ts`)
- **7a4d9070** (code active): rm-555 (/assets immutable posture,
  `src/server.ts` + `README.md` + `test/static-assets.test.ts`)
- **b528f707** (code active): rm-556/557/558 (endpoint parity +
  permissions-policy deny + multi-arch: `src/server.ts`, `Dockerfile`,
  `release.yaml`, `README.md`, `test/static-assets.test.ts`)
- **5bf98ac3** (code active): workflow lane (`.github/workflows/{base-drift,canary,visual}.yaml`)
- **38ee3e1c** (prioritized): rm-187, rm-501 (+rm-482 rider), rm-597, rm-596
- **146d73f2** (prioritized): rm-286, rm-594, rm-595, rm-596 (push-card re-entry)
- **3b584779** (prioritized): rm-617 (`src/logger.ts`) + rm-484 (SSE
  `data:`-line semantics, `operator-sse-reader.ts` + `public/operator-stream.js` parse region)
- **84860aac** (stewardship delivered): rm-614 arm(a) + rm-615

`src/server.ts` and `test/static-assets.test.ts` are each held by THREE active
code lanes; `.github/workflows/*` by one. This batch touches none of them.

## Selected batch — all three minted by THIS run (zero contention by construction)

B1 (reliability) + B2/B3 (coordinated security-posture pair). Verified this
hour: no sibling diff riders or claims rm-619/rm-620/rm-621 content (the two
rm-619 mentions elsewhere are NEXT-FREE projections inside provenance
comments; rm-620/rm-621 appear in no sibling diff at all).

### B1 — rm-619: operator runtime partial-boot leak (reliability 30.0)

This run's assess F2 — the only fresh assess finding that survived the
sibling-suppression sweep (F1 detailsUrl → 63b5848a rm-570 + 84d43fc7 rm-450;
F3 shell posture → rm-555/609 lanes). Mechanism verified first-hand:
`defaultRuntimeLoader` resets + bootstraps the stream module
(`web/src/operator/runtime.ts:304-312`), then runs three UN-wrapped awaited
stages (:314 dynamic run-index import, :474 `initOperatorRunIndex`, :484
`initOperatorLaunch`); the cleanup closure (:487-499) is only RETURNED on
success and `createOperatorRuntime`'s `.catch` (:569-572) only reports
`'unavailable'`. Any rejection strands per-card stream handles + the
`pagehide` listener (`public/operator-stream.js:2695-2697`) with
`_bootstrapCalled` wedged true (:2662) — a re-login remount can never
re-bootstrap; recovery requires a full reload.

Fix shape:

- Wrap the post-bootstrap awaited stages in try/catch that runs the SAME
  teardown sequence the cleanup closure runs (stream-owner close +
  `resetBootstrapState` + `resetLaunchState` + `resetRunIndexState`) before
  rethrowing (or hand a teardown thunk back through the rejection path).
- Red-first test: fixture `_runtimeLoader` injecting a rejected
  `initOperatorRunIndex` after successful bootstrap; assert no pagehide-listener
  accumulation AND successful re-bootstrap on a second mount.
- Happy path byte-stable: the success-path cleanup closure signature and
  behavior identical.

Effort: M. Files: `web/src/operator/runtime.ts`, `public/operator-stream.js`
(bootstrap region only), one NEW web test file. No server files.

### B2 — rm-620: coordinated security-disclosure channel (security 22.0)

This run's research C1, ground truth re-verified live this run: no SECURITY.md
(`git ls-tree -r HEAD` → 0), PVRL `{"enabled":false}` (live gh api),
README:23-24 links the posture runbook but no disclosure path exists anywhere;
the posture doc (rm-143) dispositions every Scorecard sub-score yet never
names a disclosure channel.

Fix shape:

- Root `SECURITY.md`: security-relevant surface (public read-only API classes,
  listener ingest, operator OAuth session), how to report (GitHub private
  vulnerability reporting + expected-triage note), explicit out-of-scope
  (operator gateway itself → fro-bot/agent upstream; rate-limit exhaustion).
- Enable PVRL on `codeo1io/dashboard` — **the one ops decision in this batch**:
  a live repo-settings mutation via `gh api -X PUT` (not commit/push),
  reversible, and pinned by rm-620's acceptance (same call must return
  `enabled:true`). Proceed at implement unless Hermes overrides; the code/docs
  half stands alone if deferred.
- README: exactly one link to SECURITY.md in the :23-24 security paragraph —
  disjoint region from the two sibling lanes' endpoint-table-row README edits
  (merge-coexistence note, not a collision).
- Posture doc gains a disclosure row (lands with B3's refresh in one edit).

Effort: S-M. Files: NEW `SECURITY.md`, `README.md` (1 line), posture doc row.

### B3 — rm-621: security-posture.md refresh obligation tripped (docs 18.0)

This run's research C2. The posture doc's own maintenance clause (:62-67)
requires same-cycle refresh; it has tripped: live Scorecard 7.8
@2026-10-03T16:17:25Z (re-verified this run) vs headline 7.1 (2026-09-22),
Fuzzing = 10 vs the doc's "Fuzzing 0 tracked rm-144" row; live sub-10 set is
exactly Code-Review/Maintained/License/CII 0, Signed-Releases -1,
Branch-Protection -1 (check-level internal error, not a posture fact).

Fix shape: one-pass refresh — headline + date, Fuzzing row re-dispositioned
AFTER identifying the flip's cause (Scorecard detection change vs credit for
the landed fast-check server-half suites; read the run's Fuzzing reasoning —
do not close rm-144's browser half either way), table reconciled to the live
sub-10 set, cross-referenced to rm-144's 2026-10-04 rider, plus B2's
disclosure row.

Effort: S. Files: `docs/runbooks/security-posture.md` only.

## Why not the ledger's top-priority candidates (grounded)

- **rm-104 (98.0, render hygiene)** — generator/ledger-scale restructure
  coupled to rm-279's companion refactor; wrong scale for one cycle.
- **rm-279 (96.0, Lint-job decomposition)** — CI workflow restructure;
  explicitly deferred as such by 146d73f2; collides with 5bf98ac3's active
  `.github/workflows/*` edits.
- **rm-103 (85.0) / rm-252 (80.0) (upstream absorb)** — upstream UNMOVED
  (tip `c5d49b1`, agent `v0.117.1`); ridered closed-for-this-cycle today
  (a86ee3dca, 2c3b4c64).
- **rm-102 (90.0)** — in-progress, owned.
- **Fresh-but-raced findings, deliberately not touched**: operator run-index
  single-fetch staleness (found independently by sibling assesses 34f02858 +
  b3a173d4; their roadmap phases will mint rm-622 — racing them buys an
  integrate conflict); detailsUrl (rm-570/450); shell cache (rm-609);
  /assets posture (rm-555); workflows timeout-minutes (rm-603/466);
  copilot-instructions (rm-612); Node-window + ecosystem riders already
  carried by rm-139/rm-108/rm-271 riders.

## Sequencing, coexistence, gates

B1 → B2 → B3 (B3's posture-doc edit folds B2's disclosure row into one diff).

must_remain_separate pairs:

- B1's `public/operator-stream.js` bootstrap-region hunks (:2655-2712) vs
  3b584779's rm-484 SSE-parse-region hunks (~:1242-1346) — same file, ~1.4K
  lines apart; the two hunks never textually overlap; integrate order
  irrelevant.
- B1's new test file + `web/src/operator/runtime.ts` vs 2c3b4c64's
  `web/src/test-setup.ts` — different files; if rm-608 lands first this
  batch's web suite gets greener, never red.
- B2's README link line (:23-24 region) vs 7a4d9070/b528f707 endpoint-table
  rows — disjoint regions.

Gate plan (implement): red-before-green for B1's targeted new suite;
`pnpm check-types`; `pnpm lint` (changed files); full `pnpm test` with the
standing rm-548 accounting — expect exactly the base's 4 web files / 100
tests red before AND after (this batch adds a green suite only; the
`NODE_OPTIONS=--localstorage-file` recipe applies if the whole web project
runs). B2 verification is live-API (`gh api .../private-vulnerability-reporting`
→ `enabled:true`) + prose-residue/env-docs guards (SECURITY.md names no env
vars, no era terms). B3 verification is the posture-doc diff + quoted live
scorecard composition. Visual workflow: `public/**` IS in its path filter, so
B1 triggers it legitimately (operator-stream.js is served client code).

## Outcome

Recorded at implement/compound. Deferred with pointers: run-index staleness
→ sibling rm-622 mint (whichever roadmap lands first); rm-144's browser half
stays open regardless of B3's Fuzzing diagnosis; PVRL enablement is separable
from B2's code/docs half if Hermes gates the ops flip.
