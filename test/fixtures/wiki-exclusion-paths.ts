// Single mechanical source of truth for the upstream wiki write-surface exclusion
// (security invariant 1: read-only by construction). Consumed by
// test/fork-exclusion-guard.test.ts and cited by AGENTS.md invariant-1 — the guard
// and every absorb checklist read THIS list so they can never desync again.
//
// Paths marked upstream-only name trees that exist upstream but must NEVER exist at
// the fork tip; they are written WITHOUT a leading src/ or web/ prefix where that
// prefix would make the entry look like a fork-side path.

/** Files that must not exist at the fork tip (upstream-only; repo-relative). */
export const WIKI_WRITE_ABSENT_FILES: readonly string[] = [
	'src/wiki/', // upstream server-side wiki module (dashboard wiki editing, PR #705/#708)
	'src/routes/wiki.ts', // upstream wiki route surface
	'web/src/wiki/', // upstream wiki client tree
	'web/src/api/wiki.ts', // upstream wiki API client
]

/** Glob patterns (GitHub Actions / minimatch style) of further upstream-only surface. */
export const WIKI_WRITE_ABSENT_GLOBS: readonly string[] = [
	'web/src/views/Wiki*.tsx', // upstream wiki UI views
]

/** Runtime dependencies that would smuggle in write capability; banned in package.json + bun.lock. */
export const WIKI_WRITE_PACKAGE_BANS: readonly string[] = [
	'@fro.bot/wiki-write-core', // published upstream (npm, v0.1.3, PR #709) — read-only fork never takes it
]

/** The wiki write-client seam inside the otherwise-legitimate app client; must stay free of write calls. */
export const APP_CLIENT_WRITE_MARKER: readonly RegExp[] = [
	/wiki[-_]writ/i, // any wiki-write naming inside src/github/fro-bot-app-client.ts
]

/** AGENTS.md lockstep: invariant-1 must cite this fixture so prose and guard share one list. */
export const AGENTS_LOCKSTEP_REGEXPS: readonly RegExp[] = [
	/test\/fixtures\/wiki-exclusion-paths\.ts/,
	/@fro\.bot\/wiki-write-core/,
]
