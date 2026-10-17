---
module: dashboard
tags: [`maintenance-cycle`, `supply-chain`, `dependency-automation`, `lint`, `roadmap`]
problem_type: workflow-issue
---

# Maintenance cycle learnings — registry time-map drift, preset-lag rule adoption (2026-10-06)

Context: conductor run `14a81ea6cc834e9483d41ed5c88fb4e5`
(repository-maintenance cycle:1), base `fe928ca` == origin/main at assess,
batch "currency & posture — no runtime-code changes" (B1–B6: ledger layer;
rm-682 erasable-syntax-only 0.7.2 + explicit export-aliases; gateway pin
v0.117.5; in-range currency hono/fast-check; audit.yaml comment truth; this
batch's doc). All outcomes below are PRE-REVIEW, recorded verbatim from the
cycle's phase artifacts (assessment → research → roadmap → prioritization →
stewardship → implementation → targeted tests → full validation). This doc
was written at compound with no tests executed; review and shipping outcomes
are carried by the next cycle's assessment.

## The decisive learnings

#### L1 — an eligibility read is perishable: the registry time map itself moved inside one day

The research phase read vite 8.3.3's publish time as 2026-10-03T16:59Z
("age-eligible now" under `minimumReleaseAge: 1440`). At implement — the
same day, hours later — `corepack pnpm install` hard-aborted with
`ERR_PNPM_NO_MATURE_MATCHING_VERSION` citing `vite@8.3.3 was published at
2026-10-06T04:10:19.326Z`: the version had effectively been republished and
the registry's `time` map moved INSIDE the age window. This is a different
failure mode than the 2026-09-25 age-gate doc's silent fallback: a MANIFEST
PIN to an underage version aborts the install outright rather than quietly
resolving an older one.

Prevention (now standing):

- Eligibility timestamps are point-in-time reads. Re-read
  `npm view <pkg>@<version> time` at INSTALL time when the pin matters; a
  research-phase "eligible now" claim can age badly enough to abort a batch
  mid-implement.
- On `ERR_PNPM_NO_MATURE_MATCHING_VERSION`: DEFER, never bypass — no
  `minimumReleaseAgeExclude` entry absent an advisory that forces the
  version (none did; vite stays 8.3.2 this cycle). The abort is the gate
  working as designed.
- Verify the aborted install wrote nothing: the lockfile was byte-stable
  through the failure, so no half-written state rides the tree.
- Record the new unlock timestamps as the next batch's openers — vite 8.3.3
  eligible 2026-10-07T04:10Z, eslint 10.12.0 eligible 2026-10-07T05:56Z
  (the latter closes the fork's only remaining upstream manifest gap).
  Extends
  `supply-chain-release-age-gate-time-gates-fresh-versions-2026-09-25.md`:
  that doc's mode is the silent fallback; this one adds the hard abort plus
  the perishable-read hazard.

#### L2 — pnpm-11 `pnpm update` floor-raises the manifest specifier, not just the lockfile

A planned lockfile-only refresh (`corepack pnpm update hono`) also rewrote
`package.json` (`^4.13.11` → `^4.13.13`) — pnpm-11's default save behavior.
Not a defect: a same-major floor-raise is exactly the class rm-196's
amended acceptance sanctions (2026-09-25 precedent `^4.7.11` → `^4.13.8`),
and the manifest stays honest about what the lockfile resolves. Expect
manifest+lock diffs from "lockfile-only" refreshes; verify the specifier
move is same-major before keeping it.

#### L3 — preset lag: upgrading a plugin does not enable its new rules

@bfra.me/eslint-config 0.54.0's `erasableSyntaxOnly` preset predates
eslint-plugin-erasable-syntax-only's 0.6.0 `export-aliases` rule: on plugin
0.7.2 the preset enables FOUR rules (namespaces / enums / import-aliases /
parameter-properties) and the fifth stays off. Proving rule state via
`pnpm exec eslint --print-config src/server.ts` caught this before it could
be assumed; the rule was then enabled explicitly with a documenting comment
(rm-682's WHICH-documented acceptance clause). General rule: after a
lint-plugin bump, print-config the resolved ruleset — "plugin upgraded"
never implies "new rules enforced".

#### L4 — attempt-reap forensics: adopt verified artifacts, don't redo

Seven transport-dead attempts across five phases of this run (stewardship
`b38d841a` 23s; implement `57946de5` session-not-found + `b193d405` 26s;
targeted `dd01618a`; full `70152023`; compound `dc3a1c15` + `d25daeb4`),
plus one gate rejection (`6f46f51b` — the KTD13 missing
`validation_evidence.changed_surfaces` attestation, a gate reject, not
transport). The first implement attempt (`5beb25cd`) had COMPLETED with its
typed artifact on disk while later attempts were reaped around it; its work
was adopted after first-hand verification (identity, tree census, gates)
instead of reimplemented. Durable rule for every run on this repo: before
redoing a phase, search the spool events directory for the run id, read
every attempt's log + typed artifact, and verify identity/tree/gates
first-hand — adoption beats redo when the artifact holds. The batch doc now
carries the full fold lineage so review can trace which attempt produced
which evidence.

## Prevention summary

- Age-gate eligibility: re-read at install time; defer on abort; never
  bypass without an advisory; verify the tree is untouched; hand the next
  batch the unlock timestamps.
- `pnpm update`: expect same-major manifest floor-raises; verify before
  keeping.
- Plugin bumps: print-config the resolved ruleset; enable new rules
  explicitly when acceptance demands it.
- Reaped phases: forensics before redo; adoption after verification; fold
  lineage recorded in the batch doc.

Cross-links: rm-682 (rule adoption), rm-196 (currency + deferral),
`maintenance-cycle-learnings-2026-10-05-install-wall-closure.md` (prior
cycle), `roadmap-append-markdown-label-ref-lint-2026-09-25.md` (the
bracket-token hygiene applied while writing this doc).
