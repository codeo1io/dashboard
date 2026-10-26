# Repository-maintenance batch — cycle 1, run 3d6aa134904b (2026-10-15)

Selected by prioritize (attempt 9ae85affe, confirmed from reaped a893180bd):
**Ledger-guard re-land + lint-band restore + pin/doc alignment** — rm-857
(core) + rm-862 + rm-863, from assess bca15720's headline finding: the
2026-10-09 landing merge 3e3664c modify-vs-delete-DELETED its own batch's
claimed deliverable `test/roadmap-integrity-guard.test.ts` (merge-base 364272b
had it, batch parent 06396b4 carried it modified, the merge resolved as
DELETE) while its batch doc still claimed census 247 — the live ledger sat at
237 defs with no guard on main noticing. Deferred with rationale: rm-858
absorb (gateway ship-together constraint), rm-859 (post-absorb sequencing),
rm-860 (majors = separate batches), rm-861 (rides the absorb), rm-864
(partially subsumed here).

Ledger census at authoring: **(245 defs / 0 dups / max rm-864)** — 237 at HEAD
3e3664c plus this cycle's roadmap-phase mint rm-857..rm-864. The census claim
above is machine-verified by the new guard's newest-carrier check.

## Implement notes

- `scripts/roadmap-census.ts` restored from 06396b4 and adapted: the
  trailing-whitespace and bare-bracket rules become regression tripwires above
  recorded known-debt baselines (47 and 1 — the renderer-owned frozen band
  behind the 48-error lint census), so the script is green on the live ledger
  while still catching NEW occurrences (a fresh emptied acceptance or bare
  bracket list is red). Duplicates and the 200-defs floor stay absolute.
- `test/roadmap-integrity-guard.test.ts` restored from 06396b4 and adapted:
  status vocabulary gains the main-lineage `in_progress` spelling; the
  hollow-acceptance rule becomes a tripwire above the same 47-def frozen band;
  the lineage-specific census-comment test is replaced by the new
  deliverable-presence half (below); the id ceiling is re-derived from the
  live tree (864), not inherited from the dead lineage's 803.
- Deliverable-presence half: any `docs/prioritization/*.md` carrying a
  `## Deliverables` section declares repo-relative paths in backticked bullets;
  the guard asserts every declared path exists in-tree. Red-proof: a fixture
  doc declaring an absent path fails the parser test. Historical docs declare
  deliverables in prose (the d8fdf8b79ad5 failure pattern), which no parser
  can verify — the marker is opt-in for exactly that reason; this doc is its
  first carrier.
- rm-862: ROADMAP.md:878/:880 — the two 2026-10-09-landed
  `'[object Object]'` single-quoted tokens backticked; markdown lint census
  50 → 48 (47 trailing-spaces + the one pre-existing renderer-owned label-ref
  at :19). No other line touched.
- rm-863: `.github/workflows/visual.yaml:101/:109` upload-artifact unified to
  the v7.0.2 digest already pinned by release.yaml/scorecard.yaml;
  Dockerfile:52-57 comment now distinguishes the retired-digest claim
  (0e0ff40, verified) from the current sha256:173f1258 pin with a re-verify
  instruction; AGENTS.md clonedeps bullet made version-agnostic (points at
  the workflow pin instead of a hardcoded v0.78.0 that had drifted 44
  versions stale).

## Verify

1. `node scripts/roadmap-census.ts` — prints `defs=245 … max=rm-864` and
   `census healthy` (zero-dependency, runs on a fresh clone).
2. `npm exec -- vitest run test/roadmap-integrity-guard.test.ts` — 8 passing
   (live ledger 6: unique ids, floor, ceiling pin 864, status vocab, hollow
   tripwire, violations mirror; deliverable half 2 + fixture red-proof; plus
   the 3d07cf9 corruption red-proof).
3. `./node_modules/.bin/eslint --no-cache ROADMAP.md` — exactly 48 errors.
4. `pnpm check-types` — green (new census/guard files compile).

## Deliverables

- `scripts/roadmap-census.ts` — re-landed no-install census half (rm-857)
- `test/roadmap-integrity-guard.test.ts` — re-landed vitest schema half with the deliverable-presence check (rm-857)
- `ROADMAP.md` — rm-862 backtick fix at :878/:880 (rides this landing)
- `.github/workflows/visual.yaml` — upload-artifact v7.0.2 unification (rm-863)
- `Dockerfile` — digest-comment truth for the re-pinned base (rm-863)
- `AGENTS.md` — version-agnostic clonedeps bullet (rm-863)
- `docs/prioritization/2026-10-15-repository-maintenance-cycle-1-batch-run-3d6aa134904b.md` — this doc, first carrier of the Deliverables marker

## Outcome

Batch acceptance 1-5 from the prioritize selection are met by this tree: both
guard halves exist and pass, the census equals the live ledger (245/0/864),
the lint census is restored to 48, all three pin/doc riders are landed, and
`pnpm check-types` is green. Any landing of this batch that drops a file
listed above now fails the suite — the d8fdf8b79ad5 silent-drop class is
closed for marker-bearing docs.

## Landing record (2026-10-20, integrate conflict case 5e13305c)

Landed by the conductor integrate merge of run 3d6aa134904b (candidate
bfdd2a4, base 3e3664c) into post-2026.10.48 main (138e280). Integrate
re-census, superseding the at-mint claim above per the guard's
last-match-wins rule (main's ledger grew past this doc's mint through
parallel first-landed lineages — same-day rm-862/rm-863/rm-864 id
collisions renumbered this batch's mints to rm-2030/rm-2031/rm-2032):

**(323 defs / 0 dups / max rm-2032)**

Resolution summary: the guard pair resolved to main's independently re-landed
rm-877 lineage (census script + gate-record half) with this batch's unique
deliverable-marker half grafted into test/roadmap-integrity-guard.test.ts
(presence check + newest-carrier census-claim check); the banded lint-proxy
baselines retired under main's stronger rm-1454 zero-error eslint leg. All
seven declared deliverables above are present in the landed tree.

## Landing record (2026-10-21, integrate conflict case 8f25cf43)

Landed by the conductor integrate merge of run f376b01916294a42bf77b2582a0ae93d
(repository-maintenance cycle:3 "deliverability + observability revival",
candidate 0cf9e38, base 64cd2f6) into advanced main (192193d). Integrate
re-census, superseding the 2026-10-20 record above per the guard's
last-match-wins rule (this merge re-lands the 2026-10-18 cycle:3 roadmap ledger
content — mints rm-1960/rm-1961 plus its rider additions — on top of main's
later, larger ledger; no collisions: both ids were absent at main):

**(325 defs / 0 dups / max rm-2032)**

Resolution summary: the run's executable legs auto-merged clean (autoUpdate SW
mechanics in web/src/sw.ts + web/vite.config.ts, guard
test/sw-auto-update-guard.test.ts, ReloadPrompt retirement, rm-1961
fallback-gate wiring on the schedule workflows); ROADMAP.md resolved across
seven zones as chronological rider unions with landed supersessions owning
their def text (rm-249, rm-274), the tail extension #51 re-seated at its
authored anchor, and rm-1960 flipped to implemented at this landing (its
implement rider deferred the final flip to the commit gate); audit.yaml
composes the rm-1961 fallback-gate needs/if with main's bun-audit name; the
operator-dark visual baseline stays main's 8c072ef fourth regen. This doc's
own deliverables are all present in the landed tree, as before.

Follow-up (same landing, integrate conflict case 2935447e): the first validation
of the merged tree red exactly once — `test/docs-solutions-index.test.ts`
flagged the candidate's new solution doc
`workflow-issues/gh-cli-created-bare-date-open-ended-empty-2026-10-18.md` as an
index orphan. Root cause is pure base skew: the doc was authored on the run's
base 64cd2f6a, which predates main's rm-234 solutions index
(`docs/solutions/README.md` + its two-direction guard test, landed later), so
the candidate never carried an index entry and the auto-merge had nothing to
union. Cured by adding the entry to the workflow-issues section (count 90→91);
no other orphan, dead link, or frontmatter gap exists. Root-leg re-verified
green on the doc guards (index/frontmatter/roadmap-integrity), the web vitest
project (41 files), and the SW/static-asset guards after a fresh `build:web`.

## Landing record (2026-10-22, integrate conflict case 72dd4a92)

Landed by the conductor integrate merge of run 6abf380ea73b42549d333437bf62138b
(repository-maintenance cycle:3 batch rm-2133 + rm-2134, candidate 847f179,
base 62778fb) into advanced main (02146a1, post-2026.10.59 adoption).
Integrate re-census, superseding the 2026-10-21 record above per the guard's
last-match-wins rule (this merge lands the cycle:3 ledger — mints
rm-2133/rm-2134 plus four standalone roadmap riders, with the two defs
carrying their own implement and compound riders — onto main's later,
larger ledger; no collisions: both ids were absent at main):

**(327 defs / 0 dups / max rm-2134)**

Resolution summary: `scripts/should-release.ts` auto-merged clean as a true
union — main's upstream #683 web-test-file exception composes with the
candidate's rm-2134 bun.lock comment trues, and the reworded hard-release doc
block matches `scripts/release-paths.ts` line for line; the other three
executable/doc surfaces (`scripts/gzip-static-sidecars.ts`,
`.github/copilot-instructions.md`, `test/copilot-instructions-guard.test.ts`
with the rm-612 guard flip) carried candidate-only changes. ROADMAP.md
resolved at its two rider-append collisions (rm-271 and rm-139) as
chronological rider unions — main's 2026-10-18/19 riders first, the run's
2026-10-20 census riders after; every line of both sides' actual deltas is
preserved (verified by stage-2/stage-3 containment diff: zero HEAD-side lines
lost, and the only candidate-side lines absent are byte-identical to the merge
base, i.e. main's later edits of rm-1501/rm-673 correctly won). rm-2133 lands
as its recorded ZERO-TREE-EDIT supersession (the red tip was already cured on
main) and rm-2134 as implemented-pending-landing; the compound record
(`2026-10-21-repository-maintenance-cycle-3-compound-run-6abf380ea73b.md`)
joins the tree as the newest cohort doc with all its claimed paths present.

Follow-up (same landing, independent review conflict case
88855db5b27744ac84195a264bfec0e4): the combined tree was re-reviewed for
latent semantic conflicts before the merge concluded; the review confirmed
the resolution and corrected this record. Confirmed first-hand on the
resolved tree: zero conflict markers tree-wide; both-sides containment
re-proven for every candidate-touched file (zero HEAD-side or candidate-side
added lines lost, zero HEAD-deleted lines resurrected); the live census
equals the re-census claim above (327 defs / 0 dups / max rm-2134, per `node
scripts/roadmap-census.ts`); the roadmap/copilot/prose/fork/query guard
batteries and the impacted release surfaces (release-trigger-paths,
should-release, static-assets — 279 tests) all green; eslint rc=0 on every
touched file including ROADMAP.md, so the rm-2133 supersession holds with no
no-space-in-emphasis regression; `git ls-files .conductor` empty. One
correction applied by the review: the re-census preamble above originally
read "five riders" — the landed delta carries four standalone roadmap riders
(rm-252 window census, majors/impeccable, rm-689 pin sweep, rm-139 node gate)
plus the implement and compound riders recorded inside the two defs.

Landing-record re-census at the 2026-10-26 integrate (conflict case
79d5828af8774fd08776ff827526c24a, merging run
83e235f3dd984f7493d5494e8aec40a6's landing 3a03333a into post-2026.10.74
main): 330 defs / 0 dups / max rm-2134 — rm-892/rm-893/rm-894 grafted onto
the current wall (rm-892 and rm-894 as mainline-supersession records, rm-893
implemented with its artifacts in the merge).

Landing-record re-census at the 2026-10-26 integrate (conflict case
bc0264adf47843cfbc5defa8ec8d6a88, merging run
fa1a9c89b26b4f588dde806ed872ec07's landing c095989e into post-2026.10.74 main
36cc3570): **336 defs / 0 dups / max rm-2134** — the cycle-2 batch's six mints
rm-1506..rm-1511 grafted immediately before the Closed items heading (the band
main's extension #49 reserved for this lineage), with rm-1511 recorded
superseded-by-convergence against main's first-landed rm-1459, rm-1507
implemented over main's rm-1484/rm-1485 band (client incremental cap
accounting + the cross-twin parity suite), rm-1508/rm-1509/rm-1510 and rm-1446
implemented at this merge, and rm-1506 staying candidate (deployment-gated).
Companion merge cures recorded in the integrate graft comment at the ROADMAP
tail: the clonedeps manifest re-cured to the merged pin v0.125.3@c1173a2e and
scripts/preflight.ts adapted to the Bun-managed tree.

Landing-record re-census at the 2026-10-26 integrate (conflict case
4164aa371cd8469f970087090dc01600, completing resolver round 1 case
6dde924b71694f61ad232a729941ddf0, merging run
bcdcf49b59a144598e8c873a07a2b23f's landing 932af37 into post-2026.10.74 main
2f350cf): **339 defs / 0 dups / max rm-2134** — the base/log/doc truth trio
rm-2008/rm-2009/rm-2010 grafted onto the current wall with their compound
implemented-pending-landing statuses, evidence riders (including review-F1
and absorb-reconcile), and the tail extension #56/#57 comments; the
review-F1 PINNED restriction rides the staged base-drift.yaml and the
rm-2009 SyntaxError reason reduction rides the staged src/listener/store.ts
+ listener-store-degradation battery (both re-verified green on this merged
tree). Resolution note: the round-1 graft had duplicated the compound
extension #57 tail comment; this round de-duplicated it. The run authored no
batch doc of its own, so this doc remains the sole marker-bearing carrier.
