import {
  ArrowClockwiseIcon,
  ChartLineUpIcon,
  CloudArrowUpIcon,
  DownloadSimpleIcon,
  FileCsvIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router'
import type { ParsedApiError } from '../../api/apiErrors'
import { useLanguage } from '../../i18n/LanguageContext'

export function AnalysisLoadingState() {
  const { t } = useLanguage()
  return (
    <main
      aria-label={t('analysis.loading')}
      className="px-4 py-6 sm:px-7 lg:px-8 lg:py-8"
      role="status"
    >
      <div className="mx-auto max-w-[1440px] animate-pulse motion-reduce:animate-none">
        <div className="border-b border-[var(--border)] pb-6">
          <div className="h-8 w-72 max-w-full rounded-md bg-[#dce3ec]" />
          <div className="mt-3 h-4 w-[28rem] max-w-full rounded bg-[#e2e7ee]" />
          <div className="mt-5 flex gap-4">
            <div className="h-4 w-36 rounded bg-[#e2e7ee]" />
            <div className="h-4 w-44 rounded bg-[#e2e7ee]" />
            <div className="hidden h-4 w-28 rounded bg-[#e2e7ee] sm:block" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className={[
                'h-36 rounded-xl border p-5',
                index === 0
                  ? 'border-[#b9cce8] bg-[#dbe8f9]'
                  : 'border-[var(--border)] bg-[#f9fafb]',
              ].join(' ')}
              key={index}
            >
              <div className="h-3 w-24 rounded bg-[#cfd8e4]" />
              <div className="mt-5 h-7 w-32 rounded bg-[#c8d2df]" />
              <div className="mt-5 h-3 w-20 rounded bg-[#d7dee7]" />
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[#f9fafb] p-6">
          <div className="h-5 w-40 rounded bg-[#cfd8e4]" />
          <div className="mt-2 h-3 w-64 max-w-full rounded bg-[#e0e5ec]" />
          <div className="mt-8 grid h-64 grid-rows-5 gap-8 border-b border-l border-[#dfe5ec] px-4 py-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className="border-t border-[#e4e9ef]"
                key={index}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

export function AnalysisEmptyState({
  title,
}: {
  title?: string
}) {
  const { t } = useLanguage()
  const displayTitle = title ?? t('analysis.noDataTitle')

  return (
    <main className="px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-xl border border-[var(--border)] bg-white p-8 text-center shadow-[0_1px_2px_rgba(19,33,54,0.04)] sm:p-14">
          <div className="mx-auto max-w-md">
            <span className="mx-auto grid size-16 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700">
              <ChartLineUpIcon aria-hidden="true" size={32} weight="bold" />
            </span>

            <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {displayTitle}
            </h1>

            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
              {t('analysis.noDataDesc')}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-[var(--primary-hover)] active:scale-[0.98] sm:w-auto"
                to="/upload"
              >
                <CloudArrowUpIcon aria-hidden="true" size={18} weight="bold" />
                <span>{t('analysis.uploadFile')}</span>
              </Link>
              <a
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3.5 text-sm font-extrabold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98] sm:w-auto"
                download
                href="/marketlens_ds_demo_365_days.csv"
              >
                <DownloadSimpleIcon size={16} weight="bold" />
                <span>{t('analysis.downloadDemo')}</span>
              </a>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-xs font-bold text-slate-500">
              <FileCsvIcon className="text-blue-700" size={16} />
              <span>{t('upload.supportedFormat')}</span>
            </div>
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
  const { t } = useLanguage()

  return (
    <main className="px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-2xl">
        <section
          className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-lg"
          role="alert"
        >
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <WarningCircleIcon aria-hidden="true" size={32} weight="fill" />
          </span>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
            {t('analysis.loadError')}
          </h1>
          <p className="mt-2 text-xs sm:text-sm font-bold text-slate-600">
            {error.message}
          </p>
          <p className="mt-2 text-xs font-bold text-rose-600">
            {t('common.errorCode')}: {error.code}
          </p>
          {error.requestId && (
            <p className="mt-1 break-all text-xs font-medium text-slate-400">
              {t('common.requestId')}: {error.requestId}
            </p>
          )}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-black text-white shadow-md hover:bg-indigo-700 transition active:scale-[0.98]"
              onClick={onRetry}
              type="button"
            >
              <ArrowClockwiseIcon aria-hidden="true" size={16} weight="bold" />
              <span>{t('common.retry')}</span>
            </button>
            <Link
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black text-slate-800 hover:bg-slate-50 transition"
              to="/upload"
            >
              {t('analysis.uploadAnother')}
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
