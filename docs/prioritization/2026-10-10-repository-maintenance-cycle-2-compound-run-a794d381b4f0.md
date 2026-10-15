# Dashboard maintenance — repository-maintenance cycle 2 compound record (2026-10-10, run a794d381b4f04a8ebefc18ea76e58067)

module: dashboard
tags: `[repository-maintenance, compound, validation, ci, actions]`
problem_type: compound-cycle-record

Campaign `repository-maintenance:b2663eec115b4a4b89e14561d7bcb95b:cycle:2`,
compound attempt `353861d32c1442e49ab70cd1b68ccad0`, base `88e423a` (==
origin/main at dispatch; origin/main has since advanced to `eee2667` with a
convergent fro-bot.yaml pin — integrate note below). Status at composition:
PRE-REVIEW — review and shipping happen after compound; the next cycle's
assessment carries them forward. Scope discipline: NO test execution at
compound; the recorded targeted/full outcomes are consumed as evidence
(census-equivalent python replication + authorial greps only).

## Cycle outcome

Batch "CI gate truth + supply-chain currency" — 3 units, 17 change sites, all
`.github/` + the ROADMAP rider surface + this cycle's records; zero `src/`/`web/`
code:

- U1 `rm-779` + `rm-188` (clock item): cve-tripwire resolve rewritten to derive
  the whole pin from the Dockerfile `ARG NODE_IMAGE=` line (fail-closed
  preserved); `runs-on: ubuntu-latest` folded to `ubuntu-24.04` (the fleet's
  last ubuntu-latest among 26 runs-on sites).
- U2: 13 action re-pins — setup-node v7.0.0→v7.1.0 ×5, upload-artifact
  v7.0.1→v7.0.2 ×4, codeql-action v4.38.2→v4.38.3 ×4; every tag→commit digest
  re-resolved first-hand (annotated codeql tag `cee97f86` peeled).
- U3: fro-bot/agent v0.117.5→v0.118.3 at fro-bot.yaml:347 (`d88c245f…`).
- roadmap layer: ten dated riders + extension #31 + the batch record doc.

Delivery identity: ONE cumulative spool patch
`delegate/implement-a794d381b4f0-45ecba5e.patch` (394 lines, 10 files, md5
`5cccd0982e9c2391be40fe2cda5c7190`, includes the roadmap layer verbatim — later
phases apply that patch, then THIS compound layer:
`delegate/compound-a794d381b4f0-353861d3.patch`, riders-only: NO mints, NO
status flips, guard pin 780 untouched, test files untouched).

## Validation ledger (pre-review, consumed here)

| phase | attempt | outcome | salient evidence |
|---|---|---|---|
| targeted_tests | `4020f613` | green, scope none (spool carrier) | bookend digest byte-exact; resolve-sim rc 0/1; actionlint rc=0; census 247/0/780; guard 8/8; lint 0 err; check-types rc=0; restored pristine |
| full_tests (verbatim) | `fc45565c` | executed VERBATIM, outage-blocked, honest-failed per supervisor ruling | full 3600s, PR #531 checkless; 422 probes both sides of a disable→re-enable cycle |
| full_tests (fold) | `aaf184c6` | SUCCEEDED | predecessor execution adopted (shim byte-identical `b8feae94`/`e4f2ed66`); fresh probes; six-job mirror ALL GREEN; digest re-derived VERBATIM |

## Compound layer contents

- six validation-outcome riders (`rm-779`, `rm-188`, `rm-558`, `rm-650`,
  `rm-648`, `rm-252`) + `cycle:2 compound #32` tail comment (owns the newest
  census claim 247/0/780; numeral lane-local, inert on union).
- pre-review outcomes appendix on the batch record doc (includes the
  account-level to repo-scoped enforcement correction).
- NEW solutions entry:
  `docs/solutions/workflow-issues/github-actions-enforcement-outage-repo-scoped-diagnosis-adoption-2026-10-10.md`.
- this record.

## Findings (recorded)

- MEDIUM operational: repo-scoped Actions run-creation enforcement outage — 422
  despite `enabled:true`, inert to the re-enable cycle, scattered per-repo death
  times, account healthy (agenttrace control). Recovery probe: any run newer
  than 37872407109 (2026-10-09T01:59:31Z), or the dispatch stops 422-ing.
  Blocks the verbatim CI gate, rm-116's required-checks fill, and rm-648's
  green-at-parity window until it lifts.
- INFO process: prior compound attempt `1557cafc` died mid-turn of a provider
  429 (rate limit) with NO durable artifacts (`delegate/1557cafc*.json`
  absent; only events/results envelopes exist); phase redone from scratch this
  attempt. The dead attempt had left the worktree with the implement batch
  cleanly applied (`git apply -R --check` clean) — used as the composing base,
  restored pristine at phase end.
- INFO hygiene: no batch-doc repair needed this run (the 19c024286fc4-class
  empty-blob trap checked and absent — doc intact at 4015 bytes).

## Next-cycle entry points (ordered)

1. Landing verification: status wording flips at the land event; post-merge
   `git ls-files .conductor` must end empty.
2. Deferred verbatim `github_ci_validate.py` at the first authorized push-gate
   after recovery — also unblocks `rm-116` and `rm-648`'s evidence window.
3. `rm-252` decision due 2026-10-13 on the no-actionable-absorb footing
   (explicit-refname re-measure).
4. Gated majors re-eval 2026-10-21 (`rm-108`/`133`/`140` riders) — unchanged.
5. Deferred classes (batch decision doc `a68c1b66`): `rm-825`/`826`
   sibling-implemented adopt-at-integrate, `rm-850`, `rm-651`/PR #503,
   `rm-139` precondition-owned, `rm-780` implemented-pending.

## Integrate obligations

- Apply order: implement patch first, compound patch second (or their union);
  compose over a pristine `88e423a` worktree.
- fro-bot.yaml:347 `d88c245f` is byte-identical on origin/main `eee2667` —
  3-way collapses; codeql/upload-artifact re-pins stay byte-convergent with
  unlanded siblings `implement-493bbbf2`/`533ad14f` — fold by content, never
  rebuild.
- On union, whoever lands last re-derives the newest census claim per house
  union rules (the guard reads date-then-document-order; the #32 numeral is
  inert).

## Verification of this compound layer (no test execution)

- python census replication before/after: 247 defs / 0 dups / max rm-780 both,
  0 trailing-whitespace lines, 0 bare bracket lists; newest-claim selection
  replicated: compound #32 owns the slot, claims 247/0/780.
- patch round-trip on a pristine `88e423a` worktree: `git apply --check` clean
  for implement then compound in sequence; reverse-applied back to porcelain 0.
- pure digest-hash utility (not a test command): `validation_digest` at base
  `88e423a` is IDENTICAL between the implement-applied tree and the
  implement+compound tree —
  `validation:v1:8fcb184d66b7f7341009ddb843dab2f430c816420e1e9e245cf83e8182e171f7`
  (the compound delta is markdown-only, so it cannot move); over the restored
  pristine tree it re-derives the dispatch digest
  `validation:v1:bf89434ed189207127f626b901c16c33641ba8f1fb0633aedad6ced77c377037`
  (the batch's `.github/` delta is executable-scoped, which is why the applied
  tree's digest differs from the pristine one).

## Integrate disposition (2026-10-15, conflict case de515a27b99c4d219316ecc3c9105c29)

Landed into a main that had moved well past the batch's base `88e423a`
(merge base `88e423a` → ours `5d5f9be`). Per the authority order, each unit
was reconciled against the superseding landed state, not against the batch's
at-write tree:

- U2 action re-pins (setup-node v7.1.0 ×5, upload-artifact v7.0.2 ×4,
  codeql-action v4.38.3 ×4): LANDED BY CONTENT. Main's upstream adoptions
  (2026.10.17/23/25 series) already carried upload-artifact `cf430e0`
  (v7.0.2) and codeql-action digest `24c5418` at every site; the batch's
  fuller `# v4.38.3` version comments ride through (digests re-verified
  tag→commit against the live registries at this resolution: `949feb2` ==
  v7.1.0, `cf430e0` == v7.0.2, `24c5418` == v4.38.3). setup-node
  v7.0.0 → v7.1.0 applied at all five sites (`audit.yaml`,
  `release.yaml` ×2, `visual.yaml`, `.github/actions/setup/action.yaml`).
  pnpm/action-setup stays at main's landed `0977fd99` (v6.0.10, adopted
  with the upstream series; the batch never touched that pin).
- U3 agent pin: SUPERSEDED — main's `e895362`/`a385ca5` adoptions already
  carry `fro-bot/agent@15dc1d9` (v0.122.1, tag→commit verified), newer than
  the batch's v0.118.3; kept main's.
- U1 cve-tripwire resolve fix (rm-779 + rm-188 fold): MOOT —
  `.github/workflows/cve-tripwire.yaml` was deleted on main by the upstream
  2026.10.17 adoption series (`4b73309`), and that converged workflow set
  (hosted-runner `ubuntu-latest` policy, upstream-shaped `.github/`) was
  reaffirmed by four later landings including the 2026.10.25 release
  adoption. The deletion supersedes the workflow and its pin mechanics; the
  file is not resurrected against the converged tree. rm-648's monitoring
  gap (weekly CVE scan of the pinned base digest) stays owned by the open
  roadmap item for a native rebuild under the current workflow conventions.
- ROADMAP.md riders/extension comments: SUPERSEDED by the landed
  `hermes-autonomy roadmap-sync` managed render (`558b14e` 2026-10-11,
  refreshed `5d5f9be` 2026-10-15, "do not edit by hand") — the hand-written
  rider ledger format this batch wrote into no longer exists; main's render
  is kept verbatim and this doc (plus the batch record) is the durable
  history of the run.
