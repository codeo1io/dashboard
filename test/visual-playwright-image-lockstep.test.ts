import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// Visual-gate lockstep between the npm Playwright pin and the pinned render
// image (rm-142 / rm-760). The visual job runs inside a digest-pinned
// mcr.microsoft.com/playwright image whose /ms-playwright browsers match the
// @playwright/test version that produced the committed baselines. Playwright
// hard-refuses to launch when the two disagree:
//
//   Error: browserType.launch: Executable doesn't exist at
//   /ms-playwright/chromium_headless_shell-1248/...
//   Looks like Playwright was just updated to 1.64.0.
//   Please update docker image as well.
//
// Live instance (2026-10-16): the Oct-11 lockfile-regen doctrine
// (`pnpm --lockfile-only`) floated the caret specifier `^1.63.0` to
// @playwright/test 1.64.0 while visual.yaml still pinned the v1.63.0 image —
// every visual run since (including origin/main's own push 9fead35 and this
// run's CI validation) went red before a single test executed, with a failure
// that looks like a rendering regression but is pure environment skew.
//
// This guard fails on BOTH shapes of that drift, at `pnpm test` time (a Main
// required check) instead of at visual-run time (report-only by design):
//   1. the specifier is not an exact pin, so a lockfile regen can float it
//      away from the image again;
//   2. package.json, pnpm-lock.yaml and the visual.yaml image disagree.
// Bumping Playwright therefore means bumping all three together (image tag +
// digest first per rm-142, then regenerate baselines) — which is exactly the
// rm-760 double gate ("mcr digest unverifiable + visual lockstep").

const repoRoot = process.cwd()

/** The mcr playwright image reference pinned as the visual render container. */
const IMAGE_PATTERN = /image:\s*mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-[^\s@]+@sha256:([0-9a-f]{64})/

interface PlaywrightPins {
  readonly specifier: string
  readonly imageVersion: string | undefined
  readonly imageDigest: string | undefined
  readonly lockfileSpecifier: string | undefined
  readonly lockfileVersion: string | undefined
}

function readPins(): PlaywrightPins {
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
    devDependencies?: Record<string, string>
  }
  const visualYaml = readFileSync(resolve(repoRoot, '.github/workflows/visual.yaml'), 'utf8')
  // bun.lock (since upstream #648): the root importer's devDependencies map
  // carries the exact specifier; the package table carries the resolved pin.
  const lockfile = readFileSync(resolve(repoRoot, 'bun.lock'), 'utf8')

  const image = IMAGE_PATTERN.exec(visualYaml)
  const lockSpecifierEntry = /"@playwright\/test": "([^"]+)"/.exec(lockfile)
  const lockResolvedEntry = /"@playwright\/test@([^"]+)"/.exec(lockfile)

  return {
    specifier: pkg.devDependencies?.['@playwright/test'] ?? '',
    imageVersion: image?.[1],
    imageDigest: image?.[2],
    lockfileSpecifier: lockSpecifierEntry?.[1]?.trim(),
    lockfileVersion: lockResolvedEntry?.[1]?.trim(),
  }
}

/** Strip npm range operators so a caret/tilde spec is compared as its floor. */
function floorVersion(specifier: string): string {
  return specifier.replace(/^[\^~>=<\s]+/, '').trim()
}

describe('Visual-gate Playwright lockstep (rm-142 / rm-760)', () => {
  const pins = readPins()

  it('finds a digest-pinned playwright render image in visual.yaml', () => {
    // Sanity anchor: a missing/undigested pin means the parser broke or the
    // rm-142 digest doctrine was dropped — either way this guard is blind.
    expect(pins.imageVersion, 'visual.yaml must pin mcr.microsoft.com/playwright:<version>@sha256:<digest>').toBeDefined()
    expect(pins.imageDigest, 'the visual render image must stay digest-pinned (rm-142)').toMatch(/^[0-9a-f]{64}$/)
  })

  it('pins @playwright/test exactly, so a lockfile regen cannot float it off the image', () => {
    expect(
      pins.specifier,
      `@playwright/test must be an exact pin (got '${pins.specifier}') — a range specifier lets 'pnpm --lockfile-only' resolve a newer Playwright than the pinned visual image, reddening the gate before any test runs`,
    ).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('package.json, pnpm-lock.yaml and the visual image agree on one Playwright version', () => {
    expect(pins.lockfileVersion, 'bun.lock must resolve @playwright/test for the root importer').toBeDefined()
    const versions = [floorVersion(pins.specifier), pins.lockfileVersion ?? '', pins.imageVersion ?? '']
    expect(
      new Set(versions).size,
      `Playwright versions must be lockstepped across package.json (${versions[0]}), pnpm-lock.yaml (${versions[1]}) and the visual.yaml image (${versions[2]}) — bump all three together (image tag+digest, then baselines) per the rm-760 double gate`,
    ).toBe(1)
  })

  it('the lockfile specifier mirrors package.json', () => {
    expect(
      pins.lockfileSpecifier,
      'bun.lock must record the same @playwright/test specifier package.json declares',
    ).toBe(pins.specifier)
  })
})
