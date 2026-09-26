// scripts/release-paths.ts
//
// Single source of truth for the "hard release" corpus: paths whose change
// always forces a Release run decision, regardless of package.json field
// diffing. Consumed by scripts/should-release.ts (the guard) and locked
// against .github/workflows/release.yaml's on.push.paths filter by
// test/should-release.test.ts — a one-sided addition or removal on either
// side fails CI (rm-248; the workflow filter runs BEFORE the guard, so a
// hard path missing from the workflow means a missed release).
//
// Scope note (reviewed 2026-09-23): .github/actions/setup/** is deliberately
// NOT here — the Release workflow never invokes that composite action
// (main.yaml/codeql.yaml do), and it plays no part in the image build.

/** File-exact paths that always force a release decision. */
export const HARD_RELEASE_FILE_PATHS: readonly string[] = [
  // Image definition.
  'Dockerfile',
  // Workspace config carries the security overrides and allowBuilds list,
  // and the Dockerfile COPYs it into both build stages.
  'pnpm-workspace.yaml',
  // The release pipeline itself.
  '.github/workflows/release.yaml',
  'scripts/should-release.ts',
  'scripts/compute-release-tag.ts',
]

/**
 * Directory prefixes whose whole trees are hard-release (SPA source built
 * into the image by the builder stage, static assets copied into the image).
 */
export const HARD_RELEASE_DIR_PREFIXES: readonly string[] = ['src', 'web', 'public']

/**
 * Root-level glob for image-affecting compiler config (tsconfig*.json at the
 * repo root only — not nested web/ or scripts/ configs).
 */
export const HARD_RELEASE_ROOT_TSCONFIG_GLOB = 'tsconfig*.json'

/**
 * Entries that appear in release.yaml's on.push.paths filter but are NOT
 * hard-release for the guard. package.json delegates to the guard's
 * package.json field diffing; pnpm-lock.yaml is handled by the guard's own
 * lockfile-only branch (fail open → release, step 3), not by the hard
 * corpus. Any NEW workflow-only entry must be added here consciously or the
 * corpus-sync test reds.
 */
export const WORKFLOW_TRIGGER_ONLY_PATHS: readonly string[] = [
  'package.json',
  'pnpm-lock.yaml',
]
