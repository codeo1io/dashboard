# Cycle-2 batch priorities — repository maintenance (run 438dea88117e494ea33a49974e9dc847)

Selection pass 2026-10-09, at dispatch base 7055c52 (origin/main advanced mid-run to
546c93c via PR #447; integrate obligation disclosed in this run's roadmap extension
comment). Inputs: this run's assess (7c8d48af), research (69e2397f), roadmap extension
(e8458d5b); prior cycle-2 ledger `2026-10-08-repository-maintenance-cycle-2.md` (run
c026a644, landed via PR #444 2026-10-08T20:29Z).

## Batch: `main-gate hardening and security-signal recovery`

Two selected defs, both unclaimed by any in-flight lane (sibling sweep: no rm-116 or
rm-792 selection marker in any of the 40 sibling run worktrees or open PR #448's diff),
plus one rider-level completion member.

| Unit | Def | Impact | Effort | Risk |
|------|-----|--------|--------|------|
| 1 (headliner) | rm-116 branch-protection fill (priority 58.0) | High — closes the standing structural gap where main merges are unguarded; eight consecutive live shell probes, latest 2026-10-09 | S — one documented full-body PUT | Low — proven context set greens end-to-end on ephemeral PRs (#400 11/11, #387/#388); documented hotfix override path preserved |
| 2 | rm-792 scorecard alert triage sweep (priority 34) | Medium — restores Security-tab signal (6 open scorecard alerts, oldest since 2026-09-16; duplicate-noise cure is a different lane's) | S-M — per-alert root-cause or dismiss with reason strings + docs ledger | Low — reversible (alerts reopenable); acceptance forbids blanket clears |
| 3 (rider-level member) | rm-708 acceptance tail (implemented 2026-10-08) | Medium — closes the cycle's own headliner loop | S — remote verification only | None — read-only: verify ≥2 consecutive green release runs past 'Promote latest image tag' with 'Dispatch infra deploy' firing (6 consecutive green release runs on 2026-10-08 are the candidates), then flip to completed with evidence |

### Why this batch (rationale)

- **Coherent theme**: all three members harden the landing gate and recover trust
  signals around it — protect main's merge gate (rm-116), restore the Security tab's
  signal-to-noise (rm-792), and prove the release-cure loop end-to-end (rm-708 tail).
- **Every code-shaped surface worth taking is twin-owned**: the cve-tripwire NODE_IMAGE
  fix (rm-755, 4 parallel lineages), the trivy SARIF duplicate cure (89ebbf49 rm-761),
  the dependency majors batch (df0dd46d rm-787 et al.), and the gateway contract 1.8.0
  absorb (PR #448's lane, per rm-157's window). Selecting any of them would collide
  with in-flight siblings; the fleet frontier discipline records ownership rather than
  duplicating work.
- **Explicit invitation**: the prior cycle-2 ledger names rm-116's fill as the
  low-risk next-cycle candidate now that Main/CodeQL green on ephemeral PRs is proven.
- **End-to-end in one cycle**: both selected defs are API-ledger work with a docs
  ledger diff (no executable surface — the changed_surfaces attestation for the fold
  will be empty per the .md classifier boundary); rm-708's tail is remote verification.

### What this run will NOT do (pass-overs, with reasons)

- rm-659 (open, security, priority 36) — run-history deletion / audit-trail integrity:
  investigation-heavy, acceptance line still empty, first result JSON went unread;
  needs its own focused lane, not a rider in a batch.
- rm-675 (open, operator-experience, priority 20) — renderer obligations land in the
  EXTERNAL managed sync emitter first; the in-repo half (census guard) is already
  covered by the landed roadmap-integrity-guard.
- rm-162 (priority 60), rm-216 (priority 51), rm-501 (priority 44) — September
  decision-gated items; rm-162's def says "requires a decision", rm-216's twin (rm-156)
  already landed, rm-501 was already passed on cycle-20 batch-budget grounds.
- rm-674 (priority 40) — complements the rm-670 Monday-latency lineage held by another
  lane; adjacent to in-flight work.
- rm-139 Node 26 LTS go/no-go — decision gate is 2026-10-28 (promotion week), after
  this cycle; revisit next cycle.

## Next-cycle candidates (recorded for the following run)

- rm-694-class upstream port: upstream PR #570 MERGED 2026-10-07 — the optimistic
  launch-card hardening port is now unblocked; absent from this tree's ledger, so it
  needs a fresh mint (or absorb) next cycle, re-probing upstream's landed form.
- rm-659 audit-trail integrity: schedule the focused investigation lane (above).
- Gateway contract 1.8.0 absorb: PR #448's lane owns the window; if it lands, the
  display half and provenance README fix follow; if it stalls, re-derive ownership
  against the deployed gateway floor (v0.114.1 = contract 1.6.0, verified 2026-10-09).
