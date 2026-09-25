---
title: A property assertion must mirror the implementation's anchoring contract — not.toContain is structurally too strong for boundary-anchored redaction, and a generator's min-length silently blinds whole token classes
date: 2026-09-25
category: best-practices
module: dashboard
problem_type: best_practice
tags: [testing, property-based, fast-check, redaction, security, generators, boundary]
component: aggregator
severity: high
applies_when:
  - a property suite asserts that scrubbed/redacted output no longer contains an input token
  - the scrubber under test is boundary-anchored (lookarounds, word-adjacency rules) rather than global replace
  - generators use minimum-length constraints that exclude legal short inputs
---

## Problem

`redactRepoIdentityFromText` redacts GitHub owner/repo tokens from log text.
Two independent defects hid behind each other:

1. **Generator blindness**: `nameArb` was `/^\w[\w.-]{1,30}$/` — minimum length 2.
   GitHub-legal **single-character** owner/repo names could never be generated,
   so the class of 1-char identities was structurally untestable. The
   implementation's `.filter(token => token.length > 1)` leaked exactly that
   class, and no property or unit test could ever notice.

2. **Assertion over-strength**: after the fix (boundary-anchored scrubbing of
   1+-char tokens), the existing property assertion `expect(out).not.toContain(token)`
   began to fail — not because identity survived, but because a 1-char token like
   `e` or a 3-char token like `one` is *lexically embedded* in unrelated scaffold
   words (`alone`, `brave`). Lexical embedding is not identity survival: the
   scrubber's contract is "no **standalone** occurrence survives", and the
   assertion had to say exactly that or it would keep failing on honest output
   (or, kept pre-widening, keep passing on dishonest output).

## Resolution

- Widen the generator to the true input domain: `{1,30}` → `{0,30}` in the
  character class quantifier, so every legal length reaches the property.
- Rebuild the assertion as the **mirror of the anchoring contract**, using the
  same escape/boundary seam the implementation exports:

```ts
const standalone = new RegExp(
  String.raw`(?<![\w.-])${escapeRegExp(token)}(?![\w.-])`,
)
expect(standalone.test(stripped), `standalone '${token}' survived`).toBe(false)
```

- Add an explicit unit suite at the domain boundary the property previously
  could not reach: standalone 1-char owner, 1-char name, full `owner/name` pair
  redacted; unrelated words containing those letters (`cat`, `bravo`) intact;
  dotted/dashed names (`a.txt`, `b-c`) untouched by anchoring.

## Why the property alone could not catch the original leak

A property can only falsify within its generator's domain. Any minimum-length
(or character-set, or format) constraint in an arb is an implicit spec of the
implementation under test. When auditing a scrubber/validator: first audit the
**arbitraries** against the real-world input domain (GitHub's actual name rules
here), then the assertions.

## Prevention

- Every anchoring implementation should export its escape/anchor seam (here
  `escapeRegExp`) so tests assert with the same notion of a boundary rather
  than a hand-rolled approximation that drifts.
- `not.toContain` is only correct for global-replace semantics. The moment the
  scrubber gains lookarounds or adjacency rules, the property must restate the
  same rule — otherwise the suite enforces a *stronger* contract than the code
  promises and fails on compliant output, teaching contributors to weaken the
  tests instead of reading them.
- When a property fails after a security fix, distinguish "identity survived"
  from "substring coincidence" before touching either side.
