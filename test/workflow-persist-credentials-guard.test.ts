import {readFileSync, readdirSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'

// rm-527 structural guard: every `actions/checkout` step in the workflow tree
// must set `persist-credentials` explicitly. The workflow GITHUB_TOKEN is
// otherwise persisted into `.git/config` for every later step in the job.
// `false` is the default posture for read-only jobs; fro-bot.yaml's
// intentionally-conditional expression (withhold on review paths, keep on
// schedule/dispatch for branch-pr delivery) also satisfies the guard — the
// property under protection is that the key is PRESENT and deliberate, not
// that it holds one literal value.
const WORKFLOWS_DIR = join(import.meta.dirname, '..', '.github', 'workflows')

interface CheckoutStep {
  file: string
  line: number
  hasPersistCredentials: boolean
}

function scanWorkflowCheckouts(file: string, source: string): CheckoutStep[] {
  const lines = source.split('\n')
  const steps: CheckoutStep[] = []
  for (let i = 0; i < lines.length; i++) {
    const usesMatch = /^(\s*)uses:\s*actions\/checkout@/.exec(lines[i])
    if (!usesMatch) continue
    const stepIndent = usesMatch[1].length
    let hasPersistCredentials = false
    let j = i + 1
    while (j < lines.length) {
      const line = lines[j]
      if (line.trim() === '') {
        j++
        continue
      }
      const indentMatch = /^(\s*)\S/.exec(line)
      const indent = indentMatch ? indentMatch[1].length : 0
      // Step keys (`with:` …) sit at the SAME indent as `uses:`; their children
      // are deeper. A shallower line (next step / job key) ends the step block.
      if (indent < stepIndent) break
      if (/^\s*persist-credentials:/.test(line)) hasPersistCredentials = true
      j++
    }
    steps.push({file, line: i + 1, hasPersistCredentials})
  }
  return steps
}

describe('workflow checkout credential persistence guard (rm-527)', () => {
  it('every actions/checkout step sets persist-credentials explicitly', () => {
    const workflowFiles = readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    expect(workflowFiles.length).toBeGreaterThan(0)

    const allSteps = workflowFiles.flatMap((file) =>
      scanWorkflowCheckouts(file, readFileSync(join(WORKFLOWS_DIR, file), 'utf8')),
    )

    // The scan must actually see the workflow tree (16 checkout steps at the
    // time of writing); a silent scan regression would otherwise pass vacuously.
    expect(allSteps.length).toBeGreaterThanOrEqual(16)

    const missing = allSteps.filter((s) => !s.hasPersistCredentials)
    expect(
      missing.map((s) => `${s.file}:${s.line}`),
      'actions/checkout steps missing an explicit persist-credentials key',
    ).toEqual([])
  })
})
