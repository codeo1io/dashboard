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

## Tag-channel truth (rm-1481)

`scripts/compute-release-tag.ts` mints from CHANNEL truth, not the raw local
store. A `2026.*` tag counts toward the fork channel when it is:

1. visible on `origin` (`git ls-remote --tags origin`), or
2. anchored to a commit merged into `origin/main`, or
3. anchored to a commit inside the absorb window
   (`merge-base origin/main upstream/main` .. `upstream/main`).

Anything else is foreign (leaked or mirror-minted) and is excluded from the
max-patch computation. When none of the three probes can run (no
`origin`/`upstream` wiring), the script degrades to the pre-filter unfiltered
local scan and says so on stderr — minting is therefore store-independent.

Why this matters: a local store that ever fetched `'+refs/tags/*:refs/tags/*'`
unscoped carries the UPSTREAM channel's calver tags too. Census recipe
(2026-10-16, this repo's shared conductor store):

```sh
# tags local-only (not on origin)
comm -23 <(git tag -l '2026.*' | sort) \
  <(git ls-remote --tags origin 'refs/tags/2026.*' | grep -v '\^{}' \
    | awk '{print $2}' | sed 's|refs/tags/||' | sort)
# then classify each: merged (ancestor of origin/main) / window / foreign
```

Result: 195 local vs 109 origin tags; all 86 local-only tags anchored INSIDE
the fork lineage (68 merged into `origin/main`'s history, 18 inside the absorb
window) — they are upstream-channel tags on absorbed commits, i.e. channel-
occupying, NOT foreign. Foreign count: 0, so no purge was executed; deleting
them would have been wrong (they occupy real calver names the next mint must
clear). If a future census finds non-zero foreign tags, quarantine first
(record tag + peeled SHA) before `git tag -d`, and never push tag deletions
without an explicit operator decision.

House convention: never fetch tags unscoped from `upstream`. Scoped fetches
(`'+refs/heads/main:refs/remotes/upstream/main'` with `--no-tags`) keep the
local store fork-only; release-channel probes that need upstream tags fetch
them into a THROWAWAY store (see `docs/runbooks/actions-darkness-watch.md`
for the pristine-tag-store recipe).

## Maintenance of this document

When a new failure class is root-caused (not just a one-off), add a row with
the run ids, the mechanism, and the decision in the same cycle.
