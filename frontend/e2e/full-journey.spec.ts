import { expect, test, type Page } from '@playwright/test'

const email = process.env.E2E_TEST_EMAIL
const password = process.env.E2E_TEST_PASSWORD
const newPassword = process.env.E2E_TEST_NEW_PASSWORD
const samplePath = process.env.E2E_SAMPLE_PATH
const combinedPath1 = process.env.E2E_COMBINED_PATH_1
const combinedPath2 = process.env.E2E_COMBINED_PATH_2

test.beforeAll(() => {
  if (
    !email ||
    !password ||
    !newPassword ||
    !samplePath ||
    !combinedPath1 ||
    !combinedPath2
  ) {
    throw new Error(
      'Browser journey credentials and all three E2E dataset paths are required.',
    )
  }
})

test('shop owner completes the protected mobile and desktop journey', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ height: 844, width: 390 })
  await page.goto('/history')
  await expect(page).toHaveURL(/\/login$/)

  await signIn(page, password!)
  await expect(page).toHaveURL(/\/history$/)
  await expect(
    page.getByRole('heading', { name: 'No analysis history yet' }),
  ).toBeVisible()
  await expect(page.locator('.app-mobile-header')).toBeVisible()
  await expect(page.locator('.app-sidebar')).toBeHidden()
  await expectNoHorizontalOverflow(page)

  await page
    .locator('.app-mobile-header')
    .getByRole('link', { name: 'Upload Data' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Upload Sales File' }),
  ).toBeVisible()
  await page
    .getByLabel('Choose a CSV or XLSX file')
    .setInputFiles(samplePath!)
  await page
    .getByRole('button', { name: 'Check file structure' })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'The file is ready for analysis',
    }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Start Analysis' }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Analysis completed successfully',
    }),
  ).toBeVisible({ timeout: 30_000 })
  await expectNoHorizontalOverflow(page)
  await page.evaluate(() => window.scrollTo({ left: 0, top: 0 }))
  await page.screenshot({
    path: testInfo.outputPath('journey-mobile-upload.png'),
    fullPage: true,
  })

  await page.getByRole('link', { name: 'Go to dashboard' }).click()
  await expect(
    page.getByRole('heading', { name: 'Business Overview' }),
  ).toBeVisible()
  await expect(page.getByText('₫185,263,000').first()).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await page.setViewportSize({ height: 1000, width: 1440 })
  await expect(page.locator('.app-sidebar')).toBeVisible()
  await expect(page.locator('.app-mobile-header')).toBeHidden()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({
    path: testInfo.outputPath('journey-desktop-dashboard.png'),
    fullPage: true,
  })

  await page.goto('/upload')
  await page.getByRole('button', { name: 'Combine files' }).click()
  await page
    .getByLabel('Choose a CSV or XLSX file')
    .setInputFiles([combinedPath1!, combinedPath2!])
  await page
    .getByRole('button', { name: 'Check file structure' })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'The file is ready for analysis',
    }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Analyze 2 files together' })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Analysis completed successfully',
    }),
  ).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/Combined 2 files and processed 20 effective rows/)).toBeVisible()
  await expect(page.getByText(/Removed 1 repeated order/)).toBeVisible()
  await page.getByRole('link', { name: 'Go to dashboard' }).click()
  await expect(
    page.getByRole('heading', { name: 'Business Overview' }),
  ).toBeVisible()

  const desktopSidebar = page.locator('.app-sidebar')
  const combinedSelectorTrigger = desktopSidebar
    .getByRole('button')
    .filter({ hasText: 'Combined analysis (2 files)' })
  await expect(combinedSelectorTrigger).toBeVisible()
  await combinedSelectorTrigger.click()
  const selectorDialog = page.getByRole('dialog', {
    name: 'Choose a saved analysis',
  })
  await expect(selectorDialog).toBeVisible()
  await selectorDialog
    .getByRole('button')
    .filter({ hasText: 'sample_sales_demo_60_days.csv' })
    .click()
  await expect(selectorDialog).toBeHidden()
  await expect(
    desktopSidebar
      .getByRole('button')
      .filter({ hasText: 'sample_sales_demo_60_days.csv' }),
  ).toBeVisible()
  await expect(page.getByText('₫185,263,000').first()).toBeVisible()

  for (const route of [
    { path: '/sales', title: 'Sales Analytics' },
    { path: '/customers', title: 'Customer Analytics' },
    { path: '/forecast', title: 'Revenue Forecast' },
  ]) {
    await page.goto(route.path)
    await expect(
      page.getByRole('heading', { name: route.title }),
    ).toBeVisible()
    await expectNoHorizontalOverflow(page)
  }

  await page.goto('/sales')
  await page
    .getByRole('tab', { name: 'Cancellations and returns' })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Products with notable cancellations or returns',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('table').getByText('So tay planner'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'Sort by Cancelled or returned rate',
    }),
  ).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({
    path: testInfo.outputPath(
      'journey-desktop-cancellations-returns.png',
    ),
    fullPage: true,
  })

  await page.goto('/report')
  await expect(page.locator('#business-report')).not.toContainText(
    'Version 2.0',
  )
  await expect(page.locator('#business-report')).not.toContainText(
    /\b(?:backend|lift|confidence|support|MAE|RMSE|sMAPE)\b/i,
  )
  await expect(page.locator('#business-report')).toContainText(
    'Automatic summary',
  )
  await page.getByRole('button', { name: 'Rewrite with AI' }).click()
  const aiSuccessNotice = page.getByText(
    'The AI-assisted report was generated and saved for this language.',
  )
  const aiFallbackNotice = page.getByText(
    /automatic business summary remains available|kept the automatic business summary/i,
  )
  await expect(aiSuccessNotice.or(aiFallbackNotice)).toBeVisible({
    timeout: 30_000,
  })
  await expect(
    page
      .locator('#business-report')
      .getByText(/Written with AI|Automatic summary/),
  ).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.mouse.move(900, 800)
  await page.mouse.wheel(0, 700)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0)
  await expectNoHorizontalOverflow(page)

  await page.setViewportSize({ height: 844, width: 390 })
  await page.goto('/profile')
  await expect(
    page.getByRole('heading', { name: 'Account Profile' }),
  ).toBeVisible()
  await expect(page.locator('.app-mobile-header')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.setViewportSize({ height: 1000, width: 1440 })
  const displayName = page.getByLabel('Shop display name')
  await displayName.fill('MarketLens Browser Shop')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(
    page.getByText('Your display name has been updated.'),
  ).toBeVisible()

  const passwordForm = page.locator('form').filter({
    has: page.locator('#currentPassword'),
  })
  await passwordForm.getByLabel('Current password').fill(password!)
  await passwordForm
    .getByLabel('New password', { exact: true })
    .fill(newPassword!)
  await passwordForm
    .getByLabel('Confirm new password')
    .fill(newPassword!)
  await passwordForm
    .getByRole('button', { name: 'Update password' })
    .click()
  await expect(
    page.getByText('Your password has been changed.'),
  ).toBeVisible({ timeout: 20_000 })

  await page.goto('/history')
  await expect(
    page.getByRole('heading', { name: 'Analysis History' }),
  ).toBeVisible()
  await page.setViewportSize({ height: 844, width: 390 })
  await expect(page.getByRole('article')).toHaveCount(2)
  await expectNoHorizontalOverflow(page)
  await page.setViewportSize({ height: 1000, width: 1440 })
  const historyTable = page.getByRole('table')
  await expect(historyTable.locator('tbody tr')).toHaveCount(2)
  await expect(
    historyTable.getByText('sample_sales_demo_60_days.csv'),
  ).toBeVisible()
  await deleteFirstHistoryItem(page, historyTable)
  await expect(historyTable.locator('tbody tr')).toHaveCount(1)
  await deleteFirstHistoryItem(page, historyTable)
  await expect(
    page.getByRole('heading', { name: 'No analysis history yet' }),
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('journey-desktop-history-empty.png'),
    fullPage: true,
  })

  await page.goto('/profile')
  await page
    .locator('main')
    .getByRole('button', { name: 'Sign out' })
    .click()
  const logoutDialog = page.getByRole('dialog', {
    name: 'Sign out of MarketLens?',
  })
  await expect(logoutDialog).toBeVisible()
  await logoutDialog.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await signIn(page, newPassword!)
  await expect(page).toHaveURL(/\/profile$/)
  await page.goto('/history')
  await expect(
    page.getByRole('heading', { name: 'No analysis history yet' }),
  ).toBeVisible()
})

async function signIn(page: Page, signInPassword: string) {
  await page.locator('#login-email').fill(email!)
  await page.locator('#login-password').fill(signInPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.innerWidth + 1,
  )
}

async function deleteFirstHistoryItem(
  page: Page,
  historyTable: ReturnType<Page['getByRole']>,
) {
  await historyTable
    .getByRole('button', { name: /^Delete analysis / })
    .first()
    .click()
  const deleteDialog = page.getByRole('dialog', {
    name: 'Delete this analysis?',
  })
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByRole('button', { name: 'Delete' }).click()
  await expect(deleteDialog).toBeHidden()
}
