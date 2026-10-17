# Dashboard roadmap prioritization — 2026-10-07, repository-maintenance cycle:1 batch (conductor run a94d0659c3f5)

Base 25d32be == origin/main (re-fetched and `git rev-parse origin/main`-verified this phase; porcelain
empty at phase start and finish — the ledger, the tree, and every probe below ran against the pristine
shared base). Run lineage: assess 7ebd91b5 → research 67fe4384 (candidates memo) → roadmap ff0b5fdf
(mints rm-698/rm-699 delivered spool-only in `delegate/ff0b5fdf…-scratch/roadmap-a94d0659-ff0b5fdf.patch`)
→ **prioritize 67fc30565a8b (this selection)**. Prior-attempt c466ae5c on this action: typed envelope
absent on disk; durable event log read in full = delegate_turn_started → 1 progress tick →
session_reaped (provider infra kill) → delegate_turn_completed status=failed; NO PhaseResult, no scratch,
no attributable residue, worktree clean — nothing adoptable, so this prioritization was REDONE FROM
SCRATCH and is declared so. Skill routing: no ce-* skill installed in this harness (same finding as the
research phase); native inspection only.

In-tree ledger at selection: `node scripts/roadmap-census.ts` → 229 defs / 0 dups / max rm-682 (status
census 75 candidate / 104 implemented / 34 completed / 2 open / 2 in-progress / 2 landed / 2 partially /
6 superseded / 2 blocked-external). rm-698/rm-699 exist only in this run's spool roadmap patch
(extension #29, guard pin 699); their candidate→implemented status flips ride that patch's
integrate-time reconciliation — the prioritize phase does not mutate the ledger in-tree.

## Implementation-space congestion audit (first-hand, ~11:00–11:10Z 2026-10-07)

Selection this cycle is constrained by sibling claims, so every probe below was run live this phase, not
inherited: `gh pr list -R codeo1io/dashboard --state open` = **0 open PRs**; origin conductor/run-*
heads = 85 stranded (rm-159 sweep, untouched) with exactly ONE live sibling branch
(run-07fb9042 @ d1a75f66: ROADMAP + install-wall solutions doc + test/override-floors-guard.test.ts —
no surface overlap with this batch); `git ls-remote` + worktree `git status` scans across all 15 sibling
worktrees under conductor-worktrees/dashboard-864ca327c8; run states from the campaign conductor DBs
(runs table by workspace_path, per the #17024 recipe — prompt-string mentions in other DBs ignored).

- **b2a3ae9b — RUNNING @ full_tests (11:02)**: owns rm-690 (Cache-Control immutable middleware,
  its src/server.ts delta), **rm-691 (the release.yaml SIGPIPE cure — both readback sites :478-480 and
  :514-536 already carry the awk END-block form in its standing composition)**, rm-692 (security-posture
  Scorecard/Signed-Releases wording — verified NOT a security.txt change). Landing-bound.
- **09e5b4d6 — RUNNING @ full_tests (10:49)**: owns the 24-slim digest re-pin (Dockerfile ARG
  `0e0ff40… → d6aa754f16b3…`) at stale base ac61ff3.
- **5f9b0fc9 — RECOVERABLE @ targeted_tests (10:49)**: a 42-file push-notifications revert batch
  (deletes web/src/push/*, Notifications view) that coincidentally carries the same 24-slim ARG re-pin
  and a cve-tripwire.yaml.
- **23edabab — RECOVERABLE @ compound (10:49)**: cve-tripwire.yaml (rm-648) + zlib1g standing-CVE doc
  + readonly-invariant-guard.test.ts.
- **e9bc28f5 — RECOVERABLE @ independent_review** (staged Dockerfile = comment-prose edit at old base
  306a972); **35704196 — RECOVERABLE @ independent_review** (Dockerfile comment edit, lockfile-guard
  batch); **5bf98ac3 — AWAITING_EVIDENCE @ final_validation** (base-drift.yaml delta is only
  `persist-credentials: false` additions, 2026-09-30 era); **07fb9042 — FAILED @ targeted_tests**.

No standing composition anywhere in the fleet moves to `node:24-trixie-slim`, and no sibling delta
touches src/server.ts's security.txt block or its test pin. The two surfaces selected below are the
highest-value work that is demonstrably **unowned** in implementation space.

## Batch selected for this cycle (implement-phase scope)

### rm-698 — trixie base-image migration (reliability; this run's mint)

Why highest-value-now: upstream re-based `24-slim` onto trixie ~2026-09-28 (#576/#577 merged), so the
pinned digest drifted silently (ZDD32) and the weekly base-drift gate fires a **correct red ~2026-10-12**
(on-cadence 2026-10-05 run was green at the old digest). Migrating to `node:24-trixie-slim` (a) ends the
guaranteed red five days out, (b) ends the silent-distro-rebase class for this pin (distro track follows
the tag now, not the digest), (c) supersedes the 24-slim digest re-pin family (sibling-owned, see audit),
and (d) stages the platform for the Node-26 window (rm-139, 2026-10-20/28) without touching engines.
Effort small-medium; risk low-medium; no dependencies (registry digest already verified live this run:
token-authed HEAD → `sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66`).

Scope: `Dockerfile:21` `ARG NODE_IMAGE=node:24-slim@sha256:0e0ff40…` →
`node:24-trixie-slim@sha256:173f1258…` (single ARG feeds the builder/prod-deps/runtime stages at
:23/:43/:83); every `node:24-slim`/`24-slim` token in `.github/workflows/base-drift.yaml` (:1 header,
:56 step name, :68 buildx inspect ref, :80 registry fallback URL, :88 log line, :128-129 alert title/body);
optional cosmetic rider: the sentinel comment at test/static-assets.test.ts:1023-1031 (`FROM node:24-slim`
is already not the literal first line — assertion itself stays true).

Hazards (from this run's research, binding): re-verify the trixie digest live at implement time via the
token-authed registry HEAD recipe before writing it (registry truth drifts; 173f1258… was verified
2026-10-07); NEVER byte-adopt upstream's Dockerfile — its prod-deps stage COPYs wiki-writer/ (write
capability, read-only invariant, rm-252 standing scope); both Dockerfile and workflow bytes move the
validation digest — re-derive quiesced ×2 and declare the re-derived value (implement-fold KTD13
attestation rides validation_evidence.changed_surfaces, full flat list); actionlint container form +
scoped eslint on the edited yaml (single-quote rule); the ~2026-10-12 weekly fire green at parity on the
trixie pair is the post-landing acceptance proof (cite as corroboration when it lands, not as an
in-cycle gate).

### rm-699 — security.txt fallback-Contact disposition (security; this run's mint)

Fresh disposition datum, probed first-hand THIS phase: `gh api repos/codeo1io/dashboard/private-vulnerability-reporting`
→ `{"enabled":true}` (2026-10-07); repo `has_issues:false`, `private:false`. The 2026-09-24 policy premise
in src/server.ts:108-113 ("private-vulnerability-reporting disabled … the second Contact points at the
upstream repo's issues, the one channel verified working today") is therefore **stale**: the fork's own
advisory form — the first Contact — is now a live private channel. Keeping a second Contact that routes
security reporters to a PUBLIC tracker on ANOTHER repo's issue queue misroutes disclosure and
under-privatizes it (RFC 9116 intent: private, monitored channels; the fork's B0 checklist step to enable
PVRE has been satisfied out-of-band).

Scope: drop `Contact: https://github.com/fro-bot/dashboard/issues` (src/server.ts:119); rewrite the policy
comment block (:105-115) recording the dated probe (`private-vulnerability-reporting` enabled:true,
has_issues:false, 2026-10-07) and the drop rationale; update the Review F2 pin in test/server.test.ts:583-587
(replace the fro-bot-issues assertion with: advisory Contact present + no public-tracker Contact present;
keep the not-codeo1io-issues assertion and the Expires/Preferred-Languages pins — Expires 2026-12-24 is
still valid, rm-245 owns its cadence). test/endpoint-parity-guard.test.ts pins the endpoint, not the body
— unaffected. Historical docs quoting the old policy (2026-09-24-cycle-1-batch.md:206) are dated records
and stay untouched. Effort small; risk low; zero sibling overlap (verified in the audit).

## Why this batch (coherence + end-to-end completability)

Both members harden the trust surfaces of what this repository SHIPS and SERVES: the base image the
release pipeline builds every push (currency, drift-gate truth, distro track) and the disclosure document
the deployed service serves publicly (RFC 9116 live-contact policy). Both are this run's OWN mints with
acceptance lines already composed in the roadmap patch; both are fully evidenced by this run's
assess/research (no new investigation needed); neither moves a dependency; neither needs an external
clock or live-object config action; every acceptance criterion is verifiable by local gates + a registry
HEAD probe + the CI battery — so the batch completes end-to-end within this cycle even under the fleet's
reaping pressure. The binding constraint this cycle is congestion, not candidate quality: the two
highest-impact findings from this run's own assess (rm-691 SIGPIPE cure; the base-digest re-pin) are
already implemented inside sibling compositions that are RUNNING at full_tests — selecting them would
duplicate landing-bound work and guarantee same-file conflicts at integrate. rm-698 + rm-699 are the
highest-value REMAINING unowned work.

## Considered and deferred (with reasons)

- **rm-691 release.yaml SIGPIPE/pipefail cure** (assess F1 — release red 7-of-8, deploys not firing from
  merges): owned by sibling b2a3ae9b RUNNING@full_tests with both readback sites cured in its standing
  composition; the ledger rider at rm-516 (this run's roadmap patch) records the class. Monitor the
  landing; if the sibling dies unlanded, next cycle re-owns. NOT duplicated here.
- **rm-252/rm-103 operator-contract 1.8.0 absorb wave** (44 files, 2306+/423−, run-card fix, pin
  v0.118.2, enables the rm-119 skip-reason panel class): highest strategic value, but the ledger's own
  sequencing puts a DECISION record first (deadline 2026-10-13) and the twin wire-or-fold interlock +
  gateway infra deployment make it multi-cycle; front-running it duplicates the planned decision step.
  Next cycle's centerpiece.
- **24-slim digest re-pin** (rm-178-refresh family, sibling mints rm-683/684/689): superseded by rm-698
  AND sibling-owned (09e5b4d6 RUNNING@full_tests carries the identical ARG-line re-pin; 5f9b0fc9
  RECOVERABLE carries it too). Ordering interaction is documented in rm-698's def line; if a re-pin lands
  first the trixie patch rebases over one ARG line.
- **rm-648 digest-pinned trivy CVE tripwire**: claimed by TWO standing compositions (23edabab
  RECOVERABLE@compound; 5f9b0fc9 RECOVERABLE@targeted_tests — both carry cve-tripwire.yaml + the zlib1g
  standing-CVE doc). Not duplicated.
- **rm-108 openers (vite 8.3.3, eslint 10.12.0)**: low value now, lockfile churn + CI digest coupling;
  rides the rm-271 registry-regen sweep window (minimumReleaseAge eligibility just crossed).
- **rm-116 branch-protection fill**: live-object config action (gh api on the protection object), not
  tree work; documented recipe in the 9189a4ac compound record (Main job set + CodeQL + Lockfile Guard,
  strict, admin-enforced, never delete-and-recreate). Standing post-landing action.
- **rm-159 stranded-ref batch deletion** (85 origin conductor/run-* heads; MAX_BRANCHES=400 scan cap):
  push-stage action, prohibited inside cycle phases; standing sanctioned sweep.
- **rm-139 Node-26/engines window** (v24 maintenance flip 2026-10-20, v26 LTS 2026-10-28): owned staged
  plan (main rider a09d18f8); front-running duplicates. rm-698 stages the platform without touching it.
- **Fro Bot workflow re-enable**: blocked on FRO_BOT_PAT secret provisioning (infra), not tree work.
- **rm-102 merged-PR clause**: waits on the ~2026-10-09 dependabot window; nothing actionable in-tree.

## Handoff to the implement phase

1. Place this doc (byte-source) at
   `docs/prioritization/2026-10-07-repository-maintenance-cycle-1-batch-run-a94d0659.md` when composing
   the batch — it rides the batch tree deliberately (it was kept out of the worktree this phase per the
   work-order hygiene clause: untracked repo-root files ride the validation clone and move its digest).
2. Compose on the current origin/main (re-fetch first; if main absorbed a 24-slim re-pin or the SIGPIPE
   cure overnight, re-base the affected hunks by content per the hazards above — neither changes this
   batch's validity).
3. The ROADMAP status flips for rm-698/rm-699 ride the roadmap spool patch
   (`roadmap-a94d0659-ff0b5fdf.patch`, extension #29) at integrate — reconcile by content there, do not
   fork a second in-tree ledger edit.
4. Verification set for the batch: pnpm check-types / pnpm lint / targeted suites
   (test/server.test.ts, test/static-assets.test.ts, test/base-drift-digest-readback.test.ts untouched
   unless shapes change) / full battery via the ephemeral-CI path; actionlint container form on
   base-drift.yaml; registry digest re-probe; validation-digest re-derivation quiesced ×2 with the
   full-flat-list changed-surfaces attestation in validation_evidence.

## Pre-review outcomes (recorded at compound, 2026-10-07)

- **rm-698 — implemented + validated, pre-review.** Standing delta: Dockerfile build/deploy stages on
  `node:24-trixie-slim@sha256:173f125896c3…` (registry-truth-pinned; the Docker Hub OCI-index HEAD
  re-probe matches the pin), with base-drift.yaml's tag sites + digest sentinel + header/prose moved in
  the same change. Targeted: `run_repo_impacted_tests.py` RC=0 — 20 files / 734 tests green, plus
  `web/src/operator/no-server-imports.test.ts` 1/1. Full: `github_ci_validate.py --repo .` RC=0 —
  ephemeral draft PR #434 10/10 checks green (CodeQL+Analyze, Dependency Review, Lockfile Guard, Main
  Lint/Test/Check Types/Check Workflows/Design Check/Test Scripts Load) at snapshot `3c2cfbd4` over
  validation base `819919ce`; the validator's teardown closed the PR and deleted both `conductor/ci-*`
  refs. Digest `validation:v1:f0724c20…` declared verbatim at full_tests.
- **rm-699 — implemented + validated, pre-review.** Disposition: private vulnerability reporting is
  ENABLED on codeo1io/dashboard (probed at prioritize/stewardship), so the upstream-issues fallback
  `Contact` was dropped from SECURITY_TXT; the advisory form is the sole Contact and the docstring
  rationale was rewritten. Covered by the same targeted + full runs (server.test.ts pins the shape).
- **Digest note.** Compound edits are markdown-only (the ROADMAP cycle-1 compound comment, this
  section, and
  `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-07-reap-forensics-sibling-congestion-ephemeral-ci.md`)
  — classify_surface non-executable, so the full_tests digest above stays current for the fold.

## Next-cycle context (compound handoff)

1. **Landing reconcile.** The candidate delta is the 6-file implement batch (5 M + this doc); ledger
   extension #29 (mints rm-698/rm-699, 11 dated riders, guard pin 699) ships spool-only
   (`delegate/ff0b5fdf…-scratch/roadmap-a94d0659-ff0b5fdf.patch`, applies clean at 25d32be) and lands
   via the ext channel — union by content, keep the higher census, and order the 2026-10-07 census
   comments so the ext#29 comment is last in file order.
2. **Sibling contention.** rm-690/691/692 are owned by sibling b2a3ae9b's standing composition
   (release.yaml SIGPIPE cure, Cache-Control, posture wording); 09e5b4d6's composition overlaps the
   Dockerfile. First-landed wins; reconcile by content at integrate.
3. **Watch items.** First base-drift fire post-landing (~2026-10-12) should be GREEN at parity — the
   gate now compares the trixie pin against the trixie live digest; the pre-migration red was the
   detector working, not a false alarm. The release.yaml promote red (rm-691, sibling-owned) is
   tag-triggered and invisible to PR-check green — it needs its own prove-out, not a PR. ~48 stale
   `conductor/ci-*`/`ci-base-*` refs on origin (reaped-session residue; 20+28; no open PR references
   any) — a sweep is a sanctioned push-stage action, not compound work. Fro Bot stays disabled (no
   `FRO_BOT_PAT` secret provisioned).
4. **Next-cycle candidates** (pre-review evidence only): rm-102 dependabot scheduled-version window
   (12/12 runs event=dynamic, zero scheduled fires — two-exit cure-or-honest-redocument by ~2026-10-09);
   the release-lane prove-out once rm-691 lands; and a re-run of the ext id-ceiling audit before any
   new mint (sibling ext mints have advanced past rm-711).
