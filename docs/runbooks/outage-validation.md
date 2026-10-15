# Validating Changes While GitHub Actions Is Dark

Sometimes GitHub Actions cannot create runs platform-wide (observed 2026-10-09 through at least
2026-10-15: pushes land, `gh run list` shows nothing newer than the outage start, runs stay
queued). In that window a green-looking branch is NOT validated: "passing" and "cannot register"
are indistinguishable in the rollups. This runbook is the standing cure — how to recognize the
window, prove a change locally with the same CI job set, keep conductor declarations honest, and
clean up the CI debris the outage leaves behind.

## Recognizing the dark window

Any of these signatures means the window is open — do not burn an hour waiting on CI:

- `gh run list` (with `--limit 5`) shows no run created for a fresh push, and existing runs hang
  in `queued`.
- A conductor CI-validation draft PR closed at exactly `createdAt + 3600s` — that is the
  60-minute check-wait timeout firing, not a code failure.
- The status feed itself: `GET https://www.githubstatus.com/api/v2/components.json` lists an
  `Actions` component with a degraded status. Since rm-1447 the monitoring view surfaces this
  automatically (info-toned platform banner) via the `platformStatus` annotation on
  `/api/monitoring`; `actions: null` with `overall: major|critical` also trips the banner.

The banner is an annotation, not a gate: annotation absence (feed unreadable) never blocks or
degrades the snapshot — the server fails open in both directions.

## The local gate set (CI-equivalent proof)

Run the same job set CI would run, from the worktree root:

```sh
pnpm install --frozen-lockfile   # worktree node_modules can be swept between phases (~10-60s from the shared store)
pnpm check-types                 # server + web/ + .opencode
pnpm lint
pnpm audit --recursive
pnpm test                        # pretest rebuilds web/dist, then Vitest (root + web legs)
```

Reference baseline at `a385ca5` (2026-10-15, during the outage): 58 + 34 test files,
3057 + 1213 tests green, audit clean. Known flakes to not misread as regressions:

- `test/prose-residue-guard.test.ts` can time out on a COLD first full run (walks
  `node_modules` before filtering); a warm rerun is green.
- Direct `npx vitest run` bypasses `pretest` — suites that hit `/` will 404 on a stale or
  missing `web/dist`. Build first (`pnpm build:web`) or use `pnpm test`.

## Focused-test discipline when full is out of budget

- Root leg: `npm exec -- vitest run <files...>`. Web leg: `vitest run --config
  web/vitest.config.ts <path>` — invoking `npm exec` from inside `web/` hoists the cwd and
  reports `No test files found`; run from the root with the explicit config.
- A NEW test file that is still uncommitted is invisible to `git ls-files`-based impacted-test
  derivation — run it by explicit path, always.
- A change that touches a manifest (`package.json`, lockfiles) escalates any narrow run to
  full-scope semantics; do not spend effort proving a narrow scope over a manifest change.

## Keeping conductor declarations honest

Engine release 753f4642, verified during the outage window:

- A client/docs-only delta (no executable surface) leaves the dispatch validation digest
  unchanged — declare it verbatim; `scope: none` records skip digest checks entirely.
- `changed_surfaces` must include the engine-derived delta (`git diff --name-only <base>` plus
  untracked files) or the fold rejects the result.
- The canonical `github_ci_validate` fallback is doomed while Actions is dark (signature: PR
  closed at `createdAt + 3600s`). A deterministic local substitution with the same CI job set
  plus the focused suites IS the accepted outcome — record it plainly in the result evidence.

## CI debris cleanup after a timed-out canonical run

- The engine closes its own draft PR and deletes the head ref on timeout. What strands is the
  base ref (`conductor/ci-base-<sha12>`): verify no open PR still uses it
  (`gh pr list --state open --json headRefName`), then `git push origin --delete <ref>`.
- The snapshot commit remains fetchable via `git fetch origin refs/pull/<N>/head`; verify a
  snapshot carried your tree with blob compares (`git rev-parse <sha>:<path>` vs
  `git hash-object <path>`) before trusting any cached verdict.
- Never delete another run's refs — a sibling same-day PR closed at `createdAt + 3600s` is a
  fellow victim of the outage, not abandoned garbage.

## When the lights come back on

- Re-run the canonical validation for anything that shipped on local proof alone.
- The `Fro Bot` workflow on this fork stays `disabled_manually` until a `FRO_BOT_PAT` secret is
  provisioned — the outage ending is not a reason to re-enable it (re-enabling resurrects a
  failing cron). Check `gh workflow list` and `gh secret list` before flipping anything.
