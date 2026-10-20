#!/usr/bin/env node
// rm-602 (repository-maintenance cycle 3, run f2821fb57c34) — post-build gzip
// sidecar generator for the precompressed static-serving scheme. Run by
// `pnpm build:web` (and `build:web:fixture`) right after the Vite build, so
// every compressible file in the output tree carries a `<name>.gz` sibling
// that @hono/node-server's `serveStatic({precompressed: true})` selects by
// Accept-Encoding (Content-Encoding: gzip + Vary: Accept-Encoding, with
// Content-Length/Last-Modified taken from the sidecar).
//
// Decision context (discharged gate, 2026-10-09): the production proxy does
// not compress (marcusrbrown/infra@3216bb06 apps/dashboard/config/Caddyfile
// carries no `encode` directive), so compression belongs in the app layer —
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
//
// rm-1489 (repository-maintenance cycle 4, run 9ee060d1): stale-sidecar
// cleanup. The walk is not the whole job — a rebuild can leave sidecars
// whose truth changed or vanished, and `serveStatic({precompressed: true})`
// happily serves those stale bytes: (a) an orphan `<name>.gz` whose source
// file no longer exists (removed/renamed between builds — hashed bundles
// rename every content change), and (b) a sidecar for a source that no
// longer takes one (grew, or stopped shrinking) where the OLD compressed
// bytes would shadow the fresh identity fallback. Both classes are unlinked
// every run; only `.gz` files this scheme could have produced are touched —
// orphan cleanup checks the vanished source's extension against the
// compressible set, so a base-less `.tar.gz` (or any precompressed-only
// artifact) this scheme never produced stays.

import {readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {gzipSync} from 'node:zlib'

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

/** Sidecar suffix this script produces — cleanup never touches `.br`/`.zst`. */
const SIDECAR_SUFFIX = '.gz'

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

  const stats = {files: 0, filesCompressed: 0, originalBytes: 0, sidecarBytes: 0, staleRemoved: 0}
  // Materialize the walk once so sidecar-orphan checks can consult the full
  // source population regardless of directory iteration order.
  const allFiles = [...walk(root)]
  const presentSources = new Set(allFiles)
  for (const file of allFiles) {
    // rm-1489(a): orphan sidecar — its source file is gone (removed or
    // renamed between builds), so the sidecar serves bytes that no longer
    // correspond to anything. Unlink it — but only when the vanished source
    // is one this scheme compresses (its extension is in the compressible
    // set): a base-less `.gz` like a vendored `.tar.gz` was never produced by
    // this scheme and stays. A `.gz` whose source EXISTS is left to the
    // source's own iteration below (rewritten, or stale-dropped there).
    if (file.endsWith(SIDECAR_SUFFIX)) {
      const source = file.slice(0, -SIDECAR_SUFFIX.length)
      if (!presentSources.has(source) && isCompressible(source)) {
        rmSync(file, {force: true})
        stats.staleRemoved++
      }
      continue
    }
    if (!isCompressible(file)) continue
    stats.files++
    const original = readFileSync(file)
    const compressed = gzipSync(original, {level: GZIP_LEVEL})
    // Skip a sidecar that would not shrink the transfer (tiny files can
    // outgrow their gzip framing) — identity fallback serves those fine.
    if (compressed.byteLength >= original.byteLength) {
      // rm-1489(b): a source that no longer takes a sidecar must not keep
      // one from an earlier run — `precompressed: true` would serve the OLD
      // compressed bytes instead of the fresh identity fallback.
      rmSync(`${file}${SIDECAR_SUFFIX}`, {force: true})
      continue
    }
    writeFileSync(`${file}${SIDECAR_SUFFIX}`, compressed)
    stats.filesCompressed++
    stats.originalBytes += original.byteLength
    stats.sidecarBytes += compressed.byteLength
  }

  const ratio =
    stats.originalBytes > 0 ? ((1 - stats.sidecarBytes / stats.originalBytes) * 100).toFixed(1) : '0.0'
  console.log(
    `gzip-static-sidecars: ${stats.filesCompressed}/${stats.files} compressible files in ${root}` +
    ` (${stats.originalBytes} → ${stats.sidecarBytes} bytes, -${ratio}%), removed ${stats.staleRemoved} stale sidecars`,
  )
  return 0
}

process.exit(main())
