import {
  SparkleIcon,
  UserSwitchIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'

import type {
  RfmAnalysis,
  RfmCustomerMetric,
  RfmSegment,
} from '../../api/analysesApi'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  formatDate,
  formatInteger,
  formatVnd,
} from '../../utils/formatters'

const RFM_SEGMENTS: RfmSegment[] = [
  'new',
  'champion',
  'loyal',
  'at_risk',
  'regular',
]

const SEGMENT_STYLES: Record<RfmSegment, string> = {
  new: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  champion: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  loyal: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  at_risk: 'border-amber-200 bg-amber-50 text-amber-800',
  regular: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function CustomerRfmSection({
  rfm,
}: {
  rfm: RfmAnalysis
}) {
  const { language, t } = useLanguage()

  if (!rfm.available) {
    return (
      <CapabilityNotice
        description={t('rfm.insufficientDesc', {
          actual: formatInteger(rfm.customer_count, language),
          minimum: formatInteger(rfm.minimum_customers, language),
        })}
        title={t('rfm.insufficient')}
      />
    )
  }

  return (
    <section className="mt-6" aria-labelledby="rfm-heading">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
            {t('rfm.eyebrow')}
          </p>
          <h2
            className="mt-1 text-xl font-black tracking-tight text-slate-900"
            id="rfm-heading"
          >
            {t('rfm.title')}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            {t('rfm.desc')}
          </p>
        </div>
        <p className="shrink-0 text-xs font-bold text-slate-500">
          {t('rfm.snapshot', {
            date: formatDate(rfm.snapshot_date, language),
          })}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {RFM_SEGMENTS.map((segment) => (
          <article
            className={`rounded-2xl border px-4 py-4 ${SEGMENT_STYLES[segment]}`}
            key={segment}
          >
            <p className="text-xs font-black uppercase tracking-wider">
              {t(`rfm.segment.${segment}`)}
            </p>
            <p className="mt-2 text-2xl font-black">
              {formatInteger(rfm.segments[segment], language)}
            </p>
            <p className="mt-1 text-[11px] font-semibold opacity-80">
              {t('customers.count', {
                count: formatInteger(rfm.segments[segment], language),
              })}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <RfmCustomerTable
          customers={rfm.top_customers}
          description={t('rfm.topDesc')}
          emptyText={t('rfm.noCustomers')}
          icon="top"
          title={t('rfm.topTitle')}
        />
        <RfmCustomerTable
          customers={rfm.at_risk_customers}
          description={t('rfm.atRiskDesc')}
          emptyText={t('rfm.noAtRisk')}
          icon="risk"
          title={t('rfm.atRiskTitle')}
        />
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        {t('rfm.methodNote')}
      </p>
    </section>
  )
}

function RfmCustomerTable({
  customers,
  description,
  emptyText,
  icon,
  title,
}: {
  customers: RfmCustomerMetric[]
  description: string
  emptyText: string
  icon: 'top' | 'risk'
  title: string
}) {
  const { language, t } = useLanguage()
  const Icon = icon === 'top' ? SparkleIcon : UserSwitchIcon

  return (
    <section className="data-panel min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="flex items-start gap-3 border-b border-slate-100 p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon aria-hidden="true" size={20} weight="duotone" />
        </span>
        <div>
          <h3 className="font-black text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {customers.length > 0 ? (
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[38rem] text-left text-xs">
            <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 pr-3">{t('common.customer')}</th>
                <th className="pb-3 pr-3">{t('common.segment')}</th>
                <th
                  className="pb-3 pr-3 text-right"
                  title={t('rfm.scoreHelp')}
                >
                  {t('rfm.scoreBreakdown')}
                </th>
                <th className="pb-3 pr-3 text-right">
                  {t('rfm.recency')}
                </th>
                <th className="pb-3 pr-3 text-right">
                  {t('rfm.frequency')}
                </th>
                <th className="pb-3 text-right">{t('rfm.monetary')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <tr key={customer.customer_id}>
                  <td className="py-3 pr-3">
                    <p className="font-extrabold text-slate-900">
                      {customer.customer_name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {customer.customer_id}
                    </p>
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-black ${SEGMENT_STYLES[customer.segment]}`}
                    >
                      {t(`rfm.segment.${customer.segment}`)}
                    </span>
                  </td>
                  <td
                    className="py-3 pr-3 text-right font-black text-indigo-700"
                    title={t('rfm.scoreHelp')}
                  >
                    {customer.recency_score} / {customer.frequency_score} /{' '}
                    {customer.monetary_score}
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold text-slate-600">
                    {t('rfm.days', {
                      count: formatInteger(
                        customer.recency_days,
                        language,
                      ),
                    })}
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold text-slate-600">
                    {formatInteger(customer.frequency, language)}
                  </td>
                  <td className="py-3 text-right font-black text-slate-900">
                    {formatVnd(customer.monetary, language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-6 text-center text-xs font-semibold text-slate-500">
          {emptyText}
        </p>
      )}
    </section>
  )
}

function CapabilityNotice({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <UsersThreeIcon
        aria-hidden="true"
        className="mx-auto text-slate-400"
        size={28}
        weight="duotone"
      />
      <h2 className="mt-3 font-black text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-slate-500">
        {description}
      </p>
    </section>
  )
}
