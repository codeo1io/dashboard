/**
 * rm-624: offline unit tests for the GraphQL deprecation watch.
 *
 * The pass itself runs live only inside the reality canary
 * (scripts/graphql-canary.ts, weekly .github/workflows/canary.yaml); these
 * tests pin its LOGIC with a mocked fetch and the REAL registered templates
 * — extraction semantics, the ≤2-__type batching, includeDeprecated, the
 * green baseline shape, firing on referenced deprecations, NOT firing on
 * unreferenced ones, and fail-closed behavior when introspection cannot see
 * the schema.
 */
import {describe, expect, it} from 'vitest'

import {
  buildIntrospectionQueries,
  collectDeprecationFindings,
  extractReferencedNames,
  INTROSPECTION_TYPES_PER_QUERY,
  WATCHED_QUERY_TYPES,
  type FetchLike,
} from '../src/github/query-deprecation.ts'
import {REPO_STATUS_QUERY_REGISTRY} from '../src/github/query-registry.ts'

/** A field list as GitHub's __type introspection returns it. */
interface IntrospectedField {name: string; deprecationReason: string | null}
interface TypeFields {name: string; fields: IntrospectedField[]}

/**
 * Builds a fetch stub that answers any batching: parses the aliased
 * `tN: __type(name: "…")` selections out of each posted query and serves the
 * canned field list per type. Records every posted query for assertions.
 */
function makeFetchStub(
  typesByName: ReadonlyMap<string, TypeFields>,
  calls: string[] = [],
  override?: {status?: number; body?: unknown},
): FetchLike {
  return async (_url, init) => {
    calls.push(init.body)
    if (override?.status !== undefined) {
      return {status: override.status, json: async () => (override.body ?? {})}
    }
    const body = JSON.parse(init.body) as {query: string}
    const data: Record<string, TypeFields | null> = {}
    for (const match of body.query.matchAll(/t(\d+): __type\(name: "(\w+)"\)/g)) {
      const alias = `t${match[1] ?? ''}`
      const typeName = match[2] ?? ''
      data[alias] = typesByName.get(typeName) ?? null
    }
    return {status: 200, json: async () => ({data})}
  }
}

/** Today's live baseline: zero deprecated fields on any watched type. */
function healthyTypes(): Map<string, TypeFields> {
  return new Map<string, TypeFields>(
    WATCHED_QUERY_TYPES.map(type => [
      type,
      {name: type, fields: [{name: 'totalCount', deprecationReason: null}]},
    ]),
  )
}

describe('extractReferencedNames — real registered templates (rm-624)', () => {
  it('captures nested fields and argument names from BOTH registered templates', () => {
    for (const entry of REPO_STATUS_QUERY_REGISTRY) {
      const {fields, args} = extractReferencedNames(entry.query)

      // Nested selection fields, all depths.
      for (const field of [
        'repository',
        'defaultBranchRef',
        'target',
        'statusCheckRollup',
        'state',
        'checkSuites',
        'nodes',
        'workflowRun',
        'displayTitle',
        'runAttempt',
        'checkRuns',
        'totalCount',
        'name',
        'detailsUrl',
        'pullRequests',
        'issues',
      ]) {
        expect(fields.has(field), `${entry.name}: field ${field}`).toBe(true)
      }
      // Argument names.
      for (const arg of ['owner', 'name', 'states', 'first', 'filterBy']) {
        expect(args.has(arg), `${entry.name}: arg ${arg}`).toBe(true)
      }
      // Never: keywords, enum literals, input-object keys, variables,
      // fragment type names, the operation name.
      for (const absent of [
        'query',
        'on',
        'RepoStatus',
        'RepoStatusNoAlerts',
        'Commit',
        'String',
        'OPEN',
        'COMPLETED',
        'FAILURE',
        'TIMED_OUT',
        'CANCELLED',
        'ACTION_REQUIRED',
        'STARTUP_FAILURE',
        'status',
        'conclusions',
        'owner$',
      ]) {
        expect(fields.has(absent), `${entry.name}: fields must not contain ${absent}`).toBe(false)
        expect(args.has(absent), `${entry.name}: args must not contain ${absent}`).toBe(false)
      }
    }
  })

  it('vulnerabilityAlerts is referenced by the alerts template only', () => {
    const names = new Map(
      REPO_STATUS_QUERY_REGISTRY.map(entry => [
        entry.name,
        extractReferencedNames(entry.query).fields.has('vulnerabilityAlerts'),
      ]),
    )
    expect(names.get('REPO_STATUS_QUERY')).toBe(true)
    expect(names.get('REPO_STATUS_QUERY_NO_ALERTS')).toBe(false)
  })

  it('aliases resolve to the real field, not the alias', () => {
    const {fields} = extractReferencedNames('query Q { repository(owner: $o, name: $n) { aliasName: name } }')
    expect(fields.has('aliasName')).toBe(false)
    expect(fields.has('name')).toBe(true)
  })
})

describe('buildIntrospectionQueries (rm-624)', () => {
  it('batches 5 watched types into 3 queries of <=2 __type selections', () => {
    expect(WATCHED_QUERY_TYPES).toHaveLength(5)
    const queries = buildIntrospectionQueries(WATCHED_QUERY_TYPES)
    expect(queries).toHaveLength(3)
    for (const query of queries) {
      expect((query.match(/__type\(/g) ?? []).length).toBeLessThanOrEqual(INTROSPECTION_TYPES_PER_QUERY)
      expect(query).toContain('includeDeprecated: true') // without it introspection HIDES deprecated fields
      expect(query).toContain('deprecationReason')
    }
    expect(queries[0]).toContain('"Repository"')
    expect(queries[2]).toContain('"WorkflowRun"')
  })
})

describe('collectDeprecationFindings — offline, mocked fetch (rm-624)', () => {
  it('green baseline: zero deprecated fields anywhere -> no findings (born green)', async () => {
    const calls: string[] = []
    const findings = await collectDeprecationFindings(makeFetchStub(healthyTypes(), calls), REPO_STATUS_QUERY_REGISTRY)
    expect(findings).toEqual([])
    expect(calls).toHaveLength(3) // 5 types / 2 per query
  })

  it('fires on a deprecated field a template references, with reason and template names; not on unreferenced ones', async () => {
    const types = healthyTypes()
    types.set('CheckRun', {
      name: 'CheckRun',
      fields: [
        {name: 'name', deprecationReason: 'Use checkRun.title. Removal 2027-01-01.'},
        {name: 'ghostField', deprecationReason: 'Deprecated but never referenced — must NOT fire'},
        {name: 'detailsUrl', deprecationReason: null},
      ],
    })
    types.set('WorkflowRun', {
      name: 'WorkflowRun',
      fields: [{name: 'displayTitle', deprecationReason: null}],
    })

    const findings = await collectDeprecationFindings(makeFetchStub(types), REPO_STATUS_QUERY_REGISTRY)

    expect(findings).toHaveLength(1)
    const finding = findings[0]
    expect(finding?.type).toBe('CheckRun')
    expect(finding?.field).toBe('name')
    expect(finding?.reason).toBe('Use checkRun.title. Removal 2027-01-01.')
    expect(finding?.referencedBy).toEqual(['REPO_STATUS_QUERY', 'REPO_STATUS_QUERY_NO_ALERTS'])
  })

  it('fires for an argument-name match too (name superset across field/arg positions)', async () => {
    const types = healthyTypes()
    types.set('Commit', {
      name: 'Commit',
      fields: [{name: 'first', deprecationReason: 'first is deprecated on Commit; use firstN'}],
    })
    const findings = await collectDeprecationFindings(makeFetchStub(types), REPO_STATUS_QUERY_REGISTRY)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.field).toBe('first') // referenced as an ARG of checkSuites/checkRuns
  })

  it('fail-closed: HTTP failure, missing data object, and null type each throw', async () => {
    const http500 = makeFetchStub(healthyTypes(), [], {status: 500})
    await expect(collectDeprecationFindings(http500, REPO_STATUS_QUERY_REGISTRY)).rejects.toThrow(/transport failed/)

    const noData: FetchLike = async () => ({status: 200, json: async () => ({})})
    await expect(collectDeprecationFindings(noData, REPO_STATUS_QUERY_REGISTRY)).rejects.toThrow(/no data object/)

    const nullType: FetchLike = async () => ({status: 200, json: async () => ({data: {t0: null}})})
    await expect(collectDeprecationFindings(nullType, REPO_STATUS_QUERY_REGISTRY)).rejects.toThrow(/null for watched type/)
  })
})
