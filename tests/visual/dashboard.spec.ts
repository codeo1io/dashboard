import AxeBuilder from '@axe-core/playwright'
/**
 * Dark (report-only) visual-regression + axe-core accessibility checks.
 *
 * Runs exclusively against the fixture-mode server booted by playwright.config.ts
 * (synthetic operator data via /__fixture/operator; no live gateway/GitHub).
 *
 * Screenshots: full-page baselines under tests/visual/__screenshots__.
 *
 * Baseline provenance (rm-142): all three dark baselines are regenerated
 * inside the same pinned container image the visual job runs in —
 * mcr.microsoft.com/playwright:v1.63.0-noble (digest sha256:eff16c30…,
 * 2026-09-22) — so baseline capture and comparison share one deterministic
 * render environment. Regen procedure: delete the baseline PNGs, then run
 * `pnpm exec playwright test --update-snapshots` inside that image (the
 * container block in .github/workflows/visual.yaml documents the same).
 * Axe: fails only on `critical`/`serious` impact violations (moderate/minor are
 * logged for visibility). Any pre-existing fixture-page violations are scoped
 * or disabled inline with a justification — see `axeCommon()` below.
 */
import {expect, test, type Page} from '@playwright/test'

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
    (violation): violation is (typeof results.violations)[number] & {impact: string} =>
      typeof violation.impact === 'string' && FAILING_IMPACTS.has(violation.impact),
  )

  for (const violation of results.violations) {
    const nodes = violation.nodes.map(node => node.target.join(' ')).slice(0, 5)
    console.warn(
      `[axe] ${violation.impact ?? 'unknown'} — ${violation.id}: ${violation.help} (${violation.nodes.length} node(s)) e.g. ${nodes.join(' | ')}`,
    )
  }

  expect(
    failing.map(violation => `${violation.impact}: ${violation.id} — ${violation.help}`),
    'critical/serious axe violations (all findings logged above)',
  ).toEqual([])
}

test.beforeEach(async ({page}) => {
  // Block the PWA service worker: it precaches the SPA shell and can serve a
  // stale/intercepted response, which makes screenshots depend on prior runs.
  await page.route('/sw.js', async route => route.fulfill({status: 200, body: ''}))
  await page.route('/registerSW.js', async route => route.fulfill({status: 200, body: ''}))
  // Deterministic dark theme: tokens.css has `@media (prefers-color-scheme:
  // light) { :root { ... light tokens ... } }` which overrides dark for ALL
  // pages when the host prefers light — data-theme="dark" cannot beat it
  // (equal specificity, later position). The runner's chromium resolves
  // prefers-color-scheme: light, so the static privacy page rendered light.
  // Neutralize the block in whichever bundle serves it (dev: /index.css via
  // @import; built fixture: /assets/src-*.css single bundle).
  await page.route(/\.css$/, async route => {
    const response = await route.fetch()
    const headers = response.headers()
    if (!/css/i.test(headers['content-type'] ?? '')) {
      await route.fulfill({response})
      return
    }
    let css = await response.text()
    // Minified bundles write `(prefers-color-scheme:light)` — no space.
    css = css.replaceAll(/@media\s*\(prefers-color-scheme:\s*light\)\s*\{[\s\S]*?\n\}/g, '')
    css = css.replaceAll(/@media\s*\(prefers-color-scheme:\s*light\)\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
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

/**
 * Dev-mode StrictMode quirk: the first useBoundedPoll fetch after a view
 * mounts is aborted by React's simulated unmount, and the remount's initial
 * poll is latched out while that abort is still settling — so the loop's
 * next trigger is the focus path (refetchOnFocus, default true), not the
 * 60s interval. Nudge it deterministically instead of waiting.
 */
async function nudgePoll(page: Page) {
  await page.waitForTimeout(250)
  // String-form evaluate (no typed browser globals needed at the Node side).
  await page.evaluate('window.dispatchEvent(new Event("focus"))')
}

// rm-896: the two monitoring lanes share ONE process-global harness shape
// (src/routes/monitoring-fixture.ts module state), so they must not race each
// other — serial mode pins the order, and each test locks its own shape up
// front (also self-healing against a reused dev server left on the other
// shape by a previous run: playwright reuses a running webServer locally).
test.describe.serial('monitoring view (fixture seam)', () => {
  test('monitoring view — fixture board (red → stale → green)', async ({page}) => {
  // rm-896: the fixture-harness seam serves the deterministic /api/monitoring
  // board (shape 'mixed') whenever the full gate is active — exactly this
  // suite's boot mode — so the monitoring view gets a stable, synthetic board
  // instead of whatever the dev aggregator happens to serve.
    const lock = await page.request.post('/__fixture/operator/monitoring/shape', {
      data: {shape: 'mixed'},
    })
    expect(lock.ok()).toBeTruthy()

    await page.goto('/')
    await expect(page.getByTestId('operator-shell')).toHaveAttribute('data-state', 'ready')
    // Primary nav labels the monitoring view "Repos".
    await page.getByRole('button', {name: 'Repos'}).click()
    await nudgePoll(page)
    await expect(page.getByTestId('monitoring-board')).toBeVisible()
    // Attention-first fixture board: the red repo card is rendered with its
    // failing-check details, proving the wire DTO → view contract end-to-end.
    await expect(page.getByTestId('monitoring-red-repo')).toContainText('fixture-ci-red')
    await expect(page.getByTestId('monitoring-stale-repo')).toContainText('fixture-stale-walk')
    await page.waitForTimeout(250)

    await assertAccessible(page)
    await expect(page).toHaveScreenshot('dashboard-monitoring-fixture-board-dark.png', {fullPage: true})
  })

  test('monitoring view — cold-start no-data state', async ({page}) => {
  // rm-896 second coverage lane: the fail-closed cold-start shape renders the
  // rm-835 no-data empty state. The shape is locked process-wide via the
  // harness introspection route (public under the fixture gate — see
  // src/server.ts isPublicPath) BEFORE the view fetches.
    const lock = await page.request.post('/__fixture/operator/monitoring/shape', {
      data: {shape: 'cold-start'},
    })
    expect(lock.ok()).toBeTruthy()

    await page.goto('/')
    await expect(page.getByTestId('operator-shell')).toHaveAttribute('data-state', 'ready')
    await page.getByRole('button', {name: 'Repos'}).click()
    await nudgePoll(page)
    await expect(page.getByTestId('monitoring-no-data')).toBeVisible()
    // The stale banner (fail-closed signal) accompanies the no-data state
    // (board-level banner — the DTO staleBanner, distinct from the post-ready
    // refresh-failure banner's monitoring-view-stale-banner testid).
    await expect(page.getByTestId('monitoring-stale-banner')).toBeVisible()
    await page.waitForTimeout(250)

    await assertAccessible(page)
    await expect(page).toHaveScreenshot('dashboard-monitoring-cold-start-dark.png', {fullPage: true})
  })
})

test('privacy policy page', async ({page}) => {
  await page.goto('/privacy')
  // Static compliance page; just wait for its content to paint.
  await expect(page.locator('body')).toContainText(/privacy/i)
  await page.waitForTimeout(250)

  // Capture via clip(scrollHeight) instead of fullPage: on some CI runners
  // the fullPage stitching path produces an inverted-color image for tall
  // static pages even though the live page is dark at capture time (probe:
  // bg rgb(13,2,22), theme dark, scheme dark). Clip avoids the stitching.
  const pageHeight = (await page.evaluate(
    () => (globalThis as unknown as {document: {documentElement: {scrollHeight: number}}})
      .document.documentElement.scrollHeight,
  ))

  await assertAccessible(page)
  await expect(page).toHaveScreenshot('privacy-dark.png', {
    clip: {x: 0, y: 0, width: 1280, height: pageHeight},
  })
})
