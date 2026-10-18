---
module: repository-maintenance
run: adc266709cd04ae58db551baceb14427
cycle: 1
batch: compound
date: 2026-10-18
---

# repository-maintenance cycle 1 — compound (run adc266709cd0)

Pre-review compounding of cycle:1 evidence only (assess → research → roadmap →
prioritize → stewardship → implement → targeted_tests → full_tests). Review,
fold, and shipping outcomes are downstream; the next cycle's assessment
carries them forward.

## Cycle ledger

| phase | attempt | outcome |
|---|---|---|
| assess | b0a3ca6c | green — fresh adversarial pass at 64cd2f6a; gates 5267/5267; 6 new findings (3-way pin disagreement, PWA dead-update-path docs, darkness-watch unwired, 3 workflows unbounded, 2 unbounded probe fetches, dead DASHBOARD_VERSION arg) |
| research | 52e92114 (reaped) → 8c61f0cb | 10 evidence-backed candidates; C1 (Fro Bot cron time bomb) drove the batch |
| roadmap | 210f5a6a (reaped) → fb331df1 | ROADMAP +45 ins, mints rm-1518..1521; patch + postimage artifacts |
| prioritize | 47d61d14 | batch selected with live re-probes (cron unfired, cure blob byte-verified via refs/pull/868/head) |
| stewardship | 14c00716 | stewardship_request contract; 14 anchored surfaces; 5 must_remain_separate pairs |
| implement | dce96c07 (+ re-file 8d90ef25) | batch implemented; PNG swap dropped after sibling landing |
| targeted_tests | 6fcec1c7 | prescribed command verbatim, node targeted=2, 20/20; digest stable 382004bf |
| full_tests | 34be32de (reaped) → 88e21fec | GREEN: PR #949 rc 0, 7 buckets SUCCESS + Fro Bot SKIPPED-green |

## Validation outcome (authoritative, full scope)

`github_ci_validate.py --repo .` (engine release 920b06fa, dispatched attempt
88e21fec) → rc 0, `ok:true`, ephemeral PR #949 (head `be67dfe4`, base
`79886f1e` whose parent is worktree HEAD `64cd2f6a`), run 39097257202
conclusion=success: Test / Lint / Check Types / Check Workflows / Test Scripts
Load / Design Check / Dependency Review all SUCCESS, Fro Bot SKIPPED — the
skip itself being live proof the re-restored rm-1518 gate behaves correctly
under a PAT-less dispatch. The validated tree = the cycle batch + the
release-paths cure corpus. Statuses flipped: rm-1518/1519/1520/1521 → done
2026-10-18 with resolved lines citing this evidence.

## Durable lessons / prevention rules (pre-review evidence)

1. **Adjudicate full-suite reds by BOTH tree-side cure and ENGINE RELEASE —
   they are distinct cures that landed in the same green run.** The reaped
   34be32de attempt ran release 70360ce5, whose injected release.yaml pairing
   for main's gzip static-sidecars script (NOT adopted in this fork's tree —
   it lives only on origin/main, fetched there 2026-10-17) deterministically
   reds the rm-248 parity guard at any base predating main's corpus pairing —
   reproduced twice, identically (single `should-release` assertion, 3611/3612
   green). Two cures exist: check out the main-side release-paths corpus
   (release-paths.ts + release.yaml, 0-diff vs main — done in this worktree
   post-reap), OR re-dispatch on engine release 920b06fa+, which validates
   the same tree green. Before debugging a full_tests failure, check the
   release hash in the
   command; a stale-release artifact red is cured by re-dispatch, not by tree
   edits.
2. **Reaped attempts mutate the worktree silently.** The reaped full_tests
   attempt left the Dockerfile rm-1519 block reverted-to-base mid-phase
   (porcelain 13→12 with no phase recording it). The succeeding attempt's
   forensics — fingerprint the reaped ephemeral PR head by unique batch files
   + base lineage, then `git checkout <snapshot> -- <path>` — restored the
   bytes without redoing the phase. Standing rule: after any reaped attempt in
   a worktree, diff the worktree against the reaped snapshot over batch paths
   before trusting porcelain.
3. **Mid-run sibling landings satisfy riders — byte-compare before carrying
   binary or duplicate deltas.** Twice this cycle: the visual born-red cure
   (blob `222cac99`, 346452b) landed on main as `f5927919` minutes before the
   implement phase would have swapped it; the Dockerfile version wiring landed
   independently as rm-1483 (`389d60e` lineage) while the batch carried its
   own copy. Both resolved by identity checks (blob compare / grep ARG+ENV),
   dropping the redundant delta. First-landed-wins; the fold keeps one.
4. **The gate form is recoverable from history.** The rm-1450 secret-presence
   gate text was reconstructed from `c51597ad^` (pre-adoption) rather than
   reinvented — job-level `env.HAS_FRO_BOT_PAT` + per-step `if` guards,
   because the `secrets` context is not available in a job-level `if:`.
   actionlint-rejected forms and invention risk were both avoided.
5. **Out-of-band detectors belong in CI, but their blind spot must be
   documented in-band.** actions-darkness-watch now runs Monday 09:07Z
   (post-sentinel-family), yet a scheduled lane structurally cannot see a
   total blackout (its own run creation would be dark) — the runbook probe
   stays authoritative and the workflow file says so.
6. **Conductor graft comments can shadow-grep as roadmap rows.** Literal-`\n`
   text inside `<!-- conductor integrate ... -->` comments matched `rm-151x`
   patterns during this compound phase; row-format greps must anchor on the
   real row syntax (``- id: `rm-N` |``), not bare IDs.

## Next-cycle candidates (concrete, evidence attached)

- **Branch-protection fill (rm-878/rm-116)** — now unblocked: visual gate is
  green on main (f5927919), and the Main/CodeQL conclusions are stable. Fill
  `[Main, CodeQL]`, strict, admin-enforced; the override procedure is
  documented in AGENTS.md.
- **First-fire readbacks (observability)** — darkness-watch Mon 2026-10-19
  09:07Z expecting DARK (audit/base-drift/canary/upstream-drift stale,
  cve-tripwire/release-channel never-ran); the Monday sentinel family
  (03:37–07:23Z) should resume if rm-1437's lane landed. If Monday 09:07Z
  passes GREEN, the blackout ended; if the lane itself never runs, the
  runbook's manual probe is the escalation.
- **rm-1935 PWA activation decision** — prompt-mode revival vs
  autoUpdate+skipWaiting-on-install; either way fix the mutually-false comment
  pair (sw.ts:33-36/:123-124 vs ReloadPrompt.tsx:1-2). UI-growing: own visual
  regen required.
- **rm-1519 legs (b)/(c) — release posture truth** — leg (b): either provision
  an App secret and flip release.yaml to contents:write, or adopt the
  GITHUB_TOKEN-contents-write posture (needs `permissions: contents: write`
  review); leg (c): gate the AppShell release-notes link on a non-dev
  version so the codeo1io link only renders for real releases. Both were
  deliberately deferred from cycle 1 (stewardship must_remain_separate); the
  ARG/ENV leg (a) is done.
- **Upstream absorb window (rm-252/rm-259)** — upstream advanced to the
  markdown family (a957b59b + d2a976dc; #646 markdown-it MISSING and
  react/react-dom 19.3.1 RESOLUTION_DROP pending pnpm-side) and migrated to
  Bun (no more pnpm-lock upstream) — the next absorb is a package-manager
  decision point; absorb-verify needs a bun-lockfile leg.
- **Node 26 LTS window (2026-10-28)** — node:24 maintenance starts 10-20;
  clean switch on/after 10-28 (@types/node 26.6.5 exists; riders rm-689/rm-139).
- **Stale-PR disposition** — #860/#798/#790/#787 remain CONFLICTING+DIRTY fog
  carriers; close-or-supersede at integrate time, never rebase onto them.
- **Toolchain majors** — TS7/vitest-5 blocked on peer deps (typescript-eslint
  cap; clearMocks hazard) — dependency unit, deliberately not this cycle.

## Artifacts

- Implement batch (riding the fold): 10 M + 3 ?? — workflows ×5,
  scripts ×2, clonedeps.json, AGENTS.md, Dockerfile, ROADMAP.md (now with
  done-flips + resolved lines), actions-darkness-watch.yaml,
  test/clonedeps-pin-parity.test.ts, implement batch doc.
- Validation: PR #949 (rc 0, 7 buckets), targeted 20/20 + companion 15/15,
  census 272/0 dups.
- This compound doc.
