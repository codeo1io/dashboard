# Dashboard maintenance — repository-maintenance cycle 3 batch (2026-09-30, run f89673c5be194e39820b7ea9a2f0ea1b)

module: dashboard
tags: `[security, dependencies, ci, docs, maintenance]`
problem_type: batch-record

Base: HEAD `31995a2` (origin/main == HEAD re-verified by fresh fetch in this
run's roadmap phase). Worktree carries this run's uncommitted roadmap extension
(roadmap attempt `b80d4a43`: items rm-284..rm-288 + 7 dated riders, 46
insertions, `cycle-3 extension #7` comment directly before `## Completed
items`). Campaign: `repository-maintenance:de2fd434afc94b0294258d6a46d29739:cycle:3`.
Host clock at selection: 2026-09-30 21:2x-21:3xZ.

## Selection method

Universe: every open roadmap candidate at this frame (159 id defs in-file; the
~30 `status: candidate` items plus this run's assess F1-F4 / research R1-R7
findings), scored on impact (user-visible failure / invariant breach), risk
(blast radius x reversibility), effort, hard dependencies (gateway deployment,
live settings, upstream releases, product decisions), and strategic value
(unblocks other items). Standing rule from prior cycles: the batch must be
completable end-to-end **locally** this cycle — no live-gateway, no CI-admin,
no registry-maturity wait, no pending product decision.

Selection premises re-probed live in THIS worktree at 2026-09-30T21:2x-3xZ:
`awk length>4500 ROADMAP.md` — non-comment cliff lines L177 (7317ch, rm-103
signals), L412 (7967ch, rm-157 signals), L225 (4911ch, rm-139 signals), L417
(4533ch, residue signals); L112-L122 are `<!-- INTEGRATE-MERGE -->` comments
(exempt from the length guard). Floors at `pnpm-workspace.yaml:24-33` all sit
below the patched lines (brace-expansion >=2.1.2/>=5.0.7, fast-uri >=3.1.5,
undici >=7.29.0). `minimumReleaseAge: 1440` ACTIVE (`pnpm-workspace.yaml:13`).
`package.json:22/:28` specifiers `^2.1.1`/`^4.13.9` already admit the security
pair. Label-refs bracket list confirmed at
`docs/prioritization/2026-09-29-cycle-19-batch.md:4`; 11 trailing-space lines
confirmed in `docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md`.

Prior-phase evidence used, not re-derived: assess F2/F3 (floors below patched
lines; hono pair in-range and audit-invisible); research R1/R2/R4/R7 (audit =
19 advisories 3L/8M/8H, every patched line in-major; OSV target-set probe
zero; dependabot run 36745179690 security job FAILED 2026-09-30T16:34:21Z with
direct-only allow-list); fleet probes: main push run #353 (31995a2) Lint
cancelled at exactly 35m19s while the PR #305/#306/#307 cure trees validated
green (Lint ~1m08s, whole 9-check wall 2m23s).

Convergence signal (strongest in this selection): FIVE sibling lanes have
independently reached the floors content — this run rm-284; 7ce48fe5 B2
(their rm-285); a923284c rm-282; d997d9a88aad rm-276; 849737832a52 rm-298 —
and TWO the lint unblock (7ce48fe5 B1, their rm-284; the PR #305/#306/#307
cure trees). Id spaces are hot across lanes: reconcile by content at
integrate, never by bare id.

## Selected: security-floor truth batch

Theme: the audit surface lies (19 advisories reachable to zero with in-major
floors, 2 open high dependabot alerts), the hono security pair is invisible to
every scanner (audit-invisible forever), the Lint cliff blocks every landing
(main itself red-lines at 35m19s), and the dependabot security job fails on
main. One batch, three truth repairs plus its own unblock, zero product
decisions, single mechanical surface (markdown + manifest/lockfile).

### B1 — markdown lint-cliff unblock (batch lead; effort S)

Hard dependency of this cycle's own validation gate — every ephemeral
validation PR from this base carries ROADMAP.md's monolith lines; without this
split the cycle's Lint check times out on pre-existing debt, not on batch
content (main #353 cancelled at 35m19s; cure trees lint green ~1-2m).

- Scope (measured this worktree): split the four non-comment lines — L177
  (7317ch), L412 (7967ch), L225 (4911ch), L417 (4533ch) — into blank-line +
  2-space-indented fragment paragraphs (same list item, ~2.4K fragments, split
  only at single spaces, content byte-exact on rejoin). REUSE, do not rewrite:
  `split_cliff_paragraphs.py` from the a82a198aa5484f0eba0a42b3e58ef495
  scratch (re-ran clean in the 3f654118 scratch; measured-safe fragment limit
  5222).
- Docs riders: backtick-wrap the whole bracket list at
  `docs/prioritization/2026-09-29-cycle-19-batch.md:4`
  (markdown/no-missing-label-refs); `eslint --fix` the 11 trailing-space lines
  in `docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md` (whitespace-only).
- Guard: new test pinning that no non-comment ROADMAP.md line exceeds 4_000
  chars (house precedent: 7ce48fe5's rm-284 acceptance; comment lines exempt —
  the L112-L122 INTEGRATE-MERGE monoliths stay).
- Acceptance: targeted `eslint ROADMAP.md` + the two docs rc=0 in
  seconds-to-minutes; guard green; ephemeral-PR Lint green.
- No local id minted for this content — converges by content with 7ce48fe5's
  rm-284; cite theirs at integrate.

### B2 — rm-284 + rm-285: override floors to audit-zero, carrying the audit-invisible serveStatic security pair on the same re-resolve (HEADLINER; effort S-M)

- Scope: `pnpm-workspace.yaml:24-33` floors raised to `brace-expansion@2
  '>=2.1.7 <3.0.0'`, `brace-expansion@5 '>=5.0.12 <6.0.0'`, `fast-uri@3
  '>=3.1.8 <4.0.0'`, `undici@7 '>=7.29.1 <8.0.0'`; ONE `pnpm install`
  re-resolve whose lockfile also carries `@hono/node-server` 2.1.1->2.1.3 and
  `hono` 4.13.9->4.13.11 (rm-285 — specifiers already admit; package.json
  untouched); drop the now-stale `minimumReleaseAgeExclude` `hono@4.13.9` row
  (inert after the bump; the `vite@8.3.1` row stays).
- Gate (live, at implement, on the resolved tree): `pnpm audit --recursive`
  == 0. Advisory metadata drifts bidirectionally (corrected twice on
  2026-09-30 alone): any advisory NEW at implement gets a per-advisory OSV
  `/v1/vulns/<id>` read before its floor moves; never bulk querybatch (exact
  patched versions false-flag there).
- Maturity honored by publish-time evidence: fast-uri 3.1.8 published
  2026-09-15T07:36Z; undici 7.30.0 2026-09-25T07:15Z; hono 4.13.11
  2026-09-29T06:15Z; @hono/node-server 2.1.3 2026-09-29T06:10Z — all >24h
  past `minimumReleaseAge: 1440` at selection; brace-expansion targets are
  long-published patch lines and the resolver enforces the age gate
  mechanically at re-resolve.
- Deliberately excluded from B2: hono 4.13.12 (routine, not security;
  published 2026-09-30T09:43Z) — post-maturity rider only after
  2026-10-01T09:43Z per rm-285's own acceptance; jsdom 29->30 + undici@8
  durable-major successor — not required for zero, watch item feeding rm-271.
- Acceptance: live `pnpm audit -r` == 0; lockfile rows read brace-expansion
  2.1.7/5.0.12, fast-uri 3.1.8, undici 7.30.0, @hono/node-server 2.1.3, hono
  4.13.11; `git diff` shows package.json untouched; full suites green on the
  refreshed tree.
- Evidence expectation: audit before/after JSON in cycle artifacts; lockfile
  row greps; convergence disposition (rm-284 here == 7ce48fe5 rm-285-B2 ==
  a923284c rm-282 == d997d9a88aad rm-276 == 849737832a52 rm-298; rm-285 here
  == a666f8c0 B2).

### B3 — rm-287: Dependabot security-updater failure disposition = cure (a) (effort XS)

- Decision: cure (a) — B2's floors erase both open fast-uri high alerts, so
  the failing security updater (run 36745179690: command=security,
  `dependencies=[fast-uri]`, direct-only allow-list, security-updates-only) has
  nothing left to fail on. Recorded here as the chosen cure with rationale.
- Fallback pre-scoped, NOT taken: cure (b) widen `.github/dependabot.yml`
  security allow-list to `dependency-type: all` — only if post-landing
  evidence shows the next dynamic run still failing.
- Post-landing obligations: next dynamic Dependabot run concludes success (or
  no longer exists); `gh api /repos/codeo1io/dashboard/dependabot/alerts`
  reads empty; both fast-uri alerts closed.

### B0 — batch baseline (house convention)

- At base BEFORE B1: `pnpm build:web` (web/dist must exist), `pnpm
  check-types`, targeted suites (the new roadmap length guard once written).
  B2 probes live `pnpm audit -r` before and after the re-resolve (reads
  manifest+lock, needs NO install). Full `pnpm test` after B2. Targeted
  `npx eslint <changed files>` per turn; never the final gate before the
  phase-result JSON.
- File-surface ownership: `ROADMAP.md`, `docs/prioritization/**`, the pr-233
  archive doc (whitespace only), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, the
  new roadmap-length guard test — no `web/src`, no server routes, no parser
  files.
- Implement hazards (fleet-learned): write helper scripts via the write tool
  into scratch and run `python3 <file>` — never /tmp heredocs; never start a
  YAML comment line with the bare lowercase word `eslint` (inline-config
  parser claims it); build presence-anchors from landed bytes (`grep -cF`),
  not from memory; scope whole-file lint invariants to lines the phase
  added/rewrote vs `git show HEAD:file` (base files carry pre-existing debt
  that is not this batch's to fix).

## Deliberately excluded (rationale recorded)

| Candidate | Why not this cycle |
|---|---|
| rm-286 session-expiry 401 (52.0) | NAMED NEXT-CYCLE LEAD: a second code subsystem (server auth middleware in both branches + web affordance tests + retiring the `[401,302,303]` test disjunctions) breaks this batch's single-surface coherence and needs its own auth-sensitive review; convergent deferral with 7ce48fe5's identical content |
| rm-252 upstream absorb (80.0) | Dedicated absorb cycle (agent v0.115.1->v0.117.0 + pnpm 11.28.0 + eslint-config 0.54.0 riders + write-capability exclusion review); window re-measured unmoved at f4a1aeb |
| rm-271 majors (pnpm 12 / vitest 5 / jsdom 30) | Own acceptance demands one deliberate evaluation per major, no bundled mega-PR; pnpm-12 risks now concrete (v12 fails on unrecognized workspace keys; --frozen-lockfile false removed) |
| rm-288 logout teardown (20.0) | Low priority; web subsystem; future operator-experience cycle |
| rm-274 pwa narrative residue (30.0) | Decision-gated (remove vs pin as rm-249 forward-wiring) — a product decision, not implementable truth |
| rm-187 links-parse guard | Small correctness fix but listener-store subsystem; next-cycle candidate |
| rm-116 branch-protection fill | Sequenced behind the un-landed lint-decomposition work (a923284c rm-279); live-settings stewardship, not an implement unit |
| rm-149 PKCE (66.0), rm-249 (72.0), rm-162 (60.0), rm-163 (54.0), rm-216 (51.0), rm-220 (50.0) | Auth / push / product / performance subsystems — each its own coherent batch; below the security pair on value-per-effort this cycle |

## Watchlist

- Advisory drift is bidirectional and was corrected twice today — the
  `audit == 0` gate is re-probed LIVE at implement; drift is a re-probe
  trigger, never a blind floor move. GHSA-jvvf-x445-j334 has flip-flopped
  across 3.x/4.x branches: per-advisory OSV reads only.
- Sibling pre-landing: >=4 sibling trees claim the floors content and >=2 the
  lint cure — re-probe `origin/main` at implement dispatch; if a cure tree
  landed first, B1 shrinks to guard + label-refs fix and B2 to verification +
  convergence disposition (first-lander wins, reconcile by content).
- hono 4.13.12 matures 2026-10-01T09:43Z — optional routine rider at landing
  time only.
- rm-102's dependabot evidence gate closes ~2026-10-03 unmet (zero dependabot
  PRs ever): next cycle must record that failure; this batch's B3 is the
  truthful disposition of the same thread.

## Next-cycle context

- Reconcile-by-content map (id spaces hot; first-lander wins): floors = rm-284
  here == 7ce48fe5 rm-285(B2) == a923284c rm-282 == d997d9a88aad rm-276 ==
  849737832a52 rm-298; lint unblock = 7ce48fe5 rm-284 (no local id minted
  here — cite theirs); hono pair = rm-285 here == a666f8c0 B2, folded into
  7ce48fe5's B2 there; session-expiry 401 = rm-286 here == 7ce48fe5's
  identically-numbered deferral — the named next-cycle lead; dependabot
  disposition = rm-287 here (uniquely this lineage).
- Post-landing obligations: (1) B3 evidence — next dynamic Dependabot run
  succeeds and the alerts API reads empty; (2) status flips for rm-284 /
  rm-285 / rm-287 to `implemented <host-date> (... pending landing ...)` at
  compound per house convention, with the numbered compound provenance
  comment adjacent to extension #7; (3) the undici@8 + jsdom 30 durable-major
  successor stays a watch item feeding rm-271's per-major evaluations; (4)
  next cycle's lead candidate is rm-286 (server half of the landed rm-273
  contract).
