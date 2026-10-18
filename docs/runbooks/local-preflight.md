# Local Landing Preflight

`scripts/preflight.ts` is the one-command, CI-independent verification battery for a
landing batch. It exists because of the October 2026 Actions outage (rm-1437): while
run creation is dark for schedule triggers, local verification is load-bearing, so the
doctor must work fully offline and never depend on Actions being reachable. It bundles
the exact gate set the batch gate runs later — nothing new, nothing skipped silently.

## Usage

```sh
node scripts/preflight.ts            # full battery
node scripts/preflight.ts --list     # list check names + one-line detail
node scripts/preflight.ts --skip=tsc-server,eslint   # skip by check name (comma-separated)
```

Exit code 0 = every check ok (warnings allowed); 1 = at least one failure. The script
performs no repository writes and no network access — every check is a local read,
spawn, or file mtime comparison.

## Checks

| name | class | what it proves |
|---|---|---|
| `porcelain` | info | `git status --porcelain` — lists drift, never fails (a batch in flight is dirty by definition) |
| `conductor-untrack` | fail | no tracked `.conductor/` breadcrumbs (the post-merge landing trap — see the solutions doc on validation-clone excludes) |
| `typescript-server` | fail | `tsc --noEmit` (strip-only server) |
| `typescript-web` | fail | `tsc --noEmit -p web/tsconfig.json` |
| `typescript-opencode` | fail | `tsc --noEmit -p .opencode/tsconfig.json` |
| `eslint` | fail | `eslint --no-cache` repo-wide |
| `roadmap-guards` | fail | `vitest run` on the roadmap length + render guards |
| `webdist-freshness` | fail | `web/dist` is not older than any `web/src` input (the targeted-vitest 404 trap) |
| `clonedeps-lockstep` | warn | `.slim/clonedeps.json` mirror pin matches `fro-bot.yaml` (rm-1510) — a drifted mirror degrades source inspection, it does not break a build |
| `actionlint` | warn* | container-form actionlint when a runtime exists; warn-skip otherwise |

`actionlint` fails when a container runtime IS present and actionlint reports errors —
the warn only covers the no-runtime case. See the actionlint container-form solutions
doc before editing workflows; the doctor deliberately does not assume pipx/python.

## Traps this doctor encodes

- **Direct `vitest run` bypasses `pretest`.** Suites that fetch `/` 404 on a stale or
  missing `web/dist` (see the 2026-09-24 solutions doc). `webdist-freshness` compares
  mtimes of every `web/src/**` input against the newest `web/dist` artifact and names
  the stale file, so the failure reads as "rebuild" instead of "404".
- **`.conductor/` re-tracking rides landing merges.** Staged untracks do not survive
  the validation clone's exclude pathspec; the post-merge emptiness check is the only
  reliable probe. The doctor runs it on every invocation, not just post-merge.
- **Skips are explicit, never implicit.** `--skip=` names each dropped check on its own
  line, so a paste of the doctor output is auditable — you cannot accidentally
  "pass" by not running something.

## Provenance

Minted as rm-1509 (run fa1a9c89 cycle 2, 2026-10-17). The check set is exactly the
battery this repository's landing batches were verified with by hand three times over
during the outage window; the doctor makes it one command and dogfoods itself — its own
verification run is the acceptance evidence.
