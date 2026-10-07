---
title: Push-time conductor-ref-residue sweep checklist
date: 2026-10-07
category: workflow-issues
module: repository-maintenance
problem_type: delivery_hygiene
component:
  - origin refs
  - github_ci_validate
  - residue-sweep workflow
severity: medium
applies_when:
  - landing a conductor run batch (commit/push/pr phases)
  - dispatching .github/workflows/residue-sweep.yaml
  - auditing origin for stranded validation refs
tags:
  - conductor
  - residue-sweep
  - rm-159
  - push-stage
---

# Push-time conductor-ref-residue sweep checklist

Authored at review-fix (run 00f7bf29 cycle 1, review 52e54b5b finding F2, fix
attempt 6236e88b) to satisfy rm-159's acceptance clause: "the sweep checklist
recorded in a solutions doc so future landing phases clean their own residue at
push time". This is the standing manual protocol; `.github/workflows/residue-sweep.yaml`
automates steps 3-4 once it is on the default branch.

## 1. Census BEFORE any push

```
git ls-remote --heads origin | grep -E 'refs/heads/conductor/' | grep -vE 'refs/heads/conductor/run-'
gh pr list -R codeo1io/dashboard --state open --json number,headRefName
```

Record the count and list. Flag every open PR whose `headRefName` no longer
resolves on origin (dangling PR — cf. #390): it is debris the sweep's dry-run
log will confirm before closure.

## 2. Preservation rules (never violate)

- `conductor/run-*` refs are preserved UNCONDITIONALLY — delivered-vanished
  recovery stratum; the sweep never touches them and neither does this checklist.
- The 14-day floor is a TIP-DATE floor (resolve each tip with
  `git log -1 --pretty=%ct <sha>`), never a push-date floor: a ref younger than
  14 days stays no matter how obviously stale it looks.
- Never delete refs outside the two engine patterns (`conductor/ci-<sha>`,
  `conductor/ci-base-<sha>`) without a recorded ROADMAP rider.

## 3. Dispatch protocol — dry-run first, always

1. `gh workflow run residue-sweep.yaml --ref <default-branch> -f dry-run=true`
2. READ the run log: census, per-ref sweep-list with ages, the would-delete /
   would-close plan. Confirm the plan against your own census from step 1.
3. Only then dispatch the same window live:
   `gh workflow run residue-sweep.yaml --ref <default-branch> -f dry-run=false`
4. The LIVE gate is the exact trimmed lower-case literal `'false'` (hardened
   2026-10-07, review 52e54b5b F3): `'True'`, `'FALSE '`, `'yes'`, `''`, or any
   other UI/API string-coercion shape stays DRY — fail closed.

## 4. Self-clean obligation at every landing

- The ephemeral CI route (`github_ci_validate.py`) closes its own validation PR
  and deletes its own `ci-<sha>` / `ci-base-<sha>` branch refs in its `finally`
  block — a REAPED run strands them, so after every landed run verify your run
  left zero fresh `conductor/ci-*` refs and zero dangling validation PRs.
- MANUAL pushes (a hand-pushed branch or PR) must replicate this by hand in the
  same session: close your own PRs, delete your own validation refs.
- Fleet context: ~46 stranded refs accumulated before this checklist existed
  (observed 2026-10-06); batch deletion is a sanctioned push-stage action.

## 5. First-live-run acceptance (rm-159 remains open until)

The first dispatched dry-run log against the live census plus the first live
dispatch (exact refs deleted + PRs closed in the log) close rm-159's remaining
acceptance halves; record them as dated riders on the item.

Census snapshot at review time (2026-10-07): 132 `conductor/*` heads, 48
`ci-*`; PR #390 dangling — see the F1 record in
`docs/prioritization/2026-10-06-repository-maintenance-cycle-1-batch-run-00f7bf29ef2a.md`.
