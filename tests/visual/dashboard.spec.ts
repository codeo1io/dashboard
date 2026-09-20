/**
 * Dark (report-only) visual-regression + axe-core accessibility checks.
 *
 * Runs exclusively against the fixture-mode server booted by playwright.config.ts
 * (synthetic operator data via /__fixture/operator; no live gateway/GitHub).
 *
 * Screenshots: full-page baselines under tests/visual/__screenshots__.
 * Axe: fails only on `critical`/`serious` impact violations (moderate/minor are
 * logged for visibility). Any pre-existing fixture-page violations are scoped
 * or disabled inline with a justification — see `axeCommon()` below.
 */
import {expect, test} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/** Impact levels that fail the gate. Everything else is report-only. */
const FAILING_IMPACTS = new Set(['critical', 'serious'])

/**
 * Run axe-core on the page and fail on critical/serious violations.
 * All violations (any impact) are printed so the CI log doubles as a report.
 *
 * `options.exclude` elements are PRE-EXISTING findings that are out of scope for
 * this gate — each exclusion must carry a justification here.
 */
async function assertAccessible(
  page: import('@playwright/test').Page,
  options: {exclude?: string[]} = {},
) {
  let builder = new AxeBuilder({page})
  for (const selector of options.exclude ?? []) {
    builder = builder.exclude(selector)
  }
  const results = await builder.analyze()

  const failing = results.violations.filter(
    (violation) => violation.impact !== null && FAILING_IMPACTS.has(violation.impact),
  )

  for (const violation of results.violations) {
    const nodes = violation.nodes.map((node) => node.target.join(' ')).slice(0, 5)
    console.log(
      `[axe] ${violation.impact ?? 'unknown'} — ${violation.id}: ${violation.help} (${violation.nodes.length} node(s)) e.g. ${nodes.join(' | ')}`,
    )
  }

  expect(
    failing.map((violation) => `${violation.impact}: ${violation.id} — ${violation.help}`),
    'critical/serious axe violations (all findings logged above)',
  ).toEqual([])
}

test.beforeEach(async ({page}) => {
  // Block the PWA service worker: it precaches the SPA shell and can serve a
  // stale/intercepted response, which makes screenshots depend on prior runs.
  await page.route('/sw.js', (route) => route.fulfill({status: 200, body: ''}))
  await page.route('/registerSW.js', (route) => route.fulfill({status: 200, body: ''}))
  // Deterministic dark theme: tokens.css has `@media (prefers-color-scheme:
  // light) { :root { ... light tokens ... } }` which overrides dark for ALL
  // pages when the host prefers light — data-theme="dark" cannot beat it
  // (equal specificity, later position). The runner's chromium resolves
  // prefers-color-scheme: light, so the static privacy page rendered light.
  // Neutralize the block in whichever bundle serves it (dev: /index.css via
  // @import; built fixture: /assets/src-*.css single bundle).
  await page.route(/\.css$/, async (route) => {
    const response = await route.fetch()
    const headers = response.headers()
    if (!/css/i.test(headers['content-type'] ?? '')) {
      await route.fulfill({response})
      return
    }
    let css = await response.text()
    // Minified bundles write `(prefers-color-scheme:light)` — no space.
    css = css.replace(/@media\s*\(prefers-color-scheme:\s*light\)\s*\{[\s\S]*?\n\}/g, '')
    css = css.replace(/@media\s*\(prefers-color-scheme:\s*light\)\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
    await route.fulfill({response, body: css})
  })
})

test('dashboard home — operator view (dark theme)', async ({page}) => {
  await page.goto('/')
  // Settled operator state: fixture bootstrap fetched, run index rendered.
  const shell = page.getByTestId('operator-shell')
  await expect(shell).toHaveAttribute('data-state', 'ready')
  await expect(shell).toHaveAttribute('data-fixture-mode', 'true')
  await expect(page.getByTestId('recent-runs-section')).toBeVisible()
  // Let fonts and the run-index layout settle before freezing the frame.
  await page.waitForTimeout(250)

  // PRE-EXISTING, intentionally out of scope:
  // - `.run-status.status-running` — the "RUNNING" badge renders the
  //   `--color-info` brand token on a translucent cyan wash (web/src/index.css
  //   .run-status.status-running) and axe flags it as a serious color-contrast
  //   finding. This is an intentional brand-token choice tracked by the design
  //   system (see the Design Check workflow + impeccable ignores), not a
  //   regression this gate should catch. Excluded narrowly; everything else on
  //   the page is still scanned.
  await assertAccessible(page, {exclude: ['.run-status.status-running']})
  await expect(page).toHaveScreenshot('dashboard-operator-dark.png', {fullPage: true})
})

test('listener channel view', async ({page}) => {
  await page.goto('/')
  await expect(page.getByTestId('operator-shell')).toHaveAttribute('data-state', 'ready')
  // Primary nav labels the listener channel "Inbox".
  await page.getByRole('button', {name: 'Inbox'}).click()
  await expect(page.getByTestId('listener-channel')).toBeVisible()
  // The channel settles on a terminal state (fresh fixture → empty inbox).
  await page
    .locator('[data-testid="listener-list"], [data-testid="listener-empty"], [data-testid="listener-error"]')
    .first()
    .waitFor()
  await page.waitForTimeout(250)

  await assertAccessible(page)
  await expect(page).toHaveScreenshot('dashboard-listener-dark.png', {fullPage: true})
})

test('privacy policy page', async ({page}) => {
  await page.goto('/privacy')
  // Static compliance page; just wait for its content to paint.
  await expect(page.locator('body')).toContainText(/privacy/i)
  await page.waitForTimeout(250)


  // Probe: capture computed styles at screenshot time for CI diagnosis.
  const probe = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    scheme: matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
    bg: getComputedStyle(document.body).backgroundColor,
    href: location.href,
  }))
  console.log('[theme-probe]', JSON.stringify(probe))

  await assertAccessible(page)
  await expect(page).toHaveScreenshot('privacy-dark.png', {fullPage: true})
})
