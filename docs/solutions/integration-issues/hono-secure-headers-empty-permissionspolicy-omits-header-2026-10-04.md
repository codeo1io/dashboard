---
title: Hono secureHeaders silently omits Permissions-Policy for an empty policy object
date: 2026-10-04
category: integration-issues
module: dashboard
component: security-headers
problem_type: middleware_contract_surprise
severity: medium
applies_when:
  - 'Adopting or auditing hono''s secureHeaders middleware and expecting the full MDN/OWASP baseline header set'
  - 'A security-header inventory shows every baseline header present EXCEPT Permissions-Policy with no code path explaining why'
  - 'Passing only a partial override (e.g. just contentSecurityPolicy) to secureHeaders and assuming defaults fill the rest'
tags: [hono, secure-headers, permissions-policy, header-inventory, middleware-defaults]
related:
  - 'src/server.ts (secureHeaders call, rm-557)'
  - 'test/static-assets.test.ts (header pins)'
  - 'docs/solutions/best-practices/endpoint-parity-guard-app-routes-recipe-2026-10-04.md (same cycle''s probe-driven inventory)'
---

## Problem

Every baseline header was emitted on every response — strict CSP, HSTS,
`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, COOP, CORP,
Origin-Agent-Cluster — but `Permissions-Policy` was null on `/`, `/api/*`, and
`/healthz`, with no code path in this repo touching it.

Cause (hono 4.x, `node_modules/hono/dist/middleware/secure-headers/secure-headers.js`):
the middleware's default `permissionsPolicy` is an **empty object**, and it emits
the header only for a non-empty policy. Overriding just
`contentSecurityPolicy` (as this repo did) leaves the policy object empty — the
header is skipped silently. `secureHeaders({})` is therefore NOT "all defaults
on"; it is "all defaults on except the one whose default is empty".

## Solution

Pass an explicit deny-by-default feature map (rm-557):

```ts
permissionsPolicy: {
  accelerometer: [], camera: [], displayCapture: [], geolocation: [],
  gyroscope: [], magnetometer: [], microphone: [], payment: [], usb: [],
}
```

Each empty array serializes to `()` — the feature is disabled everywhere.
Before denying, grep the client for each denied feature's API surface
(getUserMedia, geolocation, clipboard, share, bluetooth, usb, vibrate, payment,
EME, wake-lock, gamepad) — zero hits means the deny is free. Web Notifications,
the one powerful feature a PWA like this uses, is **not** policy-controlled and
is unaffected.

## Prevention

- **Probe-driven header inventories, not code reading.** The gap was found by
  asserting a response-header allowlist per surface, not by reading middleware
  defaults. Pin the full expected header set (including exact directive text)
  in `test/static-assets.test.ts` so a middleware upgrade that changes this
  behavior again reddens a test instead of shipping silently.
- When adopting any middleware with object-valued options, check the emitted
  artifact for an empty-default option — empties are the silent-off case.
