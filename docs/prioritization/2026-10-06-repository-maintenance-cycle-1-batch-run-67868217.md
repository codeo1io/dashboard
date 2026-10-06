# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-06, run 67868217)

module: dashboard
tags: `[roadmap, ledger, adjudication, security, docs, batch-record]`
problem_type: batch-record

Frame: base `3d07cf9` (the run work-order base; porcelain clean at implement
start). origin/main moved to `ac61ff3` before implement (three sibling
landings `fe928ca`/`c210933`/`ac61ff3`), so the ledger deliverable was
composed onto the **live tip render** — the house re-anchor pattern; the
worktree delta therefore carries the render restoration plus this batch's
pure additions. Run `67868217b62e40d9972c3bc79da304b8`,
repository-maintenance cycle:1. Phases: assess
`9983fc3fad9c47a7938e5f8c1019ba0d` (F1 uninstallable-HEAD lockfile wall, F2
ledger corruption — both first-hand), research
`125538cd645b4de6937d13db944c7e6f` (ecosystem census, full redo after reaped
zero-work prior `95104893`), roadmap `2986faf7dfc44d83bb6b973bf7694445`
(report-only extension; adopted by `cdb445fe4f2c4df692ccf8d0265668a6` after a
provider-reap transport artifact), prioritize
`42136c6b882b4db5ba62ffe852e51ab5` (this batch selected against the live
landscape), stewardship `53f3451b318d4a90bdd1dba7fffff890` (structured
request; no Git topology chosen), implement
`c93a1f64271148b896149c9b817eb6ee` (this document; prior attempts
`0a1e487211cc4ef0ab55bd121a7a71f8` and `7b95214da0c14ab3953289fb6ca61eca`
died of provider-family infra failures — `0a1e4872`'s compose script was
verified line-by-line and adopted with five defects fixed, `7b95214d` was
zero-work at 24s).

## The cycle's mandate

One theme: **ledger truth and a recorded release-design adjudication.** The
run's assess frame (base `3d07cf9`) had two criticals — the
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` install wall and the corrupted ROADMAP
render — and both were cured on main mid-run by sibling landings (floors cure
`c210933`/`73d35a6c`, ledger restoration `ac61ff3`). The prioritize pass
re-probed everything live and selected the residue this batch owns: the
research-backed ledger extension re-anchored onto the restored render, and
the one decision that must be recorded before any release-landing merge can
be contemplated.

## Landscape at selection (re-probed first-hand at implement, 2026-10-07)

- origin/main = `ac61ff3433de6fc027762d0b36e7c31ae71c3151` (unchanged since
  prioritize; `git fetch origin`, `git log 3d07cf9..origin/main` = the three
  landings above).
- Tip render: 222 defs / 222 unique / max `rm-659` / 0 trailing-space lines /
  managed-render marker final; `rm-676`/`rm-677` absent from tip (collision
  census in Verification).
- F1 cured: `git show origin/main:pnpm-lock.yaml` overrides mirror the
  workspace floors; Main workflow shows consecutive green runs.
- `gh api repos/codeo1io/dashboard/releases` -> 0; dependabot open alerts -> 0;
  branch protection still an empty shell (`contexts=[]`,
  `enforce_admins=false`) — rm-116's window.

## B1 — ROADMAP.md: mints rm-676/rm-677 + two riders, composed onto the tip render

Content source: the adopted roadmap product (spool,
`cdb445fe4f2c4df692ccf8d0265668a6-scratch/roadmap-cdb445fe….md`, sha256
`1cc7e9e2…`), authored on the c5b7cd7d-shape ledger. Re-anchored onto
`ac61ff3`'s render by script (spool
`c93a1f64271148b896149c9b817eb6ee-scratch/compose.py`, adapted from reaped
`0a1e4872`'s draft with five defects fixed: a syntax-error line, a
heading-splice position bug that would have broken the `### heading` ->
`- id:` adjacency invariant, an off-by-one assert, an ambiguous `.index()`
rider lookup — the cfa9f94b rider prefix occurs 5x on tip — and an
over-long rm-677 extraction that ran into the c5b7cd7d-shape `## Closed
items` section).

Additions (pure; `+14/-0` vs tip render):

- `rm-676` mint (track security, pri 14.0) in the security section
  immediately after rm-117's block — the release-ship adjudication record;
  see B2.
- `rm-677` mint (track security, pri 6.0) adjacent — secret-scanning alert
  counts behind unlanded rm-668; status stays `candidate`, gated.
- Rider on rm-252's block tail (after the 2026-10-05 cfa9f94b rider):
  gateway `v0.117.5` semantics — declined-run `agent: blocked` labels, job
  summaries, S3-lock decoupling; the fork's disabled fro-bot.yaml pin stays
  `v0.117.1`.
- Rider on rm-271's block tail (after the 2026-10-06 73d35a6c review rider):
  dist-tag delta — vite 8.3.3 and @types/node 26.6.4 additionally live,
  fast-check 4.10.2 stays behind the deliberate rm-144 pin, upstream's only
  open PRs remain the two GHSA bumps the floors cure already closes.

Shape adjustments applied while re-anchoring (10 textual, each asserted to
match exactly once): rm-675 restoration pointer dropped (rm-117 is restored
on main, cited live at `ac61ff3`); Closed-section references dropped; rm-143
and rm-105 cited as live on main; the release ledger claim re-grepped on the
live render (`calver`/`tag-protection` = 0; the one `first release` prose
hit at :1577 is release.yaml's image-publish trigger); releases count
re-probed at implement (still 0); rider provenance notes distinguish the
unlanded 8b1672ef fleet layer (freshest landed gateway datum v0.117.2;
freshest landed dist-tag measure 73d35a6c's 2026-10-05 rider).

## B2 — Release-ship design adjudication: disposition (b), the no-release design stands

Three records were in conflict: the ledger records the no-GitHub-releases
design as deliberate (`Signed-Releases -1`, image-based deploys; rm-143's
2026-09-29 disposition plus a 2026-09-26 fold note rejecting a batch
acceptance that contradicted it), while unlanded sibling claim rm-662
(e9bc28f5 worktree) proposes cutting the fork's first release (calver, behind
a tag-protection ruleset) once CI is green, and live releases = 0 with
rm-105's SBOM/SLSA already shipping registry-side on the GHCR `latest` OCI
index.

**Decision (disposition b): the no-release design stands.** Decided by run
67868217 prioritize `42136c6b` + stewardship `53f3451b` (2026-10-06);
recorded here and on rm-676's status line (flipped `candidate` ->
`implemented 2026-10-07`). Reopening trigger: any release-landing proposal —
at that moment rm-662 must either carry a signed-assets step (cosign or
detached .asc over calver assets) plus a docs update reversing the recorded
rationale, or be superseded with the disposition recorded against it. No
release-landing may merge while the two records disagree.

## B3 — this document

Records the batch selection (ledger truth + release-design adjudication),
the adjudication evidence, deferrals, and watch items, per the prioritize
decision doc (spool `42136c6b882b4db5ba62ffe852e51ab5-scratch/`).

## Deferrals with owners and triggers

- Lockfile-guard false citation (staged 97a8ebf6 cites an rm that did not
  land as claimed) — owned by the cfa9f94b lineage's guard adoption on main;
  this batch does not touch the guard. Trigger to revisit: any future guard
  citation must name the landing commit, verified by `git log -S`.
- Branch protection (rm-116): still an empty shell (`contexts=[]`,
  `enforce_admins=false`); filling it belongs to a governance batch once the
  Main job conclusions + CodeQL set is agreed — blocked on nothing technical.
- Security-events panel extension (rm-677): gated behind unlanded rm-668
  (secret_scanning_validity_checks) — without it the surface shows a flat
  zero that reads as clean. Do not start until rm-668 lands.
- Scorecard OSSF publishing: `code-scanning/analyses` carries only a SARIF
  stub; deferring to the governance batch with rm-116.

## Watch items

- `gh api repos/codeo1io/dashboard/releases` -> 0 is the standing probe for
  the B2 trigger (re-probed 2026-10-07: still 0).
- Gateway: v0.117.5 released 2026-10-06T03:29Z (declined-run labels, job
  summaries, S3 lock); the fork pin stays v0.117.1 while fro-bot.yaml is
  disabled_manually.
- Dist-tags: vite 8.3.3, @types/node 26.6.4 live; typescript 7.0.2 still
  peer-blocked by typescript-eslint 8.71.0 (<6.1.0); pnpm 12.9.1 exists
  (lockstep decision belongs to the majors window).
- Sibling PRs #415/#416 are open and CONFLICTING on ROADMAP.md; merge order
  between them forces a ledger re-derive on the second.

## Verification (focused — implement-phase budget)

- Composition gates (script-enforced, all pass): census 224 defs / 224
  unique / max `rm-677`; `+14/-0` pure addition vs tip render; every `### `
  heading still immediately followed by its `- id:` line; 0 trailing-space
  lines; no non-comment line over 4000 chars; managed-render marker still
  the final line; rm-117's block byte-untouched; composed sha256
  `17be906d5b95d731e100de10307af29c2c1041f44c97b95d0300600475d152fb`.
- Collision census (fresh, this phase): `rm-676`/`rm-677` exist ONLY in this
  run's spool products and the delivered worktree — nowhere across sibling
  worktrees, `origin/conductor/*` refs, or origin/main.
- Classification: both surfaces (`ROADMAP.md`, this doc) are non-executable
  under the engine tables — the executable changed-surface set is empty, so
  the validation digest is unchanged at base.
- Focused gates in a pristine `ac61ff3` clone (`/tmp`, frozen install green,
  6.6s) with the two delivered files overlaid sha-verified:
  `pnpm exec vitest run test/roadmap-length-guard.test.ts` -> 1 file / 1 test
  passed (336 ms); `pnpm exec eslint ROADMAP.md docs/prioritization/<this
  doc>` -> rc=0 (26 s).
- Worktree delivery via `git apply` (patch-path discipline) with cross-call
  verification (sha256 + census + porcelain), then staged; index blobs
  byte-equal to worktree files.
