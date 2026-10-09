---
title: Content-hashed static assets need a local immutable Cache-Control middleware
date: 2026-10-07
category: best-practices
module: server
problem_type: performance_regression
severity: impact-medium
applies_when: serving a Vite-built PWA bundle through @hono/node-server serveStatic
tags: [http, caching, cache-control, serve-static, hono, pwa, rfc8246]
component: static-assets
---

# Content-hashed static assets need a local immutable Cache-Control middleware

## Problem

Every navigation re-downloaded the full hashed client bundle (~286 KB) plus
icon assets: the server sent no `Cache-Control`, no `ETag`, and answered
conditional `GET`s (with `If-Modified-Since`) with `200` and the full body
instead of `304`.

## Mechanism

`@hono/node-server` `serveStatic` (2.1.3, the current npm latest at the time)
sets only `Last-Modified`. It has no `ETag` generation, no
`If-Modified-Since`/`If-None-Match` handling, and no `Cache-Control` option.
So the adapter cannot produce a `304` on its own, and without an explicit
`Cache-Control` browsers revalidate or re-fetch hashed content they already
hold. Content-hashed filenames make the content inherently immutable, which
is exactly the case RFC 8246 `immutable` and the MDN caching guidance are
for: tell the client it may skip revalidation entirely for the lifetime of
the filename.

## Fix pattern (adopted 2026-10-07 in src/server.ts)

A zero-dependency wrapping middleware registered before the `serveStatic`
routes sets, for content-hashed paths only:

```ts
Cache-Control: public, max-age=31536000, immutable
```

Everything that is NOT content-hashed — `manifest.webmanifest`, `sw.js`,
`registerSW.js`, and the `/icon-*` family — carries an explicit
`no-cache`-family policy so clients pick up deploys. The in-repo precedent
to copy is the `registerSW.js` no-cache middleware right next to the static
routes. The HTML entry is a known, pre-existing exception outside this
pattern's coverage: only the push-enabled `/` shell is injected with
`no-store`; the non-push `/` `serveStatic` fallback and `/privacy` send no
`Cache-Control` at all (heuristic freshness) — do not cite them as
explicit-policy precedents.

Guard tests live in `test/static-assets.test.ts` (six-case describe):
immutable header on a hashed asset path, 404 without the immutable header,
`no-cache` on `/icon-*` and on the manifest, and the pinned pre-existing
`sw.js`/`registerSW.js` `no-cache, no-store` family. The HTML entry has no
guard test — if you add an explicit entry-file policy, add its red-first
guard in the same change.

### Addendum — operator.css census gap (2026-10-09, rm-478)

`/static/operator.css` rides the root catch-all's `public/` mount and sits
OUTSIDE every explicit policy row above: no `Cache-Control`, no `ETag`,
`Last-Modified` only, so clients fall back to heuristic freshness. The shape
is pinned first-hand by the guard test `GET /static/operator.css header
shape today` in `test/static-assets.test.ts` (run 35b0c401b321 cycle:1,
'Read-only signal truth'). An explicit header was deliberately NOT added
with the census: `operator.css` is unhashed and operator-visible, so the
`no-cache` family is the obvious precedent — but the deploy-staleness
versus request-rate trade-off needs its own evidence. Until a change lands
one, the recorded policy for the catch-all path is "absent, baseline
pinned".

## Prevention rule

Do not rely on the adapter for caching policy. When bumping
`@hono/node-server` or swapping the static-serving adapter, re-probe with a
curl battery: raw `GET` (expect the header), conditional `GET` with
`If-Modified-Since` (expect `304` only if the adapter gained conditional
support — until then the `immutable` `Cache-Control` is the cure), and confirm
the no-cache family is untouched.
