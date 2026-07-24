import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarBlankIcon,
  CircleNotchIcon,
  ClockCounterClockwiseIcon,
  CloudArrowUpIcon,
  FileCsvIcon,
  FileXlsIcon,
  FolderOpenIcon,
  RowsIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'

import {
  deleteAnalysis,
  listAnalyses,
  type AnalysisListItem,
} from '../api/analysesApi'
import { parseApiError } from '../api/apiErrors'
import { queryClient } from '../app/queryClient'
import {
  analysisKeys,
  readStoredAnalysisId,
  storeSelectedAnalysisId,
} from '../features/analysis/analysisQueries'
import {
  getAnalysisPeriodLabel,
  getAnalysisStatusPresentation,
  HISTORY_PAGE_SIZE,
} from '../features/analysis/historyPresentation'
import {
  formatDate,
  formatDateTime,
  formatInteger,
} from '../utils/formatters'

export function HistoryPage() {
  const [page, setPage] = useState(0)
  const [deleteTarget, setDeleteTarget] =
    useState<AnalysisListItem | null>(null)
  const navigate = useNavigate()
  const offset = page * HISTORY_PAGE_SIZE
  const historyQuery = useQuery({
    queryKey: analysisKeys.list(HISTORY_PAGE_SIZE, offset),
    queryFn: () => listAnalyses(HISTORY_PAGE_SIZE, offset),
    placeholderData: (previousData) => previousData,
  })
  const items = historyQuery.data?.items ?? []

  const deleteMutation = useMutation({
    mutationFn: (item: AnalysisListItem) => deleteAnalysis(item.id),
    onSuccess: (_, item) => {
      if (readStoredAnalysisId() === item.id) {
        storeSelectedAnalysisId(null)
      }
      queryClient.removeQueries({
        queryKey: analysisKeys.detail(item.id),
      })
      void queryClient.invalidateQueries({ queryKey: analysisKeys.all })
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
    storeSelectedAnalysisId(item.id)
    navigate('/dashboard')
  }

  const hasPreviousPage = page > 0
  const hasNextPage = items.length === HISTORY_PAGE_SIZE
  const deleteError = deleteMutation.error
    ? parseApiError(deleteMutation.error)
    : null

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-extrabold text-[var(--primary)]">
              Dữ liệu đã lưu
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
              Lịch sử phân tích
            </h1>
            <p className="mt-3 leading-7 text-[var(--text-muted)]">
              Mở lại kết quả cũ hoặc xóa những lần phân tích bạn không còn sử
              dụng.
            </p>
          </div>
          <Link
            className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
            to="/upload"
          >
            <CloudArrowUpIcon aria-hidden="true" size={18} weight="bold" />
            Upload dữ liệu
          </Link>
        </header>

        {historyQuery.isPending && <HistoryLoadingState />}

        {historyQuery.isError && (
          <section
            className="mt-8 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--surface)] p-6"
            role="alert"
          >
            <WarningCircleIcon
              aria-hidden="true"
              className="text-[var(--danger)]"
              size={28}
              weight="fill"
            />
            <h2 className="mt-4 text-xl font-extrabold text-[var(--text-primary)]">
              Không tải được lịch sử
            </h2>
            <p className="mt-2 leading-7 text-[var(--text-muted)]">
              {parseApiError(historyQuery.error).message}
            </p>
            <button
              className="mt-5 whitespace-nowrap rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
              onClick={() => void historyQuery.refetch()}
              type="button"
            >
              Thử lại
            </button>
          </section>
        )}

        {historyQuery.isSuccess && items.length === 0 && page === 0 && (
          <HistoryEmptyState />
        )}

        {historyQuery.isSuccess && items.length > 0 && (
          <>
            <section className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex flex-col gap-2 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="font-extrabold text-[var(--text-primary)]">
                    Các lần phân tích
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Trang {page + 1}, tối đa {HISTORY_PAGE_SIZE} mục mỗi trang.
                  </p>
                </div>
                {historyQuery.isFetching && (
                  <p
                    className="flex items-center gap-2 text-sm font-bold text-[var(--primary)]"
                    role="status"
                  >
                    <CircleNotchIcon
                      aria-hidden="true"
                      className="animate-spin motion-reduce:animate-none"
                      size={17}
                      weight="bold"
                    />
                    Đang làm mới
                  </p>
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[55rem] text-left text-sm">
                  <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                    <tr>
                      <th className="px-6 py-3.5 font-bold">File dữ liệu</th>
                      <th className="px-4 py-3.5 font-bold">Khoảng dữ liệu</th>
                      <th className="px-4 py-3.5 text-right font-bold">
                        Số dòng
                      </th>
                      <th className="px-4 py-3.5 font-bold">Ngày tạo</th>
                      <th className="px-4 py-3.5 font-bold">Trạng thái</th>
                      <th className="px-6 py-3.5 text-right font-bold">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <HistoryTableRow
                        item={item}
                        key={item.id}
                        onDelete={setDeleteTarget}
                        onOpen={openAnalysis}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-[var(--border)] md:hidden">
                {items.map((item) => (
                  <HistoryMobileItem
                    item={item}
                    key={item.id}
                    onDelete={setDeleteTarget}
                    onOpen={openAnalysis}
                  />
                ))}
              </div>
            </section>

            <nav
              aria-label="Phân trang lịch sử"
              className="mt-5 flex items-center justify-between gap-4"
            >
              <button
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border-strong)] px-4 py-2.5 text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!hasPreviousPage || historyQuery.isFetching}
                onClick={() =>
                  setPage((currentPage) => Math.max(0, currentPage - 1))
                }
                type="button"
              >
                <ArrowLeftIcon aria-hidden="true" size={17} weight="bold" />
                Trang trước
              </button>
              <span className="text-sm font-bold text-[var(--text-muted)]">
                Trang {page + 1}
              </span>
              <button
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border-strong)] px-4 py-2.5 text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!hasNextPage || historyQuery.isFetching}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                type="button"
              >
                Trang sau
                <ArrowRightIcon aria-hidden="true" size={17} weight="bold" />
              </button>
            </nav>
          </>
        )}
      </div>

      {deleteTarget && (
        <DeleteAnalysisDialog
          errorMessage={deleteError?.message ?? null}
          isDeleting={deleteMutation.isPending}
          item={deleteTarget}
          onCancel={() => {
            if (!deleteMutation.isPending) {
              deleteMutation.reset()
              setDeleteTarget(null)
            }
          }}
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
        />
      )}
    </main>
  )
}

function HistoryTableRow({
  item,
  onDelete,
  onOpen,
}: {
  item: AnalysisListItem
  onDelete: (item: AnalysisListItem) => void
  onOpen: (item: AnalysisListItem) => void
}) {
  const status = getAnalysisStatusPresentation(item.status)
  const isExcel = item.file_name.toLowerCase().endsWith('.xlsx')

  return (
    <tr className="border-t border-[var(--border)] first:border-t-0">
      <td className="px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            {isExcel ? (
              <FileXlsIcon aria-hidden="true" size={22} weight="duotone" />
            ) : (
              <FileCsvIcon aria-hidden="true" size={22} weight="duotone" />
            )}
          </span>
          <span
            className="max-w-[16rem] truncate font-extrabold text-[var(--text-primary)]"
            title={item.file_name}
          >
            {item.file_name}
          </span>
        </div>
      </td>
      <td className="px-4 py-4 text-[var(--text-muted)]">
        {item.date_from && item.date_to
          ? `${formatDate(item.date_from)} - ${formatDate(item.date_to)}`
          : 'Chưa có dữ liệu'}
      </td>
      <td className="px-4 py-4 text-right font-bold text-[var(--text-primary)]">
        {formatInteger(item.row_count)}
      </td>
      <td className="px-4 py-4 text-[var(--text-muted)]">
        {formatDateTime(item.created_at)}
      </td>
      <td className="px-4 py-4">
        <span
          className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-extrabold ${status.className}`}
        >
          {status.label}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-end gap-2">
          <button
            aria-label={`Mở phân tích ${item.file_name}`}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 font-extrabold text-[var(--primary)] transition hover:bg-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={item.status !== 'completed'}
            onClick={() => onOpen(item)}
            type="button"
          >
            <FolderOpenIcon aria-hidden="true" size={17} weight="bold" />
            Mở
          </button>
          <button
            aria-label={`Xóa phân tích ${item.file_name}`}
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
            onClick={() => onDelete(item)}
            type="button"
          >
            <TrashIcon aria-hidden="true" size={18} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function HistoryMobileItem({
  item,
  onDelete,
  onOpen,
}: {
  item: AnalysisListItem
  onDelete: (item: AnalysisListItem) => void
  onOpen: (item: AnalysisListItem) => void
}) {
  const status = getAnalysisStatusPresentation(item.status)
  const isExcel = item.file_name.toLowerCase().endsWith('.xlsx')

  return (
    <article className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          {isExcel ? (
            <FileXlsIcon aria-hidden="true" size={22} weight="duotone" />
          ) : (
            <FileCsvIcon aria-hidden="true" size={22} weight="duotone" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-extrabold text-[var(--text-primary)]">
            {item.file_name}
          </h2>
          <span
            className={`mt-2 inline-flex rounded-lg px-2.5 py-1.5 text-xs font-extrabold ${status.className}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm">
        <div className="flex items-start gap-2">
          <CalendarBlankIcon
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[var(--text-muted)]"
            size={17}
          />
          <div>
            <dt className="sr-only">Khoảng dữ liệu</dt>
            <dd className="text-[var(--text-muted)]">
              {item.date_from && item.date_to
                ? `${formatDate(item.date_from)} - ${formatDate(item.date_to)}`
                : 'Chưa có khoảng dữ liệu'}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <RowsIcon
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[var(--text-muted)]"
            size={17}
          />
          <div>
            <dt className="sr-only">Số dòng và thời điểm tạo</dt>
            <dd className="text-[var(--text-muted)]">
              {formatInteger(item.row_count)} dòng, tạo lúc{' '}
              {formatDateTime(item.created_at)}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-5 flex gap-3">
        <button
          className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={item.status !== 'completed'}
          onClick={() => onOpen(item)}
          type="button"
        >
          <FolderOpenIcon aria-hidden="true" size={17} weight="bold" />
          Mở kết quả
        </button>
        <button
          aria-label={`Xóa phân tích ${item.file_name}`}
          className="rounded-xl border border-[var(--border-strong)] p-2.5 text-[var(--text-muted)] transition hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          onClick={() => onDelete(item)}
          type="button"
        >
          <TrashIcon aria-hidden="true" size={18} />
        </button>
      </div>
    </article>
  )
}

function HistoryLoadingState() {
  return (
    <section
      aria-label="Đang tải lịch sử phân tích"
      className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
      role="status"
    >
      <span className="sr-only">Đang tải lịch sử phân tích...</span>
      <div className="h-16 animate-pulse border-b border-[var(--border)] bg-[var(--surface-subtle)] motion-reduce:animate-none" />
      <div className="space-y-1 p-4 sm:p-6">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            className="h-16 animate-pulse rounded-xl bg-[var(--surface-subtle)] motion-reduce:animate-none"
            key={index}
          />
        ))}
      </div>
    </section>
  )
}

function HistoryEmptyState() {
  return (
    <section className="mt-8 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-5 py-14 text-center sm:px-8">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
        <ClockCounterClockwiseIcon
          aria-hidden="true"
          size={29}
          weight="duotone"
        />
      </span>
      <h2 className="mt-5 text-2xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)]">
        Chưa có lịch sử phân tích
      </h2>
      <p className="mx-auto mt-3 max-w-md leading-7 text-[var(--text-muted)]">
        Upload file bán hàng đầu tiên để MarketLens lưu kết quả vào tài khoản
        của bạn.
      </p>
      <Link
        className="mt-7 inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
        to="/upload"
      >
        <CloudArrowUpIcon aria-hidden="true" size={18} weight="bold" />
        Upload dữ liệu
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
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const deletingRef = useRef(isDeleting)
  const cancelRef = useRef(onCancel)

  useEffect(() => {
    deletingRef.current = isDeleting
    cancelRef.current = onCancel
  }, [isDeleting, onCancel])

  useEffect(() => {
    const previousActiveElement = document.activeElement
    cancelButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deletingRef.current) {
        cancelRef.current()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), '
            + 'select:not(:disabled), textarea:not(:disabled), '
            + '[tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus()
      }
    }
  }, [])

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.currentTarget === event.target && !isDeleting) onCancel()
  }

  return (
    <div
      aria-labelledby="delete-analysis-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#071225]/65 p-4"
      onMouseDown={handleBackdropClick}
      role="dialog"
    >
      <section
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl shadow-blue-950/20 sm:p-7"
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]">
            <TrashIcon aria-hidden="true" size={24} weight="duotone" />
          </span>
          <button
            aria-label="Đóng hộp thoại"
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] disabled:opacity-45"
            disabled={isDeleting}
            onClick={onCancel}
            type="button"
          >
            <XIcon aria-hidden="true" size={19} />
          </button>
        </div>

        <h2
          className="mt-5 text-xl font-extrabold tracking-[-0.025em] text-[var(--text-primary)]"
          id="delete-analysis-title"
        >
          Xóa lần phân tích này?
        </h2>
        <p className="mt-3 leading-7 text-[var(--text-muted)]">
          Kết quả từ <strong>{item.file_name}</strong> sẽ bị xóa vĩnh viễn.
          File gốc không được MarketLens lưu trữ.
        </p>
        <p className="mt-3 rounded-xl bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
          {getAnalysisPeriodLabel(item)}
        </p>

        {errorMessage && (
          <p
            className="mt-4 rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-bold text-[var(--danger)]"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="whitespace-nowrap rounded-xl border border-[var(--border-strong)] px-5 py-3 text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--primary)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={isDeleting}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Giữ lại
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--danger)] px-5 py-3 text-sm font-extrabold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? (
              <CircleNotchIcon
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
                size={18}
                weight="bold"
              />
            ) : (
              <TrashIcon aria-hidden="true" size={18} weight="bold" />
            )}
            {isDeleting ? 'Đang xóa' : 'Xóa phân tích'}
          </button>
        </div>
      </section>
    </div>
  )
}
