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
