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
`registerSW.js`, and any un-hashed entry file — keeps the existing explicit
`no-cache`/short-cache middleware so clients pick up deploys. The
in-repo precedent to copy is the `registerSW.js` no-cache middleware right
next to the static routes.

Guard tests live in `test/static-assets.test.ts` (six-case describe): header
present on a hashed asset path, entry-file family still no-cache, CSP still
applied on static paths, and no regression to the manifest MIME handling.

## Prevention rule

Do not rely on the adapter for caching policy. When bumping
`@hono/node-server` or swapping the static-serving adapter, re-probe with a
curl battery: raw `GET` (expect the header), conditional `GET` with
`If-Modified-Since` (expect `304` only if the adapter gained conditional
support — until then the `immutable` `Cache-Control` is the cure), and confirm
the no-cache family is untouched.
