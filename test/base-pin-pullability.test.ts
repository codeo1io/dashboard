import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'
import {
  authUrlFor,
  checkPin,
  manifestAcceptHeader,
  manifestUrlFor,
  parsePinnedImages,
  registryRepositoryForImage,
  type PinVerdict,
  type RegistryProbe,
} from '../scripts/base-pin-pullability.ts'

/**
 * rm-1478 — unit guard for the pullability check the base-drift workflow's
 * `pullability` job runs weekly and on dispatch.
 *
 * The class it exists for: sha256:173f1258 was a valid pin in the Dockerfile
 * until Docker Hub deleted the manifest — every release build then failed at
 * FROM while the drift job read green (pin and live tag agreed). The guard's
 * whole value is in the parse + verdict mapping, so both are pinned here:
 *   - the parse reads the digest out of the ACTUAL Dockerfile (if the pin
 *     changes, this test changes with it — that is the point);
 *   - 404 maps to `unpullable` (the red-by-design verdict), never to a pass.
 *
 * The registry itself is never contacted here: checkPin takes a probe seam.
 */

const repoRoot = process.cwd()
const dockerfilePath = join(repoRoot, 'Dockerfile')

/** Probe stub: mints a token, then answers a scripted manifest status. */
function probeWith(status: number): {probe: RegistryProbe; saw: {repo?: string; digest?: string; token?: string}} {
  const saw: {repo?: string; digest?: string; token?: string} = {}
  const probe: RegistryProbe = {
    async mintToken(repo) {
      saw.repo = repo
      return 'test-token'
    },
    async headManifest(repo, digest, token) {
      saw.repo = repo
      saw.digest = digest
      saw.token = token
      return status
    },
  }
  return {probe, saw}
}

describe('parsePinnedImages', () => {
  it('parses the ACTUAL Dockerfile: exactly the current base pin', () => {
    const pins = parsePinnedImages(readFileSync(dockerfilePath, 'utf8'))
    expect(pins, 'the live Dockerfile must carry exactly one digest-pinned image ref').toHaveLength(1)
    expect(pins[0]?.image).toBe('node:24-trixie-slim')
    expect(pins[0]?.digest).toBe(
      'sha256:7f486cabe892bff8fef04c0f7da8dba84a560be3e4e2740b7a86afc57ebec315',
    )
  })

  it('parses ARG and FROM shapes, deduplicates, and ignores bare tags and variables', () => {
    const text = [
      '# prose mentioning sha256:0000000000000000000000000000000000000000000000000000000000000000 stays prose',
      `ARG NODE_IMAGE=node:24-trixie-slim@sha256:${'a'.repeat(64)}`,
      `FROM \${NODE_IMAGE} AS build`,
      'FROM alpine:3.20 AS runtime',
      `FROM --platform=$BUILDPLATFORM node:24@sha256:${'b'.repeat(64)}`,
      `ARG OTHER=node:24-trixie-slim@sha256:${'a'.repeat(64)}`,
      '',
    ].join('\n')
    const pins = parsePinnedImages(text)
    expect(pins).toEqual([
      {image: 'node:24-trixie-slim', digest: `sha256:${'a'.repeat(64)}`},
      {image: 'node:24', digest: `sha256:${'b'.repeat(64)}`},
    ])
  })

  it('returns [] for a Dockerfile with no digest pins (guard exit-class 2)', () => {
    expect(parsePinnedImages('FROM node:24\nRUN echo hi\n')).toEqual([])
  })
})

describe('registry URL/repo mapping', () => {
  it('maps official images to library/<name> and namespaced images verbatim', () => {
    expect(registryRepositoryForImage('node')).toBe('library/node')
    expect(registryRepositoryForImage('node:24-trixie-slim')).toBe('library/node')
    expect(registryRepositoryForImage('ghcr.io/owner/app:1')).toBe('ghcr.io/owner/app')
  })

  it('builds the auth token and digest-HEAD URLs against the right endpoints', () => {
    expect(authUrlFor('library/node')).toBe(
      'https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull',
    )
    expect(manifestUrlFor('library/node', `sha256:${'a'.repeat(64)}`)).toBe(
      `https://registry-1.docker.io/v2/library/node/manifests/sha256:${'a'.repeat(64)}`,
    )
  })

  it('carries the multi-arch Accept set on the manifest HEAD', () => {
    // Without an index-typed Accept the registry may 404 a valid multi-arch
    // digest on a type mismatch — the guard would cry unpullable at a pin
    // that is fine. Pin the Accept set.
    expect(manifestAcceptHeader()).toContain('application/vnd.oci.image.index.v1+json')
    expect(manifestAcceptHeader()).toContain('application/vnd.docker.distribution.manifest.list.v2+json')
  })
})

describe('checkPin verdict mapping', () => {
  const pin = {image: 'node:24-trixie-slim', digest: `sha256:${'a'.repeat(64)}`}
  const kinds = (v: PinVerdict) => v.kind

  it('200 → pullable', async () => {
    expect(kinds(await checkPin(pin, probeWith(200).probe))).toBe('pullable')
  })

  it('404 → unpullable — the red-by-design verdict, never a pass', async () => {
    const {probe, saw} = probeWith(404)
    const verdict = await checkPin(pin, probe)
    expect(verdict.kind).toBe('unpullable')
    // The HEAD must target the DIGEST against the mapped repo.
    expect(saw.repo).toBe('library/node')
    expect(saw.digest).toBe(pin.digest)
  })

  it('401/403/5xx → error (readback problems are extraction errors, not verdicts)', async () => {
    for (const status of [401, 403, 500, 429]) {
      expect(kinds(await checkPin(pin, probeWith(status).probe))).toBe('error')
    }
  })

  it('token-mint and HEAD failures → error with detail, never pullable', async () => {
    const brokenToken: RegistryProbe = {
      async mintToken() {
        throw new Error('auth endpoint answered 503')
      },
      async headManifest() {
        return 200
      },
    }
    expect(kinds(await checkPin(pin, brokenToken))).toBe('error')
    const brokenHead: RegistryProbe = {
      async mintToken() {
        return 't'
      },
      async headManifest() {
        throw new Error('fetch failed')
      },
    }
    expect(kinds(await checkPin(pin, brokenHead))).toBe('error')
  })
})
