/**
 * rm-624: GraphQL deprecation watch over the registered query templates.
 *
 * Origin: 2026-10-04, run aa303cabed3e (roadmap mint rm-624; convergent with
 * the unlanded rm-359 from sibling run fa70a92c8347 — this implementation
 * satisfies both acceptances). The reality canary (rm-179/rm-225) proves the
 * templates still EXECUTE; this pass proves GitHub has not DEPRECATED any
 * name they reference. Green CI over broken reality happened twice before
 * (rm-177/rm-178) — deprecation is the same failure class one step earlier:
 * GitHub deprecates a field, weeks later removes it, and the first signal is
 * a production 500. Baseline: live introspection 2026-10-04 shows zero
 * deprecated fields across all five watched types.
 *
 * Zero-import by design (rm-288 law, same as query-registry.ts): only type
 * imports and pure functions with an INJECTED fetch — importing this from
 * the canary must never pull the aggregator's `@bfra.me/es` chain.
 *
 * Superset semantics (deliberate, disclosed): a finding fires when a
 * deprecated FIELD name on a watched type matches any field OR argument name
 * referenced by any registered template. GraphQL field names are not
 * namespaced, so a match can be a different type's same-named field — the
 * failure message carries type + reason so a human adjudicates; the watch
 * never misses. Argument-level deprecation (deprecationReason on an arg) is
 * NOT checked: introspecting args needs a per-field __type walk that cannot
 * fit the 2-types-per-query cap below; the name-superset check covers the
 * field side, which is what removal breaks first.
 */
import type {RegisteredQueryTemplate} from './query-registry.ts'

/** The five types the shipped templates select from (pinned 2026-10-04). */
export const WATCHED_QUERY_TYPES = [
  'Repository',
  'Commit',
  'CheckSuite',
  'CheckRun',
  'WorkflowRun',
] as const

/**
 * GitHub's live API caps introspection at 2 aliased `__type` field selections
 * per query (INTROSPECTION_LIMIT_EXCEEDED above that, live-verified
 * 2026-10-04) — watched types are batched accordingly.
 */
export const INTROSPECTION_TYPES_PER_QUERY = 2

/** One deprecated name a registered template still references. */
export interface DeprecationFinding {
  /** Watched type carrying the deprecated field. */
  readonly type: string
  /** Deprecated field name. */
  readonly field: string
  /** GitHub's deprecation reason (the removal schedule, when given). */
  readonly reason: string | null
  /** Registry entry names referencing the name (sorted). */
  readonly referencedBy: readonly string[]
}

/** Minimal fetch shape the watch needs — injectable for the offline test. */
export type FetchLike = (
  url: string,
  init: {readonly method: 'POST'; readonly headers: Record<string, string>; readonly body: string},
) => Promise<{readonly status: number; json: () => Promise<unknown>}>

const GRAPHQL_KEYWORDS = new Set(['query', 'on', 'fragment', 'mutation', 'subscription'])
const OPERATION_KEYWORDS = new Set(['query', 'fragment', 'mutation', 'subscription'])

/**
 * Extracts the field and argument names a template references: strips `#`
 * comments, then walks identifiers with paren/input-object depth tracking so
 * that argument names (`states:`, `first:`, `filterBy:`) land in `args`,
 * input-object keys (`status:` inside `filterBy: {…}`) and enum literals
 * (`OPEN`, `COMPLETED`) are discarded, aliases (`alias: field`) resolve to
 * the real field, `… on Commit` type names and the operation name
 * (`query RepoStatus`) are skipped, and nested selections are all captured.
 */
export function extractReferencedNames(query: string): {
  readonly fields: Set<string>
  readonly args: Set<string>
} {
  const text = query.replaceAll(/#[^\n]*/g, '')
  const tokens = text.match(/[A-Z_]\w*|\$[A-Z_]\w*|[(){}:,.![\]]/gi) ?? []
  const fields = new Set<string>()
  const args = new Set<string>()

  let parenDepth = 0
  let inputObjectDepth = 0 // brace depth INSIDE parens (filterBy: {…})
  let pendingIdent: string | null = null
  let afterOn = false
  let afterOperationKeyword = false

  const outsideParens = (): boolean => parenDepth === 0

  for (const token of tokens) {
    if (token === ':') {
      if (outsideParens()) {
        // alias position — the real field follows
      } else if (inputObjectDepth === 0 && pendingIdent !== null) {
        args.add(pendingIdent)
      }
      pendingIdent = null
      continue
    }

    // A pending identifier is resolved by whatever comes next.
    if (pendingIdent !== null) {
      if (outsideParens()) {
        fields.add(pendingIdent)
      } // else: value position inside parens — discarded
      pendingIdent = null
    }

    if (token === '(') {
      parenDepth++
    } else if (token === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
      if (parenDepth === 0) inputObjectDepth = 0
    } else if (token === '{') {
      if (parenDepth > 0) inputObjectDepth++
    } else if (token === '}') {
      if (inputObjectDepth > 0) inputObjectDepth--
    } else if (token.startsWith('$')) {
      // variable — a value, never a name
    } else if (GRAPHQL_KEYWORDS.has(token)) {
      if (token === 'on') afterOn = true
      if (OPERATION_KEYWORDS.has(token)) afterOperationKeyword = true
    } else if (afterOn) {
      afterOn = false // inline-fragment type name — skipped
    } else if (afterOperationKeyword) {
      afterOperationKeyword = false // operation name — skipped
    } else {
      pendingIdent = token
    }
  }

  if (pendingIdent !== null && outsideParens()) fields.add(pendingIdent)

  return {fields, args}
}

/**
 * Builds the introspection queries for the watched types, aliased `t0`/`t1`
 * with at most {@link INTROSPECTION_TYPES_PER_QUERY} `__type` selections
 * each. `fields(includeDeprecated: true)` is the point: plain `fields`
 * HIDES deprecated fields, and a watch that cannot see them cannot fire.
 */
export function buildIntrospectionQueries(types: readonly string[]): string[] {
  const queries: string[] = []
  for (let i = 0; i < types.length; i += INTROSPECTION_TYPES_PER_QUERY) {
    const batch = types.slice(i, i + INTROSPECTION_TYPES_PER_QUERY)
    const selections = batch
      .map(
        (type, j) =>
          `t${j}: __type(name: "${type}") {\n        name\n        fields(includeDeprecated: true) {\n          name\n          deprecationReason\n        }\n      }`,
      )
      .join('\n')
    queries.push(`query {\n${selections}\n}`)
  }
  return queries
}

/**
 * Runs the deprecation watch: introspects every watched type (batched), then
 * intersects each type's deprecated field names with the names referenced by
 * the registered templates. Returns the findings — an empty array is GREEN.
 * THROWS on any introspection transport/shape failure: a watch that cannot
 * see the schema must not report green (fail-closed, canary exits nonzero).
 */
export async function collectDeprecationFindings(
  fetchImpl: FetchLike,
  registry: readonly RegisteredQueryTemplate[],
  types: readonly string[] = WATCHED_QUERY_TYPES,
): Promise<DeprecationFinding[]> {
  const referencedBy = new Map<string, Set<string>>()
  for (const entry of registry) {
    const {fields, args} = extractReferencedNames(entry.query)
    for (const name of [...fields, ...args]) {
      const names = referencedBy.get(name) ?? new Set<string>()
      names.add(entry.name)
      referencedBy.set(name, names)
    }
  }

  const findings: DeprecationFinding[] = []
  for (const query of buildIntrospectionQueries(types)) {
    let body: unknown
    try {
      const res = await fetchImpl('https://api.github.com/graphql', {
        method: 'POST',
        headers: {accept: 'application/vnd.github+json', 'content-type': 'application/json'},
        body: JSON.stringify({query}),
      })
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
      body = await res.json()
    } catch (error) {
      throw new Error(`deprecation watch: introspection transport failed — ${error instanceof Error ? error.message : String(error)}`)
    }

    const data = (
      body as {
        data?: Record<string, {name?: string; fields?: readonly {name: string; deprecationReason: string | null}[]} | null> | null
      } | null
    )?.data
    if (data === null || data === undefined) {
      throw new Error('deprecation watch: introspection response had no data object')
    }

    for (const [alias, typeInfo] of Object.entries(data)) {
      if (typeInfo === null || typeInfo === undefined) {
        throw new Error(`deprecation watch: introspection returned null for watched type (alias ${alias})`)
      }
      for (const field of typeInfo.fields ?? []) {
        if (field.deprecationReason === null || field.deprecationReason === undefined) continue
        const templateNames = referencedBy.get(field.name)
        if (templateNames === undefined) continue
        findings.push({
          type: typeInfo.name ?? alias,
          field: field.name,
          reason: field.deprecationReason,
          referencedBy: [...templateNames].sort(),
        })
      }
    }
  }

  return findings
}
