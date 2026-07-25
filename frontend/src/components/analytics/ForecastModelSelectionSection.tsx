import { ChartLineUpIcon, InfoIcon, ScalesIcon } from '@phosphor-icons/react'

import type { ForecastResult } from '../../api/analysesApi'
import { getForecastMethodLabel } from '../../features/forecast/forecastPresentation'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  formatInteger,
  formatPercent,
  formatVnd,
} from '../../utils/formatters'


export function ForecastModelSelectionSection({
  forecast,
}: {
  forecast: ForecastResult
}) {
  const { language, t } = useLanguage()
  const { selection, uncertainty } = forecast

  if (!selection.available) {
    return (
      <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <ScalesIcon aria-hidden="true" size={21} weight="duotone" />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              {t('forecast.selectionUnavailable')}
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
              {t('forecast.selectionUnavailableDesc', {
                current: forecast.history_days,
                minimum: selection.minimum_history_days,
              })}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
            {t('forecast.selectionEyebrow')}
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
            {t('forecast.selectionTitle')}
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-slate-500">
            {t('forecast.selectionDesc')}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
          <ChartLineUpIcon aria-hidden="true" size={15} weight="bold" />
          {forecast.method
            ? getForecastMethodLabel(forecast.method, language)
            : t('common.notAvailable')}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SelectionMetric
          label={t('forecast.comparedMethods')}
          value={formatInteger(selection.candidates.length, language)}
        />
        <SelectionMetric
          label={t('forecast.commonBacktest')}
          value={t('forecast.evaluationFolds', {
            folds: selection.fold_count,
            points: selection.evaluation_points,
          })}
        />
        <SelectionMetric
          label={t('forecast.empiricalInterval')}
          value={
            uncertainty.available
              ? t('forecast.intervalAvailable', {
                  coverage: uncertainty.target_coverage_percent,
                })
              : t('forecast.intervalUnavailable')
          }
        />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-xs">
          <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="pb-3 pr-3">{t('forecast.rank')}</th>
              <th className="pb-3 pr-3">{t('forecast.candidate')}</th>
              <th className="pb-3 pr-3 text-right">MAE</th>
              <th className="pb-3 pr-3 text-right">RMSE</th>
              <th className="pb-3 text-right">sMAPE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {selection.candidates.map((candidate) => {
              const selected =
                candidate.method === selection.selected_method
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
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {selected
                        ? t('forecast.selectedCandidate')
                        : t('forecast.minimumTraining', {
                            count: candidate.minimum_training_days,
                          })}
                    </p>
                  </td>
                  <td className="py-3 pr-3 text-right font-black text-slate-900">
                    {formatVnd(candidate.metrics.mae, language)}
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold text-slate-600">
                    {formatVnd(candidate.metrics.rmse, language)}
                  </td>
                  <td className="py-3 text-right font-semibold text-slate-600">
                    {formatPercent(
                      candidate.metrics.smape_percent,
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

      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        <InfoIcon
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-indigo-600"
          size={16}
          weight="fill"
        />
        <p>
          {selection.selection_reason ===
          'SIMPLER_WITHIN_FIVE_PERCENT'
            ? t('forecast.reasonSimpler')
            : t('forecast.reasonLowestMae')}{' '}
          {uncertainty.available &&
            t('forecast.uncertaintyDetail', {
              coverage: formatPercent(
                uncertainty.observed_backtest_coverage_percent ?? 0,
                1,
                false,
                language,
              ),
              residuals: uncertainty.residual_count,
            })}
        </p>
      </div>
    </section>
  )
}


function SelectionMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <article className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-base font-black text-slate-900">{value}</p>
    </article>
  )
}
