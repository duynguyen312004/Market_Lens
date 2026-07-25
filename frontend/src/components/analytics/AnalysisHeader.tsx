import {
  CalendarBlankIcon,
  FileCsvIcon,
  FilesIcon,
} from '@phosphor-icons/react'

import type { AnalysisDetail } from '../../api/analysesApi'
import { formatDate, formatInteger } from '../../utils/formatters'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  getAnalysisFileLabel,
  getAnalysisSourceNames,
} from '../../features/analysis/presentation'

export function AnalysisHeader({
  analysis,
  description,
  title,
}: {
  analysis: AnalysisDetail
  description: string
  title: string
}) {
  const { language, t } = useLanguage()
  return (
    <header className="border-b border-[var(--border)] pb-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[2rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          {description}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[var(--text-muted)]">
        <span className="inline-flex min-w-0 items-center gap-2">
          {analysis.upload_mode === 'combined' ? (
            <FilesIcon
              aria-hidden="true"
              className="shrink-0 text-[var(--primary)]"
              size={16}
              weight="bold"
            />
          ) : (
            <FileCsvIcon
              aria-hidden="true"
              className="shrink-0 text-[var(--primary)]"
              size={16}
              weight="bold"
            />
          )}
          <span
            className="max-w-full break-all leading-5 text-[var(--text-primary)] sm:max-w-64"
            title={getAnalysisSourceNames(analysis)}
          >
            {getAnalysisFileLabel(analysis, language)}
          </span>
        </span>
        <span className="hidden h-4 w-px bg-[var(--border)] sm:block" />
        <span className="inline-flex items-center gap-2">
          <CalendarBlankIcon aria-hidden="true" size={16} />
          <span>
            {t('common.dateRange', {
              from: formatDate(analysis.period.from, language),
              to: formatDate(analysis.period.to, language),
            })}{' '}
            <span className="font-medium text-slate-400">
              {t('common.dateFormatHint')}
            </span>
          </span>
        </span>
        <span className="hidden h-4 w-px bg-[var(--border)] sm:block" />
        <span>
          {t('common.rowsProcessed', {
            count: formatInteger(analysis.row_count, language),
          })}
        </span>
      </div>
    </header>
  )
}
