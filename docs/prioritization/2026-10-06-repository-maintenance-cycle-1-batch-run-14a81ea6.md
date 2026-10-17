# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-06, run 14a81ea6)

module: dashboard
tags: `[reliability, supply-chain, ci, docs, batch-record]`
problem_type: batch-record

Frame: base `fe928ca` (== origin/main at assess `56def662`, verified clean:
porcelain 0, `git ls-files .conductor` empty). Run
`14a81ea6cc834e9483d41ed5c88fb4e5`, repository-maintenance cycle:1. Phases:
assess `56def662db7b42cdaad2d09b91e545d2` (full battery green 3566/3566
first-hand + live external posture probes), research
`a09d18f83f3548808bd2bcca870ca52b` (8 evidence-backed candidates), roadmap
`b29154ad352e45e48c4be16e755b6c98` (+14 ledger lines as a round-trip-proven
spool patch), prioritize `078db7532add42039016bf3ec20497fe` (this batch
selected), stewardship `58841b2ce51b47e2943740bbd4a3db3b` (prior attempt
`b38d841a…` died 23s in on a provider failure, zero durable work — phase
redone from scratch), implement `5beb25cd45db4557b82e0ef45738e0cb` (this
document).

## The cycle's mandate

One theme: **currency & posture — no runtime-code changes.** The batch moves
the fork ahead of upstream on dev-tool currency (the erasable-syntax-only
plugin upstream still pins 0.4.2), closes a four-release gateway-pin drift,
refreshes age-eligible in-range dependencies, and corrects a live false
premise in the audit gate's header — while landing the cycle's ledger layer
(riders + rm-682 mint) so every decision above is id-anchored in ROADMAP.md.

## The batch, as selected → as landed

| Item | Surface | Outcome |
|---|---|---|
| B1 ledger layer | ROADMAP.md | LANDED — `roadmap-run-14a81ea6.patch` applied at fe928ca; product sha256 `8af992b1…` reproduced byte-exact in-tree; census 217→218 defs, 0 dups, max rm-682; 8 dated riders (rm-102/103/119/139/157/196/271/278) + rm-682 mint + extension #18 |
| B2 rm-682 erasable 0.7.2 | package.json, eslint.config.ts, pnpm-lock.yaml | LANDED — pin 0.4.2→0.7.2; export-aliases proven absent from the 0.54.0 preset and enabled explicitly; all five rules resolve at severity 2; cold-cache lint rc=0; status flipped implemented (pre-review) with a dated `- implementation` record |
| B3 rm-157 rider gateway pin | .github/workflows/fro-bot.yaml:347 | LANDED — `fro-bot/agent@3e86a1249c9af11f5152625259b0e26e9a828cfe # v0.117.1` → `@378bc287c7f934c3f23cf6f805e4058972d629e3 # v0.117.5`, byte-identical to upstream fro-bot/dashboard's own pin line; actionlint 1.7.12 container-form rc=0 on all workflows |
| B4 rm-196 rider dep currency | package.json, pnpm-lock.yaml | LANDED PARTIAL — fast-check 4.9.0→4.10.2 and hono →4.13.13 landed; **vite 8.3.3 deferred by the supply-chain age gate** (see deviations); frozen-lockfile install rc=0; lockfile diff touches exactly the landed set + the @hono/node-server peer re-key |
| B5 audit.yaml comment truth | .github/workflows/audit.yaml:5-11 | LANDED — the "dependabot version updates track direct dependencies only / undici (via jsdom) has no PR path" claim replaced with the PR #345 record; designed-red forcing-function language intact; comment-only, no trigger/step change |
| B6 this doc | docs/prioritization/… | LANDED — plus the rm-682 flip and the rm-196 implement rider recording the vite discovery |

## Implement-time deviations & discoveries (all resolved autonomously)

1. **vite 8.3.3 is age-gated — deferred.** First-hand: `corepack pnpm install`
   aborted `ERR_PNPM_NO_MATURE_MATCHING_VERSION` naming `vite@8.3.3 was
   published at 2026-10-06T04:10:19.326Z, within the minimumReleaseAge cutoff`.
   The prioritize phase's registry read (`2026-10-03T16:59Z`, "age-eligible
   now") no longer matches the live `time` map — 8.3.3 was effectively
   republished inside the window. Disposition mirrors how the batch itself
   treated eslint 10.12.0 (OUT, not bypassed): no advisory forces 8.3.3 today,
   so no `minimumReleaseAgeExclude` bypass was added; the pin stays 8.3.2 and
   8.3.3 becomes the next batch's opener (eligible 2026-10-07T04:10Z). The
   aborted install wrote nothing (lockfile sha `4263901b…` unchanged through
   the failure).
2. **`pnpm update hono` floor-raised the manifest specifier** `^4.13.11` →
   `^4.13.13` (pnpm-11 default save behavior), not the pure lockfile-only
   refresh the selection doc sketched. Kept: a same-major floor-raise is
   exactly the class rm-196's amended acceptance sanctions (the 2026-09-25
   batch's hono ^4.7.11→^4.13.8 precedent), and it keeps the manifest honest
   about what the lockfile resolves.
3. **export-aliases is NOT in the preset.** `pnpm exec eslint --print-config
   src/server.ts` on 0.7.2 shows `erasable-syntax-only:eslint-plugin-erasable-syntax-only@0.7.2`
   registered with four rules at severity 2 (namespaces / enums /
   import-aliases / parameter-properties) — the 0.6.0 `export-aliases` rule is
   absent because @bfra.me/eslint-config 0.54.0's erasableSyntaxOnly preset
   predates it. Enabled explicitly as `'erasable-syntax-only/export-aliases':
   'error'` in eslint.config.ts with a documenting comment; print-config
   re-run shows all five rules at 2. This satisfies rm-682's
   "WHICH documented" acceptance clause.
4. **Registry `time` drift vs the research reads** (all in the safe/older
   direction): fast-check 4.10.2 = 2026-09-19T19:34Z (research read
   2026-10-01), hono 4.13.13 = 2026-10-04T03:53Z (research read 15:03Z),
   erasable 0.7.2 = 2026-09-20T18:59Z (matches). Recorded in the rm-196
   implement rider; the research doc's dates stand as dated records.

## Verification (first-hand, this worktree @ fe928ca + this batch)

| Gate | Command | Result |
|---|---|---|
| Ledger apply | `git apply` patch → sha256 ROADMAP.md | `8af992b1…` == composed product; census 218 / 0 dups / max rm-682 |
| Supply chain | `corepack pnpm install` (regen) then `--frozen-lockfile` | regen OK ("Lockfile passes supply-chain policies"); frozen rc=0, "Already up to date" |
| Rule proof | `pnpm exec eslint --print-config src/server.ts` | plugin 0.7.2 registered; 5 erasable rules at severity 2 (export-aliases explicit) |
| Lint | `pnpm lint` (cache dir wiped first) | rc=0, zero violations |
| Types | `pnpm check-types` | rc=0 |
| Focused tests | `vitest run` on roadmap-length / override-floors / workflow-persist-credentials / prose-residue / fork-exclusion guards | 5 files / 24 tests passed; re-ran roadmap guards after the ledger flip: 2 files / 3 tests passed |
| Workflows | actionlint 1.7.12 container-form, all workflows | rc=0 |
| Lockfile sanity | `git diff pnpm-lock.yaml` | only eslint-plugin-erasable-syntax-only, fast-check, hono (+ @hono/node-server peer re-key) move |

Repository-wide `pnpm test` was NOT run this phase (work-order budget:
focused/impacted tests only); it runs at the full_tests / merge-release gate.

## 3-way posture vs live main (origin/main = `ac61ff3` at implement time)

Main moved twice during the run (selection-time tip `dff4b0b` is already gone
from the object store; `ac61ff3` = the cfa9f94b conductor-landing). Surfaces,
re-verified via `git diff fe928ca..ac61ff3` at stewardship: `fro-bot.yaml` and
`eslint.config.ts` untouched by main → our edits apply clean; `audit.yaml`
main hunks are ~:22-35 and :73-78, disjoint from our :5-11 comment block →
clean; `package.json` main delta is `packageManager pnpm@11.28.3→11.28.4`
(:57) only → our three pin edits + the hono specifier floor-raise union
cleanly; `ROADMAP.md` structurally divergent → union riders by id at
merge-release (fleet convention); `pnpm-lock.yaml` re-derived on the merge
base at merge-release (fleet convention). Sibling ship lanes (c5b7cd7d /
8b1672ef / 85e37a8b / e9bc28f5 / 9189a4ac) carry the same-class surfaces —
reconcile by content, riders additive by id.

## Next-cycle leads

1. **eslint 10.11.0 → 10.12.0 + vite 8.3.2 → 8.3.3** — both clear
   minimumReleaseAge on 2026-10-07 (05:56Z / 04:10Z); together they close the
   ONLY remaining upstream manifest gap (upstream absorbed eslint 10.12.0 via
   #564 on 2026-10-06).
2. **rm-119 fleet panel design** — precondition (gateway pin ≥ v0.117.5)
   satisfied by B3; design jointly with rm-107 as ONE status surface; include
   the v0.117.5 'agent: blocked' attention state per rm-119's 2026-10-06 rider.
3. **Node 26 go/no-go (rm-139)** — window 2026-10-28 (v24 maintenance starts
   2026-10-20, distinct dates per schedule.json). Design the engines
   enforcement with the go/no-go — NOT repo-wide engine-strict while delegate
   hosts run node 22 (this batch's gates all ran on v22.22.0 with WARN only,
   re-proving engines >=24 binds nothing today).
4. **Sibling lane reconciliation** — verify rider collisions at merge; the
   guard-bytes lesson from the 9189a4ac/e9bc28f5 runs (github_ci_validate
   aborts PRE-PUSH on any workflow add/add) applies to this batch's
   fro-bot.yaml/audit.yaml only if a sibling also edited them (none known).

## Post-landing watch set

- Monday 2026-10-12T03:37Z audit fire reads the landed lockfile (expect 0
  advisories — floors unchanged, all three bumps are non-advisory currency).
- dependabot re-index of the landed blob (the fast-uri #29/#30 re-closure
  watch from run 5e661558's batch doc, item 4).
- The Fro Bot workflow stays `disabled_manually` (no FRO_BOT_PAT secret) —
  B3's pin change is contract-surface only; no run-behavior change expected
  until the secret is provisioned (standing rm-157/rm-252 posture).


## Pre-review validation record (recorded at compound, 2026-10-06T23:28Z)

Nothing re-run this phase — outcomes consumed verbatim from the phase
artifacts per the work order.

| Phase | Attempt | Recorded outcome |
|---|---|---|
| targeted_tests | `d1ec1be8` (re-dispatch; `dd01618a` reaped offline) | impacted-suite probe rc=0 ("shared build/test configuration changed"); frozen install rc=0; lint rc=0; check-types rc=0; focused vitest 5 files / 24 tests ALL PASS; actionlint 1.7.12 container-form rc=0; print-config rc=0 (five erasable rules at severity 2); porcelain byte-identical pre/post; write-tree `02930b14` == the implement fold |
| full_tests | `f8a7209d` (re-dispatch; `70152023` reaped) | full_command verbatim (detached); ephemeral draft PR `#417` @ `84014889` (validation base `bb232e9`; 60120-byte / 7-file patch; `git apply --3way` rc=0, zero conflicts) — ALL 11 checks SUCCESS; teardown verified (PR closed 22:19:14Z; both `conductor/ci-*` refs deleted) |
| compound | `d0e7d27c` (third dispatch; `dc3a1c15` + `d25daeb4` reaped, zero durable work) | four ROADMAP riders (rm-682/157/196/278 test-outcome half) + cycle-1 compound banner + this section + the lessons doc; ZERO mints, ZERO status flips; digest unchanged — markdown-only edits sit outside the executable digest input set |

Dispatch digest validated pre-review and re-derived quiesced at every
post-implement phase:
`validation:v1:5d1562354ff6a37df91a936d38b0d232cb266044939c73a5d564ecd3c1cdb99d`.

Full fold lineage (for review — which attempt produced which evidence):
stewardship `b38d841a` (reaped 23s, redone from scratch) → `58841b2c`;
implement `5beb25cd` COMPLETED 13:59Z with its typed artifact on disk but
the result never reached the engine → `57946de5` (session-not-found) →
`b193d405` (reaped 26s) → `6f46f51b` (adopted + re-proven, folded dead on
the KTD13 missing `validation_evidence.changed_surfaces` attestation — a
gate reject, not transport) → `a56a594c` (reissued WITH the attestation,
work bytes untouched).
