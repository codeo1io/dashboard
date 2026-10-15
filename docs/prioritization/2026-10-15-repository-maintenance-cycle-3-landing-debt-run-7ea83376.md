# Dashboard maintenance — repository-maintenance cycle 3 landing-debt (2026-10-15, run 7ea83376fe09)

module: dashboard
tags: `[landing-pipeline, docs, disposition-record]`
problem_type: batch-record

Frame: derivation base origin/main `a385ca5` (fresh at decision time —
`git fetch origin main` → `a385ca5` at host-clock 2026-10-14T22:20Z;
the assess phase's `5530b5e`
base was superseded mid-run by landing #676). Run
`7ea83376fe094bb3970c759498486f1a`, repository-maintenance cycle:3, attempt
`c6915f3bdb044596a306a7dc9bda71aa`. Selection: prioritize batch `bbc36dfb`
("Landing-debt disposition + absorb-window freshness"; lead rm-1446, member
rm-856 fetch-first rider arm). Roadmap input: this run's own extension patch
`delegate/roadmap-delta-7ea83376-0c272f38.patch` (minted rm-1446 at priority
56.0 with the acceptance criteria both units below answer to).

Context: GitHub Actions on codeo1io/dashboard has been dark since
2026-10-09T01:59:31Z (latest of 2219 runs), so no PR check-run can be cited
for or against any disposition here — every conflict set and supersession
claim below was re-derived first-hand from the `a385ca5` tree and the live
PR API state at decision time.

## Unit A — stalled content PR dispositions (rm-1446)

Method (applies to every row): conflict sets re-derived first-hand with
`git merge-tree <merge-base-of(head, a385ca5)> a385ca5 <head>` (legacy 3-arg
form, git 2.34.1), cross-checked against the GitHub-reported mergeability;
supersession checked against the `a385ca5` tree directly (`git cat-file -e`,
`git grep`, name-status diffs from each PR's merge-base). All decisions are
dated 2026-10-15. Closes keep their head refs (close, do not delete the
branch) so the salvage register below stays reachable.

| PR | opened | head | decision | conflict set vs `a385ca5` |
| --- | --- | --- | --- | --- |
| #508 | 2026-10-09T22:15Z | `04c66e834` | CLOSE | 8 files (below) |
| #509 | 2026-10-09T22:52Z | `cb80b6ac7` | CLOSE | 7 files (below) |
| #518 | 2026-10-09T23:25Z | `06396b477` | CLOSE | 3 files (below) |
| #521 | 2026-10-10T01:18Z | `aad2427b6` | CLOSE | none — empty delta |
| #533 | 2026-10-10T02:59Z | `59baf8bb7` | CLOSE | 5 files (below) |

### #508 — run 1c814809d084 batch (rm-838 two-key rehydrate scrub, rm-840
override lift, rm-841 codeql re-pin) — CLOSE

Conflict set (8): `.github/workflows/codeql.yaml`, `release.yaml`,
`scorecard.yaml`, `ROADMAP.md`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
`src/github/aggregator.ts`, `test/aggregator.test.ts`.

- Dep/workflow arms superseded: the codeql-action pin the PR carries
  (`24c54180` — comment says `v4.38.3`) is digest-identical to what main
  pins today (same SHA, comment-only diff); Actions deps moved on main via
  landing #613 and the 2026.10.25-era adopts, so `pnpm-lock.yaml` and
  `pnpm-workspace.yaml` churned past the PR's versions (hono, playwright,
  fast-check floors all moved since).
- `docs/solutions/workflow-issues/validation-clone-exclude-pathspec-drops-staged-breadcrumb-deletion-2026-09-24.md`
  — already on main verbatim via another landing (AGENTS.md cites it); the
  PR's modification hunk is a duplicate edit.
- Surviving unique payload (see salvage register): the aggregator two-key
  rehydrate scrub — main's `scrubLastGoodAgainstDenylist`
  (src/github/aggregator.ts:975) still matches denylisted `node_id`s only,
  while `buildWorkingSet` (:503) already applies the two-key
  `node_id || databaseId` posture; a rehydrated last-good snapshot row
  lacking `node_id` can therefore evade the scrub. That gap is a live
  redaction-invariant exposure, not historical.

Decision: CLOSE. The tractable half of the PR (aggregator + tests + the two
doc adds) is cheaper to re-derive in a fresh minimal batch against `a385ca5`
than to rebase 8 conflicting files whose dep arms are dead.

### #509 — run 493bbbf2227c batch (rm-137 sha-pin discipline, rm-760
action-digest refresh) — CLOSE

Conflict set (7): `codeql.yaml`, `release.yaml`, `scorecard.yaml`,
`visual.yaml`, `ROADMAP.md`, `package.json`, `pnpm-lock.yaml`.

- Delivered by later refresh: `actions/checkout` is sha-pinned
  (`3d3c42e5…` v7.0.1) across every workflow on main, upload-artifact
  likewise; rm-137's acceptance is already satisfied by the tree, not by
  this PR. Ledger note for the gate: rm-137/rm-760 flip to
  `implemented` with a delivered-by-later-refresh rider.
- The dep half is superseded twice over: landing #613 moved Actions deps,
  and the in-flight dependency-sweep lane (run 9c5a7d19, CI draft #683
  below) carries the current hono/playwright/fast-check set.
- Its CI-validation duplicates (#669/#685) are dispositioned with the pile
  below; keeping zero copies of a superseded delta is the correct
  keep-one-per-batch outcome.

### #518 — run d8fdf8b79ad5 batch (rm-802 snapshot-store log fidelity,
rm-803 docs hygiene) — CLOSE

Conflict set (3): `ROADMAP.md`, `src/github/snapshot-store.ts`,
`test/snapshot-store.test.ts`.

- Unique payload (salvage register): the structured `logPersistProblem`
  shape — main's `snapshot-store.ts` still logs
  `error instanceof Error ? error.message : String(error)` scalars, so
  persisted-problem forensics drop the error class and stack; plus
  `test/docs-solutions-frontmatter-guard.test.ts`, two doc adds
  (`actions-account-disable-fulltests-local-mirror-2026-10-09.md`, the
  cycle-3 batch record) and three doc modifications
  (`era-specific-config-rationale-comments…`, `renovate-upstream-sync-regression…`,
  `truth-claims-must-be-scoped-to-origin-main…`).
- Nothing in the payload is time-rotted (no versions, no digests); it is
  simply stranded. CLOSE because the PR is a 6-day-old CI-validation shape
  whose merge path is dead while Actions is dark; the payload re-enters as
  a fresh minimal batch from the salvage register.

### #521 — ephemeral CI snapshot, EMPTY delta — CLOSE

Triple-verified empty: the GitHub files view returns zero files, the 3-way
merge against `a385ca5` produces no sections, and the head `aad2427b6` is
content-identical to its own ci-base ref `ca9eff8` (which equals the
2026-10-10-era main `88e423a`). A validation PR with no candidate delta.
CLOSE; nothing is lost.

### #533 — run 6a2d5fbe7f7c cycle:3 batch (web fetch-timeout/listener/
monitoring hardening + integrity-guard variant) — CLOSE

Conflict set (5): `ROADMAP.md`, `web/src/api/listener.ts`,
`web/src/api/monitoring.ts`, `web/src/views/Monitoring.test.tsx`,
`web/src/views/Monitoring.tsx`.

- Partially superseded: main's `web/src/api/listener.ts` now has its own
  abort-signal seam with a `'timeout'` abort reason, so the PR's listener
  hunks are stale rather than additive. `web/src/api/fetch-timeout.ts`
  (and its test) remain unique-but-unlanded; the seam they harden has
  moved under them, so salvage is a re-derivation, not a cherry-pick.
- The roadmap-integrity-guard variant it carries is one of five unlanded
  variants across the pile (see below); 9917862's landing lane owns the
  modern one.

### Salvage register (unique unlanded payloads named for re-entry)

Fresh minimal batches against `a385ca5`+ re-derive these from the retained
head refs — do not rebase the closed PRs:

1. `src/github/aggregator.ts` two-key rehydrate scrub + `test/aggregator.test.ts`
   (from #508 head `04c66e834`; the redaction-invariant gap above).
2. `src/github/snapshot-store.ts` structured `logPersistProblem` +
   `test/snapshot-store.test.ts` + `test/docs-solutions-frontmatter-guard.test.ts`
   (from #518 head `06396b477`).
3. `web/src/api/fetch-timeout.ts` seam re-derived against main's current
   abort/timeout handling (from #533 head `59baf8bb7` — seam moved).

## Unit A (continued) — ephemeral CI-validation pile census

17 PRs open at census (2026-10-14T22:20Z): the five content PRs above plus
12 `Conductor CI validation` drafts, all opened 2026-10-14 12:47–22:15Z.
Identity clustering by exact file list (the double-merge hazard the roadmap
def names — no two PRs with identical file lists both stay open):

| identity group (files) | members | payload owner | disposition |
| --- | --- | --- | --- |
| 9-file dep/digest refresh | #669, #685 | run 493bbbf2227c (= #509's delta) | CLOSE both — the delta itself is superseded |
| 12-file actions digest + workflows + zlib CVE doc | #671, #672 | run a794d381b4f0 | CLOSE #671; KEEP #672 (fullest variant; carries the unique `zlib1g-cve-2023-45853-standing-critical-2026-10-07.md` record, absent on main) |
| 11-file same batch minus zlib doc | #678, #680 | run a794d381b4f0 | CLOSE both — strict subsets of #672's file list |
| 7-file operator-stream gap-credit | #673 | run 489f454f (in flight) | KEEP — owned by its run's pending landing |
| 33-file fog batch (SW restore, contract ladder, clonedeps pin) | #674, #675, #684 | run fcfde1ea (in flight) | CLOSE #674, #675; KEEP #684 (newest of the identical triple) |
| 13-file lane-integrity + push SW | #682 | run 61448784 (in flight) | KEEP |
| 4-file dependency-sweep | #683 | run 9c5a7d19 (in flight) | KEEP |

Projected post-batch open set: five CI drafts stay open (PR numbers 672,
673, 682, 683 and 684) plus zero content PRs. Ownership caveat: every kept draft belongs to
a run still retrying full_tests under the outage — the same runs may mint
replacement drafts (the pile regrows while Actions is dark; root cause is
the outage lane rm-1437, not the PRs). Closes enumerated here execute at
the commit gate with `gh pr close <n>` (no branch deletion), except a
foreign run's draft that has minted a newer sibling by gate time — that
run's own gate owns the older one.

Standing rule adopted with this document: no PR stays open past 14 days
without a dated disposition note under `docs/prioritization/`. Enforcement
is the next repository-maintenance prioritize screen (add the open-PR age
census to its checklist; this document is cycle 3's baseline).

## Unit B — absorb-window freshness (rm-856 fetch-first arm)

Live first-hand facts at implement time (2026-10-14T22:20Z, both remotes
fetched this turn):

- absorb window `origin/main..autonomy-upstream/main` = **6 commits**:
  cf4c9a7 (#615 push text), f12fde0 (#616 agent v0.122.1), 2c25f9b (#604
  question fixture), 44ff0fd (#618 plugin 1.19.0), c13d4ef (**#619
  operator contract 1.11.0 + notification jumps** — 43-file footprint
  touching the rm-1016 twin surfaces plus new twin
  `public/operator-run-index.js/.d.ts`), bfcc69c (#620 Node.js digest).
- latest upstream release tag: **2026.10.27** (published
  2026-10-14T21:57:54Z), superseding 2026.10.25.
- The research phase (04:45Z snapshot) recorded 4 commits / 2026.10.25 —
  the same undercount class the rider exists to cure: a stale tracking-ref
  read that silently reports a too-small window. The two new commits
  (#619/#620) arrived between the snapshot and this turn.

Landed with this batch:

- `scripts/absorb-window.ts` — fetch-first, fail-closed window measurer.
  Fetches origin and upstream before any comparison (upstream resolved by
  name `autonomy-upstream`, then by `fro-bot/dashboard` URL suffix, then
  bare-URL FETCH_HEAD posture like the drift workflow); emits
  `{base, upstream, behind_count, window_commits, latest_release_tag,
  fetch_ts}` as JSON. `--no-fetch` refuses cached tracking refs older than
  `--max-age-hours` (default 6) with the staleness age, and refuses refs
  with no fetch reflog evidence — a stale ref can never silently
  undercount. Test seams: `ABSORB_WINDOW_NOW` (clock),
  `ABSORB_WINDOW_UPSTREAM_URL` (offline URL posture).
- `test/absorb-window.test.ts` — 12 tests over temp-repo fixtures,
  including the forced-stale reproduction of the undercount class: after
  upstream advances past the last local fetch, a `--no-fetch` read refuses
  (exit 2, age printed, nothing on stdout) where the old posture would
  have emitted the too-small window; a re-fetch reports the true window.
- `.github/workflows/upstream-drift.yaml` — pointer comment at the
  topology note (lines 17–19) naming the script as the on-demand truth
  source; no behavior change.

Absorb planning note for the gate: #619's contract-1.11.0 footprint
overlaps the sibling run 76d7977a's uncommitted operator-contract parity
delta (ACCEPTED_CONTRACT_VERSIONS ladder through 1.11.0, waiting-run
overlays, push-health parsing) — absorbing #619 must reconcile against
that landing first or the twin surfaces double-implement.

## Verification

- `node scripts/absorb-window.ts` — live JSON against the real remotes
  (window 6, tag 2026.10.27 today).
- `npx vitest run test/absorb-window.test.ts` — 12/12.
- Conflict sets: `git merge-tree <merge-base(head, a385ca5)> a385ca5 <head>`
  for each content-PR head above; pile identities from
  `gh pr list --state open --limit 100` + per-PR `files` views.
- Supersession: `git cat-file -e a385ca5:<path>`, `git grep` on `a385ca5`,
  name-status diffs from each PR's merge-base.
- `pnpm check-types`, `pnpm lint` (docs + script + test + workflow
  comment), and the repo's guard suite for touched surfaces.
