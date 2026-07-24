import { CalendarBlankIcon, FileCsvIcon } from '@phosphor-icons/react'

import type { AnalysisDetail } from '../../api/analysesApi'
import { formatDate, formatInteger } from '../../utils/formatters'

export function AnalysisHeader({
  analysis,
  description,
  title,
}: {
  analysis: AnalysisDetail
  description: string
  title: string
}) {
  return (
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--text-muted)]">{description}</p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-[var(--text-muted)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <span className="flex min-w-0 items-center gap-2">
          <FileCsvIcon
            aria-hidden="true"
            className="shrink-0 text-[var(--primary)]"
            size={18}
            weight="duotone"
          />
          <span className="truncate font-bold text-[var(--text-primary)]">
            {analysis.file_name}
          </span>
          <span className="shrink-0">
            ({formatInteger(analysis.row_count)} dòng)
          </span>
        </span>
        <span className="flex items-center gap-2">
          <CalendarBlankIcon
            aria-hidden="true"
            className="text-[var(--primary)]"
            size={18}
            weight="duotone"
          />
          {formatDate(analysis.period.from)} - {formatDate(analysis.period.to)}
        </span>
      </div>
    </header>
  )
}
