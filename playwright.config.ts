/**
 * Playwright config for the dark (report-only) visual-regression + axe a11y gate.
 *
 * The suite runs the dashboard entirely in fixture mode — the same headless
 * harness as `pnpm dev:fixture` — so it never touches a live gateway, GitHub,
 * or any production credential:
 *
 * - the web bundle is built with `pnpm build:web:fixture` (VITE_FIXTURE_MODE=true,
 *   DEV-gated fixture code included, output in web/dist-fixture);
 * - the server boots exactly like `dev:fixture` (NODE_ENV=development, loopback
 *   bind, DASHBOARD_WEB_DIST=./web/dist-fixture, fixture harness + dev
 *   auto-login enabled) on a dedicated test port;
 * - the synthetic operator data comes from the /__fixture/operator harness.
 *
 * Two env additions beyond `dev:fixture` keep the run self-contained on any
 * machine (dev:fixture assumes a pre-provisioned cookie key + operator login):
 * - DASHBOARD_OPERATOR_LOGIN/DASHBOARD_COOKIE_KEY mint the auto-login session.
 *   The cookie key below is a fixture-only constant, not a secret: it only ever
 *   signs loopback dev-mode sessions.
 * - DASHBOARD_LISTENER_DB points the listener store at a throwaway path so the
 *   listener channel mounts (empty state) instead of failing on /data perms.
 *
 * Screenshot baselines live in tests/visual/__screenshots__ (committed).
 * This suite is intentionally NOT a required check (see .github/workflows/visual.yml).
 */
import process from 'node:process'
import {defineConfig, devices} from '@playwright/test'

/** Dedicated fixture-mode port (avoid 3000, which `pnpm dev` claims). */
const port = Number.parseInt(process.env.DASHBOARD_VISUAL_PORT ?? '4311', 10)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/__screenshots__',
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  retries: process.env.CI === undefined ? 0 : 1,
  workers: process.env.CI === undefined ? undefined : 2,
  reporter: [
    ['list'],
    ['html', {outputFolder: 'playwright-report', open: 'never'}],
  ],
  use: {
    baseURL,
    // Pin locale/timezone so any locale/time-dependent rendering is reproducible.
    locale: 'en-US',
    timezoneId: 'UTC',
    // The dashboard is dark-first; force dark so screenshots never depend on
    // host color-scheme even though the app sets data-theme itself.
    colorScheme: 'dark',
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      // Small tolerance for font rasterisation differences across runner
      // generations — this is a report-only gate, not a pixel-exact contract.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
  webServer: {
    // Same build + boot as `pnpm dev:fixture`, with the self-contained auth
    // env documented in the file header.
    command: 'pnpm build:web:fixture && node src/server.ts',
    url: `${baseURL}/api/healthz`,
    timeout: 120_000,
    reuseExistingServer: process.env.CI === undefined,
    env: {
      NODE_ENV: 'development',
      DASHBOARD_HOST: '127.0.0.1',
      DASHBOARD_PORT: String(port),
      DASHBOARD_WEB_DIST: './web/dist-fixture',
      DASHBOARD_FIXTURE_HARNESS_ENABLED: 'true',
      DASHBOARD_DEV_AUTOLOGIN: 'true',
      DASHBOARD_OPERATOR_LOGIN: 'fixture-operator',
      // Fixture-only dev cookie key (64 hex chars ≥ 32 bytes). Not a secret.
      DASHBOARD_COOKIE_KEY:
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      DASHBOARD_LISTENER_DB: '/tmp/dashboard-visual-regression-listener/messages.db',
    },
  },
})
