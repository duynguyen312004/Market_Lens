import {
  CaretDownIcon,
  ClockCounterClockwiseIcon,
  InfoIcon,
  ScalesIcon,
} from '@phosphor-icons/react'

import type { ForecastResult } from '../../api/analysesApi'
import { getForecastMethodLabel } from '../../features/forecast/forecastPresentation'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  formatDate,
  formatInteger,
  formatPercent,
  formatVnd,
} from '../../utils/formatters'

export function ForecastMethodologySection({
  forecast,
}: {
  forecast: ForecastResult
}) {
  const { language, t } = useLanguage()
  const evaluation = forecast.evaluation
  const modelMetrics =
    evaluation.primary_metric === 'daily_mae'
      ? evaluation.model_daily_metrics
      : evaluation.model_total_metrics
  const baselineMetrics =
    evaluation.primary_metric === 'daily_mae'
      ? evaluation.baseline_daily_metrics
      : evaluation.baseline_total_metrics
  const evaluationReady =
    evaluation.available &&
    modelMetrics !== null &&
    baselineMetrics !== null
  return (
    <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
      <div>
        <h2 className="text-lg font-black tracking-tight text-slate-900">
          {t('forecast.evaluationTitle')}
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
          {t('forecast.evaluationDesc', {
            count: forecast.horizon_days,
          })}
        </p>
      </div>

      {evaluationReady && modelMetrics ? (
        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 lg:grid-cols-[minmax(17rem,0.7fr)_minmax(0,1.3fr)] lg:items-center">
          <dl className="rounded-xl bg-slate-50 px-4 py-3.5">
            <dt className="text-xs font-bold text-slate-500">
              {t(
                evaluation.primary_metric === 'daily_mae'
                  ? 'forecast.modelMae'
                  : 'forecast.modelPeriodMae',
              )}
            </dt>
            <dd className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {formatVnd(modelMetrics.mae, language)}
            </dd>
            <dd className="mt-1 text-xs leading-relaxed text-slate-500">
              {evaluation.primary_metric === 'daily_mae'
                ? t('forecast.modelMaeHelp', {
                    points: evaluation.evaluation_points,
                  })
                : t('forecast.evaluationScope', {
                    points: evaluation.evaluation_points,
                    folds: evaluation.fold_count,
                  })}
            </dd>
          </dl>
          <p className="text-sm leading-relaxed text-slate-600">
            {t('forecast.evaluationScope', {
              folds: evaluation.fold_count,
              points: evaluation.evaluation_points,
            })}
          </p>
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
          <ClockCounterClockwiseIcon
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-slate-500"
            size={20}
            weight="duotone"
          />
          <div>
            <p className="text-sm font-extrabold text-slate-800">
              {t('forecast.evaluationUnavailable')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {t('forecast.evaluationUnavailableDesc', {
                current: forecast.history_days,
                minimum: evaluation.minimum_history_days,
              })}
            </p>
          </div>
        </div>
      )}

      <details className="group mt-5 rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 marker:hidden">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
            <ScalesIcon aria-hidden="true" size={19} weight="duotone" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-slate-800">
              {t('forecast.technicalDetails')}
            </span>
            <span className="mt-0.5 block text-xs font-normal text-slate-500">
              {t('forecast.technicalDetailsDesc')}
            </span>
          </span>
          <CaretDownIcon
            aria-hidden="true"
            className="ml-auto shrink-0 text-slate-500 transition-transform group-open:rotate-180"
            size={18}
            weight="bold"
          />
        </summary>
        <div className="border-t border-slate-100 px-4 pb-5 pt-4">
          <SelectionDetails forecast={forecast} />
          {evaluationReady && <EvaluationDetails forecast={forecast} />}
          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
            <InfoIcon
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-indigo-600"
              size={16}
              weight="fill"
            />
            <p>
              {t('forecast.methodologyNote', {
                count: forecast.horizon_days,
              })}{' '}
              {t('forecast.reliabilityNote')}
            </p>
          </div>
        </div>
      </details>
    </section>
  )
}

function SelectionDetails({ forecast }: { forecast: ForecastResult }) {
  const { language, t } = useLanguage()
  const { selection, uncertainty } = forecast

  if (!selection.available) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-extrabold text-slate-800">
          {t('forecast.selectionUnavailable')}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {t('forecast.selectionUnavailableDesc', {
            current: forecast.history_days,
            minimum: selection.minimum_history_days,
          })}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div>
          <p className="text-xs font-bold text-slate-500">
            {t('forecast.selectedMethod')}
          </p>
          <p className="mt-1 text-lg font-black text-slate-900">
            {getForecastMethodLabel(forecast.method, language)}
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-600">
            {selection.selection_reason === 'SIMPLER_WITHIN_FIVE_PERCENT'
              ? t('forecast.reasonSimpler')
              : t('forecast.reasonLowestMae')}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-xl bg-slate-50 p-4 text-xs">
          <div>
            <dt className="text-slate-500">{t('forecast.comparedMethods')}</dt>
            <dd className="mt-1 font-extrabold text-slate-900">
              {formatInteger(selection.candidates.length, language)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('forecast.testPeriods')}</dt>
            <dd className="mt-1 font-extrabold text-slate-900">
              {formatInteger(selection.fold_count, language)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">
              {t('forecast.empiricalInterval')}
            </dt>
            <dd className="mt-1 font-extrabold text-slate-900">
            {uncertainty.available
                && uncertainty.total_interval_available
                ? t('forecast.intervalAvailable', {
                    coverage: uncertainty.target_coverage_percent,
                  })
                : t('forecast.intervalUnavailable')}
            </dd>
          </div>
        </dl>
      </div>

      <h3 className="mt-6 text-sm font-black text-slate-900">
        {t('forecast.candidateComparison')}
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[45rem] text-left text-xs">
          <thead className="border-b border-slate-100 font-bold text-slate-500">
            <tr>
              <th className="pb-3 pr-3">{t('forecast.rank')}</th>
              <th className="pb-3 pr-3">{t('forecast.candidate')}</th>
              <th className="pb-3 pr-3 text-right">
                {t(
                  selection.primary_metric === 'daily_mae'
                    ? 'forecast.errorAverage'
                    : 'forecast.errorPeriod',
                )}
              </th>
              <th className="pb-3 pr-3 text-right">
                {t('forecast.errorLarge')}
              </th>
              <th className="pb-3 text-right">
                {t('forecast.errorPercent')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {selection.candidates.map((candidate) => {
              const selected = candidate.method === selection.selected_method
              const metrics =
                selection.primary_metric === 'daily_mae'
                  ? candidate.daily_metrics
                  : candidate.total_metrics
              return (
                <tr
                  className={selected ? 'bg-indigo-50/60' : undefined}
                  key={candidate.method}
                >
                  <td className="py-3 pr-3 font-black text-slate-500">
                    #{candidate.rank}
                  </td>
                  <td className="py-3 pr-3">
                    <p className="font-extrabold text-slate-900">
                      {getForecastMethodLabel(candidate.method, language)}
                    </p>
                    <p className="mt-0.5 text-slate-600">
                      {selected
                        ? t('forecast.selectedCandidate')
                        : t('forecast.minimumTraining', {
                            count: candidate.minimum_training_days,
                          })}
                    </p>
                  </td>
                  <td className="py-3 pr-3 text-right font-black text-slate-900">
                    {formatVnd(metrics.mae, language)}
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold text-slate-600">
                    {formatVnd(metrics.rmse, language)}
                  </td>
                  <td className="py-3 text-right font-semibold text-slate-600">
                    {formatPercent(
                      metrics.smape_percent,
                      1,
                      false,
                      language,
                    )}
                    %
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {uncertainty.available && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {t('forecast.uncertaintyDetail', {
            coverage: formatPercent(
              (forecast.horizon_days === 30
                ? uncertainty.observed_total_backtest_coverage_percent
                : uncertainty.observed_backtest_coverage_percent) ?? 0,
              1,
              false,
              language,
            ),
            residuals:
              forecast.horizon_days === 30
                ? uncertainty.total_residual_count
                : uncertainty.residual_count,
          })}
        </p>
      )}
    </div>
  )
}

function EvaluationDetails({ forecast }: { forecast: ForecastResult }) {
  const { language, t } = useLanguage()
  const model =
    forecast.evaluation.primary_metric === 'daily_mae'
      ? forecast.evaluation.model_daily_metrics
      : forecast.evaluation.model_total_metrics
  const baseline =
    forecast.evaluation.primary_metric === 'daily_mae'
      ? forecast.evaluation.baseline_daily_metrics
      : forecast.evaluation.baseline_total_metrics
  if (!model || !baseline) return null

  const comparisonRows = [
    {
      label: t(
        forecast.evaluation.primary_metric === 'daily_mae'
          ? 'forecast.errorAverage'
          : 'forecast.errorPeriod',
      ),
      model: formatVnd(model.mae, language),
      baseline: formatVnd(baseline.mae, language),
    },
    {
      label: t('forecast.errorLarge'),
      model: formatVnd(model.rmse, language),
      baseline: formatVnd(baseline.rmse, language),
    },
    {
      label: t('forecast.errorPercent'),
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
    <div className="mt-7 border-t border-slate-100 pt-6">
      <h3 className="text-sm font-black text-slate-900">
        {t('forecast.comparisonTitle')}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {t(
          forecast.evaluation.primary_metric === 'daily_mae'
            ? 'forecast.comparisonHelp'
            : 'forecast.comparisonHelpPeriod',
          {
          improvement:
            forecast.evaluation
              .primary_mae_improvement_vs_baseline_percent === null
              ? t('common.notAvailable')
              : `${formatPercent(
                  forecast.evaluation
                    .primary_mae_improvement_vs_baseline_percent,
                  1,
                  true,
                  language,
                )}%`,
          },
        )}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-xs">
          <thead className="border-b border-slate-100 font-bold text-slate-500">
            <tr>
              <th className="pb-3 pr-4">
                {t('forecast.comparisonMetric')}
              </th>
              <th className="pb-3 pr-4">{t('forecast.activeMethod')}</th>
              <th className="pb-3 text-right">{t('forecast.baseline')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {comparisonRows.map((row) => (
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

      <h3 className="mt-6 text-sm font-black text-slate-900">
        {t('forecast.foldDetails')}
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[39rem] text-left text-xs">
          <thead className="border-b border-slate-100 font-bold text-slate-500">
            <tr>
              <th className="pb-3 pr-3">{t('forecast.fold')}</th>
              <th className="pb-3 pr-3">{t('forecast.trainingDays')}</th>
              <th className="pb-3 pr-3">
                {t('forecast.validationPeriod')}
              </th>
              <th className="pb-3 text-right">
                {t(
                  forecast.evaluation.primary_metric === 'daily_mae'
                    ? 'forecast.errorAverage'
                    : 'forecast.errorPeriod',
                )}
              </th>
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
                  {t('common.dateRange', {
                    from: formatDate(fold.validation_from, language),
                    to: formatDate(fold.validation_to, language),
                  })}
                </td>
                <td className="py-3 text-right font-bold text-slate-900">
                  {formatVnd(
                    forecast.evaluation.primary_metric === 'daily_mae'
                      ? fold.model_daily_metrics.mae
                      : Math.abs(
                          fold.actual_total_revenue
                            - fold.model_total_revenue,
                        ),
                    language,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
