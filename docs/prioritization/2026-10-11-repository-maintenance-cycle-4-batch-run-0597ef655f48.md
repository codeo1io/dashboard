# Repository-maintenance cycle:4 batch — run 0597ef655f48 (implement)

- **Run**: `0597ef655f4840b0ab201093cd2c2e85` (repository-maintenance `e40efba012a741028d9d4ca3d394ea3c` cycle:4)
- **Phase**: implement, attempt `ead07b4030934791962ccada18c1d2d4`
- **Base**: `843d081` (run worktree; == `origin/main` at assess time — note `origin/main`
  has since advanced through the rm-252 adoption lineage to `aa4e14c`, which this batch's
  surfaces are adoption-neutral or integrate-reconcilable against)
- **Batch**: `redaction hardening + image-desync correctness` = **rm-939** + **rm-779**
  (selected in prioritize `1533700d…`; ledger extension rides separately as
  `delegate/262d096b7d534d18898dbcfa72b4497e.patch`, this run's roadmap artifact)

## rm-939 — stateless installation-token redaction (security)

`src/logger.ts` `sanitizeErrorMessage` already collapses a dotted
`ghs_<appid>.<jwt>.<sig>` token whole when the first dotted segment reaches the
JWT-shaped pass's 10-char floor (`ghs_604912.…` = 10 chars ✓). The measured gap:
a **short app id** (≤5 digits — early-registered GitHub Apps) leaves the first
segment under the floor, `gh[opsu]_\w{10,}` cannot cross the first dot, and the
**entire token leaked** (verified red-first):

```
sanitizeErrorMessage('install token mint failed: ghs_6049.eyJhbGciOiJIUzI1NiJ9.SflKxwRJSMeKKF2notreal')
=== (before) 'install token mint failed: ghs_6049.eyJhbGciOiJIUzI1NiJ9.SflKxwRJSMeKKF2notreal'
=== (after)  'install token mint failed: [REDACTED]'
```

Fix: the token class is now dot-inclusive — `gh[opsu]_[\w.-]{10,}` — so any
dotted `gh?_…` token collapses to ONE placeholder regardless of app-id length.
Rollout evidence: GitHub changelog 2026-10-02 (stateless `ghs_APPID_JWT` tokens
~520 chars, rollout complete). Tests: three new fixtures in
`test/auth.test.ts` (`sanitizeErrorMessage (FIX #5)`): dotted `ghs_` with
6-digit id (regression guard, already-green), dotted `gho_` (regression guard),
and the short-app-id case (red-first, now green; asserts no `ghs_` fragment, no
app id, no `eyJ`, exactly one `[REDACTED]`).

## rm-779 — cve-tripwire NODE_IMAGE desync (reliability)

`.github/workflows/cve-tripwire.yaml` pinned a literal `NODE_IMAGE:
'node:24-slim'` while the Dockerfile pins `node:24-trixie-slim@sha256:…` — the
resolve step grepped for `node:24-slim@sha256:…`, a string that can never exist
in the Dockerfile, so every fire failed at "Resolve pinned digest". The step now
**derives the image from the Dockerfile's own `ARG NODE_IMAGE=`** (single source
of truth), validates the digest-pin shape, and fails loud with actionable
errors otherwise. Verified locally: derivation returns
`node:24-trixie-slim@sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66`
and actionlint (container form) passes.

**Integrate note**: `origin/main`'s adoption lineage (`fc69b912` → `aa4e14c`)
deleted `.github/workflows/cve-tripwire.yaml` upstream-side. If the deletion
survives reconciliation, this fix rides wherever the tripwire is restored — the
derivation form is base-independent and correct at any Dockerfile that keeps an
`ARG NODE_IMAGE=` pin.

## Verification (focused battery, this phase)

- `corepack pnpm install --frozen-lockfile` rc=0 (post-sweep re-install)
- Red-first: `vitest run test/auth.test.ts` → 1 failed (short-app-id leak
  reproduced) BEFORE the fix; 71/71 passed AFTER
- `node --experimental-strip-types` probe: dotted short-app-id token → single `[REDACTED]`
- `eslint src/logger.ts test/auth.test.ts .github/workflows/cve-tripwire.yaml` rc=0
- `pnpm check-types` rc=0 (server + web + .opencode)
- `actionlint` (rhysd/actionlint container) on the edited workflow rc=0
- Acceptance grep: no bounded token-shape assumption remains repo-wide (the two
  `{40}` regexes are commit-SHA shapes, not credentials)

## Re-fold note (attempt `28e2add2…`, 2026-10-11)

The first fold of this tree (attempt `ead07b40…`) was rejected by the KTD13
attestation gate — `validation_evidence.changed_surfaces` was absent from the
result envelope. The TREE was already complete and is unchanged by this re-fold;
this attempt re-verified the battery first-hand (vitest `test/auth.test.ts`
71/71; `pnpm check-types` rc=0; focused eslint rc=0; actionlint container rc=0;
regex red/green repro) and re-declared the attestation. Engine-derived delta at
base `843d0819089496c0be6ce75442d3a29100bf1c09`: 4 surfaces — 2 executable
(`src/logger.ts`, `.github/workflows/cve-tripwire.yaml`) + `test/auth.test.ts`
+ this doc.

## Full-tests graft note (attempt `f5de8595…`, 2026-10-11)

The adoption deletion of `.github/workflows/cve-tripwire.yaml` on `origin/main`
**survived reconciliation** — verified at `558b14e9`: `git cat-file -e` → absent
(fatal: Not a valid object name); main carries 11 upstream-shaped workflows,
all `runs-on: ubuntu-24.04`. The full-validation graft (`github_ci.py
_prepare_validation_clone`, read first-hand this attempt) builds its base as
run-HEAD (`843d081`) **with `.github/workflows` replaced by current
`origin/main`'s workflows**, then `git apply --3way` of the worktree-vs-HEAD
diff — so a modification patch for a file main no longer carries can never
apply: attempt `ca827a26…` fast-failed (~20 s) with
`.github/workflows/cve-tripwire.yaml: does not exist in index` (while
`src/logger.ts` and `test/auth.test.ts` applied cleanly). Per the integrate
note above, the rm-779 hunk was restored to base `843d081` content; rm-939
(`src/logger.ts` redaction + the three fixtures) rides intact, and rm-779's
derivation-form fix rides wherever the tripwire is restored on the
post-adoption ledger.
