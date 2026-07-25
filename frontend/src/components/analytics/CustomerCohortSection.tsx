import { CalendarDotsIcon, InfoIcon } from '@phosphor-icons/react'

import type { CustomerCohortAnalysis } from '../../api/analysesApi'
import { getRetentionCellTone } from '../../features/analysis/dsCorePresentation'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  formatInteger,
  formatMonth,
  formatPercent,
} from '../../utils/formatters'


export function CustomerCohortSection({
  cohort,
}: {
  cohort: CustomerCohortAnalysis
}) {
  const { language, t } = useLanguage()

  if (!cohort.available) {
    return (
      <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
        <CalendarDotsIcon
          aria-hidden="true"
          className="mx-auto text-slate-400"
          size={28}
          weight="duotone"
        />
        <h2 className="mt-3 font-black text-slate-900">
          {t('cohort.insufficient')}
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-slate-500">
          {t('cohort.insufficientDesc', {
            actual: cohort.observed_month_count,
            minimum: cohort.minimum_month_count,
          })}
        </p>
      </section>
    )
  }

  const monthIndexes = Array.from(
    { length: cohort.maximum_observed_month_index + 1 },
    (_, index) => index,
  )

  return (
    <section className="mt-6" aria-labelledby="cohort-heading">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
            {t('cohort.eyebrow')}
          </p>
          <h2
            className="mt-1 text-xl font-black tracking-tight text-slate-900"
            id="cohort-heading"
          >
            {t('cohort.title')}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            {t('cohort.desc')}
          </p>
        </div>
        <p className="shrink-0 text-xs font-bold text-slate-500">
          {t('cohort.summary', {
            cohorts: formatInteger(cohort.cohort_count, language),
            months: formatInteger(cohort.observed_month_count, language),
          })}
        </p>
      </div>

      <div className="data-panel mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-max border-separate border-spacing-1 text-xs">
            <thead>
              <tr className="font-bold uppercase tracking-wider text-slate-400">
                <th className="sticky left-0 z-10 bg-white pb-2 pr-3 text-left">
                  {t('cohort.acquisitionMonth')}
                </th>
                {monthIndexes.map((monthIndex) => (
                  <th
                    className="min-w-20 pb-2 text-center"
                    key={monthIndex}
                  >
                    M{monthIndex}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohort.cohorts.map((row) => {
                const periods = new Map(
                  row.periods.map((period) => [
                    period.month_index,
                    period,
                  ]),
                )
                return (
                  <tr key={row.cohort_month}>
                    <th className="sticky left-0 z-10 bg-white py-1 pr-3 text-left">
                      <p className="font-black text-slate-900">
                        {formatMonth(row.cohort_month, language)}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400">
                        {t('cohort.customers', {
                          count: formatInteger(
                            row.cohort_size,
                            language,
                          ),
                        })}
                      </p>
                    </th>
                    {monthIndexes.map((monthIndex) => {
                      const period = periods.get(monthIndex)
                      return (
                        <td
                          className="p-0.5 text-center"
                          key={monthIndex}
                        >
                          {period ? (
                            <span
                              className={`flex min-h-12 min-w-20 flex-col items-center justify-center rounded-lg px-2 py-1 font-black ${retentionCellClass(
                                period.retention_percent,
                              )}`}
                              title={t('cohort.cellDetail', {
                                active: period.active_customers,
                                orders: period.order_count,
                              })}
                            >
                              {formatPercent(
                                period.retention_percent,
                                1,
                                false,
                                language,
                              )}
                              %
                              <small className="mt-0.5 text-[9px] font-semibold opacity-75">
                                {formatInteger(
                                  period.active_customers,
                                  language,
                                )}
                              </small>
                            </span>
                          ) : (
                            <span
                              aria-label={t('cohort.notObserved')}
                              className="flex min-h-12 min-w-20 items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300"
                            >
                              —
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-2.5 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-[11px] leading-5 text-slate-500">
          <InfoIcon
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-indigo-600"
            size={15}
            weight="fill"
          />
          <p>{t('cohort.methodNote')}</p>
        </div>
      </div>
    </section>
  )
}


function retentionCellClass(retention: number) {
  const styles = {
    strong: 'bg-indigo-700 text-white',
    healthy: 'bg-indigo-500 text-white',
    moderate: 'bg-indigo-200 text-indigo-900',
    weak: 'bg-indigo-50 text-indigo-700',
    zero: 'bg-slate-50 text-slate-400',
  }
  return styles[getRetentionCellTone(retention)]
}
