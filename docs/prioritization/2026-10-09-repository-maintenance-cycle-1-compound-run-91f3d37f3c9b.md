# Repository-maintenance cycle 1 — compound record (run 91f3d37f3c9b)

Run: `repository-maintenance:f24ea34af1b1468180162ddd4e51696a:cycle:1` at base
88e423a6c53a (== origin/main frame at dispatch). This record compounds the
cycle's pre-review learnings (compound attempt 23acd59a; validation outcomes
consumed from the recorded typed results — no tests re-run this phase).

## Phase chain

| Phase | Attempt | Outcome |
| --- | --- | --- |
| assess | 543756a4 | Adversarial full-read of every primary server + largest client surface at 88e423a; findings F1-F5 dispositioned at roadmap (see ext #37) |
| research | 084b7917 | ce-ideate; exactly ONE unclaimed mint survivor C1 (Monitoring allClear omits the DTO-level stale banner). Prior attempt 8a19984056af reaped provider-side at ~23s — nothing adopted |
| roadmap | a268ee63 | Ext #37: ONE mint (rm-835), NINE dated riders, guard pin 780 → 835; delivered report-only (spool patch `roadmap-91f3d37f-a268ee63.patch`). Prior attempt 4153379a reaped at ~28s |
| prioritize | 9f7f67de | Batch = 'cold-start truth hardening' (single def rm-835); full selection floor walked — 37 live unlanded sibling claims enumerated, every higher-priority free item non-selectable this cycle |
| stewardship | dc35adec | Structured stewardship_request, no Git topology chosen; three change-units pinned against live origin/main |
| implement | c53c3bc6 | All three units landed uncommitted: ledger flip, Monitoring.tsx predicate gate + no-data state, 3 pinning tests (file 16 → 19), batch doc |
| targeted_tests | 012f96ed | scope 'none' per the work order's own derivation (changed_testable_surfaces empty); named command attempted, timed out at 600s under the Actions outage with zero side effects |
| full_tests | d5889fa0 | VERBATIM seeded command: PR #487 check-dark its whole 3600s budget → 'timed out without registering any PR checks' (environmental); error-path cleanup crash stranded ci-base refs |
| full_tests | 76f6976d | Supervisor-approved deviation: local six-job mirror of Main, content-identical — SIX-FOR-SIX GREEN first pass (root 65 files/2478 tests + web 33 files/1215; drift fully accounted); digest proven fresh by live-engine re-derivation pre- and post-battery |
| compound | 23acd59a | This record + rm-835 closure rider/def-line note + outage prevention-rule doc; zero test execution |

## Cycle outcome

rm-835 **implemented, validation closed pre-review, pending landing**. Census
after compound: 248 defs, 0 dups, max rm-835 (riders only — no def added,
none removed; guard pin stays 835). The batch's five dirty-tree surfaces are
unchanged since implement (porcelain sorted md5 stable through both
full_tests attempts and compound).

## Ledger deltas (compound 23acd59a)

- rm-835 def line: appended compound closure note — validation closed
  pre-review (targeted scope 'none' engine-derived; full-suite = six-job
  local mirror green under the supervisor-approved Actions-outage deviation,
  runner confirmation deferred) — `pending landing`.
- rm-835 block tail: one compound rider recording the closed acceptance
  evidence (implement landed all three acceptance bullets; Monitoring test
  count 16 → 19, web suite 1212 → 1215 = exactly the batch delta) and both
  full_tests outcomes (verbatim d5889fa0 platform timeout on PR #487;
  approved mirror 76f6976d green), pointing at the new prevention-rule doc.
- ext #37 comment: UPDATE paragraph (comma-form census mention only — no new
  claiming comment; the ext's slash-form census claim remains the newest
  dated claim and still states the live truth).

## Lessons compounded (with their prevention rules)

1. **The ephemeral-PR CI route is check-dark under the account-level Actions
   disable; probe before dispatching, mirror after approval.**
   `docs/solutions/workflow-issues/actions-account-disable-full-suite-local-mirror-2026-10-09.md`
   (NEW) — detection probes (newest-run / runs-since / 422 dispatch
   signature; permissions GET is NOT recovery evidence), the sanctioned
   six-job mirror table, declaration rules, and the recovery re-dispatch
   playbook. Fleet instances consumed: runs 155f9770, 3eea27cb, 32f33f1b
   (verbatim burns), then approved mirrors 155f9770/58737c07,
   3eea27cb/d8a32ae9, 91f3d37f/76f6976d.
2. **Consume the standing cure BEFORE the verbatim burn.** This run's
   d5889fa0 rode the seeded command to a deterministic 3600s timeout even
   though the supervisor-approved mirror cure already existed fleet-wide and
   the outage was on record — the fold gate then rejected the honestly-failed
   result, costing a retry attempt plus one more check-dark PR twin (#487 →
   re-pushed as #485 by fleet retry churn). Rule: on a known platform outage
   with a recorded deterministic-failure precedent, ask for the deviation
   FIRST.
3. **Prove digest freshness by re-derivation, not assertion.** The
   emission-time digest was re-derived through the live engine module on the
   current tree and matched the dispatch digest twice (pre- and post-battery),
   with porcelain md5 identical across the battery — the verbatim declaration
   is provably current. Adopt this on every fix/test-bearing phase that
   executes zero executable edits.
4. **Roadmap rider lint traps stand** (regex patterns in backticks; no bare
   bracket tokens) and the census-claim exact-slash-form rule — both already
   documented as house rules; this cycle hit neither (battery green first
   try).

## Next-cycle candidates and context (ordered, with preconditions)

1. **Pipeline-recovery unlocks** (precondition: workflow_dispatch not-422 or
   any run newer than 37872407109): rm-119's evidence base (REST runs shape —
   unprobeable while dark), rm-103/rm-703/rm-779 CI-gated acceptance proofs,
   and the deferred GitHub-runner confirmation + stranded conductor/ci-* ref
   sweep (incl. this run's ci-base-8c01cfd2) at the first authorized
   push-gate. Monday 2026-10-12 self-heal window is outage-gated: canary
   05:23Z and cve-tripwire 06:53Z first fires happen only if the pipeline
   recovers first.
2. **rm-153/rm-226 dual-def canonicality dedupe** — offline-doable now, cheap
   roadmap hygiene; one def supersedes the other, dedupe precedes any
   selection.
3. **rm-252/rm-253 upstream absorb window due 2026-10-13** — owned by
   aec9c3e88357 cycle:2; this wall carries fresh riders (27-commit window at
   tip 1ecbb81, decision due date) — support only, do not re-take.
4. **rm-114 ↔ rm-825 overlap reconciliation** (public/operator-stream.js
   handleDecision region claimed by 8134eb2e6b13 cycle:3) — coordinate, never
   parallel-implement.
5. **Integrate obligations for THIS batch** (before any next-cycle selection):
   union census + guard-pin re-derivation at landing (this tree pins 835;
   landed main ceiling re-derived from the union), rm-835 pairs by content
   with sibling run-28cd8f6c2568's rm-780 amendment rider — fold as this def,
   no sibling re-implementation; reconcile the overlapping cve-tripwire lanes
   (cbe70604's rm-779 implementation, 32f33f1b's parity batch,
   938d6033557a's resolve-step rewrite) rather than rebuilding; post-merge
   `git ls-files .conductor` must end empty; PR-twin hazard — keep exactly
   ONE of the triple-stacked #480/#482/#488 ubuntu image-family PRs.
6. **NOT ours to re-take**: rm-831/rm-832 (Actions-disable watch, sibling
   lanes), rm-825 (promptState, 8134eb2e6b13), assess F4 test-file lint
   warnings (below mint bar, recorded at ext #37 for the next touch of
   test/listener-store-degradation.test.ts), assess F5 (owned by rm-139's
   engine-enforcement precondition).

## Deferred register (push-gate authority, recorded not actioned)

- GitHub-runner CI confirmation of this exact tree (re-run the seeded
  full_command verbatim post-recovery; expected minutes, tree unchanged).
- Stranded conductor/ci-* base refs on origin (fleet-wide; this run's
  ci-base-8c01cfd2 included) — deletion is a push.
