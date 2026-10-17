---
module: dashboard
owner: mb
category: prioritization
tags: [compound, repository-maintenance]
problem_type: cycle_compound
run_id: d495512fd2cc407a8e6a2253df54a6bf
attempt_id: 5f9cade8df384d6fb3945c71d25d64e5
base_commit: 55086ddc41061054582b69e834902440fa8e03e5
cycle: 1
generated: '2026-10-17'
---

# Cycle-1 compound record — run d495512fd2cc407a8e6a2253df54a6bf

Compounded from pre-review cycle evidence only (no execution this phase).
Base 55086dd = origin/main c01946ea minus run 85d97dc8's 2-commit landing;
origin/main itself sat at 64cd2f6a (verified again at full_tests) — the batch
is main-derivable via git apply --3way (re-simulated clean at full_tests).

## Phase ledger

| Phase | Attempt | Status | Key result |
| --- | --- | --- | --- |
| assess | 8877ba9e | succeeded | gates green first-hand (4757/4757, audit clean); 10 findings F1-F10; host Node v22 vs engines >=24 surfaced |
| research | eda10d82 | succeeded | 7 live-source lanes: upstream burst #629-#644, agent v0.122.3 SECURITY, Node 26 window, Actions recovery, dep majors, no-LICENSE, release-channel dormancy |
| roadmap | 1990e20b | succeeded | 5 mints rm-1494..1498 (frontier re-probed: all-lineage unlanded max rm-1493) + 10 riders; census 255/0-dup |
| prioritize | 7d78d179 | succeeded | batch 'security-pin convergence + floor-truth' selected with live collision clearance (3 open PRs + 2 live siblings) |
| stewardship | 7dd3aca6 | succeeded | stewardship_request: 9 surfaces, 8 must_remain_separate; 2 corrections (codeql two pin lines; pin-guard test nonexistent) |
| implement | 09aee48a -> a2830609 | succeeded (adopted) | first attempt complete on content, fold rejected for missing KTD13 attestation only; adoption attempt re-verified everything first-hand and attested (tree byte-identical) |
| targeted_tests | 59f1b33b | succeeded | 995ede17 was reaped (nothing durable); battery: 8 guard tests green, actionlint rc=0, eslint rc=0, digest stable a867f551.. pre/post |
| full_tests | e40234f2 | reaped | dispatched attempt aborted provider-side before any durable output (forensics: results/*.json + events/*.jsonl) |
| full_tests | 1714f3f4 | fold-rejected | performed the 2-token comment byte-align (codeql.yaml :56/:62 '# v4.39.0' -> '# v4') after discovering main had landed the same digest with main's comment style; fold rejected on attestation shape, align retained in tree |
| full_tests | 5485bea7 | succeeded | full_command verbatim -> ephemeral GitHub CI PR #884 ok:true (all checks green), ephemeral refs cleaned, digest aef2125b.. re-derived identical pre/post (a867f551 -> aef2125b drift = the 1714f3f4 2-token executable-comment edit) |
| compound | 5f9cade8 | succeeded | this record + ROADMAP compound riders/comments (static verification only) |
| independent_review | 7529b733 | NEEDS_CHANGES | ledger/doc-only findings F1-F5 (code layer verified sound); fixed by attempt 23c1b467 — see review-fix notes below |

## Batch identity (selected at prioritize, validated at full_tests)

'Security-pin convergence + floor-truth' — landed in tree, pending fold. DOUBLE-CLAIM CORRECTION (review F1): both headline pins were ALREADY on origin/main by 64cd2f6a (2026-10-17 10:24, inside this run's implement window) — codeql-action 6f2ac81f via sibling run d0d355ed's landing f157cb8b, reshaped by the 2026.10.43 adoption c51597ad; fro-bot/agent 7d273ac6 via the upstream #625 absorb in c51597ad. This cycle's SURVIVING pin-adjacent delta:
- U1 (rm-157 rider, SECURITY): AGENTS.md:105-107 mirror line truthed (v0.122.1 -> v0.122.3) + canonical-checkout mirror checked out v0.122.3; the fro-bot.yaml:352 pin bytes we wrote match what main independently landed (7d273ac643c8f9c0dc8615222677693dc337adef); contract 1.11.0 both sides (no src change).
- U2: codeql.yaml:56 AND :62 -> 6f2ac81f5cd81fe351a197ba0b00d91d03cd2aee with comment '# v4' — main's adopted comment style, byte-aligned at 16:44:50 by the rejected 1714f3f4 attempt so the --3way apply onto main resolves (main landed the digest with '# v4'); review F3 then closed the tree's split pins: scorecard.yaml:51 and release.yaml:357 -> the same digest with main's per-site bytes ('# v4' / '# v4.39.0'), making all four sites consistent in-tree and byte-identical to main post-merge.
- U3 (rm-276 rider): pnpm-workspace.yaml katex floor comment cites
  GHSA-238p-pmpm-9mq7 (>=0.11.0 <0.18.2, patched 0.18.2); override-floors-guard
  extended (katex@0 presence + GHSA-naming case).
- U4 (rm-1495 host half): ~/.local/bin/node repointed to nvm v24.21.0;
  docs/solutions/workflow-issues/host-node-default-below-engines-floor-2026-10-17.md.
- Ledger collateral: ROADMAP.md 255 defs/0 dup/max rm-1498 + riders + selection
  comment. Custody: 6 M + 1 ??, zero package.json/pnpm-lock churn.

## Durable lessons and prevention rules

1. Pin-bump derivation: `gh api git/ref/tags/<tag>` returns a TAG-OBJECT sha
   for annotated tags (codeql-action) — dereference via `git/tags/<sha>` to
   the commit; lightweight tags (fro-bot/agent) return the commit directly.
   Workflow comments carry the COMMIT sha, so the two-step is mandatory for
   annotated pins.
2. Host runtime selection: the load-bearing selector on this host is the
   ~/.local/bin/node symlink, not an nvm alias (no default alias exists;
   non-interactive shells never source nvm). Fix the symlink, not the alias.
   Recorded in the new docs/solutions entry (with the one-line reversal).
3. clonedeps mirror geography: .slim/clonedeps/repos/fro-bot__agent exists
   only in the canonical checkout (/work/projects/dashboard), never in run
   worktrees — re-provision there; AGENTS.md's mirror-version line must move
   with every workflow pin bump (it was the stalest of the three: v0.122.1).
4. Fold-rejection protocol: a rejected fold never rolls the worktree back;
   the next attempt VERIFIES and ADOPTS (byte-diff the archived delta vs the
   live git diff, re-verify every external claim, re-run the focused battery,
   emit the attestation). Re-doing work that is already correct wastes a
   cycle and risks drift.
5. Full-validation route for this repo (public + ADMIN): the authoritative
   github_ci_validate.py force-pushes ephemeral refs conductor/ci-<sha> and
   ci-base-<sha>, opens a DRAFT PR, awaits checks, then closes the PR and
   deletes the refs in a finally. Expect: transient PR numbers (this cycle
   #884), zero leftover refs, and a validation_base_commit that is NOT the
   worktree base (b69719b1 vs 55086dd) — the PR carries the delta applied to
   a fetched main, so 'checks green' proves the delta merges clean onto
   CURRENT main, which is the property the fold actually needs.
6. Reaped sessions are forensics, not verdicts: a provider/runtime abort
   (995ede17, 31.9s, session_reaped) leaves nothing durable; inspect
   results/<attempt>.json + events/*.jsonl before assuming work loss.

## Validation outcomes (recorded this cycle; not re-executed in compound)

- Targeted: corepack pnpm exec vitest run (8 guard tests across
  workflow-persist-credentials, base-drift-digest-readback, should-release,
  release-trigger-paths, fork-exclusion, prose-residue, override-floors,
  roadmap-length) -> green; actionlint 1.7.12 (container) on both workflows
  -> 0 findings; eslint on both workflows -> clean; validation digest stable
  a867f551.. before and after the battery.
- Full: full_command verbatim -> {'ok': true, pr_number: 884, commit
  587b948b22555770b39ca09f6b41a4c1c180e8f2, checks all green} on the
  ephemeral draft PR (now CLOSED, refs deleted); digest aef2125b.. re-derived
  identical pre-run and post-cleanup; porcelain preserved throughout.
- Digest bridge (review F2): targeted a867f551.. -> full aef2125b.. is exactly
  the 1714f3f4 2-token comment byte-align on codeql.yaml — an
  executable-classified surface — not silent drift.

## Review-fix addendum (attempt 23c1b467, 2026-10-18)

Review 7529b733 verdict NEEDS_CHANGES, findings F1-F5 all addressed: F1
pre-landing credit restored (above); F2 this record's corrections + ledger
rows; F3 split pins closed in tree (scorecard/release -> 6f2ac81f, main's
bytes); F4 '# v4' rationale recorded here and in the rm-157 rider; F5 amended
delta archive emitted (delegate/23c1b467...-post-review-fix.diff) with an
align-note beside the stale a2830609 archive. Post-fix targeted battery:
actionlint + eslint on all four workflow files, guard suites, --3way
rehearsal onto current main, digest re-derived — see the review-fix phase
result for values.

## Next-cycle context (candidates and hazards, ordered)

1. Fold-collision watch: PR #790 (Dockerfile + dependabot.yml — owns
   rm-1496/rm-1497 re-derivation), PR #798 (push/darkness lane — owns
   upstream #631 wire-or-fold), PR #787 (main.yaml health-probe), run
   7708ee2a (dependency minors VERIFIED in its tree), run 8ebc9eed (visual).
2. Next-cycle LEAD candidates: rm-1494 web/src ESLint coverage (census the
   violation count first); rm-116 branch-protection fill (live-API, zero
   file footprint, Actions recovered); dependency minors re-derived post-7708ee2a.
3. Windows: Node 26 LTS 2026-10-28 (rm-139 supersedes the v24.21.0 symlink
   target — move it to the v26 line then); vitest 5 / TS 7 / jsdom 30 /
   undici 8 majors (rm-271 window) pending rm-108 TS peer matrix.
4. Owner decisions owed: rm-1498 LICENSE (both fork and upstream unlicensed;
   Scorecard License=0); rm-714 release-channel retire-vs-provision
   (upstream ~43 calver releases/mo vs fork dead since 2026.08.15).
5. Upstream absorb: burst #629-#644 needs per-fix wire-or-fold dispositions;
   #638 (SW activate-on-refresh) diverges from our kill-switch SW invariant;
   wiki-write never-absorb still accurate (description re-read this cycle).
6. Foreign-lane reconciliation hint: test/operator-contract-agent-pin-guard
   exists nowhere yet — if that lane lands, reconcile its pin map with the
   v0.122.3 bump at fold.
