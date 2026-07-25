import {
  CheckIcon,
  CircleNotchIcon,
  FileCsvIcon,
  FilesIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { listAnalyses } from '../api/analysesApi'
import { parseApiError } from '../api/apiErrors'
import {
  useActiveAnalysis,
} from '../features/analysis/ActiveAnalysisContext'
import { analysisKeys } from '../features/analysis/analysisQueries'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatDate,
  formatInteger,
} from '../utils/formatters'

export function AnalysisSelectorDialog({
  onClose,
}: {
  onClose: () => void
}) {
  const { activeAnalysisId, selectAnalysis } = useActiveAnalysis()
  const { language, t } = useLanguage()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const analysesQuery = useQuery({
    queryKey: analysisKeys.list(100, 0),
    queryFn: () => listAnalyses(100, 0),
  })

  useEffect(() => {
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const controls = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href]',
        ),
      )
      if (controls.length === 0) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const completedItems =
    analysesQuery.data?.items.filter(
      (item) => item.status === 'completed',
    ) ?? []

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <section
        aria-labelledby="analysis-selector-title"
        aria-modal="true"
        className="flex max-h-[min(42rem,calc(100dvh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
        ref={dialogRef}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2
              className="text-lg font-black tracking-tight text-slate-900"
              id="analysis-selector-title"
            >
              {t('selector.title')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {t('selector.desc')}
            </p>
          </div>
          <button
            aria-label={t('common.close')}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <XIcon aria-hidden="true" size={18} weight="bold" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
          {analysesQuery.isPending && (
            <div
              className="grid min-h-56 place-items-center text-sm font-bold text-slate-500"
              role="status"
            >
              <span className="flex items-center gap-2">
                <CircleNotchIcon
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                  size={20}
                  weight="bold"
                />
                {t('selector.loading')}
              </span>
            </div>
          )}

          {analysesQuery.isError && (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <WarningCircleIcon
                  className="mt-0.5 shrink-0 text-rose-600"
                  size={18}
                  weight="bold"
                />
                <p className="font-bold">
                  {parseApiError(analysesQuery.error, language).message}
                </p>
              </div>
              <button
                className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-black text-rose-800"
                onClick={() => void analysesQuery.refetch()}
                type="button"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {analysesQuery.isSuccess && completedItems.length === 0 && (
            <div className="grid min-h-56 place-items-center text-center">
              <div>
                <FilesIcon
                  className="mx-auto text-slate-300"
                  size={38}
                  weight="duotone"
                />
                <p className="mt-3 font-black text-slate-900">
                  {t('selector.emptyTitle')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {t('selector.emptyDesc')}
                </p>
              </div>
            </div>
          )}

          {completedItems.length > 0 && (
            <ul className="space-y-2">
              {completedItems.map((item) => {
                const isActive = item.id === activeAnalysisId
                return (
                  <li key={item.id}>
                    <button
                      aria-current={isActive ? 'true' : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition active:scale-[0.99] ${
                        isActive
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        selectAnalysis(item.id)
                        onClose()
                      }}
                      type="button"
                    >
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.upload_mode === 'combined' ? (
                          <FilesIcon size={20} weight="bold" />
                        ) : (
                          <FileCsvIcon size={20} weight="duotone" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-extrabold text-slate-900">
                            {item.file_name}
                          </span>
                          {item.upload_mode === 'combined' && (
                            <span className="shrink-0 rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {t('selector.fileCount', {
                                count: item.source_file_count,
                              })}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-[11px] font-medium text-slate-500">
                          {formatInteger(item.row_count, language)} {t('selector.rows')}
                          {' / '}
                          {item.date_from && item.date_to
                            ? `${formatDate(item.date_from, language)} - ${formatDate(item.date_to, language)}`
                            : t('history.noPeriod')}
                        </span>
                      </span>
                      {isActive && (
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 text-white">
                          <CheckIcon size={15} weight="bold" />
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
