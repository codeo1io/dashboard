# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-09-30, run 5bf98ac301ad)

module: dashboard
tags: `[security, workflow, docs, maintenance, batch-record]`
problem_type: batch-record

Frame: base `31995a2` (== origin/main, verified unmoved live at 2026-09-30T22:24Z —
tip is still the 08:56:31Z merge of run `26210bbbb6514465a576835dae1442ef`; the
19:0x-05:1xZ conductor CI validation PRs #280/#281 remain OPEN as residue, their
doc edits already landed at base — see B2's conflict surface). Run
`5bf98ac301ad4bceb2facd6f6899e49d`, repository-maintenance cycle:1. Phases:
assess `9902816d4d934d4fa2d89d5a2e7e22d2`, research
`b2c4acde09b14097983511f670b19e4f` (re-fire of a 429-killed nothing-landed
attempt, verified), roadmap `ad1d3814b7b84b0698f84f6a7c311958` (61 pure appends,
in-tree uncommitted: three mints rm-309/rm-310/rm-311 + 11 dated riders),
prioritize attempt `6d6f74eacb8f42319fdfc30984609269` (this document).

## The cycle's mandate

One theme: **the surfaces the maintenance fleet left open — token hygiene and
doc truth.** The 2026-09-30 fleet census (below) shows nine-plus sibling
maintenance lanes at this exact base have content-claimed every headline
surface: floors/audit (five lanes), the ROADMAP lint cliff (three lanes), the
monitoring panel, the canary isolation, the absorb window (three deferrals to a
dedicated future cycle). What remains unclaimed, and what this run itself
minted fresh evidence for, is small, mechanical, and high-certainty:

- schedule-job GITHUB_TOKEN lifetime in workspace git config (`rm-309`),
- an actively-wrong operator diagnosis doc (`rm-311`),
- a docstring that mis-states a tested invariant (`rm-126` residual rider).

Selecting these three is the house "highest landing-probability per unit of
value" axis (precedent: run `be59a16e`'s 2026-09-30 selection under the same
nine-lane contention), not a retreat from impact: every higher-impact open
surface is multiply claimed unlanded, and a fourth claim would manufacture
landing-gate conflicts without adding fleet value.

## B0 — baseline battery (measured fresh this run, not re-derived)

- `pnpm check-types` → rc=0 (assess, 2026-09-30 ~21:05Z).
- `pnpm test` → 78 files / 3452 tests green (assess log 5bf98-test.log).
- `pnpm audit --recursive` → 19 vulns 8 high / 8 moderate / 3 low
  (assess pnpm-audit.json; research pnpm-audit-fresh.json, same shape).
- `pnpm exec eslint . --ignore-pattern ROADMAP.md` → rc=1, 12 problems
  (11 trailing-spaces + 1 label-ref; re-measured 2026-09-30T22:14Z identical).
- `timeout 100 pnpm exec eslint ROADMAP.md` → SIGTERM rc=124 (21:18:38Z): the
  base-inherited markdown cliff — monolith lines :175 (7317ch, rm-103) and :408
  (7967ch, rm-157), with :112 at the 5222ch measured-safe boundary. NOT this
  batch's target (owned in flight, see exclusions); recorded because every
  unit below must stay provable with the cliff still standing.

## B1 — rm-309: workflow checkout persist-credentials sweep (LEAD)

- **Change.** Add `persist-credentials: false` at the four omission sites —
  `.github/workflows/base-drift.yaml` (both checkouts), `canary.yaml`,
  `visual.yaml` — measured census 2026-09-30T22:1xZ: 15 checkout steps repo-wide,
  11 already false + `fro-bot.yaml:322` explicit; `dependency-review.yaml` has
  no checkout step and needs nothing. Record in the batch doc's verification
  section why each qualifying site qualifies (jobs that never push).
- **Gates.** actionlint container-form over `.github/workflows` green (house
  recipe, no host assumptions); targeted YAML lint (`yml/quotes` — single-quote
  the added value); the fresh checkout-vs-setting census line lands with the
  diff.
- **Risk.** LOW — yaml-only, no runtime path, schedule/dispatch jobs only;
  defense-in-depth class (no known read path; the repo holds no secrets).
- **Verification (implement, 2026-09-30).** Census re-run post-sweep with a
  PyYAML walk (parser-based, not grep windows): **15/15** `actions/checkout`
  steps across 9 workflows now set `persist-credentials` — 14 plain `false` +
  `fro-bot.yaml:322` explicit conditional with inline reason. The four cured
  omission sites: `base-drift.yaml:52` + `:160`, `canary.yaml:42`,
  `visual.yaml:63` (all `with:` blocks added, matching `codeql.yaml`'s form).
  actionlint container-form (`rhysd/actionlint:1.7.12`, the 3 changed files)
  rc=0; targeted `eslint` on the 3 yaml files rc=0. Each cured job is
  schedule/dispatch-only and never pushes — `persist-credentials: false` is
  strictly defense-in-depth. Every qualifying site sets it; no site needs the
  inline-reason exception.
- **Why lead.** The only unclaimed security-track surface in the fleet census;
  XS effort; independently verifiable.

## B2 — rm-311: supersession addendum, ci-validator-poll-window doc

- **Change.** Append a dated supersession section to
  `docs/solutions/workflow-issues/ci-validator-poll-window-vs-cold-lint-2026-09-29.md`
  recording that the herd-contention diagnosis its :25/:49 region still teaches
  was superseded on 2026-09-30 by the cliff proof (rm-104's rider:
  `eslint ROADMAP.md` alone cannot finish in 100s, rc=124; main Lint cancelled
  on three consecutive pushes), pointing at rm-104's evidence; preserve the
  still-valid poll-window mechanics and the landed rm-159 disposition amendment
  at :78 (`durably, in-repo` — verified present at base).
- **Gates.** Targeted `eslint` over the doc rc=0; no trailing spaces; bounded
  line lengths; fenced-frontmatter discipline does not apply (this is an
  existing solutions doc, not a new one).
- **Risk.** LOW — docs-only; no code path.
- **Why now.** The doc actively sends operators at the wrong cure while main
  Lint is red for the real reason; adjudication-mandated (2026-10-01 PR
  #196/#206 residue adjudication) and owned by no sibling lane.

## B3 — rm-126 rider: driftCount docstring wording residual

- **Change.** `src/github/aggregator.ts:139` (DTO docstring "repos the Agent
  App can see that are NOT in public metadata") and the `:518` walk JSDoc
  phrase → the "not matched into the public set by node_id" wording, matching
  the tested node_id-keyed counting at `:622` and the skew-twin assertion at
  `test/aggregator.test.ts:650/:671`. No behavior change; recorded home is
  rm-126 (rider in this cycle's roadmap extension), not a new mint.
- **Gates.** `pnpm check-types` rc=0; targeted aggregator suite green with the
  :650 test byte-unchanged; docstring/behavior agreement grep clean.
- **Risk.** LOW — comment-only in a hot file; shared-file surface flagged
  below.
- **Why now.** Operator-visible driftCount semantics stay overstated until the
  two-line truth fix lands; zero new surface invented.

## Selection method

1. Inventory = this run's fresh mints (rm-309/rm-310/rm-311) + its 11 dated
   riders + the open ledger's candidates, scored on impact / risk / effort /
   dependencies / strategic value.
2. Decisive filter = live fleet claim map, built from all 24 sibling worktree
   spool phase-results at this base (worktrees themselves were janitor-swept
   during this phase; the spool JSONs are the durable record — sibling
   `4ee1aff3`'s JSON is corrupt on disk and is cited by its mints rm-307/rm-308
   instead) plus a live open-PR file probe at 22:24Z.
3. Ordering = landing probability per unit of value; every multiply-claimed
   surface is excluded (table below), every unit kept is unclaimed in
   substance, completable end-to-end (implement + targeted tests) with the
   cliff still standing, and needs no gateway, no push rights, and no future
   window.

## Excluded, with rationale (the fleet claim map)

| Surface | Claimed / blocked by | Disposition |
| --- | --- | --- |
| rm-310 masked lint debt (pr-233 ×11 trailing spaces + cycle-19-batch:4 label-ref) | `f89673c5` B1 (backtick cure + `eslint --fix` rides its cliff split), `7ce48fe5` B1 rm-284 (:4 backtick), `f716b7e7` internal pre-flight ("pre-fix all three before cloud validation") | **Deferred — triple-claimed.** First-lander wins; rm-310 stays the recorded home for the census + scoped-green acceptance; renumber-by-content at reconcile |
| ROADMAP cliff split (:175 rm-103, :408 rm-157, :112 boundary) | `f89673c5` B1 LEAD; `f91bcdc2` rm-294 shard; `f716b7e7`/`0a6430c9` B1s (split script reused from `a82a198a`-scratch) | Excluded — in-flight sibling lineage, reconcile by content |
| transitive security floors / audit signal | `f716b7e7` (rm-298/299/300), `0a6430c9` (rm-286), `f3fbd7d9` (rm-281+), `f91bcdc2`, `173ce2aadf09` (rm-307) | Excluded — five-plus lanes |
| rm-107 operator panel + rm-119 roll-up + rm-141 | `be59a16e` (B1/B2/B3, full monitoring batch) | Excluded — owned |
| rm-252/rm-157 absorb window | dedicated absorb cycle (`3f3abfdd`, `a666f8c0`, `b6abe350` deferrals) | Excluded — sequencing discipline |
| rm-116 branch-protection fill | this run's own rider: sequenced AFTER the cliff cure lands | Blocked by ordering, not by claims |
| rm-117 code-scanning triage (63 open) | own-coherent-batch class (house deferral precedent) | Excluded — batch-size discipline |
| rm-139 Node 26 / rm-140 pnpm 12 / rm-133 dependabot window | time-gated 2026-10-20 / 2026-10-21 / 2026-10-28 | Blocked by windows, tracked on watchlist |
| rm-271 toolchain majors | TS7 blocked (`typescript-eslint@8.71.0` peer `<6.1.0`) | Blocked upstream |
| canary born-broken truth (rm-280 class) | `7ce48fe5` B2 rm-288 canary isolation; PRs #231/#234 in flight | Excluded — owned |
| rm-249 / rm-159 / rm-217 disposition classes | adjudication + residue sweeps, not implementation | Out of scope by kind |

## Conflict surface (files this batch touches vs live traffic)

- `base-drift.yaml`, `canary.yaml`, `visual.yaml` (B1): PR #234 (canary.yaml,
  floors lane) and PR #196 (unlanded 2026-09-25, visual.yaml) touch the same
  files in different hunks; mergeable, flagged for the integrate fold.
- `docs/solutions/workflow-issues/ci-validator-poll-window-...md` (B2): PRs
  #280/#281 carry the **landed** rm-159 amendment (:78) against their own stale
  bases — close-then-delete residue per rm-159, not a content claim; my edit is
  the :25/:49 diagnosis section plus a new tail section.
- `src/github/aggregator.ts` (B3): shared with `be59a16e`'s in-flight
  rm-107/141 batch (watchdogStamp `:1030-1035`/`:1404` + tests) and stale PRs
  #231/#33/#206 — all hunks disjoint from `:139`/`:518` docstrings.
- `ROADMAP.md`: this cycle's own extension is in-tree; the cliff lanes' splits
  target :175/:408/:112 — disjoint from every rider this batch flips.

## Watchlist

- **rm-310 convergence:** whichever cliff lane lands first fixes the same 12
  problems; at compound, verify by content and renumber this run's rider map
  accordingly.
- **rm-133 dependabot re-eval 2026-10-21** (vitest 5.0.3 / TS 7.0.2 live,
  TS7 still peer-blocked) and **rm-139's gate window 2026-10-20 → 2026-10-28**.
- **hono 4.13.12** in-range refresh maturity 2026-10-01T09:43Z (rm-196 rider
  riding `f3fbd7d9`'s lockfile operation, not this batch).
- **Canary cron Mon 2026-10-05 05:23Z** fails identically (ERR_MODULE_NOT_FOUND)
  until the sibling canary lane lands; rm-179's "first fire pending" text stays
  false until then.
- **Stale-PR residue:** PRs #280/#281 (+ the 2026-09-25 #196/#206 adjudication)
  await the residue sweep — do not bulk-close as empty.

## Next-cycle context (reconcile-by-content map + post-landing obligations)

- **rm-309** — no twins fleet-wide; lands as-is. Post-landing: actionlint green
  on main's push run; the 15-checkout census line stays in this doc's B1
  verification block (fill at implement).
- **rm-311** — unique content; PRs #280/#281 doc edits are the landed rm-159
  amendment, not this addendum. Post-landing: none beyond the targeted-lint
  transcript in the implement notes.
- **rm-126 rider** — partial implement by design: compound resolves the
  residual rider on rm-126's block (the item's implemented status line is NOT
  re-flipped; only the 2026-09-30 residual rider gets its outcome recorded).
- **rm-310 deferral map** — if `f89673c5`/`7ce48fe5`/`f716b7e7` land the
  pr-233 + :4 fixes first, rm-310's census paragraph is the surviving value:
  flip rm-310 to "implemented by convergence" citing the landed sha, or fold
  its census into that item's rider map at integrate. If none lands (all three
  are unlanded today), rm-310 becomes next-cycle's lead candidate with this
  doc's claim map as the freshness check.
- **Id-space:** this cycle minted rm-309..rm-311 at 2026-09-30T22:1xZ above the
  re-probed in-flight ceiling rm-308 (contiguous 280..308; raw rm-351/rm-382
  hits were run-id prefixes). Next mints continue at rm-312+, re-probing the
  spool census first — the ceiling moves within hours.
- **This batch's own next-cycle leads if it lands clean:** rm-310 (if still
  unclaimed), rm-116 (unblocked once a cliff cure lands), rm-117 (triage
  batch).
