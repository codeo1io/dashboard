---
module: 'dashboard'
tags: ['maintenance-cycle', 'pnpm-lockfile', 'upstream-merge', 'first-hand-verification', 'conductor']
problem_type: 'process'
---

# Maintenance-cycle learnings — lockfile config-mismatch cure, first-hand verification discipline (cycle 3, run 73d35a6ca2bd)

Lessons from the 2026-10-04/05 repository-maintenance cycle, recorded pre-review
from cycle evidence only (batch B1: `pnpm-lock.yaml` divergence cure + Dockerfile
libpcre2 upgrade layer + workflow comment truth + ledger mints rm-647..rm-651;
targeted tests green on every impacted surface; full validation green ALL 10
checks at ephemeral draft PR #383, validation commit `38ed3e2f` — the first
all-green Main/CodeQL/visual stack since the 1e1e2f5 upstream-merge break).
Companion to `maintenance-cycle-learnings-2026-10-01-audit-floors-basewide-lint.md`
(cycle 2) and the batch record
`docs/prioritization/2026-10-05-repository-maintenance-cycle-3.md`.

## L1 — an upstream merge that keeps upstream's pnpm-lock.yaml silently reverts the fork's security floors

The incident (assess 9c87ded4, first-hand): the 1e1e2f5 upstream merge left
`pnpm-lock.yaml`'s `overrides` block contradicting `pnpm-workspace.yaml`'s floors
(brace-expansion 2.1.7/5.0.12, fast-uri 3.1.8, undici 7.30.0, toml 4.2.0+ vs the
stale `>=2.1.2/>=5.0.7`, `>=3.1.5`, `>=7.29.0`, toml MISSING) with the resolved
set regressed below the floors (fast-uri 3.1.6, undici 7.29.0, toml 4.1.2,
brace-expansion 5.0.9). Every install-dependent workflow then died at
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` — Main/CodeQL/Release/visual red (4 of 5,
Scorecard green) for ~6.5h of red-main merges, because nothing blocks a merge
over red checks (that half of the lesson is rm-116's to fix).

Why it slips through: git reports no conflict *inside* either file — both are
individually well-formed; only the cross-file contract broke. A green-tree
lockfile from before the merge (ff19de2-era) versus the merged one differs
exactly in the overrides block and resolved set.

Cure recipe (implemented at base 306a972 by implement 54ee6389):

1. `pnpm install --no-frozen-lockfile` — regenerate against the *fork's* floors
   (this cycle: 86 insertions / 123 deletions).
2. Verify the lockfile `overrides` block mirrors `pnpm-workspace.yaml` floors
   exactly; verify the resolved set moved to/above each floor (undici 7.30.0,
   toml 5.0.0 verified).
3. `pnpm install --frozen-lockfile` must exit 0 — that is the exact step all
   four red workflows died at.
4. `pnpm audit --recursive` must report zero known vulnerabilities.
5. Scope-check the diff by package name: only the four affected subtrees plus
   the overrides mirror may move.
6. Re-hash the lockfile after every `pnpm` invocation (auto-rewrite hazard);
   the blob must stay byte-stable (`9abdcdd5` throughout this cycle).

Prevention rule: an upstream absorb must NEVER resolve a `pnpm-lock.yaml`
conflict by taking upstream's side — upstream regenerates against *its* floors
(fro-bot dep chores), so every upstream-ward resolution of that hunk is a
silent fork-security-posture revert. Regenerate instead. This document and
`upstream-lockfile-content-merge-2026-09-20.md` together cover both lockfile
failure classes of upstream absorbs: content-merge (missing entries after a
hand-merge) and config-mismatch (overrides drift), respectively.

## L2 — verify a prior attempt's remote-state claims first-hand before keying decisions to them

The first implement attempt (b910a512) claimed origin/main had fast-forwarded
306a972 → `379747a` via a sibling run's lockfile landing, and folded its batch
shape around that claim. The re-dispatch disproved it in four cheap steps,
each a single command:

- `git fetch origin main && git rev-parse origin/main` — unmoved at 306a972.
- `git cat-file -t 379747a` — not a valid object; the commit never existed here.
- worktree reflog — the last HEAD move was 00:59:44Z ff a45df51 → 306a972; the
  claimed fast-forward never ran.
- the archived `batch-b1-final.diff` — `grep -c '^diff --git'` returned 1
  (ROADMAP.md only), not the claimed multi-file batch.

Consequence: the sibling-race precondition had NOT fired, so the lockfile cure
was still to be executed — the entire batch changed shape on one re-probe that
cost seconds. Rule: any claim about remote state, sibling landings, or
"already done" work that arrives via a prior attempt's narrative is re-probed
at execute time, always; reflog plus `cat-file -t` are the cheapest disproof
pair for claimed git history.

## L3 — a failed prior attempt may be an infra death, not a verdict

The targeted_tests phase's prior attempt (d6794008) "failed" in 32 seconds.
Its spool event log read: `delegate_turn_started` → `session_reap_failed`
(Delegate session not found for this conversation) → `delegate_turn_completed(failed)`
— zero work events, and the typed artifact JSON was absent. Nothing to adopt,
nothing to refute: the phase was redone, not diagnosed.

Forensics recipe: before treating any failed prior attempt as content
evidence, read its events jsonl under the conductor delegate spool and check
for the typed artifact. An infra death (session reap, provider failure) has no
work events and no artifact; a content failure has both. Do not inherit a dead
attempt's conclusions in either direction.

## L4 — an annotated tag object is not a commit: peel before any action-pin decision

Research 7d897800 reported the codeql-action pin `2892aa5` "absent from the
last 100 tags" versus sha `88585263`, and proposed swapping the pin. First-hand
at implement: the GitHub tags API and a bare tag listing return TAG-object
shas (`88585263` is the v4.38.2 *tag object*), while
`git ls-remote refs/tags/v4.38.2^{}` peels to the commit
`2892aa5e19bbd11bc0cff5427e3b750a04d9e3c2` — exactly the repo's pin. The pin
was current (v4.38.2, latest) and the proposed swap would have pinned a
non-commit sha, which `uses:` cannot resolve: the workflows would have broken
in a "fix". rm-650 closed as resolved-no-change-needed with comment-only
accuracy fixes at the four real sites.

Two rules: every action-pin verdict goes through the `^{}` peel (annotated
tags are objects, not commits); and count pin sites by repo-wide grep, not a
remembered list — earlier phases said 2-3 sites, the grep found 4.

## L5 — read the file, not the prior phase's summary of the file

The stewardship request described an rm-133 ":83-90 selective strip" leaving
undici/brace-expansion inside the release image, and the batch planned a
bundled-npm name-sweep accordingly. The execute-time read of the Dockerfile
found the runtime prune RUN already removes `/usr/local/lib/node_modules/npm`,
corepack, and every bin shim *wholesale* — the built image carries none of the
bundled-npm findings, and the sweep was correctly not done. The
container-equivalent trivy ladder confirmed the real posture: base digest 8
fixed HIGH/CRITICAL findings → after the existing wholesale strip 1 (only
libpcre2) → after this batch's upgrade layer 0.

Addendum (2026-10-06, review-fix fab25700): that ladder was DB-dated and the
date mattered — trivy's 2026-10-06 DB indexed a perl-base wave
(5.36.0-7+deb12u3: 3 CRITICAL + 4 HIGH, all fixed in 5.36.0-7+deb12u4) the
2026-10-05 DB did not, so the "0" above was stale within a day and the
independent review's fresh-DB Enforce replica found 7 fixed HIGH/CRITICAL in
the batch's built image. The upgrade layer gained `perl-base`; the rebuilt
image ships perl-base 5.36.0-7+deb12u4 and scans 0 under the current DB
(exit 0). Rule extended: trivy ladders are a function of the DB snapshot —
record the DB date beside every ladder, re-scan on release day, and never
trust yesterday's count.

Rule: every surface about to be edited is re-read at execute time. Phase
summaries route attention; they do not establish scope.

## L6 — ephemeral-PR full validation: a poll-loop network blip is a rerun, not a diagnosis

Run 1 of the full-validation command died mid-poll with
`gh pr checks failed (1): error connecting to api.github.com` and rc=1; its
ephemeral PR auto-closed through the script's finally block. The verbatim
rerun went green, ALL 10 checks pass/SUCCESS at PR #383. This is the second
observed occurrence of the failure mode documented in the landed
`conductor-full-validation-ephemeral-pr-public-repo-2026-10-04.md` — treat it
as transient by default: rerun the command verbatim before diagnosing content.

## Next-cycle pointers (compounded context, 2026-10-05)

- Open ledger candidates minted this cycle: rm-648 (weekly digest-pinned trivy
  tripwire), rm-649 (static read-only-invariant guard test), rm-651 (rm-596
  order/host flake + node-26 `--localstorage-file` recipe doc). rm-650 closed
  resolved-no-change-needed.
- rm-116 (branch-protection fill): ride the FIRST green window after this
  batch lands — the required-check list is evidenced by PR #383's pass set;
  never fill while the matrix is red.
- Upstream window: exactly one absorb-nil commit (4415c97, a renovate.yaml pin
  bump; this fork carries no renovate.yaml); the first content-only absorb
  candidate is #496 (public operator push privacy policy), routed through
  rm-252's next genuine window; the wiki-writer trilogy stays never-absorb
  (rm-259 disposition).
- Verify the 2026-10-05 scheduled fires live at the next assess (audit.yaml
  03:37Z, upstream-drift 05:17Z, canary 05:23Z) — none of this run's phases
  recorded their outcomes; next audit fire 2026-10-12T03:37Z.
- Hygiene: 47 + 27 stale `conductor/ci-*` origin refs accumulated from killed
  validation waits (observed during full_tests) — a standing sweep candidate.
- Sibling same-incident ledger claims (afd0b7c13ad7 rm-645/646, 22bb8e8b
  rm-636..638, b3491252 rm-617/618, per the prioritize-phase census) —
  reconcile-by-content at whichever integrate lands first.
- Stranded same-incident CONTENT branch on origin (review 5a2fece4,
  2026-10-06): `conductor/run-a2def4ce34dc` @`660a80d` (parent a45df51,
  behind main) — CI-validated lockfile cure (ephemeral PR #388, 11/11 green)
  whose lockfile blob is byte-identical to this batch's (`96db787f`), a
  libpcre2-only Dockerfile (no perl-base cure), and a `lockfile-guard.yaml`
  absent from main that registers as a phantom workflow on the repo. Landing
  must pick ONE lineage — this batch's (review-verified, perl-base-complete),
  deleting the stranded branch at landing; a third pushed cure would compound
  the stranding.
