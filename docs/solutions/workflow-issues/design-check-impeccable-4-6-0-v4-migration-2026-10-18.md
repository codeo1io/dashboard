---
module: ci-design-check
tags: [impeccable, design-check, v4-migration, flat-type-hierarchy]
problem_type: toolchain-migration
---

# Design Check on impeccable 4.6.0: v4 migration, role sizes, and the ephemeral-PR parity red (2026-10-18)

## Problem

Three intertwined traps when moving the CI Design Check from `impeccable@3.2.1` to 4.6.0:

1. **Behavioral**: v4 actually honors `.impeccable/config.json` `ignoreValues` (v3-era bug
   documented at
   `design-check-impeccable-3-2-1-flat-type-hierarchy-warning-2026-08-24.md`) — but it
   also FINDS things v3 silently missed. On this repo, `impeccable@4.6.0 detect --json
   web/src web/privacy.html` returned one `flat-type-hierarchy` finding for
   `web/privacy.html`: body/h1/h2 all computed 16px, largest adjacent step 1.00:1 vs the
   1.25:1 target (`rc=2`), while 3.2.1 returned `[]` (`rc=0`).
2. **Static pages can't use Tailwind utilities**: the detector cannot read Tailwind
   classes; static pages (like `web/privacy.html`) must declare role sizes explicitly in a
   scoped `<style>` block. Prefer a real type step over a scoped ignore.
3. **Adjacent-tool red herring**: on the same batch, the ephemeral-PR full validation
   redded `should-release`'s workflow-paths parity guard — NOT because of the migration,
   but because the ephemeral base predates the release-paths corpus and the validator
   injects a `paths:` entry the old corpus cannot account for.

## Cure (what landed in run b9c4278c cycle:2)

- Pin `npx --yes impeccable@4.6.0` exact (no caret), update the AGENTS.md guidance line in
  the same change.
- `web/privacy.html`: scoped style block with declared role sizes (body 16px → h2 20px →
  h1 36px steps at ≥1.25x) — a real hierarchy, no ignore.
- Verify `ignoreValues` under v4 with a deliberate brand token; run the
  `.opencode/impeccable` plugin suite under 4.x (31 tests).
- Acceptance probe: `npx --yes impeccable@4.6.0 detect --json web/src web/privacy.html`
  must return `[]` with `rc=0`.
- For the parity red: absorb the corpus slice byte-identical to main (workflow paths entry
  + `scripts/release-paths.ts` corpus + the referenced script) — NEVER loosen the guard.
  If the base is simply older than main, the red is an injection artifact; re-validate.

## Prevention rules

- Bump the impeccable pin in BOTH places together (workflow + AGENTS.md), and re-probe
  with the new major's `detect` BEFORE landing — v4-class majors find new rules on
  existing DOM.
- Read the rule's changelog before the bump; expect `flat-type-hierarchy` on any static
  page whose headings match body size.
- Never treat an ephemeral-PR parity red as candidate drift until you've compared the
  ephemeral base against main's current corpus.
