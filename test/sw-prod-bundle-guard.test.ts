import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {expect, test} from 'vitest'

// Guard for roadmap rm-1959: the MOCK_SYNTHETIC_PUSH dev fixture must never
// ship in a production web build. The service worker (web/src/sw.ts) compiles
// through the Vite injectManifest pipeline, where `import.meta.env.DEV` is a
// build-time define: prod builds statically replace it with `false` and
// dead-code-eliminate the fixture branch — and its token — entirely; dev
// builds (`vite build --mode development`) keep it. The app-side poster
// (web/src/views/Notifications.tsx) is gated by the same flag, so the
// production bundle should contain zero occurrences of the token anywhere.

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const webDist = join(repoRoot, 'web', 'dist')
const swSource = readFileSync(join(repoRoot, 'web', 'src', 'sw.ts'), 'utf8')
const notificationsSource = readFileSync(join(repoRoot, 'web', 'src', 'views', 'Notifications.tsx'), 'utf8')

function listJsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...listJsFiles(full))
    } else if (entry.endsWith('.js')) {
      out.push(full)
    }
  }
  return out
}

test('production web/dist contains no MOCK_SYNTHETIC_PUSH token', () => {
  const swJs = join(webDist, 'sw.js')
  if (!existsSync(swJs)) {
    throw new Error(
      'web/dist/sw.js is missing — this guard asserts the BUILT artifact. Run `pnpm build:web` first (direct vitest invocations bypass the pretest rebuild; see docs/solutions/workflow-issues/targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md).',
    )
  }
  const offenders = listJsFiles(webDist)
    .filter(f => readFileSync(f, 'utf8').includes('MOCK_SYNTHETIC_PUSH'))
    .map(f => f.slice(repoRoot.length + 1))
  expect(
    offenders,
    'MOCK_SYNTHETIC_PUSH leaked into production build output — the dev fixture is no longer DEV-gated end to end (check web/src/sw.ts and the poster in web/src/views/Notifications.tsx)',
  ).toEqual([])
})

test('the MOCK_SYNTHETIC_PUSH branch in web/src/sw.ts sits behind the build-time DEV gate', () => {
  const swLines = swSource.split('\n')
  const gated = swLines.findIndex(line => line.includes("import.meta.env.DEV && messageType === 'MOCK_SYNTHETIC_PUSH'"))
  expect(
    gated,
    "expected the sw.ts message listener to gate the fixture branch as `if (import.meta.env.DEV && messageType === 'MOCK_SYNTHETIC_PUSH')` — if the gate was refactored away or reshaped, update this pin consciously and re-verify the dist guard",
  ).toBeGreaterThanOrEqual(0)
  // The gate must live inside the message listener (not in dead/unreachable code).
  const listener = swLines.findIndex(line => line.includes("addEventListener('message'"))
  expect(listener).toBeGreaterThanOrEqual(0)
  expect(gated).toBeGreaterThan(listener)
})

test('the synthetic-push poster in Notifications.tsx stays DEV-gated', () => {
  const lines = notificationsSource.split('\n')
  const button = lines.findIndex(line => line.includes('synthetic-push-btn'))
  expect(button).toBeGreaterThanOrEqual(0)
  const windowStart = Math.max(0, button - 8)
  const gatedAbove = lines.slice(windowStart, button).some(line => line.includes('import.meta.env.DEV'))
  expect(
    gatedAbove,
    'the synthetic-push poster button must render only in dev builds (import.meta.env.DEV) — ungating the poster while the SW branch stays gated (or vice versa) breaks the symmetric dev-only contract pinned by this suite',
  ).toBe(true)
})
