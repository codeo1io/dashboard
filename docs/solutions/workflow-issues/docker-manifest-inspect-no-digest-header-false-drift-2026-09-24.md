---
title: docker manifest inspect emits no Digest header — sentinel compares pin against empty string
date: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - A CI step pipes `docker manifest inspect <image>` into `awk '/^Digest:/{print $2; exit}'` and the variable comes back EMPTY
  - A drift/parity check logs a one-sided comparison (`drift: pin sha256:... != live ` with a blank live side) and exits 1
  - A workflow that "worked when written" starts false-reding on its first scheduled fire after landing
  - You are about to read an image digest in a workflow and are choosing between `docker manifest inspect` and `docker buildx imagetools inspect`
tags:
  - github-actions
  - docker
  - ci
  - drift-sentinel
  - empty-value-failure
  - guard-test
---

# Problem

The base-image drift sentinel (`.github/workflows/base-drift.yaml`) went red with an
EMPTY live digest: run 35970747110 (workflow_dispatch, 2026-09-24T07:38Z) logged
`live node:24-slim digest: ` blank and `drift: pin sha256:0e0ff40... != live ` blank,
exiting 1 — indistinguishable from genuine drift. The same-hour Release run
35974819368 on the identical runner image parsed its digest fine with the buildx
form, proving the runner was capable and the sentinel's readback was at fault.

# Root cause

`docker manifest inspect <image>` (the registry-API path) prints the **raw manifest
JSON** — there is no `Digest:` header line in its output. The
`Digest: sha256:...` header form belongs to `docker buildx imagetools inspect`'s
pretty dump. The workflow's own header comment shows the author correctly avoided
the `--format '{{.Manifest.Digest}}'` template trap (which is silently IGNORED on
attestation-bearing OCI indexes — see the 2026-09-22 Release fix at 18a1ee6) but
transposed that lesson to a subcommand that does not print the header at all:

```yaml
# broken: awk never matches, LIVE_DIGEST is ''
LIVE_DIGEST="$(docker manifest inspect node:24-slim | awk '/^Digest:/{print $2; exit}')"
```

Two compounding absences let it land and stay broken:

1. **No empty-value guard** — a blank readback was reported as *drift* instead of
   as a *read failure*, so the failure mode lied about its own cause.
2. **No static guard** — actionlint cannot see shell-semantics bugs like this;
   the only workflow_dispatch run before landing was misread as genuine drift.

# Resolution (rm-166, cycle 11, run 41c7d471)

Read the digest with the form proven in the Release workflow, and fail loudly on
an empty readback with its own message so read-failure never masquerades as drift:

```yaml
LIVE_DIGEST="$(docker buildx imagetools inspect node:24-slim | awk '/^Digest:/{print $2; exit}')"
if [ -z "$LIVE_DIGEST" ]; then
  echo "::error::READBACK FAILURE: live digest is empty (buildx imagetools inspect produced no Digest line) — this is not drift"
  exit 1
fi
```

# Prevention

A workflow-statics guard test (`test/base-drift-digest-readback.test.ts`, modeled
on `test/release-trigger-paths.test.ts`) fences BOTH failure classes across every
`.github/workflows/*.yaml`:

- `docker manifest inspect` piped into a `/^Digest:/` awk (this lesson);
- `docker buildx imagetools inspect --format '{{.Manifest.Digest}}'` — the
  silently-ignored template form on attestation-bearing indexes (18a1ee6).

Implementation nuance: scan **comment-stripped** text (drop full-line `#` comments
before matching). The repaired workflow legitimately *mentions* both forbidden
strings in its trap-documenting header comment, and a naive grep reddens on its
own documentation.

## Rule of thumb

When a CI readback can come back empty, guard the empty case with a distinct
error message BEFORE comparing. And when transplanting a parser lesson between
docker subcommands, re-verify the output shape — subcommands with similar names
print different formats.

## Related

- ROADMAP `rm-166` (sentinel repair + guard test), `rm-123` (original sentinel
  landing; its "first run logs both digests" evidence rides rm-166's re-dispatch
  at the pushed sha).
- Control evidence: Release run 35974819368 (buildx+awk parses on ubuntu-latest)
  vs base-drift run 35970747110 (manifest-inspect+awk yields empty), same hour.
