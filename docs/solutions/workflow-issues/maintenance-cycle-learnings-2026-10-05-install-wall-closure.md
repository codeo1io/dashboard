---
module: dashboard
tags: ['maintenance-cycle', 'ci', 'security', 'supply-chain', 'lint', 'roadmap']
problem_type: workflow-issue
---

# Maintenance cycle learnings — install-wall closure and the silent-drift class (2026-10-05)

Context: conductor run `5e66155863354a2d8eb63fe6beeaabd8`
(repository-maintenance cycle:1), base `306a972` == origin/main, batch
"unfreeze main, keep it green, close the silent-drift class" (B1–B5:
lockfile re-derivation, `verifyDepsBeforeRun: false`, Dockerfile libpcre2
runtime upgrade, `lockfile-guard.yaml` byte-adopt, records-truth folds).
All outcomes below are PRE-REVIEW, recorded verbatim from the cycle's
phase artifacts (assessment → research → roadmap → prioritization →
implementation → targeted tests → full validation). This doc was written
at compound with no tests executed; review and shipping outcomes are
carried by the next cycle's assessment. (Exception: the post-review
addendum at the end — L7 — was recorded by the 2026-10-06 review repair,
dated in place.)

## The decisive learnings

#### L1 — the label-refs lint class recurs fleet-wide, and was invisible behind the install wall

Full validation run 1 (ephemeral PR #384) fail-fasted on Main/Lint with 4
`markdown/no-missing-label-refs` errors — in the batch's OWN prose: three
bare `sha256[:8]`-style slices plus one bracketed run-result citation.
The house rider-citation tokens are themselves the trigger. The class was
already documented (`roadmap-append-markdown-label-ref-lint-2026-09-25.md`)
but its prevention rule — run full `pnpm lint` before handoff — could not
fire in any cycle since 2026-10-04: the install wall killed the Lint job
before eslint ever ran, so every markdown author was writing with zero
lint coverage. The first batch that unblocked Lint ate the accumulated
class.

Prevention (now standing):

- Phases writing rider or batch-doc prose backtick every bracket-bearing
  token by construction — `sha256[:8]`, bracketed run-result citations,
  any shortcut-reference-shaped text.
- Any `.md`-touching batch must run full `pnpm lint` as an implement gate;
  B1's landing makes that runnable again.
- Markdown-only fixes sit OUTSIDE the engine dispatch digest (executable
  surfaces only): the PR #384 → #385 lint fix re-derived the dispatch
  digest IDENTICAL, so prose repairs never invalidate a dispatch.

#### L2 — a drift class needs the two-layer closure, or it recurs through the other layer

The silent-lockfile-rewrite + wholesale-drift-import class closed at both
layers this cycle, after four manual cures in four days failed to hold:

- Run-time: `verifyDepsBeforeRun: false` (rm-656) — A/B-proven at
  implement: control run silently rewrote the lockfile `ced1e543` →
  `9abdcdd5` on `pnpm run` at a stale tree; treatment run left it
  byte-identical.
- Merge-time: `lockfile-guard.yaml` (frozen-lockfile-only, seconds-class)
  — the gate that would have caught `1e1e2f5` in Setup seconds, validated
  green on hosted CI on the batch's own validation PR #385 (run
  37346287839): the armor ships with its own green check.

#### L3 — re-derive, never transplant: the cure blob is time-varying

The regenerated lockfile's identity depends on derivation era
(`9abdcdd5` from this run's 02:33Z and 12:31Z derivations; a sibling
lineage's 08:43Z-era derivation recorded `96db787f`) under
`minimumReleaseAge` aging plus registry drift. Shas are evidence; the
5-point acceptance PROCEDURE (copy to /tmp, regen, frozen-check, audit,
overrides-mirror equality) is the durable cure — cross-run reconciliation
must be by procedure and content, never by transplanting a sibling's
blob. Corollary found fresh this cycle: the stale lockfile was stale
against the manifest in TWO ways — the pre-rm-276 overrides mirror AND
missing manifest-required toolchain (zero axe-core, zero playwright
entries); one regen cured both. Frozen-install trap mechanics live in the
sibling-cycle entry `pnpm-lockfile-config-mismatch-frozen-install-trap-2026-10-05.md`
(referenced, not duplicated).

#### L4 — workflow-yaml surfaces default to FULL validation; budget it

The targeted runner cannot prove narrow scope for `.github/workflows`
changes (impacted-tests verdict: fallback=full), so a workflow-touching
batch's focused gate IS the ephemeral-PR full CI run. That was decisive
here — it is the only gate that caught L1. See also
`ephemeral-ci-fallback-routes-to-full-when-config-surfaces-change-2026-10-03.md`
and `conductor-full-validation-ephemeral-pr-public-repo-2026-10-04.md`.

#### L5 — comment-truth rides the change that falsifies it

The Dockerfile's "patch retired — absorbed at the base" comment and the
rm-558 header's "COPY plus one prune RUN" claim both went false the
moment the new `--only-upgrade libpcre2-8-0` RUN landed; both were
rewritten in the same batch. Second observed instance of the standing
trap (research flagged it this cycle for Release's stale comments):
comments asserting upstream/base state have a shelf life tied to the
digest or merge they describe — falsify-and-rewrite in the same change,
never defer.

#### L6 — LANDED claims on pairs must be verified against the CURRENT blob

rm-285's "LANDED 2026-10-03" was silently half-false for ~26h: the
`1e1e2f5` upstream merge resolved the lockfile conflict upstream-ward,
keeping the fork's floors but re-importing the stale lockfile (audit 0 →
17 by this cycle's assess probe). The correction-of-record is a dated
rider on the item (never a rewrite of the original rider — the original
is the historical record), and the prevention is structural now: Lockfile
Guard on main pushes. Standing rule: any LANDED claim that spans a
floors+lockfile (or manifest+lockfile) pair is checked against the
current blob, not the integrate's.

## What compounds into the repo now

- ROADMAP riders (dated 2026-10-05, run `5e661558…` compound attempt
  `710bfe59…`): rm-276 full validation record; rm-656 'CI unchanged'
  clause validated; rm-116 'Lockfile Guard' context-name pre-registration
  + fill interlock; rm-285 correction-of-record. Zero ids minted, zero
  status flips at compound (implementation records were written by the
  implement phase; review/shipping statuses come later).
- Next-cycle context + post-landing watch set appended to
  `docs/prioritization/2026-10-05-repository-maintenance-cycle-1-batch-run-5e661558.md`.

## Recurrence watch + invariants held

- Post-landing watch set (from the batch doc): 12/12 green at the landing
  commit; the push-only classes (Release, Scorecard analysis) fire on the
  landing push; audit dispatch green (Monday probes by run id);
  dependabot #29/#30 close only after GitHub re-indexes the LANDED
  lockfile; `git ls-files .conductor` empty after any landing merge.
- Next-cycle leads: rm-116 protection fill (context names now exist
  first-hand from PR #385; fill ONLY post-landing); rm-659 run-history
  deletion forensics (operator-gated); rm-271 undici-8 watch is
  only-if-Test-red post-landing; the Node-26 seam (rm-139) and pnpm-12
  re-evaluation (rm-140's rider) stay the standing upgrade leads; a
  hygiene sweep of dead `conductor/ci-*` refs (~100+ unreaped branches,
  stale validation drafts) remains open.
- Invariants held at compound: ledger census 217 defs / 0 dups / max
  rm-659 (riders only, nothing minted); Completed/Superseded sections
  untouched; base `306a972` unmoved; lockfile `9abdcdd5` byte-stable;
  pnpm never invoked in-tree by this phase.

## Post-review addendum (2026-10-06, review repair attempt `7cca9ec3…`)

#### L7 — Release's Enforce gate is push-only: image-touching changes ship with a local replica or blind

The independent review (attempt `2241c6de…`, finding F1) proved B3's upgrade
set incomplete: `perl-base 5.36.0-7+deb12u3` shipped with 7 unfixed (3
CRITICAL + 4 HIGH, all fixed in `deb12u4`) — and no pre-ship phase could have
caught it, because full validation runs on ephemeral PRs while `release.yaml`
triggers on push to main only, so its enforcing trivy step structurally never
runs before landing. Standing pre-ship check for any image-touching change
(Dockerfile, base-digest pin):

    docker build -t <tag> .
    docker run --rm <tag> dpkg-query -W -f='${Version}\n' libpcre2-8-0 perl-base
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
      aquasec/trivy:0.72.0 image --scanners vuln \
      --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 <tag>

trivy `0.72.0` is the release.yaml Enforce pin; the `--rm` container starts
with an empty DB cache, so every run renders a forced-fresh-DB verdict — the
one Release will actually render at landing. rc=0 required pre-ship. Same
family as L5's third observed instance: F2's "→ 0 after the upgrade" ladder
sentence was falsified by a newer DB within the same cycle — era-stamp scan
numbers, never freeze them as standing truth.

## Post-review addendum 2 (2026-10-06, review repair attempt `fccd4229…`)

#### L8 — audit greens expire with the advisory DB: re-derive `pnpm audit` at every fold

The re-review (attempt `eb452afd…`, blocking finding) proved this batch's
`pnpm audit --recursive` rc=0 acceptance — recorded green 2026-10-05
12:31Z through ~19:30Z — was time-defeated within a day with ZERO code
change: the DB indexed source-map-js GHSA-68fv-2mgg-jv7q (HIGH, patched
`1.2.2` published 2026-09-30T14:08Z but indexed only ~2026-10-06; ~16
dev-transitive paths via `@eslint/css-tree`, the `@tailwindcss/*` chain,
`vite` > postcss) and katex GHSA-238p-pmpm-9mq7 (LOW, patched `0.18.2`;
dev-transitive via `@bfra.me/eslint-config` > `@eslint/markdown` >
`micromark-extension-math@3.1.0`, which declares `^0.16.0` with no
`^0.18`-capable successor). A floor set can be perfectly clean at
derivation and RED at the next scheduled audit fire (Monday 2026-10-12
03:37Z). Standing rule: every fold or gate that cites audit-0 must
RE-DERIVE it against the live DB at its own timestamp — a recorded green
is an era record, not standing truth (same class as L7's era-stamped scan
numbers). The cure rode the same review: floors `source-map-js
'>=1.2.2 <2.0.0'` + `katex '>=0.18.2 <0.19.0'` — the katex floor forces
the patched line out of the declared range, inert at lint time since this
repo renders no math fences — re-derived blob `4263901b`, audit rc=0
re-proven 2026-10-06.
