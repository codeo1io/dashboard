# Cycle-batch selection — run c37a857620e14531abd6be2112004c60 (repository-maintenance cycle 1), 2026-10-09

Base at selection: 559642aa (== origin/main, fetched fresh this run; clean at dispatch).
Tree at selection: `M ROADMAP.md` + `M test/roadmap-integrity-guard.test.ts` (this
run's roadmap extension #36 — 1 mint rm-778 + 12 dated riders, guard pin 744→778;
census 238 defs / 0 dups / max rm-778, all verified in-phase).

## Inputs & guards

- Assess (attempt 56b450ae, same base): gates all green first-hand in a /tmp
  origin-clean clone — frozen install rc=0, eslint rc=0, check-types rc=0,
  vitest 63+32 files / 2444+1201 tests rc=0, `pnpm audit --recursive` clean,
  census 237→238 healthy; origin CI green at HEAD (Main/Release/CodeQL/
  DepReview/LockfileGuard/Scorecard/visual). Live findings: tripwire born-broken
  (F-high), integration backlog (F-med), census staleness (F-low), stale weekly
  reds proven historical (F-low), Monitoring detailsUrl (F-low, PR #444 in
  flight), protection shell 6th re-probe, 48 stale ci refs, HEALTHCHECK (info).
- Research (attempt ecd3b53f): upstream +7 mechanical commits (24 total
  unabsorbed, zero open upstream PRs, bookworm concern moot); registry movers
  vite 8.3.4 / playwright 1.64.0 / @hono/node-server 2.1.4 / @opencode-ai/plugin
  1.18.35; sole fresh action drift codeql-action v4.38.3 (24c5418, upstream #589
  corroboration); all standing trixie CVE families re-verified unfixed in trixie;
  Hub base digest UNCHANGED == Dockerfile pin; Node schedule pinned (v24
  maintenance 2026-10-20, v26 LTS 2026-10-28); upstream security floors proven
  converged (OSV/GHSA first-hand).
- Roadmap (attempt d5f8451f): extension #36's id-space audit — committed ceiling
  744, sibling walls through 769, PR #444 head 709, foreign-fleet spool excluded,
  rm-778 minted; the rm-648 rider records the tripwire time-box and resolves the
  cure owner (9fd8bcad's rm-755 artifact, verified by content this phase: its
  `NODE_IMAGE: 'node:24-slim'` → `'node:24-trixie-slim'` one-liner).

## Selection floor

Screened in (the batch — 'Monday watch cure'):

- **rm-689** (reliability, priority 34) — the pre-Monday tool-pin sweep, now
  carrying three payloads per its 2026-10-09 rider: (1) the cve-tripwire
  NODE_IMAGE cure, adopted by content from unlanded 9fd8bcad's rm-755 artifact
  (verified first-hand this phase: the lane's sole workflow delta is exactly the
  one-line env fix; its guard-test fences ride adoption too); (2) the
  codeql-action digest bump 2892aa5e (v4.38.2) → 24c5418 (v4.38.3) at every
  site; (3) the optional expedited workflow_dispatch proofs for the audit +
  canary gates whose last reds were pre-cure history. This is the ONLY ledger
  item with a hard external deadline: first scheduled tripwire fire
  Mon 2026-10-12T06:53Z exits 1 deterministically without the cure (digest grep
  empty — first-hand at 559642aa; zero runs ever on workflow 378215895).
  Impact high (restores the base-image CVE watch surface), risk low (one env
  line + digest swap), effort small, dependencies none.
- **rm-117** (security, priority 70) — the post-trixie container-CVE census
  re-derive, documentation-only by proof: the tracker re-verification shows every
  standing family unfixed in trixie (fixes only in forky/sid) and the Hub digest
  is unchanged, so no image action is available; the deliverable refreshes the
  census doc + posture runbook against the live 47-open-alert set (family
  composition shifted: util-linux x9 families, ncurses x3, systemd x2, acl,
  perl-Archive-Tar; 53613 family + four 2026-09 criticals absorbed). Same-theme
  rider: keeps the security-watch story coherent with the tripwire cure.

Screened out (with reasons):

- **F4 runs-on pin** (cve-tripwire.yaml:40) — sibling-owned: 8521c80a's
  unlanded batch carries exactly that one-liner plus the designed
  workflow-image-parity test; adopting it here would double-claim a designed
  lane. Disclosed for the integrate map.
- **rm-778 annotations drill-down** — capability work, no deadline, medium
  effort; next cycle candidate (this run's mint, unprioritized by design).
- **rm-108 floor refresh** (vite/playwright/hono-node-server/eslint/@types/node
  openers) — no advisory pressure (audit clean, floors converged), lockfile+CI
  churn inside a tight 3-day time-box, and sibling-lane collision risk; queued
  on the def for the next currency lane.
- **rm-139 Node-26 prep** — window opens 2026-10-28 (v26 LTS); own lane.
- **rm-252/rm-157 absorb window** — decision due 2026-10-13; floors converged,
  all mechanical; handled at integrate, not implemented here.
- **rm-116 branch-protection fill** — standing post-landing action.
- **F2/F3 guard hardening items** — owned by 8521c80a's designed batch (unlanded);
  integrate folds, this batch does not re-implement.
- **Weekly-red expedited proofs beyond rm-689 payload (3)** — optional, rides
  rm-689's acceptance, not a separate def.

## Batch contents & acceptance

1. cve-tripwire cure (adopt-by-content from 9fd8bcad/rm-755):
   `.github/workflows/cve-tripwire.yaml` `NODE_IMAGE: 'node:24-trixie-slim'`;
   the :54 digest-grep seam run verbatim against Dockerfile resolves the pinned
   digest (64-hex, currently 173f1258…); the lane's guard fences adopted with
   the content; provenance recorded in the implement batch note + rm-648 outcome
   rider.
2. codeql-action digest sweep: 2892aa5e → 24c5418 at every uses-site (grep
   census at implement; expected main.yaml/codeql.yaml/release.yaml family);
   upstream #589 corroboration cited.
3. Census re-derive (rm-117): refreshed container-CVE census +
   security-posture runbook docs reflecting the live alert set; no code.
4. Validation: full local gates (install/eslint/check-types/vitest incl. adopted
   fences) + actionlint container form on the touched workflow; CI-phase
   expedited dispatches per rm-689 payload (3) as provisional.

## Ownership & id-space notes

Adoption, not re-mint: the cure's authoring def (rm-755) lives only in 9fd8bcad's
unlanded tree; main's ledger carries the work under rm-648 (owner def,
implemented + riders) and rm-689 (sweep owner, selected here). At integrate the
lane's ROADMAP delta folds by content; landed meanings own ids.

## Next-cycle candidates (ordered)

1. rm-778 annotations drill-down (this run's mint).
2. rm-108 currency lane (four fresh openers + @types/node family).
3. Node-26 prep (rm-139; window 2026-10-28, v24 maintenance 2026-10-20).
4. Absorb-window disposition (rm-252/rm-157; decision 2026-10-13).
5. Sibling-lane integration adjudication (five dirty lanes + PR #444) and the
   branch-protection fill (rm-116) once landings settle.

## Implementation outcome (2026-10-09, implement attempt 6038f0b5)

Applied in the assigned worktree (uncommitted, per the phase boundary):

1. **Tripwire cure (rm-689 payload 1 / rm-755 adoption)** —
   `.github/workflows/cve-tripwire.yaml` NODE_IMAGE `'node:24-slim'` →
   `'node:24-trixie-slim'`. Content-adopted from the unlanded 9fd8bcad lane;
   that lane's OTHER deltas (rm-756/757/758 test fences and its ROADMAP mints
   through rm-758) are separate change-units and were deliberately NOT
   absorbed — main's own invariant guards pass with the cure (16/16), so no
   fence adoption is required.
2. **codeql-action digest sweep (payload 2)** — 2892aa5e (v4.38.2) →
   24c54180a607b1449ed407dd24f251e4e9147c8d (v4.38.3) at codeql.yaml:56/:62,
   release.yaml:357, scorecard.yaml:51.
3. **Census re-derive (rm-117)** — dated addendum on the container-CVE census
   doc (47 open = 43 container + 4 scorecard; absorbed + standing families
   table; every standing family verified unfixed in trixie) and a new
   'Container CVE watch' section in `docs/runbooks/security-posture.md`
   (surface correction: the posture doc lives under docs/runbooks/).
4. **Ledger** — rm-689/rm-117 def-lines flipped to implemented with outcome
   riders (rm-689, rm-117, rm-648); implement extension #37 recorded with the
   id-space and non-absorption disclosures; census unchanged 238/0/778.

Validation (focused, per phase budget): readonly-invariant +
read-only-invariant + roadmap-integrity suites green post-change; eslint on
all touched files rc=0; census healthy. Repository-wide gates and the
expedited dispatch proofs (payload 3) are reserved for the full_tests/CI
phase.
