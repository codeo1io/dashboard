// rm-709 CI-failure alerting fence + cross-implementation HMAC proof
// (repository-maintenance cycle:1, run 69b161e1423d implement 5fd97511).
//
// The notify-listener jobs in .github/workflows/release.yaml and main.yaml POST
// an IngestMessage to POST /api/listener/ingest when a main-ref workflow fails,
// signed with `openssl dgst -sha256 -hmac` (CI has no Node in that job). This
// suite pins three things:
//   1. an openssl-computed signature passes the REAL verifier — cross-
//      implementation proof that any correct HMAC-SHA256 signer works;
//   2. createHmac matches the openssl pipeline byte-for-byte on the same input;
//   3. the workflow files keep the emitter invariants (main-ref-only gate,
//      sign-what-you-send, self-skip on unprovisioned secret/var, no-early-exit
//      awk) — the bash runs only on Actions runners, so its source is fenced
//      here like any other untestable generated surface.
// Also fences the rm-711 impeccable@4.1.0 design-check pin.

import {execFileSync} from 'node:child_process'
import {createHmac} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {parseIngestBody} from '../src/listener/contract.ts'
import {verifyIngestSignature} from '../src/listener/ingest-auth.ts'

const repoRoot = resolve(import.meta.dirname, '..')
const KEY = 'ci-failure-emitter-fence-key'
const TIMESTAMP = '1760000000'

// The exact message class the workflow jobs emit (jq -nc output shape).
const emittedBody = JSON.stringify({
  source: 'infra',
  kind: 'ci-failure',
  severity: 'critical',
  title: 'Release run #37689312795 (attempt 1) failed',
  body: 'Workflow Release on codeo1io/dashboard@main failed. Failed jobs: release. Full log at the run link.',
  links: [
    {label: 'Run log', url: 'https://github.com/codeo1io/dashboard/actions/runs/37689312795'},
  ],
  dedupeKey: 'ci-failure:codeo1io/dashboard:Release:37689312795',
  createdAt: '2026-10-08T05:00:00Z',
})

/** Byte-identical to the workflow pipeline: printf … | openssl dgst -sha256 -hmac | awk '{print $NF}'. */
function opensslHex(timestamp: string, rawBody: string): string {
  const digest = execFileSync('openssl', ['dgst', '-sha256', '-hmac', KEY], {
    input: `${timestamp}.${rawBody}`,
    encoding: 'utf8',
  })
  return digest.trim().split(/\s+/).at(-1) ?? ''
}

function jobBlock(yaml: string, job: string): string {
  const lines = yaml.split('\n')
  const start = lines.indexOf(`  ${job}:`)
  if (start === -1) return ''
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^ {2}\S[\w-]*:/.test(lines[i] ?? '')) {
      end = i
      break
    }
  }
  return lines.slice(start, end).join('\n')
}

describe('rm-709 CI-failure emitter ↔ listener ingest contract', () => {
  it('openssl CLI signature (the CI-side signer) passes the real verifier', () => {
    const result = verifyIngestSignature({
      key: KEY,
      rawBody: emittedBody,
      timestampHeader: TIMESTAMP,
      signatureHeader: `sha256=${opensslHex(TIMESTAMP, emittedBody)}`,
      nowSeconds: Number(TIMESTAMP),
    })
    expect(result.success).toBe(true)
  })

  it('createHmac equals the openssl pipeline byte-for-byte', () => {
    const nodeHex = createHmac('sha256', KEY)
      .update(`${TIMESTAMP}.${emittedBody}`)
      .digest('hex')
    expect(opensslHex(TIMESTAMP, emittedBody)).toBe(nodeHex)
  })

  it('the emitted message parses through the listener contract', () => {
    const parsed = parseIngestBody(JSON.parse(emittedBody))
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.kind).toBe('ci-failure')
  })
})

describe('rm-709 workflow fence: notify-listener jobs', () => {
  const cases = [
    {
      file: '.github/workflows/release.yaml',
      needs: 'needs: [guard, release]',
    },
    {
      file: '.github/workflows/main.yaml',
      needs: 'needs: [lint, design-check, check-types, test, check-workflows, test-scripts-load]',
    },
  ]

  for (const c of cases) {
    it(`${c.file} keeps the CI-failure alert emitter contract`, () => {
      const yaml = readFileSync(join(repoRoot, c.file), 'utf8')
      const job = jobBlock(yaml, 'notify-listener')
      expect(job, 'notify-listener job present').not.toBe('')
      expect(job).toContain(c.needs)
      // Main-ref failures only: PR-run failures stay conductor-owned.
      expect(job).toContain("if: failure() && github.ref == 'refs/heads/main'")
      // Sign-what-you-send: the exact string passed to --data-binary is what
      // the HMAC covers, with the timestamp and scheme the verifier expects.
      expect(job).toContain('openssl dgst -sha256 -hmac')
      expect(job).toContain("awk '{print $NF}'")
      expect(job).toContain('--data-binary "$BODY"')
      expect(job).toContain('-H "x-listener-timestamp: $TS"')
      expect(job).toContain('-H "x-listener-signature: sha256=$SIG"')
      // No early-exit awk anywhere in the job (the SIGPIPE class this repo
      // cured at release.yaml :480/:518 must not come back via copy-paste).
      expect([...job.matchAll(/awk '([^']*)'/g)].map(m => m[1] ?? '')).not.toContainEqual(
        expect.stringContaining('exit'),
      )
      // Message class matches the listener contract.
      expect(job).toContain("--arg source 'infra'")
      expect(job).toContain("--arg kind 'ci-failure'")
      // Self-skip when unprovisioned: never adds a red of its own.
      expect(job).toContain('DASHBOARD_LISTENER_INGEST_KEY')
      expect(job).toContain('DASHBOARD_LISTENER_INGEST_URL')
      expect(job).toContain('exit 0')
      // Provisioned-but-broken is a loud red, not a silent miss.
      expect(job).toContain('[ "$STATUS" != "202" ]')
    })
  }
})

describe('rm-711 design-check pin fence', () => {
  it('main.yaml pins impeccable@4.1.0 and AGENTS.md documents the same pin', () => {
    const mainYaml = readFileSync(join(repoRoot, '.github/workflows/main.yaml'), 'utf8')
    expect(mainYaml).toContain('impeccable@4.1.0 detect --json web/src web/privacy.html')
    expect(mainYaml).not.toContain('impeccable@3.2.1')
    const agents = readFileSync(join(repoRoot, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('impeccable@4.1.0')
    const config = JSON.parse(readFileSync(join(repoRoot, '.impeccable/config.json'), 'utf8')) as {
      detector?: {ignoreValues?: {rule?: string; value?: string; files?: string[]}[]}
    }
    const scoped = (config.detector?.ignoreValues ?? []).find(
      entry => entry.rule === 'flat-type-hierarchy' && entry.files?.includes('web/privacy.html'),
    )
    // The 4.x false positive on unbuilt Tailwind HTML stays suppressed
    // file-scoped — never rule-wide, never repo-wide.
    expect(scoped, 'file-scoped flat-type-hierarchy suppression present').toBeDefined()
  })
})
