# 2026-10-17 · repository-maintenance cycle:4 · selected batch — run c84d9094a65d

**Batch name:** input truth, client half — cap units, seam release, read-path validation, ledger line health.

**Selected by:** prioritize 0463abe27d9246f6ac41a9d753e286e2 (this phase), from this run's roadmap
mints (roadmap 2a5ca1d30c194796ad1026e1ed719495: rm-1457..rm-1460 at ROADMAP.md:1196/:1202/:1208/:1214),
this run's assess (bf711b03d7464c1490069c7feb5df0b7, F1-F7), and the adopted research
(f65cef59ca33499bb415ccbd6f112e92, R1-R4 + riders).

**Implement convention:** the roadmap extension (4 mints + 4 evidence riders, +28 lines) is already
in-tree uncommitted from the roadmap phase; this phase appends one selection rider per selected def
(spool mirror: prioritize-c84d9094a65d-0463abe2.patch, byte-identical to the in-tree delta). The
implement phase flips each member to in_progress and lands the whole run tree (this document rides
the same landing) per the standard pipeline.

## Members

| # | id | role | file set | effort | verification |
|---|----|------|----------|--------|--------------|
| 1 | rm-1457 | LEAD — byte-true SSE buffer cap in the client twin | public/operator-stream.js, test/operator-stream-core.test.ts | S+ | cap-boundary property test (astral + CJK round-trip, exactly-cap trips / cap-1 does not), :1361 assertion upgraded to units, pnpm lint + targeted vitest |
| 2 | rm-1458 | seam release — reader.cancel() on early exits + doc truth | src/gateway/operator-sse-reader.ts, its 4 test files | S | new unit tests asserting cancel on overflow + both drift exits; doc/impl direction recorded; check-types + targeted vitest |
| 3 | rm-1459 | read-path validation for listener source/severity (+ F5 logger fold) | src/listener/store.ts, src/listener/ingest*.ts (shared validator), test/listener-store*.test.ts | S | wrong-shape-cell tests per field; degradation via structured logger; full listener battery |
| 4 | rm-1460 | render-guard line-length ceiling | test/roadmap-render-guard.test.ts, ROADMAP.md (:1507/:1553 split) | S | new guard leg red-first against current offenders, then green post-split; guard vitest + pnpm lint |

## Rationale — five axes

- **Impact.** rm-1457 is the only live-client correctness defect in the fresh set: the shipped
  operator stream can buffer 2-3 MB (2-3x undercount on astral/3-byte chars) before the
  bytes-named 1 MB cap trips — emoji-laden agent output is the norm, not the edge. rm-1458 and
  rm-1459 close drift-exposure classes while they are still latent (test-only seam; read-path
  casts) — cheap now, expensive after the seam goes live or the enum changes. rm-1460 stops an
  unbounded docs-debt class (already 2 offenders >4.4k chars, grew 1→2 in one cycle).
- **Risk.** All four are additive, mechanically verifiable, and carry no schema/protocol/infra
  surface. The one soft spot — public/operator-stream.js is fleet-shared — is mitigated by the
  collision scan below (zero live claims) and by scoping the edit to the cap statement + helper,
  NOT the done-branch (that stays rm-253's).
- **Effort.** 4 x S ≈ one implement session with per-member targeted batteries; matches the
  cycle-3 precedent (3 members, one session) and the 4-file cycle-2 implement shape.
- **Dependencies.** None external. Internally rm-1457's byte helper becomes the seam rm-253's
  eventual fold reuses (already recorded in the rm-253 rider); rm-1459 completes rm-187's
  validation pattern family; rm-1460 is the render-guard's natural 4th leg (lint legs, census,
  tracks floor from rm-1454's regime).
- **Strategic value.** Cycle-3 selected the fail-closed input-truth batch explicitly "server
  half", deferring the public-twin audit as its first follow-up candidate; rm-1457+rm-1458 ARE
  that deferred duty, now concrete — the run lineage's narrative closes loop. The batch also
  fully consumes this run's roadmap mints (1457-1460), leaving zero orphaned candidates.

## Fold map (never double-implement)

- rm-1457 helper (byte count) — single site; rm-253's fold inherits it at the same seam.
- rm-1458 release helper mirrors the twin's rm-261 socket-release pattern — port shape, not code.
- rm-1459 uses the ingest-side exported vocabulary (one shared validator; rm-187's links validator
  is the pattern); folds assess F5 (store.ts:66 console.warn → logger) which was rider-tracked only.
- rm-1460's ceiling leg extends rm-1454's regime; splitting :1507/:1553 must not alter comment
  content, only wrapping.

## Excluded, with evidence

| item | why not this batch |
|------|--------------------|
| rm-253 zero-frame wire-or-fold | architecture decision (fold-class), not an implement item; its zero-frame half touches the twin done-branch (:4602-4619) — disjoint from this batch's cap-statement scope; fleet-collision check vs the 08a0abac-era thread documented below |
| rm-252 absorb (27 unabsorbed) | measurer-driven lane (rm-1453 cadence); its own merge gate; not a code batch |
| rm-1449 dep majors | owned dev-dep sweep lane; playwright 1.64.1 is a recorded anti-candidate (noble lockstep); @hono/node-server/react/@types/node@24 ride the in-flight 7708ee2a lineage |
| rm-116 protection fill | push-gated (branch-protection write) — prohibited in this run's phase set |
| rm-778 ci-ref sweep --apply | push-gated; also the rm-252 rider's estate note requires a re-census first (#521/#533 merged to validation branches, not main) |
| rm-1446 gateway estate | dependency-blocked on the deployed gateway verdict — external |
| fro-bot.yaml v0.122.2 pin, codeql-action, setup-node v7.0.0 | deliberately-deferred pin lanes; the agent pin rides the rm-252 absorb chain (rider :133), codeql family deferred by policy, setup-node rides the fog rm-1932 rider |
| rm-139 Node-26 triad | time-gated (2026-10-28), not effort-gated; rider already corroborates timing |

## Fleet collision scan (this turn)

- Live sibling worktrees (`/home/agent/.hermes/conductor-worktrees/dashboard-864ca327c8/run-*`):
  swept each for dirty claims on the four member file sets — zero hits. The 08a0abac worktree no
  longer exists; its twin-display-era batch landed long ago and rm-842's thread is not re-opened
  by any current artifact.
- Sibling spool prioritize results (grep over delegate JSONs naming
  operator-stream.js / operator-sse-reader / listener/store / render-guard as selected members):
  none. Recent selections are other bands (rm-078..087 family, rm-1549-1554, cycle-6 rm-1907
  family) on disjoint topics.
- Mint band rm-1457..rm-1460 is exclusive to this run (verified free first-hand at roadmap phase:
  file def-line max was rm-1456; sibling-documented taken ids 1461/1462/1464/1466/1467 avoided).

## Verification of this selection artifact

- Census after selection riders: 260 defs, 0 duplicate ids (grep + uniq -d).
- test/roadmap-render-guard.test.ts 4/4 green; pnpm lint rc=0 (sequential, never parallel).
- Selection delta mirrored to spool: prioritize-c84d9094a65d-0463abe2.patch — the full ROADMAP.md delta vs pristine edf948de (roadmap-phase extension + the 4 selection riders), i.e. exactly what implement/fold applies to a clean main; the selection component is the final 4 rider lines.
- Worktree state: ` M ROADMAP.md` + this new untracked doc; no other tracked file touched.

## Implement outcome (2026-10-18, attempt 425318eeedfb467d91256ff47d135f0d)

**Salvage adoption, verified — nothing redone.** The conductor preserved the reaped implement
attempt's tree as salvage commit `46bc60bc` (11 paths, content-preservation only, no validation
claim). This attempt audited every hunk against the four acceptance cards and validated the whole
batch first-hand:

- **Gates (node v24.21.0; `pnpm install --frozen-lockfile` 7.2s from the shared store):**
  `pnpm check-types` rc=0; `pnpm lint` rc=0; focused impacted battery `vitest run` over the 9
  touched-seam suites (operator-stream-core, operator-sse-reader, listener-store-degradation,
  listener-store, listener-contract.property, operator-fixture-harness, roadmap-render-guard,
  roadmap-length-guard, sse-parser.property) = **1307/1307 green**.
- **Red-first, re-proven this attempt (each reverted to its edf948de shape, expected red, restored):**
  rm-1457 units-blind `.length` cap → flood test fails `'closed' ≠ 'failed'`;
  rm-1458 pre-fix reader → 3 cancel tests red (clean-completion control + 7-byte-offset exactness
  test stay green both ways, as designed); rm-1459 pre-fix store → 3 drift tests red (no-log
  control green). Post-restore porcelain clean (byte-exact `git checkout --`).
- **rm-1458 exactness audit:** the incremental `bufferBytes` is decremented at every record split
  (`bufferBytes -= encoder.encode(\`${record}\\n\\n\`).length`, src/gateway/operator-sse-reader.ts:623)
  so long multi-frame streams cannot false-trip the cap; the held-CR ±1 and code-point additivity
  argument was re-derived and is behaviorally pinned by the 7-byte-offset chunk-split reassembly
  test. `releaseBody` fires on all four non-completion exits; EOF exits release nothing.
- **rm-1460 round-trip, re-verified programmatically:** both rewrapped comments (43af4cf graft,
  extension #44) are whitespace-collapsed EQUAL to their edf948de single-line blobs; pre-change
  `awk length>4000` = exactly :1507 (4463) + :1553 (4453); post-change = 0 lines. Render-tail
  marker remains the last non-empty line; census 260 defs / 0 dups.
- **Deferred by design (recorded, not blocking):** the client twin's cap check re-encodes the whole
  buffer per chunk — bounded by the 1 MB frame cap, exact, and rm-253's fold inherits the helper at
  the same seam if it ever wants the incremental treatment. The `validation:v1` executable-surface
  digest is work-order-declared and consumed by the later full_tests gate against the batch-applied
  tree; no in-repo digest file exists to update.

## Compound outcome (cycle:4, pre-review — run c84d9094a65d424fba812b8b286ed080 compound 0aa8d989)

Validation record consumed (no tests re-run in compound, per phase budget):
- targeted (attempt a61125ab, tree 46bc60bc): 12 suites / 1531 tests, all passed; digest
  re-derived live = dispatch digest 66ab04bb (match True).
- full (attempt 09b95c46): github_ci_validate rc=0 ok:true — ephemeral PR #939, commit
  11e496b2037855150b8cc967808a55312636c537; 7/7 buckets SUCCESS (Dependency Review, Lint,
  Design Check, Check Types, TEST, Check Workflows, Test Scripts Load) + Fro Bot SKIPPED (fork
  PAT gate; ok:true). Two prior runs failed on a FOREIGN red adjudicated and cured — see
  docs/solutions/workflow-issues/ephemeral-ci-validator-grafts-main-workflows-old-base-path-parity-red-2026-10-18.md.
- Emission-time digest after the full_tests cure: validation:v1:23d78d07… (two aligned surfaces,
  both content-identical to origin/main 5ab50da0 → fold/rebase-neutral).

Ledger state after compounding: rm-1457..rm-1460 def lines now read "validated 2026-10-18
(implement 866552f6, salvage 46bc60bc; validated by targeted 1531/1531 + full ok:true PR #939);
pending review + landing". The rm-253 wire-or-fold decision gained a rider citing the now-live
fold-arm seams (sseBufferByteLength, releaseBody) and the acceptance-template tests.

Next-cycle pointers (assessment carries review/shipping outcomes forward):
- rm-253 wire-or-fold: fold arm now cites live seams + property-test template; still owe the
  08a0abac rm-842 fleet-collision check before dispatch.
- rm-1449 dependency-majors gate re-evaluation lands 2026-10-21 (rider census refreshed by
  research f65cef59: no new majors beyond vite-plugin-pwa 2.0.0 / jsdom 30.1.3).
- rm-139 Node-26 triad go/no-go at the 2026-10-28 promotion gate (v26.12.0 lts:false today).
- The implement-phase vitest flake (render-guard eslint leg cold 30s timeout vs 120s spawn
  allowance, test/roadmap-render-guard.test.ts:182-188) — re-run-once policy sufficed twice;
  widen only on a third occurrence.

(Collapsed at integrate independent review: this section originally shipped twice — an
unattributed draft plus this run-attributed record, flagged by the batch's own review verdict;
the unique vitest-flake pointer was folded in.)

## Landing record (2026-10-18, integrate conflict case 6596225b58ac49df88619474b6332b19)

The candidate (landing 6174544, salvage 46bc60bc over run base edf948de) merged into advanced
main c02f90d. Mechanism note: the merge initially presented as `fatal: refusing to merge
unrelated histories` — a depth-1 fetch of the run branch had recorded the landing commit itself
as a shallow boundary in `.git/shallow` while its full parent chain was present locally, so
merge-base resolution collapsed; the stale boundary was cleared and the merge re-ran at the true
base edf948de, reproducing the same two-file conflict set as cases aed7fec2 and 10e56e87
(ROADMAP rider/def/tail hunks + the operator-stream-core import block), re-materialized per the
verified record of case 1d0d814e and review ff92fc17.

Id arbitration, first-landed-wins (main's same-day band from run 3d12d72f, case d73745b3, keeps
rm-1457 and rm-1458 with their bodies):

- the LEAD `rm-1457` (byte-true SSE cap) lands as **rm-1484**;
- `rm-1458` (reader release + incremental byte count) lands as **rm-1485**;
- `rm-1459` (listener read-side validation) and `rm-1460` (render-guard line ceiling) keep
  their ids — def-free on the landed wall.

The renumber is applied in ROADMAP defs/riders, public/operator-stream.js,
public/operator-stream.d.ts, src/gateway/operator-sse-reader.ts, and both seam test files; main's
own approval-click containment describe (issue 636 port) legitimately keeps its rm-1457 id. The
numerals used throughout THIS document remain the pre-landing mints, preserved verbatim as dated
history. `.github/workflows/release.yaml` and `scripts/release-paths.ts` stay at HEAD — the run's
full-tests cure had checked them out of main and they were byte-identical, fold-neutral by
design. Render census after the landing graft: 291 def ids / 0 duplicates / max rm-1485 / next
free rm-1486.

Follow-up cure (2026-10-18, integrate conflict case 77e4ba4efdac4fd8bb1d69bf8d605d6c, same
integrate re-derived): the compound-phase solutions lesson
`docs/solutions/workflow-issues/ephemeral-ci-validator-grafts-main-workflows-old-base-path-parity-red-2026-10-18.md`
shipped with its frontmatter block never closed (the closing `---` — and the convention's
`tags:` line — were dropped), which reds `test/docs-solutions-frontmatter-guard.test.ts` (rm-803);
the lesson was written after the full-suite green record (compound postdates full_tests), so no
suite had seen it. Restored the closer and a `tags:` list per the structured-lesson convention
(actionlint-pipx form); no lesson content changed. The same pass re-built the gitignored
`web/dist` in the integrate worktree (fresh worktrees never carry it — the documented direct-
vitest ENOENT trap), curing the pass's two fixture-harness artifact-guard reds without a tree
edit.
