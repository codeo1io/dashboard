---
module: dashboard
tags: [repository-maintenance, cycle-2, compound, rm-1490, rm-1491, rm-1492, rm-1447]
problem_type: maintenance-compound
---

# Repository-maintenance cycle 2 — compound record (2026-10-18, run 65d56bdd56d1)

Pre-review compounding of the whole cycle: assess `95fbf000` → research `8dd61fad` →
roadmap ext #41 (`17b297d2`, mints rm-1490/rm-1491/rm-1492 above the all-lineage
unlanded def-line frontier rm-1489; census 252/0/rm-1492) → prioritize `4234494e` →
stewardship `f7141973` → implement `850bd9f5` → targeted_tests `0a098bd7` →
full_tests `164f3320`. Nothing was re-validated at compound; every outcome below is
consumed from the recorded typed results and logs.

Attempt-death ledger (provider-instability context, first-hand from event logs):
compound `365902a4` died at ~35s (message_count 3, session_reaped; envelope absent;
ROADMAP.md mtime 2026-10-17T03:21:42Z predates its window and the tree census is
otherwise exactly the implement batch + the pairing cure) — nothing adoptable, this
phase redone from scratch. Earlier in the run: assess `591a9183` and roadmap
`dacfb311` (both dead before any work; redone and declared in their artifacts);
implement itself was an adoption — prior attempt `850bd9f5` COMPLETED the batch
2026-10-17T17:40:30Z and was re-dispatched only for a missing changed-surfaces
attestation, custody proven by mtime forensics with zero drift since; full_tests
`7dede7ac` was reaped, and its pairing-cure residue in `scripts/release-paths.ts`
(mtime inside its window) was adopted and re-verified. Forensics-then-adopt-or-redo
held throughout; the completed-but-un-ingested transport artifact recurred at
implement exactly as the standing engine-level warning predicts.

## Cycle outcome (compounded)

Batch `operator-runtime + monitoring correctness polish` (4 units, src-only, no
workflow/lockfile churn in the batch itself), implemented at base `9fead352`.
origin/main raced `55086dd` → `c01946e` → `edf948de` during the run; all three
defect sites were re-verified against main's tree before implementation —
`src/server.ts` drifted 67 lines via run `8fd22b8b`'s landing but the `'./public'`
hazard survived in refactored shape (`createPublicStatic('./public')` at main
:1207), and the other two files were drift-free base..main.

- **U1 `rm-1490`** (reliability, LEAD) — the operator `/public` asset root no
  longer resolves against process CWD: `resolveOperatorPublicRoot()`
  (`src/server.ts:533`) returns `process.env.DASHBOARD_PUBLIC_ROOT?.trim() ??
  fileURLToPath(new URL('../public', import.meta.url))` — the URL spelling (not
  bare `import.meta.dirname`) resolves identically under node native-TS and the
  vitest transform; every `serveStatic` root and the `operatorRuntimeCaching` join
  consume the resolver; the etag `statSync` catch logs instead of silently
  no-op'ing; README gains the `DASHBOARD_PUBLIC_ROOT` env-table row (unset var
  falls back to the anchored root; a set-but-empty value does not — `??`
  semantics). NEW `test/operator-public-root.test.ts` pins the resolver semantics
  AND functional CWD-independence: `process.chdir(os.tmpdir())`, build the app,
  fire a request from the moved CWD, restore in a `finally` — safe under the
  pinned vitest 4 default forks pool (one process per test file, isolate on).
- **U2 `rm-1491`** (operator-experience) — platform-status description truncation
  is code-point-aware: no lone surrogate can reach the serialized monitoring DTO;
  pinned by emoji-boundary suites added to `test/platform-status.test.ts` with
  rm-1447's banner fixtures unchanged-green.
- **U3 `rm-1447` rider** (no def flip — the landed def's F6 residual) —
  `fetchJson` folds `If-None-Match` revalidation into its
  `ConditionalFetchOutcome` (`src/github/platform-status.ts:117-139`) backed by a
  `PlatformStatusEtagMemo` (per-endpoint stored body + ETag, :77-87) with
  `resolveMemoizedBody` reusing the stored body on 304 (:144): the
  2-unconditional-GETs-per-60s behavior no longer exists on this tree. Read-only
  invariant untouched (a conditional GET is still an outbound GET); fail-open
  semantics preserved.
- **U4 `rm-1492`** (reliability, LOW/CPU-shape) — SSE buffer byte accounting is
  incremental: `utf8ByteLength` helper (`src/gateway/operator-sse-reader.ts:118`)
  plus per-chunk accumulation carrying junction deltas and a matching release-side
  decrement (:628/:647); no full-buffer re-encode remains inside the chunk loop;
  the 1MB cap semantics and CRLF normalization pinned unchanged by the
  exhaustive-equivalence / cap-boundary / release / source-invariant suites added
  to `test/operator-sse-reader.test.ts`.

Validation chain (consumed, not re-run): targeted_tests `0a098bd7` green on the
engine-mandated selector executed verbatim (`run_repo_impacted_tests.py --repo .
--mode fast --jobs 8 --` the three src files; 27 impacted suites across the
covered sets) + static eslint leg rc=0, digest bookends
`validation:v1:3465a143…` == dispatch pre AND post; full_tests `164f3320` green on
the verbatim `github_ci_validate.py --repo .` (release `920b06fa`) — rc=0, ok:true,
ephemeral PR #945, commit `95bd8e53` on validation base `e9253b07`, Test / Lint /
Design Check / Check Types / Check Workflows / Test Scripts Load + Dependency
Review all SUCCESS, Fro Bot SKIPPED (workflow `disabled_manually` by design, in the
validator's pass buckets), digest bookends `validation:v1:8ae55d6b…` == dispatch.
The two stamps differ by exactly the pairing-cure entry added to
`scripts/release-paths.ts` between the phases (the `scripts/` prefix is
executable-class), each phase's bookends holding against its own dispatch stamp.
Pre-flight legs recorded by full_tests: install/check-types/lint/full local battery
(67 files / 3171 tests) + web leg (34 files / 1221 tests) + the new-suite
supplementary legs, all rc=0; cleanup verified (PR closed, no stranded
`conductor/ci-*` refs, temp clone removed, no repo-local `.pnpm-store`).

## Pairing cure (the batch's one workflow-adjacent file)

main's `release.yaml` `on.push.paths` gained `scripts/gzip-static-sidecars.ts`
after this run's base, so the should-release corpus-parity test reds on
github_ci_validate's mixed validation tree — workflows wholesale from CURRENT
origin/main, every other file from the run base — regardless of candidate code
(`git diff HEAD..origin/main -- .github/workflows/release.yaml` = exactly that one
path gain; sibling corroboration PR #941's Test check failed the same suite).
Cure: a `WORKFLOW_TRIGGER_ONLY_PATHS` entry in `scripts/release-paths.ts` —
trigger-only, NOT HARD, because HARD would demand parity with a path the
base-era workflow filter lacks; no HARD/trigger-only disjointness leg exists, and
at integrate main's own corpus entry wins wholesale. Prevention rule documented
at
`docs/solutions/workflow-issues/should-release-parity-mixed-tree-main-drift-2026-10-18.md`;
in-code rationale at `scripts/release-paths.ts:49-57`.

## Ledger deltas made at compound

- def-line flips: rm-1490/rm-1491/rm-1492 `candidate` → `implemented 2026-10-17
  (run 65d56bdd cycle:2 implement 850bd9f5, pending review/landing …)`, mint
  provenance preserved inside each parenthetical (frontier rm-1489, main ceiling
  rm-1453 @55086dd, the per-def unownership greps). Zero mints, zero other flips;
  the landed flips stay reserved to landing verification per house rule.
- compound riders appended to the three minted defs' evidence lines and to
  rm-1447's evidence block (F6 residual discharged pre-landing; def status
  untouched).
- compound tail comment added after the prioritize-selection comment; census
  unchanged: 252 defs / 0 dups / max rm-1492; every appended prose line stays
  under the rm-284 4000-char paragraph guard.
- untracked riders of the landing: `test/operator-public-root.test.ts` (from
  implement), this cycle record, the mixed-tree prevention-rule doc.

## Reusable lessons recorded this cycle

1. **Mixed-tree corpus pairing** (NEW prevention rule):
   `docs/solutions/workflow-issues/should-release-parity-mixed-tree-main-drift-2026-10-18.md`
   — a main-side `on.push.paths` gain between a run's base and its full validation
   reds should-release parity on the mixed tree by design; diff the workflow
   against origin/main FIRST, cure via `WORKFLOW_TRIGGER_ONLY_PATHS` (never HARD
   from a base that lacks the file), and pre-check with the engine's validation
   clone preparation before re-running the gate.
2. **Static roots anchor or override, never bare-relative** (pinned by
   `test/operator-public-root.test.ts` + the README row): any future server
   static-serving root must resolve at the module's own directory or ship a
   documented `DASHBOARD_*` env override — the CWD accident 404s silently from
   any non-repo-root CWD while everything else serves fine.
3. **User-visible copy truncation is code-point-aware** (pinned by the rm-1491
   boundary suites): a UTF-16 `slice(0, N)` can split a surrogate pair. Census at
   compound: the remaining `.slice(0, N)` hits in `src/` are structural only (SSE
   buffer surgery in `operator-sse-reader.ts`, hex digest cuts at
   `server.ts:1241` / `listener.ts:51` / `auth.ts:75`, the ASCII XFF cap at
   `server.ts:867`) — none truncates user-visible copy.
4. **Incremental byte accounting in accumulating-buffer loops** (pinned by the
   rm-1492 suites): re-encoding the whole held buffer per chunk is quadratic and
   duplicates the boundary scan; carry counts with junction deltas and match the
   release-side decrement.
5. **Dead-attempt residue is adoptable only through verification** (process
   note, recurring): this run adopted implement `850bd9f5` (completed,
   un-ingested envelope) and full_tests `7dede7ac`'s pairing-cure residue, both
   only after mtime/census/HEAD forensics; compound `365902a4` died before work
   and was redone cleanly. Never adopt by trust, never redo without the trail.

## Next-cycle candidates + preconditions (concrete, ordered)

1. **Landing verification of this batch** — first action: rm-1490/rm-1491/rm-1492
   flips to landed on origin/main, `.conductor` untrack check after merge
   (standing trap), and `scripts/release-paths.ts` union check (main's own corpus
   entry for `gzip-static-sidecars.ts` wins; our trigger-only entry folds away).
2. **rm-1451 action re-pin sweep** — the standing RUNNER-UP (checkout v7.0.1,
   setup-node v7.1.0, upload-artifact v7.0.2, app-token v3.3.0,
   dependency-review v5.0.0, trivy v0.36.0, pnpm/action-setup v6.1.0 …). Actions
   is live again (CodeQL run 38989241664 SUCCESS, 2026-10-17); dedicate a cycle
   once main's workflow surface stabilizes — it carries fleet validation-collision
   appetite (every workflow edit re-triggers the mixed-tree pairing class).
3. **rm-1482 + rm-1481 sibling lanes** — darkness-watch hardening (owed-condition
   precision, fetch timeout, run pagination) and lockfile-guard restoration stay
   sibling-owned unlanded; next assess re-reads their lane state and reconciles
   by content, never by id.
4. **rm-252 absorb decision** — window re-trued at 27 unabsorbed (upstream tip
   `8d867b9b`; #643 finished-run replay + #644 `@hono/node-server` new past the
   2026-10-15 rider). BINDING gate stays the gateway-estate verdict: deployed
   v0.119.2 speaks contract 1.9.0 == the fork pin and `operator-stream.js:1022`
   fail-closes on mismatch — absorb only with, or explicitly behind, an estate
   bump. The agent re-pin v0.122.3 is internal-deps-only and low-risk.
5. **rm-142 playwright patch-class 1.64.1 lockstep** — low urgency; ride the next
   visual-baseline-touching batch if one exists.
6. **rm-102 `@opencode-ai/plugin` 1.19.0 → 1.19.3** — post-integrate
   lockfile-only (this base carries 1.18.35; a from-base bump fold-conflicts with
   main's 1.19.0).
7. **rm-143 scorecard re-scan** — blocked on the public-API 404 clearing;
   schedule together with the posture-row edit.
8. **rm-139 Node-26 gate (2026-10-28)** — falls inside the next cycle's window
   per the rm-1449 rider; open the validation window in that cycle's assess.
9. **NOT ours to re-take:** any mint at or below rm-1492 (this lineage's ceiling;
   next free rm-1494) without re-probing the all-lineage def-line ceiling —
   sibling run-74d2adff has already minted rm-1493 on its own wall.

## Integrate obligations (fresh at compound, 2026-10-18)

- Ledger delta vs main: ext #41 comment + prioritize selection comment + compound
  tail comment; three minted defs with flips + compound riders; rm-1447's
  compound rider.
- Batch files: `src/server.ts`, `src/github/platform-status.ts`,
  `src/gateway/operator-sse-reader.ts`, `test/operator-public-root.test.ts` (new),
  `test/platform-status.test.ts`, `test/operator-sse-reader.test.ts`,
  `README.md`, `scripts/release-paths.ts` (pairing cure — trigger-only entry),
  `ROADMAP.md`, this record, the prevention-rule doc.
- `src/server.ts` folds against main's refactored `createPublicStatic('./public')`
  shape — union by content; the hazard cure applies to the landed factory form,
  and the resolver must survive that union (assert at landing: no `'./public'`
  literal remains on main's side of the merge result).
- Post-merge: `git ls-files .conductor` must end empty (standing landing trap).
