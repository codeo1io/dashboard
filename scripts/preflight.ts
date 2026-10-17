#!/usr/bin/env node
// scripts/preflight.ts
//
// Local landing-preflight doctor (rm-1509, run fa1a9c89b26b4f588dde806ed872ec07).
//
// One CI-independent command that bundles every gate a landing batch must
// pass BEFORE the batch gate runs it again. Designed during the 2026-10
// Actions outage (rm-1437): while run-creation is dark for schedule triggers,
// local verification is load-bearing, so this doctor must work fully offline
// and never depend on Actions being reachable.
//
// Checks (each independent; one FAIL fails the run):
//   porcelain           tracked tree must be clean-or-intentional
//   conductor-untrack   no tracked .conductor breadcrumbs (landing trap)
//   typescript-server   tsc --noEmit (strip-only server tsconfig)
//   typescript-web      tsc --noEmit -p web/tsconfig.json
//   typescript-opencode tsc --noEmit -p .opencode/tsconfig.json
//   eslint              eslint --no-cache
//   roadmap-guards      vitest roadmap length + render guards
//   webdist-freshness   web/dist not older than any web/src input
//   clonedeps-lockstep  .slim/clonedeps.json resolvedVersion vs fro-bot pin
//                       (warning-class: mirrors the test/clonedeps-lockstep
//                       suite, rm-1510)
//   actionlint          container-form actionlint IF a container runtime is
//                       present (warn-skip otherwise — see the runbook recipe)
//
// Usage:
//   node scripts/preflight.ts [--skip=tsc,eslint,...] [--list]
//
// Exit code 0 = every check ok (warns allowed); 1 = at least one failure.
// This script performs no repository writes and no network access.

import {spawnSync} from 'node:child_process'
import {existsSync, readdirSync, statSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

type CheckResult = 'ok' | 'warn' | 'fail'

interface CheckOutcome {readonly status: CheckResult; readonly note: string}

interface Check {
  readonly name: string
  readonly detail: string
  run: () => CheckOutcome
}

function cmd(binary: string, args: readonly string[]): {readonly code: number; readonly out: string} {
  const proc = spawnSync(binary, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 600_000,
  })
  return {code: proc.status ?? -1, out: `${proc.stdout ?? ''}${proc.stderr ?? ''}`}
}

const PNPM = 'pnpm'

const checks: Check[] = [
  {
    name: 'porcelain',
    detail: 'tracked tree state (informational: lists drift, never fails)',
    run: () => {
      const {code, out} = cmd('git', ['status', '--porcelain'])
      if (code !== 0) return {status: 'fail', note: `git status failed: ${out.trim()}`}
      if (out.trim() === '') return {status: 'ok', note: 'clean'}
      return {status: 'ok', note: `${out.trim().split('\n').length} path(s): ${out.trim()}`}
    },
  },
  {
    name: 'conductor-untrack',
    detail: 'no tracked .conductor breadcrumbs (post-merge landing trap)',
    run: () => {
      const {code, out} = cmd('git', ['ls-files', '.conductor'])
      if (code !== 0) return {status: 'fail', note: `git ls-files failed: ${out.trim()}`}
      if (out.trim() === '') return {status: 'ok', note: 'no tracked breadcrumbs'}
      return {status: 'fail', note: `tracked: ${out.trim().replaceAll('\n', ', ')}`}
    },
  },
  {
    name: 'typescript-server',
    detail: 'tsc --noEmit (server strip-only)',
    run: () => {
      const {code, out} = cmd(PNPM, ['exec', 'tsc', '--noEmit'])
      return code === 0
        ? {status: 'ok', note: ''}
        : {status: 'fail', note: out.trim().split('\n').slice(-5).join(' | ')}
    },
  },
  {
    name: 'typescript-web',
    detail: 'tsc --noEmit -p web/tsconfig.json',
    run: () => {
      const {code, out} = cmd(PNPM, ['exec', 'tsc', '--noEmit', '-p', 'web/tsconfig.json'])
      return code === 0
        ? {status: 'ok', note: ''}
        : {status: 'fail', note: out.trim().split('\n').slice(-5).join(' | ')}
    },
  },
  {
    name: 'typescript-opencode',
    detail: 'tsc --noEmit -p .opencode/tsconfig.json',
    run: () => {
      const {code, out} = cmd(PNPM, ['exec', 'tsc', '--noEmit', '-p', '.opencode/tsconfig.json'])
      return code === 0
        ? {status: 'ok', note: ''}
        : {status: 'fail', note: out.trim().split('\n').slice(-5).join(' | ')}
    },
  },
  {
    name: 'eslint',
    detail: 'eslint --no-cache (repo-wide)',
    run: () => {
      const {code, out} = cmd(PNPM, ['exec', 'eslint', '--no-cache'])
      return code === 0
        ? {status: 'ok', note: ''}
        : {status: 'fail', note: out.trim().split('\n').slice(-5).join(' | ')}
    },
  },
  {
    name: 'roadmap-guards',
    detail: 'vitest roadmap length + render guards',
    run: () => {
      const {code, out} = cmd(PNPM, [
        'exec',
        'vitest',
        'run',
        'test/roadmap-length-guard.test.ts',
        'test/roadmap-render-guard.test.ts',
      ])
      return code === 0
        ? {status: 'ok', note: ''}
        : {status: 'fail', note: out.trim().split('\n').slice(-5).join(' | ')}
    },
  },
  {
    name: 'webdist-freshness',
    detail: 'web/dist not older than any web/src input (pretest 404 trap)',
    run: () => {
      const distDir = join(REPO_ROOT, 'web', 'dist')
      const srcDir = join(REPO_ROOT, 'web', 'src')
      if (!existsSync(distDir)) {
        return {status: 'warn', note: 'web/dist absent — build before running suites that hit /'}
      }
      let newestInput = 0
      let newestPath = ''
      const walk = (dir: string): void => {
        for (const entry of readdirSync(dir, {withFileTypes: true})) {
          const full = join(dir, entry.name)
          if (entry.isDirectory()) walk(full)
          else if (/\.(?:ts|tsx|css|html)$/.test(entry.name)) {
            const mtime = statSync(full).mtimeMs
            if (mtime > newestInput) {
              newestInput = mtime
              newestPath = full.slice(REPO_ROOT.length + 1)
            }
          }
        }
      }
      walk(srcDir)
      const walkOut = (dir: string, pick: (mtime: number, path: string) => void): void => {
        for (const entry of readdirSync(dir, {withFileTypes: true})) {
          const full = join(dir, entry.name)
          if (entry.isDirectory()) walkOut(full, pick)
          else pick(statSync(full).mtimeMs, full)
        }
      }
      let newestOutput = 0
      walkOut(distDir, (mtime, _path) => {
        if (mtime > newestOutput) newestOutput = mtime
      })
      if (newestOutput >= newestInput) return {status: 'ok', note: 'web/dist newer than inputs'}
      return {
        status: 'fail',
        note: `web/dist stale vs ${newestPath} — rebuild (pnpm build:web) before vitest suites that hit /`,
      }
    },
  },
  {
    name: 'clonedeps-lockstep',
    detail: '.slim/clonedeps.json resolvedVersion vs fro-bot.yaml pin (rm-1510)',
    run: () => {
      const {code, out} = cmd(PNPM, ['exec', 'vitest', 'run', 'test/clonedeps-lockstep.test.ts'])
      // Warning-class by design (rm-1510): a drifted mirror degrades gateway
      // source inspection, it does not break the build — surface it loudly
      // without failing a landing that is otherwise green.
      return code === 0
        ? {status: 'ok', note: ''}
        : {
            status: 'warn',
            note: out.trim().split('\n').slice(-5).join(' | '),
          }
    },
  },
  {
    name: 'actionlint',
    detail: 'actionlint via container form (see docs/solutions runbook)',
    run: () => {
      const runtime = ['docker', 'podman'].find(binary => cmd(binary, ['--version']).code === 0)
      if (runtime === undefined) {
        return {
          status: 'warn',
          note: 'no container runtime — run actionlint container form before landing workflow edits',
        }
      }
      const {code, out} = cmd(runtime, [
        'run',
        '--rm',
        '-v',
        `${REPO_ROOT}:/repo`,
        '-w',
        '/repo',
        'rhysd/actionlint:latest',
        '-color',
      ])
      return code === 0
        ? {status: 'ok', note: ''}
        : {status: 'fail', note: out.trim().split('\n').slice(-5).join(' | ')}
    },
  },
]

const argv = process.argv.slice(2)
if (argv.includes('--list')) {
  for (const check of checks) console.log(`${check.name}\t${check.detail}`)
  process.exit(0)
}
const skipFlag = argv.find(arg => arg.startsWith('--skip='))
const skipped = skipFlag === undefined ? [] : skipFlag.slice('--skip='.length).split(',')

let failed = 0
let warned = 0
for (const check of checks) {
  if (skipped.includes(check.name)) {
    console.log(`SKIP   ${check.name}`)
    continue
  }
  const result = check.run()
  const label = result.status === 'ok' ? 'ok' : result.status === 'warn' ? 'WARN' : 'FAIL'
  if (result.status === 'fail') failed += 1
  if (result.status === 'warn') warned += 1
  console.log(`${label.padEnd(5)}  ${check.name}${result.note === '' ? '' : ` — ${result.note}`}`)
}

console.log(`\npreflight: ${checks.length - skipped.length} checks, ${failed} failed, ${warned} warned`)
process.exit(failed > 0 ? 1 : 0)
