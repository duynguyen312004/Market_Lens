import {
  ChartBarIcon,
  CurrencyCircleDollarIcon,
  PackageIcon,
  ShoppingBagOpenIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'

import type { AnalysisDetail, ProductMetric } from '../api/analysesApi'
import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import { AnalyticsTabs } from '../components/analytics/AnalyticsTabs'
import {
  AnalysisEmptyState,
  AnalysisErrorState,
  AnalysisLoadingState,
} from '../components/analytics/AnalysisStates'
import {
  CategoryRevenueChart,
  MonthlyRevenueChart,
  ProductRevenueChart,
  RevenueLineChart,
  WeekdayRevenueChart,
} from '../components/analytics/Charts'
import { MetricCard } from '../components/analytics/MetricCard'
import { ProductIntelligenceSection } from '../components/analytics/ProductIntelligenceSection'
import { useCurrentAnalysis } from '../features/analysis/analysisQueries'
import {
  aggregateRevenueByMonth,
  filterRevenueByPeriod,
  getRevenueMonths,
  getRevenueYears,
  shouldShowDailyRevenue,
} from '../features/analysis/revenuePeriod'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatDate,
  formatInteger,
  formatMonth,
  formatPercent,
  formatVnd,
} from '../utils/formatters'

type SalesSection = 'revenue' | 'products' | 'advanced'

export function SalesAnalyticsPage() {
  const { t } = useLanguage()
  const { analysis, error, isEmpty, isLoading, retry } = useCurrentAnalysis()
  const [activeSection, setActiveSection] =
    useState<SalesSection>('revenue')

  if (isLoading) return <AnalysisLoadingState />
  if (error) return <AnalysisErrorState error={error} onRetry={retry} />
  if (isEmpty || !analysis) {
    return <AnalysisEmptyState title={t('analysis.noDataTitle')} />
  }

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <AnalysisHeader
          analysis={analysis}
          description={t('sales.desc')}
          title={t('sales.title')}
        />

        <AnalyticsTabs
          activeId={activeSection}
          ariaLabel={t('sales.sectionsAria')}
          idPrefix="sales"
          items={[
            { id: 'revenue', label: t('sales.revenueTab') },
            { id: 'products', label: t('sales.productsTab') },
            { id: 'advanced', label: t('sales.advancedTab') },
          ]}
          onChange={setActiveSection}
        />

        {activeSection === 'revenue' && (
          <RevenueSection analysis={analysis} key={analysis.id} />
        )}
        {activeSection === 'products' && (
          <ProductsSection analysis={analysis} />
        )}
        {activeSection === 'advanced' && (
          <div
            aria-labelledby="sales-tab-advanced"
            id="sales-panel-advanced"
            role="tabpanel"
          >
            <ProductIntelligenceSection
              discount={analysis.sales.discount_analysis}
              intelligence={analysis.sales.product_intelligence}
            />
          </div>
        )}
      </div>
    </main>
  )
}

function RevenueSection({ analysis }: { analysis: AnalysisDetail }) {
  const { language, t } = useLanguage()
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')

  const years = getRevenueYears(analysis.revenue_by_date)
  const year = years.includes(selectedYear) ? selectedYear : 'all'
  const months = getRevenueMonths(analysis.revenue_by_date, year)
  const month = months.includes(selectedMonth) ? selectedMonth : 'all'
  const dailyPoints = filterRevenueByPeriod(
    analysis.revenue_by_date,
    year,
    month,
  )
  const monthlyPoints = aggregateRevenueByMonth(dailyPoints)
  const showDaily = shouldShowDailyRevenue(month, monthlyPoints)

  const chartDescription =
    year === 'all'
      ? t('sales.periodDescAll')
      : month === 'all'
        ? t('sales.periodDescYear', { year })
        : t('sales.periodDescMonth', {
            month: formatPeriodMonth(year, month, language),
          })

  return (
    <div
      aria-labelledby="sales-tab-revenue"
      id="sales-panel-revenue"
      role="tabpanel"
    >
      <section
        aria-label={t('dashboard.salesSummaryAria')}
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          icon={CurrencyCircleDollarIcon}
          label={t('dashboard.totalRevenue')}
          value={formatVnd(analysis.summary.total_revenue, language)}
        />
        <MetricCard
          icon={CurrencyCircleDollarIcon}
          label={t('dashboard.averageOrderValue')}
          value={formatVnd(
            analysis.summary.average_order_value,
            language,
          )}
        />
        <MetricCard
          icon={ShoppingBagOpenIcon}
          label={t('sales.grossRevenue')}
          value={formatVnd(analysis.sales.gross_revenue, language)}
        />
        <MetricCard
          helper={t('sales.discountRateHelper', {
            value: `${formatPercent(
              analysis.sales.discount_rate_percent,
              1,
              false,
              language,
            )}%`,
          })}
          icon={PackageIcon}
          label={t('sales.totalDiscount')}
          value={formatVnd(analysis.sales.total_discount, language)}
        />
      </section>

      <section className="data-panel mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeading
            description={chartDescription}
            title={t('sales.revenueOverTime')}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">
              <span className="mb-1.5 block">{t('sales.yearFilter')}</span>
              <select
                aria-label={t('sales.yearFilter')}
                className="min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => {
                  setSelectedYear(event.target.value)
                  setSelectedMonth('all')
                }}
                value={year}
              >
                <option value="all">{t('sales.allYears')}</option>
                {years.map((availableYear) => (
                  <option key={availableYear} value={availableYear}>
                    {availableYear}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              <span className="mb-1.5 block">{t('sales.monthFilter')}</span>
              <select
                aria-label={t('sales.monthFilter')}
                className="min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                disabled={year === 'all'}
                onChange={(event) => setSelectedMonth(event.target.value)}
                value={month}
              >
                <option value="all">{t('sales.allMonths')}</option>
                {months.map((availableMonth) => (
                  <option key={availableMonth} value={availableMonth}>
                    {formatPeriodMonth(
                      year,
                      availableMonth,
                      language,
                      true,
                    )}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="mt-5">
          {showDaily ? (
            <RevenueLineChart data={dailyPoints} />
          ) : (
            <MonthlyRevenueChart data={monthlyPoints} />
          )}
        </div>
      </section>

      <p className="mt-6 text-xs font-semibold text-slate-500">
        {t('sales.fullPeriodNote')}
      </p>
      <div className="mt-3 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <section className="data-panel min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <SectionHeading
            description={t('sales.weekdayRevenueDesc')}
            title={t('sales.weekdayRevenue')}
          />
          <div className="mt-4">
            <WeekdayRevenueChart
              data={analysis.sales.revenue_by_weekday}
            />
          </div>
        </section>

        <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <SectionHeading
            description={t('sales.concentrationDesc')}
            title={t('sales.concentration')}
          />
          <dl className="mt-5 divide-y divide-slate-100">
            <InsightRow
              label={t('sales.topProductShare')}
              value={`${formatPercent(
                analysis.sales.concentration
                  .top_product_revenue_share_percent,
                1,
                false,
                language,
              )}%`}
            />
            <InsightRow
              label={t('sales.topCategoryShare')}
              value={`${formatPercent(
                analysis.sales.concentration
                  .top_category_revenue_share_percent,
                1,
                false,
                language,
              )}%`}
            />
            <InsightRow
              helper={t('sales.paretoHelper', {
                count: analysis.sales.concentration
                  .top_20_percent_product_count,
              })}
              label={t('sales.paretoShare')}
              value={`${formatPercent(
                analysis.sales.concentration
                  .top_20_percent_products_revenue_share_percent,
                1,
                false,
                language,
              )}%`}
            />
            <InsightRow
              helper={
                analysis.sales.peak_revenue_day
                  ? formatVnd(
                      analysis.sales.peak_revenue_day.revenue,
                      language,
                    )
                  : undefined
              }
              label={t('sales.peakDay')}
              value={
                analysis.sales.peak_revenue_day
                  ? formatDate(
                      analysis.sales.peak_revenue_day.date,
                      language,
                    )
                  : t('common.notAvailable')
              }
            />
            <InsightRow
              helper={
                analysis.sales.lowest_nonzero_revenue_day
                  ? formatVnd(
                      analysis.sales.lowest_nonzero_revenue_day
                        .revenue,
                      language,
                    )
                  : undefined
              }
              label={t('sales.lowestActiveDay')}
              value={
                analysis.sales.lowest_nonzero_revenue_day
                  ? formatDate(
                      analysis.sales.lowest_nonzero_revenue_day.date,
                      language,
                    )
                  : t('common.notAvailable')
              }
            />
          </dl>
        </section>
      </div>
    </div>
  )
}

function ProductsSection({ analysis }: { analysis: AnalysisDetail }) {
  const { language, t } = useLanguage()
  return (
    <div
      aria-labelledby="sales-tab-products"
      id="sales-panel-products"
      role="tabpanel"
    >
      <p className="mt-6 text-xs font-semibold text-slate-500">
        {t('sales.productsPeriodNote')}
      </p>
      <div className="mt-3 grid gap-6 xl:grid-cols-2">
        <section className="data-panel min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <SectionHeading
            description={t('sales.categoryDesc')}
            title={t('sales.byCategory')}
          />
          <div className="mt-4">
            <CategoryRevenueChart
              data={analysis.sales.revenue_by_category}
            />
          </div>
        </section>

        <section className="data-panel min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <SectionHeading
            description={t('sales.productDesc')}
            title={t('sales.byProduct')}
          />
          <div className="mt-4">
            <ProductRevenueChart
              data={analysis.sales.top_products_by_revenue}
            />
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ProductTable
          description={t('sales.rankedRevenue')}
          language={language}
          products={analysis.sales.top_products_by_revenue}
          title={t('sales.topByRevenue')}
          valueLabel={t('dashboard.totalRevenue')}
          valueType="revenue"
        />
        <ProductTable
          description={t('sales.rankedUnits')}
          language={language}
          products={analysis.sales.top_products_by_quantity}
          title={t('sales.topByQuantity')}
          valueLabel={t('common.units')}
          valueType="quantity"
        />
        <ProductTable
          description={t('sales.lowVolumeDesc')}
          language={language}
          products={analysis.sales.lowest_quantity_products}
          title={t('sales.lowestQuantity')}
          valueLabel={t('common.units')}
          valueType="quantity"
        />
      </div>
    </div>
  )
}

function formatPeriodMonth(
  year: string,
  month: string,
  language: 'en' | 'vi',
  capitalize = false,
) {
  if (language === 'vi') {
    return `${capitalize ? 'Tháng' : 'tháng'} ${Number(month)}/${year}`
  }
  return formatMonth(`${year}-${month}`, language)
}

function InsightRow({
  helper,
  label,
  value,
}: {
  helper?: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <dt>
        <p className="text-xs font-bold text-slate-700">{label}</p>
        {helper && (
          <p className="mt-0.5 text-[11px] text-slate-500">{helper}</p>
        )}
      </dt>
      <dd className="shrink-0 text-sm font-black text-slate-900">
        {value}
      </dd>
    </div>
  )
}

function SectionHeading({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
        <ChartBarIcon aria-hidden="true" size={21} weight="duotone" />
      </span>
      <div>
        <h2 className="text-lg font-black tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>
  )
}

function ProductTable({
  description,
  products,
  title,
  valueLabel,
  valueType,
  language,
}: {
  description: string
  products: ProductMetric[]
  title: string
  valueLabel: string
  valueType: 'revenue' | 'quantity'
  language: 'en' | 'vi'
}) {
  const { t } = useLanguage()
  return (
    <section className="data-panel min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <h2 className="font-black tracking-tight text-slate-900">{title}</h2>
      <p className="mt-0.5 min-h-8 text-xs text-slate-500">
        {description}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-left text-xs">
          <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="pb-2.5 pr-3">{t('common.product')}</th>
              <th className="pb-2.5 text-right">{valueLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr className="hover:bg-slate-50/70 transition" key={product.product_id}>
                <td className="py-3 pr-3">
                  <p className="max-w-[180px] break-words font-extrabold leading-5 text-slate-900">
                    {product.product_name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {t('sales.orderCount', {
                      count: formatInteger(product.order_count, language),
                    })}
                  </p>
                </td>
                <td className="py-3 text-right font-black text-slate-900">
                  {valueType === 'revenue'
                    ? formatVnd(product.revenue, language)
                    : formatInteger(product.quantity, language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
