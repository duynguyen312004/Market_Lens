import {
  ArrowRightIcon,
  CaretDownIcon,
  ChartLineUpIcon,
  CloudArrowUpIcon,
  CurrencyCircleDollarIcon,
  FileTextIcon,
  PackageIcon,
  ShoppingBagOpenIcon,
  TrendUpIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router'

import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import {
  AnalysisEmptyState,
  AnalysisErrorState,
  AnalysisLoadingState,
} from '../components/analytics/AnalysisStates'
import {
  CustomerSegmentChart,
  RevenueLineChart,
} from '../components/analytics/Charts'
import { MetricCard } from '../components/analytics/MetricCard'
import { useCurrentAnalysis } from '../features/analysis/analysisQueries'
import {
  formatAnalysisWarning,
  getTrailingPeriodComparison,
} from '../features/analysis/presentation'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatDate,
  formatInteger,
  formatPercent,
  formatVnd,
} from '../utils/formatters'

export function DashboardPage() {
  const { language, t } = useLanguage()
  const { analysis, error, isEmpty, isLoading, retry } = useCurrentAnalysis()

  if (isLoading) return <AnalysisLoadingState />
  if (error) return <AnalysisErrorState error={error} onRetry={retry} />
  if (isEmpty || !analysis) return <AnalysisEmptyState />

  const growth = analysis.summary.growth_rate_percent
  const revenueComparison = getTrailingPeriodComparison(
    analysis.revenue_by_date,
    7,
  )

  return (
    <main className="px-4 py-6 sm:px-7 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1440px]">
        <AnalysisHeader
          analysis={analysis}
          description={t('dashboard.desc')}
          title={t('dashboard.title')}
        />

        {analysis.warnings.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-900 shadow-xs">
            {analysis.warnings
              .map((warning) => formatAnalysisWarning(warning, language))
              .join(' ')}
          </div>
        )}

        {/* Top 4 KPI Metrics */}
        <section
          aria-label={t('dashboard.metricsAria')}
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            featured
            helper={t('dashboard.totalRevenuePeriod', {
              from: formatDate(analysis.period.from, language),
              to: formatDate(analysis.period.to, language),
            })}
            icon={CurrencyCircleDollarIcon}
            label={t('dashboard.totalRevenue')}
            value={formatVnd(analysis.summary.total_revenue, language)}
          />
          <MetricCard
            helper={t('dashboard.uniqueOrders')}
            icon={ShoppingBagOpenIcon}
            label={t('dashboard.totalOrders')}
            value={formatInteger(analysis.summary.total_orders, language)}
          />
          <MetricCard
            helper={
              analysis.customers.available
                ? undefined
                : t('dashboard.customerDataUnavailable')
            }
            icon={UsersThreeIcon}
            label={t('dashboard.totalCustomers')}
            value={
              analysis.customers.available
                ? formatInteger(
                    analysis.summary.total_customers,
                    language,
                  )
                : '—'
            }
          />
          <MetricCard
            helper={t('dashboard.itemsSold')}
            icon={PackageIcon}
            label={t('dashboard.unitsSold')}
            value={formatInteger(analysis.summary.total_quantity_sold, language)}
          />
        </section>

        <details className="group mt-6 rounded-xl border border-[var(--border)] bg-white shadow-[0_1px_2px_rgba(19,33,54,0.04)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <div>
              <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                {t('dashboard.businessHealth')}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {t('dashboard.businessHealthDesc')}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 text-xs font-bold text-[var(--primary)]">
              {t('dashboard.viewMoreMetrics')}
              <CaretDownIcon
                aria-hidden="true"
                className="transition-transform group-open:rotate-180"
                size={16}
                weight="bold"
              />
            </span>
          </summary>
          <div className="grid gap-4 border-t border-[var(--border)] p-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              helper={t('dashboard.completedOrdersHelper', {
                count: formatInteger(
                  analysis.orders.by_status.completed,
                  language,
                ),
              })}
              icon={CurrencyCircleDollarIcon}
              label={t('dashboard.averageOrderValue')}
              value={formatVnd(
                analysis.summary.average_order_value,
                language,
              )}
            />
            <MetricCard
              helper={t('dashboard.allOrderStatuses')}
              icon={ShoppingBagOpenIcon}
              label={t('dashboard.completionRate')}
              value={`${formatPercent(
                analysis.orders.status_rates_percent.completed,
                1,
                false,
                language,
              )}%`}
            />
            <MetricCard
              helper={t('dashboard.discountHelper', {
                amount: formatVnd(
                  analysis.sales.total_discount,
                  language,
                ),
              })}
              icon={PackageIcon}
              label={t('dashboard.discountRate')}
              value={`${formatPercent(
                analysis.sales.discount_rate_percent,
                1,
                false,
                language,
              )}%`}
            />
            <MetricCard
              helper={
                analysis.customers.available
                  ? t('dashboard.repeatHelper', {
                      count: formatInteger(
                        analysis.customers.repeat_customer_count,
                        language,
                      ),
                    })
                  : t('dashboard.customerDataUnavailable')
              }
              icon={UsersThreeIcon}
              label={t('dashboard.repeatRate')}
              value={
                analysis.customers.available
                  ? `${formatPercent(
                      analysis.customers.repeat_customer_rate_percent,
                      1,
                      false,
                      language,
                    )}%`
                  : '—'
              }
            />
          </div>
        </details>

        {/* Revenue Over Time Area Chart */}
        <section className="mt-5 rounded-xl border border-[var(--border)] bg-white p-5 shadow-[0_1px_2px_rgba(19,33,54,0.04)] sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                {t('dashboard.revenueOverTime')}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {t('dashboard.revenueOverTimeDesc')}
              </p>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 whitespace-nowrap text-xs font-bold text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
              to="/sales"
            >
              {t('dashboard.viewDetailed')}
              <ArrowRightIcon aria-hidden="true" size={16} weight="bold" />
            </Link>
          </div>
          {growth !== null && revenueComparison && (
            <RevenueComparisonNote
              current={revenueComparison.current}
              growth={growth}
              previous={revenueComparison.previous}
            />
          )}
          <div className="mt-5">
            <RevenueLineChart data={analysis.revenue_by_date} />
          </div>
        </section>

        {/* Top Products & Customer Segments Grid */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          {/* Top Products Table */}
          <section className="min-w-0 rounded-xl border border-[var(--border)] bg-white p-5 shadow-[0_1px_2px_rgba(19,33,54,0.04)] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                  {t('dashboard.topProducts')}
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t('dashboard.topProductsDesc')}
                </p>
              </div>
              <span className="grid size-8 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                <ChartLineUpIcon aria-hidden="true" size={21} weight="duotone" />
              </span>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)]">
                  <tr>
                    <th className="pb-3 pr-4">{t('common.product')}</th>
                    <th className="pb-3 pr-4 text-right">{t('common.quantity')}</th>
                    <th className="pb-3 text-right">{t('common.revenue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.sales.top_products_by_revenue.map(
                    (product, index) => (
                      <tr
                        className="hover:bg-slate-50/70 transition"
                        key={product.product_id}
                      >
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[var(--surface-subtle)] text-[11px] font-bold text-[var(--text-muted)]">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">
                                {product.product_name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {product.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-right font-semibold text-slate-600">
                          {formatInteger(product.quantity, language)}
                        </td>
                        <td className="py-3.5 text-right font-black text-slate-900">
                          {formatVnd(product.revenue, language)}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Customer Segments Chart */}
          <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-[0_1px_2px_rgba(19,33,54,0.04)] sm:p-6">
            <div>
              <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                {t('dashboard.customerSegments')}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {t('dashboard.customerSegmentsDesc')}
              </p>
            </div>
            {analysis.customers.available ? (
              <div className="mt-4">
                <CustomerSegmentChart
                  segments={analysis.customers.segments}
                />
              </div>
            ) : (
              <CustomerDataUnavailable />
            )}
          </section>
        </div>

        {/* Top Customers Table & Quick Actions Grid */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <section className="min-w-0 rounded-xl border border-[var(--border)] bg-white p-5 shadow-[0_1px_2px_rgba(19,33,54,0.04)] sm:p-6">
            <h2 className="text-base font-extrabold text-[var(--text-primary)]">
              {t('dashboard.topCustomers')}
            </h2>
            {analysis.customers.available ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)]">
                  <tr>
                    <th className="pb-3 pr-4">{t('common.customer')}</th>
                    <th className="pb-3 pr-4 text-right">{t('common.orders')}</th>
                    <th className="pb-3 pr-4 text-right">{t('common.units')}</th>
                    <th className="pb-3 text-right">{t('common.totalSpent')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.customers.top_customers.map((customer) => (
                    <tr
                      className="hover:bg-slate-50/70 transition"
                      key={customer.customer_id}
                    >
                      <td className="py-3.5 pr-4 font-bold text-slate-900">
                        {customer.customer_name}
                      </td>
                      <td className="py-3.5 pr-4 text-right font-medium text-slate-600">
                        {formatInteger(customer.order_count, language)}
                      </td>
                      <td className="py-3.5 pr-4 text-right font-medium text-slate-600">
                        {formatInteger(customer.quantity, language)}
                      </td>
                      <td className="py-3.5 text-right font-black text-slate-900">
                        {formatVnd(customer.revenue, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
              <CustomerDataUnavailable />
            )}
          </section>

          {/* Quick Actions Sidebar Card */}
          <aside className="rounded-xl border border-[#173a68] bg-[#102947] p-5 text-white sm:p-6">
            <h2 className="text-base font-extrabold text-white">
              {t('dashboard.quickActions')}
            </h2>
            <div className="mt-4 space-y-2.5">
              <QuickActionCard
                icon={CloudArrowUpIcon}
                label={t('nav.upload')}
                to="/upload"
              />
              <QuickActionCard
                icon={TrendUpIcon}
                label={t('nav.forecast')}
                to="/forecast"
              />
              <QuickActionCard
                icon={FileTextIcon}
                label={t('nav.report')}
                to="/report"
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function RevenueComparisonNote({
  current,
  growth,
  previous,
}: {
  current: { from: string; to: string }
  growth: number
  previous: { from: string; to: string }
}) {
  const { language, t } = useLanguage()
  const copyKey =
    growth > 0
      ? 'dashboard.revenueComparisonHigher'
      : growth < 0
        ? 'dashboard.revenueComparisonLower'
        : 'dashboard.revenueComparisonUnchanged'

  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[var(--primary)]">
        <TrendUpIcon aria-hidden="true" size={18} weight="duotone" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-slate-900">
          {t('dashboard.revenueComparisonTitle')}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {t(copyKey, {
            currentFrom: formatDate(current.from, language),
            currentTo: formatDate(current.to, language),
            previousFrom: formatDate(previous.from, language),
            previousTo: formatDate(previous.to, language),
            value: formatPercent(Math.abs(growth), 1, false, language),
          })}
        </p>
      </div>
    </div>
  )
}

function QuickActionCard({
  icon: IconComponent,
  label,
  to,
}: {
  icon: typeof CloudArrowUpIcon
  label: string
  to: string
}) {
  return (
    <Link
      className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/6 p-3 text-sm font-bold text-slate-100 transition-colors hover:bg-white/10"
      to={to}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-md bg-white/10 text-blue-200">
          <IconComponent size={18} weight="bold" />
        </span>
        {label}
      </div>
      <ArrowRightIcon className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-white" size={16} weight="bold" />
    </Link>
  )
}

function CustomerDataUnavailable() {
  const { t } = useLanguage()

  return (
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <p className="text-sm font-extrabold text-slate-900">
        {t('customers.unavailableTitle')}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        {t('dashboard.customerDataUnavailableDesc')}
      </p>
      <Link
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 hover:underline"
        to="/upload"
      >
        {t('customers.uploadAnother')}
        <ArrowRightIcon aria-hidden="true" size={14} weight="bold" />
      </Link>
    </div>
  )
}
