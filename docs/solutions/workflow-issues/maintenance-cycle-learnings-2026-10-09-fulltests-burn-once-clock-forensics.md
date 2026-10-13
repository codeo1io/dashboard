---
module: dashboard
tags: ['maintenance-cycle', 'conductor', 'full-tests', 'actions-outage', 'clock-forensics']
problem_type: workflow-issue
---

# Maintenance-cycle learnings — full_tests burn-once economics + clock/ref forensics (2026-10-09, run `1c814809d084`, repository-maintenance cycle 1)

First-hand traps from a full_tests turn executed during the account-level
GitHub Actions disable (7th fleet instance of the supervisor-approved
deviation route; the route's recipe lives in
`actions-account-disable-fulltests-local-mirror-2026-10-09.md` — unlanded,
run-d8fdf8b7's worktree copy was the authority read). This doc records the
operational traps AROUND the route, not the route itself.

## Lesson 1 — burn the verbatim command once, then never again

The work-order rule "execute validation.full_command VERBATIM" plus a disabled
Actions plane means the command fails by timeout after 3600 s. The fleet burned
20+ validators into that wall before the deviation route existed. Correct
economics:

1. Probe cheaply first: `gh api -X POST .../actions/workflows/main.yaml/dispatches -f ref=main`
   — a 422 "Actions has been disabled for this repository." proves the block
   without spending an hour.
2. If the lineage has no first-hand burn record yet (check the dead-attempt
   event log AND the spool), burn ONCE with `TMPDIR=/tmp` so the validation
   clone survives the delegate-spool sweep and the validator's `finally` can
   reap its own PR + refs. That burn is the durable evidence — this run's burn
   produced ephemeral PR #498 whose diff was verified file-by-file to equal the
   batch delta (snapshot fidelity proof), then timed out with the canonical
   `{"error": "GitHub CI timed out without registering any PR checks", "ok": false}`.
3. Never re-burn while dispatch still 422s; cite the recorded burn instead.

Recovery trigger to un-defer: ANY Actions run newer than the frozen newest-run
id (this outage: 37872407109 @ 2026-10-09T01:59:31Z), or a non-422 dispatch.

## Lesson 2 — date artifacts from host + GitHub clocks, not the delegate context

This session's context block said 2026-10-10 while the host clock, file mtimes
and GitHub API all agreed on 2026-10-09T18:xxZ. The skew silently mis-dates
riders, comments and scratch logs if the context date is trusted. Recipe:
`date -u` and a `gh api` timestamp are the authorities; the context date is a
hint only. (Symptom that exposed it: "yesterday's" PR #498 turned out to have
been created 17 s after this session's validator launch.)

## Lesson 3 — fresh validator refs sort mid-list in ls-remote output

`conductor/ci-<head8>` and `conductor/ci-base-<base8>` sort ALPHABETICALLY, so
a just-pushed pair lands mid-list and `git ls-remote ... | tail` misses it —
the launch looks like it produced nothing. Verify by grepping the specific
base/head SHAs, not by position:

```bash
git ls-remote origin 'refs/heads/conductor/*' | grep -E '<base8>|<head8>'
```

Same trap in `/tmp`: `conductor-github-ci-<random>` dirs persist from killed
sibling attempts — prove clone ownership via mtime +
`.git/objects/info/alternates` (the validator's clone alternates into the
source repo's object store) before drawing conclusions from its HEAD.

## Lesson 4 — check node_modules/.bin before any battery (third sighting)

The external `--prod` install wipe (empty `node_modules/.bin` with
`node_modules` present) struck this worktree too, silently — `pnpm` would fail
or misbehave only mid-battery. Detect in one line and let the Setup-parity job
itself be the cure:

```bash
ls node_modules/.bin | wc -l   # 0 ⇒ wipe; corepack pnpm install --frozen-lockfile (6.6 s here)
```

## Lesson 5 — same-day compound comments take the newest-census slot

The roadmap-integrity guard resolves the newest census claim by date, and on
equal dates the LAST match in document order wins (`b.date >= a.date ? b : a`).
A compound comment dated the same day as the cycle's roadmap extension, placed
at the file tail, therefore SUPERSEDES the extension's claim — its body must
carry exactly one slash-form `N defs / 0 dups / max rm-N` string, matching the
live census (trap family: the first regex match in a body wins, so derivation
prose stays non-claim-shaped). Riders-only compounding leaves the census
unchanged, so the compound claim equals the extension's claim by construction.
