---
module: dashboard
tags: [prioritization, repository-maintenance, cycle-1, batch-selection]
problem_type: maintenance-planning
run: 788aa489c1d548e4821bdafd88834e73
cycle: 1
---

# Dashboard maintenance batch (2026-10-08, run 788aa489c1d5)

Authoritative batch-selection record for repository-maintenance cycle:1 run `788aa489c1d5`
(prioritize attempt `0051bbfb90f9472dad3ea1bf8a082474`), base `9aceea8` — this tree's HEAD, an
ancestor of `origin/main` `b658cb6` (4 commits behind; no `cve-tripwire.yaml` in this base).
Inputs: assess `9a6385d3` (fresh adversarial, health gates all first-hand green), research
`41eda180` (registry/actions/upstream/gateway probes), roadmap `ec4930a4` (census 238/0/rm-761
healthy; extension #30 mints + id-space audit).

## Ledger state at selection

238 defs / 0 dups / max rm-761; Open-section unresolved ≈ 74 actionables (67 candidate, 2 open,
2 in-progress, 2 blocked-external, 1 partial) after excluding 114 landed-status stragglers.
Priority ordering is a starting map, not the verdict: several top-priority candidates are
externally gated (see Deferred).

## Selected batch — theme: boot-path + snapshot-path reliability hardening, plus a soak-rule-clean currency refresh

All four members are locally verifiable end-to-end this cycle (`implement → review → fold → CI`
per the rm-703 playbook), have **zero file overlap** with each other, and need no external
clock, release, or gate.

| # | Item | Def / ownership | Surfaces | Effort | Verification |
|---|------|-----------------|----------|--------|--------------|
| B1 | Snapshot-store `load()` statSync pre-check | `rm-759` (this run's mint) | `src/github/snapshot-store.ts`, its test file | S | spy-proves readFileSync never runs for >1MiB (red→green); full gates |
| B2 | ESM entry symlink cure (silent-headless boot) | by content — sibling-unlanded `rm-756` (89ebbf49) owns the ledger line; this run's assess F1 owns the discovery at this base | `src/server.ts:1665` comparator, `test/server-entry-point.test.ts` | S–M | file-symlink AND dir-symlink entry tests; live repro flips false→true; gates |
| B3 | In-range dependency refresh | `rm-760` scoped by the house soak rule | `package.json`, `pnpm-lock.yaml` | M | frozen install rc=0, lockfile diff = intended movement only, gates |
| B4 | pnpm/action-setup v6.0.10 → v6.1.0 ×3 | `rm-761` (this run's mint) | `audit.yaml`, `lockfile-guard.yaml`, `visual.yaml` | S | actionlint container-form green; dispatch evidence rides CI |

### Member rationale

- **B1** (`rm-759`): real resource-ordering defect (full file buffered before the 1MiB bound,
  `snapshot-store.ts:101` vs `:106`), live-evidenced this run, distinct from landed rm-701 and
  from sibling rm-754's operator-asset lane. Small, fail-open semantics preserved, no API change.
- **B2** (assess F1): highest-severity open finding this run surfaced first-hand (live repro:
  `isMainEntryPoint(realpath metaUrl, symlinked argv1) → false` — server boots headless and exits
  silently). Cure is the documented comparator fix (realpath `argv[1]` before pathToFileURL,
  fail-closed catch preserved) plus the two missing entry-test shapes. Ledger note: implemented
  by content this cycle; ownership converges with sibling rm-756 at integrate (map in extension #30).
- **B3** (`rm-760`): registry refresh cut down by `minimumReleaseAge: 1440`
  (`pnpm-workspace.yaml:13`, dependency-review gate). Executable: **eslint 10.12.0** (2026-10-02)
  and **vite 8.3.3** (2026-10-06) — both soak-clean; convergence with upstream #564 survives
  (upstream took eslint 10.12.0 too). Conditional member: `eslint-plugin-erasable-syntax-only`
  0.7.2 lockfile-only IF it resolves within parent (`@bfra.me/eslint-config`) ranges without
  manifest edits, else record reason. Held with recorded reason (age or verifiability):
  vite 8.3.4 (12:07Z today), @hono/node-server 2.1.4 (04:42Z today), @playwright/test 1.64.0
  (20:44Z yesterday AND mcr companion digest unverifiable — the def's own escape hatch),
  @opencode-ai/plugin 1.18.35 (registry time-map carries no publish date → treat under-age).
  Def-line amendment rides implement (the def's literal version list defers to the soak rule).
- **B4** (`rm-761`): three-site digest re-pin to `ea17c68df891` (v6.1.0, first-hand gh api).
  Trivial, isolated, actionlint-verifiable locally; deliberately excludes upload-artifact /
  setup-node / setup-qemu (unlanded sibling lanes rm-108-405e9004, rm-558).

### Why coherent

One reliability theme (B1+B2: two live-repro'd correctness fixes in the boot/snapshot paths) +
one currency theme (B3+B4), zero cross-member file overlap, no member depends on another's
landing, and every member's acceptance is checkable by this repo's own gates. Total effort ≈ one
cycle day.

## Deferred — highest-value exclusions and why

| Item | Reason |
|------|--------|
| rm-104 (98, render hardening) | Primary surface (vendored-path exclusion) lives in the external `hermes-roadmap` render tool — not completable end-to-end in-repo this cycle; the in-repo members (stack-correct evidence doc, unmanaged-file drift gate) are real but secondary; defer to a cycle that can coordinate the vendored render bump. Read first-hand this phase. |
| rm-279 (96, Lint job timeout) | CI-runner-bound; needs live CI observation to attribute; no local repro (repo-wide lint = 34s locally). |
| rm-252 / rm-157 / rm-103 (absorb + 1.8.0) | Absorb decision due 2026-10-13; both 1.8.0 gates still open as issues; 33-file port is next-cycle-first-action per standing disposition. |
| rm-282 (override floors) | Gated on a publishable audit set. |
| rm-117 / rm-149 / rm-249 / rm-107 / rm-119 (features) | Multi-surface feature work (panels, PKCE, push SW); next cycles. |
| rm-648 / cve-tripwire first-fire | Main-lane: workflow absent at this base (landed on main post-9aceea8); one-line NODE_IMAGE cure owned unlanded as rm-755 (89ebbf49 + 9fd8bcad64a8 double-claim). Urgent by Mon 2026-10-12 06:53Z — a main-based sibling run must take it; this run records the urgency only. |
| rm-116 (protection fill) | Push-gated landing stage; sixth empty-shell re-probe recorded. |
| Stale conductor/ci refs (146) | Push-stage reap; rides the landing pipeline. |
| Code-scanning dismissal (47) | Sibling-owned (rm-758 divergence) + requires gh alert writes; not this cycle. |
| Playwright 1.64.0 | Double-gated: under-age AND mcr digest unverifiable. |

## Ledger effects of this phase

`rm-759`/`rm-760`/`rm-761` flipped candidate → open with selection provenance (prioritize
`0051bbfb`) and per-item scope lines (B3's scope embeds the soak-rule cut). Census after flips:
238/0/rm-761 unchanged (status moves don't move counts); guard pin stays `toBe(761)`.

## Verification expectations (batch level, for implement/review/fold)

1. Gates green at base before edits (already re-proven this run: install 9.6s, lint rc=0,
   tsc×3 rc=0, tests 61/2435 + 31/1183).
2. After edits: `pnpm check-types`, `pnpm lint`, `pnpm test`, census 238/0/761 healthy, roadmap
   guard 8/8, `pnpm audit -r` rc=0, actionlint container-form green on the three workflows,
   frozen-lockfile install rc=0 after B3's regen.
3. B2 ships its live-repro flip (false→true) in the implement evidence; B1 ships the spy proof.
4. Ledger: three def-line status flips + B3 scope amendment land atomically with the code.

## Watch items

- Mon 2026-10-12 06:53Z cve-tripwire first fire (main-lane, rm-755 urgency).
- 2026-10-13 absorb decision (rm-252 interlock with rm-157).
- Node v26 LTS 2026-10-28 (rm-139 lane).
- Next refresh window openers: vite 8.3.4, @hono/node-server 2.1.4, @playwright/test 1.64.0
  (+mcr digest), @opencode-ai/plugin 1.18.35 — all age-eligible within ~24h.

## Cycle outcome (pre-review, 2026-10-08, compound abe328cb)

All four batch items implemented and validated before review; nothing
executable changed after the full-validation snapshot.

| Item | Result |
| --- | --- |
| B1 rm-759 statSync pre-check | landed (`src/github/snapshot-store.ts:101-107`); spy-proof ordering tests green; spy implemented as vi.mock passthrough (node:fs namespace frozen — `vi.spyOn` throws) |
| B2 rm-756-content symlink entry cure | landed (`src/server.ts` raw-then-realpath comparator); file/dir-symlink spawn tests green; sibling rm-756 owns the ledger line, this run's assess F1 owns the discovery |
| B3 rm-760 refresh (soak cut) | landed eslint 10.12.0 + vite 8.3.3 (two bumps; four held with reasons in the def); frozen install + audit clean |
| B4 rm-761 action re-pin | landed pnpm/action-setup v6.1.0 ×3; actionlint green ×3; visual + Lockfile Guard ran green on the ephemeral PR with the pin live |

Validation: targeted — engine-mapped 22 files/765 tests + web straggler 1/1
(766 total) green over the 6 changed surfaces; FULL — ephemeral-PR CI 11/11
checks SUCCESS (PR #445, Actions Main 37800379193, snapshot 86cecb1f = this
tree), PR + both `conductor/ci-*` refs reaped clean, digest
`validation:v1:80683c17…` declared verbatim (re-derived == dispatch).

Next-cycle context (recorded in ROADMAP, not re-minted here):

- rm-760 held versions become soak-eligible: vite 8.3.4 from 2026-10-09T12:07Z,
  @hono/node-server 2.1.4 from 2026-10-09T04:42Z, @playwright/test 1.64.0 from
  2026-10-08T20:44Z (gated on mcr digest verification),
  @opencode-ai/plugin 1.18.35 ineligible until a dated release exists.
- upload-artifact v7.0.2 / setup-node v7.1.0 re-pins stay in the unlanded
  405e9004 sibling lane (divergent double-claim avoided by design);
  setup-qemu v4.4.0 rides rm-558.
- NEW mint rm-778 (above the live-reprobed sibling ceiling rm-777):
  `conductor/ci-*` stale-ref hygiene sweep — ~50 orphaned heads on origin from
  failed/aborted ephemeral validations; two reusable lessons filed under
  `docs/solutions/workflow-issues/` (validation routing, frozen fs namespace).

Census after compound: 239 defs / 0 dups / max rm-778; guard pin 761→778.
