import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleNotchIcon,
  ClockCounterClockwiseIcon,
  CloudArrowUpIcon,
  FileCsvIcon,
  FileXlsIcon,
  FilesIcon,
  FolderOpenIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  deleteAnalysis,
  listAnalyses,
  type AnalysisListItem,
} from '../api/analysesApi'
import { parseApiError } from '../api/apiErrors'
import { queryClient } from '../app/queryClient'
import { useAuth } from '../auth/useAuth'
import { useActiveAnalysis } from '../features/analysis/ActiveAnalysisContext'
import { analysisKeys } from '../features/analysis/analysisQueries'
import {
  getAnalysisPeriodLabel,
  getAnalysisStatusPresentation,
  HISTORY_PAGE_SIZE,
} from '../features/analysis/historyPresentation'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatDateTime,
  formatInteger,
} from '../utils/formatters'

export function HistoryPage() {
  const { language, t } = useLanguage()
  const { user } = useAuth()
  const { activeAnalysisId, selectAnalysis } = useActiveAnalysis()
  const [page, setPage] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<AnalysisListItem | null>(null)
  const navigate = useNavigate()
  const offset = page * HISTORY_PAGE_SIZE
  const userId = user?.id ?? 'signed-out'

  const historyQuery = useQuery({
    queryKey: analysisKeys.list(userId, HISTORY_PAGE_SIZE, offset),
    queryFn: () => listAnalyses(HISTORY_PAGE_SIZE, offset),
    placeholderData: (previousData) => previousData,
    enabled: Boolean(user),
  })
  const items = historyQuery.data?.items ?? []

  const deleteMutation = useMutation({
    mutationFn: (item: AnalysisListItem) => deleteAnalysis(item.id),
    onSuccess: (_, item) => {
      if (activeAnalysisId === item.id) {
        selectAnalysis(null)
      }
      queryClient.removeQueries({
        queryKey: analysisKeys.detail(userId, item.id),
      })
      void queryClient.invalidateQueries({
        queryKey: analysisKeys.all(userId),
      })
      setDeleteTarget(null)
      if (items.length === 1 && page > 0) {
        setPage((currentPage) => currentPage - 1)
      }
    },
  })

  useEffect(() => {
    if (
      historyQuery.isSuccess &&
      items.length === 0 &&
      page > 0 &&
      !historyQuery.isFetching
    ) {
      setPage((currentPage) => Math.max(0, currentPage - 1))
    }
  }, [
    historyQuery.isFetching,
    historyQuery.isSuccess,
    items.length,
    page,
  ])

  function openAnalysis(item: AnalysisListItem) {
    if (item.status !== 'completed') return
    selectAnalysis(item.id)
    navigate('/dashboard')
  }

  const hasPreviousPage = page > 0
  const hasNextPage = items.length === HISTORY_PAGE_SIZE
  const deleteError = deleteMutation.error
    ? parseApiError(deleteMutation.error, language)
    : null

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200/80 pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              {t('nav.history')}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {t('history.title')}
            </h1>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">
              {t('history.desc')}
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
            to="/upload"
          >
            <CloudArrowUpIcon aria-hidden="true" size={18} weight="bold" />
            {t('nav.upload')}
          </Link>
        </header>

        {historyQuery.isPending && <HistoryLoadingState />}

        {historyQuery.isError && (
          <section
            className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-xs text-rose-900"
            role="alert"
          >
            <WarningCircleIcon className="text-rose-600 mb-2" size={28} weight="bold" />
            <p className="font-extrabold">{parseApiError(historyQuery.error, language).message}</p>
          </section>
        )}

        {historyQuery.isSuccess && items.length === 0 && page === 0 && (
          <HistoryEmptyState />
        )}

        {items.length > 0 && (
          <section className="mt-7">
            {/* Desktop Table View */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs md:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/70 font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 pl-6 pr-4">{t('history.fileName')}</th>
                    <th className="py-3.5 pr-4">{t('history.status')}</th>
                    <th className="py-3.5 pr-4">{t('history.period')}</th>
                    <th className="py-3.5 pr-4 text-right">{t('history.rowCount')}</th>
                    <th className="py-3.5 pr-4 text-right">{t('history.createdAt')}</th>
                    <th className="py-3.5 pr-6 text-right">{t('history.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {items.map((item) => (
                    <tr
                      className="hover:bg-slate-50/70 transition"
                      key={item.id}
                    >
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                            {item.upload_mode === 'combined' ? (
                              <FilesIcon size={20} weight="duotone" />
                            ) : item.file_name.toLowerCase().endsWith('.xlsx') ? (
                              <FileXlsIcon size={20} weight="duotone" />
                            ) : (
                              <FileCsvIcon size={20} weight="duotone" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-[200px] break-all font-extrabold leading-5 text-slate-900">
                              {item.file_name}
                            </span>
                            {item.upload_mode === 'combined' && (
                              <span className="mt-0.5 block text-[10px] font-bold text-slate-500">
                                {t('selector.fileCount', {
                                  count: item.source_file_count,
                                })}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge language={language} status={item.status} />
                      </td>
                      <td className="py-4 pr-4 text-slate-600 font-semibold">
                        {getAnalysisPeriodLabel(item, language)}
                      </td>
                      <td className="py-4 pr-4 text-right font-bold text-slate-900">
                        {formatInteger(item.row_count, language)}
                      </td>
                      <td className="py-4 pr-4 text-right text-slate-500">
                        {formatDateTime(item.created_at, language)}
                      </td>
                      <td className="py-4 pl-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition disabled:opacity-40"
                            disabled={item.status !== 'completed'}
                            onClick={() => openAnalysis(item)}
                            type="button"
                          >
                            <FolderOpenIcon size={15} weight="bold" />
                            {t('history.open')}
                          </button>
                          <button
                            aria-label={t('history.deleteAria', { name: item.file_name })}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            onClick={() => setDeleteTarget(item)}
                            type="button"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="grid gap-4 md:hidden">
              {items.map((item) => (
                <HistoryCard
                  item={item}
                  language={language}
                  key={item.id}
                  onDelete={setDeleteTarget}
                  onOpen={openAnalysis}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {(hasPreviousPage || hasNextPage) && (
              <div className="mt-6 flex items-center justify-between border-t border-slate-200/80 pt-4 text-xs">
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40"
                  disabled={!hasPreviousPage}
                  onClick={() => setPage((p) => p - 1)}
                  type="button"
                >
                  <ArrowLeftIcon size={15} />
                  {t('common.previous')}
                </button>
                <span className="font-bold text-slate-500">
                  {t('common.pageOf', {
                    page: page + 1,
                    total: hasNextPage ? page + 2 : page + 1,
                  })}
                </span>
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40"
                  disabled={!hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                  type="button"
                >
                  {t('common.next')}
                  <ArrowRightIcon size={15} />
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {deleteTarget && (
        <DeleteAnalysisDialog
          errorMessage={deleteError?.message ?? null}
          isDeleting={deleteMutation.isPending}
          item={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
        />
      )}
    </main>
  )
}

function StatusBadge({
  language,
  status,
}: {
  language: 'en' | 'vi'
  status: AnalysisListItem['status']
}) {
  const { className, label } = getAnalysisStatusPresentation(status, language)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

function HistoryCard({
  item,
  language,
  onDelete,
  onOpen,
}: {
  item: AnalysisListItem
  language: 'en' | 'vi'
  onDelete: (item: AnalysisListItem) => void
  onOpen: (item: AnalysisListItem) => void
}) {
  const { t } = useLanguage()
  return (
    <article className="data-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            {item.upload_mode === 'combined' ? (
              <FilesIcon size={20} weight="duotone" />
            ) : item.file_name.toLowerCase().endsWith('.xlsx') ? (
              <FileXlsIcon size={20} weight="duotone" />
            ) : (
              <FileCsvIcon size={20} weight="duotone" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="max-w-[180px] break-all font-extrabold leading-5 text-slate-900">
              {item.file_name}
            </h2>
            {item.upload_mode === 'combined' && (
              <p className="mt-0.5 text-[10px] font-bold text-slate-500">
                {t('selector.fileCount', {
                  count: item.source_file_count,
                })}
              </p>
            )}
          </div>
        </div>
        <StatusBadge language={language} status={item.status} />
      </div>

      <dl className="mt-4 space-y-1.5 text-xs text-slate-500 font-medium">
        <div className="flex items-center justify-between">
          <dt>{t('history.period')}:</dt>
          <dd className="font-semibold text-slate-700">
            {getAnalysisPeriodLabel(item, language)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>{t('history.rowsAndCreated')}:</dt>
          <dd className="font-semibold text-slate-700">
            {t('history.rowsCreatedValue', {
              count: formatInteger(item.row_count, language),
              date: formatDateTime(item.created_at, language),
            })}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex gap-2 pt-3 border-t border-slate-100">
        <button
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-40"
          disabled={item.status !== 'completed'}
          onClick={() => onOpen(item)}
          type="button"
        >
          <FolderOpenIcon size={16} weight="bold" />
          {t('history.openResult')}
        </button>
        <button
          aria-label={t('history.deleteAria', { name: item.file_name })}
          className="rounded-xl border border-slate-200 p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
          onClick={() => onDelete(item)}
          type="button"
        >
          <TrashIcon size={18} />
        </button>
      </div>
    </article>
  )
}

function HistoryLoadingState() {
  return (
    <div className="mt-8 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" key={i} />
      ))}
    </div>
  )
}

function HistoryEmptyState() {
  const { t } = useLanguage()

  return (
    <section className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-14 text-center sm:px-8 shadow-xs">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <ClockCounterClockwiseIcon size={30} weight="duotone" />
      </span>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
        {t('history.emptyTitle')}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
        {t('history.emptyDesc')}
      </p>
      <Link
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
        to="/upload"
      >
        <CloudArrowUpIcon size={18} weight="bold" />
        {t('nav.upload')}
      </Link>
    </section>
  )
}

function DeleteAnalysisDialog({
  errorMessage,
  isDeleting,
  item,
  onCancel,
  onConfirm,
}: {
  errorMessage: string | null
  isDeleting: boolean
  item: AnalysisListItem
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useLanguage()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    cancelButtonRef.current?.focus()
  }, [])

  return (
    <div
      aria-labelledby="delete-analysis-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-xs p-4"
      role="dialog"
    >
      <section
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
            <TrashIcon size={24} weight="duotone" />
          </span>
          <button
            aria-label={t('common.close')}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition"
            disabled={isDeleting}
            onClick={onCancel}
            type="button"
          >
            <XIcon size={18} />
          </button>
        </div>

        <h2 className="mt-4 text-xl font-black tracking-tight text-slate-900" id="delete-analysis-title">
          {t('history.deleteTitle')}
        </h2>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          {t('history.deleteFileDesc', { name: item.file_name })}
        </p>

        {errorMessage && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          <button
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition"
            disabled={isDeleting}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            {t('common.cancel')}
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-700 transition disabled:opacity-50"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? (
              <CircleNotchIcon className="animate-spin" size={16} />
            ) : (
              <TrashIcon size={16} weight="bold" />
            )}
            {isDeleting ? t('history.deleting') : t('common.delete')}
          </button>
        </div>
      </section>
    </div>
  )
}
