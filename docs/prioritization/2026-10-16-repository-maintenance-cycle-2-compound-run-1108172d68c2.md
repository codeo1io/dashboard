---
module: dashboard
tags: [repository-maintenance, cycle-2, compound, rm-1440, rm-1441]
problem_type: maintenance-compound
---

# Repository-maintenance cycle 2 — compound record (2026-10-16, run 1108172d68c2)

Pre-review compounding of the whole cycle: assess `778fae1b` → research
`3bf63328` → roadmap ext #40 (`987ae281`, mints rm-1440/rm-1441, census 237/0/
next-free rm-1442, delivered as a spool patch with the worktree left pristine) →
prioritize `82a86890` → stewardship `3135ed5a` → implement `eff57588` →
targeted_tests `f921f124` → full_tests `9e540ee2` (honest terminal failure:
external Actions outage, suite itself green) and `9296470e` (campaign-sanctioned
six-job local Main-workflow mirror, deviation disclosed up front) → compound
`7a5af6f4` (composed the layer on disk, then died at a 429 before writing its
typed result) → compound `1898113f` (verification pass + adoption; this
record). Nothing was re-validated at compound; every outcome
below is consumed from the recorded typed results and logs.

Attempt-death ledger (provider-instability context, all first-hand from event
logs / engine fold records): prioritize `ba478233` (provider abort 55s); implement
`31396157` (prior-attempt disposition, no result) + `2fab3bb5` (reaped after one
progress tick, nothing on disk — verified against the porcelain-clean dispatch
base); full_tests `43143ea1` + `98c7e112` (429 provider deaths) + `9173a819`
(reaped mid-turn; its scratch trail was read and consumed by `9e540ee2`) +
`0ee8c5e9` (fold-rejected: command field carried an `|| adopted` suffix — the
verbatim clause is unsatisfiable under the outage) + `6021a2d9` (reaped ~64s,
nothing); compound `00c35cd5` (429 provider death after one progress tick — no
typed artifact, no scratch, worktree verified to carry only implement's
delta) + compound `7a5af6f4` (429 rate-limit death at 1802.6s, AFTER
completing the on-disk composition — ROADMAP landing, this record, the
policy-doc cross-references — but BEFORE its typed result) + compound
`d41e6047` (provider abort at 96.4s, nothing). Eleven dead/superseded
attempts across the run; every phase but compound was redone whole —
compound was composed by the dead `7a5af6f4` and adopted only after the
`1898113f` verification pass (next section), this run's sole
adopted-from-death work — contrast cycle-2 of campaign 08a0abac where two
deaths left adoptable in-tree work without a verification gate.

Base lineage: dispatch base `5530b5e3e82b89da44b241177cfcd25770b51f35`
(== origin/main at cycle open, 0/0 fetch-verified at every phase). origin/main
has advanced since — implement's +1 was the #676 upstream-release adopt
(`a385ca5`; implement's typed record names the sha `4183bfe`, which does not
exist in this repository — corrected here), and at the `1898113f` verification
pass origin is +17, tip `7b4d425` (merge of run a79dc204's integrate); origin
calver tag max stays 2026.10.25 — no 2026.10.26 tag exists, and `2107ff9`
(this record's original tip claim) does not exist either; both corrected from
live probes. Origin census 248 defs / 0 dups with ids ≥1439 being only
rm-1446..rm-1452 (re-verified live), so THIS run's mints rm-1440/rm-1441 do
not collide with main (main skipped 1439–1445); integrate re-derives census
from the union as always.

## Cycle outcome (compounded)

Batch `Operator run-card output truth (upstream #586 + #585)`, LEAD rm-1440 +
co-def rm-1441, both minted by THIS cycle's roadmap (`987ae281`) from THIS
cycle's research (`3bf63328` N1/N2, both issues opened 2026-10-07 20:56Z and
read live via API). Implemented at base `5530b5e` as a 16-surface delta
(+381/−25, 12 modified + 4 new), zero fixes needed at targeted validation:

- **rm-1440 (operator-experience / 52.0)** — sanitized-Markdown run-output
  rendering: new `public/operator-run-output.js` (+ `.d.ts`) allowlist
  tokenizer built with manual character scanning and NO regexes (house
  `regexp/no-super-linear-backtracking` rejects adjacent-quantifier marker
  regexes), DOM built via `createElement`/`textContent` only, unknown syntax
  degrades verbatim, control/bidi sanitization; `operator-stream.js` renders
  through it behind a `lastRenderedOutputText` change-guard (rebuilds only at
  chunk boundaries); unavailable-snapshot copy painted once and sticky;
  `docs/solutions/best-practices/operator-sse-output-consumption-2026-06-22.md`
  rewritten to the new by-construction rule.
- **rm-1441 (operator-experience / 50.0)** — launched/expanded run-card
  timestamps-from-creation + waiting state: launch paints a creation-anchored
  `data-role=run-updated-at` time element; `operator-stream.js` accepts
  `updatedEl` (threaded via `web/src/operator/runtime.ts`
  `discoverCardStreamTargets` and both launch attach paths); compact
  `data-role=run-waiting` state from the run-status vocabulary, cleared on
  first output / terminal / non-live; monotonic adoption guard in
  `updateCardInPlace` via a `getElementDatetime` compat helper;
  `formatRelativeTime` mirrored (not imported — operator-run-index.js is a
  singleton auto-start module instantiated twice) and pinned by a 3-way parity
  test; pre-existing declaration gap closed in `operator-run-index.d.ts`.

Validation chain consumed verbatim at compound (not re-run): targeted
`f921f124` — digest verified with the engine's own code BEFORE declaring
(changed_surfaces 16, testable []; `validation:v1:a55e527016a1c…9d259b` == dispatch
digest True), focused batteries 1107 passed, contract batteries 602 passed,
web/src/operator 273 passed (incl. run-card-output-truth 5/5), guard batteries
26 passed, `pnpm check-types` rc=0, `pnpm lint` rc=0. Full `9296470e` — six-job
Main-workflow mirror with each job's run-steps verbatim (node 24.21.0 +
pnpm 11.28.5): install frozen rc=0; lint rc=0 0/0; design-check `[]` pass;
check-types rc=0; `pnpm test` 94 files / 4286 tests green (59/3076 root +
35/1210 web, both new suites proven inside via `vitest list`); actionlint
container rc=0 0 findings; scripts-load 49/49 modules. Prior `9e540ee2` stands
as the honest terminal failure of the verbatim route: canary dispatch HTTP 422
'Actions has been disabled for this repository.' live, run list frozen at
2026-10-09T01:59:31Z, `github_ci_validate.py --timeout 120` → 'timed out without
registering any PR checks' (ephemeral PR #721 created/closed, refs deleted by
the script).

## Ledger deltas made at compound

- **Mints landed in-worktree**: rm-1440 (52.0 group, after rm-843, before
  rm-216) and rm-1441 (50.0 group, after rm-856, before rm-153) — status
  `implemented … pending landing`, each with signals/acceptance/evidence, an
  implement rider (eff57588) and a validation rider (this phase, recorded
  outcomes only). The completed/landed flips stay reserved to landing
  verification per house rule.
- **Why compound landed the roadmap layer**: the roadmap phase delivered its
  16-insertion extension as spool patch `roadmap-delta-1108172d-987ae281.patch`
  ('apply at the commit gate') — that patch, along with the phase's .md/.json
  companions, has since been SWEPT from the spool (verified this attempt:
  no file by name anywhere under the spool; only `results/` typed envelopes
  survive). Forensics on the prior compound death (`00c35cd5`) proved nothing
  landed. Landing the content at compound — reconstructed verbatim-in-substance
  from roadmap `987ae281`'s typed record (mint text, riders, comment census)
  — was the only path that does not lose the ledger extension; provenance is
  recorded inside extension comment #40 and in both riders.
- **Roadmap-layer riders landed**: rm-249 (upstream #615 push wire-shape datum,
  research B — absorb-first before minting fork-side push work) and rm-760
  (npm refresh: all five rm-1433 watchlist majors released + in-window openers,
  research C).
- **Claim comments**: roadmap extension #40 (census 237/0, def-max rm-1441,
  next free rm-1442, rm-1439 respected as reserved; TWO RECORD CORRECTIONS:
  assess 778fae1b finding (c) session.ts:99 unguarded-JSON.parse is a FALSE
  POSITIVE (try :76 / catch→null :106-108 → 401 path; only unguarded src/ parse
  is listener/store.ts:51 = fog rm-1434) — never mint it; upstream OPEN #112
  infra-only dispatch app is ALREADY implemented fork-side at
  release.yaml:574-606 INFRA_DISPATCH_* — fork-ahead recorded, no work item)
  plus this compound's tail comment taking the newest-claim slot.
- **Digest immovability re-proven with engine code**: the roadmap+compound
  layers touch only ROADMAP.md and docs/prioritization/ (non-executable
  classes), and `validation_policy.validation_digest('5530b5e3…5170b51f35',
  worktree)` re-derived BYTE-IDENTICAL to
  `validation:v1:a55e527016a1c75319e8e286be20f88c01e4ecb9e3433927804761fa5e9d259b`
  after composition — the implement-applied digest still binds the tree.

Census after this layer: 237 def ids / 0 dups / max rm-1441 / next free
rm-1442. Zero status flips beyond the two implemented-flips recorded above;
completed history untouched.

## Verification pass (compound `1898113f` — adopting the `7a5af6f4` layer)

No typed PhaseResult survived any compound attempt: `results/` holds only
provider-failure envelopes for `00c35cd5` / `7a5af6f4` / `d41e6047` (429 at
43.2s, 429 at 1802.6s, abort at 96.4s), and the `delegate/` typed channel is
empty for all three. The on-disk layer was therefore verified against the
surviving typed records (`results/` retained every phase envelope through
the spool sweep; only the `delegate/` .md/.patch companions were swept)
before this adoption, and this record was corrected in place where the live
probes said so:

- Census re-probe (live): 237 def ids / 0 dups / max `rm-1441` / next free
  `rm-1442`; zero non-comment lines past the 4000-char length-guard cap;
  zero trailing whitespace; zero bare `#NNN:` bullets (the 2026-10-16 ATX
  trap); zero unescaped square-bracket pairs in the added prose.
- Lint boundary of this phase: NO lint or test command was run here
  (compound consumes recorded outcomes); every known ROADMAP lint trap class
  was audited statically instead, and full `9296470e`'s job-1 lint rc=0
  stands as the recorded outcome for the pre-compound tree.
- Dangler census: ids cited by the added lines with no def at this base —
  rm-985, rm-1433, rm-1434 (family/fog context) and rm-1438, rm-1439,
  rm-1442 (frontier numerals in evidence/comment context) — none has a def
  on origin/main either; and no render/dangler guard test exists at this
  base or on origin/main (only roadmap-length-guard and prose-residue-guard;
  ROADMAP.md and docs/prioritization/ are prose-residue-excluded, and the
  policed terms are absent from both files).
- Roadmap-layer fidelity: the landed mints, riders, and comment #40 match
  roadmap `987ae281`'s typed record in substance (ids, priorities 52.0/50.0,
  group placement rm-843→rm-1440→rm-216 and rm-856→rm-1441→rm-153, rider
  content, census, both record corrections). One landed mislabel FIXED this
  pass: the rm-1440 evidence line had called rm-1438 the committed-ledger
  def-max — per the typed record rm-1438 was the spool-patch def-mint max
  and the committed-ledger max was rm-856 (pre-mint def ids top out at
  rm-856; nothing sits between 856 and 1440).
- Base-lineage corrections this pass: `4183bfe` (implement's claimed +1
  sha) and `2107ff9` / release `2026.10.26` (this record's original tip
  claim) do not exist in the repository or its refs; verified window tip
  `7b4d425`, `a385ca5` = #676 adopt of upstream release 2026.10.25, origin
  calver max 2026.10.25.
- Digest immovability re-derived THIS pass with engine release `7257971e`'s
  own code:
  `validation:v1:a55e527016a1c75319e8e286be20f88c01e4ecb9e3433927804761fa5e9d259b`
  — byte-identical to the dispatch / targeted / full digest, re-derived from
  `5530b5e3e82b89da44b241177cfcd25770b51f35` over the worktree; the roadmap
  and compound layers stay outside the executable classes.
- Worktree census at adoption: 13 M + 5 ?? = 18 surfaces = implement's 16
  (12 M + 4 ??) + ROADMAP.md + this record; the 5 engine stashes untouched.

## Reusable lessons

1. **Sweep-resilience**: a phase's canonical patch in the delegate spool is NOT
   durable between phases — spool rotation swept .md/.patch companions while
   `results/*.json` typed envelopes survived. Design implication for downstream
   phases: treat the typed PhaseResult (which carries the content in its
   summary) as the recovery source, and verify named artifacts exist before
   building on them (this compound did, before re-planning).
2. **Fold-shape discipline under the Actions outage**: a substitute full-suite
   route must (a) disclose the deviation up front, (b) run each workflow job's
   steps VERBATIM from the release's workflow file, and (c) re-derive the
   validation digest with the engine's own code before and after — a mirror
   changes nothing executable, so the dispatch digest must hold byte-identical.
   Attempt `0ee8c5e9`'s fold-rejection (a command field with an `|| adopted…`
   suffix) is the cautionary twin: never decorate the recorded command.
3. **Engine-code-first validation reading**: `changed_surfaces`/`testable_surfaces`
   classes are the authority on what a phase's delta binds — public/, test/,
   web/, docs/ are non-executable, which is exactly why this run's md-only
   compound layer cannot invalidate the implement digest.
4. **Prior-attempt forensics is cheap and load-bearing**: every death this run
   (10 attempts) was classified from event logs + porcelain before any redo —
   zero double-work, zero adopted garbage.

## Next-cycle candidates (context for the next assessment)

- **Landing verification of this batch** (first obligation): flip both
  implemented defs to landed on the union base; post-merge
  `git ls-files .conductor` must end empty (standing landing trap).
- **rm-252 absorb decision**: 4-commit window stable across the cycle —
  cf4c9a7 (#615) / f12fde0 (#616) / 2c25f9b (#604) / 44ff0fd (#618), tip
  2026-10-14T14:24Z; dashboard releases 2026.10.24 + 2026.10.25 unabsorbed;
  read-only invariant still absolute (exclude write-capability surfaces by
  default, rm-259 disposition); the #615 push wire-shape rider on rm-249 arms
  the joint push-delivery decision.
- **rm-760 / rm-1433 sweep class**: ALL FIVE watchlist majors now released —
  typescript 7.0.2, vitest 5.0.4, jsdom 30.1.2, vite-plugin-pwa 2.0.0,
  pnpm 12.11.2; in-window openers hono 4.13.13, @hono/node-server 2.1.5,
  @playwright/test 1.64.1, fast-check 4.10.2, @opencode-ai/plugin 1.19.0.
  Soak windows re-derive at selection time.
- **rm-139 Node window**: v24 maintenance starts 2026-10-20 (imminent at
  writing), v26 LTS 2026-10-28 — the Node-gate decision can no longer ride.
- **Standing outage context**: two-sided dispatchability probe (canary
  dispatch + frozen run list) BEFORE any validation branch; the six-job local
  mirror is the sanctioned substitute (recipe doc owned by sibling run
  40bcd47a, unlanded at this writing — corroborate at absorb time, do not
  duplicate).
- **rm-1440 residual**: the run-output size-cap constant stays deferred (issue
  #586 puts caps gateway-side); if upstream lands its own #586 fix, the
  absorb-collision seam recorded in the def governs (adopt lexer shape or
  fold, never fork-drift).
- **Frontier discipline**: next free rm-1442; rm-1439 stays reserved
  (roadmap-layer probe recorded it as claimed-by-probe only).

## Integrate obligations

- Ledger delta inventory to land: 2 mints + 2 roadmap riders + 2 claim
  comments (this file's sibling edits) + this cycle record
  (docs/prioritization/2026-10-16-repository-maintenance-cycle-2-compound-run-1108172d68c2.md).
- Full candidate delta = implement's 16 surfaces (12 M + 4 ??: new
  `public/operator-run-output.js`, `public/operator-run-output.d.ts`,
  `test/operator-run-output.test.ts`,
  `web/src/operator/run-card-output-truth.test.ts`) + ROADMAP.md + this doc.
- Union base: origin/main advanced +17 since dispatch (census 248/0 there;
  ids ≥1439 only rm-1446..rm-1452 — no collision with this run's mints);
  re-derive census, lint parity (edited vs pristine ROADMAP on the union), and
  the validation digest from the union base at integrate.
- 5 pre-existing foreign stashes in the worktree are untouched engine state —
  do not drop or apply them.
