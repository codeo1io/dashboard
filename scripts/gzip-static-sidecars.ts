#!/usr/bin/env node
// rm-602 (repository-maintenance cycle 3, run f2821fb57c34) — post-build gzip
// sidecar generator for the precompressed static-serving scheme. Run by
// `pnpm build:web` (and `build:web:fixture`) right after the Vite build, so
// every compressible file in the output tree carries a `<name>.gz` sibling
// that @hono/node-server's `serveStatic({precompressed: true})` selects by
// Accept-Encoding (Content-Encoding: gzip + Vary: Accept-Encoding, with
// Content-Length/Last-Modified taken from the sidecar).
// rm-1488 (repository-maintenance cycle 1, run c4fb65b154a7) — brotli tier:
// the same pass now also emits a `<name>.br` sibling at max static quality.
// The server prefers br over gzip when the client accepts both
// (ENCODINGS order br → zstd → gzip in @hono/node-server), so this is purely
// additive: zero server change, existing `.gz` semantics untouched.
//
// Decision context (discharged gate, 2026-10-09; re-verified 2026-10-19 for
// rm-1488): the production proxy does
// not compress (marcusrbrown/infra — the dashboard Caddyfile was re-fetched
// at latest-touch commit 50ff7e4d and still carries no `encode` directive),
// so compression belongs in the app layer —
// and since the dashboard is read-only JSON+SPA traffic, precomputed build
// artifacts beat a runtime CPU/latency middleware. Scope: the web/dist SPA
// family ONLY. The public/ operator runtime files are tracked sources copied
// verbatim into the image (no build step) and keep identity serving — see the
// rm-602 def-line disposition in ROADMAP.md. SSE endpoints are unaffected by
// construction: nothing in this scheme compresses a stream, only files that
// exist before the request arrives.
//
// Zero-dependency by design (node:fs/node:path/node:zlib + process only) so it
// runs in any stage that has Node — including the Docker builder stage, which
// is what makes the sidecars ship inside the image.

import {readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {brotliCompressSync, gzipSync, constants as zlibConstants} from 'node:zlib'

/** Text formats worth a sidecar; binary media (woff2/png/ico) are skipped. */
const COMPRESSIBLE_EXTENSIONS: readonly string[] = [
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.svg',
  '.webmanifest',
  '.txt',
  '.xml',
]

/** Never re-compress an existing compressed artifact. */
const COMPRESSED_EXTENSIONS: readonly string[] = ['.gz', '.br', '.zst', '.zstd']

const GZIP_LEVEL = 9
// rm-1488: max-quality static brotli — one-time build cost, best-in-class
// ratio for the text/JS/CSS class this script covers. The server negotiates
// br ahead of gzip (`precompressed: true`, @hono/node-server ENCODINGS order).
const BROTLI_QUALITY = zlibConstants.BROTLI_MAX_QUALITY

function isCompressible(name: string): boolean {
  if (COMPRESSED_EXTENSIONS.some(ext => name.endsWith(ext))) return false
  return COMPRESSIBLE_EXTENSIONS.some(ext => name.endsWith(ext))
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (entry.isFile()) {
      yield full
    }
  }
}

function main(): number {
  const root = process.argv[2] ?? 'web/dist'
  try {
    const dirStat = statSync(root)
    if (!dirStat.isDirectory()) {
      console.error(`gzip-static-sidecars: ${root} is not a directory`)
      return 1
    }
  } catch {
    console.error(`gzip-static-sidecars: ${root} does not exist — run the Vite build first`)
    return 1
  }

  const stats = {
    files: 0,
    gzFiles: 0,
    gzOriginalBytes: 0,
    gzBytes: 0,
    brFiles: 0,
    brOriginalBytes: 0,
    brBytes: 0,
  }
  for (const file of walk(root)) {
    if (!isCompressible(file)) continue
    stats.files++
    const original = readFileSync(file)
    // Each variant carries the no-shrink skip independently: gzip framing can
    // outgrow a tiny file where brotli still shrinks it (and vice versa).
    // Files with no surviving variant fall back to identity serving.
    const gz = gzipSync(original, {level: GZIP_LEVEL})
    if (gz.byteLength < original.byteLength) {
      writeFileSync(`${file}.gz`, gz)
      stats.gzFiles++
      stats.gzOriginalBytes += original.byteLength
      stats.gzBytes += gz.byteLength
    }
    const br = brotliCompressSync(original, {
      params: {[zlibConstants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY},
    })
    if (br.byteLength < original.byteLength) {
      writeFileSync(`${file}.br`, br)
      stats.brFiles++
      stats.brOriginalBytes += original.byteLength
      stats.brBytes += br.byteLength
    }
  }

  const gzRatio =
    stats.gzOriginalBytes > 0 ? ((1 - stats.gzBytes / stats.gzOriginalBytes) * 100).toFixed(1) : '0.0'
  console.log(
    `gzip-static-sidecars: ${stats.gzFiles}/${stats.files} compressible files in ${root}` +
    ` (${stats.gzOriginalBytes} → ${stats.gzBytes} bytes, -${gzRatio}%)`,
  )
  const brRatio =
    stats.brOriginalBytes > 0 ? ((1 - stats.brBytes / stats.brOriginalBytes) * 100).toFixed(1) : '0.0'
  console.log(
    `gzip-static-sidecars: brotli ${stats.brFiles}/${stats.files} compressible files in ${root}` +
    ` (${stats.brOriginalBytes} → ${stats.brBytes} bytes, -${brRatio}%)`,
  )
  return 0
}

process.exit(main())
