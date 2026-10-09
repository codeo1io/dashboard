# Repository maintenance — cycle 2 run 493bbbf2 (2026-10-09, prioritize 1b02a1f1)

Run requirement lineage: repository-maintenance:40c3c987488a4931bb9ea115d6375109:cycle:2:/work/projects/dashboard

Phases so far: assess (gate battery all green at 364272b == origin/main, 0 behind
after fetch; pnpm audit full = 0 known vulnerabilities) · research 6e9b9be5
(upstream window, npm publish times, action tag peels, agent releases — all
first-hand 2026-10-09 ~06:06Z) · roadmap 224cff78 (ZERO MINTS by design after
content-dedup; 7 dated riders + extension comment #31; census 245 defs / 0 dups /
max rm-778; guards + eslint green) · prioritize 1b02a1f15f5d43a48d9ccfc847eb8925
(this doc). Base 364272b; porcelain at phase start was exactly ` M ROADMAP.md`
(the roadmap deliverable, in-worktree by design).

## Inputs

- This run's fresh ledger riders (rm-760, rm-137, rm-252, rm-689, rm-139 + two
  posture riders) — every number probed first-hand this cycle.
- Fleet state at the 07:19–07:29Z selection window: per-campaign conductor.db
  `runs` liveness (last columns status/updated_at), id-level wall scan
  (def-line → `status: open (selected` association — never a rigid one-line
  grep), and the CURRENT batch docs of every live lane.
- Open PR surface: #465/#463/#459 (validation lanes), #460 (ci-trigger-probe),
  #455 (conductor/run-cbe70604 lane) — #465 diffed file-by-file (see risk).

## Selection floor

(a) this run's own evidence-backed actionable set, no secondhand scope;
(b) zero id- and file-overlap with any LIVE lane's current batch;
(c) locally verifiable end-to-end this cycle (no external deploy, no mcr
ceremony, no soak gate still closed at implement time);
(d) small enough to implement, validate and fold inside one cycle.

## Selected batch — 'dep + action-digest currency refresh'

| Member | Why selected (impact / risk / effort / dependencies) | Verification plan |
| --- | --- | --- |
| rm-137 action-digest refresh pair (headliner) | Impact: clears the mechanical half of the upstream window's substantive remainder (rm-252's rider routes upstream #580 + #589 here) — codeql-action v4.38.2→v4.38.3 (4 sites: codeql.yaml:56/:62 init+analyze, release.yaml:357 + scorecard.yaml:51 upload-sarif) and upload-artifact v7.0.1→v7.0.2 (4 sites: release.yaml:350, scorecard.yaml:44, visual.yaml:101/:109). Risk: low — same-major digest refresh, no workflow-shape change; peeled commits re-probed this run (v4.38.3 → 24c54180a607b1449ed407dd24f251e4e9147c8d via tag cee97f86; v7.0.2 → cf430e030ddbb5b0abf93d22962f4752f3646cd9). Effort: S — 8 pin edits + comments. Dependencies: none (actions carry no npm-side soak gate). | actionlint container-form on the four touched workflows; digest re-probe against the GitHub tags API; version-comment accuracy per rm-650's rule; repo battery (frozen install, check-types, lint, test); CI-exact proof rides the fleet's Main/CodeQL lanes post-land. |
| rm-760 soak-eligible dep half | Impact: keeps the freshness-discipline def current — @hono/node-server 2.1.4 (package.json:22, runtime server dep) is soak-eligible now (published 2026-10-08T04:42:19Z; 1597 min ≥ minimumReleaseAge 1440 at the 07:19Z probe). Risk: low — patch bump of a landed pin family. Effort: S. Dependencies: none. vite 8.3.4 is NOT yet eligible (1152 min; matures 2026-10-09T12:07:04Z) — implement takes the vite half only from 12:07:04Z onward, else defers it with a dated rider per the def's escape clause. @playwright/test 1.64.0 stays excluded (mcr triple-probe + visual lockstep + two-green rule). | `pnpm update @hono/node-server` (+ vite when eligible) with intended-movement-only lockfile diff; frozen-lockfile install green; check-types/lint/test battery; pnpm audit (dev included) stays 0 known vulnerabilities. |

Selection markers in ROADMAP.md: both def-lines flipped to
`status: open (selected 2026-10-09, run 493bbbf2227c cycle:2 prioritize 1b02a1f15f5d, 'dep + action-digest currency refresh')`
with the prior status preserved as a compressed `(previously implemented …)`
parenthetical (first parseable status token stays `open`; no new rm-N added to
the flipped def-lines); selection riders appended at each block's tail with the
full attempt id. No mints: selection edits leave the census at
245 defs / 0 dups / max rm-778.

## Claimed-and-excluded (congestion audit, 2026-10-09T07:29Z)

Every candidate considered, with its owner or defer reason:

- cve-tripwire NODE_IMAGE cure + parity fence — LIVE d1a0b216 (rm-793) AND LIVE
  32f33f1b (rm-781): already double-claimed by live lanes; excluded despite the
  Monday 2026-10-12 06:53Z first-fire deadline.
- playwright/mcr coupled bump + visual baseline regen — recoverable ddb41af7's
  open draft PR #465 carries it (with baselines and
  test/node-image-parity-guard.test.ts); mcr digest triple-probe + two-green
  ceremony is its own batch class (rm-785 family), out of scope here.
- vite 8.3.4 — its own soak gate: matures 2026-10-09T12:07:04Z; conditional
  second half of rm-760, not a standalone selection.
- fro-bot.yaml agent pin v0.117.5→v0.118.3 + impeccable 3.2.1→3.6.1 pair
  (rm-689's live half) — rides rm-252's absorb decision due 2026-10-13
  (deployment-coupled to the infra gateway window); dead-lane 0cde5807's claim
  only. Not this batch's to front-run.
- rm-252 upstream absorb decision — due 2026-10-13; remainder after this batch
  would be docs-only (#577/#578) plus the agent pin.
- rm-144 open half (property-based browser parser suite) — file contention:
  public/operator-stream.js is LIVE d1a0b216 rm-794's seam (zero id overlap,
  first-class exclusion).
- rm-116 branch-protection fill + rm-792 scorecard alert triage — LIVE
  438dea88.
- rm-149 OAuth PKCE — triple-claimed LIVE (155f9770, 8dd690c8, cb0cfe96).
- rm-187 listener corruption self-heal — LIVE cb0cfe96.
- zizmor-ci gate (rm-799), pnpm sha512 pin (rm-797), README citation (rm-800) —
  LIVE c4617181.
- scheduled-workflow alert route (rm-289) — LIVE 1930644a.
- rm-788/789 CI gate + context-seal integrity — LIVE cb189044.
- rm-802/803 log fidelity + docs hygiene — LIVE d8fdf8b7 (6a97d6f7 holds a
  second rm-802 claim — named for their integrate pairing).
- in-range dev-deps (fast-check 4.10.2, @opencode-ai/plugin 1.18.35) — no
  security signal (audit is 0 known vulnerabilities); lockfile churn adjacent
  to LIVE c4617181's package-manifest work; declined at floor.
- ledger top-priority residues (rm-104 generator-gated, rm-279 cured
  pathology with stale score, rm-703 landed-by-content lineage) — trap map:
  non-selectable per their riders.
- soak-gated/waiting: eslint 10.12.0 already latest-and-landed; hono 4.13.13
  landed with the cycle-1 set.

## Selection risk

- PENDING-CONTENT pairing (the one real risk): recoverable ddb41af7's open
  draft PR #465 (head conductor/ci-27d473b0384d, no checks reported, worktree
  touched 07:00:43Z — 29 min before this selection) carries byte-identical
  digest hunks plus the tripwire cure and the playwright/mcr half. Two live
  lanes already re-claimed its tripwire content this morning (d1a0b216 rm-793,
  32f33f1b rm-781), so this selection follows fleet precedent; the digests are
  byte-convergent whichever lane lands first (same peeled commits). If #465's
  lineage lands before this batch's implement, the digest half reduces to a
  verify-and-fold; the dep half is untouched by it (PR #465's package.json
  diff is the playwright pin, not @hono/node-server).
- package.json hunk adjacency with LIVE c4617181's rm-797 (line 57
  packageManager vs line 22 dependency): different hunks, clean three-way
  merge expected; named here so integrate re-runs the census + guards on the
  union.
- vite-half timing: if implement starts before 12:07:04Z it must defer vite
  (escape clause + dated rider). The batch's primary value does not depend on
  the vite half.
- Dead-lane divergent mints (ab16a466's rm-782/rm-783, 155f9770's unlanded
  rm-807) fold by content at their integrates; the rm-760 selection rider
  records 155f9770's 48h misreading of the 1440-minute gate so its integrate
  does not treat this batch as a collision.
- Sibling-audit phantoms: 1930644a's batch doc reads the dep-refresh surface
  as 'owned by 38e72854' (a phantom of rm-760's historical 'prior: selected'
  text; 38e72854's actual batch is rm-599 + rm-797); 155f9770's doc reads
  codeql.yaml/scorecard.yaml as in c4617181's re-pin set (c4617181's actual
  file set is package.json:57 + Dockerfile + main.yaml + README +
  test/fork-exclusion-guard.test.ts — verified against its batch doc and its
  worktree porcelain: no workflow-file edits). This doc records the
  first-hand readings for the integrate phases to trust.

## Verification

- Selection battery (this phase): `node scripts/roadmap-census.ts` — expect
  defs=245 dups=0 max=rm-778 (statuses shift implemented→open by exactly 2);
  `npx vitest run test/roadmap-integrity-guard.test.ts
  test/roadmap-length-guard.test.ts`; `./node_modules/.bin/eslint ROADMAP.md`
  and this doc. `git show HEAD:ROADMAP.md | grep -c 'status: open (selected'`
  stays 0 on main (this run's flips live in the worktree until the commit
  phase).
- Implement-phase obligations (for the next phase, not this one): the 8 pin
  sites enumerated in the rm-137 rider; `pnpm update @hono/node-server` with
  intended-movement-only lockfile diff; vite only from 12:07:04Z; full gate
  battery; actionlint container-form; pnpm audit full stays 0.
