import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'
import {parse} from 'yaml'

// rm-881 (run 47f9aaefa379, 2026-10-16): the visual gate's Playwright image and
// the lockfile-resolved @playwright/test are ONE dependency pair and must never
// split again. They did once: 6179cb7 (2026-10-11) moved the lockfile to
// 1.64.0 via the `^1.63.0` caret while visual.yaml stayed on v1.63.0-noble — a
// pair that fails deterministically ("Executable doesn't exist": the lib looks
// for its own chromium build under /ms-playwright, the 1.63.0 image ships 1.63
// builds). The gate only looked healthy because Actions was suspended. This
// guard derives both sides from source-of-truth files (workflow YAML + lockfile
// importers) and asserts equality, so a caret float, a lockfile-only bump, or a
// tag-only image bump each redden the suite before merge. The @playwright/test
// pin in package.json is exact (no caret) for the same reason. Sibling of
// test/visual-gate-paths.test.ts (rm-207) and test/dockerfile-context.test.ts.

const repoRoot = process.cwd()
const workflowPath = resolve(repoRoot, '.github/workflows/visual.yaml')
const lockfilePath = resolve(repoRoot, 'pnpm-lock.yaml')

interface VisualWorkflow {
  jobs?: {
    visual?: {
      container?: {
        image?: string
      }
    }
  }
}

interface PnpmLock {
  importers?: Record<
    string,
    {
      devDependencies?: Record<string, {version?: string}>
    }
  >
}

function readImageTag(): {version: string; digest: string | undefined} {
  const doc = parse(readFileSync(workflowPath, 'utf8')) as VisualWorkflow
  const image = doc.jobs?.visual?.container?.image
  expect(image, 'visual.yaml jobs.visual.container.image must exist').toBeDefined()
  const match = /^mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-noble(?:@(.+))?$/.exec(image!)
  expect(match, `image must be a digest-pinned playwright tag, got: ${image}`).toBeDefined()
  return {version: match![1]!, digest: match![2]}
}

function readLockfilePlaywright(): string {
  const doc = parse(readFileSync(lockfilePath, 'utf8')) as PnpmLock
  const version = doc.importers?.['.']?.devDependencies?.['@playwright/test']?.version
  expect(version, 'pnpm-lock.yaml root importer must resolve @playwright/test').toBeDefined()
  return version!
}

describe('visual gate image/lockfile parity (rm-881)', () => {
  it('container tag matches the lockfile-resolved @playwright/test version', () => {
    const {version} = readImageTag()
    const lockfile = readLockfilePlaywright()
    expect(
      version,
      `visual.yaml pins image v${version} but pnpm-lock.yaml resolves @playwright/test ${lockfile} — the visual container bundles a chromium build only for its own version; a split pair fails at browser launch. Bump the image tag+digest and the dependency together (see rm-142/rm-881).`,
    ).toBe(lockfile)
  })

  it('container image is digest-pinned, not tag-pinned', () => {
    const {digest} = readImageTag()
    expect(
      digest,
      'a mutable tag can be re-pushed under the same version, silently changing the render environment and invalidating baselines (rm-142 digest invariant)',
    ).toMatch(/^sha256:[0-9a-f]{64}$/)
  })
})
