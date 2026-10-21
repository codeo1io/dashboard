---
title: Rule-bearing dependency bumps can redden the visual axe gate on unchanged DOM — pre-read the rule changelog, trim with evidence, mint the remediation
date: 2026-10-18
last_updated: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - A dependency-currency batch includes a tool whose job is asserting rules over markup (axe-core, htmlhint, stylelint, markdownlint majors)
  - The bumped major/minor ships NEW or TIGHTENED rules, not just bugfixes
  - The repo's DOM already contains markup that the new rules reject, and a gate (visual axe assertions) turns red on trees whose rendered source did not change
symptoms:
  - "Ephemeral CI fails the visual job with critical/serious axe violations while the pixel snapshot is byte-clean"
  - "Findings name nodes that exist on main (role=button run-cards, header anchors, error-panel regions) — i.e. the DOM predates the bump"
  - "The same tree is green at the previous version of the rule-bearing dependency"
solution: |
  Pre-read the rule changelog before adding the bump to the batch. During the 2026-10-18
  cycle, the @axe-core/playwright 4.13.0 -> 4.14.0 leg of a dependency-currency batch
  failed ephemeral run 39083519040 with label-content-name-mismatch on 51 nodes
  (header anchor with href slash; run-card role=button accessible names omitting visible
  text), nested-interactive on the qa-lhs testid wrapper, and aria-required-children on
  the fixed-error-panel region — all green at 4.13.0 on main (control: main push run
  39082884999 success). The cure that day:

  1. TRIM the leg, do not pin-ignore: revert to the prior version in the SAME candidate
     so the rest of the batch can land; never add axe-disable suppressions to force the
     bump through.
  2. RECORD the findings verbatim on the ledger (rider on the sweep def + the batch def)
     so the trim is auditable and cannot be mistaken for an oversight later.
  3. MINT a remediation def for the underlying DOM issues (run-card accessible names,
     nested-interactive wrapper, panel required children) whose acceptance = the bump
     re-rides the SAME landing once the findings read zero — the trim retires only when
     the DOM is fixed, not when the noise dies down.

  Diagnosis shortcut for "did MY batch cause this red, or is it inherited debt": compare
  the failure CLASS against main's current green state. Pixel-mismatch failures on an
  aged base are inherited snapshot debt; rule-violation failures naming unchanged DOM
  are caused by the rule-bearing bump. When both are live at once, advance the base to a
  green main first so only one failure class remains (see the base-drift substrate
  rebuild solution doc from the same cycle).
verification: |
  - The trimmed candidate's ephemeral validation reads success with the visual job
    green at the pre-bump version (2026-10-18: validator PR #913 on head
    conductor/ci-15ad0862109c — runs 39084268885 Main / 39084268895 visual /
    39084268880 Dependency Review all success; Fro Bot 39084268898 skipped).
  - The remediation def's acceptance runs the bump again and asserts zero findings for
    each named rule before the pin moves forward.
related:
  - docs/solutions/workflow-issues/base-drift-empty-live-digest-extraction-guard-2026-09-24.md
  - ROADMAP.md — the axe-4.14 gate remediation def minted from the 39083519040 findings
tags:
  - axe-core
  - accessibility
  - dependency-bumps
  - visual-gate
  - ephemeral-ci
---
