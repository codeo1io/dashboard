import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-782 (2026-10-09, run ddb41af7 cycle 1): NODE_IMAGE parity fence.
 *
 * The CVE tripwire (rm-648) scans exactly what the Dockerfile pins: its
 * "Resolve pinned digest" step greps "${NODE_IMAGE}@sha256:<64 hex>" out of
 * the Dockerfile ARG line, so the workflow constant must byte-equal the
 * Dockerfile ARG tag. The trixie migration (ad8f21e, rm-698, 2026-10-07)
 * moved the Dockerfile to node:24-trixie-slim while the constant stayed on
 * 'node:24-slim' — the grep matched nothing and the first scheduled fire
 * (Mon 2026-10-12 06:53Z) would have failed red on the resolve step. This
 * fence fails at test time instead, before any scheduled run can.
 */
const tripwire = readFileSync(join(process.cwd(), '.github', 'workflows', 'cve-tripwire.yaml'), 'utf8')
const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8')

/** Tag-only NODE_IMAGE constant from the tripwire env block (quoted there). */
const nodeImage = tripwire.match(/^\s*NODE_IMAGE:\s*'([^']+)'\s*$/m)?.[1] ?? ''

/** Dockerfile ARG reference, split into tag + digest at the last '@'. */
const argLine = dockerfile.split('\n').find(line => line.startsWith('ARG NODE_IMAGE='))
const argRef = argLine?.slice('ARG NODE_IMAGE='.length).trim() ?? ''
const separator = argRef.lastIndexOf('@')
const argTag = argRef.slice(0, separator)
const argDigest = argRef.slice(separator + 1)

describe('cve-tripwire NODE_IMAGE ↔ Dockerfile ARG parity (rm-782)', () => {
  it('the tripwire declares a quoted tag-only NODE_IMAGE constant', () => {
    expect(
      nodeImage,
      "cve-tripwire.yaml must keep a quoted NODE_IMAGE env constant like NODE_IMAGE: 'node:24-trixie-slim'",
    ).toMatch(/^[a-z0-9._/-]+:[a-z0-9._-]+$/)
  })

  it('the Dockerfile ARG pins a full <tag>@sha256:<64 hex> reference', () => {
    expect(
      argLine,
      'Dockerfile must keep ARG NODE_IMAGE=<tag>@sha256:<64 hex> — digest pinning is the tripwire precondition',
    ).toBeDefined()
    expect(
      argDigest,
      `the Dockerfile ARG digest must be sha256:<64 hex>, got: ${argDigest}`,
    ).toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  it('NODE_IMAGE byte-equals the Dockerfile ARG tag, so the tripwire grep resolves the pin', () => {
    expect(
      nodeImage === argTag,
      `the workflow constant '${nodeImage}' drifted from the Dockerfile ARG tag '${argTag}' — the tripwire resolve step would match nothing and the scheduled run fails red`,
    ).toBe(true)
    // The pin reference the resolve grep extracts, rebuilt from both sides:
    // constant tag + the ARG's digest. Equal by construction iff both above
    // hold, so also assert the ARG line itself embeds the constant verbatim.
    expect(
      dockerfile.includes(`ARG NODE_IMAGE=${nodeImage}@${argDigest}`),
      'the Dockerfile ARG line must embed the tripwire NODE_IMAGE tag verbatim ahead of its digest',
    ).toBe(true)
  })
})
