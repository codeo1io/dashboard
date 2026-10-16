---
module: dashboard
tags: [repository-maintenance, cycle-2, compound, rm-842, rm-843, rm-180]
problem_type: maintenance-compound
---

> **Truth annotation (2026-10-15, run 8aabd64de4e repository-maintenance cycle 2, rm-857):**
> deliverables this report lists below — `scripts/roadmap-census.ts`,
> `test/roadmap-integrity-guard.test.ts`, `.github/workflows/cve-tripwire.yaml`,
> `.github/workflows/lockfile-guard.yaml`, `docs/runbooks/release.md` — never
> reached main: the landing pipeline resolved modify-vs-delete as delete across
> three consecutive landings (0 hits across all 350 first-parent commits of
> origin/main). They are re-landed with constants re-derived in the same batch;
> `.github/workflows/base-drift.yaml` named below is superseded on main by
> `.github/workflows/upstream-drift.yaml`; the 2026-10-0x batch reports
> cross-referenced below are archival and remain unlanded (tracked with the
> tooling family at rm-857).

# Repository-maintenance cycle 2 — compound record (2026-10-10, run 08a0abac9453)

Pre-review compounding of the whole cycle: assess `0b1bd864` → research `a2cbb8e9` →
roadmap ext #37 (`a2555fa7`, mints rm-842/rm-843, census 249/0/rm-843, guard pin
780→843) → prioritize `51f05853` → stewardship `ec9be9d5` → implement `31a7ab3c` →
targeted_tests `cda2b2fc` → full_tests `03061b8d` (fleet pattern under the Actions
run-creation enforcement outage). Nothing was re-validated at compound; every outcome
below is consumed from the recorded typed results and logs.

Attempt-death ledger (provider-instability context, all first-hand from event logs):
implement `51480059` (32s, zero work) + `c1df55e7` (code complete, reaped before
result — work adopted as verified in-tree drift); targeted_tests `69f05d63` (no
PhaseResult delivered); full_tests `7ba07ea5` (3 lifecycle lines); compound `9f28a60c`
(zero output) + `ceb465d4` (provider 429 after 783.6s, no PhaseResult — its sole
durable residue, the implement patch left applied, was verified byte-exact by clean
reverse-apply + md5 and reused as this attempt's composing base). Six dead attempts,
two with adoptable residue — the forensics-then-adopt-or-redo pattern held throughout.

## Cycle outcome (compounded)

Batch `operator-contract 1.8.0 display completion + supply-chain hardening`,
implemented at base `88e423a` (== origin/main at cycle open):

- **U1 `rm-842`** (operator-experience / fork-lead) — the missing browser display
  half of operator contract 1.8.0: provenance/preparation parsing in
  `public/operator-stream.js` (+ closed-DTO declarations in
  `public/operator-stream.d.ts`: free-form strings sanitized of control/bidi chars
  and capped, lists bounded, SHAs 40-hex-validated), latest-valid-wins
  nextStreamState reduction with provenance/preparation exclusivity,
  textContent-only run-checkout-detail region in all three card shapes
  (`operator-run-index.js` renderRunCard + ensureRunCardAnatomy, `operator-launch.js`
  optimistic card) wired via `web/src/operator/runtime.ts` + `web/src/index.css`;
  24 checkout fixture scenarios in `src/gateway/operator-fixture-sse.ts` each bound
  to its own recent-runs row (`src/routes/operator-fixture-harness.ts`);
  `test/operator-contract-conformance.test.ts` pins the browser label maps against
  the vendored `src/gateway/operator-contract/provenance.ts` vocabularies (label
  maps ARE the allowlists) plus production-artifact no-leak guards.
- **U2 `rm-843`** (security) — applied live via one idempotent PUT:
  `allowed_actions: selected` with the seven-namespace pattern allowlist
  (actions/github/docker/pnpm/ossf/aquasecurity/fro-bot) +
  `sha_pinning_required: true`; readback byte-identical on re-PUT; zero repo-file
  footprint; outage-proof by construction.
- **`rm-180` rider-scope** (no def flip) — `readServerBindConfig` now parses
  `DASHBOARD_PORT` with the house whole-string digit grammar instead of bare
  `Number(rawPort)` (which accepted `'0x10'`/`'1e2'` spellings); fail-loud semantics
  preserved; pinned by new `server.test.ts` cases.

Validation chain (consumed, not re-run): targeted_tests `cda2b2fc` green on the
engine-derived surfaces (10 impacted server files / 1483 tests + web pair 2 files /
54 tests; check-types rc=0 across all three tsconfigs; digest bookends identical
across the round-trip == dispatch stamp `validation:v1:bf89434e…ed77c377037` at
pristine 88e423a); full_tests `03061b8d` closed via the supervisor-accepted fleet
pattern — two adopted fleet burns prove the verbatim GitHub-hosted gate unrunnable
under the outage (471d3910 rc=1 after the full 3600s with zero registered PR checks;
159ec0eb rc=1 at 2m27s on 'error connecting to api.github.com'), and the content
truth is the six-job local content-identical Main-workflow mirror over the applied
batch: lint rc=0 (10-warning baseline), design-check empty array, check-types rc=0,
test rc=0 (server 65 files / 2717 tests + web 34 files / 1216 tests), actionlint 0,
scripts-load 48/48; CI parity node v24.15.0 / pnpm 11.28.4; outage bracketed by 422
dispatch probes both sides. Statuses sit at `implemented 2026-10-10 … pending
landing` since the implement phase.

## Ledger deltas made at compound

- def-line changes: NONE (zero mints, zero flips — both flips already happened at
  implement; the completed/landed flips stay reserved to landing verification per
  house rule).
- validation-outcome riders appended to `rm-842` and `rm-843` (consumed evidence +
  standing obligations; the rm-843 readback probe joins the standing probe set).
- compound tail comment added after the prioritize-selection comment — takes the
  newest-claim slot by document order and restates the unchanged live truth
  `249 defs / 0 dups / max rm-843`; guard pin 843 and every test file untouched.
- pre-review validation appendix appended to the batch doc
  (`docs/prioritization/2026-10-10-repository-maintenance-cycle-2-batch-run-08a0abac9453.md`).

## Reusable lessons recorded this cycle

1. **Operator-contract display twins must land with the window bump** (NEW
   prevention rule):
   `docs/solutions/best-practices/operator-contract-browser-display-twin-parity-2026-10-10.md`
   — the 1.8.0 window + failure-kind labels landed on main without the display half
   (upstream `a82871d` plan R5-R8), so provenance/preparation frames were
   parsed-then-dropped silently for two days; a contract extension is one batch
   across all six surfaces (vendored vocabulary, public parser + closed DTO, three
   card shapes, label maps, conformance pin, fixture scenarios), and the conformance
   suite is the tripwire that makes a skipped surface red instead of silent.
2. **Settings-layer hardening is the right outage-window shape** (recipe note, no
   new doc): zero executable repo surface means the full-gate record and digest are
   unaffected and the change rides a live API PUT + readback — rm-843 was chosen
   partly for this property and it held exactly.
3. **Fleet-pattern full gate under run-creation enforcement** (corroboration, no new
   doc): adopted burns + six-job content-identical local mirror; the deep recipe and
   repo-scoped diagnosis are owned by sibling run a794d381b4f0's compound layer
   (unlanded at this writing) — this cycle's numbers corroborate, not duplicate.
4. **Dead-attempt residue is adoptable only through verification** (process note):
   two of this run's six dead attempts left real work (c1df55e7's in-tree drift,
   ceb465d4's applied patch); both were adopted only after byte-exact verification
   (md5 + clean reverse-apply + path-set identity), never by trust.

## Next-cycle candidates + preconditions (concrete, ordered)

1. **Landing verification of this batch** — first action: rm-842/rm-843 flips to
   landed, `.conductor` untrack check after merge (standing trap), and the
   deploy-gated live browser probe for the run-checkout-detail region (fixture
   harness covered acceptance pre-landing).
2. **rm-843 readback probe joins the standing probe set** — every assess re-reads
   `actions/permissions` + `selected-actions`; drift off the seven-namespace
   allowlist or `sha_pinning_required: false` is a regression finding.
3. **Post-recovery gate debt** — re-run the verbatim GitHub-hosted full gate once
   dispatch stops 422-ing (probe: newest run newer than 37872407109), then sweep
   stranded `conductor/ci-*` refs; both also unblock **rm-116** (protection fill
   needs live check conclusions to require).
4. **rm-779 cve-tripwire NODE_IMAGE** — first scheduled fire Monday 2026-10-12
   06:53Z is deterministic red until `NODE_IMAGE` matches the Dockerfile trixie
   family; multiple sibling lanes carry the same fix — reconcile, do not rebuild.
5. **rm-252 absorb decision due 2026-10-13** — live deltas at cycle close: pnpm
   11.28.5, agent v0.118.3, docs #578 (1.8.0 recipe); katex 0.19.0 converges
   rm-841; MUST exclude write-capability surfaces (rm-259's standing never-absorb).
6. **rm-760 sweep** — vite 8.3.4 + `@hono/node-server` 2.1.4 soak-eligible since
   2026-10-09; next routine-bump batch owns the lockfile churn.
7. **rm-139 Node-26 window** — decision gate 2026-10-28; open the validation window
   in the cycle that precedes it.
8. **1.9.0 question-bridge lane** — sibling 633717c2's readiness lane plus the
   sibling research spec rebase directly on this batch's `public/operator-stream.js`
   and `web/src/operator/runtime.ts`; the twin-parity rule (lesson 1) applies to
   question frames verbatim.
9. **NOT ours to re-take:** rm-846 (sibling duplicate of rm-843 — folds on
   contact), rm-844 (sibling katex lineage owns it), and any mint above rm-843
   without re-probing the all-lineage def-line ceiling (run-wall max rm-835 at
   cycle open; sibling live selections already claim through rm-849).

## Integrate obligations (fresh at compound, 2026-10-10)

- Ledger delta vs main: ext #37 comment + prioritize selection comment + compound
  tail comment + minted rm-842/rm-843 with their riders + guard pin 780→843.
  The union must keep the newest dated claim the first-parseable claim in its
  comment body (guard takes newest-date, last-in-document-order).
- Untracked riders of the landing: `web/src/operator/launch-card.test.ts`, the
  batch doc (with appendix), this cycle record, the twin-parity prevention-rule
  doc.
- Sibling contention to resolve at union: 633717c2's 1.9.0 lane touches the same
  public twins (additive by design — this batch landed provenance/preparation
  only, no window change); f72cb7ef's rm-844 katex lineage lands at its own
  integrate; rm-846 folds per the fold map; main may have advanced past 88e423a
  mid-run — integrate re-derives census + pin from the unioned tree.
- Post-merge: `git ls-files .conductor` must end empty (standing landing trap).
