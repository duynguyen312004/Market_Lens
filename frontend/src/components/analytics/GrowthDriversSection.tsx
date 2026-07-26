import { ClockCounterClockwiseIcon, TrendUpIcon } from '@phosphor-icons/react'
import { useState } from 'react'

import type {
  CategoryGrowthMetric,
  GrowthDriverAnalysis,
  GrowthDriverPeriod,
  ProductGrowthMetric,
} from '../../api/analysesApi'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  formatDate,
  formatInteger,
  formatPercent,
  formatVnd,
} from '../../utils/formatters'

type EntityView = 'products' | 'categories'
type GrowthRow = ProductGrowthMetric | CategoryGrowthMetric

export function GrowthDriversSection({
  analysis,
}: {
  analysis: GrowthDriverAnalysis
}) {
  const { t } = useLanguage()
  const [comparisonType, setComparisonType] = useState<'month' | 'year'>(
    analysis.default_comparison_type,
  )
  const [entityView, setEntityView] = useState<EntityView>('products')
  const period =
    analysis.periods.find(
      (item) => item.comparison_type === comparisonType,
    ) ?? analysis.periods[0]

  if (!period) return null

  return (
    <div
      aria-labelledby="sales-tab-growth"
      className="mt-6 space-y-5"
      id="sales-panel-growth"
      role="tabpanel"
    >
      <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-3xl items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
              <TrendUpIcon aria-hidden="true" size={22} weight="duotone" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                {t('sales.growthTitle')}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {t('sales.growthDesc')}
              </p>
            </div>
          </div>

          <div
            aria-label={t('sales.growthTitle')}
            className="flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1"
            role="group"
          >
            {(['month', 'year'] as const).map((type) => (
              <button
                aria-pressed={comparisonType === type}
                className={[
                  'rounded-lg px-4 py-2 text-xs font-extrabold transition',
                  comparisonType === type
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900',
                ].join(' ')}
                key={type}
                onClick={() => setComparisonType(type)}
                type="button"
              >
                {t(`sales.growthPeriod.${type}`)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {!period.available ? (
        <UnavailablePeriod period={period} />
      ) : (
        <AvailablePeriod
          entityView={entityView}
          onEntityViewChange={setEntityView}
          period={period}
        />
      )}
    </div>
  )
}

function UnavailablePeriod({
  period,
}: {
  period: GrowthDriverPeriod
}) {
  const { language, t } = useLanguage()
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
      <ClockCounterClockwiseIcon
        aria-hidden="true"
        className="mx-auto text-slate-400"
        size={30}
        weight="duotone"
      />
      <h2 className="mt-3 text-lg font-black text-slate-900">
        {t('sales.growthUnavailable')}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
        {t('sales.growthUnavailableDesc', {
          type: t(`sales.growthPeriod.${period.comparison_type}`),
          required: formatDate(period.required_history_from, language),
        })}
      </p>
    </section>
  )
}

function AvailablePeriod({
  entityView,
  onEntityViewChange,
  period,
}: {
  entityView: EntityView
  onEntityViewChange: (view: EntityView) => void
  period: GrowthDriverPeriod
}) {
  const { language, t } = useLanguage()
  const growthRows =
    entityView === 'products'
      ? period.product_growth_drivers
      : period.category_growth_drivers
  const declineRows =
    entityView === 'products'
      ? period.product_decline_drivers
      : period.category_decline_drivers

  return (
    <>
      <section
        aria-label={t('sales.growthTitle')}
        className="grid gap-4 md:grid-cols-3"
      >
        <PeriodMetric
          label={t('sales.currentPeriod')}
          period={period.current_period}
          value={period.current_revenue}
        />
        <PeriodMetric
          label={t('sales.previousPeriod')}
          period={period.previous_period}
          value={period.previous_revenue}
        />
        <article className="rounded-2xl border border-indigo-200 bg-indigo-600 p-5 text-white shadow-xs">
          <p className="text-xs font-bold text-indigo-100">
            {t('sales.netChange')}
          </p>
          <p className="mt-2 text-2xl font-black">
            {formatSignedVnd(period.net_revenue_change ?? 0, language)}
          </p>
          <p className="mt-2 text-xs font-bold text-indigo-100">
            {period.growth_rate_percent === null
              ? t('forecast.noComparison')
              : `${formatPercent(
                  period.growth_rate_percent,
                  1,
                  true,
                  language,
                )}%`}
          </p>
        </article>
      </section>

      <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {entityView === 'products'
                ? t('sales.productsView')
                : t('sales.categoriesView')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {t('sales.growthDesc')}
            </p>
          </div>
          <div
            className="flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1"
            role="group"
          >
            {(['products', 'categories'] as const).map((view) => (
              <button
                aria-pressed={entityView === view}
                className={[
                  'rounded-lg px-4 py-2 text-xs font-extrabold transition',
                  entityView === view
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900',
                ].join(' ')}
                key={view}
                onClick={() => onEntityViewChange(view)}
                type="button"
              >
                {t(
                  view === 'products'
                    ? 'sales.productsView'
                    : 'sales.categoriesView',
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-6">
          <DriverList
            emptyKey="sales.noGrowthDrivers"
            positive
            rows={growthRows}
            title={t('sales.growthLeaders')}
          />
          <DriverList
            emptyKey="sales.noDeclineDrivers"
            positive={false}
            rows={declineRows}
            title={t('sales.declineLeaders')}
          />
        </div>
      </section>
    </>
  )
}

function PeriodMetric({
  label,
  period,
  value,
}: {
  label: string
  period: GrowthDriverPeriod['current_period']
  value: number | null
}) {
  const { language, t } = useLanguage()
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <p className="text-xs font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">
        {value === null
          ? t('common.notAvailable')
          : formatVnd(value, language)}
      </p>
      {period && (
        <p className="mt-2 text-xs font-medium text-slate-500">
          {t('common.dateRange', {
            from: formatDate(period.from, language),
            to: formatDate(period.to, language),
          })}
        </p>
      )}
    </article>
  )
}

function DriverList({
  emptyKey,
  positive,
  rows,
  title,
}: {
  emptyKey: string
  positive: boolean
  rows: GrowthRow[]
  title: string
}) {
  const { language, t } = useLanguage()
  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        <span
          className={[
            'rounded-full px-2.5 py-1 text-[11px] font-extrabold',
            positive
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700',
          ].join(' ')}
        >
          {formatInteger(rows.length, language)}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-5 text-sm text-slate-600">{t(emptyKey)}</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {rows.map((row) => {
            const name =
              'product_name' in row ? row.product_name : row.category
            const key =
              'product_id' in row
                ? row.product_id
                : `${row.category}-${row.change_type}`
            return (
              <li
                className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                key={key}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-extrabold text-slate-900">
                      {name}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      {t(`sales.changeType.${row.change_type}`)}
                    </span>
                  </div>
                  <dl className="mt-3 flex flex-wrap gap-2">
                    <ChangeMetric
                      label={t('sales.ordersChange')}
                      value={row.order_count_change}
                    />
                    <ChangeMetric
                      label={t('sales.unitsChange')}
                      value={row.quantity_change}
                    />
                  </dl>
                </div>
                <div className="sm:text-right">
                  <p
                    className={[
                      'text-sm font-black',
                      positive ? 'text-emerald-700' : 'text-rose-700',
                    ].join(' ')}
                  >
                    {formatSignedVnd(row.revenue_change, language)}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-5 text-slate-600">
                    {t(
                      positive
                        ? 'sales.growthContribution'
                        : 'sales.declineContribution',
                      {
                        value: formatPercent(
                          row.contribution_to_direction_percent,
                          1,
                          false,
                          language,
                        ),
                      },
                    )}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function ChangeMetric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  const { language, t } = useLanguage()
  const tone =
    value > 0
      ? 'border-emerald-100 bg-emerald-50/70 text-emerald-700'
      : value < 0
        ? 'border-rose-100 bg-rose-50/70 text-rose-700'
        : 'border-slate-200 bg-slate-50 text-slate-600'
  const valueKey =
    value > 0
      ? 'sales.changeIncrease'
      : value < 0
        ? 'sales.changeDecrease'
        : 'sales.changeUnchanged'

  return (
    <div className={`min-w-32 rounded-lg border px-3 py-2 ${tone}`}>
      <dt className="text-xs font-semibold text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-sm font-extrabold">
        {t(valueKey, {
          value: formatInteger(Math.abs(value), language),
        })}
      </dd>
    </div>
  )
}

function formatSignedVnd(
  value: number,
  language: 'en' | 'vi',
) {
  if (value === 0) return formatVnd(0, language)
  return `${value > 0 ? '+' : '−'}${formatVnd(Math.abs(value), language)}`
}
