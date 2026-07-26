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
  const exampleCohort = cohort.cohorts.find((row) =>
    row.periods.some((period) => period.month_index === 1),
  )
  const examplePeriod = exampleCohort?.periods.find(
    (period) => period.month_index === 1,
  )

  return (
    <section className="mt-6" aria-labelledby="cohort-heading">
      <div>
        <h2
          className="text-xl font-black tracking-tight text-slate-900"
          id="cohort-heading"
        >
          {t('cohort.title')}
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
          {t('cohort.desc')}
        </p>
        <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-slate-600">
          {t('cohort.purpose')}
        </p>
        <p className="mt-2 text-xs font-bold text-slate-500">
          {t('cohort.summary', {
            cohorts: formatInteger(cohort.cohort_count, language),
            months: formatInteger(cohort.observed_month_count, language),
          })}
        </p>
      </div>

      <div className="data-panel mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <InfoIcon
              aria-hidden="true"
              className="shrink-0 text-indigo-600"
              size={16}
              weight="fill"
            />
            <h3>{t('cohort.howToRead')}</h3>
          </div>
          <dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="font-black text-slate-800">
                {t('cohort.rowGuideTitle')}
              </dt>
              <dd className="mt-1 leading-5 text-slate-500">
                {t('cohort.rowGuideDesc')}
              </dd>
            </div>
            <div>
              <dt className="font-black text-slate-800">
                {t('cohort.initialGuideTitle')}
              </dt>
              <dd className="mt-1 leading-5 text-slate-500">
                {t('cohort.initialGuideDesc')}
              </dd>
            </div>
            <div>
              <dt className="font-black text-slate-800">
                {t('cohort.cellGuideTitle')}
              </dt>
              <dd className="mt-1 leading-5 text-slate-500">
                {t('cohort.cellGuideDesc')}
              </dd>
            </div>
            <div>
              <dt className="font-black text-slate-800">
                {t('cohort.emptyGuideTitle')}
              </dt>
              <dd className="mt-1 leading-5 text-slate-500">
                {t('cohort.emptyGuideDesc')}
              </dd>
            </div>
          </dl>
          {exampleCohort && examplePeriod && (
            <p className="mt-4 border-t border-slate-200 pt-4 text-xs font-bold leading-5 text-indigo-800">
              {t('cohort.example', {
                active: formatInteger(
                  examplePeriod.active_customers,
                  language,
                ),
                cohort: formatMonth(
                  exampleCohort.cohort_month,
                  language,
                ),
                month: formatInteger(
                  examplePeriod.month_index,
                  language,
                ),
                rate: `${formatPercent(
                  examplePeriod.retention_percent,
                  1,
                  false,
                  language,
                )}%`,
                total: formatInteger(
                  exampleCohort.cohort_size,
                  language,
                ),
              })}
            </p>
          )}
        </div>
        <div className="overflow-x-auto px-4 py-5 sm:px-5">
          <table className="w-full min-w-max border-separate [border-spacing:0.5rem_0.375rem] text-xs">
            <thead>
              <tr className="font-bold uppercase tracking-wider text-slate-400">
                <th className="sticky left-0 z-10 min-w-36 bg-white pb-3 pr-4 text-left">
                  {t('cohort.acquisitionMonth')}
                </th>
                {monthIndexes.map((monthIndex) => (
                  <th
                    className="min-w-28 whitespace-nowrap px-1 pb-3 text-center"
                    key={monthIndex}
                  >
                    {monthIndex === 0
                      ? t('cohort.startingMonth')
                      : t('cohort.monthAfter', {
                          count: monthIndex,
                        })}
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
                    <th className="sticky left-0 z-10 min-w-36 bg-white py-1 pr-4 text-left">
                      <p className="font-black text-slate-900">
                        {formatMonth(row.cohort_month, language)}
                      </p>
                      <p className="text-xs font-semibold text-slate-400">
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
                          className="text-center"
                          key={monthIndex}
                        >
                          {period ? (
                            <span
                              className={`flex min-h-14 min-w-28 flex-col items-center justify-center rounded-xl px-3 py-2 font-black ${retentionCellClass(
                                period.retention_percent,
                              )}`}
                              title={
                                monthIndex === 0
                                  ? t('cohort.initialCellDetail', {
                                      count: formatInteger(
                                        period.active_customers,
                                        language,
                                      ),
                                    })
                                  : t('cohort.cellDetail', {
                                      active: period.active_customers,
                                      orders: period.order_count,
                                    })
                              }
                            >
                              {monthIndex === 0 ? (
                                <>
                                  <span className="text-sm">
                                    {formatInteger(
                                      period.active_customers,
                                      language,
                                    )}
                                  </span>
                                  <small className="mt-0.5 text-xs font-semibold opacity-80">
                                    {t('cohort.initialLabel')}
                                  </small>
                                </>
                              ) : (
                                <>
                                  <span>
                                    {formatPercent(
                                      period.retention_percent,
                                      1,
                                      false,
                                      language,
                                    )}
                                    %
                                  </span>
                                  <small className="mt-0.5 text-xs font-semibold opacity-80">
                                    {t('cohort.activeShort', {
                                      count: formatInteger(
                                        period.active_customers,
                                        language,
                                      ),
                                    })}
                                  </small>
                                </>
                              )}
                            </span>
                          ) : (
                            <span
                              aria-label={t('cohort.notObserved')}
                              className="flex min-h-14 min-w-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40"
                              title={t('cohort.notObserved')}
                            >
                              <span className="sr-only">
                                {t('cohort.notObserved')}
                              </span>
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
