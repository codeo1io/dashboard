---
module: dashboard
tags: roadmap, process-learnings, observability-fleet, dependabot, ci-validation
problem_type: process-learnings
---

# Cycle:2 compound record — repository-maintenance run 1209380057914cc3bd6682366af2dd0a

Pre-review compounding of the cycle:2 repository-maintenance batch "Monday-fleet preflight + scheduler-adjacent unblocking" (prioritization attempt 58755be1b3cf4e5fae9899cef9ca4f9e, run requirement repository-maintenance:513b2f42572846d7824488ed8ebfd23f:cycle:2).
This document folds the cycle's assessment, research, roadmap, prioritization, implementation, and recorded test outcomes into durable roadmap state and next-cycle context; review and shipping outcomes happen after this step by the compound contract and are carried forward by the next cycle's assessment.
It supersedes the interim tree-verification line in docs/prioritization/2026-10-18-repository-maintenance-cycle-2-batch-run-120938005791.md — the footprint grew beyond the implement-phase pair when full_tests added the base-drift cure legs; the final footprint is the fold map below.

## Phase ledger

| phase | attempt | outcome (pre-review) |
| --- | --- | --- |
| assess | adee5bbfe6024c8b9704e9be83082674 | fresh adversarial assessment at 64cd2f6a, worktree clean; gates re-run first-hand (check-types OK, lint OK, server vitest 3611/3611, web vitest 1656/1656 on rerun with one load-dependent 7/201 flake in the operator runtime suite); build-arg/Dockerfile-ARG finding re-derived but already owned by unlanded sibling work (rm-1519a band) |
| research | 0cfe5f91337745be81984667fb7ea80d | built ON sibling registry/upstream/absorb probes (identical, not re-derived); NEW angle: the Monday observability cron fleet — first scheduled window 2026-10-19T03:37Z-07:23Z after delete/re-add churn and the 2026-10-12 scheduler-darkness stretch |
| roadmap | 10f0a8529762461db15748bd5e475127 | ownership dedup first (all four research candidates already owned); exactly ONE mint rm-1971 (fleet dispatch preflight); riders on rm-102/rm-280/rm-252; guard suite 30/30 post-write; delta patch round-trip-proven (postimage sha d552ca40) |
| prioritize | 58755be1b3cf4e5fae9899cef9ca4f9e | timing re-anchored against the container clock (2026-10-17T19:45Z, ~4h to the fro-bot nightly deadline, ~31h to the Monday window); six high-impact lanes excluded as sibling-owned (claimed-territory audit); three-leg batch selected |
| stewardship | b3245d19ff7e4a00aa70baab88657287 | repository candidates verified live (canonical detached+clean at 64cd2f6a, this worktree clean, origin/main moving); three-leg batch shape handed to the conductor |
| implement | 75d012fbdc3e466f87974c9263988c38 | landed UNCOMMITTED at base 64cd2f6a; dispatch arm deferred by the work-order stage fence with readiness PROVEN locally (install 6.6s exit 0, audit exit 0, six dispatch triggers verified present); prior attempt adaa1a36 reaped 29s in — redone from scratch |
| targeted_tests | bd98b800b6514937acb7c6c988241d59 | changed-surface classification (3 paths, non-executable); eslint rc=0 over the prose/yaml delta; YAML parse guard; roadmap guard suite 5 files / 30 tests green; prior attempt 8eca25f1 reaped, nothing adoptable — redone from scratch |
| full_tests | 8581d08b76d1465dbea1a18425289513 | run 1 red on a DETERMINISTIC ephemeral-base path-parity red (should-release guard); cured by mirroring main's corpus bytes into the candidate; run 2 green — PR #977 head 7a25eb0, all buckets SUCCESS (Test Files 75/75, 3610 server + 39/39, 1656 web); two prior attempts dead-lettered (lease expired 06:54:24Z; ambiguous dispatch fail-closed 09:13:00Z) |
| compound | 65547f98a4b745a5942530859a456acd | this document + the roadmap compounding recorded below; prior attempt 5158bfe5 reaped 28s in (2 event-log messages, no typed artifact) — redone from scratch. 65547f98 was then itself infra-reaped at 14:41:41Z after writing this document + the ROADMAP band (its typed envelope never written); phase completed by attempt 858ae973df164a55830ecb408b99dc8b via VERIFIED ADOPTION — see the addendum |

## Attempt-death ledger (reusable)

Five infra-family deaths this run, zero adoptable output each: adaa1a36 (implement — reaped 29s after turn-start, 7 messages, zero tree drift), 8eca25f1 (targeted_tests — two reaped turns, no typed artifact), a1a112bc and 84da0bc8 (full_tests dead-letters — lease expired, then ambiguous dispatch fail-closed with no result envelope), 5158bfe5 (compound — reaped 28s in).
Two reusable rules held every time.

- Forensics before redo: read the durable trail first (typed-artifact path, events jsonl tail, tree porcelain) and verify any found result against the live work order (identity, test-selection provenance, tree census, worktree cleanliness at dispatch); adopt only on verification, otherwise declare the redo. An absent envelope is not evidence no work happened; a present artifact is not proof it is valid.
- Infra deaths cluster: a phase that dies once is likelier to die again the same hour; when the deadline allows, letting the provider family settle beats immediate re-dispatch (this run's full_tests succeeded on the third attempt after two dead-letters inside three hours).

## Batch fold map — final tree footprint at compound close

| path | carries | phase(s) |
| --- | --- | --- |
| ROADMAP.md | rm-1971 def + roadmap-phase riders; implement riders; compound riders, one status true, and the compound tail claim comment | roadmap, implement, compound |
| .github/dependabot.yml | comment-only rm-102 unstall touch (no semantic change; the server-side trigger is the landing commit) | implement |
| .github/workflows/release.yaml | comment/blank-line alignment to main's byte form — zero functional delta vs origin/main (base-drift cure) | full_tests |
| scripts/release-paths.ts | main's corpus block mirrored — byte-identical to origin/main (base-drift cure) | full_tests |
| docs/prioritization/2026-10-18-repository-maintenance-cycle-2-batch-run-120938005791.md | batch record, dispatch runbook, predicted fleet verdicts | implement |
| docs/prioritization/2026-10-18-repository-maintenance-cycle-2-compound-run-1209380057914.md | this record | compound |

## Roadmap compounding (this phase)

- Status true: rm-1971 candidate -> in_progress. The readiness half is delivered and validation-backed (full ephemeral PR #977 all buckets SUCCESS); the dispatch arm is the live half of the acceptance and is owed at the first CI-allowed gate before 2026-10-19T03:37Z.
- Four dated riders appended: rm-1971 (close-out + dispatch deadline + provenance of the green validation), rm-102 (touch rode the green validation; post-landing verification window re-anchored to the landing commit), rm-740 (day-range blind spot banked as next-cycle material), rm-248 (second instance of the ephemeral-base path-parity class, the cure, and the unowned permanent lane).
- Compound tail claim comment inserted at the newest-census slot before the managed marker; riders-only, ZERO mints, census unchanged (269 defs / 0 dups / max rm-1971).
- Why zero mints: every genuinely-fresh lane found this cycle is either rider-class (an existing def owns the frame) or next-cycle design material; the rm-1972..rm-2030 sibling fog band is contested — rm-2030 is double-claimed in two unlanded spool deltas, so first-landed-wins at the landing gates — and minting from compound into that band would add a third claim on contested numerals for no coverage gain.

## Prevention rules (reusable)

1. Ephemeral-base drift on parity-paired files — second confirmed instance, class recurring. The ephemeral validation base carries origin/main's workflows while scripts stay at the run base, so any run base that predates a main-side edit to a bidirectionally-paired surface (the release-trigger corpus lock between scripts/release-paths.ts and release.yaml, enforced by test/should-release.test.ts) reddens deterministically at full_tests with a candidate-blaming assertion. Prevention: BEFORE dispatching full validation, diff the run base against origin/main over the paired surfaces and mirror any functional drift into the candidate as a no-op-vs-main delta. Cure applied this run: mirrored main's corpus block; run 2 green (PR #977). The permanent lane (guard tolerance for newer-main filter entries, or engine-side workflow pinning) is unowned next-cycle material, distinct from fog rm-2008's tag-stream instance. The class also has an unlanded sibling trap doc (ephemeral-ci base stale release paths, 2026-10-18) — this record carries the rule in-repo regardless of which sibling lands first.
2. Prior-attempt forensics before any redo — see the ledger above; the protocol is the rule, not the exception.
3. Timing authority: the container clock (date -u) outranks the harness date stamp for deadline math; this cycle's prioritize re-anchored both deadlines against it.
4. Stage-fence discipline: when the work order's stage fence prohibits ci in the current phase, defer dispatch-shaped acceptance arms to a CI-allowed gate and PROVE readiness locally instead (house precedent run aa86550c, same day, same deadline class). The def's rider carries the verbatim runbook so the deferral is mechanical, not a gap.
5. Spool retention observation: this run's early-phase typed-artifact JSONs were swept from the delegate spool within hours (only the work-order summaries, the full_tests record, and the event logs remain); bank cycle-critical evidence into repository artifacts (this document, ROADMAP riders) during the cycle, not after.

## Ranked next-cycle candidates

1. rm-1971 dispatch runbook — DEADLINE-BOUND (before 2026-10-19T03:37Z): six workflow_dispatch runs against main, each outcome read back as its own rider on the def; predicted verdicts and the runbook live in the def's riders. Owed at the first CI-allowed gate of THIS run if one opens (final_validation or the commit gate); if the run's gates close first, next cycle's assess treats it as the head candidate under a deadline override.
2. rm-102 dependabot re-probe — within one weekly window of the landing commit (updates listing + authored-PR stream); escalation owned by fog rm-1480 if still dark.
3. Permanent lane for the ephemeral-base path-parity class — unowned; the design choice is guard tolerance for newer-main filter entries vs engine-side workflow pinning (prevention rule 1).
4. rm-740 day-range blind spot — the counter-tag stream is already past the 31 cap; false-stale-later bias only today, but it widens monotonically with every counter release.
5. fog rm-1962/1963 — Lockfile Guard ghost restoration family (active workflow id 375606447, file absent from the tree; observed twice this run, no workflow-state change taken).

Context only (sibling-owned, excluded at prioritize): the rm-864 census-test lane, the zero-scope operator OAuth lane, the rm-2030 listener-ack CSRF lane (congested). Standing watch: upstream-drift's Monday red is BY DESIGN while the fork sits one absorb behind (the standing absorb reminder).

## Landing-gate context (probe-time facts, 2026-10-18)

- origin/main at 55aedc97 at compound close — nineteen commits (nine merges) past the run base 64cd2f6a during the cycle; ROADMAP grew +288/−25 main-only lines (landed sibling bands and riders). No id collision for this run: main's def frontier is rm-1485 at 291 defs, and rm-1971 appears on no main revision and in no sibling spool delta (re-probed this phase; all numbers in this bullet re-derived first-hand at adoption — see the addendum).
- The candidate ROADMAP wall is the base wall plus this run's band; the landing union keeps every sibling rider (three-way merge, claim comments reconcile by content — the fleet's integrate grafts are the standing precedent), and the landing record re-derives census and guard state from the UNIONED tree per the extension-31 rule.
- scripts/release-paths.ts is byte-identical to origin/main; release.yaml differs from origin/main by comment/blank lines only — both legs land as functional no-ops vs main and exist to keep ephemeral validation green at this run's base.
- The full_tests validation digest (banked in the spool record 8581d08b) was derived over the executable surfaces (scripts/release-paths.ts, .github/workflows/release.yaml); compound added markdown-only edits, so the executable-surface digest is unchanged and the landing gate re-derives it.

## Verification of this phase (authoring hygiene; no test execution per the compound contract)

- Census re-derived first-hand at close and recorded in the tail comment: 269 defs / 0 dups / max rm-1971 / 0 malformed.
- File-scoped eslint over ROADMAP.md and this document: rc=0.
- rm-877 CLAIM_PATH_TOKEN replicated over this document: every claimed repository path exists in-tree.
- Trailing-whitespace and 4000-char scans over the compound-added lines: clean.
- Spool artifacts: compound roadmap delta (round-trip-proven — applied to a pristine base copy reproduces the final bytes exactly), compound postimage, and the full six-path candidate delta.
- Final git status --porcelain shows exactly the six intended paths (four modified, two untracked); git ls-files .conductor stays empty.

## Adoption addendum (completing attempt 858ae973df164a55830ecb408b99dc8b, 2026-10-18T16:2xZ)

Authoring attempt 65547f98 was session-reaped (provider-family infra death; its
events jsonl shows three delegate_turn_started turns with progress pings only,
then session_reaped exit_reason=failed at 14:41:41Z — the third compound death
this run after 5158bfe5) minutes after writing this document and the ROADMAP
compound band; its typed envelope was never written. The work below its name
was adopted only after re-verification against the live work order, per this
run's own forensics-before-redo rule:

- Identity: the riders and this document cite exactly the work order's phase
  chain (assess adee5bbf / research 0cfe5f91 / roadmap 10f0a852 / prioritize
  58755be1 / stewardship b3245d19 / implement 75d012fb / targeted_tests
  bd98b800 / full_tests 8581d08b), and the validation pointers (PR #977, head
  7a25eb0, 75 files / 3610 server + 39 files / 1656 web) match the full_tests
  typed record, which is still on spool disk and reads status=succeeded.
- Tree at adoption: git status --porcelain exactly the six intended paths
  (four modified, two untracked); git ls-files .conductor empty; no repo-root
  scratch left by the dead attempt.
- ROADMAP verified WITHOUT test execution (compound fence; the guard
  predicates were READ, not run — grep/awk equivalents applied): 269 def
  lines / 0 duplicate ids / max rm-1971; zero trailing whitespace; zero added
  lines over the rm-284 4000-char ceiling (the only >3900-char lines in the
  file are pre-existing HTML comments, exempt via isHtmlComment); the compound
  tail comment (1526 chars) sits complete directly before the managed-render
  marker; sibling spool deltas mint rm-1971 nowhere and main carries it on no
  revision.
- Byte claims re-proven first-hand: scripts/release-paths.ts diff vs
  origin/main is empty; release.yaml vs origin/main deletes comment lines
  only (main's rm-882 comment blocks); origin/main still 55aedc97.
- Three probe-time numbers in "Landing-gate context" were corrected inline at
  adoption (each re-derived first-hand): nineteen commits (nine merges) past
  base, not "ten merges"; ROADMAP +288/−25 vs base, not "+287"; main def count
  291 at frontier rm-1485, not 292.
- Spool reality: the 65547f98-named spool artifacts listed under
  "Verification of this phase" are ABSENT at adoption (swept post-write per
  prevention rule 5 — this run's early-phase typed JSONs went the same way;
  only the full_tests record 8581d08b, its logs/delta, and the event logs
  survive). Equivalents re-derived under the completing attempt id:
  compound-858ae973-roadmap-postimage.md (+ .md5),
  compound-858ae973-candidate-delta.patch (the four tracked paths),
  compound-858ae973-untracked-docs.md5.
- ROADMAP.md was deliberately NOT re-edited at adoption: the compound band
  stands byte-as-authored (the riders' authorship credits stay truthful),
  preserving its verified guard-compatible shape under the no-execution fence.
- Deadline status at adoption (2026-10-18T16:24Z): the Monday-fleet window
  2026-10-19T03:37Z is still ~11h out; candidate 1's framing stands as
  written — owed at the first CI-allowed gate of this run, else the next
  cycle's assess re-anchors under the override already recorded there.

## Review-fix correction (2026-10-18T20:37Z, attempt 213f9fbb, after independent review 98ba77f9 F1/F2)

- Ranked candidate 1 ("six workflow_dispatch runs against main") RE-SCOPED:
  actor codeo1io fired four of the six at 2026-10-18T09:46:10-21Z against
  main@655bfe50 — audit 39116641226 GREEN (prediction correct); base-drift
  39116644177 RED with REAL digest drift (pinned sha256:7f486cab… != live
  sha256:a5f4366e… — the implement prediction "GREEN expected" is corrected;
  a red there is a real digest move, feeding the rm-139 image-pin lane);
  canary 39116646937 GREEN executing both registered templates (discharges
  rm-280's dispatch arm, feeds rm-225); upstream-drift 39116653238
  RED-BY-DESIGN (behind=10 ahead=290, prediction correct). All four outcomes
  are banked on rm-1971's truth-up rider. The remaining debt at the first
  CI-allowed gate: fire cve-tripwire.yaml and release-channel.yaml (both
  still at zero lifetime runs, re-probed 2026-10-18T20:36Z) and read back.
- "Spool reality" above is stale in turn: as of 2026-10-18T20:36Z the ENTIRE
  run's delegate-spool artifact set is swept — the full_tests record 8581d08b
  + its logs/delta AND the compound-858ae973 equivalents named there are ALL
  absent (third sweep recurrence; zero files remain for every attempt id of
  this run, re-inventoried first-hand at review-fix). Durable evidence
  pointers: PR #977 (run 39125376443: 75 files/3610 + 39/1656), the run-1
  base-drift-class red 39124802530, and events/*.jsonl. The landing gate
  must not expect any spool pointer in this document to resolve.

