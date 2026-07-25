import {
  CrownIcon,
  SparkleIcon,
  UserPlusIcon,
  UsersThreeIcon,
  UserSwitchIcon,
} from '@phosphor-icons/react'

import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import { CustomerCohortSection } from '../components/analytics/CustomerCohortSection'
import { CustomerRfmSection } from '../components/analytics/CustomerRfmSection'
import {
  AnalysisEmptyState,
  AnalysisErrorState,
  AnalysisLoadingState,
} from '../components/analytics/AnalysisStates'
import { CustomerSegmentChart } from '../components/analytics/Charts'
import { MetricCard } from '../components/analytics/MetricCard'
import { useCurrentAnalysis } from '../features/analysis/analysisQueries'
import { getSegmentLabel } from '../features/analysis/presentation'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatDate,
  formatInteger,
  formatPercent,
  formatVnd,
} from '../utils/formatters'

export function CustomerAnalyticsPage() {
  const { language, t } = useLanguage()
  const { analysis, error, isEmpty, isLoading, retry } = useCurrentAnalysis()

  if (isLoading) return <AnalysisLoadingState />
  if (error) return <AnalysisErrorState error={error} onRetry={retry} />
  if (isEmpty || !analysis) {
    return <AnalysisEmptyState title={t('analysis.noDataTitle')} />
  }

  const { customers, summary } = analysis
  const vipRevenue = customers.revenue_by_segment.find(
    (item) => item.segment === 'vip',
  )

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <AnalysisHeader
          analysis={analysis}
          description={t('customers.desc')}
          title={t('customers.title')}
        />

        {/* Customer Metric Cards Grid */}
        <section
          aria-label={t('dashboard.customerSummaryAria')}
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            icon={UsersThreeIcon}
            label={t('dashboard.totalCustomers')}
            value={formatInteger(summary.total_customers, language)}
          />
          <MetricCard
            helper={t('customers.exactlyOne')}
            icon={UserPlusIcon}
            label={t('customers.new')}
            value={formatInteger(customers.segments.new, language)}
          />
          <MetricCard
            helper={t('customers.twoOrMore')}
            icon={UserSwitchIcon}
            label={t('customers.returning')}
            value={formatInteger(customers.segments.returning, language)}
          />
          <MetricCard
            helper={t('customers.topTen')}
            icon={CrownIcon}
            label={t('customers.vip')}
            value={formatInteger(customers.segments.vip, language)}
          />
        </section>

        <section className="mt-6">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              {t('customers.health')}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t('customers.healthDesc')}
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={UserSwitchIcon}
              label={t('dashboard.repeatRate')}
              value={`${formatPercent(
                customers.repeat_customer_rate_percent,
                1,
                false,
                language,
              )}%`}
            />
            <MetricCard
              icon={UsersThreeIcon}
              label={t('customers.repeatCount')}
              value={formatInteger(
                customers.repeat_customer_count,
                language,
              )}
            />
            <MetricCard
              icon={SparkleIcon}
              label={t('customers.revenuePerCustomer')}
              value={formatVnd(
                summary.average_revenue_per_customer,
                language,
              )}
            />
            <MetricCard
              icon={CrownIcon}
              label={t('customers.vipRevenueShare')}
              value={`${formatPercent(
                vipRevenue?.revenue_share_percent ?? 0,
                1,
                false,
                language,
              )}%`}
            />
          </div>
        </section>

        <CustomerRfmSection rfm={customers.rfm} />
        <CustomerCohortSection cohort={customers.cohort_analysis} />

        {/* Customer Composition & Potential Customers */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(22rem,0.85fr)_minmax(0,1.15fr)]">
          <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              {t('customers.composition')}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t('customers.compositionDesc')}
            </p>
            <div className="mt-4">
              <CustomerSegmentChart segments={customers.segments} />
            </div>
          </section>

          <section className="data-panel min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="flex items-start gap-3.5 border-b border-[var(--border)] bg-[var(--primary-soft)] p-5 sm:p-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-xs">
                <SparkleIcon aria-hidden="true" size={22} weight="duotone" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg font-black tracking-tight text-slate-900">
                    {t('customers.potential')}
                  </h2>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-700">
                    {t('customers.count', {
                      count: formatInteger(
                        customers.potential_count,
                        language,
                      ),
                    })}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('customers.potentialDesc')}
                </p>
              </div>
            </div>

            {customers.potential_customers.length > 0 ? (
              <div className="overflow-x-auto p-5 sm:p-6">
                <table className="w-full min-w-[36rem] text-left text-xs">
                  <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="pb-3 pr-4">{t('common.customer')}</th>
                      <th className="pb-3 pr-4 text-right">{t('common.orders')}</th>
                      <th className="pb-3 pr-4 text-right">{t('common.lastPurchase')}</th>
                      <th className="pb-3 text-right">{t('common.revenue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.potential_customers.map((customer) => (
                      <tr className="hover:bg-slate-50/70 transition" key={customer.customer_id}>
                        <td className="py-3.5 pr-4">
                          <p className="font-extrabold text-slate-900">
                            {customer.customer_name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {formatInteger(customer.quantity, language)} {t('common.units').toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US')}
                          </p>
                        </td>
                        <td className="py-3.5 pr-4 text-right font-semibold text-slate-600">
                          {formatInteger(customer.order_count, language)}
                        </td>
                        <td className="py-3.5 pr-4 text-right text-slate-500 font-medium">
                          {formatDate(customer.last_order_date, language)}
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
              <p className="p-6 text-center text-xs font-semibold text-slate-500">
                {t('customers.noPotential')}
              </p>
            )}
          </section>
        </div>

        <section className="data-panel mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-lg font-black tracking-tight text-slate-900">
            {t('customers.segmentRevenue')}
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-xs">
              <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 pr-4">{t('common.segment')}</th>
                  <th className="pb-3 pr-4 text-right">
                    {t('customers.customerCount')}
                  </th>
                  <th className="pb-3 pr-4 text-right">
                    {t('common.revenue')}
                  </th>
                  <th className="pb-3 text-right">
                    {t('common.revenueShare')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.revenue_by_segment.map((item) => (
                  <tr key={item.segment}>
                    <td className="py-3.5 pr-4 font-extrabold text-slate-900">
                      {getSegmentLabel(item.segment, language)}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-semibold text-slate-600">
                      {formatInteger(item.customer_count, language)}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-black text-slate-900">
                      {formatVnd(item.revenue, language)}
                    </td>
                    <td className="py-3.5 text-right font-bold text-indigo-700">
                      {formatPercent(
                        item.revenue_share_percent,
                        1,
                        false,
                        language,
                      )}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Spending Customers Full Table */}
        <section className="data-panel mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <h2 className="text-lg font-black tracking-tight text-slate-900">
            {t('customers.ranking')}
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-xs">
              <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 pr-4">{t('common.customer')}</th>
                  <th className="pb-3 pr-4">{t('common.segment')}</th>
                  <th className="pb-3 pr-4 text-right">{t('common.orders')}</th>
                  <th className="pb-3 pr-4 text-right">{t('common.firstOrder')}</th>
                  <th className="pb-3 pr-4 text-right">{t('common.lastOrder')}</th>
                  <th className="pb-3 text-right">{t('common.revenue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.top_customers.map((customer) => (
                  <tr className="hover:bg-slate-50/70 transition" key={customer.customer_id}>
                    <td className="py-3.5 pr-4 font-extrabold text-slate-900">
                      {customer.customer_name}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold',
                          customer.segment === 'vip' && 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
                          customer.segment === 'returning' && 'bg-cyan-50 text-cyan-700 border border-cyan-200/60',
                          customer.segment === 'new' && 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {getSegmentLabel(customer.segment, language)}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right font-semibold text-slate-600">
                      {formatInteger(customer.order_count, language)}
                    </td>
                    <td className="py-3.5 pr-4 text-right text-slate-500 font-medium">
                      {formatDate(customer.first_order_date, language)}
                    </td>
                    <td className="py-3.5 pr-4 text-right text-slate-500 font-medium">
                      {formatDate(customer.last_order_date, language)}
                    </td>
                    <td className="py-3.5 text-right font-black text-slate-900">
                      {formatVnd(customer.revenue, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
