# Repository-maintenance cycle 4 — compound record and cycle-5 context

run 21222e003a454200a41d886c25934199 · compound attempt 69b759e177254669bac53549df829147 · 2026-10-17

Compound consumes pre-review cycle evidence only (assessment, research, roadmap,
prioritization, implementation, test outcomes). Review and shipping outcomes land
after this phase; the next cycle's assessment carries them forward.

## Attempt lineage

- Prior compound attempt f6f2c8fb reaped at message_count=2 (~4 min in, provider
  failure). No typed artifact, no scratch dir, and every ROADMAP rider present in
  the worktree was labeled `implement be893b98` — nothing durable to adopt, this
  phase redone from scratch and declared here.
- Same-run precedent: the implement phase ADOPTED dead-attempt a8d90c06's work
  after byte-identical verification against the roadmap-phase spool diff
  (783592071), and the roadmap phase itself found nothing adoptable from reaped
  attempt d950e6a3.

## Cycle outcome (all evidence pre-review, recorded in the ledger riders)

Batch "Estate truth & guard restoration" (prioritize 85a841aa), base 7042635:

| unit | surface | validation outcome |
| --- | --- | --- |
| rm-648 | .github/workflows/cve-tripwire.yaml (land-or-retire → LAND) | targeted 97/97 (c8d4cd0b); full PR #829 ok:true, 10/10 checks |
| rm-1472 | 43 Trivy HIGH disposition ledger | same legs; CodeQL + Dependency Review green on the tree carrying it |
| rm-1473 | lockfile-guard.yaml restored + release.md Class-B row | FIRST LIVE GREEN run 38981411688 (PR #807 head e69ba4961ad4); green again in #829 |
| rm-1475 | .nvmrc + upgrade-decision matrix v2 + rm-139 re-point | 10/10 in #829 incl. Check Types, Lint |
| rm-1477 | AGENTS.md clonedeps bullet v0.78.0 → v0.122.1 | Lint green in #829 |

Full validation: `github_ci_validate.py` verbatim → ok:true, ephemeral PR #829
(commit 0cf64753, validation_base_commit 98cfdd52), 10 checks SUCCESS, Fro Bot
SKIPPED by design (no FRO_BOT_PAT), 664s. PRs #807 and #829 auto-closed and
head refs cleaned (verified).

## Fold context (live-probed at edf948de at compound time — rm-1499 owns this)

origin/main advanced 4x inside the cycle (7042635 → 7b4d425 → 98cfdd52 →
edf948de), producing:

- .github/workflows/cve-tripwire.yaml: same-path double-landing. Main = 142
  lines, aquasecurity/trivy-action@ed142fd (v0.36.0), mirrors release.yaml's
  Enforce idiom, ignorelist-as-gate jq summary, cron `'53 6 * * 1'`. Ours = 93
  lines, docker-run aquasec/trivy by image digest, same cron. Textual conflict
  guaranteed; duplicate Monday cron if both survive. One variant must win at
  fold with rationale (docker-run digest form matches actionlint-container-form
  + digest-pinning conventions and zero runner-toolchain dependency; trivy-action
  form matches the repo's existing Enforce idiom).
- lockfile-guard.yaml and .nvmrc: absent on main — unique carriers, land clean.
- AGENTS.md: main's :105 shorter-form v0.122.1 bullet vs our fuller rm-1477
  form — textual merge owed (keep the tracks-the-agent-pin rule and the
  fresh-worktree note).
- ROADMAP.md: zero rm-1472..rm-1499 text on main (no id collision); main band
  ceiling rm-1456 vs our mints through rm-1499 — renumber-on-landing applies.
- Fold discipline: re-derive the rehearsal base at fold time and run a true
  per-file 3-way rehearsal (git merge-file), never hunk-range overlap
  heuristics.

## Cycle-5 candidate slate

1. rm-1499 — cycle-4 fold reconciliation (gates the landing; minted this phase).
2. rm-1474 — branch-protection fill (rm-116 successor). Precondition changed:
   Actions recovered during cycle 4 (PR-head runs execute; see rm-1450 rider),
   so sequencing behind rm-1450's decision may unblock.
3. rm-1476 — aggregator cache eviction (departed repos accumulate forever).
4. rm-139 — Node 26 LTS go/no-go, gate 2026-10-28, using rm-1475's matrix.
5. rm-1478 (run e178a946) — Actions-outage recovery census: coordinate, do not
   duplicate; it already cites our rm-1472..rm-1477 band.
6. rm-714 — release-channel decision, orphan-rider class (def not in the base
   render); decision long overdue per fleet memory.
7. Roadmap-phase duty: census ALL unlanded sibling bands before minting —
   rm-1478/rm-1479 (e178a946) and rm-1483..rm-1498 (runs 9511a1b5, 34bc2026,
   f509562e, 0f5694c6, 87c31743, 475b46bc, 65d56bdd, 74d2adff, d495512f).

## Reusable lessons / prevention rules

- L1 (prior-attempt forensics): a reaped attempt's worktree diff and spool
  scratch are the durable trail — verify identity against the work order, then
  adopt; redo only when nothing verifies. This run adopted once (implement) and
  correctly redone twice (roadmap, compound) at minutes of cost.
- L2 (phantom citations): release-channel.yaml's cron-cluster comment cited a
  cve-tripwire lane that never existed — the root cause of rm-648's empty
  acceptance. Prevention: any comment citing a workflow by name gets grepped
  against .github/workflows at review time; fix or delete the citation in the
  same change that touches the comment's subject.
- L3 (dark-Actions validation): main-push darkness does not block PR-head
  validation. The recipe that worked: local deliberate-red proof (lockfile
  override → frozen-install failure → cure) + guard-domain vitest + ephemeral
  full-validation PR. Recorded in the batch doc; reusable next outage.
- L4 (same-path double-landing): with origin/main moving several times per
  cycle, same-path parallel landings (here: cve-tripwire.yaml) are the dominant
  fork risk. Mint rm-1499 is the template: probe both variants at edit time,
  record the decision criteria, converge at fold.
- L5 (probe at edit time): every durable-doc fact minted this phase was
  re-probed live at edf948de before writing (file existence, line counts, grep
  hits). Stale-facts-in-durable-docs is a documented fleet defect class; the
  cure is one fetch plus the specific greps at edit time.

## Evidence index

- assess a9a65f1c · research 4c4c291b · roadmap 783592071 · prioritize 85a841aa
  · stewardship dbc3b8cc · implement be893b98 (deliberate-red transcript)
  · targeted_tests c8d4cd0b · full_tests 51471977 — all under
  /home/agent/.hermes/conductor-delegate-spool/delegate/.
- Batch doc: docs/prioritization/2026-10-17-repository-maintenance-cycle-4-batch-run-21222e003a45.md
- Decision matrix: docs/plans/2026-10-17-001-upgrade-decision-matrix-v2-plan.md
