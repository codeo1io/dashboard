#!/usr/bin/env node
// scripts/lint-shards.ts
//
// Shard map + exact-coverage assertion + per-shard eslint runner for the
// sharded CI Lint job (rm-294; run f91bcdc2c6f7 cycle-2 batch B1).
//
// Why shards: cold repo-wide eslint on the hosted runner pool measured
// 12m17s and 17m24s on green Main runs but 34m57s/34m59s — killed at the
// 35-minute rider — on the cancelled ones (Main runs 36738240926 /
// 36745792065 green vs 36743280222 / 36741217630 cancelled, 2026-09-30).
// A monolithic Lint job is flaky-under-ceiling; sharding bounds each job's
// exposure and its rider independently. package.json's `lint --cache` never
// helps in CI (nothing persists on hosted runners), so the work is sharded
// instead of cached.
//
// Commands:
//   node scripts/lint-shards.ts plan          coverage assert, then CI matrix JSON on stdout
//   node scripts/lint-shards.ts assert        coverage assert + report on stdout
//   node scripts/lint-shards.ts list          shard names, file counts, riders
//   node scripts/lint-shards.ts run <shard>   lint one shard; exit 1 on lint errors
//
// Coverage contract: the union of all shards' globs, expanded via
// `git ls-files` and intersected with the files eslint actually lints, must
// equal the repo lint set EXACTLY — every lintable tracked file is linted by
// exactly one shard. The lint set itself is derived authoritatively through
// the ESLint API (isPathIgnored over the tracked file list), so no mirrored
// extension/ignore list can drift: eslint.config.ts's ignores
// (web/**, .agents/**, .opencode/**, docs/{plans,solutions,brainstorms}/**,
// plus the config factory's defaults) are honored by construction.
//
// The `run` mode passes explicit file paths to ESLint#lintFiles from the repo
// root, so flat-config resolution is identical to `pnpm lint` — the same
// eslint.config.ts, the same parser overrides (e.g. the
// test/operator-runtime.test.ts web/tsconfig.json project override).

import {execFileSync} from 'node:child_process'
import {relative} from 'node:path'
import process from 'node:process'
import {ESLint} from 'eslint'

interface GlobSpec {pattern: string; rootOnly?: boolean; exclude?: string[]}

interface Shard {name: string; timeoutMinutes: number; globs: GlobSpec[]}

// Shard classes are cost classes, not just directories: type-aware TS
// (projectService program build dominates), markdown (regex-heavy; ROADMAP.md
// carries the rm-103 ~10KB single-line signals paragraph — the measured
// quadratic paragraph cliff, ledger #rm-103/2026-09-30 cliff note — so it is
// ISOLATED in its own shard and ridered for the cliff instead of letting it
// dominate every other markdown file), and fast config formats. Riders
// (timeoutMinutes) are sized from measured cold durations with headroom for
// the hosted pool's slow tail (12m17s/17m24s green vs >35m killed at the old
// whole-job rider, 2026-09-30) — see the rm-294 riders note in
// .github/workflows/main.yaml before re-sizing. When the rm-103 paragraph
// split lands, markdown-roadmap collapses to seconds and its rider can drop.
const SHARDS: Shard[] = [
  {
    name: 'server-src',
    timeoutMinutes: 15,
    globs: [{pattern: 'src/**'}],
  },
  {
    name: 'server-test',
    timeoutMinutes: 15,
    globs: [{pattern: 'test/**'}, {pattern: 'tests/**'}],
  },
  {
    name: 'markdown-docs',
    timeoutMinutes: 20,
    globs: [
      {pattern: 'docs/**'},
      // git pathspec globs cross '/' by default, so root anchoring is a
      // filter here rather than pathspec magic (:(glob,top) is unreliable).
      {pattern: '*.md', rootOnly: true, exclude: ['ROADMAP.md']},
      {pattern: 'assets/**'},
    ],
  },
  {
    // Whale shard: ROADMAP.md alone exceeded 900s of local cold lint under
    // delegate-host load (2026-09-30); isolate the cliff from the herd.
    name: 'markdown-roadmap',
    timeoutMinutes: 25,
    globs: [{pattern: 'ROADMAP.md'}],
  },
  {
    name: 'github-config',
    timeoutMinutes: 10,
    globs: [
      {pattern: '.github/**'},
      {pattern: '*.json', rootOnly: true},
      {pattern: '*.yaml', rootOnly: true},
      {pattern: '*.yml', rootOnly: true},
      {pattern: '.codex/**'},
      {pattern: '.impeccable/**'},
      {pattern: '.slim/**'},
      {pattern: 'public/**'},
    ],
  },
  {
    name: 'tooling-ts',
    timeoutMinutes: 10,
    globs: [{pattern: 'scripts/**'}, {pattern: '*.ts', rootOnly: true}],
  },
]

function usage(): number {
  console.error(
    'usage: node scripts/lint-shards.ts plan | assert | list | run <shard>\n' +
    `shards: ${SHARDS.map(s => s.name).join(', ')}`,
  )
  return 2
}

function expandGlob(glob: GlobSpec): string[] {
  const out = execFileSync('git', ['ls-files', '--', glob.pattern], {encoding: 'utf8'})
  let files = out.split('\n').filter(Boolean)
  if (glob.rootOnly === true) files = files.filter(f => !f.includes('/'))
  if (glob.exclude !== undefined) {
    const excluded = new Set(glob.exclude.flatMap(p => expandGlob({pattern: p})))
    files = files.filter(f => !excluded.has(f))
  }
  return files
}

function trackedFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '-z'], {encoding: 'utf8'})
  return out.split('\0').filter(Boolean)
}

async function makeLinter(): Promise<ESLint> {
  return new ESLint()
}

async function deriveLintSet(eslint: ESLint): Promise<string[]> {
  const lintable: string[] = []
  for (const file of trackedFiles()) {
    if (!(await eslint.isPathIgnored(file))) lintable.push(file)
  }
  return lintable.sort()
}

function shardFiles(shard: Shard, lintSet: Set<string>): string[] {
  const raw = shard.globs.flatMap(glob => expandGlob(glob))
  return [...new Set(raw)].filter(file => lintSet.has(file)).sort()
}

interface Coverage {
  ok: boolean
  lintSetSize: number
  counts: {name: string; files: number; timeoutMinutes: number}[]
  missing: string[]
  overlaps: string[]
  emptyShards: string[]
}

async function checkCoverage(eslint: ESLint): Promise<Coverage> {
  const lintSet = await deriveLintSet(eslint)
  const lintSetSet = new Set(lintSet)

  const rawOwner = new Map<string, string>()
  const overlaps = new Set<string>()
  const counts: Coverage['counts'] = []
  const emptyShards: string[] = []
  const union = new Set<string>()

  for (const shard of SHARDS) {
    for (const glob of shard.globs) {
      for (const file of expandGlob(glob)) {
        const owner = rawOwner.get(file)
        if (owner === undefined) {
          rawOwner.set(file, shard.name)
        } else if (owner !== shard.name) {
          overlaps.add(`${file} (${owner} + ${shard.name})`)
        }
      }
    }
    const files = shardFiles(shard, lintSetSet)
    if (files.length === 0) emptyShards.push(shard.name)
    for (const file of files) union.add(file)
    counts.push({name: shard.name, files: files.length, timeoutMinutes: shard.timeoutMinutes})
  }

  const missing = lintSet.filter(file => !union.has(file))
  return {
    ok: missing.length === 0 && overlaps.size === 0 && emptyShards.length === 0,
    lintSetSize: lintSet.length,
    counts,
    missing,
    overlaps: [...overlaps].sort(),
    emptyShards,
  }
}

function renderReport(cov: Coverage): string {
  const lines: string[] = []
  lines.push(`lint set (tracked, non-ignored per eslint.config.ts): ${cov.lintSetSize} files`)
  for (const c of cov.counts) {
    lines.push(`  shard ${c.name.padEnd(14)} ${String(c.files).padStart(3)} files   rider ${c.timeoutMinutes}m`)
  }
  const covered = cov.counts.reduce((sum, c) => sum + c.files, 0)
  lines.push(`covered by shards: ${covered}`)
  if (cov.missing.length > 0) {
    lines.push(`NOT COVERED (${cov.missing.length}) — add to a shard's globs:`)
    for (const file of cov.missing.slice(0, 50)) lines.push(`  ${file}`)
    if (cov.missing.length > 50) lines.push(`  … and ${cov.missing.length - 50} more`)
  }
  if (cov.overlaps.length > 0) {
    lines.push(`GLOBS OVERLAP (${cov.overlaps.length}) — a file would be linted twice:`)
    for (const o of cov.overlaps.slice(0, 50)) lines.push(`  ${o}`)
  }
  if (cov.emptyShards.length > 0) {
    lines.push(`EMPTY SHARDS: ${cov.emptyShards.join(', ')}`)
  }
  lines.push(
    cov.ok
      ? `coverage OK — union of shards == lint set, no overlaps, no empty shards`
      : 'coverage FAILED',
  )
  return lines.join('\n')
}

async function cmdAssert(): Promise<number> {
  const eslint = await makeLinter()
  const cov = await checkCoverage(eslint)
  console.log(renderReport(cov))
  return cov.ok ? 0 : 1
}

async function cmdPlan(): Promise<number> {
  const eslint = await makeLinter()
  const cov = await checkCoverage(eslint)
  // Diagnostics on stderr so stdout stays pure JSON for $GITHUB_OUTPUT.
  console.error(renderReport(cov))
  if (!cov.ok) return 1
  const matrix = {
    include: SHARDS.map(s => ({shard: s.name, timeout: s.timeoutMinutes})),
  }
  console.log(JSON.stringify(matrix))
  return 0
}

async function cmdList(): Promise<number> {
  const eslint = await makeLinter()
  const cov = await checkCoverage(eslint)
  console.log(renderReport(cov))
  const lintSet = new Set(await deriveLintSet(eslint))
  for (const shard of SHARDS) {
    console.log(`\n${shard.name} (${shard.timeoutMinutes}m):`)
    for (const file of shardFiles(shard, lintSet)) console.log(`  ${file}`)
  }
  return cov.ok ? 0 : 1
}

async function cmdRun(name: string): Promise<number> {
  const shard = SHARDS.find(s => s.name === name)
  if (shard === undefined) {
    console.error(`unknown shard: ${name}`)
    return usage()
  }
  const eslint = await makeLinter()
  const lintSet = new Set(await deriveLintSet(eslint))
  const files = shardFiles(shard, lintSet)
  if (files.length === 0) {
    console.error(`shard ${shard.name} expanded to 0 lintable files — refusing to no-op`)
    return 2
  }

  const started = Date.now()
  const results = await eslint.lintFiles(files)
  const durationSec = Math.round((Date.now() - started) / 100) / 10

  // Tripwire: eslint silently skips explicit paths that are ignored or match
  // no config block ("File ignored because …" warnings). If that ever
  // happens the coverage derivation above has drifted — fail loudly instead
  // of under-linting.
  const linted = new Set(results.map(r => relative(process.cwd(), r.filePath)))
  const skipped = files.filter(file => !linted.has(file))
  if (skipped.length > 0) {
    console.error(`eslint skipped ${skipped.length} file(s) passed explicitly — config drift:`)
    for (const file of skipped) console.error(`  ${file}`)
    return 2
  }

  const formatter = await eslint.loadFormatter('stylish')
  const output = await formatter.format(results)
  if (output.trim() !== '') process.stdout.write(output)

  const errors = results.reduce((sum, r) => sum + r.errorCount, 0)
  const warnings = results.reduce((sum, r) => sum + r.warningCount, 0)
  console.log(
    `shard ${shard.name}: ${files.length} files, ${errors} error(s), ${warnings} warning(s) ` +
    `in ${durationSec}s (rider ${shard.timeoutMinutes}m)`,
  )
  return errors > 0 ? 1 : 0
}

async function main(): Promise<number> {
  const [command, shardArg] = process.argv.slice(2)
  if (command === 'plan') return cmdPlan()
  if (command === 'assert') return cmdAssert()
  if (command === 'list') return cmdList()
  if (command === 'run') {
    if (shardArg === undefined) return usage()
    return cmdRun(shardArg)
  }
  return usage()
}

process.exitCode = await main()
