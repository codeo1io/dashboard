---
title: Security flags parsed at trust boundaries must fail CLOSED on unexpected types
date: 2026-09-24
last_updated: 2026-09-24
category: security-issues
module: dashboard
problem_type: security_issue
component: service_object
severity: medium
applies_when:
  - A YAML/JSON-loaded config carries a boolean security flag (private, redacted, disabled) read from an external source branch
  - The gate is a strict identity comparison (`value === true`) where anything else takes the PERMISSIVE branch
  - The loader's type validation happens elsewhere (or only for other fields), so a string `"true"` reaches the gate unvalidated
symptoms:
  - "a repo listed as `private: \"true\"` in metadata/repos.yaml is treated as PUBLIC — queried, aggregated, rendered"
  - "the redaction denylist silently omits entries whose flag arrived in a coerced type"
cause: |
  `src/github/metadata.ts` gated privacy with `private === true`: absent/false → public is the intended allow-list, but a coerced value (string `'true'`, number `1`, `null`-vs-absent nuance, YAML quirk output) also fails the strict test and lands in the PERMISSIVE branch — the opposite of what a privacy flag must do on surprise input.
resolution: |
  Fixed in the cycle:1 batch (rm-184, 2026-09-24): the gate now classifies an entry private unless the value is strictly `false` or absent (fail-closed). Coerced/typo'd values are counted (`privateCoercedCount`) and surfaced via `logger.warning`, so surprises are visible instead of silently permissive. Five regression fixtures pin the matrix: `'true'`, `1`, `null`, `'false'` (still private — only strict false allows), and absent.
prevention:
  - "Security flags default to the RESTRICTIVE branch on any input you did not explicitly validate; allow-list the permissive case (`=== false` / absent), never the restrictive one."
  - "Count and log every value that reached the gate in an unexpected type — silent coercion is how the bypass stays invisible."
  - "Boundary type validation and semantic gating must agree: if the loader only validates some fields, the gate itself must still be safe for the rest."
related_components:
  - src/github/metadata.ts
  - src/github/aggregator.ts (denylist consumer)
tags: [security, redaction, fail-closed, type-coercion, metadata]
---

> Merge note (integrate e21577caef65, 2026-09-24): item id renumbered rm-179 → rm-184 at landing — the landed cycle-12 meanings own rm-177..rm-180.
