# Dashboard maintenance — repository-maintenance cycle 3 batch (2026-10-05, run a2def4ce34dc)

module: dashboard
tags: `[reliability, security, workflow, ci, batch-record]`
problem_type: batch-record

Frame: origin/main `306a972` (unmoved since 2026-10-04T22:17Z — re-measured
live at prioritize time 03:28Z and again at implement time 05:57Z; **8 red
check-runs** stood throughout: Lint, Check Types, Test, Test Scripts Load,
Design Check, visual, Analyze (CodeQL), Release). Run
`a2def4ce34dc4cecbf7f36a425eeb92d`, campaign `c37dcde5…` cycle:3. Phases:
assess `e685c34a`, research `47ffc481`, roadmap `2f812f8c` (rm-647..rm-651 +
riders, riding this landing), prioritize `0dd9c58f`, stewardship `4bbb27cf`,
implement `c51ce672` (this record, updated in-tree with implement results).

**CORRECTIONS OF RECORD (2026-10-05 implement, live-tree reads over the
assess census):** (1) `audit.yaml` is ALREADY DAILY — cron `'30 4 * * *'`
landed 2026-10-04 by the terminal-salvage run (b528f707), not the weekly
`'37 3 * * 1'` the assess census carried; B5 therefore brings canary to
parity with audit rather than breaking a weekly set. (2) The enforcing trivy
step in release.yaml is `:359-367` (exit-code `'1'` at `:366`), not :377.
(3) No workflow files changed between a45df51 and 306a972, so worktree reads
== main content for every surface in this batch. (4) At the 05:08Z probe no
scheduled runs had materialized since 22:17Z 2026-10-04 despite audit's daily
04:30Z window passing — the cron layer was quiet repo-wide, which is itself
B5-motivating (see rm-659's lineage for the forensic trail).

## The cycle's mandate

**Restore main to green end-to-end and close every mechanism that let it sit
4/5-workflow red for ~12h.** One root cause (the 1e1e2f5 upstream merge took
upstream's pnpm-lock.yaml while keeping the fork's pnpm-workspace.yaml floors
→ ERR_PNPM_LOCKFILE_CONFIG_MISMATCH on every frozen install) plus one stacked
standing CVE red (libpcre2-8-0 in the pinned node:24-slim base, which
RE-REDS Release the moment the lockfile is cured).

## Batch members and what landed (implement, 2026-10-05)

### B1 — rm-647: lockfile reconciliation cure (reliability, 95) — LANDED
`pnpm-lock.yaml` regenerated with pinned pnpm 11.28.3 from the run worktree's
own manifests (byte-identical to main's — verified via blob ids). Regen
sha256 `9abdcdd54f3027181b58d4125c33b4d6316283366ce86e3ba65bd084ff90d761`,
209-line diff (+86/−123), byte-identical to the fleet's 2026-10-05 02:13Z
derivation (registry set stable across the minimumReleaseAge window — the
procedure remains the artifact, not the bytes).
Verification battery (all in the /tmp/implement-a2def4ce sandbox, 2026-10-05
~05:57Z): from-clean `pnpm install --frozen-lockfile` rc=0 (7.2s — CI's exact
path); `pnpm audit --recursive` rc=0 "No known vulnerabilities found" (17→0);
ghost wiki-writer importer absent (0 grep hits; pre-cure :133/:857-858/:4958);
floors resolved fast-uri 3.1.8, brace-expansion 5.0.12 + 2.1.7, undici 7.30.0,
toml 5.0.0; importers synced (@hono/node-server 2.1.3 hono@4.13.12);
lockfileVersion 9.0; pnpm-workspace.yaml and package.json untouched by the
regen (blob-verified).

### B2 — rm-648: lockfile-consistency fast gate (92) — LANDED
New `.github/workflows/lockfile-guard.yaml`: `pnpm install
--frozen-lockfile --lockfile-only` on pull_request + push main +
workflow_dispatch, before any install by construction. Both directions
re-proven on this tree the same day: pristine blob → the exact
ERR_PNPM_LOCKFILE_CONFIG_MISMATCH; cure → rc=0 in 933 ms. Job (and check)
name "Lockfile Guard" is the required-check context B4 keys on — keep it
stable. pnpm version is single-sourced from package.json's packageManager via
pnpm/action-setup (same digest pin as the setup composite uses).

### B3 — rm-649, path (b): Release trivy cure on node:24-slim (75) — LANDED
`Dockerfile` runtime stage: `apt-get update && apt-get install -y
--no-install-recommends --only-upgrade libpcre2-8-0 && rm -rf
/var/lib/apt/lists/*` (the U1 recipe proven trivy-clean in the 23a12d7599b5
lineage), plus the 2026-09-20 "absorbed at the base" comment corrected to
state the facts: 10.42-1+deb12u1 is the VULNERABLE side of CVE-2026-103111
(fixed 10.42-1+deb12u2), the digest is frozen (24-slim last rebuilt
2026-09-19; base-drift.yaml watches the tag), and rm-139's node:26 window
(ships 10.46-1~deb13u2) supersedes the step when it rides. The enforcing
trivy oracle is release.yaml:359-367. Path (a) (node:26 swap) was rejected:
it couples the CVE cure to the Node-26/vitest-5 migration set and
invalidates B1's proven verification.

### B4 — rm-116: ruleset fill (58, strategic capstone) — FILE HALVES LANDED; API FILL IS POST-LANDING OPS
The batch deliberately splits this member: the two repo-side components
(`base-drift.yaml` `ruleset-drift` job, `AGENTS.md` rulesets-era override
recipe) land WITH this diff; the GitHub-side ruleset creation is
sequence-gated BEHIND the landing (filling required checks against a red
matrix deadlocks landings) and executes in the post-landing gate:
- `ruleset-drift` job (base-drift.yaml, weekly Monday 04:13Z +
  workflow_dispatch): verifies INVARIANTS, not exact equality — exactly one
  ACTIVE branch ruleset targeting main (refs/heads/main or ~DEFAULT_BRANCH),
  required_status_checks include Lockfile Guard + the Main six (Lint, Check
  Types, Test, Test Scripts Load, Design Check, Check Workflows), and no
  bypass actors. jq logic validated against 5 mock cases (ok / missing-check
  / bypass-present / evaluate-mode / default-branch token) before landing.
  The legacy branches/main/protection GET is not probed (needs admin;
  rulesets are GITHUB_TOKEN-readable with `rulesets: read`).
- `AGENTS.md` "Landing-pipeline traps" bullet rewritten rulesets-era.
- Post-landing ops (NOT in this diff): create the ruleset via
  `gh api -X POST /repos/codeo1io/dashboard/rulesets` (target branch main,
  enforcement **evaluate first** → probes → active), required checks per the
  invariants above + optionally Release/Analyze/visual once their push-side
  reporting is confirmed, no bypass actors; then re-read the API
  (persistence — a verified fill vanished 2026-09-25, fourth instance in
  rm-116's signals) and workflow_dispatch the `ruleset-drift` job to green.

### B5 — rm-650: daily canary cadence (55) — LANDED
canary.yaml cron `'23 5 * * 1'` → `'23 5 * * *'`, header and line comments
updated (parity with audit.yaml's daily b528f707 change; the frozen-install
canary is the daily end-to-end sentinel for B1). Weekly watchers that keep
their cadence with dated justification: base-drift (Monday 04:13Z digest +
ruleset invariants), upstream-drift (Monday 05:17Z absorb watch), CodeQL
(Wednesday 07:31Z).

## Sequencing and end-to-end completion

1. ✅ Implement B1+B2+B3+B5 + B4's file halves + this doc as one uncommitted
   worktree diff (ROADMAP.md extension from the roadmap phase rides it).
2. Validation gate (next phase, focused-first): actionlint + eslint on the
   changed files (run pre-landing here where possible), then the fleet's
   ephemeral validation PR — all checks green including Lockfile Guard's
   first red/green story.
3. Land → main goes green (first fully-green main since ff19de2
   2026-10-04T14:57Z).
4. Post-landing: workflow_dispatch audit + canary to re-baseline; then B4's
   ruleset fill (evaluate → probe → active → persistence re-read →
   ruleset-drift green).
5. Next morning: first daily canary green (B5 proof).

## Deferred with rationale (do not lose)

- **rm-651 landing file-drop guard** — next cycle's lead candidate; its
  acceptance wants a first run against a real landing, which this batch
  creates.
- **rm-140 pnpm 12** — own batch after B1 (R2 sequencing; two-site pin
  package.json:57 + Dockerfile:4/:24 corepack pins; one-time lockfile
  re-key).
- **rm-139 node:26 migration** (supersedes B3's apt step; carries vitest
  5.0.3 + jsdom 30, curing rm-596's local-Node-26 flake class) — staged
  2026-10-28.
- **rm-271 undici 8 / jsdom 30** — majors; B1 clears the audit pressure.
- 116 stale `origin/conductor/run-*` branches never reaped — hygiene lane.
- Scorecard badge v1 (live 200, zero in-repo dependents on v2) — non-issue.

## Sibling-lane collision map

File set: pnpm-lock.yaml, .github/workflows/lockfile-guard.yaml (new),
Dockerfile, .github/workflows/canary.yaml, .github/workflows/base-drift.yaml,
AGENTS.md, docs/prioritization/ (this doc), ROADMAP.md (roadmap phase's
+43-line extension, pre-existing in the worktree). No overlap with the
rm-596 lane's uncommitted web/ AppShell work (other worktree). ROADMAP.md is
the shared surface fleet-wide — reconcile riders by content at integrate.

## Verification refs

- Frame: `git fetch origin` → 306a972 at 03:28Z and 05:57Z; live check-runs
  probe → 8 failures (see prioritize evidence).
- B1 battery: /tmp/implement-a2def4ce (frozen rc=0, audit rc=0, ghost 0,
  floors, importers, lockfileVersion) + /tmp/implement-a2def4ce.pnpm-lock.REGEN.yaml.
- B2 probes: pristine rc=1 CONFIG_MISMATCH (reproduced this run) / cure rc=0
  933 ms; workflow file actionlint-validated (container form).
- B3: Dockerfile diff + dpkg-level recipe probe on the pinned digest
  (10.42-1+deb12u2 reachable via the step); full-image trivy proof rides the
  Release workflow on the validation PR.
- B4 job: 5-case jq mock battery at /tmp/rsd-test.
- Prior phases: e685c34a assess doc, 47ffc481 research doc, 2f812f8c
  roadmap extension diff, 0dd9c58f batch selection doc (spool),
  4bbb27cf stewardship request (spool).
