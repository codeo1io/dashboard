---
module: dashboard
tags: [repository-maintenance, cycle-3, compound, rm-1970, rm-142, rm-252, rm-274, rm-1450, rm-778]
problem_type: maintenance-compound
---

# Cycle-3 compound record — run c3182ce7bce6419788c950128a22f220 (VISUAL-TRUTH UNBLOCK)

Compound record for repository-maintenance cycle 3, run `c3182ce7bce6419788c950128a22f220`, attempt
`80a58eb91fed442e988f35762955bb8d`, composed 2026-10-18 at worktree base `64cd2f6a` (the canonical
fold-handoff state: implement delta uncommitted, HEAD == base). It consumes ONLY pre-review cycle
evidence — the recorded assess, research, roadmap, prioritize, stewardship, implement, targeted_tests
and full_tests outcomes. Review and landing outcomes happen after this step and are carried forward by
the next cycle's assessment. No test or validation command was executed at compound.

## Cycle shape

- **assess** `c3a84ae2` — base `64cd2f6a` == `origin/main` (0/0). Gates fresh: `pnpm check-types` EXIT 0,
  `pnpm lint` EXIT 0, `pnpm audit --recursive` clean, `pnpm test` 5267/5267. Headline: **main itself was
  visual-red** — the push run for its own landing (run 39024790480) failed `3294px expected, 3410px
  received, 153655 px`; PRs #870/#871 were fold-closed 1-2 min after their visual failures while
  `.github/workflows/visual.yaml` claimed failures "without blocking merges".
- **research** `45dbbfbe` — upstream `fro-bot/dashboard` frozen at #646 `a957b59b` (release 2026.10.44,
  2026-10-17T08:43:33Z). Absorb window = exactly #646/#644/#643. `OPERATOR_CONTRACT_VERSION` reads
  `1.11.0` on BOTH sides. npm floor drift measured per-package from the live registry.
- **roadmap** `bfbfd8ab` (prior attempt `325cfd21` dead — see ledger) — minted `rm-1970` (visual gate
  policy contradiction) + 6 riders + extension #45 at base; census 269 defs / 0 dups / max `rm-1970`.
- **prioritize** `c209900e` — selected the batch "VISUAL-TRUTH UNBLOCK" from the 268-def estate.
- **stewardship** `6db8a374` — packaged the batch as a structured stewardship request; verified the
  `DASHBOARD_VERSION` consumer at `web/src/shell/AppShell.tsx`, the stale Fro Bot paragraph, and that
  `.github/workflows/release.yaml` already passes the build-arg; extraction whitelist = PNG + spec only.
- **implement** `da204b2a` — mandatory frontier re-probe found `origin/main` **693 commits ahead**
  (mass-fold, tip `505e352d` 2026-10-18T06:34Z): U1 (visual baseline cure) and U3 (Dockerfile
  `DASHBOARD_VERSION` sink) had ALREADY landed on main → superseded, dropped. Delivered U2 + U4.
- **targeted_tests** `2fbf6217` (prior attempt `3645c034` dead — see ledger) — seeded command verbatim;
  the YAML workflow surface derives no narrow scope, so the runner auto-escalated to the seeded
  cloud-CI fallback (ephemeral PR #911). Three prior-reds adjudicated (below). Digest
  `validation:v1:8c398db6a138acb2d426a05a4511a6f71d360d96895e236f0f6fa16e7ccca63c` MATCH vs dispatch.
- **full_tests** `40f04cf4` — authoritative validator verbatim, rc 0 "ALL PASS": ephemeral PR #926
  (`6fb4fd6f` ← `8fa72bff` ← `64cd2f6a`, merge-base == worktree HEAD), Main check_run 3910848207
  SUCCESS, all 11 workflow buckets adjudicated. Prior #911 reds did NOT reproduce under the fresh green
  round (both prior runs already self-deleted/404). Digest re-derived twice on the live worktree —
  identical both times.
- **compound** `80a58eb9` (prior attempt `b8b7b26f` dead — see ledger) — this record.

## Attempt-death ledger (forensics performed BEFORE redoing each phase)

- `325cfd21` (roadmap): provider-family reap. Event log = 9 messages, status pings only; no typed
  artifact, no patch, no durable roadmap work. Redone from scratch by `bfbfd8ab`.
- `3645c034` (targeted_tests): provider-family reap ~26 s in. Event log = 4 lines
  (turn_start → 1 progress ping → session_reaped → turn failed); no typed artifact; no scratch trail
  under its id anywhere in the spool. Zero work to adopt — redone from scratch by `2fbf6217`.
- `b8b7b26f` (compound, this action's prior attempt): delivery-family infra failure at ~7 min.
  Forensics by THIS attempt: `done/`, `results/` and `index/` envelopes exist, but `results/` holds
  only a mid-work session status ("re-reading blocks to build edit anchors"); the typed
  `delegate/b8b7b26f….json` artifact was never written; zero scratch files under its id; and the
  worktree is byte-identical to the recorded implement delta except `test/dashboard-version-contract.test.ts`
  (66 → 78 lines, mtime 00:44:25Z — inside the targeted_tests window, i.e. targeted's documented F1
  cure, not compound work). A session-level `succeeded` exit does NOT imply a delivered PhaseResult.
  Verdict: zero durable compound work → redone from scratch by `80a58eb9`.

## Cycle outcome

Batch selected: **VISUAL-TRUTH UNBLOCK** (4 units). Two were superseded mid-cycle by the 693-commit
mass-fold (U1 visual baseline extraction from `refs/pull/880/head 97d5b89d` — main landed that regen
and then a newer 3326px regen at `8c2e9102`; U3 Dockerfile `DASHBOARD_VERSION` ARG/ENV sink — landed
on main). Two were delivered, plus the roadmap extension and a new contract test. Delivered delta
(5 files, +115/−11, uncommitted at base — the canonical fold-handoff):

- `.github/workflows/visual.yaml` — truth header: visual failures DO gate merges in practice (fold
  forensics #870/#871); same-PR regen discipline; comment-only delta, zero workflow keys changed.
- `README.md` — SW bullet rewritten to the real contract: precache of the hashed build manifest, push
  availability UI, background install with activation gated on the page posting SKIP_WAITING via
  `web/src/pwa/ReloadPrompt.tsx`. (The rewritten bullet cites SW guard tests that exist at the folded
  tip — forward-true at landing, absent at this base.)
- `AGENTS.md` — Fro Bot paragraph: workflow ACTIVE and self-gating (no `FRO_BOT_PAT` secret; the
  step-level presence gate green-skips; provisioning the secret ARMS the real run and its OPENCODE_*
  companions — check `gh secret list` first).
- `ROADMAP.md` — extension #45: `rm-1970` + six riders (rm-142, rm-252, rm-274, rm-102, rm-778, rm-1450).
- `test/dashboard-version-contract.test.ts` — NEW: pins CalVer `DASHBOARD_VERSION` build-arg wiring
  through `web/src/shell/AppShell.tsx`, base-portable (named-helper or inline spelling) with the
  `: undefined` fallback arm asserted.

### Validation chain (consumed at compound; NOT re-executed)

- targeted_tests: F1 = the new contract test was born-red everywhere (implement's local "17 passed"
  overclaimed — the regex matched no real spelling); cured portably in-phase. F2 = should-release
  parity red at the ephemeral PR — environmental, the validator's injected release-channel paths vs
  the base corpus (old-base artifact-red class), non-reproducing later. F3 = visual red — the BASE's
  born-red reproduced byte-identically (3294 vs 3410, 153655 px; run 39083459619 == run 39024790480),
  while the batch's workflow delta is comment-only. Also cured in-phase: shared-worktree `node_modules`
  had vanished between implement and targeted (ERR_MODULE_NOT_FOUND, nm-count 0) — restored with
  `pnpm install --frozen-lockfile`, zero manifest drift.
- full_tests: green over identical content; digest stable across dispatch + two live re-derivations
  (test-file edits classify non-executable, so the F1 cure never moved it).

## Ledger deltas made at compound

- `rm-1970` status: `candidate` → **implemented 2026-10-18, validated pre-review, pending landing**
  (branch (a) truth header + same-PR regen discipline; full-suite green on ephemeral PR #926), plus a
  validation-outcome rider consuming both recorded test phases.
- Riders added: `rm-142` (U1 supersession — first-landed-wins; base born-red proven byte-identical by
  both validation phases), `rm-252` (window frozen #646/#644/#643 at close; absorb shape:
  markdown-it@15.0.3 the only new dep, contract `1.11.0` both sides; floor drift), `rm-274` (fourth
  kill-switch site cured pending landing), `rm-1450` (**KEEP ACTIVE** decision line — the acceptance's
  missing artifact; fro-bot.yaml comment flip remains), `rm-778` (4 conflicting PRs unchanged; #926
  still open at close — sweep class).
- Compound tail comment added before the managed-render marker. Census unchanged:
  **269 defs / 0 dups / max rm-1970, zero mints at compound** (verified by static replica of the
  census/guard logic; no test execution).

## Reusable lessons / prevention rules

1. **The implement-time frontier re-probe is load-bearing.** 693 commits landed between prioritize and
   implement this cycle; the twin-probe (content + lineage) superseded 2 of 4 units. Superseded units
   are dropped, never re-landed (first-landed-wins), even when CI-proven bytes are in hand.
2. **YAML workflow surfaces derive no narrow test scope** in the impacted-tests runner; run the seeded
   command verbatim once for the record and let it auto-escalate to the fallback validator — the
   escalation itself is the evidence.
3. **Old-base ephemeral reds are environmental until proven otherwise.** The should-release parity
   class (injected workflow paths vs base corpus) non-reproduced under the fresh green round; when the
   prior ephemeral runs are self-deleted (404), the fresh round IS the durable record.
4. **A new guard test must be proven to BIND.** A regex that matches no real spelling passes vacuously
   or fails everywhere; assert against both the base and the folded-tip spelling, and pin the negative
   arm (the `: undefined` fallback). Local green on a fresh test is not evidence it guards anything.
5. **Shared-worktree `node_modules` can vanish between phases** (concurrent delegates); the cure is
   `pnpm install --frozen-lockfile` (zero manifest drift), never a lockfile edit.
6. **Digest classification**: a test-file-only edit is non-executable — the validation digest does not
   move; declare the digest verbatim rather than re-deriving a divergent one.
7. **Reaped-attempt forensics before redoing**: check `done/`/`results/`/`index/` envelopes, the
   event log, scratch under the attempt id, AND byte-diff the worktree against the recorded delta
   patch. Session-level `succeeded` ≠ delivered PhaseResult (b8b7b26f).
8. **Worktree state flips between phases** (transient snapshot committed then pruned post-adoption →
   uncommitted canonical handoff). Re-derive anchors from the live tree, never from memory — the prior
   compound attempt burned its whole turn re-deriving stale anchors and delivered nothing.
9. **Ephemeral validation PRs self-clean asymmetrically** (#911 closed with head ref gone; #926 open at
   compound close). Record the live state at compound; the open one is sweep material.

## Next-cycle candidates (existing ids only — no new mints)

1. `rm-1970` remainder — the structural half: ruleset-required visual check + reviewed auto-regen path
   (pairs with the branch-protection ruleset recommendation recorded on the rm-116 orphan rider).
2. `rm-252` / `rm-876` absorb window — #646 render-run-output-as-Markdown (markdown-it@15.0.3 the only
   new dependency; no contract-bump decision), #644 `@hono/node-server` 2.1.5 (listener abort on HTTP/2
   client stream reset — gateway-relevant), #643 finished-run-again.
3. `rm-139` — Node 26 adoption gate 2026-10-28: 10 days out at compound time; time-gated, assess first.
4. `rm-778` — sweep the 4 conflicting conductor PRs #860/#798/#790/#787; check whether ephemeral PR
   #926 self-closed and close-without-head-resolution if not.
5. `rm-102` — Dependabot silence (zero runs since 2026-10-02T21:07:16Z; Actions itself is back).
6. `rm-274` remainder — other doc-truth sites, paired with the SW-reality repair.
7. `rm-1450` closure — fro-bot.yaml comment truth-flip + fresh `gh api` readback; overlaps `rm-879`
   (re-verify live workflow state + secret presence; doc-half landed this cycle).
8. Toolchain majors window — typescript 7.0.2, vitest 5.0.5, eslint 10.13.0, `@playwright/test` 1.64.1,
   `@types/node` 26.6.5, hono 4.13.13 (rm-271 lanes).

Sibling compound records for pattern continuity:
`docs/prioritization/2026-10-17-repository-maintenance-cycle-3-compound-run-d0d355ed1832.md`.
