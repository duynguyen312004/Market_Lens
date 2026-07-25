import {
  CalendarDotsIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  CloudArrowUpIcon,
  InfoIcon,
  SigmaIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router'

import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import {
  AnalysisEmptyState,
  AnalysisErrorState,
  AnalysisLoadingState,
} from '../components/analytics/AnalysisStates'
import { ForecastRevenueChart } from '../components/analytics/Charts'
import { ForecastModelSelectionSection } from '../components/analytics/ForecastModelSelectionSection'
import { MetricCard } from '../components/analytics/MetricCard'
import type { ForecastResult } from '../api/analysesApi'
import { useCurrentAnalysis } from '../features/analysis/analysisQueries'
import {
  buildForecastChartData,
  getForecastChangeTone,
  getForecastMethodLabel,
  getForecastReliabilityLabel,
  getForecastReliabilityTone,
} from '../features/forecast/forecastPresentation'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatDate,
  formatPercent,
  formatVnd,
} from '../utils/formatters'

export function ForecastPage() {
  const { t } = useLanguage()
  const { analysis, error, isEmpty, isLoading, retry } = useCurrentAnalysis()

  if (isLoading) return <AnalysisLoadingState />
  if (error) return <AnalysisErrorState error={error} onRetry={retry} />
  if (isEmpty || !analysis) {
    return <AnalysisEmptyState title={t('forecast.noData')} />
  }

  const { forecast } = analysis

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <AnalysisHeader
          analysis={analysis}
          description={t('forecast.desc')}
          title={t('forecast.title')}
        />

        {!forecast.available ? (
          <UnavailableForecast historyDays={forecast.history_days} />
        ) : (
          <AvailableForecast analysis={analysis} />
        )}
      </div>
    </main>
  )
}

function UnavailableForecast({ historyDays }: { historyDays: number }) {
  const { t } = useLanguage()
  const missingDays = Math.max(0, 14 - historyDays)

  return (
    <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
      <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-9 shadow-xs">
        <span className="grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
          <ClockCounterClockwiseIcon aria-hidden="true" size={30} weight="duotone" />
        </span>
        <p className="mt-6 text-xs font-black uppercase tracking-wider text-amber-600">
          {t('forecast.requiredDays', { current: historyDays })}
        </p>
        <h2 className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          {t('forecast.insufficientTitle')}
        </h2>
        <p className="mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-500">
          {t('forecast.insufficientDesc', { count: missingDays })}
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
          to="/upload"
        >
          <CloudArrowUpIcon aria-hidden="true" size={18} weight="bold" />
          {t('upload.title')}
        </Link>
      </section>

      <aside className="data-panel rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <h2 className="font-black text-slate-900">{t('forecast.rulesTitle')}</h2>
        <dl className="mt-4 space-y-4 text-xs">
          <ForecastRule
            description={t('forecast.ruleUnder14')}
            label="< 14 history days"
          />
          <ForecastRule
            description={t('forecast.rule14To27')}
            label="14 – 27 history days"
          />
          <ForecastRule
            description={t('forecast.rule28Plus')}
            label="≥ 28 history days"
          />
        </dl>
        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
          <InfoIcon className="mt-0.5 shrink-0 text-indigo-600" size={16} weight="fill" />
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
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
      <dt className="font-bold text-slate-900">{label}</dt>
      <dd className="mt-1 text-slate-500">{description}</dd>
    </div>
  )
}

function AvailableForecast({
  analysis,
}: {
  analysis: typeof useCurrentAnalysis extends () => { analysis: infer T } ? NonNullable<T> : never
}) {
  const { language, t } = useLanguage()
  const { forecast, revenue_by_date } = analysis
  const chartData = buildForecastChartData(revenue_by_date, forecast)
  const changeTone = getForecastChangeTone(forecast.change_vs_last_7_days_percent)
  const changeLabel =
    forecast.change_vs_last_7_days_percent === null
      ? t('forecast.noComparison')
      : t('forecast.vsLast7', {
          value: formatPercent(
            forecast.change_vs_last_7_days_percent,
            1,
            true,
            language,
          ),
        })

  return (
    <div className="mt-6 space-y-6">
      {/* Top Forecast Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          change={{ label: changeLabel, tone: changeTone }}
          icon={ChartLineUpIcon}
          label={t('forecast.expectedRevenue')}
          value={
            forecast.forecast_total !== null
              ? formatVnd(forecast.forecast_total, language)
              : t('common.notAvailable')
          }
        />
        <MetricCard
          helper={t('forecast.windowPeriod')}
          icon={CalendarDotsIcon}
          label={t('forecast.horizon')}
          value={t('forecast.days', { count: forecast.forecast_days })}
        />
        <MetricCard
          helper={t('forecast.datasetLength')}
          icon={ClockCounterClockwiseIcon}
          label={t('forecast.historicalInput')}
          value={t('forecast.days', { count: forecast.history_days })}
        />
        <MetricCard
          helper={forecast.method ? getForecastMethodLabel(forecast.method, language) : undefined}
          icon={SigmaIcon}
          label={t('forecast.method')}
          value={getForecastMethodLabel(forecast.method, language)}
        />
      </section>

      <ForecastModelSelectionSection forecast={forecast} />

      {/* Main Forecast Trend Chart */}
      <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              {t('forecast.chartTitle')}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t('forecast.chartDesc')}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200/60">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            {t('forecast.referenceOnly')}
          </span>
        </div>
        <div className="mt-5">
          <ForecastRevenueChart data={chartData} />
        </div>
      </section>

      <ForecastEvaluationSection forecast={forecast} />

      {/* Daily Point Predictions Table */}
      <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="text-lg font-black tracking-tight text-slate-900">
          {t('forecast.dailyPoints')}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-xs">
            <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 pr-4">{t('forecast.targetDate')}</th>
                <th className="pb-3 pr-4">{t('forecast.method')}</th>
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
                <tr className="hover:bg-slate-50/70 transition" key={point.date}>
                  <td className="py-3.5 pr-4 font-bold text-slate-900">
                    {formatDate(point.date, language)}
                  </td>
                  <td className="py-3.5 pr-4 text-slate-500 font-semibold">
                    {forecast.method
                      ? getForecastMethodLabel(forecast.method, language)
                      : t('common.notAvailable')}
                  </td>
                  <td className="py-3.5 pr-4 text-right font-black text-amber-600">
                    {formatVnd(point.predicted_revenue, language)}
                  </td>
                  <td className="py-3.5 text-right font-semibold text-slate-600">
                    {point.lower_bound !== null &&
                    point.upper_bound !== null
                      ? `${formatVnd(
                          point.lower_bound,
                          language,
                        )} – ${formatVnd(point.upper_bound, language)}`
                      : t('common.notAvailable')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Disclaimer Card */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-xs text-slate-600">
        <InfoIcon className="mt-0.5 shrink-0 text-indigo-600" size={18} weight="fill" />
        <p>{t('forecast.disclaimer')}</p>
      </div>
    </div>
  )
}

function ForecastEvaluationSection({
  forecast,
}: {
  forecast: ForecastResult
}) {
  const { language, t } = useLanguage()
  const evaluation = forecast.evaluation

  if (
    !evaluation.available ||
    !evaluation.model_metrics ||
    !evaluation.baseline_metrics
  ) {
    return (
      <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <ClockCounterClockwiseIcon
              aria-hidden="true"
              size={21}
              weight="duotone"
            />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              {t('forecast.evaluationUnavailable')}
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
              {t('forecast.evaluationUnavailableDesc', {
                current: forecast.history_days,
                minimum: evaluation.minimum_history_days,
              })}
            </p>
            <p className="mt-3 text-xs font-bold text-slate-700">
              {t('forecast.evaluationFolds', {
                folds: evaluation.fold_count,
                points: evaluation.evaluation_points,
              })}
            </p>
          </div>
        </div>
      </section>
    )
  }

  const reliabilityTone = getForecastReliabilityTone(
    evaluation.reliability,
  )
  const reliabilityClasses = {
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    negative: 'border-rose-200 bg-rose-50 text-rose-700',
    neutral: 'border-slate-200 bg-slate-100 text-slate-600',
  }[reliabilityTone]
  const improvement = evaluation.mae_improvement_vs_baseline_percent

  return (
    <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">
            {t('forecast.evaluationTitle')}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t('forecast.evaluationDesc')}
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-black ${reliabilityClasses}`}
        >
          {t('forecast.reliabilityLabel')}:{' '}
          {getForecastReliabilityLabel(evaluation.reliability, language)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EvaluationMetric
          helper={t('forecast.reliabilityNote')}
          label={t('forecast.reliabilityLabel')}
          value={getForecastReliabilityLabel(
            evaluation.reliability,
            language,
          )}
        />
        <EvaluationMetric
          helper={t('forecast.evaluationFolds', {
            folds: evaluation.fold_count,
            points: evaluation.evaluation_points,
          })}
          label={t('forecast.modelMae')}
          value={formatVnd(evaluation.model_metrics.mae, language)}
        />
        <EvaluationMetric
          helper={t('forecast.evaluationFolds', {
            folds: evaluation.fold_count,
            points: evaluation.evaluation_points,
          })}
          label={t('forecast.modelSmape')}
          value={`${formatPercent(
            evaluation.model_metrics.smape_percent,
            1,
            false,
            language,
          )}%`}
        />
        <EvaluationMetric
          helper={t('forecast.baselineImprovementHelp')}
          label={t('forecast.baselineImprovement')}
          value={
            improvement === null
              ? t('common.notAvailable')
              : `${formatPercent(improvement, 1, true, language)}%`
          }
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <EvaluationComparison forecast={forecast} />
        <FoldTable forecast={forecast} />
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        <InfoIcon
          className="mt-0.5 shrink-0 text-indigo-600"
          size={16}
          weight="fill"
        />
        <p>
          {t('forecast.methodologyNote')} {t('forecast.reliabilityNote')}
        </p>
      </div>
    </section>
  )
}

function EvaluationMetric({
  helper,
  label,
  value,
}: {
  helper: string
  label: string
  value: string
}) {
  return (
    <article className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
        {helper}
      </p>
    </article>
  )
}

function EvaluationComparison({
  forecast,
}: {
  forecast: ForecastResult
}) {
  const { language, t } = useLanguage()
  const model = forecast.evaluation.model_metrics
  const baseline = forecast.evaluation.baseline_metrics
  if (!model || !baseline) return null

  const rows = [
    {
      label: 'MAE',
      model: formatVnd(model.mae, language),
      baseline: formatVnd(baseline.mae, language),
    },
    {
      label: 'RMSE',
      model: formatVnd(model.rmse, language),
      baseline: formatVnd(baseline.rmse, language),
    },
    {
      label: 'sMAPE',
      model: `${formatPercent(model.smape_percent, 1, false, language)}%`,
      baseline: `${formatPercent(
        baseline.smape_percent,
        1,
        false,
        language,
      )}%`,
    },
  ]

  return (
    <div>
      <h3 className="text-sm font-black text-slate-900">
        {t('forecast.comparisonTitle')}
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[31rem] text-left text-xs">
          <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="pb-3 pr-4">
                {t('forecast.comparisonMetric')}
              </th>
              <th className="pb-3 pr-4">{t('forecast.activeMethod')}</th>
              <th className="pb-3 text-right">{t('forecast.baseline')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-3 pr-4 font-black text-slate-900">
                  {row.label}
                </td>
                <td className="py-3 pr-4 font-bold text-indigo-700">
                  {row.model}
                </td>
                <td className="py-3 text-right text-slate-600">
                  {row.baseline}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FoldTable({ forecast }: { forecast: ForecastResult }) {
  const { language, t } = useLanguage()

  return (
    <div>
      <h3 className="text-sm font-black text-slate-900">
        {t('forecast.foldDetails')}
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-xs">
          <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="pb-3 pr-3">{t('forecast.fold')}</th>
              <th className="pb-3 pr-3">{t('forecast.trainingDays')}</th>
              <th className="pb-3 pr-3">
                {t('forecast.validationPeriod')}
              </th>
              <th className="pb-3 text-right">MAE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {forecast.evaluation.folds.map((fold) => (
              <tr key={fold.fold}>
                <td className="py-3 pr-3 font-black text-slate-900">
                  #{fold.fold}
                </td>
                <td className="py-3 pr-3 text-slate-600">
                  {t('forecast.days', { count: fold.training_days })}
                </td>
                <td className="py-3 pr-3 text-slate-600">
                  {formatDate(fold.validation_from, language)} –{' '}
                  {formatDate(fold.validation_to, language)}
                </td>
                <td className="py-3 text-right font-bold text-slate-900">
                  {formatVnd(fold.model_metrics.mae, language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
