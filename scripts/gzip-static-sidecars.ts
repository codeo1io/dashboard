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
// rm-1980: the run also writes gzip-sidecar-manifest.json recording every
// compressible file and whether it got a sidecar (sidecarBytes null = skipped
// because gzip would not shrink it). The static-assets gate reads the manifest
// so a deliberate skip is provable instead of looking like a missing sidecar.

import {readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs'
import {join, relative} from 'node:path'
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

/** Manifest lives at the dist root so the gate can verify skip intent (rm-1980). */
const MANIFEST_NAME = 'gzip-sidecar-manifest.json'

interface SidecarEntry {
  file: string
  originalBytes: number
  sidecarBytes: number | null
}

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

  const entries: SidecarEntry[] = []
  for (const file of walk(root)) {
    if (!isCompressible(file)) continue
    const rel = relative(root, file)
    // The manifest itself is a .json in the walk on rebuilds; never compress
    // or record it (it is written fresh below).
    if (rel === MANIFEST_NAME) continue
    const original = readFileSync(file)
    const compressed = gzipSync(original, {level: GZIP_LEVEL})
    // Skip a sidecar that would not shrink the transfer (tiny files can
    // outgrow their gzip framing) — identity fallback serves those fine, and
    // the skip is recorded as sidecarBytes: null in the manifest (rm-1980).
    const sidecarBytes = compressed.byteLength >= original.byteLength ? null : compressed.byteLength
    if (sidecarBytes !== null) writeFileSync(`${file}.gz`, compressed)
    entries.push({file: rel, originalBytes: original.byteLength, sidecarBytes})
  }

  writeFileSync(
    join(root, MANIFEST_NAME),
    `${JSON.stringify({root, files: entries}, null, 2)}\n`,
  )

  const filesCompressed = entries.filter(entry => entry.sidecarBytes !== null).length
  const originalBytes = entries.reduce(
    (sum, entry) => sum + (entry.sidecarBytes === null ? 0 : entry.originalBytes),
    0,
  )
  const sidecarBytes = entries.reduce((sum, entry) => sum + (entry.sidecarBytes ?? 0), 0)
  const ratio =
    originalBytes > 0 ? ((1 - sidecarBytes / originalBytes) * 100).toFixed(1) : '0.0'
  console.log(
    `gzip-static-sidecars: ${filesCompressed}/${entries.length} compressible files in ${root}` +
    ` (${originalBytes} → ${sidecarBytes} bytes, -${ratio}%), manifest ${MANIFEST_NAME}`,
  )
  return 0
}

process.exit(main())
