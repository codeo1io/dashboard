---
module: dashboard
tags: [pnpm, lockfile, frozen-install, err-pnpm-lockfile-config-mismatch, upstream-merge, security-floors]
problem_type: workflow-issue
---

# ERR_PNPM_LOCKFILE_CONFIG_MISMATCH on strict clones — the frozen-install wall (and four traps around it)

**Date**: 2026-10-05 · **Runs**: 3570419605cb (c1, first cured tree — this entry
content-adopts and extends its findings), cfa9f94b (c3 — re-derived, re-verified
from scratch; the trap list below is extended by two first-hand discoveries) ·
**Base**: 306a972 == origin/main.

## Problem

A strict copy of HEAD's three manifest files (package.json + pnpm-workspace.yaml
+ pnpm-lock.yaml) fails `pnpm install --frozen-lockfile` with
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH (overrides differ)` — every install-dependent
CI check on main died at its Setup step for a day. Root cause (forensics in run
cfa9f94b assess a18adbc2): the `1e1e2f5` upstream merge (2026-10-04T15:45Z,
commit body `# Conflicts: pnpm-lock.yaml`) mixed conflict sides — it took
upstream's cured workspace floors (brace 2.1.7/5.0.12, fast-uri 3.1.8, toml
4.2.0, undici 7.30.0) but kept the fork's stale lockfile (2.1.2/5.0.7, 3.1.5,
7.29.0, no toml). This is the wall: floors and lockfile disagree, and frozen
install refuses.

Same event silently reverted the 2026-10-03 floor cure: Dependabot re-opened
alerts #29/#30 at 15:47:15Z. Cure landed ≥4×, was lost 4× in 4 days — every
upstream merge that resolves the lockfile conflict upstream-ward reverts fork
security posture.

## Cure

**Lockfile-only re-derivation in a /tmp sandbox** — floors on main are already
correct, so the workspace is NOT touched (that was the 09-30 mistake: the cure
rewrote floors to match the lockfile, the security-wrong direction).

```bash
T=/tmp/derive; mkdir -p $T; cd $T
git -C <repo> show HEAD:package.json       > package.json
git -C <repo> show HEAD:pnpm-workspace.yaml > pnpm-workspace.yaml
git -C <repo> show HEAD:pnpm-lock.yaml      > pnpm-lock.yaml
npx -y pnpm@11.28.4 install --no-frozen-lockfile   # regenerates the lockfile
cp pnpm-lock.yaml <repo>/pnpm-lock.yaml
```

Then verify, in this order (acceptance battery — sha is evidence, re-derivation
is the gate): frozen install rc=0 on a clean copy; `pnpm audit --recursive`
17→0; floors honored (fast-uri 3.1.8, undici 7.30.0, toml 5.0.0, brace 2.1.7 /
5.0.12); no in-range sweeps (hono stays 4.13.12); no ghost importer (zero
`wiki[-_]writ` matches — a pre-cure derivation accidentally added an upstream
wiki-writer dependency); byte-stable across two fresh derivations.

## The four traps

**1. pnpm "heals" the wall by rewriting the tracked lockfile.** Any in-tree
non-frozen install (or a `pnpm run`-family command against a stale tree, pnpm
11.x auto-installs) silently rewrites `pnpm-lock.yaml` in place — the repo looks
cured, the wall class survives in every fresh clone, and the working tree is
dirtied behind your back. Countermeasures, both landed by the 2026-10-05 batch:
(1) `verifyDepsBeforeRun: false` in pnpm-workspace.yaml (kills the rewrite —
note `pnpm config get verify-deps-before-run` prints undefined even when this
camelCase workspace key is honored; probe behavior, not config); (2) derive ONLY
in /tmp sandboxes, copy the result in.

**2. The "registry oscillation" was a hash-space conflation.** Research
recorded derivations "oscillating" between `9abdcdd5` (12:31–12:52Z) and
`96db787f` (14:42Z) and concluded the registry was unstable. They are the
sha256 and the git blob hash of the SAME bytes — run cfa9f94b's 20:0xZ
derivation prints `9abdcdd54f3082b7` via `sha256sum` and `96db787f` via
`git hash-object` simultaneously, byte-identical to both siblings. One era,
stable all day. When comparing derivations across runs, always name the
algorithm, and prefer `git hash-object` so the blob is comparable to
`rev-parse HEAD:pnpm-lock.yaml`.

**3. pnpm ≥9.7 self-delegates to the `packageManager` pin.** Running
`npx -y pnpm@11.28.3` (or a prefix-installed binary) in a directory whose
package.json pins `pnpm@11.28.4` silently runs 11.28.4 — the banner tells you
only if you read it. A pin-sensitivity probe that doesn't control the sandbox
manifest's `packageManager` proves nothing. To probe version X: sed the pin in
the sandbox package.json (which is exactly the deployment shape — CI corepack
honors the same pin), or run the version with `--version` and no manifest
nearby.

**4. `--lockfile-only` is the cheap tripwire.** `pnpm install --frozen-lockfile
--lockfile-only` validates the floors↔lockfile consistency in ~1–3 s without
installing — no node_modules, no chicken-and-egg with test gates. This is the
new `Lockfile Guard` workflow's check (both polarities verified: cured rc=0;
wall-shaped tree rc=1 with exactly ERR_PNPM_LOCKFILE_CONFIG_MISMATCH), wired to
fire on push + PR before a merge can land the revert class again.

Also worth keeping in mind: `actionlint`'s container tags drop the `v`
(`1.7.12`, not `v1.7.7`) — see the actionlint container-form note.

## Verification (run cfa9f94b, implement 17d88d58, first-hand)

`/tmp/cure-17d88d58`: `derive1`/`derive2` byte-identical (sha256
`9abdcdd54f3082b7…`, blob `96db787f…`, +86/−123 vs HEAD); `frozen4` rc=0
(11.28.4); `frozen3b` rc=0 (true 11.28.3 via pin control + prefix binary);
`audit.log` 0 vulnerabilities rc=0; `gt-cured` rc=0 / `gt-broken` rc=1
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`; in-tree frozen install rc=0, lockfile
byte-stable across `pnpm lint` and install. Docker image
`dashboard-cfa9f94b:17d88d58`: dpkg `libpcre2-8-0 10.42-1+deb12u2` /
`perl-base 5.36.0-7+deb12u4`; fresh-DB `aquasec/trivy:0.72.0` Enforce-replica
scan Clean rc=0. ROADMAP census 215/0 dups preserved; longest non-comment line
3486 < 4000 (rm-284).
