---
module: 'dashboard'
tags: ['maintenance-cycle', 'ephemeral-ci', 'path-parity', 'should-release', 'transient-base-gap', 'validation-base', 'reaped-attempt', 'changed-surfaces-attestation']
problem_type: 'process'
---

# Maintenance-cycle learnings — transient base-gaps redden inherited
validations (cycle 1, run f509562edb7a)

Lessons from the 2026-10-17/18 repository-maintenance cycle, recorded
pre-review from cycle evidence only (batch "truth-in-detection": rm-1478
base-drift ARG-tag derivation + rm-1479 lockfile-guard re-land in-tree half +
rm-1482 logger cookie/session redaction + AGENTS.md Fro Bot paragraph truth +
the ROADMAP ledger layer; targeted battery 3 files / 77 tests green; the
authoritative ephemeral CI gate green on PR #902 @ snapshot b5181d8a,
validation base 71b18c07). Companion cycle record:
`docs/prioritization/2026-10-18-repository-maintenance-cycle-1-compound-run-f509562edb7a.md`.
Echoes `maintenance-cycle-learnings-2026-10-03-sigpipe-superseded-content-reanchor.md`
(lessons 2 and 4 below re-confirm its rules on this cycle's own evidence).

## 1. A gapped validation base reddens every ephemeral run that inherits it

**Shape.** The engine's authoritative full gate (`scripts/github_ci_validate.py`)
snapshots the working delta onto a freshly-fetched `main` and runs the real CI
on an ephemeral PR. During this cycle `main` was **transiently gapped** in the
release-trigger corpus pairing: commits existed (11ce348a; later the run-4
base 71b18c07) where `.github/workflows/release.yaml`'s `on.push.paths` already
listed `scripts/gzip-static-sidecars.ts` but `scripts/release-paths.ts`'s
corpus did not — the two-sided lock that `test/should-release.test.ts` enforces
was broken *on main itself*, mid-heal (healed at debde800, 22:25Z).

Every ephemeral validation rebased onto a gapped base therefore failed its
Test job **regardless of the candidate delta**:

```
every workflow paths entry is accounted for by the guard corpus
expected [] deeply, received ['scripts/gzip-static-sidecars.ts']
```

Three consecutive executions burned (runs 39075095330, 39075518715,
39076128667) before the base — not the delta — came under suspicion. All three
failed *only* that one suite; every job touching the batch's own surfaces was
green in every run. That signature is the tell.

**The 30-second diagnosis.** When a full-gate failure is confined to the
path-parity suite, probe the base, not your tree:

```sh
gh api repos/codeo1io/dashboard/contents/.github/workflows/release.yaml?ref=<base> \
  --jq .content | base64 -d | grep -c gzip-static-sidecars
gh api repos/codeo1io/dashboard/contents/scripts/release-paths.ts?ref=<base> \
  --jq .content | base64 -d | grep -c gzip-static-sidecars
```

1/0 (or 0/1) at the `validation_base_commit` means the failure is inherited:
the snapshot inherited main's gap and your delta does not carry the missing
side.

**Cure.** Mirror main's own healed hunks in-tree — add the missing path to
BOTH sides (`HARD_RELEASE_FILE_PATHS` in `scripts/release-paths.ts` and
`on.push.paths` in `.github/workflows/release.yaml`), byte-matching the heal
commit (debde800 here). The pairing then rides every future snapshot and
self-heals any still-gapped base: run 4 passed *on base 71b18c07, which was
itself still gapped* — the in-tree immunity is load-bearing, not cosmetic.
Because the hunks mirror main's heal, they land idempotently once main is
healed (verify at fold time that the merge does not duplicate the paths
entry).

**Prevention rule.** Path-parity-only red on an ephemeral validation ⇒ probe
the base's two sides before debugging the candidate delta. Never "fix" it by
whitelisting the orphan path in the corpus without adding the workflow side —
that would weaken the bidirectional lock (rm-248) to hide an upstream wound.

**Durable cure (unminted).** Land the two sides atomically — a single-commit
rule for release-path edits, or a pre-merge consistency check in the guard's
own job. Recorded as a next-cycle roadmap lead (ledger next free rm-1483 at
composition; the next cycle's roadmap phase must re-probe the all-lineage
frontier before minting). Tracked by the rm-248 rider of 2026-10-18.

## 2. Re-scope against live main before building — the dead-arm save

The prioritize phase re-verified every candidate against live `origin/main`
and found the worktree base 36 commits behind: `Dockerfile` was ALREADY
re-pinned to `node:24-trixie-slim@sha256:7f486cab…` (55086dd) with Release
38992359530 green — rm-1478's digest-re-bump arm was satisfied before the
batch ran. The batch was re-scoped to the surviving arms (tag-derivation
port, forced-run proof) instead of redoing a landed cure. Same rule as the
2026-10-03 lesson: a minted item is a claim, not a work order; re-adjudicate
at the live tip.

## 3. A reaped attempt is not adoptable — and the tree is the tiebreaker

Two attempts this cycle died provider-side mid-turn:

- targeted_tests 26992634 — events log shows `delegate_turn_started` → one
  `delegate_turn_progress` → `session_reaped`; zero commands ever executed.
  Redone from scratch and declared.
- compound ed6fe7e6 — events log shows `delegate_turn_started` →
  `delegate_turn_progress` → `session_reaped` → `delegate_turn_completed
  failed`; no typed artifact; and the repo tree proved no bytes were written
  (mtime census: nothing newer than the full_tests turn's 2026-10-17 22:41;
  porcelain census identical to the recorded full_tests end-state; zero
  compound-phase touchpoints in ROADMAP.md).

Rule (re-confirmed): consume a prior attempt only through its typed artifact
verified against THIS work order's identity and tree census; when absent,
audit the durable trail (events log + tree mtimes + porcelain) for residue
before redoing. A narrative summary is not evidence; an absent envelope is
not proof nothing happened.

## 4. Phase envelopes must declare the full changed-path census (KTD13)

The fold gate rejects an implement/compound envelope whose
`validation_evidence.changed_surfaces` is empty or declares executable paths
outside the engine-derived tree delta (`git diff --name-only base` ∪
untracked). The check is one-directional, so **declare the full census —
tests, docs, and markdown included** — it passes and cannot trip the
cross-check. Dashboard-specific wrinkle: the engine classifies `tests/`
(plural) as executable but this repo's suite tree is `test/` (singular), so
`test/*.test.ts` counts as non-executable and a fold's executable delta is
`src/**`, `scripts/**`, and `.github/workflows/**` only. An omitted
attestation cost this cycle one implement redo (repaired in 7b4c012a with an
engine-code replay proving both rejection families). Engine-side fix
(`test/` in `EXECUTABLE_PREFIXES`) is already filed as provisional work from
run 43cf6bc3 — still open.
