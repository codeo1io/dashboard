# Repository-maintenance cycle:2 compound record — run b9c4278cf53b

Date: 2026-10-18. Requirement: `repository-maintenance:1f463c9c1bf3422789a9cb1865f036f7:cycle:2`.
Compound attempt `4a3fee8a21c84c6fbb3376832f376fd1`. This record consumes pre-review cycle
evidence only; review and shipping outcomes happen after this step.

## Batch (selected at prioritize 7bd45550, implemented at 65f3f900, salvage f9c8f0b4)

**"Verification truth on the post-absorb base"** — two legs:

1. **vi.waitFor explicit-timeout hardening** — every `vi.waitFor` site under `web/src` now
   passes `timeout: 5_000` (live census 105/105: stream-reattach 63, AppShell 15,
   runtime.test 12 incl. the proven-flaky `ready()` helper, approval-click 8,
   question-region 5, sign-in-recovery 2) plus node-side guard
   `test/web-waitfor-explicit-timeout-guard.test.ts` that fails on any new implicit-budget
   `waitFor`. Root cause class: `vi.waitFor` keeps its own 1000ms default that
   `web/vitest.config.ts`'s `testTimeout: 30_000` does not cover; observed live as 4
   load-correlated red tests (host load 56–64) in the suite landed <24h earlier.
2. **CI design check → impeccable v4** — `main.yaml` pin 3.2.1 → 4.6.0 (npx-exact),
   `web/privacy.html` declares role sizes (cures v4 `flat-type-hierarchy`: body/h1/h2 all
   16px, 1.00:1 vs 1.25:1 target), `.impeccable/config.json` ignoreValues honored under
   4.x (verified with a deliberate brand token), `.opencode/impeccable` suite 31/31 under
   4.x, AGENTS.md guidance updated in the same change.

## Verification (pre-review, recorded — not re-run at compound)

- targeted: `run_repo_impacted_tests.py --mode fast --jobs 8` over the 14 engine-derived
  surfaces → **37 files / 3016 tests green** (attempt 669d03a9).
- full: `github_ci_validate.py --repo .` → ephemeral PR **#967** all-green, `ok: true`
  (commit `9bece8e6`, 7× SUCCESS, Fro Bot gated SKIPPED) (attempt dbaa2cf2 lineage).
- During full_tests, the engine-materialized absorb of main's sidecar slice
  (`release.yaml` + `scripts/release-paths.ts` + `scripts/gzip-static-sidecars.ts`,
  byte-identical to main) cured the #19135-class pre-corpus parity red (injected
  `paths:` entry vs a base predating the release-paths corpus). Cure pattern documented in
  `docs/solutions/workflow-issues/design-check-impeccable-4-6-0-v4-migration-2026-10-18.md`
  and the ephemeral-CI lesson below.

## Ledger mapping

Roadmap outcome defs minted spool-side against live main: **rm-2027** (waitFor
hardening) and **rm-2028** (design-check v4), superseding the collided ext#47 fog
band rm-1501..rm-1506 **by title** (band collided across sibling lineages; ids are
not stable across the fog). Originally composed at `4a3fee8a` against `655bfe50`
(287 defs / ceiling rm-1483); **REGENERATED at review-fix `34460f05`** (review
`177ee4bf` NEEDS_CHANGES — the original postimage's supersede notes left the
collided ids unmarked under the render-guard's fog exemption, and its per-file
waitFor census summed 106) against live main `55aedc97` (291 defs / ceiling
rm-1485, post-census 293 defs / max rm-2028). Corrected deliverables:
`delegate/ROADMAP-postimage-b9c4278c-34460f05.md` +
`delegate/compound-delta-b9c4278c-34460f05.patch` (git-apply verified; guards run
LIVE on the swapped-in postimage: render + length + integrity **15/15** and
`eslint ROADMAP.md` rc=0, then ROADMAP.md restored byte-identical). The
regeneration also fog-marks one pre-existing dangling ref on the composition base
itself (`rm-1016` inside the rewrapped extension-#44 tail comment, exposed by the
cycle:4 landing; c02f90dc was clean) per the guard's own dead-lineage remediation
— the minimal cure that lets the postimage pass the guard census unchanged.

## Next-cycle candidates (evidence-backed)

1. **snapshot-store shape-validation hole** (assess F2): `src/github/snapshot-store.ts`
   `isValidSnapshotShape` lacks the `platformStatus` leg added by rm-1447 — corrupt cache
   values pass validation and egress raw via `/api/status`; client impact bounded by
   `web/src/api/monitoring.ts` re-parse. Unledgered on main; a sibling run's unlanded
   claim exists — reconcile by content.
2. **gateway-session listener-ack gap** (cross-lineage, assessed run bfa6eefccfb1; spool
   repro `bfa6eefccfb1-gateway-listener-ack-repro.ts`): with `DASHBOARD_OPERATOR_LOGIN`
   unset on the gateway branch, listener ack CSRF is null → GET `/api/listener/csrf` 503 /
   POST ack 403 forever; UI swallows ack failure silently. Unledgered at 655bfe50.
3. **markdown-render port** (upstream #646): fork's first markdown-it dependency —
   exact-pin posture; read-only-safe display surface; port to React, do not cherry-pick.
4. **fleet housekeeping**: recurring external `node_modules` wipes in conductor worktrees
   (3× this run — a pre-validation `pnpm install --frozen-lockfile --prefer-offline` guard
   would absorb them) and a `gc.log` too-many-unreachable warning in the shared admin dir.
5. **fog arithmetic for the next mint**: spool ceiling rm-2026 (lineage 6ec8de1a cycle5),
   sibling dirty walls rm-2009, contested rm-2008..2010 band, main ceiling rm-1483 —
   mint above rm-2026 after a live four-source re-probe (main / worktrees / spool /
   origin conductor refs).

## Lessons (durable)

- Dispatch-time validation digests are not locally reproducible when they cover untracked
  build content (`web/dist`): derive via the engine's `validation_policy` at the
  engine's base, document the command, and let the fold arbitrate.
- `/tmp` scratch on this host mutates externally (two mid-phase incidents this run, plus
  three `node_modules` wipes): compose single-shot from git blobs straight to the durable
  delegate spool.
- Ephemeral-PR validation on a base older than main's latest corpus can redden the
  workflow-paths parity guard by INJECTION, not by candidate drift — the cure is a
  byte-identical absorb slice, never a guard loosening.

## Review-fix record (attempt `34460f05`, 2026-10-19)

Review `177ee4bf` returned NEEDS_CHANGES on the compound deliverables only (the
code change itself was verified sound: 105/105 waitFor timeouts, guard canary,
impeccable 4.6.0 rc=0). Dispositions:

1. **Fog-marker form (HIGH, FIXED)** — the swept 4a3fee8a postimage cited the
   collided ext#47 ids as `fog id rm-1501 (band rm-1501..rm-1506 …)` / `fog id
   rm-1505`; `fog id rm-NNN` does not match the render-guard's `FOG_MARKED_RE`
   (`fog[ (]*rm-NNN`, slash-runs), so the bare ids dangled (guard 14/15).
   Regenerated postimage fog-marks them; guards now **15/15 live**.
2. **Census arithmetic (LOW, FIXED)** — `runtime.test 13` was the paren-less
   grep count including a prose comment; live call sites are 12. Corrected here
   and in the minted rm-2027 acceptance line (63+15+12+8+5+2 = 105).
3. **Batch doc `plugin.test.ts 33/33` (LOW, DEFERRED TO LANDING)** — the
   2026-10-17 batch doc (tracked in salvage `f9c8f0b4`) says 33/33 at :12 and
   :43; the live suite is **31/31** (implement-phase evidence). Editing a
   tracked file without a commit is canonical-hygiene drift and `commit` is
   prohibited at review-fix, so the correction rides the landing commit:
   replace both occurrences with `31/31`.
4. **main.yaml:82 (INFORMATIONAL, NO CHANGE)** — the command's `web/src
   web/privacy.html` surface list predates the config honor; noted for the next
   `.impeccable/`-only touch, when `--config .impeccable/config.json` (and an
   explicit `--ignore-values` flag if needed) should be evaluated live first.

Composition bases re-probed this attempt: origin/main `55aedc97` (advanced past
`c02f90dc` mid-review); fog census clean for rm-2027/rm-2028 (no sibling claims,
main ceiling rm-1485). Scratch `/tmp` ghosts that misdirected earlier rounds are
avoided by composing single-shot from git blobs (house rule above).
