import { expect, test } from '@playwright/test'

const email = process.env.E2E_TEST_EMAIL
const password = process.env.E2E_TEST_PASSWORD

test.beforeAll(() => {
  if (!email || !password) {
    throw new Error(
      'E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required for the real report test.',
    )
  }
})

test('report document is isolated and exports as a multi-page A4 PDF', async ({
  page,
}, testInfo) => {
  await page.goto('/login')
  await page.locator('#login-email').fill(email!)
  await page.locator('#login-password').fill(password!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto('/report')
  const report = page.locator('#business-report')
  await expect(report).toBeVisible()
  await expect(report).toContainText('Report 2.0')
  await expect(
    report.getByRole('heading', { name: 'Data-quality note' }),
  ).toBeVisible()
  await expect(
    report.getByRole('heading', { name: 'Strategic Recommendations' }),
  ).toBeVisible()
  await expect(report.locator('svg.report-chart-svg')).toHaveCount(2)
  await expect(report.locator('[data-chart-series]')).toHaveCount(4)

  await page.screenshot({
    path: testInfo.outputPath('report-screen.png'),
    fullPage: true,
  })

  await page.emulateMedia({ media: 'print' })
  await page.screenshot({
    path: testInfo.outputPath('report-print.png'),
    fullPage: true,
  })
  const printState = await page.evaluate(() => {
    const reportElement = document.querySelector('#business-report')
    const actionBar = document.querySelector('.report-screen-only')
    const sidebar = document.querySelector('.app-sidebar')
    const chartSeries = Array.from(
      document.querySelectorAll<SVGGraphicsElement>(
        '#business-report [data-chart-series]',
      ),
    )
    const collectCssText = (rules: CSSRuleList): string[] =>
      Array.from(rules).flatMap((rule) => {
        const nestedRules = (rule as CSSMediaRule).cssRules
        return nestedRules
          ? [rule.cssText, ...collectCssText(nestedRules)]
          : [rule.cssText]
      })
    const cssText = Array.from(document.styleSheets)
      .flatMap((styleSheet): string[] => {
        try {
          return collectCssText(styleSheet.cssRules)
        } catch {
          return []
        }
      })
      .join('\n')
    return {
      reportVisibility: reportElement
        ? getComputedStyle(reportElement).visibility
        : null,
      reportPosition: reportElement
        ? getComputedStyle(reportElement).position
        : null,
      actionDisplay: actionBar
        ? getComputedStyle(actionBar).display
        : null,
      sidebarVisibility: sidebar
        ? getComputedStyle(sidebar).visibility
        : null,
      chartSeriesVisible:
        chartSeries.length === 4 &&
        chartSeries.every(
          (series) =>
            getComputedStyle(series).visibility === 'visible' &&
            series.getBBox().width > 0,
        ),
      hasA4PageRule: /@page[^}]*size:\s*a4/i.test(cssText),
    }
  })

  expect(printState).toEqual({
    reportVisibility: 'visible',
    reportPosition: 'absolute',
    actionDisplay: 'none',
    sidebarVisibility: 'hidden',
    chartSeriesVisible: true,
    hasA4PageRule: true,
  })

  const pdf = await page.pdf({
    path: testInfo.outputPath('report-a4.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  })
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
  expect(pdf.byteLength).toBeGreaterThan(50_000)
  const pageCount =
    pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0
  expect(pageCount).toBe(3)
})
