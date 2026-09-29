import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-179 repair rider (2026-09-29, run c1a9e791 batch B1): the GraphQL
// canary's ONLY scheduled fire (36417620616, 2026-09-28) died in ~1s on
// `Cannot find package '@bfra.me/es' imported from src/result.ts` — the
// workflow's "no install needed" premise was false from birth. The canary
// script imports src/github/aggregator.ts for the EXACT registered template
// set (rm-225's point: the canary must execute the shipped query, not a
// copy), and that module graph reaches a production dependency at runtime:
//
//   scripts/graphql-canary.ts:24 → import REPO_STATUS_QUERY_REGISTRY
//   src/github/aggregator.ts:32  → import {isErr, isOk} from '../result.ts'
//   src/result.ts:12             → export {…} from '@bfra.me/es/result'
//
// This guard pins the FIX from both sides, text-parsed (same style as
// test/release-trigger-paths.test.ts — seconds of Node, no workflow
// execution): (1) the workflow installs dependencies before running the
// script, (2) the install actually comes from a composite that installs
// (guards against a hollow `./.github/actions/setup`), and (3) the
// import-chain premise still holds — if a future change decouples the
// chain, this test fails so the workflow and the guard get edited
// TOGETHER (the two-landed-guards lesson), never one without the other.

const repoRoot = process.cwd()

const canaryWorkflowPath = resolve(repoRoot, '.github/workflows/canary.yaml')
const setupActionPath = resolve(repoRoot, '.github/actions/setup/action.yaml')
const canaryScriptPath = resolve(repoRoot, 'scripts/graphql-canary.ts')
const aggregatorPath = resolve(repoRoot, 'src/github/aggregator.ts')
const resultPath = resolve(repoRoot, 'src/result.ts')

const canaryWorkflow = readFileSync(canaryWorkflowPath, 'utf8')
const setupAction = readFileSync(setupActionPath, 'utf8')
const canaryScript = readFileSync(canaryScriptPath, 'utf8')
const aggregator = readFileSync(aggregatorPath, 'utf8')
const resultModule = readFileSync(resultPath, 'utf8')

/** Line number (1-based) of the first non-comment line matching `needle`. */
function firstLine(text: string, needle: string): number {
  // Comment-stripped parse (rm-248 lesson): the workflow's OWN explanatory
  // comments may name `pnpm install` or the composite path — a comment can
  // never satisfy the invariant. Proved necessary 2026-09-29: this guard's
  // first draft passed vacuously against a workflow whose install step had
  // been stripped, because the fix's comment mentioned `pnpm install`.
  const idx = text
    .split('\n')
    .findIndex(line => !line.trimStart().startsWith('#') && line.includes(needle))
  return idx === -1 ? -1 : idx + 1
}

describe('canary workflow installs dependencies before running (rm-179)', () => {
  it('runs the canary script via `node scripts/graphql-canary.ts`', () => {
    // Non-vacuity anchor: if the run step moves or is rewritten, the
    // install-before-run ordering below must be re-derived, not vacuously
    // pass.
    expect(firstLine(canaryWorkflow, 'node scripts/graphql-canary.ts')).toBeGreaterThan(0)
  })

  it('uses a dependency-install step before the script runs', () => {
    // The house composite (pnpm + Node 24 + `pnpm install --frozen-lockfile`).
    // An explicit `run: pnpm install …` step would satisfy the same
    // invariant; the guard accepts either so the fix is not coupled to one
    // spelling. Both matches run against comment-stripped text, so naming
    // them in a workflow comment cannot satisfy the guard.
    const compositeUse = firstLine(canaryWorkflow, 'uses: ./.github/actions/setup')
    const explicitInstall = firstLine(canaryWorkflow, 'run: pnpm install')
    const installLine =
      compositeUse === -1 ? explicitInstall : compositeUse === -1 ? -1 : compositeUse
    expect(installLine).toBeGreaterThan(0)

    const runLine = firstLine(canaryWorkflow, 'node scripts/graphql-canary.ts')
    expect(installLine).toBeLessThan(runLine)
  })

  it('the setup composite is not hollow (it really installs)', () => {
    // Guards the other half of the fix: swapping the setup step to a
    // composite that no longer installs would silently restore the dead
    // canary while keeping the workflow text green here.
    expect(firstLine(setupAction, 'pnpm install --frozen-lockfile')).toBeGreaterThan(0)
  })

  it('documents why install is required: the import chain reaches a prod dep', () => {
    // (3) the premise. Runtime (non-`import type`) edges only — a future
    // move to `import type` would make the chain type-only and Node would
    // not need @bfra.me/es at runtime; that is exactly the paired edit
    // this guard exists to force (workflow + guard together).
    expect(canaryScript).toContain("from '../src/github/aggregator.ts'")
    expect(aggregator).toContain("import {isErr, isOk} from '../result.ts'")
    expect(resultModule).toContain("from '@bfra.me/es/result'")
  })
})
