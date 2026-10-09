/**
 * Shared GraphQL-mutation guard corpus (rm-779, 2026-10-09, run 35b0c401b321
 * cycle:1 — 'Read-only signal truth').
 *
 * The repo's only GraphQL write-detection net was `['"\`]mutation[\s{(]/` in
 * ONE guard twin — anchored to the string opening, so legal formatting evaded
 * it, and the other twin had no GraphQL detector at all. Both twins now build
 * their detector from `GRAPHQL_MUTATION_SOURCE` and run every corpus entry,
 * so the pattern and the corpus stay identical by construction.
 *
 * Pattern shape: the GraphQL `mutation` operation keyword opening an
 * operation — `mutation {`, `mutation(`, `mutation Name(` — with arbitrary
 * leading whitespace or position inside the string. Prose mentions stay
 * sanctioned: a comment like "ack mutation via the session middleware" fails
 * the operation-head shape (a second word appears before any brace/paren),
 * and "mutations"/"Mutations" fail the exact-word boundary.
 */

/** RegExp source; construct fresh instances (`g` for matchAll, plain for .test). */
export const GRAPHQL_MUTATION_SOURCE = String.raw`\bmutation\b\s*(?:[{(]|[\w$]+\s*[{(])`

export interface GraphqlMutationSeed {
  readonly label: string
  readonly text: string
}

/** Write-bearing shapes the guards must catch (seeded-red corpus). */
export const GRAPHQL_MUTATION_SEEDS: readonly GraphqlMutationSeed[] = [
  {
    label: 'template opener immediately after the backtick (the original anchored shape)',
    text: 'const doc = `mutation { addLabel(input: $input) { clientMutationId } }`',
  },
  {
    label: 'leading spaces between the quote and the operation',
    text: "await octokit.graphql('  mutation { addLabel(input: $input) { id } }', variables)",
  },
  {
    label: 'template opening with a newline and indent before the operation',
    text: 'const doc = `\n  mutation { addLabel(input: $input) { id } }`',
  },
  {
    label: 'mutation on a later line of a multi-line template',
    text: 'const doc = `query { viewer { login } }\n  mutation { addLabel(input: $input) { id } }`',
  },
  {
    label: 'named operation with variable definitions',
    text: 'const doc = `mutation AddLabel($input: AddLabelInput!) { addLabel(input: $input) { clientMutationId } }`',
  },
  {
    label: 'minified single line',
    text: "await octokit.graphql('mutation{addLabel(input:$input){clientMutationId}}', variables)",
  },
  {
    label: 'operation head closed by a parenthesis (shorthand call form)',
    text: "const doc = 'mutation AddLabel('",
  },
] as const

/** Prose/query shapes the guards must NOT flag (sanctioned corpus). */
export const GRAPHQL_MUTATION_SANCTIONED: readonly string[] = [
  'submitted on every ack mutation via the session middleware',
  'the mutation payload for this transition is queued elsewhere',
  'query { viewer { login } }',
  'mutations acknowledged by the listener are logged read-only',
  'the repository mutation is performed by the automation host',
] as const
