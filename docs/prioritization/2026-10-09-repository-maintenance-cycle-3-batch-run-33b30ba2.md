# Dashboard maintenance — cycle 3 batch (2026-10-09, run 33b30ba2)

module: dashboard
tags: `[ci-gates, cve-tripwire, workflows, dockerfile-pin, lint-coverage, web-client, deadline-bound]`
problem_type: batch-record
base: ledger composed at 559642a; live tip re-probed at prioritize -> 7055c52 (run c026a644's landing)

## Frame

Repository-maintenance cycle 3, run `33b30ba2cd5947e29301a34ddfd9191a`, prioritize
attempt `c00fa6c237824611ba369148097b0471`. Phase lineage: assess `df3f030d`
(fresh adversarial pass over the Oct 7-8 landings at 559642a == origin/main),
research `eafd1708` (gateway contract window, absorb window, registry readings),
roadmap `8a0031fa` (mints rm-782 + rm-783 above the all-lineage ceiling rm-781,
five dated riders, guard pin 744 -> 783, census 239/0/783), prioritize
`c00fa6c2` (this selection).

Live-tip drift note: origin/main advanced past the compose base during the run —
`559642a` -> `7055c52` via `2ffe2c5` (run c026a644's landing: release.yaml
digest-readback SIGPIPE cure + test/base-drift-digest-readback.test.ts, rm-708's
lane). Neither surface collides with this batch's surfaces
(.github/workflows/cve-tripwire.yaml, test/ contract-test family, eslint.config.ts,
web/**, package.json lint wiring). Implement rebases onto the live tip per the
standing landing rule; the ledger edits ride the batch as authored.

## Selected batch

**'CI-gate truthfulness: cure the cve-tripwire first fire, give the web client a
lint gate'** — two items, one coherent theme: every automated gate this repo
relies on must actually do its job.

### rm-782 — cve-tripwire pin extraction is orphaned by the trixie re-pin (reliability, 76.0)

- Impact: the workflow is DOA — its pin extraction greps `node:24-slim@sha256:`
  while Dockerfile:34 pins `node:24-trixie-slim@sha256:173f1258…` (rm-698 landed
  ad8f21e 2026-10-07T23:49Z, 4.5h BEFORE the workflow itself landed at 2a9dd25
  2026-10-08T04:20Z), so extraction returns empty and the job dies at its own
  :56 'no … pin found' guard before any trivy scan. Zero completed runs to date;
  first scheduled fire Monday 2026-10-12 06:53Z (cron `'53 6 * * 1'`) is
  certain-red without this cure. This is the only deadline-bound item on the
  ledger.
- Risk if unfixed: a standing weekly red that teaches operators to ignore the
  tripwire — the opposite of why rm-648 minted it.
- Effort: small. One workflow edit (derive the image name from the Dockerfile's
  ARG/FROM, or grep the digest generically anchored to the node family) + one
  contract test pinning the workflow-extraction == Dockerfile-pin equality
  (test/dockerfile-context.test.ts family).
- Dependencies: none external. Validation: actionlint container-form, contract
  test, full house battery, plus a same-day workflow_dispatch green as the
  pre-Monday proof (dispatch authority belongs to the ship stage; if unavailable,
  the contract test + local grep simulation carry the pre-landing proof and the
  scheduled fire lands green).

### rm-783 — web/ client tree has no lint gate (maintainability, 44.0)

- Impact: eslint.config.ts:14 ignores `web/**` and no web-side lint path exists,
  so the full-TS client ships with zero automated style/syntax gate; drift is
  already observable (three EOF-newline-missing files from the f90e71b era).
- Effort: small. A web-scoped flat-config slice (own parser options — the client
  is full-TS, so the strip-only erasableSyntaxOnly rule set must NOT be reused)
  wired into the root lint script + Main Lint job, plus normalizing the three
  drifted files. No client behavior change.
- Dependencies: none. Coherence: same validation battery as rm-782; both items
  are about gates telling the truth.

## Scoring over the open-item landscape (dispositions)

Fresh re-probes this phase, first-hand:

| id | pri | disposition |
| --- | --- | --- |
| rm-104 | 98.0 | external: the defect family lives in the fleet MANAGED-RENDER pipeline (pytest/ast evidence strings, bare-array prose), not in this repo's code; not executable end-to-end in this cycle |
| rm-279 | 96.0 | CURED IN PRACTICE, fresh proof: last five Main runs all success; latest Lint job 58s green (run 37839849463, 2026-10-08T20:29:40Z -> 20:30:38Z) vs the 35m timeout ceiling of the 2026-09-29 signal — premise stale; next roadmap phase should record the cure rider |
| rm-102 | 90.0 | in-progress watch (dependabot conversion window ~2026-10-09) — no batch content |
| rm-103 | 85.0 | blocked: Monday upstream-drift red is by-design until the absorb lands — rides rm-252's lane |
| rm-252 | 80.0 | blocked: sole outstanding upstream substance is a82871d/#573 (the 1.8.0 contract adoption); window is rm-157's lane and needs the first fro-bot/agent release past v0.118.2 carrying #1743 (merged 2026-10-08T17:41:05Z, UNRELEASED — research eafd1708) |
| rm-157 | 72.0 | blocked: same agent-release dependency; vendored contract still 1.6.0 with no provenance.ts; premise-refresh rider already recorded this run |
| rm-249 | 72.0 | decision-gated, standing DEFERRED (push-notification receive path product decision) |
| rm-117 | 70.0 | remote-mutation class (secret_scanning validity_checks enablement via API) — ship-stage rider material, not implement-batch content, per the 23edabab precedent |
| rm-116 | 58.0 | remote-mutation class (branch-protection fill via gh api PUT, preserve-body rules in its riders) — ship-stage rider material, first post-landing action per repeated cycle notes |
| rm-108 | 60.0 | registry straggler family — below this cycle's deadline bar; rm-271's rider already carries the fresh readings |
| rm-196 | 56.0 | in-progress: in-range refresh set executed as landed riders; no new batch content |
| rm-689 | 34.0 | deliberately not built — three-way fleet collision on the dep-sweep surface (23edabab compound note); Monday base-drift red is expected noise pending its lane |
| rm-782 | 76.0 | **SELECTED** — only deadline-bound item (Monday 06:53Z), small executable scope, no deps |
| rm-783 | 44.0 | **SELECTED** — coherent gate-truthfulness companion, small scope, closes the assess-flagged lint gap |

## Handoff contract for implement

- Surfaces: `.github/workflows/cve-tripwire.yaml` (executable class — belongs in
  the changed_surfaces attestation), new/edited tests under `test/` (singular,
  NON-executable in the engine classifier), `eslint.config.ts` + `package.json`
  lint wiring + `web/**` normalizations (NON-executable classes: root config .ts
  is outside the executable prefixes; web/src and test/ are documented
  non-executable). Derive the attestation with the dispatch release engine's own
  changed_surfaces(), never by intuition; an all-non-executable delta still
  requires emitting the field (a list), it just may legitimately be empty per
  KTD13's engine-delta cross-check.
- Acceptance per item is pinned in the ROADMAP def blocks (rm-782 / rm-783);
  the deadline clause in rm-782's trade-off governs sequencing — cure lands
  before Monday 2026-10-12 06:53Z or the red fires once first.
- Guard interlocks stay pinned: census 239/0/rm-783, live.max pin 783, newest
  census comment = the 2026-10-09 cycle-3 extension comment.
