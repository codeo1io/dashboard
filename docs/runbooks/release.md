# Release Runbook

The Release workflow (`.github/workflows/release.yaml`) is the deploy path: on
push to `main` it guards on green CI, smoke-tests the image, builds and pushes
a candidate image to GHCR (SBOM + provenance attestations), tags CalVer and
`sha-<short>` (App-gated), promotes the candidate to `:latest`, and dispatches
the deploy (best-effort, environment-scoped secrets). This runbook covers
diagnosing red runs — every class below was root-caused from real runs, and the
workflow file carries the same notes as dated comments at the code sites.

## How to verify published state by hand

```bash
gh auth token | docker login ghcr.io -u codeo1io --password-stdin
docker buildx imagetools inspect ghcr.io/codeo1io/dashboard:latest
```

The top-level `Digest:` line is the index digest the workflow compares against
`steps.build.outputs.digest`. `:latest` should match the most recent green
release run's build step; per-run tags (`vYYYY.MM.DD-N`, `sha-<short>`) are
immutable snapshots.

## Failure triage — observed classes

| Class | Runs (all red) | Root cause | Disposition |
| --- | --- | --- | --- |
| A. Promote-readback `pipefail` race | 37435636956, 37453985189 (2026-10-06), 37567189586, 37574226127 (2026-10-07) | The readback `got="$(docker buildx imagetools inspect … \| awk '/^Digest:/{print $2; exit}')" \` runs under the workflow-wide `bash -Eeuo pipefail`. When awk exits early, docker's next write to the closed pipe fails and docker exits non-zero (255 reproduced live), so the `&&` conjunct fails **even though the Digest was already parsed** — every red run shows the correct digest in its own log, and the promotion itself always landed (post-hoc inspect of `:latest` matches the last run's build). | FIXED by rm-691 (2026-10-07, run `b2a3ae9bf75b` implement): both readbacks (CalVer block + promote-latest) now use an END-pattern parse (`awk '/^Digest:/{d=$2} END{print d}'`) that consumes docker's full output — byte-equivalent result (exactly one top-level `Digest:` line; verified equal against the live registry), preserves docker's real exit status, and 0/10 non-zero draws locally where the old construct drew 2/5. |
| B. Build `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` | 37215211192 (16:01), 37216911735 (16:28), 37220191056 (17:21), 37214305022 (18:29), 37239436677 (22:17), all 2026-10-04 | `pnpm install --frozen-lockfile` inside the image build failed in both the prod-deps and builder stages: the tree at those commits carried a `package.json` overrides set that did not match the lockfile (upstream-absorb era). | No further action — cured on `main` by landing the harmonized `pnpm-workspace.yaml` + `pnpm-lock.yaml` pair (lockfile-only adoption is insufficient when the base workspace lacks floor keys the lockfile records). Recurrence guard at write time: the Lockfile Guard workflow (`pnpm install --frozen-lockfile --lockfile-only`) gated `main`; that workflow was later dropped by the October upstream-adoption lineage (verified absent at the 2026-10-16 integrate, conflict case 5eb4cb85), so the lockfile-pair check is manual until it is restored — if this class reappears, check that pair first. |
| C. Trivy enforce gate | 37204721603 (13:11), 37211157087 (14:57), 2026-10-04 | `Enforce fixed HIGH/CRITICAL vulnerabilities` failed because a fixable HIGH/CRITICAL vuln existed at those SHAs — the fixed-only enforcement gate working exactly as designed. | Not a defect. Resolved by the subsequent dependency bumps; if it fires again, read the Trivy table in the log and bump the flagged dep (the gate ignores vulns without a fixed version). |

Note the symptom overlap trap: a Class-A run is red while `:latest` is already
correct — never "fix" it by re-running the build; read the failing step name
first. A Class-B run failed at `Build and push candidate image`, and a Class-C
run at the Trivy step, so the failing step alone distinguishes all three.

## Known-gated surfaces

- The CalVer tag + `Create GitHub Release` steps require the release App token
  (`HAS_RELEASE_APP`); while the App is not provisioned they skip, and the
  promote-latest path is the live one. The CalVer digest readback carries the
  same rm-691 END-pattern fix, so provisioning the App later inherits it.
- `buildx imagetools inspect --format '{{.Manifest.Digest}}'` cannot be
  trusted across buildx versions (v0.30.1 silently printed the default dump on
  attestation-bearing indexes) — parse the default output's `Digest:` line
  instead (NOTE in the workflow).

## Container HEALTHCHECK semantics (rm-743)

The image carries a `HEALTHCHECK` probing `/api/healthz` and gating on HTTP
`r.ok` only. Orchestration expectation: it is a LIVENESS signal — a
stale-but-alive dashboard (upstream GitHub slow or degraded) stays `healthy`
and must not be restarted by an orchestrator reacting to it. Staleness
visibility belongs to the dashboard UI's own fields (rm-708, unlanded): once
those land, an EXTERNAL probe may additionally gate on staleness — the
in-container healthcheck never will.

The probe URL hard-codes the `DASHBOARD_PORT` default (3000). A deployment
overriding `DASHBOARD_PORT` must override the `HEALTHCHECK` (or the
orchestrator's equivalent liveness command) to match, or the container will
report unhealthy against the wrong port.

## Tag hygiene — never fetch --tags from upstream (rm-1479)

The release channel's calver ladder is read from `refs/tags`, and that
namespace is only authoritative if its provenance is `origin`. This store
once carried an `autonomy-upstream` remote (plus a promisor remote on the
upstream URL), and one `--tags` fetch from it imported 86 upstream `2026.*`
tags (2026.08.16 … 2026.10.43) alongside upstream's `v0.115.x`/`r962-*` tags —
none of which exist on `origin`. The contamination read back as a false
"newest release" (`2026.10.31`, an upstream commit) where the authoritative
answer was `2026.10.25`, skewed `compute-release-tag` mints toward the
upstream patch counter (44+ instead of 26), and stood one `git push --tags`
away from publishing upstream's ladder to the fork's `origin`.

The rules, enforced 2026-10-17 (run 475b46bc, rm-1479):

- Never fetch tags from any upstream-facing remote. The store config sets
  `remote.<upstream-facing>.tagOpt = --no-tags` for every remote whose URL is
  `fro-bot/dashboard` (including the URL-keyed promisor remote), so an
  explicit `--tags` is required to import upstream tags at all — that intent
  must be refused.
- Staleness smokes read `origin` by URL (`git ls-remote --tags <url>`), never
  the local `refs/tags` state, exactly as `scripts/release-channel-staleness.ts`
  does.
- The contaminated refs were quarantined (not destroyed) under
  `refs/remotes/quarantine/run-475b46bc/` — 93 refs holding the exact former
  `refs/tags` object ids, restorable with
  `git update-ref refs/tags/<tag> <oid>` if ever needed, and purgable with
  `git for-each-ref --format='%(refname)' refs/remotes/quarantine/run-475b46bc |
  xargs -n1 git update-ref -d` once a cycle of landings has confirmed no
  consumer missed them. 75 of the quarantined tags point at commits absorbed
  into fork history (safe under any policy); the `2026.10.26–43` band points
  at upstream-only commits pinned solely by the quarantine refs.

### Pristine-smoke recipe (recorded 2026-10-17)

To verify what the channel really says, read it from a clean store:

```bash
S=$(mktemp -d) && git -C "$S" init -q
git -C "$S" fetch --tags git@github.com:codeo1io/dashboard.git \
  'refs/heads/*:refs/remotes/origin/*'   # rc=0
git -C "$S" tag -l '2026.*' | sort -V | tail -1  # newest calver
```

Recorded output at 2026-10-17: newest calver `2026.10.25`, 125 total tags,
exact parity with `git ls-remote --tags origin`, exit 0. The de-contaminated
local store reproduces the same answer — the two agree only when local
`refs/tags` provenance is `origin`.

## Maintenance of this document

When a new failure class is root-caused (not just a one-off), add a row with
the run ids, the mechanism, and the decision in the same cycle.
