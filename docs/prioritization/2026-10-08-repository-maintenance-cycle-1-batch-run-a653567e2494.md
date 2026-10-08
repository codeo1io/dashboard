# Dashboard roadmap prioritization — 2026-10-08, repository-maintenance cycle:1 batch (conductor run a653567e)

Base 9868058 at phase open; live origin/main ADVANCED during selection to 559642aa (+1 commit:
run 6277460e's landing — `robots.txt`/.well-known + monitoring api + ROADMAP +39 minting rm-713 into a
gap; census-on-origin 237 defs / 0 dups / max rm-744, guard pin untouched at test/roadmap-integrity-guard.test.ts:82
on origin). Orthogonal to every wedge below (verified by `git diff HEAD origin/main --stat`: zero overlap with
cve-tripwire, package.json, Dockerfile, or the registry surfaces); the composition integrates on the
chronological union. This worktree carries the roadmap phase's uncommitted delivery (ROADMAP.md +14:
ext #37 + 12 riders) — prioritize does not mutate the ledger. Run lineage: assess cf82ab7b → research
b5324174 (candidates memo in spool scratch) → roadmap dea27959 (riders-only, zero mints) → **prioritize
e15156f6 (this selection)**. Skill routing: no ce-\* skill installed in this harness; native inspection only.

In-tree ledger at selection: `node scripts/roadmap-census.ts` → **236 defs / 0 dups / max rm-744**,
statuses candidate 71 / implemented 115 / in-progress 2 / blocked-external 2 / completed 34 /
partially 2 / open 2 / landed 2 / superseded 6, census healthy.

## Implementation-space congestion audit (live, this phase)

Every probe below ran during selection (15:39–15:52Z), none inherited:

- `git fetch origin` → HEAD 9868058 vs origin 559642aa (+1, dispositioned above).
- `gh pr list` → exactly ONE open PR: #444 (head conductor/run-c026a644bda4) — the digest-readback
  SIGPIPE cure + https-only detailsUrl boundary class. Different files than this batch; not folded.
- Worktree scan across the fleet: the tripwire cure still lives UNCOMMITTED in exactly two siblings —
  run-8521c80a2583 (CU1+CU2+CU3: cve-tripwire + test/workflow-image-parity.test.ts + guard corpora +
  src/server.ts symlink) and run-9fd8bcad64a8 (CU-A/B/C, same wedge, ids rm-755/756/673). Neither has
  landed; live origin/main still carries the broken `NODE_IMAGE: 'node:24-slim'` (verified:
  `git show origin/main:.github/workflows/cve-tripwire.yaml`).
- ext #33 (8521c80a's roadmap extension) read in full from its worktree: its ownership map confirms the
  nine-wedge congestion and this run's riders-only disposition was correct.
- **Adjudication (first-hand)**: the credit "actionlint 2.0.6" belongs to 9fd8bcad's unlanded rm-758
  (via ext #33's map). `gh api repos/rhysd/actionlint/releases/latest` → **v1.7.12 (2026-03-30)**; no
  2.x line exists and main.yaml:155's container pin already equals latest — the credit is FALSE, no
  actionlint bump is owed, drop the datum at fold.

## Prioritized candidates (impact / risk / effort / deadline / ownership)

| candidate | impact | risk | effort | time-box | owner status |
|---|---|---|---|---|---|
| tripwire Monday cure (rm-648 + rm-188 + rm-103 rider) | HIGH — first scheduled fire 2026-10-12T06:53Z is a deterministic red on live main; has_issues=true makes it a live alert issue | LOW — 3-line workflow + comment reword + parity test | LOW | **before Mon 06:53Z** | sibling cures unlanded (8521c80a CU1 / 9fd8bcad CU-A) — fold by content |
| rm-196 eligible-now registry set | MEDIUM — hygiene/freshness; audit rc=0 means no vulnerability pressure | LOW-MED — pnpm pin family spans 4 files + guard expectations; eslint minor can move lint rules | LOW-MED | soak window now open | eslint subset = 788aa489 rm-760, action-setup = rm-761 (fold); rest unowned |
| guard corpus cross-product close | HIGH long-term | MED | MED | none | 8521c80a CU2 / 9fd8bcad CU-B unlanded — owned, screen out |
| symlink realpath entry suite (rm-702) | MED | LOW | LOW | none | 8521c80a CU3 / 89ebbf49 rm-756 — owned |
| statSync hardening (rm-478) | MED | MED | MED | none | f266ce30 rm-754 / 788aa489 rm-759 divergent — owned |
| impeccable 4.1.0 two-place | LOW | MED (config v4 compat) | MED | none | 69b161e1 rm-711 unlanded incl. the config work — fold-first |
| playwright 1.64.0 + mcr lockstep | MED | MED (visual suite) | LOW | **soak crosses 2026-10-08T20:44Z — after this cycle's implement window** | next cycle |
| setup-node v7.1.0 / hono-server 2.1.4 / vite 8.3.4 / codeql v4.38.3 | LOW each | LOW | LOW | soak crosses 2026-10-09T02:52Z–13:01Z | next cycle |
| branch-protection fill (rm-116) | HIGH strategic | MED (needs cure adoption + admin session) | MED | post-landing | sequenced |
| v26 window (rm-139) | MED | LOW | LOW | LTS 2026-10-28 | standing |
| conductor refs sweep (rm-159) | LOW | LOW | LOW | none | needs push-authorized phase |

## Batch selected for this cycle (implement-phase scope)

Two coherent units, zero interdependency, zero push dependency for validation — completable end-to-end
in this cycle with clean rollback isolation.

### CU1 — Monday-gate tripwire truth (P0; executes rm-648 rider + rm-188 rider + rm-103 comment fix)

`.github/workflows/cve-tripwire.yaml`: `:35 NODE_IMAGE 'node:24-slim'` → `'node:24-trixie-slim'`
(matches Dockerfile:34's digest-pinned marker — the digest stays in the Dockerfile ARG),
`:36 TRIVY_VERSION v0.72.0` → `v0.75.0` (released 2026-10-01T13:34Z, soak-clean),
`:40 runs-on ubuntu-latest` → `ubuntu-24.04` (the sole unpinned site outside the 2026-09-25 16-site
sweep). Reword the STALE "issues disabled" guard comments in cve-tripwire.yaml AND upstream-drift.yaml
(issues are enabled since 2026-10-08T14:50Z; Monday fires take the live alert path). NEW
`test/workflow-image-parity.test.ts` fencing Dockerfile ARG digest ↔ workflow NODE_IMAGE marker ↔
trivy version presence (adopt 8521c80a's CU1 test shape — fold by content; single owner at integrate).

Acceptance: parity test RED on pre-change tree (proof it fences the real defect) then GREEN; actionlint
container 1.7.12 rc=0; the resolve-step grep simulation resolves `sha256:173f1258…`; landing gate =
expedited `workflow_dispatch` green-at-parity BEFORE 2026-10-12T06:53Z (rides rm-689's pre-gate window;
final_validation/full_tests sanctions CI).

### CU2 — rm-196 eligible-now registry set (P1; every item ≥ 24h soak at execution)

- eslint `10.11.0` → `10.12.0` (published 2026-10-02T20:08Z; fold 788aa489 rm-760 by content)
- `@opencode-ai/plugin` `1.18.34` → `1.18.35` (2026-10-06T20:19Z; the undatable hold is lifted)
- `@types/node` `24.13.3` → `24.19.1` (2026-10-01T22:38Z, 24-line)
- packageManager pnpm `11.28.4` → `11.28.5` (2026-10-06T05:23Z) — pin family: package.json,
  Dockerfile corepack ×2, `test/fork-exclusion-guard.test.ts` expectations
- `actions/upload-artifact` v7.0.1 → v7.0.2 ×4 sites, digest `043fb46d` → `cf430e030ddbb5b0abf93d22962f4752f3646cd9`
  (published 2026-10-07T10:08Z, soak-crossed 2026-10-08T10:08Z)
- `pnpm/action-setup` v6.0.10 → v6.1.0 ×4 sites, digest `0977fd9` → `d9184bf108216479bc5a137cc391f4d7b14c870b`
  (2026-09-05; fold 788aa489 rm-761 / 89ebbf49 rm-761 by content)
- `fro-bot/agent` v0.117.5 → v0.118.2 at fro-bot.yaml:347, digest `378bc287…` → tag sha
  `77f2bad7d68ac38279cd0fa28f38b26a0cd15dfb` (released 2026-10-07T04:27Z, soak-clean; inert surface —
  the workflow is disabled_manually)

Acceptance: `pnpm install --frozen-lockfile` rc=0, `pnpm lint` rc=0, `pnpm check-types` rc=0, impacted
suites green (fork-exclusion-guard expectations updated in-lockstep), `pnpm audit --recursive` rc=0,
every soak timestamp respected (all items ≥ 24h at execution), actionlint rc=0 on touched workflows.

## Screened out (recorded so the next selection does not re-litigate)

Playwright 1.64.0 + visual.yaml:71 mcr `v1.64.0-noble` lockstep (digest `sha256:06a9939e…` verified
15:01Z — executable the moment soak crosses 2026-10-08T20:44Z, i.e. next cycle, not this one);
setup-node v7.1.0 (10-09T02:52Z), `@hono/node-server` 2.1.4 (10-09T04:42Z), vite 8.3.4 (10-09T12:07Z),
codeql v4.38.3 (10-09T13:01Z) — same reason; impeccable 4.1.0 (69b161e1's unlanded rm-711 owns the
pin + config-v4 + AGENTS.md set); qemu v4.4.0 (rm-558 deliberate hold); actionlint any bump (latest
== pin; the 2.0.6 credit is false); guard corpus / symlink / statSync wedges (sibling-owned unlanded);
PR #444's class (c026a644 owns); rm-116 fill, rm-139 v26 window, rm-159 sweep (sequenced elsewhere);
upstream absorb #573+#578 (rm-252 window static at 4a90eab; no open upstream PRs).

## Fold map for integrate (adjudications)

- CU1 ≡ 8521c80a CU1 ≡ 9fd8bcad CU-A: content-identical cures — union-by-content, near-no-op, ONE
  test/workflow-image-parity.test.ts survives.
- CU2 ⊃ 788aa489 rm-760 (eslint) + rm-761 (action-setup): fold by content, id meanings reconcile at
  the ledger.
- 69b161e1 rm-711 impeccable stays theirs; 8521c80a CU2/CU3 + 9fd8bcad CU-B/C stay theirs.
- 9fd8bcad rm-758's actionlint 2.0.6 datum: DROP (false version).
- 6277460e's landing (rm-713 robots/monitoring): orthogonal, rides the union untouched.
- This run's ROADMAP +14 (ext #37 + 12 riders) rides the batch composition; guard pin stays 744.

Selection verified against: fetch/status/porcelain above; `git show origin/main:…` probes; sibling
worktree `git status --porcelain` + diff scans; `gh api` release/tag lookups for every digest cited;
npm publish timestamps from the research phase (b5324174 memo, re-checked for soak math this phase).
