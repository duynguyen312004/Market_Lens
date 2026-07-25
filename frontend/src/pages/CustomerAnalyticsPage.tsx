import {
  CaretDownIcon,
  CrownIcon,
  SparkleIcon,
  UserPlusIcon,
  UsersThreeIcon,
  UserSwitchIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'

import type { AnalysisDetail } from '../api/analysesApi'
import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import { AnalyticsTabs } from '../components/analytics/AnalyticsTabs'
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

type CustomerSection =
  | 'overview'
  | 'customers'
  | 'behavior'
  | 'retention'

export function CustomerAnalyticsPage() {
  const { t } = useLanguage()
  const { analysis, error, isEmpty, isLoading, retry } =
    useCurrentAnalysis()
  const [activeSection, setActiveSection] =
    useState<CustomerSection>('overview')

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
          description={t('customers.desc')}
          title={t('customers.title')}
        />

        <AnalyticsTabs
          activeId={activeSection}
          ariaLabel={t('customers.sectionsAria')}
          idPrefix="customers"
          items={[
            { id: 'overview', label: t('customers.overviewTab') },
            { id: 'customers', label: t('customers.customerListTab') },
            { id: 'behavior', label: t('customers.behaviorTab') },
            { id: 'retention', label: t('customers.retentionTab') },
          ]}
          onChange={setActiveSection}
        />

        {activeSection === 'overview' && (
          <CustomerOverview analysis={analysis} />
        )}
        {activeSection === 'customers' && (
          <CustomerLists analysis={analysis} />
        )}
        {activeSection === 'behavior' && (
          <div
            aria-labelledby="customers-tab-behavior"
            id="customers-panel-behavior"
            role="tabpanel"
          >
            <CustomerRfmSection rfm={analysis.customers.rfm} />
          </div>
        )}
        {activeSection === 'retention' && (
          <div
            aria-labelledby="customers-tab-retention"
            id="customers-panel-retention"
            role="tabpanel"
          >
            <CustomerCohortSection
              cohort={analysis.customers.cohort_analysis}
            />
          </div>
        )}
      </div>
    </main>
  )
}

function CustomerOverview({ analysis }: { analysis: AnalysisDetail }) {
  const { language, t } = useLanguage()
  const { customers, summary } = analysis
  const vipRevenue = customers.revenue_by_segment.find(
    (item) => item.segment === 'vip',
  )

  return (
    <div
      aria-labelledby="customers-tab-overview"
      id="customers-panel-overview"
      role="tabpanel"
    >
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

      <details className="group mt-6 rounded-xl border border-[var(--border)] bg-white shadow-[0_1px_2px_rgba(19,33,54,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-slate-900">
              {t('customers.health')}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {t('customers.healthDesc')}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-xs font-bold text-[var(--primary)]">
            {t('customers.viewMoreMetrics')}
            <CaretDownIcon
              aria-hidden="true"
              className="transition-transform group-open:rotate-180"
              size={16}
              weight="bold"
            />
          </span>
        </summary>
        <div className="grid gap-4 border-t border-[var(--border)] p-4 sm:grid-cols-3">
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
      </details>

      <section className="data-panel mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-lg font-black tracking-tight text-slate-900">
          {t('customers.composition')}
        </h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
          {t('customers.compositionDesc')}
        </p>
        <div className="mt-5 grid items-center gap-6 lg:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)]">
          <CustomerSegmentChart segments={customers.segments} />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {t('customers.segmentRevenue')}
            </h3>
            <dl className="mt-3 divide-y divide-slate-100">
              {customers.revenue_by_segment.map((item) => (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 first:pt-0 last:pb-0"
                  key={item.segment}
                >
                  <dt>
                    <p className="text-sm font-extrabold text-slate-900">
                      {getSegmentLabel(item.segment, language)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t('customers.count', {
                        count: formatInteger(
                          item.customer_count,
                          language,
                        ),
                      })}
                    </p>
                  </dt>
                  <dd className="text-right">
                    <p className="text-sm font-black text-slate-900">
                      {formatVnd(item.revenue, language)}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-indigo-700">
                      {t('customers.revenueShareValue', {
                        value: `${formatPercent(
                          item.revenue_share_percent,
                          1,
                          false,
                          language,
                        )}%`,
                      })}
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </div>
  )
}

function CustomerLists({ analysis }: { analysis: AnalysisDetail }) {
  const { language, t } = useLanguage()
  const { customers } = analysis

  return (
    <div
      aria-labelledby="customers-tab-customers"
      id="customers-panel-customers"
      role="tabpanel"
    >
      <p className="mt-6 max-w-3xl text-xs font-semibold leading-5 text-slate-500">
        {t('customers.customerListIntro')}
      </p>

      <section className="data-panel mt-3 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-start gap-3.5 border-b border-slate-100 p-5 sm:p-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
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
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
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
                  <th className="pb-3 pr-4 text-right">
                    {t('common.orders')}
                  </th>
                  <th className="pb-3 pr-4 text-right">
                    {t('common.lastPurchase')}
                  </th>
                  <th className="pb-3 text-right">
                    {t('common.revenue')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.potential_customers.map((customer) => (
                  <tr
                    className="transition hover:bg-slate-50/70"
                    key={customer.customer_id}
                  >
                    <td className="py-3.5 pr-4">
                      <p className="font-extrabold text-slate-900">
                        {customer.customer_name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {t('customers.unitsPurchased', {
                          count: formatInteger(
                            customer.quantity,
                            language,
                          ),
                        })}
                      </p>
                    </td>
                    <td className="py-3.5 pr-4 text-right font-semibold text-slate-600">
                      {formatInteger(customer.order_count, language)}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-medium text-slate-500">
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

      <section className="data-panel mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-lg font-black tracking-tight text-slate-900">
          {t('customers.ranking')}
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {t('customers.rankingDesc')}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-xs">
            <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 pr-4">{t('common.customer')}</th>
                <th className="pb-3 pr-4">{t('common.segment')}</th>
                <th className="pb-3 pr-4 text-right">
                  {t('common.orders')}
                </th>
                <th className="pb-3 pr-4 text-right">
                  {t('common.firstOrder')}
                </th>
                <th className="pb-3 pr-4 text-right">
                  {t('common.lastOrder')}
                </th>
                <th className="pb-3 text-right">
                  {t('common.revenue')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.top_customers.map((customer) => (
                <tr
                  className="transition hover:bg-slate-50/70"
                  key={customer.customer_id}
                >
                  <td className="py-3.5 pr-4 font-extrabold text-slate-900">
                    {customer.customer_name}
                  </td>
                  <td className="py-3.5 pr-4">
                    <CustomerSegmentBadge
                      language={language}
                      segment={customer.segment}
                    />
                  </td>
                  <td className="py-3.5 pr-4 text-right font-semibold text-slate-600">
                    {formatInteger(customer.order_count, language)}
                  </td>
                  <td className="py-3.5 pr-4 text-right font-medium text-slate-500">
                    {formatDate(customer.first_order_date, language)}
                  </td>
                  <td className="py-3.5 pr-4 text-right font-medium text-slate-500">
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
  )
}

function CustomerSegmentBadge({
  language,
  segment,
}: {
  language: 'en' | 'vi'
  segment: 'new' | 'returning' | 'vip'
}) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold',
        segment === 'vip' && 'border-indigo-200/60 bg-indigo-50 text-indigo-700',
        segment === 'returning' && 'border-cyan-200/60 bg-cyan-50 text-cyan-700',
        segment === 'new' && 'border-emerald-200/60 bg-emerald-50 text-emerald-700',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {getSegmentLabel(segment, language)}
    </span>
  )
}
