import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'
import {parse} from 'yaml'

// rm-207 (cycle-17 batch, 2026-09-25): the visual gate is path-filtered on
// pull_request, and the filter had narrowed to web/src/** + tests/visual/** +
// the config files — while the fixture server serves `public/` (the ~3k-line
// operator runtime at /operator/*) and the SPA shell `web/index.html`. A
// visually-material change to those surfaces merged without ever triggering
// the pixel+axe gate. This guard pins the coverage set so a future paths edit
// (or a new served surface) cannot silently escape the gate again. Sibling of
// test/dockerfile-context.test.ts (rm-132/rm-186 context-seal guards).

const repoRoot = process.cwd()
const workflowPath = resolve(repoRoot, '.github/workflows/visual.yaml')

interface VisualWorkflow {
  on?: {
    pull_request?: {
      paths?: string[]
    }
  }
}

// Every non-test surface the fixture server serves or that shapes the rendered
// page. `public/**` is the operator runtime; `web/index.html` is the SPA shell;
// `web/vite.config.ts` was in the original filter and must not regress away
// again; `web/src/**` is the app source; the rest are the suite's own files.
const REQUIRED_PATHS = [
  'web/src/**',
  'web/index.html',
  'web/vite.config.ts',
  'public/**',
  'tests/visual/**',
  'playwright.config.ts',
  '.github/workflows/visual.yaml',
] as const

function readPathsFilter(): string[] {
  const doc = parse(readFileSync(workflowPath, 'utf8')) as VisualWorkflow
  const paths = doc.on?.pull_request?.paths
  expect(paths, 'visual.yaml pull_request.paths must exist').toBeDefined()
  return paths ?? []
}

describe('visual gate paths coverage (rm-207)', () => {
  it('covers every non-test surface the fixture server serves', () => {
    const paths = readPathsFilter()
    for (const required of REQUIRED_PATHS) {
      expect(
        paths,
        `visual gate pull_request.paths must include '${required}' — its absence lets changes to that surface skip the pixel+axe gate`,
      ).toContain(required)
    }
  })

  it('does not filter away the operator runtime via a stray negation', () => {
    const paths = readPathsFilter()
    const negations = paths.filter(p => p.startsWith('!'))
    expect(
      negations,
      'unexpected negation entries — every !pattern here re-opens an escape hatch from the visual gate',
    ).toEqual([])
  })
})
