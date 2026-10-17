# Local Gates — local pre-flight battery (rm-1454)

> As of 2026-10-16 Actions is REVIVED (see the dated revival note at the
> bottom): the CI jobs are again the authoritative remote gate, and this
> battery is the local pre-flight you run before pushing/landing anything.
> The suspension-era record below is kept verbatim for history.

GitHub Actions on this repository WAS suspended repo-scoped from
2026-10-09T01:59:31Z until the 2026-10-16 revival:
workflow dispatch returned `422 "Actions has been disabled for this repository"` even though the
permissions API reported Actions enabled. Zero runs of any workflow happened in that window, and 57
commits landed on `main` through `3e3664c` with no CI verification. During that window the battery
below was the canonical interim acceptance suite ("gates green" in a cycle artifact meant this
battery — not CI); today it remains the fastest full local check.

## The one command

```sh
pnpm gates
```

`pnpm gates` runs, in order and stopping at the first failure:

1. `pnpm check-types` — server, web workspace, and `.opencode` type checks.
2. `node scripts/lint-baseline.ts` — the lint gate at the frozen baseline (next section).
3. `pnpm test` — the Vitest server suite, then the web suite. `pretest` rebuilds `web/dist`
   first; direct `vitest run` invocations bypass that rebuild and 404 on a stale bundle (see
   `docs/solutions/workflow-issues/targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md`).
4. `pnpm build:web` — a standalone client build. Redundant with `pretest` by design: it proves
   the build in the battery's own right, after the suites.

## The lint baseline

`pnpm lint` is fully green since 2026-10-17: the rm-100 lint debt (exactly 50 errors, all in
`ROADMAP.md` — 47 trailing spaces, 3 unreferenced link labels) was cured in-tree by the
full_tests pass of run 747806ff (whitespace fix + label-ref escapes), and `FROZEN_LINT_ERRORS`
in `scripts/lint-baseline.ts` was re-frozen to 0 in the same change. The gates still run
`scripts/lint-baseline.ts` rather than a plain `pnpm lint`: it names the count and attributes
every error to a file, so the first new lint error anywhere in the tree stops the battery
loudly instead of failing opaque.

Re-freeze procedure: when the debt is deliberately resized again, update `FROZEN_LINT_ERRORS`
in `scripts/lint-baseline.ts` and the count quoted here in the SAME change, citing the ledger
id that moved it. At zero the baseline step degenerates to "lint must be fully green".

## Workflow edits: actionlint by reference

`pnpm gates` does not lint workflow YAML. Any change under `.github/workflows/` additionally
runs actionlint via the container form — see
`docs/solutions/workflow-issues/actionlint-pipx-missing-container-form-2026-09-19.md` — which
assumes nothing from the host. Keep doing that manually while CI is dark; the battery above
covers everything else.

## Post-unsuspension sequencing (in order)

1. **Confirm revival with the two-sided probe**: check the newest run repo-wide AND fire a
   manual `workflow_dispatch`. A `422` on dispatch means still suspended, whatever the
   permissions API says.
2. **Fill branch protection (rm-116 / rm-878 family) only AFTER checks can actually run.**
   Required checks that cannot start would block every future landing. The protection object
   today is a shell: no required contexts, admins not enforced.
3. **Close the stranded PRs in one sweep**: the eight conductor `ci-*` PRs (#720, #712, #710,
   #709, #706, #705, #533, #521) and the stale #508/#509 — rebase or close per
   `docs/runbooks/superseded-batch-pr-disposition.md`.
4. **Re-measure the scorecard against the frozen baseline**: OpenSSF Scorecard 7.4 at
   2026-10-09T01:56:03Z (three minutes before the last run; CI-Tests=4, Code-Review=0,
   Branch-Protection=-1). The post-revival delta is the honest measure of what the dark window
   cost.

**Revival note (2026-10-17):** Actions revived on 2026-10-16 — the last dark run was
2026-10-09T01:59:31Z; first post-revival green Main run on `main` landed 2026-10-16T17:12:38Z,
and ephemeral conductor CI-validation PRs cycle again. This battery remains the local
pre-flight for landing candidates; the CI jobs are again the authoritative remote gate.

## Never ride the dark window

Do not push, dispatch, or open anything that expects CI to run while the suspension holds.
Remote full-validation attempts while dark deterministically burn the 3600-second validation
budget and strand PRs — sixteen-plus hours at zero check-runs is the observed signature.
Landings while dark ride this battery instead; the CI jobs are the post-revival confirmation,
not the gate.
