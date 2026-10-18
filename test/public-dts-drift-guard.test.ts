import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {pathToFileURL} from 'node:url'
import {describe, expect, it} from 'vitest'

/**
 * rm-1462: public/*.d.ts ↔ .js drift guard.
 *
 * public/operator-{stream,launch,run-index}.d.ts are hand-maintained type
 * declarations for the vendored operator runtime .js sitting next to them.
 * web/tsconfig.json deliberately excludes public/ from type-checking and no
 * other gate reads the .d.ts, so a silent edit to either half used to drift
 * undetected until operator build breakage. This guard pins the VALUE-export
 * surface of each pair:
 *
 *  - every `export declare function|const|class|let|var NAME` in the .d.ts
 *    must exist as a runtime export key of the sibling .js;
 *  - every runtime export key must either be declared in the .d.ts or appear
 *    in the pinned ALLOWED_UNDECLARED allowlist below (documented pre-existing
 *    drift, recorded by run 7a0e2163 on 2026-10-16 — repairing the vendored
 *    declarations is a separate change unit per the stewardship contract);
 *  - allowlist entries must still exist at runtime, so the allowlist cannot
 *    go stale: shrinking it is always allowed, growing it is always a test
 *    failure away from a deliberate decision;
 *  - type-only declaration NAMES (export type/interface) are pinned as sorted
 *    lists, so any add, remove, or RENAME requires a deliberate guard update
 *    (rm-1976: the count-only pin went stale within a day — a rename keeps the
 *    count and passes silently, and public/ is excluded from web type-checking
 *    above, so nothing else would catch it).
 */
const repoRoot = process.cwd()

const PAIRS = [
  'operator-stream',
  'operator-launch',
  'operator-run-index',
] as const

/**
 * Runtime exports known to be missing from their .d.ts at guard birth
 * (2026-10-16, base 3e3664c). Each entry is pre-existing drift carried
 * deliberately — the guard fails on any NEW undeclared export and on any
 * allowlisted name that disappears.
 */
const ALLOWED_UNDECLARED: Readonly<Record<string, readonly string[]>> = {
  'operator-stream': ['APPROVAL_FETCH_TIMEOUT_MS'],
  'operator-launch': [],
  'operator-run-index': ['formatRelativeTime', 'markCardExpandedForLaunch'],
}

/**
 * Pinned type-only declaration NAMES, sorted (rm-1976). Sorted lists rather
 * than counts: a rename keeps every count and would pass silently while
 * breaking every downstream importer of the old name. Derived from the .d.ts
 * content at base 505cc466 (== origin/main's d.ts at mint time: stream 32
 * type + 35 interface, run-index 4 type — matching main's post-d2a976dc count
 * bump that this base's stale 31/34 + 3 pin predates).
 */
const TYPE_ONLY_NAMES: Readonly<
  Record<string, {readonly type: readonly string[]; readonly interface: readonly string[]}>
> = {
  'operator-stream': {
    type: [
      'ApprovalFrameData', 'CancelControlState', 'CancelRunError', 'CancelRunOutcome',
      'CancelTerminalPhase', 'CheckoutHead', 'CheckoutLayoutReason', 'CheckoutObstructionKind',
      'CheckoutOperation', 'CheckoutPreparation', 'CheckoutPreparationRefused',
      'CheckoutProvenance', 'CheckoutRefusalReason', 'CheckoutRemote',
      'CheckoutUpdateFailureReason', 'CheckoutWorktree', 'ConnectionStatus', 'FailureKind',
      'OperatorWebStatus', 'QuestionDecision', 'QuestionDecisionOutcome',
      'QuestionDecisionState', 'QuestionFrameData', 'QuestionInvalidReason',
      'QuestionListResult', 'QuestionRequestStatus', 'RunPhase', 'RunSummaryStatus',
      'SseParseResult', 'StreamConnectionStatus', 'StreamEvent', 'StreamFrame',
    ],
    interface: [
      'ApprovalClient', 'ApprovalFrameDataOpen', 'ApprovalFrameDataSettle',
      'ApprovalReconcileEvent', 'CancelActionEvent', 'CancelClient', 'CancelClientLogger',
      'CancelControlClient', 'CancelControlHandle', 'CancelRunResult', 'CheckoutBoundedList',
      'CheckoutPreparationFailed', 'FinishedRunRecord', 'InitOptions', 'OutputFrameData',
      'QuestionClaimedEvent', 'QuestionClient', 'QuestionFrameDataOpen', 'QuestionFrameDataSettle',
      'QuestionNote', 'QuestionOption', 'QuestionPageRecord', 'QuestionPrompt',
      'QuestionReconcileEvent', 'QuestionReconcileResetEvent', 'QuestionRequest',
      'QuestionRequestView', 'QuestionResolvedEvent', 'ReadyFrameData', 'ResetFrameData',
      'RunEntry', 'SafeRunView', 'StatusFrameData', 'StreamHandle', 'StreamState',
    ],
  },
  'operator-launch': {
    type: ['LaunchOutcome'],
    interface: ['LaunchClient', 'PendingCardHooks'],
  },
  'operator-run-index': {
    type: ['FailureKind', 'RunIndexInitOutcome', 'RunIndexResult', 'RunSummaryStatus'],
    interface: ['ParsedRunSummary', 'RunSafeView'],
  },
}

interface DeclaredExports {
  readonly values: string[]
  readonly typeOnly: {readonly type: string[]; readonly interface: string[]}
}

function parseDeclaredExports(source: string): DeclaredExports {
  const values: string[] = []
  const typeNames: string[] = []
  const interfaceNames: string[] = []
  for (const match of source.matchAll(
    /^export (?:declare )?(function|const|class|let|var|type|interface) ([\w$]+)/gm,
  )) {
    const [, kind, name] = match
    if (kind === undefined || name === undefined) continue
    if (kind === 'type') typeNames.push(name)
    else if (kind === 'interface') interfaceNames.push(name)
    else values.push(name)
  }
  return {values, typeOnly: {type: typeNames, interface: interfaceNames}}
}

describe('public/*.d.ts ↔ .js value-export parity (rm-1462)', () => {
  for (const base of PAIRS) {
    it(`${base}: declared value exports match runtime exports`, async () => {
      const dtsPath = resolve(repoRoot, 'public', `${base}.d.ts`)
      const jsPath = resolve(repoRoot, 'public', `${base}.js`)
      const declared = parseDeclaredExports(readFileSync(dtsPath, 'utf8'))

      const runtimeModule = (await import(pathToFileURL(jsPath).href)) as Record<string, unknown>
      const runtimeKeys = Object.keys(runtimeModule)

      const missingAtRuntime = declared.values.filter(
        name => !runtimeKeys.includes(name),
      )
      expect(
        missingAtRuntime,
        `${base}.d.ts declares value exports absent from ${base}.js (stale declaration):`,
      ).toEqual([])

      const allowed = ALLOWED_UNDECLARED[base] ?? []
      const undeclared = runtimeKeys.filter(
        name =>
          !declared.values.includes(name) && !allowed.includes(name),
      )
      expect(
        undeclared,
        `${base}.js exports runtime values missing from ${base}.d.ts (new drift — either declare them or make a deliberate allowlist decision):`,
      ).toEqual([])

      const staleAllowlist = allowed.filter(
        name => !runtimeKeys.includes(name),
      )
      expect(
        staleAllowlist,
        `${base}: allowlist names that no longer exist at runtime (shrink the allowlist):`,
      ).toEqual([])

      expect(
        {
          type: [...declared.typeOnly.type].sort(),
          interface: [...declared.typeOnly.interface].sort(),
        },
        `${base} type-only declaration names changed (deliberate update required — add/remove/rename must edit the pinned list):`,
      ).toEqual(TYPE_ONLY_NAMES[base])
    })
  }
})
