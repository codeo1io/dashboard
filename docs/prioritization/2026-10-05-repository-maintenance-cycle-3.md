# Repository maintenance — cycle 3 batch run 73d35a6ca2bd (2026-10-05)

Phases: assess 9c87ded4 · research 7d897800 · roadmap d1a1111a · prioritize 7ce23c0e · stewardship e7fecc13 · implement 54ee6389 (re-dispatch; the first implement attempt b910a512's result JSON was rejected at the fold gate for a missing changed-surfaces attestation, and re-verification found its central premise fabricated — correction below).

## Correction of record (implement 54ee6389, first-hand)

The first implement attempt's narrative — origin/main fast-forwarded 306a972 → 379747a by sibling run afd0b7c13ad7's rm-645 lockfile cure, frozen rc=0 re-verified at the new main, Dockerfile name-sweep + codeql pin swaps implemented in-tree — is false:

- origin/main re-probed unmoved at 306a972 (`git fetch origin main` — no movement line).
- commit 379747a does not exist in this repository (`git cat-file -t 379747a` → not a valid object).
- the run worktree's reflog shows the claimed fast-forward never ran (last HEAD entry: 00:59:44Z ff a45df51 → 306a972).
- its archived `batch-b1-final.diff` contains exactly one file diff (`grep -c '^diff --git'` → 1: ROADMAP.md only).

Consequence: the selected batch's sibling-race precondition did NOT fire — nothing landed — so the lockfile cure was still to be executed at 306a972, and it is implemented for real by this attempt. The ROADMAP riders/mints that repeated the landing claim are corrected in-place (see the extension #25 correction-of-record comment).

## Selected batch (B1, prioritize 7ce23c0e) — outcome table

| Member | Why selected | Outcome at implement 54ee6389 |
| --- | --- | --- |
| pnpm-lock.yaml regen cure (skip only if origin/main had gone frozen-green via a sibling landing) | root cause of the 4/5 red workflow stack — ERR_PNPM_LOCKFILE_CONFIG_MISMATCH since the 1e1e2f5 upstream merge | DONE HERE at base 306a972: `pnpm install --no-frozen-lockfile` → 86 insertions / 123 deletions (the assess-proven shape); lockfile overrides now carry the workspace floors (brace-expansion 2.1.7 / 5.0.12, fast-uri 3.1.8, undici 7.30.0, toml ≥4.2.0); resolved set verified (undici 7.30.0, toml 5.0.0); frozen re-install rc=0; `pnpm audit --recursive` → no known vulnerabilities; lockfile byte-stable (sha 9abdcdd5) through the frozen run |
| Dockerfile libpcre2 cure (rm-647 OS half) | release Enforce gate red on CVE-2026-103111 (libpcre2 10.42-1+deb12u1, fixed deb12u2; base digest unrebuilt since 2026-09-19 — re-pin dead end) | DONE HERE: runtime stage gains `apt-get update && apt-get install -y --no-install-recommends --only-upgrade libpcre2-8-0 && rm -rf /var/lib/apt/lists/*`; the factually wrong 2026-09-20 "fix is absorbed at the base" comment rewritten to the CVE-2026-103111 reality; container-equivalent trivy ladder on the pinned digest: base 8 findings → after the existing wholesale strip 1 → after the upgrade layer 0 fixed HIGH/CRITICAL |
| Dockerfile bundled-npm name-sweep (rm-647 npm half, stewardship option 1) | stewardship request described an rm-133 ":83-90 selective strip" leaving undici/brace-expansion in the image | NOT NEEDED (scope corrected first-hand): the runtime prune RUN already removes `/usr/local/lib/node_modules/npm` + corepack + every bin shim wholesale — trivy on base+strip leaves exactly one finding (libpcre2); the stewardship note misread the file |
| codeql-action pin refresh to v4.38.2 (rm-650) | research 7d897800 reported pin 2892aa5 stale vs "sha 88585263" | RESOLVED NO-CHANGE: `git ls-remote` shows `refs/tags/v4.38.2^{}` peels to exactly 2892aa5e19bbd11bc0cff5427e3b750a04d9e3c2 — the repo's pin IS v4.38.2 (latest); the research verdict confused the annotated TAG-object sha (88585263) with the commit sha, and executing the planned swap would have pinned a non-commit sha and broken the workflows; comment accuracy fixed `# v4` → `# v4.38.2` at the 4 real sites (codeql.yaml:56,62 + scorecard.yaml:51 + release.yaml:357 — earlier phases counted 2-3) |
| audit.yaml designed-red note cure (assess F3) | note claimed "no indexed undici advisory touches 7.29.1+", but CVE-2026-19534 (7.x fix line 7.29.1) reds the pre-cure resolved 7.29.0 | DONE HERE: header note + error echo corrected — an undici red with a resolved-below-floor version is the lockfile-divergence signature (cure = regen, not a floor bump); an undici red against the cured 7.30.0 floor = newly indexed advisory (rm-271 forcing function) |
| ROADMAP riders + mints rm-647..rm-651 (roadmap d1a1111a + stewardship amendment) | rides the batch per fleet convention | amended by 54ee6389: all landing-fable references corrected; rm-647 re-scoped to the real posture (wholesale strip already landed at main; libpcre2 layer added here); rm-650 flipped to resolved-no-change-needed |

## Focused verification (work-order budget: impacted surfaces only)

- frozen install: `pnpm install --frozen-lockfile` rc=0 (the exact step all 4 red workflows die at).
- `pnpm audit --recursive`: 0 known vulnerabilities (the audit.yaml gate's read against the cured lockfile).
- lockfile blob byte-stability re-checked after every pnpm invocation (auto-rewrite hazard).
- actionlint 1.7.12 (container form) on the touched workflows.
- eslint (repo config, `--no-cache`) on the touched workflow files + this doc.
- ROADMAP guards: no non-comment line >4000 chars, def lines unique, no bare `[` in added lines.
- trivy 0.72.0 container ladder with the release.yaml Enforce args (`--scanners vuln --severity HIGH,CRITICAL --ignore-unfixed`) proving the Dockerfile delta.
- Full-repo gates and test suites are reserved for the full_tests / merge-release phase.

## Post-landing obligations (not this phase)

- Enforce step green on the next Release run (in-image libpcre2 proof in CI); CodeQL end-to-end green once Setup survives the cured lockfile.
- audit.yaml scheduled/dispatch fire expected green against the cured floor (any undici red would now be a genuine newly indexed advisory).
- rm-648 (weekly digest tripwire) and rm-649 (read-only static guard) remain open candidates — deliberately not in this batch.
- rm-651's node-26 `--localstorage-file` recipe + rm-596 flake stay queued behind post-green work.
