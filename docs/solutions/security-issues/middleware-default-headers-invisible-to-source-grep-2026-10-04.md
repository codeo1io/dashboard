---
title: Middleware default security headers are invisible to source grep — audit emitted headers, read the dependency source, pin the emitted value
date: 2026-10-04
category: security-issues
module: dashboard
problem_type: security_issue
component: server_headers
severity: medium
applies_when:
  - 'auditing the security-header posture from source code (grep) instead of from emitted responses'
  - 'hono secureHeaders() middleware defaults are mistaken for deliberate configuration'
  - 'deciding an HSTS max-age ramp or a preload submission on this repo'
tags: [security, headers, hsts, hono, secureheaders, audit, live-probe, middleware-defaults]
---

# Middleware default security headers are invisible to source grep

Date: 2026-10-04 (event) · Run: `80e8409255b94d3782ec2a9b7f871fe0`
(repository-maintenance cycle 1, rm-613) · Author: hermes-conductor
compound phase (attempt `1874fe8e79114ba1966ea5a56ac65f24`).

## Problem

`src/server.ts` mounts `secureHeaders()` from hono 4.13.11 and configures
exactly one key inside it (the CSP object). Every OTHER header in the
posture — HSTS included — came from the middleware's compiled defaults:
`node_modules/.pnpm/hono@4.13.11/.../dist/middleware/secure-headers/secure-headers.js:9`
ships `strictTransportSecurity:
["Strict-Transport-Security", "max-age=15552000; includeSubDomains"]`. A
repo-wide grep for `strictTransportSecurity` / `Strict-Transport-Security` /
`max-age=15552000` returns ZERO hits, yet the server emitted a full strict
HSTS header on every response. Two audit failure modes follow:

- **False absence** — "no HSTS configured" conclusions from grep, when a
  180-day HSTS header was actually shipping on every route.
- **False intent** — treating the default as a deliberate posture decision.
  A default that was never chosen still needs an explicit ramp decision
  (this domain had served HSTS continuously, so the short-max-age ramp-up
  rationale was long expired; OWASP/MDN posture for long-lived deployments
  is 31536000, and preload eligibility requires it).

## Symptoms

- Security research that scopes a header audit to repo source files finds
  no writer for a header the browser plainly receives.
- `docs/runbooks/security-posture.md` style claims diverge from what
  `curl -sI` shows, with no config line to reconcile against.

## Solution (the audit order that works)

1. **Probe emitted, not written**: boot the real server and dump headers on
   every route class (`curl -sI` on `/`, `/api/healthz`, `/static/*`) — this
   cycle's live probe on 127.0.0.1:4391/4397 is the pattern. The emitted set
   is the posture; source is only the mechanism.
2. **Read the dependency for the defaults**: when a middleware is mounted
   bare, its defaults live in `node_modules/.pnpm/<pkg>/.../dist`, not the
   repo (here: `secure-headers.js:9` default + the
   `dist/types/.../secure-headers.d.ts:62` `strictTransportSecurity?:
   overridableHeader` override seam). Do not conclude "not configured" from
   zero repo hits.
3. **Make the deliberate decision explicit and pin the EMITTED value**: the
   fix is a full-string override at the mount site
   (`strictTransportSecurity: 'max-age=31536000; includeSubDomains'`) plus a
   booted-app test asserting the emitted header byte-exactly
   (`test/server.test.ts`, the CSP-pin precedent) and a negative pin (no
   `preload` token). Pinning the config shape instead of the emitted value
   would re-create the same blindness one layer down.
4. **Preload is a deployment-owner decision, not a repo change**: this repo
   serves behind a reverse proxy that owns TLS, so the `preload` token is
   explicitly DECLINED in a code comment at the override site. Audit docs
   should record the disposition, not just the value.

## Prevention rule

Any security claim about response headers must cite an emitted dump, not a
source grep. When a framework middleware is mounted with defaults, read the
installed package's dist source to enumerate what those defaults emit, and
convert any default you intend to rely on into an explicit override + an
emitted-value pin in the same change.

## Related records

- Ledger: `rm-613` in `ROADMAP.md` (ramp + preload disposition + pins, with
  validation riders), disclosure extension #12.
- Batch record: `docs/prioritization/2026-10-04-repository-maintenance-cycle-1-batch-run-80e8409255b9.md`
  (B2, Outcome + reusable lessons).
- The header-audit precedent that stayed true by construction:
  `test/server.test.ts` booted-app CSP pins (`:376-388` at the 227375247
  base).
