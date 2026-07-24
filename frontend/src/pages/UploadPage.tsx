import {
  ArrowRightIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  FileCsvIcon,
  FileXlsIcon,
  InfoIcon,
  ProhibitIcon,
  SpinnerGapIcon,
  TrashIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { Link } from 'react-router-dom'

import { createAnalysis, type AnalysisDetail } from '../api/analysesApi'
import { parseApiError, type ParsedApiError } from '../api/apiErrors'
import { queryClient } from '../app/queryClient'
import {
  analysisKeys,
  storeSelectedAnalysisId,
} from '../features/analysis/analysisQueries'
import { validateUploadCandidate } from '../features/upload/uploadValidation'
import {
  formatDate,
  formatFileSize,
  formatInteger,
  formatVnd,
} from '../utils/formatters'

export function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<ParsedApiError | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      createAnalysis({
        file,
        onUploadProgress: setUploadProgress,
      }),
    onMutate: () => {
      setServerError(null)
      setUploadProgress(0)
    },
    onSuccess: (analysis) => {
      setUploadProgress(100)
      storeSelectedAnalysisId(analysis.id)
      queryClient.setQueryData(analysisKeys.detail(analysis.id), analysis)
      void queryClient.invalidateQueries({ queryKey: analysisKeys.all })
    },
    onError: (error) => {
      setServerError(parseApiError(error))
    },
  })

  function selectFile(file: File | undefined) {
    if (!file) return

    setClientError(null)
    setServerError(null)
    uploadMutation.reset()

    const validationError = validateUploadCandidate(file)
    if (validationError) {
      setSelectedFile(null)
      setClientError(validationError)
      return
    }

    setSelectedFile(file)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0])
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (uploadMutation.isPending) return
    selectFile(event.dataTransfer.files?.[0])
  }

  function clearSelection() {
    setSelectedFile(null)
    setClientError(null)
    setServerError(null)
    setUploadProgress(0)
    uploadMutation.reset()
  }

  function submitFile() {
    if (!selectedFile || uploadMutation.isPending) return
    uploadMutation.mutate(selectedFile)
  }

  const analysis = uploadMutation.data

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl">
          <p className="text-sm font-extrabold text-[var(--primary)]">
            Upload Data
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
            Phân tích file bán hàng
          </h1>
          <p className="mt-3 leading-7 text-[var(--text-muted)]">
            Tải một file CSV hoặc XLSX đúng template. MarketLens sẽ kiểm tra dữ
            liệu, tính KPI và lưu kết quả vào tài khoản của bạn.
          </p>
        </header>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
            <div
              className={`grid min-h-72 place-items-center rounded-2xl border-2 border-dashed px-5 py-10 text-center transition ${
                isDragging
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                  : 'border-[var(--border-strong)] bg-[var(--page)]'
              }`}
              onDragEnter={(event) => {
                event.preventDefault()
                if (!uploadMutation.isPending) setIsDragging(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                if (event.currentTarget === event.target) setIsDragging(false)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <div>
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                  <CloudArrowUpIcon
                    aria-hidden="true"
                    size={29}
                    weight="duotone"
                  />
                </span>
                <h2 className="mt-5 text-lg font-extrabold text-[var(--text-primary)]">
                  Kéo file vào đây
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  hoặc chọn file từ máy tính
                </p>
                <button
                  className="mt-5 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={uploadMutation.isPending}
                  onClick={() => inputRef.current?.click()}
                  type="button"
                >
                  Chọn file
                </button>
                <input
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  aria-label="Chọn file dữ liệu CSV hoặc XLSX"
                  className="sr-only"
                  onChange={handleInputChange}
                  ref={inputRef}
                  type="file"
                />
                <p className="mt-4 text-xs text-[var(--text-muted)]">
                  CSV hoặc XLSX, tối đa 10 MB và 50.000 dòng
                </p>
              </div>
            </div>

            {(clientError || serverError) && (
              <UploadError
                clientError={clientError}
                error={serverError}
              />
            )}

            {selectedFile && !analysis && (
              <div className="mt-5 rounded-2xl border border-[var(--border)] p-5">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                    {selectedFile.name.toLowerCase().endsWith('.xlsx') ? (
                      <FileXlsIcon aria-hidden="true" size={24} weight="duotone" />
                    ) : (
                      <FileCsvIcon aria-hidden="true" size={24} weight="duotone" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold text-[var(--text-primary)]">
                      {selectedFile.name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    aria-label="Bỏ file đã chọn"
                    className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                    disabled={uploadMutation.isPending}
                    onClick={clearSelection}
                    type="button"
                  >
                    <TrashIcon aria-hidden="true" size={20} />
                  </button>
                </div>

                {uploadMutation.isPending && (
                  <div className="mt-5" role="status">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                        <SpinnerGapIcon
                          aria-hidden="true"
                          className="animate-spin motion-reduce:animate-none"
                          size={18}
                          weight="bold"
                        />
                        {uploadProgress < 100
                          ? 'Đang tải file'
                          : 'Đang phân tích và lưu kết quả'}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        {uploadProgress}%
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-[width]"
                        style={{ width: `${Math.max(uploadProgress, 4)}%` }}
                      />
                    </div>
                  </div>
                )}

                {!uploadMutation.isPending && (
                  <button
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
                    onClick={submitFile}
                    type="button"
                  >
                    Kiểm tra và phân tích
                    <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
                  </button>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="font-extrabold text-[var(--text-primary)]">
                Template bắt buộc
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                File phải có đúng 11 cột. Không thêm số điện thoại, địa chỉ hoặc
                thông tin cá nhân khác.
              </p>
              <a
                className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--primary)] hover:underline"
                download
                href="/sample_sales_template.csv"
              >
                <FileCsvIcon aria-hidden="true" size={18} weight="duotone" />
                Tải CSV mẫu
              </a>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="font-extrabold text-[var(--text-primary)]">
                Quy tắc tính
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
                <p className="flex gap-2">
                  <InfoIcon
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-[var(--primary)]"
                    size={17}
                    weight="fill"
                  />
                  Mỗi dòng là một sản phẩm trong đơn hàng.
                </p>
                <p className="flex gap-2">
                  <InfoIcon
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-[var(--primary)]"
                    size={17}
                    weight="fill"
                  />
                  Chỉ đơn completed được tính vào analytics.
                </p>
                <p className="flex gap-2">
                  <ProhibitIcon
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-[var(--text-muted)]"
                    size={17}
                  />
                  MarketLens không lưu file gốc.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {analysis && (
          <AnalysisSuccess
            analysis={analysis}
            onUploadAnother={clearSelection}
          />
        )}
      </div>
    </main>
  )
}

function UploadError({
  clientError,
  error,
}: {
  clientError: string | null
  error: ParsedApiError | null
}) {
  const rowErrors = error?.details?.errors ?? []
  const missingColumns = Array.isArray(error?.details?.missing)
    ? (error.details.missing as string[])
    : []
  const extraColumns = Array.isArray(error?.details?.extra)
    ? (error.details.extra as string[])
    : []

  return (
    <div
      className="mt-5 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] p-5"
      role="alert"
    >
      <div className="flex gap-3 text-[var(--danger)]">
        <WarningCircleIcon
          aria-hidden="true"
          className="mt-0.5 shrink-0"
          size={21}
          weight="fill"
        />
        <div>
          <p className="font-extrabold">
            {clientError ?? error?.message}
          </p>
          {error?.code && (
            <p className="mt-1 text-xs font-bold">Mã lỗi: {error.code}</p>
          )}
          {error?.requestId && (
            <p className="mt-1 break-all text-xs font-semibold text-[var(--text-muted)]">
              Mã yêu cầu: {error.requestId}
            </p>
          )}
        </div>
      </div>

      {rowErrors.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="text-[var(--text-muted)]">
              <tr>
                <th className="pb-2 pr-4 font-bold">Dòng</th>
                <th className="pb-2 pr-4 font-bold">Cột</th>
                <th className="pb-2 font-bold">Nguyên nhân</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-primary)]">
              {rowErrors.map((item, index) => (
                <tr key={`${item.row}-${item.column}-${index}`}>
                  <td className="border-t border-[var(--border)] py-2 pr-4">
                    {item.row ?? item.identifier ?? '-'}
                  </td>
                  <td className="border-t border-[var(--border)] py-2 pr-4 font-mono text-xs">
                    {item.column}
                  </td>
                  <td className="border-t border-[var(--border)] py-2">
                    {formatReason(item.reason)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(error?.details?.total_error_count ?? 0) > rowErrors.length && (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Còn{' '}
              {(error?.details?.total_error_count ?? 0) - rowErrors.length} lỗi
              khác trong file.
            </p>
          )}
        </div>
      )}

      {(missingColumns.length > 0 || extraColumns.length > 0) && (
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {missingColumns.length > 0 && (
            <div>
              <p className="font-extrabold text-[var(--text-primary)]">
                Cột còn thiếu
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missingColumns.map((column) => (
                  <code
                    className="rounded-lg bg-[var(--surface)] px-2 py-1 text-xs text-[var(--danger)]"
                    key={column}
                  >
                    {column}
                  </code>
                ))}
              </div>
            </div>
          )}
          {extraColumns.length > 0 && (
            <div>
              <p className="font-extrabold text-[var(--text-primary)]">
                Cột không được hỗ trợ
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {extraColumns.map((column) => (
                  <code
                    className="rounded-lg bg-[var(--surface)] px-2 py-1 text-xs text-[var(--danger)]"
                    key={column}
                  >
                    {column}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AnalysisSuccess({
  analysis,
  onUploadAnother,
}: {
  analysis: AnalysisDetail
  onUploadAnother: () => void
}) {
  const metrics = [
    {
      label: 'Tổng doanh thu',
      value: formatVnd(analysis.summary.total_revenue),
    },
    {
      label: 'Đơn completed',
      value: formatInteger(analysis.summary.total_orders),
    },
    {
      label: 'Khách hàng',
      value: formatInteger(analysis.summary.total_customers),
    },
    {
      label: 'Sản phẩm đã bán',
      value: formatInteger(analysis.summary.total_quantity_sold),
    },
  ]

  return (
    <section className="mt-7 rounded-2xl border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--surface)] p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <CheckCircleIcon
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[var(--success)]"
            size={25}
            weight="fill"
          />
          <div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)]">
              Phân tích hoàn thành
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
              {analysis.file_name} · {formatInteger(analysis.row_count)} dòng ·{' '}
              {formatDate(analysis.period.from)} đến{' '}
              {formatDate(analysis.period.to)}
            </p>
          </div>
        </div>
        <button
          className="w-fit rounded-xl border border-[var(--border-strong)] px-4 py-2.5 text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          onClick={onUploadAnother}
          type="button"
        >
          Upload file khác
        </button>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value }) => (
          <div
            className="rounded-2xl bg-[var(--surface-subtle)] p-5"
            key={label}
          >
            <p className="text-sm font-bold text-[var(--text-muted)]">{label}</p>
            <p className="mt-2 text-xl font-extrabold tracking-[-0.025em] text-[var(--text-primary)]">
              {value}
            </p>
          </div>
        ))}
      </div>

      {analysis.warnings.length > 0 && (
        <div className="mt-5 flex gap-3 rounded-xl bg-[var(--primary-soft)] p-4 text-sm leading-6 text-[var(--text-muted)]">
          <InfoIcon
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[var(--primary)]"
            size={19}
            weight="fill"
          />
          <p>
            {analysis.warnings.map(formatWarning).join(' ')}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)]"
          to="/dashboard"
        >
          Xem dashboard
          <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
        </Link>
        <Link
          className="rounded-xl border border-[var(--border-strong)] px-5 py-3 text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          to="/sales"
        >
          Xem Sales Analytics
        </Link>
      </div>
    </section>
  )
}

function formatReason(reason: string) {
  const labels: Record<string, string> = {
    required: 'Thiếu dữ liệu bắt buộc',
    invalid_date: 'Ngày không đúng YYYY-MM-DD',
    invalid_status: 'Status không hợp lệ',
    must_be_positive_integer: 'Phải là số nguyên lớn hơn 0',
    must_be_non_negative_number: 'Phải là số không âm',
    line_revenue_must_be_non_negative: 'Doanh thu dòng bị âm',
    inconsistent_for_order_id: 'Không nhất quán trong cùng order_id',
    inconsistent_for_product_id: 'Không nhất quán trong cùng product_id',
    inconsistent_for_customer_id: 'Không nhất quán trong cùng customer_id',
  }
  return labels[reason] ?? reason
}

function formatWarning(warning: string) {
  const labels: Record<string, string> = {
    INSUFFICIENT_HISTORY:
      'Dữ liệu dưới 14 ngày nên chưa đủ điều kiện tạo forecast.',
    NO_COMPARABLE_PREVIOUS_REVENUE:
      'Không có doanh thu ở 7 ngày trước để tính tỷ lệ tăng trưởng.',
  }
  return labels[warning] ?? warning
}
