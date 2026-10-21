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
 * mcr.microsoft.com/playwright:v1.64.0-noble (digest sha256:06a9939e…,
 * 2026-10-17; prior capture v1.63.0-noble sha256:eff16c30…, 2026-09-22 —
 * the 2026-10-17 regen kept listener/privacy byte-identical and rewrote only
 * dashboard-operator-dark.png, whose fixture run list had grown via the
 * 2026-10-11..17 upstream adoptions while the gate sat unrunnable on the
 * stale 1.63.0 image) — so baseline capture and comparison share one
 * deterministic render environment. Regen procedure: delete the baseline
 * PNGs, then run `bunx playwright test --update-snapshots` inside that
 * image (the container block in .github/workflows/visual.yaml documents the
 * same; bun.sh/install + PATH since the 2026.10.48 Bun adoption).
 * 2026-10-21 fifth regen (2026.10.59 adoption, PR #1104): only
 * dashboard-operator-dark.png rewritten in the same image — the adoption's
 * launch-bounds/dedupe UI (#678/#679) + contract 1.12/1.13 surfaces grow the
 * operator page 3526px→4405px; privacy + listener unchanged (in-image clean
 * compare 3/3 green at the new capture).
 * 2026-10-19 fourth regen (2026.10.48 adoption, PR #1026): all three
 * baselines rewritten in the same image — the adoption's markdown output
 * toolbar (run-output-tools region + Rendered/Raw toggle) grows the operator
 * page and the privacy.html section-class rework shifts privacy; in-image
 * clean compare re-ran 3/3 green at the new captures.
 * 2026-10-17 second regen (run 8fd22b8b integrate, conflict case 0310ad63):
 * dashboard-operator-dark.png rewritten once more in the same image — the
 * #619 absorb (contract 1.11.0 collapsed waiting cards, run-jump notices)
 * grew the operator page 3178px→3294px past the morning capture; listener
 * and privacy stayed byte-identical and the in-image clean compare re-ran
 * 3/3 green.
 * 2026-10-18 third regen (integrate conflict case b21ecdf5, run 3d12d72f
 * landing): dashboard-operator-dark.png rewritten again in the same image —
 * main's 2026.10.43 adoption (#636 containment + #639/#640/#641/#643 UI
 * batch) plus the AppShell release-link union grew the operator page
 * 3294px→3410px after the 2026-10-17 captures; three independent visual runs
 * on main's tip (39035335916/39039230117/39053384731) all failed 3294-vs-3410
 * with byte-identical 153655-px diffs while listener/privacy stayed green.
 * Regen ran twice in-image (both rounds md5 56b8f398…, 346452 B, 1280x3410)
 * and a no-flag compare round re-verified 3/3 green; listener and privacy
 * baselines untouched.
 * Axe: fails only on `critical`/`serious` impact violations (moderate/minor are
 * logged for visibility). Any pre-existing fixture-page violations are scoped
 * or disabled inline with a justification — see `axeCommon()` below.
 */
import {expect, test} from '@playwright/test'

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
