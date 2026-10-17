---
title: 'Actions suspension: local watch-mirror recipe (audit / base-digest / canary)'
date: '2026-10-16'
category: workflow-issues
module: ci
problem_type: ci-gap
component: GitHub Actions
severity: medium
applies_when: 'account-level Actions run creation is suspended and the scheduled watch lanes (audit, base-digest drift, graphql canary, upstream-drift, scorecard) cannot execute'
---

## Problem

GitHub Actions run creation on this account is suspended repo-wide (probed live
2026-10-16: the newest run of any kind on `codeo1io/dashboard` is
`2026-10-09T01:59:31Z`, seven days stale). Every scheduled watch lane —
`audit.yaml`, `base-drift.yaml`, `canary.yaml`, `upstream-drift.yaml`,
`scorecard.yaml` — is therefore DARK: the signals they exist to produce (new
advisories, base-digest drift, GraphQL syntax drift, upstream releases,
OpenSSF posture) silently stop. Nothing fails loudly; the schedule simply never
fires.

While the suspension holds, the mirror below reproduces the three lanes that
are locally executable, from a worktree, without any GitHub-side run. Two
lanes are declared out of scope: **scorecard** and **codeQL** need the
Actions runners' binaries (scorecard CLI against the repo, CodeQL database
build) and have no honest local substitute — do not fake them.

## The mirror recipe (three probes)

### 1. Dependency advisories (mirrors `audit.yaml`)

```
pnpm audit --prod
```

Point-in-time. Record the date with the result; an advisory landing between
exercises is invisible until the next one. `--prod` mirrors the lane's
production posture; a full `pnpm audit` (dev deps included) is the wider
sweep, run it when a dev-tooling advisory matters.

### 2. Base-digest drift (mirrors `base-drift.yaml`)

```
docker buildx imagetools inspect node:24-trixie-slim | grep Digest
```

Cross-check, daemonless, with the raw registry API:

```
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -sI -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json" \
  https://registry-1.docker.io/v2/library/node/manifests/24-trixie-slim | grep -i docker-content-digest
```

Compare against the `ARG NODE_IMAGE` pin in `Dockerfile` (the `sha256:`
literal). Both methods must return the same index digest; that digest must
equal the Dockerfile pin for an "exact-current" verdict. **Inspect the tag the
Dockerfile actually pins** — see the 2026-10-16 log entry below for what
happens when the workflow's hardcoded tag literal diverges from the pinned
one.

### 3. GraphQL canary, live syntax probe (mirrors `canary.yaml`)

```
GITHUB_TOKEN=$(gh auth token) node --experimental-strip-types scripts/graphql-canary.ts
```

Hits the live GitHub GraphQL API with the exact shipped query templates and
fails non-zero on a syntax/shape drift. Green output ends with
`canary: OK — <repo> answered the exact shipped <query>` per template.

## Run log

- **2026-10-16** (run 181d6e242f1b cycle:2 implement, attempt c510d39b):
  - `pnpm audit --prod` → *No known vulnerabilities found* (point-in-time).
  - Base-digest: Dockerfile pin `sha256:7f486cabe892...ec315` == live
    `node:24-trixie-slim` index digest, identical via buildx imagetools and
    the registry manifest API → **exact-current** (bumped this cycle to
    upstream parity, node 24.22.0).
  - Divergence found while probing: live `node:24-slim` digest is
    `sha256:8973f1c921fd...47c25d` — a *different* image from
    `node:24-trixie-slim`. `base-drift.yaml` hardcodes the `24-slim` literal
    while the Dockerfile pins `24-trixie-slim`, so the lane (once it can run
    again) would false-drift against the wrong tag — tracked as the rm-856
    ledger item, first-to-cure when the lane revives.
  - Canary live probe: green, exit 0 — both shipped templates
    (`REPO_STATUS_QUERY`, `REPO_STATUS_QUERY_NO_ALERTS`) answered by the live
    API, drill-down coverage noted (rm-192).
  - Suspension premise probed first-hand: newest run on the repo
    `2026-10-09T01:59:31Z`; scorecard and codeQL lanes intentionally not
    mirrored (binary-dependent, no honest local substitute).

## Out of scope (never mirror these)

- **scorecard** (`scorecard.yaml`): needs the scorecard CLI evaluating the
  live repo from a runner; a local CLI run against a private repo behind auth
  is not the same signal.
- **codeQL** (`codeql.yaml`): needs a CodeQL database build on the runner
  image; local database builds drift from the CI toolchain.

## Retirement trigger

This mirror retires when the scheduled lanes run green again: after Actions
re-enable, the first completed (not queued, not stale) scheduled run of the
audit and base-drift lanes is the retirement proof — record its run URL here,
then the lanes are the source of truth and this document stays only as the
suspension-era record. If the base-drift lane still carries the `24-slim`
literal at that point, fix rm-856 *before* trusting its green.

## Addendum — run creation revived, schedule lanes still dark (probed 2026-10-17)

Live re-probe 2026-10-17 (run 181d6e242f1b independent_review:fix): the Problem
section's "newest run of any kind 2026-10-09" premise is obsolete for push and
pull_request events — run creation revived on 2026-10-16 (earliest post-suspension
run in the live API census: `2026-10-16T21:29:26Z`, pull_request; newest at probe
time `2026-10-17T06:26:54Z`, Main, success). The operative premise stands unchanged
for the schedule class: none of the five scheduled watch lanes has fired since
2026-10-05 (last schedule runs: audit `2026-10-05T10:48:22Z` failure, base-drift
`2026-10-05T11:24:45Z` success, upstream-drift `2026-10-05T12:15:03Z` failure, canary
`2026-10-05T12:21:01Z` failure; scorecard has no schedule-class run after 2026-10-05
but does execute, green, on push — e.g. `2026-10-17T03:41:56Z` — so its OSSF signal
flows again via the push trigger while the scheduled cadence stays dark). Fro Bot
pull_request checks remain `skipped` (no `FRO_BOT_PAT`). The local mirror above
therefore stays the operative substitute for the scheduled signals, and the
retirement trigger above is unchanged: a green completed *scheduled* run of the
audit and base-drift lanes.
