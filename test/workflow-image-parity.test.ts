import {readdirSync, readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const workflowsDir = join(repoRoot, '.github', 'workflows')
const dockerfilePath = join(repoRoot, 'Dockerfile')

const dockerfile = readFileSync(dockerfilePath, 'utf8')

// The Dockerfile owns the canonical base-image pin; every workflow that names
// a node:24 tag must agree with it or its digest-resolution step goes blind
// (the cve-tripwire `grep "${NODE_IMAGE}@sha256:" Dockerfile` precondition —
// the exact regression that would have turned the first scheduled fire,
// 2026-10-12T06:53Z, deterministic-red: rm-698 moved the Dockerfile ARG to
// node:24-trixie-slim on 2026-10-07 while cve-tripwire still grepped
// node:24-slim. Cured 2026-10-09 by run a653567e's rm-648 batch; test shape
// folded by content from sibling run 8521c80a's unlanded salvage.)
const canonicalPin = /^ARG NODE_IMAGE=(node:24-[a-z0-9.-]+)@sha256:([0-9a-f]{64})$/mu.exec(
  dockerfile,
)
const canonicalTag = canonicalPin?.[1]
const canonicalDigest = canonicalPin?.[2]

const workflowFiles = readdirSync(workflowsDir)
  .filter(name => name.endsWith('.yaml') || name.endsWith('.yml'))
  .map(name => ({
    name,
    text: readFileSync(join(workflowsDir, name), 'utf8'),
  }))

describe('workflow image-tag parity with the Dockerfile ARG', () => {
  it('Dockerfile declares a digest-pinned node:24 base image', () => {
    expect(canonicalTag).toBe('node:24-trixie-slim')
    expect(canonicalDigest).toMatch(/^[0-9a-f]{64}$/u)
  })

  it('every node:24 tag referenced by a workflow matches the Dockerfile tag', () => {
    expect(workflowFiles.length).toBeGreaterThanOrEqual(13)
    const offenders: string[] = []
    for (const {name, text} of workflowFiles) {
      for (const match of text.matchAll(/\bnode:24-[a-z0-9.-]+/gu)) {
        if (match[0] !== canonicalTag) {
          offenders.push(`${name}: ${match[0]}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it("cve-tripwire's NODE_IMAGE resolves against the Dockerfile digest pin", () => {
    const tripwire = workflowFiles.find(({name}) => name === 'cve-tripwire.yaml')
    expect(tripwire).toBeDefined()
    const nodeImage = /NODE_IMAGE:\s*'([^']+)'/u.exec(tripwire?.text ?? '')
    expect(nodeImage?.[1]).toBeDefined()
    // Simulate the workflow's `grep -oE "${NODE_IMAGE}@sha256:" Dockerfile`
    // precondition byte-for-byte.
    const resolved = new RegExp(`${nodeImage?.[1]}@sha256:([0-9a-f]{64})`, 'u').exec(dockerfile)
    expect(resolved?.[1]).toBe(canonicalDigest)
  })
})

describe('workflow runner pin parity', () => {
  it('every workflow job pins runs-on: ubuntu-24.04', () => {
    const offenders: string[] = []
    for (const {name, text} of workflowFiles) {
      for (const match of text.matchAll(/^\s*runs-on: (.+)$/gmu)) {
        const value = (match[1] ?? '').trim().replaceAll(/^['"]|['"]$/gu, '')
        if (value !== 'ubuntu-24.04') {
          offenders.push(`${name}: ${match[0].trim()}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
