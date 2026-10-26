---
title: Full-suite validation substitute under a repo-scoped GitHub Actions suspension (two-sided probe + six-job local mirror)
date: 2026-10-16
category: workflow-issues
module: ci
problem_type: validation-substitute
component:
  - .github/workflows/main.yaml
  - pnpm
severity: high
applies_when: Actions runs are frozen and a full-suite gate (full_tests fold) still demands a passed record
tags:
  - actions
  - ci
  - validation
  - conductor
---

# Full-suite validation substitute under a repo-scoped Actions suspension

## Problem

`github_ci_validate.py` (the engine's canonical full-suite route: push a
validation branch → open a PR → watch checks) cannot conclude when GitHub
Actions is suspended at the repo scope: the PR's checks never start, so the
script polls until its deadline and the phase can never produce a green record
honestly. Declaring `outcome: failed` on the honestly-run-but-dead command
makes the fold retry a green tree forever.

The suspension is two-sided and easy to misread: `GET /actions/permissions`
still reports `enabled: true` while `POST /actions/workflows/main.yaml/dispatches`
returns `422 Actions has been disabled for this repository.` and `gh run list`
is frozen. A one-sided probe (permissions only, or a 404-prone `main.yml`
dispatch) proves nothing.

## Solution

1. **Prove CI-deadness with the two-sided probe** (minutes, no repo litter):
   - `gh api repos/<owner>/<repo>/actions/permissions` → `enabled: true`
   - `gh api -X POST repos/<owner>/<repo>/actions/workflows/main.yaml/dispatches -f ref=main` → 422 (use `main.yaml`, the real filename — `main.yml` 404s and proves nothing)
   - `gh run list --repo <owner>/<repo> --limit 3` → newest run timestamp frozen
2. **Do NOT run the doomed canonical command** — with checks provably unable
   to start it only creates a never-checking PR/branch.
3. **Mirror every Main job locally, verbatim** (this repo, under Node 24 —
   `export PATH=~/.nvm/versions/node/v24.21.0/bin:$PATH`; PATH node is 22 and
   `engines` demands >=24):
   - J1 Setup: `pnpm install --frozen-lockfile`
   - J2 Design Check: `npx --yes impeccable@3.2.1 detect --json web/src web/privacy.html` → must print `[]` (beware: a cold npx cache inside a command-substitution can capture an EMPTY string and fake a failure — re-run warm before believing it)
   - J3 Check Types: `pnpm check-types`
   - J4 Lint: `pnpm lint` (repo-wide — see the lint-debt trap below)
   - J5 Check Workflows: `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color`
   - J6 Test Scripts Load: node `import()` loop over `find src -name '*.ts' ! -name '*.test.ts'`
   - J7 Test: `pnpm test` (pretest builds `web/dist`; root + web vitest)
4. **Declare the fold record as the substitute**: `scope: full`,
   `outcome: passed`, `command` = the dispatch `full_command` verbatim,
   deviation disclosed in `trigger_reason` plus one HIGH finding, and the
   canonical CI re-validation required once the suspension lifts.
5. **Digest correctness**: re-derive
   `validation_digest(<campaign base sha>, '.')` with the release-venv python
   AFTER the work — it takes the RESOLVED base sha (a literal `'HEAD'` or
   `None` hashes differently and will fake a mismatch); a byte-equal re-derivation
   proves the declaration is current, not stale.

## Lint-debt trap (J4 prerequisite)

The Lint job lints the whole repo, so a pre-existing render debt in ROADMAP.md
(47 trailing-space lines + one `markdown/no-missing-label-refs` from an
unbackticked bracketed path list) fails the mirror even though the batch never
touched those files. Cure repo-side (strip trailing whitespace; backtick-wrap
bracketed lists) — it is safe (roadmap-length-guard checks length only) — and
record that the next managed render may re-introduce it (durable cure stays
renderer-side; ledger rm-680).

## Prevention

- Keep the watchdog (`scripts/actions-darkness-watch.ts`, exit 3 = DARK) wired
  into the estate checks so a frozen Actions is surfaced as a signal, not
  discovered by a failed gate.
- Full-suite gates under a suspension should re-run the two-sided probe before
  the fold: if the suspension lifted, canonical CI supersedes the mirror.
