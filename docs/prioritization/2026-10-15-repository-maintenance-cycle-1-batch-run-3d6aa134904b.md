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

## Re-census (2026-10-21, run d9bcb108 cycle:7 roadmap mint)

Dated re-census per the guard's last-match-wins rule: the cycle:7 roadmap
mint (attempt f17b7787cc6d4dffb86d794bedef8f04, repository-maintenance) adds
defs rm-2033..rm-2037 plus one rm-252 window rider at the run's worktree
base; unlanded at append time. Parallel-mint coordination: a sibling run's
unlanded envelope claims ids in the rm-2135..rm-2138 band, so this mint
stayed at or below rm-2037; any later parallel mint must re-census for the
next free id (rm-2038 on this tree) before claiming.

**(330 defs / 0 dups / max rm-2037)**
