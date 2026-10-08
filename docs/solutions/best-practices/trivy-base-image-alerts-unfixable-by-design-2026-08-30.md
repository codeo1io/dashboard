---
title: Base-image Trivy alerts are unfixable by design
date: 2026-08-30
category: best-practices
module: dashboard
component: tooling
problem_type: tooling_decision
severity: high
applies_when:
  - Auditing GitHub code-scanning alerts from the release container
  - Trivy reports Debian package CVEs with no upstream fixed version
  - An automated report frames inherited OS CVEs as an outstanding gap
  - Considering a base-image swap to clear inherited operating-system findings
  - The release Trivy enforcement pass fails on fixable HIGH/CRITICAL base-image CVEs
tags:
  - trivy
  - docker
  - debian
  - trixie
  - base-image
  - unfixed-cves
  - release-gate
  - distroless
---

# Base-image Trivy alerts are unfixable by design

## Context

An automated daily report flagged "33 Trivy base-image CVEs, several critical" as
an outstanding security gap. The framing was wrong, and re-deriving that each
time the report runs is pure cost.

Code scanning shows 37 open Trivy alerts in the `trivy/release-image` category:
4 CRITICAL, 29 HIGH, 2 medium, 2 low. They collapse to 14 unique CVEs inherited
from Debian OS packages in the base image.

| Package family | CVEs | Count |
| --- | --- | ---: |
| `perl-base` | CVE-2026-13221, CVE-2026-42496, CVE-2026-8376, CVE-2026-42497, CVE-2026-48962, CVE-2026-57432, CVE-2026-57433, CVE-2026-9538 | 8 |
| `util-linux` family (`util-linux`, `util-linux-extra`, `mount`, `libuuid1`, `libsmartcols1`, `libmount1`, `libblkid1`, `bsdutils`) | CVE-2026-53613, CVE-2026-53615 | 2 |
| `zlib1g` | CVE-2023-45853 | 1 |
| `ncurses` family (`ncurses-base`, `ncurses-bin`, `libtinfo6`) | CVE-2025-69720 | 1 |
| `libacl1` | CVE-2026-54369 | 1 |
| `gzip` | CVE-2026-41992 | 1 |

Every alert body has an empty `Fixed Version:` field. There is no upstream
package version to move to.

Upstream context (folded 2026-10-08, upstream `a671d5a` / #577; re-truthed at
the 2026-10-08 integrate when rm-698's landing made the fork's own move
current): upstream `fro-bot/dashboard` moved its release image to
`node:24-trixie-slim` on 2026-10-06 (`ba499c7` / #576) after fixable
`perl-base` CVEs made the enforcement gate fail every image release — see the
trixie section below. This fork executed the same move on 2026-10-07 (rm-698,
landed `ad8f21e`): all three stages now build from
`node:24-trixie-slim@sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66`
(single `ARG NODE_IMAGE`, rm-558's `BUILDPLATFORM` multi-arch staging kept) and
the base-drift pin watch is re-targeted to the trixie tag — the absorb deltas
below were executed by that landing, not left queued. The bookworm-era tables
in this document are the pre-move measurement record (kept as the re-derive
baseline); re-derive them against the fork's own built trixie image (see When
to revisit).

## Guidance

Triage inherited base-image OS findings in this order. Stop as soon as a step
settles the question.

**1. Check `Fixed Version` before anything else.** An empty value means no
upstream patch exists and nothing at the application or Dockerfile layer can
clear it. Parse it correctly — see the trap in Examples.

**2. Confirm the digest is already current.** These findings are only
actionable if a newer base image exists. Compare the pinned digest against what
the registry currently serves:

```sh
token=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).token')
curl -s -H "Authorization: Bearer $token" \
  -H "Accept: application/vnd.oci.image.index.v1+json" \
  -D- -o /dev/null "https://registry-1.docker.io/v2/library/node/manifests/24-trixie-slim" \
  | grep -i docker-content-digest
```

On this fork no Renovate runs (PR #1 removed it), so the pin moves only by manual
upstream absorbs and — since 2026-09-19 — weekly dependabot docker PRs. Drift between
the pinned digest and the live tag for a few days at a time is therefore EXPECTED;
a mismatch means the pin is stale (absorb due), not that the check is wrong.

**3. Understand that reporting and enforcement are separate steps.**
`.github/workflows/release.yaml` runs Trivy twice, deliberately:

| Step | Configuration | Effect |
| --- | --- | --- |
| Reporting (~lines 297-308) | `exit-code: '0'`, no `ignore-unfixed` | Uploads every HIGH/CRITICAL to code scanning. This is what produces the alerts, and it is a visibility channel by design. |
| Enforcement (~lines 338-347) | `ignore-unfixed: true`, `exit-code: '1'` | Fails the release only on *fixable* HIGH/CRITICAL. |

An open alert is therefore not a blocked release. Confirm this rather than
assume it: releases `2026.08.31` through `2026.08.34` all built and shipped with
these alerts open.

The gate passes today only because no remaining finding has a fix. It fails
again, by design, when Debian ships one. That is the control working, not a
reason to weaken it.

A green Release run is not evidence the image is clean. When the release guard
skips a run (for example a devDependency-only change), no image is built or
scanned. Read the enforcement step's result, or confirm an image was built,
before drawing a conclusion.

**4. Assess reachability before considering a swap.** The deployed container
runs `read_only: true`, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`,
`user: node`, and `/tmp` on tmpfs, with the `/data` bind mount as the only
writable surface. The server is a Node HTTP process that never shells out, so
`perl`, `util-linux`, `ncurses`, and `gzip` are never invoked.

**5. Only then evaluate a base change,** and measure the built image rather than
the bare base — the runtime stage deletes package managers and adds application
code, so a bare-base scan overstates what actually ships. Note also that only the
final stage ships; `builder` and `prod-deps` are discarded.

## Why This Matters

Unfixable findings are not gaps. Treating them as a backlog produces
deploy risk with no security gain, and the enforcement scan already draws the
distinction correctly — so the work is not just low-value, it is redundant with
a control that already exists.

The reachability argument compounds it. These packages sit in a read-only,
capability-stripped, non-root container that never spawns a process. Removing
them changes the theoretical surface, not the practical one.

The parsing trap matters more than it looks: getting it wrong inverts the entire
conclusion, turning "nothing is actionable" into "everything is fixable" and
justifying work that cannot succeed.

This is an accepted, bounded posture — not a suppressed vulnerability. Keep the
findings visible. Do not change application code, the release gate, or the
Dockerfile solely to reduce the alert count, and do not add ignores or loosen
the enforcement pass to make a failing release go green.

A base tag is not a policy artifact to preserve or revert for alert-count
reasons. Move it only for a concrete reason — and when the reason arrives, move
all three stages together (`prod-deps` compiles native modules that are copied
into the runtime stage, so the glibc must match).

## Why upstream moved to trixie: fixable CVEs blocked the gate

(Recorded here because the same mechanism governed this fork's own rm-698 move,
now landed; upstream's wording adapted to this fork's context.)

Upstream's enforcement pass began failing every image release once Debian fixed
`perl-base` CVE-2026-13221, CVE-2026-42496, CVE-2026-8376 (critical) and
CVE-2026-42497, CVE-2026-48962, CVE-2026-57432, CVE-2026-57433 (high) in
`5.36.0-7+deb12u4`, while the `node:24-slim` tag head still shipped
`5.36.0-7+deb12u3`. Those findings were fixable, so the gate was right to fail,
but a digest bump could not help until upstream rebuilt the tag.

PR #576 moved all three Dockerfile stages to `node:24-trixie-slim`
(digest `sha256:173f1258…`). They move together because `prod-deps` compiles
native modules that are copied into the runtime stage, so the glibc must match.
After the move, upstream's Release run for #576 passed the enforcement pass on
Debian 13.7, where `perl-base` is `5.40.1-6+deb13u1`. The remaining
reporting-pass findings (43 HIGH, 0 CRITICAL) stay visible in code scanning.

A further `perl-base` CVE, CVE-2026-9538, is `fix_deferred` on both Debian 12
and 13. It has no fixed version, so it never blocked the gate, and it stays
visible.

This fork's absorb deltas for the same move (verified first-hand against
`git diff origin/main upstream/main -- Dockerfile`, then executed by the landed
rm-698 move): kept rm-558's `BUILDPLATFORM` multi-arch staging and
`ARG NODE_IMAGE` form (upstream dropped them), kept the digest-pinning
discipline, re-targeted the base-drift pin watch to the trixie tag, and — per
the standing rm-259 disposition — did not absorb upstream's `wiki-writer`
package or its `Dockerfile` `COPY` lines. Upstream dropped its bookworm
`apt-get upgrade` layers in the same move; this fork instead retained its
`--only-upgrade libpcre2-8-0 perl-base` layer — a verified no-op on the trixie
base (both packages ship newer-than-fixed revisions there) — as the standing
cure path for any future CVE in either package.

## When to Apply

- An automated report or audit flags `trivy/release-image` alerts as outstanding
- Trivy reports OS package CVEs with no fixed version
- Someone proposes a base-image swap to clear inherited findings
- The enforcement pass fails because a fixable base-image CVE appeared
- Planning a runtime base upgrade for reasons other than these alerts

## Examples

### The parsing trap

Alert bodies put `Fixed Version:` on its own line, empty, followed by `Link:`.
Because `\s` matches newlines, a naive regex captures the *next* line and makes
every unfixed finding look fixed:

```js
// WRONG — \s crosses the newline and captures the following "Link:" line,
// so every alert appears to have a fix.
const wrong = /Fixed Version:\s*(.*)/

// RIGHT — [^\S\n] is horizontal whitespace only, so the capture stops
// at the line end and correctly yields an empty string.
const right = /Fixed Version:[^\S\n]*([^\n]*)/
```

Count fix availability explicitly before drawing any conclusion:

```sh
gh api repos/fro-bot/dashboard/code-scanning/alerts --paginate
```

For this image the answer was 0 fixable out of 37.

### What a base swap would and would not buy

This table is this fork's 2026-08-30 arm64 measurement of its bookworm-era
image (kept as the pre-rm-698 re-derive baseline). Upstream's post-move measurement
supersedes the trixie row for alert-count purposes: on Debian 13.7 the
reporting pass lists 43 HIGH / 0 CRITICAL, with the gate green because nothing
remaining is fixable. Each alternative below was scanned as an actual built
image, and each booted successfully with HTTP 302:

| Runtime base | CRITICAL | HIGH | Size | Of the 14 CVEs |
| --- | ---: | ---: | ---: | --- |
| `node:24-slim` (bookworm pin, pre-move) | 4 | 26 | 264 MB | all 14 present |
| `node:24-trixie-slim` | 3 | 12 | 275 MB | 11 remain |
| `gcr.io/distroless/nodejs24-debian12:nonroot` | 1 | 5 | 170 MB | 0 remain |

Trixie is a half-measure *for the 2026-08-30 bookworm alert set*. It clears
only 3 of 14 — the `zlib1g` finding and the two `util-linux` findings. All 8
`perl-base` CVEs survive, including 3 of the 4 criticals; Debian 13 ships
`perl-base 5.40.1-6` and those CVEs remained unfixed there *at measurement
time*. Upstream's 2026-10-06 move (previous section) is what changed that
calculus: the deb13u1 rebuild cleared the fixable set, which is exactly why the
gate went green there.

Distroless is deferred, not rejected. It removes all 14 by omitting those
packages and cuts the image to 170 MB, but it is not a one-line swap. Distroless
has no `node` account while deployment pins `user: node`. Making it work
requires coordinated changes in `marcusrbrown/infra` to Compose `user:`,
`install -d -o 1000 -g 1000`, the recursive `chown`, the post-deploy `stat`
assertion that requires `1000:1000:700:directory`, and the mounted GitHub App
PEM's `1000:1000:0600` ownership — against a live droplet whose deploy fails
closed on drift.

Alpine is ruled out for a runtime-only swap. The `prod-deps` stage compiles
native modules (`@swc/core` and `unrs-resolver`, allowed by
`pnpm-workspace.yaml` `allowBuilds`) against glibc and copies `node_modules/`
into the runtime stage. Moving only the runtime stage to musl would not work;
all stages and native-module builds would have to move together.

The comparison scans were built on arm64 because `--platform linux/amd64`
segfaulted under qemu during `pnpm build:web` with `qemu: uncaught target signal
11`. CI publishes amd64. Package sets should be near-identical, but this is not
a byte-exact reproduction of the CI image.

### Root cause of the unfixability

`node:24-slim` resolves to Debian 12 bookworm, now oldstable with LTS-only
security support:

```text
perl-base 5.36.0-7+deb12u3
util-linux 2.38.1-5+deb12u3
zlib1g 1:1.2.13.dfsg-1
```

The bookworm-era pin was `sha256:0e0ff40…`; it moved by manual upstream absorbs
and the weekly dependabot docker PRs (see step 2). Upstream's cure for the
bookworm support-window problem was the trixie move recorded above, and this
fork executed the same move on 2026-10-07 (rm-698, `ad8f21e`) — the current
pin is `node:24-trixie-slim@sha256:173f1258…` and the package versions above
are the pre-move record.

## When to revisit

- A `Fixed Version:` appears for one of these alerts. The enforcement scan will
  then correctly fail the release until the package is updated.
- The trixie move has landed (rm-698, 2026-10-07): re-derive the alert table
  and the swap-buy analysis against the fork's own built image — still open at
  the 2026-10-08 fold (upstream's numbers are a planning input, not a fork
  measurement).
- The coordinated distroless UID and deployment changes become worth the
  operational cost in `marcusrbrown/infra`.

## Related

- `docs/solutions/workflow-issues/release-paths-filter-must-cover-runtime-image-contents-2026-06-25.md`
  — the other place release-gate configuration and runtime image contents have
  to be reasoned about together.
- `docs/solutions/security-issues/cross-source-redaction-denylist-before-query-2026-06-15.md`
  — fail-closed security handling in the same module.
- `docs/solutions/security-issues/github-app-credential-domain-conflation-2026-06-15.md`
  — adjacent least-privilege boundary lesson.
- A sibling finding from the same investigation: the image declared uid 1001
  while Compose pinned `user: node` (uid 1000), so the declared user was
  exercised only by the release smoke test and left the standalone image unable
  to write its data volume. Fixed in PR #406 by changing `Dockerfile` to
  `USER node` and updating the smoke assertion to expect 1000. The host data
  directory was already `1000:1000` and did not change, which is why aligning
  the image was the cheap direction.
