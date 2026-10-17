# Dashboard cycle record (compound) — 2026-10-17, repository-maintenance cycle:4

Conductor run 9d5c156d444f431cac6fed15fa63ba82 (campaign
repository-maintenance:2a33b314687a4d468c2a9c6f79e1ef8d, cycle:4). Composed by
the compound phase, attempt e9f0a8a9616a45b381dccc8cee95eb2a (reaped by a
provider 429 at +977 s after fully writing the docs and ledger riders), then
forensically verified and completed by attempt
b7fbf4d6d7ed4752ba6609d82d6fdd74, which adopted the finished worktree work
after re-probing every checkable claim live (origin/main tip and census, the
def deltas, the moved-file set, artifact presence). Built from
already-recorded cycle evidence only — assessment, research, roadmap,
prioritization, stewardship, implementation, targeted and full-validation
outcomes. No test or validation command was executed in the compound phase;
review and shipping outcomes happen after it, and cycle:5's assessment carries
them forward. Batch base: 3e3664c. Tree at compound close: HEAD 3e3664c with
25 modified + 55 untracked entries — the 75-entry implement batch plus the
full_tests prose-residue fix (23 M + 53 ??) plus compound's own four files
(2 M: the cycle-3 docs-truth annotations; 2 ??: this record and the lesson
doc); compound touched only docs and ledger annotations.

## Phase chain, with prior-attempt forensics

- **assess 2ff9aff3** — SUCCEEDED first attempt. Fresh adversarial gates at
  3e3664c (check-types green, 4281 tests green, lint red with 50 ROADMAP-only
  errors) plus the headline discovery: a 53-file silent adoption-collateral
  drop with six content-level feature losses, mechanics proven by cat-file
  presence matrix (base 364272b has the files, the p1 adoption lineage toward
  5d5f9be deleted them, p2 06396b4 kept them, first vanish at merge 88e423a
  whose both parents had them).
- **research 7364f33f** — SUCCEEDED. Five evidence-backed candidate families
  against live sources (GitHub API + npm registry, 2026-10-15). Primary: the
  upstream absorb window 2026.10.26 to 2026.10.35 — fork floor 2026.10.25
  (adopted at a385ca5), upstream ten releases ahead at tip 2026.10.35
  (published 2026-10-15T13:44Z), operator contract 1.9.0 to 1.11.0 via
  upstream pull 619, gateway v0.122.3 latest, deployment dependency recorded;
  plus a full dependency-version battery (typescript 7.0.2, vitest 5.0.4,
  vite 8.3.4, eslint 10.12.0, playwright 1.64.1 and more).
- **roadmap bcf66a14** — SUCCEEDED (redo: prior attempt 24819efa was reaped
  at ~10 min with 11 events and no typed result; its partial ledger diff was
  the only durable work and was adopted and completed). Minted rm-857
  (96.0), rm-858 (80.0), rm-859 (34.0), rm-860 (10.0) as a +20-line uncommitted
  ROADMAP diff; census 241 defs / 0 dups, lint stable at the assess baseline.
- **prioritize a66b3d94** — SUCCEEDED. Selected the cycle-4 batch over the
  241-def ledger: LEAD rm-857 (curated adoption-collateral restore) + rm-860
  (logPersistProblem structural-key reservation) + rm-482 (fail-closed push
  idempotency rider; pre-batch open Math.random/Date.now fallbacks proven at
  operator-launch.js:75-76 and operator-stream.js:2747/:3083). Recorded a
  live id-collision finding: a parallel sibling campaign's spool claims
  rm-857..rm-861 without ever applying them to main.
- **stewardship e10c71cf** — SUCCEEDED. Structured stewardship request, no Git
  topology chosen (campaign convention), the batch split into eight
  digest-safe change units; every cited surface re-verified live at 3e3664c.
- **implement df78c2fc** — SUCCEEDED as an attestation redelivery. The work
  was fully composed by completed attempt 2f245515 and verified by dfbb4c37,
  but both results were fold-rejected (KTD13, instances three and four in one
  run) for omitting validation_evidence.changed_surfaces; the attestation
  attempt changed no content, re-derived the 75-surface declaration
  (testable 5), and re-ran every focused gate first-hand: 9 guard/test files
  161/161 green, check-types exit 0, eslint 0 errors on the 31 touched
  surfaces, census 241 defs / 0 dups / max rm-860. Attempt 8804df36 died to a
  429 provider blip with no work.
- **targeted_tests 5b80fc26** — SUCCEEDED. The verbatim engine impacted-tests
  command over the five changed testable surfaces, RC=0; actionlint container
  form clean over the restored workflows; engine changed_surfaces persisted
  (75 surfaces); dispatch digest carried verbatim per the emission-time rule.
- **full_tests 939aff96** — SUCCEEDED (redo: prior attempt 6d710490 reaped at
  ~4 min, no typed result, worktree arrived intact so nothing was adopted).
  Six-job local Main mirror at base 3e3664c under the account-level Actions
  outage (newest run repo-wide 2026-10-09T01:59:31Z; PRs 753/759 opened
  checkless). First run caught ONE real regression: the restored guard tests
  tripped prose-residue (22 offender lines) — cured convention-exactly by
  restoring the 06396b4 EXCLUDED_FILES entry verbatim plus one line for the
  new union guard (+2 lines). Final: root 65 files / 3108 tests + web 35
  files / 1233 tests, 0 fail; lint rc=0 after the full ROADMAP cure (+72/-50:
  the 47 trailing-whitespace lines and 3 label-ref errors at HEAD, trailing
  grep now 0); check-types green; digest
  validation:v1:f2b0c1ad590e807a4d2f13a502a15977e6b053a3ecc2834b32924c51674377ed.
- **compound e9f0a8a9 → b7fbf4d6** — this record (two redos before it stood:
  attempt 9413c6e4 died to a provider output-limit truncation at +234 s — two
  failed phase-result repair turns, no typed result; a find -newermt sweep
  over the worktree proved zero file writes in its window, so nothing was
  adoptable. Attempt e9f0a8a9 then fully composed this record, the lesson
  doc, the ledger status flips and riders, and the two cycle-3 docs-truth
  annotations — but was reaped by a provider 429 at +977 s before writing its
  typed result, the finished work sitting in the worktree. Attempt b7fbf4d6
  ran the forensics, verified every checkable claim live and adopted the
  work, correcting three inaccuracies it found: the local-mirror recipe doc
  was tracked at HEAD throughout, so not restored by this batch; the merge
  count past base is 15 commits / 7 merges, not five; and the close-of-phase
  tree census had omitted compound's own four files.)

Provider-infrastructure deaths consumed five attempts across four phases this
cycle (roadmap reap, implement 429, full_tests reap, compound truncation,
compound 429). In every case the forensics rule held: typed results and event
logs were read first, adoptable work was separated from transport artifacts,
and redoes started from an intact worktree rather than repeating finished
work — the compound 429 is the sharpest instance: sixteen minutes of finished
composition were recovered from the worktree with zero redo.

## Batch recap (selected at prioritize a66b3d94)

- LEAD **rm-857** — curated adoption-collateral restore: 53 whole files (49
  adopted byte-identical to 06396b4, three documented re-derivations — the
  dual-spelling read-only-invariant guard union, roadmap-integrity-guard,
  operator-contract-window — and one NEW file, test/landing-merge-union-guard,
  the root-cause guard) plus the six content-level feature losses restored
  into surviving files, each hunk reconciled against upstream drift, never a
  blind revert. Riders: the lint/docs-truth clauses (see below), endpoint
  README parity.
- **rm-860** — logPersistProblem structural-key reservation (payload keys
  colliding with path or error are suffixed -payload) pinned in
  test/snapshot-store.test.ts.
- **rm-482** — fail-closed push idempotency: mintSecureIdempotencyKey exported
  at public/operator-stream.js:322, consumed at :2757/:3094, the operator-launch
  fallbacks removed; verified non-regressed at compound by grep.
- Riding ledger mint rm-857..rm-860 (+20 lines) from the roadmap phase.

## Cycle outcomes recorded 2026-10-17 (pre-review)

- Status flips in ROADMAP.md: **rm-857, rm-860, rm-482 → implemented
  2026-10-17, validated pre-review, pending the cycle-4 landing**, each with a
  dated parenthetical naming its validation closure (attempt lineage, targeted
  RC=0, six-job mirror numbers, digest). rm-858 and rm-859 stay in_progress —
  unselected this cycle; rm-858 carries a compound rider comment naming it the
  standing cycle-5 lead with this cycle's research truth.
- Riders completed by compound (docs-only, digest-neutral by construction —
  docs surfaces stay outside the validation digest hash): the rm-857
  docs-truth supersede annotations (2026-10-10-cycle-3-batch-run-e5b718478274
  rm-779 row; 2026-10-09-repository-maintenance-cycle-3-batch-run-d8fdf8b79ad5
  claimed-and-excluded bullet and cycle-4 entry-points bullet), and the rm-675
  emitter-obligation extension to bracketed def-prose literals. The repo-side
  rm-802 backtick wrap was already in place from the full_tests ROADMAP cure,
  which cured all 50 pre-existing errors, exceeding the lint rider's 2.
- Validation outcomes were consumed as recorded; nothing re-run. The worktree
  at compound close is byte-stable against the full_tests end state plus this
  phase's docs/ledger edits only.

## Lessons codified this cycle

- NEW prevention rule:
  docs/solutions/workflow-issues/landing-merge-adoption-collateral-silent-file-drop-2026-10-17.md
  — the silent-deletion merge mechanics (a file untouched since base on the
  keeping side deletes without conflict), the cat-file presence-matrix and
  comm/ls-tree detection recipes, first-vanish bisection with --full-history,
  the zero-ref grep battery, restore discipline (reconcile against drift,
  one canonical guard spelling, exclusion and docs-truth riders), and the
  union guard as the durable fix.
- KTD13 recurrence: two fold rejections in one run (2f245515, dfbb4c37) for
  the same missing validation_evidence.changed_surfaces; the attestation
  cure (prove the work intact, re-derive the declaration, declare it) is now
  twice-proven — see
  docs/solutions/workflow-issues/phase-result-validation-evidence-missing-implement-fold-rejection-2026-10-07.md.
- Restored-guard coupling: every restored guard suite that names its own
  terms needs its prose-residue EXCLUDED_FILES entry in the same batch — the
  full-suite run, not the focused run, is what catches this.
- Docs-only digest stability re-proven: the roadmap mint and the ROADMAP lint
  cure both left validation:v1:f2b0c1ad unchanged through full_tests; this
  compound's docs edits ride the same property.

## Next-cycle entry points (cycle:5)

1. **rm-858 absorb window (LEAD)** — upstream 2026.10.26 to 2026.10.35, core
   operator contract 1.9.0 to 1.11.0 (waiting runs, notification jumps).
   Probe the deployed gateway estate FIRST (the deployment dependency in the
   acceptance): the contract surfaces are live-useful only against a gateway
   speaking 1.11.0. rm-252's standing decision composes with this item; the
   read-only invariant stays absolute (never absorb write-capability
   surfaces, per AGENTS.md).
2. **rm-859 dependency-major pass** — the research battery holds the current
   truths (typescript 7.0.2, vitest 5.0.4, vite 8.3.4, eslint 10.12.0,
   playwright 1.64.1); rm-271's acceptance names the floor set.
3. **Actions darkness standing item (lifting)** — newest run repo-wide
   2026-10-09T01:59:31Z at the full_tests probe; PRs 753/759 opened with no
   checks. The six-job local Main mirror is the compensating control (recipe:
   docs/solutions/workflow-issues/actions-account-disable-fulltests-local-mirror-2026-10-09.md,
   tracked at HEAD throughout — it was never part of the collateral drop).
   rm-100 owns gate restoration on main. Compound's own live probe adds:
   origin/main accepted a push at 2026-10-16T17:12:27Z (tip 9fead35), so the
   darkness had lifted by compound time — cycle:5 assess must re-probe run
   health before choosing between the GitHub route and the local mirror.
4. **rm-675 renderer obligations (external, pre-render gate)** — now including
   the def-prose bracketed-literal extension added by this compound. The
   2026-10-06 managed-render damage class (flattened statuses, hollow defs)
   regenerates if a managed render runs before those obligations land.

## Integrate obligations for THIS batch (live-tip facts, probed 2026-10-17)

- origin/main moved under the cycle: tip 9fead35 (2026-10-16 17:12:27Z), 15
  commits (7 merges) past base 3e3664c. The batch validates at 3e3664c; the
  landing merge resolves against 9fead35 and re-verification is the review
  gate's, not compound's.
- Ledger union by content: main holds 249 defs / 0 dups / def-line max
  rm-1452 — twelve defs this tree lacks (rm-740..743, rm-1437, rm-1446..1452)
  — while this tree's four mints rm-857..rm-860 are unminted on main (no id
  collision yet). The test/roadmap-integrity-guard.test.ts pin (currently
  860) must be re-derived from the merged-tree max in the same landing, and
  the census-truth comment re-anchored.
- Content-conflict surface: 7 of the batch's 23 modified files also moved on
  main since base (README.md, ROADMAP.md, src/server.ts, the monitoring
  quartet) — union by content, not by hunk. docs/runbooks/release.md was
  restored on main independently of this batch's identical-purpose restore —
  resolved in-tree at the 2026-10-17 review fix (independent_review F4):
  this tree's copy now adopts main's content (the rm-743 HEALTHCHECK section,
  byte-identical) and re-flips row B's recurrence-guard sentence to gates-main
  truth (this batch restores lockfile-guard.yaml), so the landing keeps THIS
  copy — the only residual delta vs main is the row-B flip itself; nothing
  is left to dedupe.
- Sibling spool claims rm-857..rm-861 remain unlanded; if any lands first by
  content, this tree's meanings own the ids on the merged wall and the loser
  renumbers by content with a fold note.
- Declare changed_surfaces EMISSION-TIME at fold (independent_review F5): implement's
  KTD13 attestation said 75, the review tree derives 80, and the 2026-10-17 review fix
  adds `.github/workflows/main.yaml`, `.github/workflows/cve-tripwire.yaml`, `Dockerfile`,
  `public/operator-stream.js`, `src/github/snapshot-store.ts`, `docs/runbooks/release.md`,
  `test/snapshot-store.test.ts` and `test/operator-stream-core.test.ts` on top — re-derive
  from the landing tree, never copy a recorded count. Review fixes riding the batch:
  F1 `fetch-depth: 0` on the main.yaml test-job checkout (the union guard needs full
  history), F2 mint-before-mutex in operator-stream.js handleCancel, F3 cve-tripwire
  NODE_IMAGE literal + Dockerfile digest repin 173f1258→7f486cab (dead digest 404,
  live tag re-probed), F6 two-pass key reservation in snapshot-store.ts — each pinned by
  a regression test.
- After the merge: `git ls-files .conductor` must end empty (landing-pipeline
  trap, AGENTS.md); re-run the zero-ref grep battery from the lesson doc —
  this landing merges an adoption-adjacent lineage, the exact risk class the
  union guard exists for.

## Mint discipline

The in-tree ceiling stays rm-860 (241 defs / 0 dups) — compound minted
nothing. Any next mint-bearing phase must re-probe the all-lineage ceiling
live (origin/main blob + conductor heads + delegate spool artifacts), never
trust the in-file max: this cycle's prioritize found the sibling rm-857..861
spool band exactly that way, and main's live ceiling is already rm-1452.
