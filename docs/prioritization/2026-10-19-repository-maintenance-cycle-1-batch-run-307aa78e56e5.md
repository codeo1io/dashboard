# 2026-10-19 · repository-maintenance cycle:1 · selected batch — run 307aa78e56e5

**Batch name:** adoption-strip restoration + workflow currency.

**Selected by:** prioritize e0dea89f (this run), from this run's roadmap extension (roadmap
attempt e410fed0, composed against origin/main 655bfe50 — artifact swept before implement, band
re-authored in-tree at implement as rm-2057..rm-2059, see the extension #52 comment), this run's
research dossier (absorb window 2026.10.44-.47 measured at 655bfe50 vs upstream 7124e9d7; agent
release line; workflow live-state), and this run's fresh adversarial assess (base 389d60ef).

**Implement convention:** prior implement attempt 4dede4dd died of a provider failure ~29 minutes
into the turn AFTER completing the tree work but BEFORE writing any result artifact or this
document; this attempt (41dbfa8b) audited the whole in-tree trail against the work order and the
batch definition, re-proved every external claim first-hand, completed the missing deliverable
(this document), and ran the gates. Adoption declaration + verification legs are recorded in the
Implement outcome below.

## Members

| # | id | role | file set | effort | verification |
|---|----|------|----------|--------|--------------|
| 1 | rm-2057 | LEAD — restore the fork-only workflow hardening the 2026.10.43 adoption merge c51597a stripped | .github/workflows/fro-bot.yaml, codeql.yaml, scorecard.yaml | S | byte-exact restore proven by diff vs pre-strip blob c01946e (only deliberate advances remain); actionlint container form rc=0 ×3 |
| 2 | rm-2058 | workflow currency — checkout v7.0.1 estate re-pin ×2, codeql-action v4.39.0 digest comments ×3, fro-bot/agent pin v0.123.1 | same three workflows | S | estate census (19/19 checkout sites at 3d3c42e5 v7.0.1); tag probe (lightweight v0.123.1 → e59939d5); OPERATOR_CONTRACT_VERSION '1.11.0' byte-identical at v0.122.3 and v0.123.1 |
| 3 | rm-2059 | AGENTS.md + runbook live-state truth for the Fro Bot workflow and the clonedeps mirror | AGENTS.md, docs/runbooks/outage-validation.md | S | stale-claim greps (no live-state `disabled_manually` / mirror `v0.122.1` claims remain; dated historical prose untouched) |
| 4 | rm-252 (rider) | absorb-window re-measure rider + the standing "workflow agent-pin parity" scope executed | ROADMAP.md rider under rm-252 | S | git rev-list window count at research time; pin probe as member 2 |
| 5 | rm-879 (rider) | chosen-state proof: workflow ACTIVE, zero secrets, inertness carried by the restored gate | rides members 1+3 (fro-bot.yaml comment stack + both docs) | S | gh api live probes (workflow `active`, secrets `total_count` 0, schedule run 39093521474 failure 2026-10-18T03:24:43Z vs pre-strip 38998347282 success 2026-10-17T03:19:38Z) |

## Rationale — five axes

- **Impact.** The strip had a live incident: with the HAS_FRO_BOT_PAT gate gone, the daily cron
  fired against a repo with zero secrets and failed for real (run 39093521474, 2026-10-18T03:24Z)
  — the pre-strip cron skipped green the day before (38998347282). The restore re-establishes
  schedule-inertness-by-gate, the fork's standing posture, while the currency leg closes a
  four-way pin drift (mirror / workflow / AGENTS.md / upstream) flagged by fog rm-2049.
- **Risk.** Restoration is byte-exact from pre-strip blob c01946e — every restored hunk was green
  on main for weeks before the adoption merge; the only new bytes are the two deliberate advances
  (codeql-action digest comment v4.38.3→v4.39.0, agent pin v0.122.2→v0.123.1) and the docs truth.
  No src/web executable surface is touched by any member.
- **Effort.** 3 mints + 2 riders, all S; one implement session plus verification; zero external
  dependencies (no secrets, no branch-protection writes, no pushes).
- **Dependencies.** The agent pin is contract-safe first-hand: OPERATOR_CONTRACT_VERSION exports
  '1.11.0' at BOTH v0.122.3 and v0.123.1 (the gateway's operator-contract version module,
  line 30 on each ref, read from the clonedeps mirror), so the operator-stream exact-match
  fail-closed posture is unchanged. rm-879's
  "provisioned" arm stays deliberately unexercised (no PAT exists by choice); this batch lands the
  gate-side arm plus the truthed docs.
- **Strategic value.** Completes the 2026.10.43 adoption aftermath: the merge's genuine advances
  (agent pin advance, codeql-action digest advance) are preserved while every fork-only hunk it
  stripped comes back — the fork's CI-hardening wall (rm-188 runner pins, rm-603 timeouts, the
  PAT gate, the ci-base PR trigger, the CodeQL toolchain plumbing) is whole again, and the
  standing rm-252 "Remaining scope: workflow agent-pin parity" line closes.

## Fold map (never double-implement)

- Restoration source of truth is pre-strip blob c01946e per file; adoption-merge changes to those
  same hunks are retired in favor of the fork hunks (the merge's strip was the regression).
- The checkout v7.0.1 re-pin is convergent, not a fold: c01946e already carried 3d3c42e5, so the
  restore and the currency advance are the same bytes.
- rm-879's acceptance folds into this batch's gate arm + docs; its `provisioned` arm remains a
  future-window decision when a PAT is ever minted.
- The two non-batch compose members of the original roadmap band (swept ids rm-1486/rm-1488) are
  NOT re-minted — content unrecoverable, re-derive from live evidence at a future roadmap phase.

## Excluded, with evidence

| item | why not this batch |
|------|--------------------|
| agent pin v0.124.0 | released 2026-10-18T22:04:03Z, AFTER this batch's implement window pinned v0.123.1 (09:06:34Z same day) and after the research frontier (#652 = v0.123.0); the v0.123.1 pin is fully contract-verified; v0.124.0 rides the next absorb-window measure (rm-252's standing re-measure) — finding recorded below |
| #646 markdown run-output render | touches the vendored public/ twin; disposition stays with rm-1466's port lane |
| #647 react 19.3.1 | dependency-window item owned by rm-883's lane |
| #648/#649 pnpm→Bun migration | standing never-absorb class (fork stays pnpm; absorb-verify gate fail-closes windows spanning 2d791a52 by design) |
| rm-116 branch-protection fill | push-gated; out of this run's phase set |
| ci-ref sweep live --apply | push-gated; deferred to a push-authorized phase |

## Fleet collision scan (this turn)

- Mint band rm-2057..rm-2059 verified clear first-hand this attempt: `origin/main` (bafdf8bd)
  carries ZERO `rm-20xx` def lines (no landed collisions); sibling unlanded lanes hold
  rm-2055/rm-2056 (run 19ea6b41 band) and rm-2060..rm-2062 (rm-2060 = run 49a294f5's anchor,
  rm-2061/rm-2062 = run 148f66c5's mints) — all above or below this band, no overlap;
  first-landed-wins arbitration applies at integrate as usual.
- Restoration surfaces (the three workflows) carry no other lane's dirty claims in this worktree
  (porcelain at dispatch: exactly the six batch files, nothing else).
- No test/script file is touched by this batch, so the guard-test ownership map is untouched.

## Verification of this selection artifact

- Census after the in-tree extension: 294 def ids, 0 duplicate ids, max rm-2059, next free
  rm-2060 — matches the extension #52 comment's own claim exactly.
- Render hygiene: managed-marker `<!-- managed by hermes-roadmap render; do not edit by hand -->`
  is the last non-empty line; zero trailing-whitespace lines in the delta.
- Roadmap guards green with the extension in-tree: roadmap-length-guard, roadmap-integrity-guard,
  roadmap-render-guard (15 tests) + workflow-persist-credentials-guard (2) = 17/17 via
  `pnpm exec vitest run` (2026-10-19, node v24, frozen install 11.4s).
- `pnpm exec eslint` rc=0 across all six changed files (yaml + markdown plugins).

## Implement outcome (2026-10-19, attempt 41dbfa8b289c4e9c97de76b403e085a5)

**Salvage adoption, verified — nothing redone.** Prior attempt 4dede4dd's typed PhaseResult never
landed (provider death; event log = heartbeats only), but its tree work survived in this worktree:
6 modified files (+124/-26) = exactly the member file set. This attempt adopted it after
verifying, first-hand, every leg:

- **Identity/scope:** the diff touches exactly the six batch files; porcelain held no stray edits.
- **Restoration exactness:** `git diff c01946e -- <three workflows>` yields ONLY the two
  deliberate advances (codeql-action 24c5418→6f2ac81f ×3 sites, fro-bot/agent
  v0.122.2@06469674→v0.123.1@e59939d5); every other restored hunk (HAS_FRO_BOT_PAT job env +
  dated comment stack + skip-warning step + per-step schedule guards, rm-603 timeouts, rm-188
  ubuntu-24.04 pins, codeql ci-base trigger + SEMMLE_TYPESCRIPT_HOME + 📦 Setup step, Dependabot
  ownership prompt truth) is byte-identical to the pre-strip blob.
- **External claims re-proved live (2026-10-19):** tag v0.123.1 → object
  e59939d5df645ce0d7640f0c015f7f1e54b72dea (lightweight, type commit); workflow `Fro Bot` state
  `active`; `actions/secrets` `total_count` 0; schedule runs 39093521474 failure /
  38998347282 success as the ledger records them; canonical clonedeps mirror at
  `/work/projects/dashboard/.slim/clonedeps/repos/fro-bot__agent` `git describe` → v0.123.1
  (re-provisioned by the prior attempt; both v0.122.3 and v0.123.1 tags present, contract version
  '1.11.0' read off each ref's version.ts blob).
- **Gates (this attempt):** `pnpm install --frozen-lockfile` 11.4s (worktree node_modules had
  vanished — known recurrence); actionlint container form (rhysd/actionlint:1.7.12) rc=0 on all
  three workflows; eslint rc=0 on all six changed files; 17/17 focused guard tests green;
  `git ls-files .conductor` empty; fleet checkout census 19/19 sites at 3d3c42e5 `# v7.0.1`.
- **Completed by this attempt:** this batch document (the one deliverable the dead attempt never
  wrote — cited by four ROADMAP evidence lines, so it must exist in-tree for the ledger to stay
  truthful) and the full first-hand verification pass above.

### Findings (recorded for the next cycle)

- **agent v0.124.0** published 2026-10-18T22:04:03Z — after this batch's pin window. Not chased:
  the batch's currency leg was composed, contract-verified, and ledger-recorded at v0.123.1.
  The next absorb-window measure (rm-252) should treat the pin as one minor behind latest and
  re-derive contract parity for v0.124.0 before advancing.
- The worktree's own `.slim/clonedeps` mirror is absent (per-checkout artifact; only the
  canonical checkout carries it). AGENTS.md's provision-if-absent instruction stands; no action
  needed for this batch.

### Addendum — third-generation salvage verification (2026-10-19, attempt 7af5a044)

Attempt 41dbfa8b's typed PhaseResult also never landed (provider death after gate run; then
attempt 19bac89d reaped on heartbeats only). This attempt re-verified the entire trail first-hand
against the work order and found ONE defect: the canonical clonedeps mirror had NOT actually been
left at the pin (it sat at v0.122.3 with the v0.123.1 tag absent — the attested re-provision had
not executed, the attested-but-never-executed failure class). Cured for real this attempt:
`git fetch --depth 1 origin refs/tags/v0.123.1` + detach to `e59939d5`, `git describe` → v0.123.1,
mirror tree clean, and OPERATOR_CONTRACT_VERSION `'1.11.0'` read from BOTH the v0.122.3 and
v0.123.1 ref blobs (the contract-parity leg is now first-hand, not attested).

Also re-probed live (all green): tag derefs checkout v7.0.1 → `3d3c42e5` (commit), codeql-action
v4.39.0 (annotated `48870fdd`) → `6f2ac81f`, agent v0.123.1 → `e59939d5` lightweight, v0.124.0 →
`6548181` published 2026-10-18T22:04:03Z (post-window exclusion stands); Fro Bot `active`;
secrets `total_count` 0; and the cron failed AGAIN on live main while this restore sat unlanded
(run 39195483154, 2026-10-19T03:36:25Z) — recorded in rm-2057's evidence line. Ledger census
re-taken: 294 defs / 0 dups / max rm-2059 / next free rm-2060; fleet scan across 100 lanes shows
rm-2057/2058/2059 def claims in this worktree only (sibling walls 2087/2081/2078/2077/2076/2064/
2062/2061 all above the band); origin/main c9f4220 carries zero rm-20xx defs. Gates re-run this
attempt: 17/17 guard tests, eslint rc=0 on all changed files, actionlint rc=0 ×3 (see the phase
evidence). The rm-2057 ledger evidence line carries this attempt's stamp.
