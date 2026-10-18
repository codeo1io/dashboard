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
// rm-1986 (repository-maintenance cycle 3, run b7188a701a7a): the generator
// also keeps the sidecar set TRUSTWORTHY across incremental builds —
// serveStatic({precompressed: true}) PREFERS a `.gz` sibling over newer
// identity bytes under Accept-Encoding: gzip, so a sidecar left behind by an
// older build would shadow fresh content. Two invariants (nginx's gzip_static
// docs say the same: keep the compressed and uncompressed files in sync):
// - not-worth-compressing file with a pre-existing sidecar → the sidecar is
//   PRUNED (the previous build's bytes are stale by construction);
// - sidecar whose identity sibling is gone (deleted/renamed source) → swept
//   as an orphan before the compress pass.

import {existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs'
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

  const stats = {files: 0, filesCompressed: 0, originalBytes: 0, sidecarBytes: 0, prunedStale: 0, sweptOrphans: 0}
  // rm-1986 — orphan sweep first: a `.gz` with no identity sibling is residue
  // from a deleted or renamed source. It shadows nothing, but it ships bytes
  // and can outlive many builds, so remove it before the compress pass.
  for (const file of walk(root)) {
    if (!file.endsWith('.gz')) continue
    if (!existsSync(file.slice(0, -'.gz'.length))) {
      rmSync(file, {force: true})
      stats.sweptOrphans++
    }
  }
  for (const file of walk(root)) {
    if (!isCompressible(file)) continue
    stats.files++
    const original = readFileSync(file)
    const compressed = gzipSync(original, {level: GZIP_LEVEL})
    // Skip a sidecar that would not shrink the transfer (tiny files can
    // outgrow their gzip framing) — identity fallback serves those fine.
    // rm-1986: a sidecar from an OLDER build must not survive this skip —
    // precompressed serving prefers it over these fresher identity bytes.
    if (compressed.byteLength >= original.byteLength) {
      const sidecar = `${file}.gz`
      if (existsSync(sidecar)) {
        rmSync(sidecar, {force: true})
        stats.prunedStale++
      }
      continue
    }
    writeFileSync(`${file}.gz`, compressed)
    stats.filesCompressed++
    stats.originalBytes += original.byteLength
    stats.sidecarBytes += compressed.byteLength
  }

  const ratio =
    stats.originalBytes > 0 ? ((1 - stats.sidecarBytes / stats.originalBytes) * 100).toFixed(1) : '0.0'
  console.log(
    `gzip-static-sidecars: ${stats.filesCompressed}/${stats.files} compressible files in ${root}` +
    ` (${stats.originalBytes} → ${stats.sidecarBytes} bytes, -${ratio}%)` +
    `, pruned ${stats.prunedStale} stale sidecar(s), swept ${stats.sweptOrphans} orphan(s)`,
  )
  return 0
}

process.exit(main())
