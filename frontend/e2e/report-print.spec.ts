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

  await page
    .locator('.app-sidebar')
    .getByRole('button', { name: 'Choose analysis data' })
    .click()
  const selectorDialog = page.getByRole('dialog', {
    name: 'Choose a saved analysis',
  })
  await selectorDialog
    .getByRole('button')
    .filter({ hasText: 'sample_sales_demo_60_days.csv' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Business Overview' }),
  ).toBeVisible()

  await page
    .locator('.app-sidebar')
    .getByRole('button', { name: 'VI', exact: true })
    .click()
  await page.goto('/report')
  const report = page.locator('#business-report')
  await expect(report).toBeVisible()
  await expect(report).not.toContainText('Version 2.0')
  await expect(report).toContainText(/185\.263\.000\s*₫/)
  await expect(report).not.toContainText(/185[.,]₫/)
  await expect(report).not.toContainText(
    /\b(?:backend|lift|confidence|support|MAE|RMSE|sMAPE)\b/i,
  )
  await expect(
    report.getByRole('heading', {
      name: 'Ghi chú chất lượng dữ liệu',
    }),
  ).toBeVisible()
  await expect(
    report.getByRole('heading', { name: 'Khuyến nghị hành động' }),
  ).toBeVisible()
  await expect(report.locator('svg.report-chart-svg')).toHaveCount(2)
  await expect(
    report.locator('[data-chart-series="actual-revenue"]'),
  ).toHaveCount(2)
  await expect(
    report.locator('[data-chart-series="predicted-revenue"]'),
  ).toHaveCount(1)
  await expect(
    report.locator('[data-chart-series="forecast-interval"]'),
  ).toHaveCount(0)

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
    const reportHeader = document.querySelector(
      '#business-report > header',
    )
    const dataQuality = document.querySelector(
      '#business-report > .report-data-quality-section',
    )
    const priorityPage = document.querySelector(
      '#business-report > .report-priority-page',
    )
    const detailPage = document.querySelector(
      '#business-report > .report-detail-page',
    )
    const actionBar = document.querySelector('.report-screen-only')
    const sidebar = document.querySelector('.app-sidebar')
    const printEvidence = Array.from(
      document.querySelectorAll<HTMLElement>(
        '#business-report .report-print-evidence',
      ),
    )
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
      printEvidenceVisible:
        printEvidence.length > 0 &&
        printEvidence.every(
          (item) => getComputedStyle(item).display !== 'none',
      ),
      chartSeriesVisible:
        chartSeries.length === 3 &&
        chartSeries.every(
          (series) =>
            getComputedStyle(series).visibility === 'visible' &&
            series.getBBox().width > 0,
        ),
      hasA4PageRule: /@page[^}]*size:\s*a4/i.test(cssText),
      pageGroupHeights: {
        page1:
          (reportHeader?.getBoundingClientRect().height ?? 0) +
          (dataQuality?.getBoundingClientRect().height ?? 0),
        page2: priorityPage?.getBoundingClientRect().height ?? 0,
        page3: detailPage?.getBoundingClientRect().height ?? 0,
      },
    }
  })

  expect(printState).toMatchObject({
    reportVisibility: 'visible',
    reportPosition: 'absolute',
    actionDisplay: 'none',
    sidebarVisibility: 'hidden',
    printEvidenceVisible: true,
    chartSeriesVisible: true,
    hasA4PageRule: true,
  })
  const printableA4Height = (297 - 24) * (96 / 25.4)
  expect(printState.pageGroupHeights.page1).toBeLessThanOrEqual(
    printableA4Height,
  )
  expect(printState.pageGroupHeights.page2).toBeLessThanOrEqual(
    printableA4Height,
  )
  expect(printState.pageGroupHeights.page3).toBeLessThanOrEqual(
    printableA4Height,
  )

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
