import {
  CalendarDotsIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  CloudArrowUpIcon,
  InfoIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router'

import type {
  AnalysisDetail,
  ForecastResult,
} from '../api/analysesApi'
import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import {
  AnalysisEmptyState,
  AnalysisErrorState,
  AnalysisLoadingState,
} from '../components/analytics/AnalysisStates'
import { ForecastRevenueChart } from '../components/analytics/Charts'
import { ForecastMethodologySection } from '../components/analytics/ForecastMethodologySection'
import { useCurrentAnalysis } from '../features/analysis/analysisQueries'
import {
  getDatePeriod,
  getTrailingPeriodComparison,
} from '../features/analysis/presentation'
import {
  buildForecastChartData,
  getForecastMethodLabel,
  getForecastReliabilityLabel,
  getForecastReliabilityTone,
} from '../features/forecast/forecastPresentation'
import { useLanguage, type Language } from '../i18n/LanguageContext'
import {
  formatDate,
  formatPercent,
  formatVnd,
  formatWeekday,
} from '../utils/formatters'

const reliabilityClasses = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  negative: 'border-rose-200 bg-rose-50 text-rose-700',
  neutral: 'border-slate-200 bg-slate-100 text-slate-600',
}

export function ForecastPage() {
  const { t } = useLanguage()
  const { analysis, error, isEmpty, isLoading, retry } = useCurrentAnalysis()
  const [selectedHorizon, setSelectedHorizon] = useState<7 | 30>(7)

  if (isLoading) return <AnalysisLoadingState />
  if (error) return <AnalysisErrorState error={error} onRetry={retry} />
  if (isEmpty || !analysis) {
    return <AnalysisEmptyState title={t('forecast.noData')} />
  }
  const forecast =
    analysis.forecast.horizons.find(
      (item) => item.horizon_days === selectedHorizon,
    ) ?? analysis.forecast.horizons[0]
  if (!forecast) {
    return <AnalysisEmptyState title={t('forecast.noData')} />
  }

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <AnalysisHeader
          analysis={analysis}
          description={t('forecast.desc')}
          title={t('forecast.title')}
        />

        <ForecastHorizonPicker
          onChange={setSelectedHorizon}
          selectedHorizon={selectedHorizon}
        />

        {!forecast.available ? (
          <UnavailableForecast forecast={forecast} />
        ) : (
          <AvailableForecast analysis={analysis} forecast={forecast} />
        )}
      </div>
    </main>
  )
}

function ForecastHorizonPicker({
  onChange,
  selectedHorizon,
}: {
  onChange: (value: 7 | 30) => void
  selectedHorizon: 7 | 30
}) {
  const { t } = useLanguage()
  return (
    <div className="mt-6">
      <p className="mb-2 text-xs font-bold text-slate-600">
        {t('forecast.horizonPicker')}
      </p>
      <div
        className="flex w-fit rounded-xl border border-slate-200 bg-white p-1"
        role="group"
      >
        {([7, 30] as const).map((days) => (
          <button
            aria-pressed={selectedHorizon === days}
            className={[
              'rounded-lg px-5 py-2.5 text-xs font-extrabold transition',
              selectedHorizon === days
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')}
            key={days}
            onClick={() => onChange(days)}
            type="button"
          >
            {t('forecast.horizonOption', { count: days })}
          </button>
        ))}
      </div>
    </div>
  )
}

function UnavailableForecast({ forecast }: { forecast: ForecastResult }) {
  const { t } = useLanguage()
  const missingDays = Math.max(
    0,
    forecast.minimum_history_days - forecast.history_days,
  )

  return (
    <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
      <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-9">
        <span className="grid size-14 place-items-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-600">
          <ClockCounterClockwiseIcon
            aria-hidden="true"
            size={30}
            weight="duotone"
          />
        </span>
        <p className="mt-6 text-sm font-extrabold text-amber-700">
          {t('forecast.historyProgress', {
            current: forecast.history_days,
            minimum: forecast.minimum_history_days,
          })}
        </p>
        <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {t('forecast.insufficientTitle')}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
          {t('forecast.insufficientDesc', {
            current: forecast.history_days,
            minimum: forecast.minimum_history_days,
            missing: missingDays,
          })}
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 active:translate-y-px"
          to="/upload"
        >
          <CloudArrowUpIcon aria-hidden="true" size={18} weight="bold" />
          {t('upload.title')}
        </Link>
      </section>

      <aside className="data-panel rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <h2 className="font-black text-slate-900">{t('forecast.rulesTitle')}</h2>
        <dl className="mt-4 divide-y divide-slate-100 text-xs">
          <ForecastRule
            description={t('forecast.rule7Days')}
            label={t('forecast.rule7DaysLabel')}
          />
          <ForecastRule
            description={t('forecast.rule30Days')}
            label={t('forecast.rule30DaysLabel')}
          />
          <ForecastRule
            description={t('forecast.ruleTesting')}
            label={t('forecast.ruleTestingLabel')}
          />
        </dl>
        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
          <InfoIcon
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-indigo-600"
            size={16}
            weight="fill"
          />
          <p>{t('forecast.disclaimer')}</p>
        </div>
      </aside>
    </div>
  )
}

function ForecastRule({
  description,
  label,
}: {
  description: string
  label: string
}) {
  return (
    <div className="py-3.5 first:pt-0 last:pb-0">
      <dt className="font-bold text-slate-900">{label}</dt>
      <dd className="mt-1 leading-relaxed text-slate-500">{description}</dd>
    </div>
  )
}

function AvailableForecast({
  analysis,
  forecast,
}: {
  analysis: AnalysisDetail
  forecast: ForecastResult
}) {
  const { revenue_by_date } = analysis
  const chartData = buildForecastChartData(revenue_by_date, forecast)

  return (
    <div className="mt-6 space-y-6">
      <ForecastSummary
        forecast={forecast}
        revenueByDate={revenue_by_date}
      />
      <ForecastChartSection data={chartData} forecast={forecast} />
      <DailyForecastSection forecast={forecast} />
      <ForecastMethodologySection forecast={forecast} />
      <ForecastDisclaimer />
    </div>
  )
}

function ForecastSummary({
  forecast,
  revenueByDate,
}: {
  forecast: ForecastResult
  revenueByDate: AnalysisDetail['revenue_by_date']
}) {
  const { language, t } = useLanguage()
  const reliabilityTone = getForecastReliabilityTone(
    forecast.evaluation.reliability,
  )
  const forecastPeriod = getDatePeriod(forecast.points)
  const actualComparison = getTrailingPeriodComparison(
    revenueByDate,
    forecast.horizon_days,
  )
  const actualPeriod = actualComparison?.current ?? null
  const forecastPeriodValue = forecastPeriod
    ? t('forecast.periodValue', {
        count: forecast.horizon_days,
        from: formatDate(forecastPeriod.from, language),
        to: formatDate(forecastPeriod.to, language),
      })
    : t('common.notAvailable')
  const comparisonKey =
    forecast.change_vs_previous_period_percent === null
      ? null
      : forecast.change_vs_previous_period_percent > 0
        ? 'forecast.comparisonHigher'
        : forecast.change_vs_previous_period_percent < 0
          ? 'forecast.comparisonLower'
          : 'forecast.comparisonUnchanged'

  return (
    <section
      aria-label={t('forecast.summaryAria')}
      className="data-panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs"
    >
      <div className="grid xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
        <div className="bg-indigo-600 p-6 text-white sm:p-7">
          <div className="flex items-center gap-2 text-sm font-bold text-indigo-100">
            <ChartLineUpIcon aria-hidden="true" size={20} weight="duotone" />
            <span>{t('forecast.expectedRevenue')}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-indigo-100">
            {forecastPeriodValue}
          </p>
          <p className="mt-3 break-words text-3xl font-black tracking-tight sm:text-4xl">
            {forecast.forecast_total !== null
              ? formatVnd(forecast.forecast_total, language)
              : t('common.notAvailable')}
          </p>
          <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-3">
            <p className="text-xs font-bold text-indigo-100">
              {t('forecast.comparisonLabel')}
            </p>
            <p className="mt-1 text-base font-extrabold text-white">
              {comparisonKey &&
              forecast.change_vs_previous_period_percent !== null
                ? t(comparisonKey, {
                    value: formatPercent(
                      Math.abs(
                        forecast.change_vs_previous_period_percent,
                      ),
                      1,
                      false,
                      language,
                    ),
                  })
                : t('forecast.noComparison')}
            </p>
            {actualPeriod && forecast.previous_period_total !== null && (
              <p className="mt-1 text-sm leading-6 text-indigo-100">
                {t('forecast.comparisonActualPeriod', {
                  amount: formatVnd(
                    forecast.previous_period_total,
                    language,
                  ),
                  from: formatDate(actualPeriod.from, language),
                  to: formatDate(actualPeriod.to, language),
                })}
              </p>
            )}
          </div>
          <p className="mt-4 text-sm font-bold leading-6 text-indigo-100">
            {t('forecast.totalRange')}:{' '}
            {forecast.total_lower_bound !== null &&
            forecast.total_upper_bound !== null
              ? t('common.dateRange', {
                  from: formatVnd(
                    forecast.total_lower_bound,
                    language,
                  ),
                  to: formatVnd(
                    forecast.total_upper_bound,
                    language,
                  ),
                })
              : t('forecast.totalRangeUnavailable')}
          </p>
        </div>

        <div className="p-6 sm:p-7">
          <p className="text-sm font-extrabold text-slate-900">
            {t('forecast.reliabilitySummary')}
          </p>
          <span
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${reliabilityClasses[reliabilityTone]}`}
          >
            {getForecastReliabilityLabel(
              forecast.evaluation.reliability,
              language,
            )}
          </span>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {t(
              `forecast.reliabilityImpact.${forecast.evaluation.reliability}`,
            )}
          </p>
        </div>
      </div>

      <dl className="grid border-t border-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-slate-100">
        <SummaryDetail
          icon={CalendarDotsIcon}
          label={t('forecast.forecastPeriod')}
          value={forecastPeriodValue}
        />
        <SummaryDetail
          icon={ChartLineUpIcon}
          label={t('forecast.method')}
          value={getForecastMethodLabel(forecast.method, language)}
        />
        <SummaryDetail
          icon={ClockCounterClockwiseIcon}
          label={t('forecast.historyAvailable')}
          value={t('forecast.days', { count: forecast.history_days })}
        />
      </dl>
    </section>
  )
}

function SummaryDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDotsIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:border-b-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
        <Icon aria-hidden="true" size={18} weight="duotone" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="mt-0.5 text-sm font-extrabold text-slate-900">
          {value}
        </dd>
      </div>
    </div>
  )
}

function ForecastChartSection({
  data,
  forecast,
}: {
  data: ReturnType<typeof buildForecastChartData>
  forecast: ForecastResult
}) {
  const { t } = useLanguage()
  const hasExpectedRange = data.some((point) => point.interval !== undefined)

  return (
    <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
      <div>
        <h2 className="text-lg font-black tracking-tight text-slate-900">
          {t('forecast.chartTitle', { count: forecast.horizon_days })}
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
          {t(
            hasExpectedRange
              ? 'forecast.chartDesc'
              : 'forecast.chartDescWithoutRange',
            { count: forecast.horizon_days },
          )}
        </p>
      </div>

      <ul
        aria-label={t('forecast.legendAria')}
        className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-600"
      >
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-7 bg-indigo-600" />
          {t('forecast.legendActual')}
        </li>
        <li className="flex items-center gap-2">
          <span className="w-7 border-t-2 border-dashed border-amber-500" />
          {t('forecast.legendPredicted')}
        </li>
        {hasExpectedRange && (
          <li className="flex items-center gap-2">
            <span className="h-3 w-7 rounded-sm border border-amber-200 bg-amber-100" />
            {t('forecast.legendRange')}
          </li>
        )}
      </ul>

      <div className="mt-2">
        <ForecastRevenueChart data={data} />
      </div>
    </section>
  )
}

function DailyForecastSection({ forecast }: { forecast: ForecastResult }) {
  const { language, t } = useLanguage()

  return (
    <details
      className="data-panel group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6"
      open={forecast.horizon_days === 7}
    >
      <summary className="cursor-pointer list-none marker:hidden">
        <h2 className="text-lg font-black tracking-tight text-slate-900">
          {t('forecast.dailyPoints')}
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
          {t('forecast.dailyPointsDesc')}
        </p>
      </summary>

      <div className="mt-5 hidden md:block">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 font-bold text-slate-500">
            <tr>
              <th className="pb-3 pr-4">{t('forecast.targetDate')}</th>
              <th className="pb-3 pr-4 text-right">
                {t('forecast.predictedRevenue')}
              </th>
              <th className="pb-3 text-right">
                {t('forecast.empiricalInterval')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {forecast.points.map((point) => (
              <tr className="transition hover:bg-slate-50/70" key={point.date}>
                <td className="py-3.5 pr-4">
                  <time
                    className="font-extrabold text-slate-900"
                    dateTime={point.date}
                  >
                    {formatWeekday(point.date, language)}
                  </time>
                  <span className="ml-2 text-slate-500">
                    {formatDate(point.date, language)}
                  </span>
                </td>
                <td className="py-3.5 pr-4 text-right font-black text-slate-900">
                  {formatVnd(point.predicted_revenue, language)}
                </td>
                <td className="py-3.5 text-right font-semibold text-slate-600">
                  {formatForecastRange(point, language, t)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-2 md:hidden">
        {forecast.points.map((point) => (
          <article className="rounded-xl bg-slate-50 p-4" key={point.date}>
            <div className="flex items-start justify-between gap-4">
              <time dateTime={point.date}>
                <span className="block text-sm font-extrabold text-slate-900">
                  {formatWeekday(point.date, language)}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {formatDate(point.date, language)}
                </span>
              </time>
              <p className="text-right text-sm font-black text-slate-900">
                {formatVnd(point.predicted_revenue, language)}
              </p>
            </div>
            <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-600">
              <span className="font-bold">
                {t('forecast.empiricalInterval')}:
              </span>{' '}
              {formatForecastRange(point, language, t)}
            </p>
          </article>
        ))}
      </div>
    </details>
  )
}

function formatForecastRange(
  point: ForecastResult['points'][number],
  language: Language,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (point.lower_bound === null || point.upper_bound === null) {
    return t('forecast.dailyRangeUnavailable')
  }
  return t('common.dateRange', {
    from: formatVnd(point.lower_bound, language),
    to: formatVnd(point.upper_bound, language),
  })
}

function ForecastDisclaimer() {
  const { t } = useLanguage()

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-xs leading-relaxed text-slate-600">
      <InfoIcon
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-indigo-600"
        size={18}
        weight="fill"
      />
      <p>{t('forecast.disclaimer')}</p>
    </div>
  )
}
