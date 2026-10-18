#!/usr/bin/env node
/**
 * rm-1478 — base-image pin PULLABILITY guard.
 *
 * The unpullable-pin class: Dockerfile pins `node:24-trixie-slim@sha256:<digest>`,
 * and image tags are MOVABLE — Docker Hub deleted the pinned manifest for
 * sha256:173f1258 (authed HEAD 404, re-proven 2026-10-17), so every image
 * build failed at `FROM ${NODE_IMAGE}` while the repo's weekly drift check
 * stayed structurally blind to it: base-drift compares pins against the LIVE
 * tag digest (drift = pin lags the tag), which reads green the moment the
 * pinned digest and the tag happen to point at the same manifest — it never
 * asks whether the pinned DIGEST itself still resolves. This script asks
 * exactly that: for every digest-pinned image reference in the Dockerfile it
 * performs the authed registry HEAD against the digest (not the tag) and
 * fails on 404 — the class surfaces weekly via .github/workflows/base-drift.yaml
 * (`pullability` job) and on dispatch, before a release pipeline hits it.
 *
 * Exit codes (house convention, cf. release-channel-staleness.ts):
 *   0 = every pinned digest resolves (pullable)
 *   1 = at least one digest is UNPULLABLE (registry 404) — red by design
 *   2 = extraction or readback error (no pins found, token mint failure,
 *       network/transport failure, unexpected status) — never a pass
 */

import {readFileSync} from 'node:fs'
import process from 'node:process'
import {pathToFileURL} from 'node:url'

export interface PinnedImageRef {
  /** Bare image reference the digest pins, e.g. `node:24-trixie-slim`. */
  image: string
  /** Full digest including the algorithm prefix, e.g. `sha256:<64 hex>`. */
  digest: string
}

export type PinVerdict =
  | {kind: 'pullable'; image: string; digest: string; httpStatus: number}
  | {kind: 'unpullable'; image: string; digest: string; httpStatus: number}
  | {kind: 'error'; image: string; digest: string; detail: string}

/** Minimal registry probe seam so unit tests drive verdicts without the network. */
export interface RegistryProbe {
  mintToken: (repo: string) => Promise<string>
  headManifest: (repo: string, digest: string, token: string) => Promise<number>
}

const DOCKER_HUB_AUTH = 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:<REPO>:pull'
const REGISTRY_MANIFEST = 'https://registry-1.docker.io/v2/<REPO>/manifests/<REF>'
const ACCEPT_MANIFEST_TYPES =
  'application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json'
const REQUEST_TIMEOUT_MS = 20_000

/**
 * Parse digest-pinned image references out of Dockerfile text.
 *
 * Matches `ARG <NAME>=<image>@<digest>` and `FROM [--platform=…] <image>@<digest>`
 * lines — variable references (`FROM ${NODE_IMAGE}`) carry no digest and are
 * covered by the ARG that defines them. Deduplicates image+digest pairs so a
 * pin referenced by both an ARG and a literal FROM is checked once.
 */
export function parsePinnedImages(dockerfileText: string): PinnedImageRef[] {
  const pins: PinnedImageRef[] = []
  const seen = new Set<string>()
  const lineRe = /^(?:ARG\s+[A-Za-z_]\w*=|FROM\s+(?:--platform=\S+\s+)?)(\w[\w./:-]*)@((?:sha256:)?[0-9a-f]{64})\s*$/gm
  for (const match of dockerfileText.matchAll(lineRe)) {
    const image = match[1] ?? ''
    const rawDigest = match[2] ?? ''
    const digest = `sha256:${rawDigest.replace(/^sha256:/, '')}`
    const key = `${image}@${digest}`
    if (!seen.has(key)) {
      seen.add(key)
      pins.push({image, digest})
    }
  }
  return pins
}

/** Map an image reference to its Docker Hub repository name (`node` → `library/node`). */
export function registryRepositoryForImage(image: string): string {
  const nameTag = image.split(':')[0] ?? image
  return nameTag.includes('/') ? nameTag : `library/${nameTag}`
}

/** Token-endpoint URL for a repository (exported for tests). */
export function authUrlFor(repo: string): string {
  return DOCKER_HUB_AUTH.replace('<REPO>', repo)
}

/** Manifest-HEAD URL for a repository + digest reference (exported for tests). */
export function manifestUrlFor(repo: string, digest: string): string {
  return REGISTRY_MANIFEST.replace('<REPO>', repo).replaceAll('<REF>', digest)
}

/** Accept header the manifest HEAD carries (exported for tests). */
export function manifestAcceptHeader(): string {
  return ACCEPT_MANIFEST_TYPES
}

const defaultProbe: RegistryProbe = {
  // Docker Hub requires the anonymous `repository:<repo>:pull` token even for
  // public images.
  async mintToken(repo) {
    const res = await fetch(authUrlFor(repo), {signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)})
    if (!res.ok) throw new Error(`auth token endpoint answered ${res.status}`)
    const body = (await res.json()) as {token?: string}
    if (body.token === undefined || body.token === '') throw new Error('auth token endpoint answered no token')
    return body.token
  },
  async headManifest(repo, digest, token) {
    const res = await fetch(manifestUrlFor(repo, digest), {
      method: 'HEAD',
      headers: {Authorization: `Bearer ${token}`, Accept: ACCEPT_MANIFEST_TYPES},
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    return res.status
  },
}

/**
 * HEAD the registry for one pinned digest — the digest itself, never the
 * movable tag. The Accept set makes the registry answer for multi-arch
 * indexes rather than 404-ing on a type mismatch.
 */
export async function checkPin(
  pin: PinnedImageRef,
  probe: RegistryProbe = defaultProbe,
): Promise<PinVerdict> {
  const repo = registryRepositoryForImage(pin.image)
  let token: string
  try {
    token = await probe.mintToken(repo)
  } catch (error) {
    return {kind: 'error', image: pin.image, digest: pin.digest, detail: `auth token request failed: ${(error as Error).message}`}
  }
  try {
    const status = await probe.headManifest(repo, pin.digest, token)
    if (status === 200) return {kind: 'pullable', image: pin.image, digest: pin.digest, httpStatus: status}
    if (status === 404) return {kind: 'unpullable', image: pin.image, digest: pin.digest, httpStatus: status}
    return {kind: 'error', image: pin.image, digest: pin.digest, detail: `registry answered ${status} for the digest HEAD`}
  } catch (error) {
    return {kind: 'error', image: pin.image, digest: pin.digest, detail: `digest HEAD failed: ${(error as Error).message}`}
  }
}

async function main(): Promise<number> {
  const dockerfile = process.argv[2] ?? 'Dockerfile'
  let text: string
  try {
    text = readFileSync(dockerfile, 'utf8')
  } catch (error) {
    console.error(`::error::cannot read ${dockerfile}: ${(error as Error).message}`)
    return 2
  }
  const pins = parsePinnedImages(text)
  if (pins.length === 0) {
    console.error(`::error::no digest-pinned image references found in ${dockerfile} — the pullability guard has nothing to guard`)
    return 2
  }
  let exitCode = 0
  for (const pin of pins) {
    const verdict = await checkPin(pin)
    const where = `${pin.image}@${pin.digest.slice(0, 19)}…`
    if (verdict.kind === 'pullable') {
      console.log(`pullable: ${where} (HTTP ${verdict.httpStatus})`)
    } else if (verdict.kind === 'unpullable') {
      exitCode = exitCode === 2 ? 2 : 1
      console.error(`::error::unpullable: ${where} — the registry has no manifest for this digest (HTTP ${verdict.httpStatus}); the base image pin must be repinned`)
    } else {
      exitCode = 2
      console.error(`::error::readback error for ${where}: ${verdict.detail}`)
    }
  }
  return exitCode
}

function isMainEntryPoint(metaUrl: string, argv1: string | undefined): boolean {
  if (argv1 === undefined || argv1 === '') return false
  try {
    return pathToFileURL(argv1).href === metaUrl
  } catch {
    return false
  }
}

if (isMainEntryPoint(import.meta.url, process.argv[1])) {
  main().then(
    code => process.exit(code),
    error => {
      console.error(`::error::${(error as Error).message}`)
      process.exit(2)
    },
  )
}
