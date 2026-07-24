import {
  ArrowClockwiseIcon,
  ChartLineUpIcon,
  CloudArrowUpIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

import type { ParsedApiError } from '../../api/apiErrors'

export function AnalysisLoadingState() {
  return (
    <main
      aria-label="Đang tải dữ liệu phân tích"
      className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9"
      role="status"
    >
      <div className="mx-auto max-w-7xl animate-pulse motion-reduce:animate-none">
        <div className="h-4 w-32 rounded bg-[var(--surface-subtle)]" />
        <div className="mt-4 h-9 w-72 max-w-full rounded-lg bg-[var(--surface-subtle)]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="h-36 rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
              key={index}
            />
          ))}
        </div>
        <div className="mt-6 h-96 rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
      </div>
    </main>
  )
}

export function AnalysisEmptyState({
  title = 'Chưa có dữ liệu phân tích',
}: {
  title?: string
}) {
  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <section className="grid min-h-[30rem] place-items-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-5 py-12 text-center">
          <div className="max-w-lg">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ChartLineUpIcon aria-hidden="true" size={29} weight="duotone" />
            </span>
            <h1 className="mt-6 text-2xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 leading-7 text-[var(--text-muted)]">
              Upload file bán hàng đúng template để MarketLens tính KPI và hiển
              thị các biểu đồ từ dữ liệu thật.
            </p>
            <Link
              className="mt-7 inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
              to="/upload"
            >
              <CloudArrowUpIcon aria-hidden="true" size={19} weight="bold" />
              Upload dữ liệu
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

export function AnalysisErrorState({
  error,
  onRetry,
}: {
  error: ParsedApiError
  onRetry: () => void
}) {
  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <section
          className="mx-auto max-w-2xl rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--surface)] p-6 sm:p-8"
          role="alert"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]">
            <WarningCircleIcon aria-hidden="true" size={27} weight="fill" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)]">
            Không tải được dữ liệu
          </h1>
          <p className="mt-3 leading-7 text-[var(--text-muted)]">
            {error.message}
          </p>
          <p className="mt-2 text-xs font-bold text-[var(--danger)]">
            Mã lỗi: {error.code}
          </p>
          {error.requestId && (
            <p className="mt-1 break-all text-xs font-semibold text-[var(--text-muted)]">
              Mã yêu cầu: {error.requestId}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
              onClick={onRetry}
              type="button"
            >
              <ArrowClockwiseIcon aria-hidden="true" size={18} weight="bold" />
              Thử lại
            </button>
            <Link
              className="whitespace-nowrap rounded-xl border border-[var(--border-strong)] px-5 py-3 text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              to="/upload"
            >
              Upload file khác
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
