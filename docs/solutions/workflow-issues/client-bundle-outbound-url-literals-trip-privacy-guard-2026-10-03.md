---
title: Client-bundle outbound URL literals trip the privacy build-output guard — derive URLs server-side
date: 2026-10-03
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: web_client
severity: medium
applies_when:
  - 'A web view renders a link to any third-party origin (advisory trackers, PRs, external references) and the URL is assembled from a template literal in client code'
  - 'A batch passes focused + targeted web suites green but the full CI Test job fails in web/src/privacy/build-output-no-tracking.test.ts'
  - 'Adding a new web view and deciding which suites the targeted validation must include'
tags:
  - privacy-guard
  - client-bundle
  - server-side-derivation
  - targeted-tests
  - false-confidence
  - rm-552
---

# Client-bundle outbound URL literals trip the privacy build-output guard

## Problem

The 2026-10-03 security-posture batch (run b72d9324, rm-549..rm-552) passed
focused web tests (35/35), targeted server tests (28 files / 1090 tests), and
check-types/lint — then the first full CI run failed ONLY in
`web/src/privacy/build-output-no-tracking.test.ts`: the new `Security.tsx`
view contained an `alertAdvisoryUrl()` builder that baked
`https://github.com/advisories/${ghsaId}` and
`https://nvd.nist.gov/vuln/detail/${cveId}` literals into the client bundle.
The guard asserts the built bundle contains no third-party origin beyond the
known two (w3.org + react.dev), and both hosts are new third-party origins.

The regression was invisible to every earlier gate for two stacked reasons:
the template literals only surface in the BUILT bundle (`web/dist/assets/*.js`
— a `pnpm build:web` artifact), and the targeted web leg had covered only the
suites the implement phase touched, so the privacy suite never ran until full
CI.

## Root cause

An outbound link URL was treated as a CLIENT concern (build it where you
render it). In this repo it is a WIRE concern: the BFF already owns every
external reference the SPA may follow — the landed `updatePrUrl` precedent
ships PR URLs as DTO fields — precisely so the client bundle can stay
origin-free by construction. A view-local URL builder silently re-imports the
origin into the bundle no matter what the DTO whitelists.

## Cure (rm-551/rm-552 riders, run b72d9324 full 89285c86)

- `src/routes/api.ts`: `SecurityAlertDto.advisoryUrl: string | null`, derived
  by `advisoryUrlFor(alert)` — GHSA → github.com/advisories/$, else CVE →
  nvd.nist.gov/vuln/detail/$, else null (same precedence the deleted builder
  had).
- `web/src/api/security.ts`: strict parser line for the new field (the
  contract ships atomically with the DTO).
- `web/src/views/Security.tsx`: builder deleted; the link reads
  `alert.advisoryUrl` off the wire.
- Tests at all three layers: wire fixture, view-factory derivation, and a
  derivation-precedence case (GHSA wins / NVD covers cve-only / null when
  unidentified).

Local proof before re-running full CI: `pnpm build:web`, then
`grep -oE 'https?://[a-zA-Z0-9.-]+' web/dist/assets/*.js | sort -u` — back to
exactly {http://www.w3.org, https://react.dev}. Full CI run 2: all 10 checks
green, privacy suite 11/11.

## Prevention rule

1. NEVER assemble an outbound URL in client code. Derive it server-side and
   ship it as a DTO field (follow `updatePrUrl` / `advisoryUrlFor`).
2. A batch that adds or edits a web view must, in targeted validation, run the
   privacy suite (`web/src/privacy/build-output-no-tracking.test.ts`) and a
   bundle-origin grep after `pnpm build:web` — the impacted-test selector does
   not pull in suites the implement did not touch, and focused view tests
   cannot see the built bundle.
3. Treat "green targeted, red full-CI-in-one-guard-suite" as THIS trap first:
   grep the bundle for origins before suspecting the guard.

## Related

- `docs/prioritization/2026-10-03-cycle-1-batch-run-b72d932440c9.md`
  (Outcome/Lessons sections — the full run-1 → fix → run-2 record)
- `docs/solutions/workflow-issues/targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md`
  (the sibling targeted-validation trap: suites hitting `/` need the built
  bundle too)
- ROADMAP.md rm-549..rm-552 dated compound riders (2026-10-03) and the
  cycle-1 compound #9 disclosure comment
