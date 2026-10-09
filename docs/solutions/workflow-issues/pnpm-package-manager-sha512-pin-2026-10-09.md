---
title: pnpm packageManager integrity pin — corepack rejects npm's base64 sha512, use the hex form
date: 2026-10-09
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - Adding an integrity suffix (+sha512) to packageManager in package.json
  - Pinning the corepack/pnpm bootstrap in the Dockerfile prepare step
  - 'Why the pin is `+sha512.<hex>` and not `+sha512-<base64>`'
  - Node-26 go/no-go preparation (corepack removal from tarballs)
tags: [supply-chain, pnpm, corepack, dockerfile, package-manager]
---

# pnpm install integrity: version + sha512 pin (rm-797)

## Problem

`packageManager` in `package.json` pinned only a version
(`pnpm@11.28.4`), so every corepack bootstrap (both Dockerfile `corepack
prepare` steps, any local `corepack pnpm` run) resolved and fetched by
version over HTTPS with no hash verification. The obvious fix — append
npm's `dist.integrity` as a `+sha512-<base64>` suffix — does not work.

## The encoding trap (verified first-hand, 2026-10-09)

npm's `dist.integrity` is `sha512-` + **base64**:

```
sha512-+QWmFWP4m0mikmNNPYfQJM/eqdzPXGayzMJhZ1+nsndDIKlZ20cubKp/n/cxRwnNUNBsj9ZK3bYGRzd6eNJQ/w==
```

`corepack` (0.36.0, the version shipped in the pinned `node:24-trixie-slim`
base) **rejects that form outright**:

```
Error: Failed to prepare pnpm@11.28.4+sha512-+QWmF…==
Invalid package manager specification: expected a semver version
```

`+`, `/` and `==` are illegal in semver build metadata, and corepack parses
the whole `packageManager` field as a semver spec.

**The canonical form is what `corepack use pnpm@11.28.4` itself writes**:
`+sha512.` (dot separator) + the same sha512 rendered as 128 lowercase hex
characters. The two are the same 64 bytes — `base64 -d` of npm's value
produces exactly the hex corepack writes:

```
pnpm@11.28.4+sha512.f905a61563f89b49a292634d3d87d024cfdea9dccf5c66b2ccc261675fa7b2774320a959db472e6caa7f9ff7314709cd50d06c8fd64addb60647377a78d250ff
```

Derivation recipe for any future pnpm bump:

```sh
npm view pnpm@<version> dist.integrity          # base64
# hex form (what goes in packageManager):
printf '%s' '<base64-integrity-minus-sha512->' | base64 -d | xxd -p -c 256
# or let corepack render it itself, in a scratch dir:
corepack use pnpm@<version> && grep packageManager package.json
```

## Enforcement topology (probed inside the pinned base image)

All probes ran in `node:24-trixie-slim@sha256:173f1258…`, corepack 0.36.0:

- **Field-driven install, fresh cache**: honors and verifies the hash.
  A tampered hex (`…250fe`) fails at download with `Mismatch hashes`.
- **`corepack prepare '<spec-with-hash>' --activate`, pristine cache**:
  downloads and verifies the same way — a tampered spec throws at
  `installVersion`. This is why the **Dockerfile prepare specs carry the
  hash too**: the image build's pnpm download is then hash-bound.
- **Cache hit**: no re-verification (a cached version runs even if the
  field hash is wrong). Acceptable — within one build, the cache is only
  populated by a verified download.
- `corepack prepare pnpm@11.28.4 --activate` (version-only) followed by a
  hashed field still works — the two do not clash — but binds nothing.

## Consumer compatibility matrix (all verified 2026-10-09)

| Consumer | Result |
| --- | --- |
| corepack 0.36.0 in the pinned base image | accepts hex form; verifies at download |
| standalone pnpm 11.28.4 (`pnpm install`, `--frozen-lockfile`) | accepts; no ERR_PNPM_BAD_PM_VERSION |
| `pnpm/action-setup@0977fd9` (v6, CI bootstrap) | explicitly supports `[+<integrity>]`, strips it for `pnpm self-update` (src/install-pnpm/run.ts) |
| `scripts/should-release.ts` | treats packageManager as an opaque scalar — this edit correctly triggers an image release |
| `base-drift.yaml` pin-drift job | string-compare vs upstream, report-only by design — fork-ahead drift is the desired signal |

## The change (three files move together)

1. `package.json` — `packageManager: 'pnpm@11.28.4+sha512.f905…250ff'`
2. `Dockerfile` — **both** stage prepare specs carry the same full pinned
   spec (hash-verified at image-build download time)
3. `test/fork-exclusion-guard.test.ts` — the exact-string assertion flips
   to the full pin, plus a cross-file check that the Dockerfile pins the
   identical spec in both stages. The trio is one unit: any partial move
   reds the guard.

Full Docker build verified green on this change: both prepares fetch
hash-verified, both frozen installs (`--frozen-lockfile`, `--prod`) and
`pnpm build:web` succeed.

## Node 26 note (rm-139's 2026-10-28 go/no-go)

Node 25.0.0 removed corepack from release tarballs (v25.0.0 notes, PRs
#57617/#59835). Node 24 (EOL 2028-04-30) still ships corepack 0.36.0, so
the bootstrap path has runway — but the node-26 migration replaces
corepack with a digest-pinned standalone installer, at which point the
`packageManager` hash stays as the registry-side truth and the Dockerfile
prepare line moves with that decision.
