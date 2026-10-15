# Repository-maintenance cycle 1 — compound learnings (run 61448784a089)

Covers: assess 0af788d0 → research c3d3771e → roadmap 43d7025c → prioritize d56e0021 →
stewardship e1841486 → implement bf7a2406 → targeted_tests 4ee6511c → full_tests bdef2221/e20a8c5e.
Base 5530b5e (== origin/main). Review/shipping outcomes land AFTER this doc; next cycle's
assessment carries them forward.

## Cycle census

- Assessment at 5530b5e: gates green first-hand (check-types/lint/build:web RC0; 4257/4257;
  audit 0; frozen-lockfile clean). 11 findings, sharpest = N1 HIGH push channel structurally
  inert end-to-end (kill-switch SW `web/src/sw.ts:47,51,56` self-unregisters, push handlers
  guarded absent `sw.test.ts:91-94`, while `src/server.ts` env flag manufactures a `push-enabled`
  meta and `AppShell.tsx:538` mounts the consent card → every opt-in dead-ends 'sw-not-ready').
- Research: upstream window 4 commits (merge-base 1bcd98a; #615/#616/#604/#618), releases
  2026.10.24/2026.10.25, infra image 4-releases stale missing #615; gateway contract ladder
  1.9.0→1.11.0 (waiting_* in summaries, push trigger kinds + health, deep links, co-deployment
  requirement); Node 24 maintenance 2026-10-20 / 26 = next LTS; OpenCode V1 frozen; Vitest 5
  root-config discovery break named.
- Roadmap: ZERO-MINT (collision discipline — 235 defs committed, fog frontier rm-14xx), 11
  rider-only lines (spool `roadmap-delta-61448784-43d7025c.patch`).
- Prioritize: selection-collision map built FIRST — four sibling batches already claimed every
  top-scoring item (rm-1016/rm-1408 contract fwd double-selected); this run selected the
  unowned slice: push deploy-trap gating + rm-1020 lane-file-loss guard (file-disjoint).
- Implement (uncommitted in worktree, pending landing): Unit A server+client artifact-truth
  gate (`src/served-push-capability.ts`, `src/server.ts`, `web/src/push/served-sw-capability.ts`,
  `AppShell.tsx` mount gate); Unit B `test/lane-integrity-guard.test.ts` + AGENTS.md trap rider.
  +25 tests (7 push-meta-gate, 8 lane-integrity, 7 served-sw-capability, 3 AppShell gate).
- Targeted validation: engine-selected 20 files / 826 tests green (runner's own impact map).
- Full validation: canonical `github_ci_validate.py` executed VERBATIM → blocked by the Actions
  outage (dark since 2026-10-09T01:59:31Z; PR #681 waited the full 3600s with zero checks;
  ephemeral refs cleaned). Same-CI-job-set local battery green: check-types/lint/audit RC0,
  impeccable design-check clean, test-scripts-load RC0, vitest **4282/4282** (3067 root +
  1215 web). Fold accepted with the dispatch digest declared verbatim (no executable change
  in the validation turn).

## Durable lessons written this cycle

1. `docs/solutions/workflow-issues/github-ci-validate-actions-outage-local-battery-2026-10-14.md`
   (this batch): the full_tests canonical route's failure signature under an Actions outage,
   its side-effect contract (epheral PR + two refs + cleanup-crash mode), and the accepted
   substitution (one verbatim attempt → own-artifact cleanup only → same-job-set local
   battery → dispatch digest verbatim when nothing executable changed).
2. Lane-file-loss detection rule (implemented in `test/lane-integrity-guard.test.ts`):
   lane-lost = present@lane ∧ absent@merge ∧ ¬(absent@main ∧ present@base). Historical proof:
   fc69b9124 detected (85 files); 91774d8 = documented main-side-deletion limitation.
3. Served-artifact capability gating: derive channel capability from the built artifact
   (`web/dist/sw.js` push-handler marker), not from env flags — self-opens when a real
   push SW lands, no coordination constant. Server gate `src/server.ts:687-698` (gated
   injection branch at `:1144`) + client probe
   `web/src/push/served-sw-capability.ts` mirror each other.
4. Validation-envelope hygiene (two fold rejections this run): `validation_evidence.command`
   must be the BARE verbatim command string — context belongs in `trigger_reason`/summary;
   implement results must carry the changed-surfaces attestation (KTD13).

## Roadmap/status deltas (spool patches, apply at landing by title reconciliation)

- `roadmap-delta-61448784-43d7025c.patch` (roadmap phase): 11 riders, 13 insertions.
- `roadmap-delta-61448784-compound-6d007f3b.patch` (this phase): 2 riders on rm-116 (outage
  evidence: 5 stranded conductor/ci PRs on origin; local-battery precedent; next-cycle sweep +
  hosted revalidation) and rm-108 (dated Node 24→26 evidence) — hunks disjoint from 43d7025c.

## Next-cycle candidates (concrete, evidence attached)

1. Hosted-CI re-validation of the landed batch once Actions recovers (record: last run
   37872407109 2026-10-09T01:59:31Z; PRs #673/#674/#675/#678/#680 stranded by the same
   outage — sweep belongs to their owning runs).
2. Contract-forward absorption remains double-selected fog (rm-1016 / rm-1408): at landing,
  reconcile by title; the 1.11.0 co-deployment requirement makes this the highest-risk
  unlanded band (gateway bump is one infra PR away — infra merged deps 2026-10-13).
3. Push channel revival sequencing: the deploy-guard gate now makes rm-249's push-only SW
   the ONLY remaining blocker for the consent surface; sw-notification wire-shape (fog
   rm-1019) should land WITH it, not before (dead-module fiction otherwise).
4. rm-1020's def itself still lives only in fog patch 82ed1c4f — landing this batch's
   `test/lane-integrity-guard.test.ts` makes the def mintable-or-droppable at the next
   roadmap phase; keep census discipline (no dupes).
5. Node 26 adoption gate (rm-108) now has hard dates: 24 maintenance 2026-10-20, 26 LTS
   ~2026-10-28 — schedule the engines/Dockerfile/base-drift triple-bump as one unit.
