# Dashboard maintenance batch (2026-10-09, run ddb41af7e0bd)

- **Run:** `ddb41af7e0bd43888b697287cbdf947d` — repository-maintenance cycle 1
  (`b2663eec115b4a4b89e14561d7bcb95b`), implement attempt `dafd19e3`.
- **Batch:** `workflow-image-and-scanner-currency` — rm-782 + rm-783 + rm-784 + rm-785
  (selected by prioritize `26cb99b4` from the extension-#36 candidate pool; selection
  rationale below carried over from the spool batch doc, worktree pristine at selection).
- **Base at implementation:** `559642a` (== `origin/main` tip at dispatch, porcelain clean).
- **Selection lineage:** assess `fffa8f6a` + research `9aa8cdea` → roadmap extension #36
  (`8b16cd4d`) → prioritize `26cb99b4` → stewardship `7331040c` → this implement.

## Selection rationale (prioritize `26cb99b459ae4fb5a00d11d9ac24835c`)

- **Selected:** `workflow-image-and-scanner-currency` — 4 change-units, one landing.
- **Method:** 17-candidate open pool of the extension-#36 postimage ranked by
  impact × urgency × (1/effort), dependency risk, and theme coherence; top five by
  priority are the run's mints rm-782 (92.0), rm-784 (62.0), rm-783 (61.0), rm-785 (58.0),
  rm-786 (55.0).
- **Context:** rm-782 is calendar-P0 — the CVE tripwire's digest-grep constant is
  stranded on `'node:24-slim'` while the Dockerfile pins the trixie variant (rm-698's
  2026-10-07 migration), so the first scheduled fire (Mon 2026-10-12 06:53Z) would red
  on the resolve step instead of reaching the digest comparison the 2026-10-08
  INTEGRATE watch item expects. The other three units share the runtime-image/scanner
  theme and are each self-contained; rm-786 (CI runtime tooling integrity) defers to a
  later cycle — its `npx` mutable resolution makes it the one unit that cannot ride a
  digest-only landing.

## U1 — P0 `rm-782`: CVE-tripwire NODE_IMAGE trixie constant + parity fence

`cve-tripwire.yaml` env: `NODE_IMAGE: 'node:24-slim'` → `'node:24-trixie-slim'`
(env block now carries a 3-line rm-782 provenance comment; the constant sits at :39).
The Dockerfile digest was re-probed live at edit time (auth.docker.io token +
registry-1 HEAD for `24-trixie-slim` → `docker-content-digest sha256:173f1258…`)
and is byte-equal to the Dockerfile:34 pin — no digest absorb owed; the workflow
constant was the sole break. NEW `test/node-image-parity-guard.test.ts` fences the
pairing (3 cases: quoted-constant form, `ARG NODE_IMAGE=<tag>@sha256:<64 hex>` pin
form, byte-equality plus verbatim ARG embed) so the next tag migration cannot strand
the constant again. Overlap disclosed: reaped sibling 69b161e1's parity-suite claim
is subsumed; integrate dedupes by content.

## U2 — `rm-783`: Trivy CLI v0.72.0 → v0.75.0 (mirror contract held)

`cve-tripwire.yaml` `TRIVY_VERSION: v0.75.0` (:40) with the header mirror comment
updated in place, AND `release.yaml`'s two `version:` trivy inputs (SARIF-report and
Enforce steps) bumped in the same commit — the tripwire's mirror-comment contract
(identical scanner args across both workflows) now holds byte-equal;
`grep v0.72.0` over `.github/workflows/` returns nothing. Breaking-entry gates
re-derived TAG-SCOPED (the 2c76124b lesson): `raw.githubusercontent.com/aquasecurity/trivy/`
at tags `v0.73.0`, `v0.74.0`, `v0.75.0` — zero BREAKING CHANGES headings in v0.73.0
and v0.74.0; v0.75.0's single breaking change removes Go-template function
`getHostByName`, unused here (both invocations are `format: json`/SARIF with no
`--template`); every flag we pass is unchanged across the window. Live-heading note:
sections read `## [0.Y.Z](compare-url) (date)` — the pre-`.0`-suffix tag fetch 404s.

## U3 — `rm-784`: action digest re-pins (live site census)

| action | new pin | sites |
| --- | --- | --- |
| `github/codeql-action` | `24c54180` # v4.38.3 | codeql.yaml:56, :62; scorecard.yaml:51; release.yaml:357 |
| `actions/upload-artifact` | `cf430e03` # v7.0.2 | scorecard.yaml:44; release.yaml:350; visual.yaml:101, :109 |
| `actions/setup-node` | `949feb24` # v7.1.0 | audit.yaml:74; release.yaml:57, :389; visual.yaml:79; `.github/actions/setup/action.yaml`:19 |
| `pnpm/action-setup` | `ea17c68d` # v6.1.0 | lockfile-guard.yaml:61; audit.yaml:71; visual.yaml:78; `.github/actions/setup/action.yaml`:16 |

Every SHA derived live 2026-10-09 via `api.github.com …/git/ref/tags` + annotated-tag
deref (codeql `cee97f86` → `24c54180`, pnpm `d9184bf1` → `ea17c68d`); the pnpm version
comment form tightened from `# v6` to `# v6.1.0`. Stale-SHA grep
(`2892aa5|043fb46d|82076278|0977fd9` over `.github/`) returns zero hits.
**Site-census correction vs the research table:** upload-artifact holds 4 live sites,
not 6 — its `main.yaml:215/:254` cites were phantom (main.yaml routes installs through
the composite setup action and pins no actions directly); setup-node 5 not 4
(audit.yaml:74 missed); pnpm 4 not 2 (visual.yaml:78 + setup/action.yaml:16 missed);
codeql's 4 confirmed. The 405e9004 historical upload-artifact/setup-node claim stays
disclosed for integrate (lane reaped, content unlanded at the selection re-probe).

## U4 — `rm-785`: Playwright 1.64 coupled bump (npm + mcr)

`package.json` `@playwright/test` `^1.63.0` → `^1.64.0`; lockfile re-resolve scoped to
the playwright family (playwright + playwright-core + @playwright/test all
1.63.0 → 1.64.0, `@axe-core/playwright` peer rebind; zero 1.63 residue).
`minimumReleaseAge: 1440` satisfied (1.64.0 published 2026-10-07T20:44:27Z, ~41h
before install). `visual.yaml:71-72` container image →
`mcr.microsoft.com/playwright:v1.64.0-noble@sha256:06a9939e57531807f8d5fd76ce44b53165ffb7d7501d87ab10e285c20b1e971f`,
digest probed three ways byte-equal at edit time (mcr oauth2 token + manifest HEAD;
`docker pull` image digest; `docker images --digests`). Spec provenance header
rewritten (`tests/visual/dashboard.spec.ts:3-9`). All three dark baselines regenerated
INSIDE the digest-pinned image (bundled node v24.21.0 == the workflow's setup-node 24,
chromium-1248, frozen install from the mounted host store): baselines deleted,
`playwright test --update-snapshots`, then TWO consecutive green verification runs
(3/3 each) per the rm-142 two-green determinism rule. Baseline churn verified
first-hand via git: 2 modified PNGs (listener-dark 26323 → 24741, operator-dark
86215 → 89566 bytes) + privacy-dark byte-identical on regen (66813 bytes both
sides, no git entry) — expected renderer churn, not content drift.

## Landing notes

- Changed surfaces: 9 tracked files modified (7 workflows + setup action, package.json,
  pnpm-lock.yaml) + ROADMAP.md/guard-test ledger delta riding the roadmap patch; 2 NEW
  files (`test/node-image-parity-guard.test.ts`, this batch doc) + 3 regenerated
  baseline PNGs; `tests/visual/dashboard.spec.ts` provenance header.
- Ledger: applied the run's cumulative roadmap patch first (extension #36 + selection
  markers + guard pin 744 → 786), then flipped rm-782..rm-785
  open → implemented in-tree pending landing, appended implement riders to each def,
  and added `cycle-1 implement extension #37` (owns the newest-census-comment slot;
  census after edits 242 defs / 0 dups / max rm-786, next free rm-787).
- Implement-phase validation budget (focused/impacted only; repo-wide reserved for the
  later gates): `node scripts/roadmap-census.ts` healthy; vitest over
  roadmap-integrity-guard + node-image-parity-guard + the six workflow/Dockerfile-parsing
  guard files — 8 files / 37 tests passed; actionlint (container form,
  `rhysd/actionlint:1.7.12`) rc=0 over all workflows; eslint clean over every touched
  file; `pnpm check-types` green; the in-image frozen install + visual regen above.
- Untracked-but-new `test/node-image-parity-guard.test.ts` rides the landing (validated
  in CI via the temp-index capture, the robots-wellknown precedent).

## Post-landing obligations

1. One `workflow_dispatch` smoke of the tripwire — the run log must show the resolved
   pin line and reach the digest comparison, not the early `::error` exit (rm-782).
2. First scheduled fire Mon 2026-10-12 06:53Z green-at-parity URL (rm-782; the
   2026-10-08 INTEGRATE watch item).
3. Two green CI visual-run URLs for the 1.64 baselines (rm-785/rm-142).
4. Integrate adjudication of the disclosed 405e9004 and 69b161e1 double-claims by
   content (rm-784/rm-782).
