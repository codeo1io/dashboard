# Dashboard maintenance — repository-maintenance cycle 2 batch (2026-10-10, run a794d381b4f04a8ebefc18ea76e58067)

module: dashboard
tags: `[reliability, ci, security, supply-chain]`
problem_type: batch-record

Base: HEAD `88e423a` (origin/main, verified unmoved this cycle). Campaign:
`repository-maintenance:b2663eec115b4a4b89e14561d7bcb95b:cycle:2`. Prior phases:
assess `1fa748da0805`, research `dc089b0feab54f`, roadmap `08c9022a` (ZERO-MINT, ten
riders — riding this patch), prioritize `a68c1b66` (decision doc in the delegate
spool scratch), stewardship `3d1f7e19`.

## Selected: CI gate truth + supply-chain currency (3 units, all `.github/` + ROADMAP riders)

Zero `src/`/`web/` code; the Dockerfile is a read-only derivation source, never a
change surface. Selection re-probed live premises: origin/main unmoved at `88e423a`,
open PRs #501/#503 carry none of this batch's content.

### U1 — `rm-779` cve-tripwire born-broken resolve + `rm-188` fold (batch lead, clock item)

The resolve step's literal `NODE_IMAGE='node:24-slim'` (cve-tripwire.yaml env) has
matched nothing in the Dockerfile since the `ad8f21e` trixie rename (2026-10-07) —
the first scheduled fire (Mon 2026-10-12 06:53Z) would die born-red at "Resolve
pinned digest". Cure: derive the whole pin from the Dockerfile `ARG NODE_IMAGE=`
line (family + digest in one `sed -nE` read), fail-closed preserved; `runs-on:
ubuntu-24.04` folds rm-188 (verified the fleet's last `ubuntu-latest`).

**Delivery route: adopted by content** — the byte-identical hunk of unlanded sibling
`implement-938d6033557a-533ad14f` (their fold-REJECTED `65eaa318`'s content was
re-verified sound; only its dirty-tree delivery was rejected). Applied verbatim
(+14/−4), then re-verified fresh this phase; ledger ownership settles at integrate
(ext #30 precedent). The rm-648 rider obligation landed with it.

### U2 — 13 action re-pins, digests tag→commit verified first-hand

- setup-node `82076278`(v7.0.0) → `949feb24`(v7.1.0) ×5 — actions/setup/action.yaml:19,
  audit.yaml:74, release.yaml:57/:389, visual.yaml:79
- upload-artifact `043fb46`(v7.0.1) → `cf430e03`(v7.0.2) ×4 — release.yaml:350,
  scorecard.yaml:44, visual.yaml:101/:109
- codeql-action `2892aa5`(v4.38.2) → `24c54180`(v4.38.3) ×4 — codeql.yaml:56/:62,
  scorecard.yaml:51, release.yaml:357

All digests re-resolved this phase via `gh api repos/<repo>/git/ref/tags/<tag>`
(annotated codeql tag `cee97f86` peeled → `24c54180a607b1449ed407dd24f251e4e9147c8d`).
Codeql/upload-artifact halves are byte-convergent with unlanded sibling
`implement-493bbbf2` (content of upstream #589/#580); codeql also with `533ad14f`
— reconcile by content at integrate, never a fourth build.

### U3 — fro-bot/agent pin v0.117.5 → v0.118.3 (fro-bot.yaml:347)

`378bc287` → `d88c245fdbd4a952bd88a0f04b8d53927403f16d`; runtime-inert (same
operator-stream contract 1.8.0 both sides); no unlanded lineage carried this
digest (spool probe). Completes the rm-252 3-actionable absorb trio before the
2026-10-13 window re-probe.

## Verification (focused, this phase)

resolve-sim positive on the live Dockerfile (PINNED=node:24-trixie-slim@sha256:173f1258…,
rc=0) and negative stub (exit 1 at the ::error); actionlint container form
(`rhysd/actionlint:1.7.12`) rc=0; roadmap census 247/0/780 unchanged + integrity
guard suite green; `pnpm lint` + `pnpm check-types` rc=0; post-flip runs-on audit:
zero non-comment `ubuntu-latest` across `.github/`; residual-old-digest grep = 0;
new-pin census = 14. Repository-wide `pnpm test` is reserved for the full_tests
gate.

## Deferred this cycle (decision doc a68c1b66)

rm-825/826 sibling-implemented (adopt at integrate), rm-850 no-escalation, rm-651
live PR #503 lane, rm-139 precondition-owned, gated majors rm-108/133/140
(re-eval 2026-10-21), rm-780 implemented-pending, snapshot discipline no-trigger.
First tripwire fire / dispatch probe = re-enable-conditional evidence (Actions
disabled account-level since 2026-10-09T01:59Z).
