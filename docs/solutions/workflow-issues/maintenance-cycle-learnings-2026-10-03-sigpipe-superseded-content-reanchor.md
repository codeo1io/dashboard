---
module: 'dashboard'
tags: ['maintenance-cycle', 'sigpipe', 'pipefail', 'workflow-gates', 'superseded-by-content', 're-anchor', 'reaped-session-forensics']
problem_type: 'process'
---

# Maintenance-cycle learnings — SIGPIPE-proof gates, superseded-by-content, re-anchor discipline (cycle 1, run 2365e728d55e)

Lessons from the 2026-10-03 repository-maintenance cycle, recorded pre-review
from cycle evidence only (batch: rm-516 upstream-drift SIGPIPE cure + rm-515
monitoring redirect twin + rm-512 superseded-by-content disposition + rm-517
ops-hygiene disposition + the run's rm-512..rm-517 roadmap extension; targeted
engine-selector 28 files / 1088 tests green, authoritative ephemeral gates all
10 checks green on PR #360 @ 2181c4cdbe5a). Companion to
`maintenance-cycle-learnings-2026-10-01-audit-floors-basewide-lint.md` (cycle 2
of the sibling lineage) and the batch record
`docs/prioritization/2026-10-03-cycle-1-batch-run-2365e728d55e.md`.

## 1. `| head` under `set -o pipefail` is a live grenade in scheduled gates

**Shape.** `.github/workflows/upstream-drift.yaml` ran
`set -euo pipefail` and then piped `git log --oneline --reverse
origin/main..up/main` through `head -15` to build the drift listing. When the
producer's output outruns what the consumer reads, `head` exits, the producer
takes SIGPIPE, and `pipefail` promotes it to a step exit of 141 — the step dies
*before* the workflow's intentional `exit 1` and the alert-issue draft, so the
designed failure signal never fires.

**It is not a big-buffer corner case.** The 64 KiB "needs ~1400 commits to
break" reasoning is wrong in practice. A local replica (bash 5.1.16,
2026-10-03, transcript in the run's delegate spool) reproduced rc=141:

- synthetic fast-import repo, 3000 commits: 141 at 50/50 runs, `sed` cure 0/50
- the real dashboard history, 536 commits: 141 at 20/20, cure 0/20
- a **24-commit** range — today's actual drift shape: 141 at 20/20, cure 0/20

git writes in chunks; `head` reads one chunk, prints 15 lines, exits. The race
is lost almost always, not at scale.

**Static gates are blind to it.** actionlint 1.7.12 and the repo's eslint pass
this shape without comment — it is legal shell. Only a replica catches it.

**Prevention rule (now the house pattern).** Never end a
`set -o pipefail` pipeline in an early-exiting consumer. Prefer:

```yaml
# reads the whole stream, exits 0, still truncates
... | sed -n '1,15p'
# or materialize first when you need the full stream anyway
... > drift.txt
head -15 drift.txt
```

The sibling `base-drift.yaml` guards the same pattern with an `|| true`
fallback — weaker: it silences *every* failure in that pipeline, not just the
consumer's exit. `sed -n '1,Np'` is the surgical cure. Proof-of-life: the
Monday 2026-10-05 05:17 UTC first scheduled fire must end as exit 1 *with* the
alert issue (the designed RED at 24-behind), never signal 141.

## 2. Superseded-by-content: re-read main at implement before building a minted unit

rm-512 (logout body cap before buffering) was minted honestly at assess time
(anchor 2130050) — and was already cured on main three hours later by run
f3bd7d9's rm-497 landing (`src/read-body.ts` `readBodyCapped`: incremental
wire-byte counting, `cancel()` at the cap, declared-length precheck, shared by
logout + listener). The implement phase caught this only because it re-read
every unit at the fresh tip before touching code: rm-512 became a **no-op with
a superseded-by-content status** instead of a duplicate parallel cure that
would have conflicted at integrate.

Rule: a minted item is a *claim*, not a work order. The implement phase's
first act at a moved tip is re-adjudication against the live tree; when the
acceptance is content-satisfied by a landed sibling, record
`SUPERSEDED-BY-CONTENT ... do NOT re-implement` and spend the effort elsewhere.
The ledger keeps the entry for anchor-truth — deletions lose the lineage.

## 3. Two landings between compose and implement: reset and re-adjudicate, never merge stale

Between this run's roadmap composition (base 1000d222) and its implement
phase, main moved **twice** (b23057e: audit.yaml + ledger to 185 defs;
28396ca9: rm-497..501 + ledger to 190 defs). The worktree was porcelain-0 at
stale d2d8793, so nothing could be lost: `git reset --hard origin/main` (the
fleet rule) and then re-derive every anchor at the new tip — the rm-515/rm-516
line numbers, the single `| head` site in the workflow, the test-surface
truth. Every rider the roadmap phase wrote was re-verified verbatim rather
than trusted. The batch's five changed files were then built *on* 28396ca9, so
the eventual landing merge has no stale-base conflicts at all.

## 4. A reaped prior attempt is not adoptable — verify the typed artifact before consuming

The first full_tests attempt (df127279) had already run the full validation
successfully (its scratch log: ephemeral PR #359, 10/10 checks green) but the
session died provider-side before emitting a phase envelope. The engine's
"previous phase artifacts" summary still *described* it as if usable. Adoption
was declined on first principles: the typed
`delegate/df127279….json` was absent and the events file ended in
`session_reaped` with no `phase_result` — nothing to adopt. The redo then
verified the prior attempt's *remote* state was clean before re-running (PR
#359 closed, both ephemeral branches deleted) so the redo could not collide
with orphaned remote state, and landed its own authoritative run (PR #360,
digest `7f2ee9e1…` stable pre/post).

Rule: consume a prior attempt only through its typed artifact; when absent,
treat the attempt as failed-noop, audit its remote side-effects, and redo from
scratch. A narrative summary is not evidence.
