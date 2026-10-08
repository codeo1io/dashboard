# Repository-maintenance cycle 1 compound record — run 8521c80a2583448594f57380855a6b50 (2026-10-08)

Vehicle: repository-maintenance cycle:1, worktree at base `b658cb60` (== origin/main at
cycle open), batch payload uncommitted in-tree. Compound attempt
`6124c5c2b9884465b8518ff8dd159539`, first attempt for this phase — no prior-attempt
forensics needed at compound itself. (Earlier-in-cycle forensics stand recorded: the
reaped assess attempt `f6ab7558` — zero durable work, phase redone — and the implement
fold rejection of `dfdcea6f4b32` for a prose-only changed-surfaces attestation, re-filed
as `b0426657340b4e19a1971d8964f72b99` with the structured field.)

## Cycle outcome (compounded from pre-review evidence only)

Batch 'cve-tripwire coherence + guard cross-product + entry symlink', three
change-units, all validated end-to-end. No test was executed at compound; the numbers
below are the already-recorded targeted/full outcomes, consumed as evidence.

- **CU1 cve-tripwire coherence (rm-648, rm-188 regression cured in-touch).**
  NODE_IMAGE `node:24-slim` → `node:24-trixie-slim` (:35), TRIVY_VERSION `v0.72.0` →
  `v0.75.0` (:36, release-notes gate passed), runs-on `ubuntu-latest` → `ubuntu-24.04`
  (:40); NEW `test/workflow-image-parity.test.ts` ties every workflow node:24 tag to
  the Dockerfile ARG tag and simulates the :54 digest-grep precondition byte-for-byte.
- **CU2 read-only guard cross-product closure (rm-649).** Six live escape shapes
  seeded red-first into BOTH guard corpora, then closure: guard A namespaces +=
  `checks|codeScanning|migrations|actions`; guard B verb family +=
  `rerequest|upload|approve|start|redeliver|default`. The `request` verb deliberately
  NOT added — see standing rule below.
- **CU3 isMainEntryPoint symlink cure (rm-702).** `src/server.ts:1667` comparator
  now realpath-canonicalizes BOTH sides; entry suite 6 → 9 cases including an
  empirical `spawnSync`-through-a-directory-symlink leg.

Validation ledger (this cycle's recorded outcomes):

- implement re-file `b0426657`: focused 5 files / 30 tests, eslint all 8 changed
  surfaces, check-types, actionlint (container form), digest-grep simulation
  resolves `sha256:173f1258…` / pre-cure tag empty — all green.
- targeted `c8eae1bb`: engine impacted-map 21 files / 749 tests green (22 mapped,
  one web target uncollected by the root vitest project) + supplementary focused
  4 files / 21 tests for the map's blind spots.
- full `eddf5c81`: `full_command` verbatim rc=0 — ephemeral validation PR #446,
  ALL 10 checks SUCCESS (Main: Lint, Check Types, Test, Design Check, Check
  Workflows, Test Scripts Load; CodeQL Analyze; Dependency Review; Lockfile Guard);
  PR closed and both `conductor/ci-*` refs deleted by the script's `finally` —
  zero residue.

## Ledger deltas made at compound

ROADMAP.md (same uncommitted delta, still zero mints):

- Validation-outcome riders on `rm-648`, `rm-649`, `rm-702` (compound-dated, marked
  'pre-review outcomes consumed — no test re-run at compound').
- COMPOUND RIDE paragraph appended inside extension #33's comment: census re-derived
  unchanged 236 defs / 0 dups / max `rm-744` (guard pin stays); sibling ceilings
  re-censused first-hand — highest unlanded mint across all conductor worktrees is
  `rm-767` above landed main max `rm-744` → **next free `rm-768`**.
- Placement repair: the implement-phase CU3 rider had been written into `rm-689`'s
  block (after the 'Pre-gate base-digest' heading); relocated into `rm-702`'s own
  block ahead of its compound rider. Content unchanged.

New artifacts: this record, and
`docs/solutions/best-practices/workflow-image-constants-track-dockerfile-arg-parity-guard-2026-10-08.md`.
Also a dated addendum in
`docs/solutions/workflow-issues/targeted-runner-blind-spots-web-config-untracked-tests-2026-10-04.md`
(third blind-spot leg — see below).

## Reusable lessons recorded this cycle

1. **Parallel image-tag surfaces need a parity guard (prevention rule, doc'd).**
   Rotating the Dockerfile base-image tag without the workflow's image constant
   following silently blinds the digest-grep precondition → deterministic red on the
   next cron. Rule + fence: best-practices doc above, backed by the parity suite.
2. **Path-equality guards must canonicalize BOTH sides.** `argv[1]` may be a
   symlinked path; comparing a canonicalized `import.meta.url` against a raw
   `argv[1]` is exactly the false-negative rm-702 cured. The empirical symlink leg
   stays as the regression fence.
3. **Guard coverage is a cross-product (namespaces × verbs), reasoned explicitly.**
   Closure extended both axes; the seeded escape corpus is re-run red-first on any
   future extension. Standing rule: `request` stays PROHIBITED as a guard-B
   write-stem (it would flag every sanctioned `octokit.request('GET …')` literal);
   write-via-request is policed by the request-literal detector.
4. **Fold gates consume STRUCTURED attestations, not prose.** The implement fold
   rejected a summary-prose changed-surfaces list; the re-file carried
   `validation_evidence.changed_surfaces` as a structured field listing exactly the
   engine-derived executable surfaces (src/ + .github/workflows/ count; test/docs/
   ROADMAP do not). Every hand-written phase-result JSON is python3-json.load
   validated before finishing — one stray brace has already cost a fix cycle.
5. **The impacted-test map selects by import edges, not batch manifests.** Third
   blind-spot leg (addendum doc'd): suites that scan a surface as TEXT via
   `fs.readFileSync` (both guard corpora) have no import edge, so modified tracked
   suites can be silently unselected alongside the known untracked-new and
   web-config legs. Batch-authored acceptance suites always need a supplementary
   focused run.

## Next-cycle candidates and context (ordered)

1. **TIME-SENSITIVE — first scheduled cve-tripwire fire Mon 2026-10-12T06:53Z.**
   Green-at-parity ONLY if this cure (or a sibling rm-755-lineage equivalent) lands
   before it; otherwise the digest grep misses and exits 1 deterministically. A red
   fire re-opens rm-648; the parity suite pinpoints whichever constant drifted.
2. **Integrate obligations for this batch** (rides ext #33): chronological rider
   union; reconcile divergent double-claims rm-745-747 and rm-759-761 by content —
   landed meanings own ids. Unlanded sibling lineages 89ebbf49 / 9fd8bcad / f266ce30
   / 788aa489 / 13de86628f15 / 392bad29b3d3 hold near-identical tripwire/guard/symlink
   work — expect union-by-content to be near-no-op for the code, contentious only in
   the ledger. Extension ordinals unlanded: #33 (this run) #34 (69b161e1) #35
   (agenttrace) #36 (392bad29b3d3) above landed #32.
3. **Visual workflow does not trigger on ephemeral validation PRs** (full_tests
   finding): the ephemeral route's coverage claim excludes visual checks by trigger
   filter. Next assessment decides: widen `visual.yaml` pull_request filters to
   `conductor/ci-base-**` or document the exclusion as intentional.
4. **Stale `conductor/ci-*` heads on origin** (rm-159): this cycle's validation added
   ZERO residue (cleanup verified first-hand); the standing count stays a hygiene
   candidate.
5. **Upstream absorb remainder** (rm-252 window): #573 (1.8.0 contract, only code
   delta) + #578 (docs); exclude wiki-write surfaces per the standing read-only
   disposition. Gateway pin v0.117.5 vs released v0.118.2 still open (rm-157 family).
6. **statSync per-request** (rm-478), **node v26 window 2026-10-28** (rm-139),
   **stale `conductor/ci-*` heads on origin** (rm-159) — point-in-time census at
   review-fix (2026-10-09): 0 heads (`git ls-remote origin 'refs/heads/conductor/ci-*'
   | wc -l`); the lineage rider records 146→76 after a past cleanup — but that 0 was
   a momentary sweep state, not a durable one: the second independent review
   (2026-10-09, e5d5da04) counted 48 sibling-lane heads back on origin (none this
   run's), so re-census at consume time per item 4 — the standing count stays a
   hygiene candidate.

## Verification (no tests executed at compound)

- `node scripts/roadmap-census.ts` → healthy (first-hand at compound).
- Live def census: ``grep -cE '^- id: `rm-[0-9]+`' ROADMAP.md`` = 236; duplicate ids = 0; max
  id rm-744 — riders only, zero mints; the guard pin (744) therefore still matches.
- Sibling ceiling census across all conductor worktrees (def-line extraction from
  uncommitted ROADMAP deltas): highest unlanded mint rm-767 → next free rm-768.
- `git status --porcelain` at compound close: the batch's 7 modified files (6
  batch surfaces + the blind-spots addendum) + the batch's 2 untracked files +
  this record + the best-practices doc (both under docs/), nothing else; HEAD `b658cb60` unmoved.
