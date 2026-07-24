import {
  ArrowRightIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  FilePdfIcon,
  GearSixIcon,
  InfoIcon,
  LightbulbIcon,
  SparkleIcon,
  SpinnerGapIcon,
  TargetIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  generateAiReport,
  type AnalysisDetail,
} from '../api/analysesApi'
import { parseApiError } from '../api/apiErrors'
import { queryClient } from '../app/queryClient'
import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import {
  AnalysisEmptyState,
  AnalysisErrorState,
  AnalysisLoadingState,
} from '../components/analytics/AnalysisStates'
import {
  analysisKeys,
  useCurrentAnalysis,
} from '../features/analysis/analysisQueries'
import {
  getReportPageTitle,
  getReportSourceLabel,
} from '../features/report/reportPresentation'
import { formatInteger, formatVnd } from '../utils/formatters'

export function ReportPage() {
  const { analysis, error, isEmpty, isLoading, retry } = useCurrentAnalysis()
  const [generationNotice, setGenerationNotice] = useState<{
    message: string
    tone: 'success' | 'warning' | 'danger'
  } | null>(null)
  const reportMutation = useMutation({
    mutationFn: (analysisId: string) => generateAiReport(analysisId),
    onMutate: () => setGenerationNotice(null),
    onSuccess: (result) => {
      queryClient.setQueryData<AnalysisDetail>(
        analysisKeys.detail(result.analysis_id),
        (current) =>
          current ? { ...current, report: result.report } : current,
      )
      setGenerationNotice(
        result.warning
          ? { message: result.warning.message, tone: 'warning' }
          : {
              message: 'Báo cáo AI đã được tạo và lưu vào analysis này.',
              tone: 'success',
            },
      )
    },
    onError: (mutationError) => {
      setGenerationNotice({
        message: parseApiError(mutationError).message,
        tone: 'danger',
      })
    },
  })

  if (isLoading) return <AnalysisLoadingState />
  if (error) return <AnalysisErrorState error={error} onRetry={retry} />
  if (isEmpty || !analysis) {
    return <AnalysisEmptyState title="Chưa có dữ liệu để tạo báo cáo" />
  }

  const { report } = analysis

  return (
    <main className="report-page px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <div className="report-screen-only">
          <AnalysisHeader
            analysis={analysis}
            description="Tổng hợp tình hình, xu hướng và khuyến nghị từ các chỉ số đã được backend tính."
            title={getReportPageTitle(report.source)}
          />

          <section className="mt-6 flex flex-col gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="max-w-2xl">
              <h2 className="font-extrabold text-[var(--text-primary)]">
                Tạo và xuất báo cáo
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                AI chỉ nhận aggregate đã loại thông tin khách hàng. Nút PDF mở
                hộp thoại in để chọn “Save as PDF”.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={reportMutation.isPending}
                onClick={() => reportMutation.mutate(analysis.id)}
                type="button"
              >
                {reportMutation.isPending ? (
                  <SpinnerGapIcon
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                    size={18}
                    weight="bold"
                  />
                ) : (
                  <SparkleIcon aria-hidden="true" size={18} weight="fill" />
                )}
                {reportMutation.isPending
                  ? 'Đang tạo báo cáo...'
                  : report.source === 'ai'
                    ? 'Tạo lại bằng AI'
                    : 'Tạo báo cáo AI'}
              </button>
              <button
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border-strong)] px-4 py-3 text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-[0.98]"
                onClick={() => window.print()}
                type="button"
              >
                <FilePdfIcon aria-hidden="true" size={19} weight="duotone" />
                Xuất PDF
              </button>
            </div>
          </section>

          {generationNotice && (
            <GenerationNotice
              message={generationNotice.message}
              tone={generationNotice.tone}
            />
          )}
        </div>

        <article
          className="mt-7 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
          id="business-report"
        >
          <header className="border-b border-[var(--border)] bg-[var(--primary-soft)] p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <ReportSource source={report.source} />
                <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.035em] text-[var(--text-primary)] sm:text-3xl">
                  {report.title}
                </h2>
                <p className="mt-4 text-base leading-8 text-[var(--text-muted)]">
                  {report.summary}
                </p>
              </div>
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--surface)] text-[var(--primary)]">
                {report.source === 'ai' ? (
                  <SparkleIcon aria-hidden="true" size={29} weight="duotone" />
                ) : (
                  <GearSixIcon aria-hidden="true" size={29} weight="duotone" />
                )}
              </span>
            </div>

            <dl className="mt-7 grid gap-4 border-t border-[color-mix(in_srgb,var(--primary)_18%,transparent)] pt-6 sm:grid-cols-3">
              <ReportFact
                label="Doanh thu thực tế"
                value={formatVnd(analysis.summary.total_revenue)}
              />
              <ReportFact
                label="Đơn completed"
                value={formatInteger(analysis.summary.total_orders)}
              />
              <ReportFact
                label="Khách hàng trong kỳ"
                value={formatInteger(analysis.summary.total_customers)}
              />
            </dl>
          </header>

          <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
            <div>
              <section>
                <SectionTitle icon={CheckCircleIcon} title="Điểm nổi bật" />
                <ul className="mt-5 space-y-3">
                  {report.highlights.map((highlight, index) => (
                    <li
                      className="flex gap-3 rounded-xl bg-[var(--surface-subtle)] p-4 text-sm leading-6 text-[var(--text-primary)]"
                      key={`${index}-${highlight}`}
                    >
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-xs font-extrabold text-[var(--primary-contrast)]">
                        {index + 1}
                      </span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-8 border-t border-[var(--border)] pt-8">
                <SectionTitle icon={ChartLineUpIcon} title="Phân tích xu hướng" />
                <p className="mt-4 rounded-xl border-l-4 border-[var(--primary)] bg-[var(--primary-soft)] p-5 leading-7 text-[var(--text-primary)]">
                  {report.trend_analysis}
                </p>
              </section>
            </div>

            <section>
              <SectionTitle icon={LightbulbIcon} title="Khuyến nghị cải thiện" />
              <ol className="mt-5 space-y-4">
                {report.recommendations.map((recommendation, index) => (
                  <li
                    className="report-print-break-avoid rounded-xl border border-[var(--border)] p-5"
                    key={`${index}-${recommendation.title}`}
                  >
                    <div className="flex items-start gap-3">
                      <TargetIcon
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-[var(--primary)]"
                        size={21}
                        weight="duotone"
                      />
                      <div>
                        <h3 className="font-extrabold text-[var(--text-primary)]">
                          {recommendation.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                          {recommendation.description}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <footer className="flex flex-col gap-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="flex max-w-3xl gap-2 text-xs leading-5 text-[var(--text-muted)]">
              <InfoIcon
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[var(--primary)]"
                size={17}
                weight="fill"
              />
              {report.disclaimer}
            </p>
            <div className="report-screen-only flex shrink-0 flex-wrap gap-4 text-sm font-extrabold">
              <Link
                className="inline-flex items-center gap-2 whitespace-nowrap text-[var(--primary)] hover:underline"
                to="/sales"
              >
                Kiểm tra số liệu
                <ArrowRightIcon aria-hidden="true" size={16} weight="bold" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 whitespace-nowrap text-[var(--primary)] hover:underline"
                to="/forecast"
              >
                Xem dự báo
                <ArrowRightIcon aria-hidden="true" size={16} weight="bold" />
              </Link>
            </div>
          </footer>
        </article>

        {report.source === 'rule_based' && (
          <p className="report-screen-only mt-4 text-center text-xs leading-5 text-[var(--text-muted)]">
            Đây là báo cáo dự phòng theo quy tắc. MarketLens không gắn nhãn AI
            cho nội dung này.
          </p>
        )}
      </div>
    </main>
  )
}

function GenerationNotice({
  message,
  tone,
}: {
  message: string
  tone: 'success' | 'warning' | 'danger'
}) {
  const toneClass = {
    success:
      'border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] text-[var(--success)]',
    warning:
      'border-[color-mix(in_srgb,var(--warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,var(--surface))] text-[var(--warning)]',
    danger:
      'border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]',
  }

  return (
    <div
      className={`mt-4 flex gap-3 rounded-xl border px-4 py-3 text-sm font-bold leading-6 ${toneClass[tone]}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      {tone === 'success' ? (
        <CheckCircleIcon
          aria-hidden="true"
          className="mt-0.5 shrink-0"
          size={19}
          weight="fill"
        />
      ) : (
        <WarningCircleIcon
          aria-hidden="true"
          className="mt-0.5 shrink-0"
          size={19}
          weight="fill"
        />
      )}
      {message}
    </div>
  )
}

function ReportSource({
  source,
}: {
  source: 'rule_based' | 'ai'
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-1.5 text-xs font-extrabold text-[var(--primary)]">
      {source === 'ai' ? (
        <SparkleIcon aria-hidden="true" size={15} weight="fill" />
      ) : (
        <GearSixIcon aria-hidden="true" size={15} weight="fill" />
      )}
      {getReportSourceLabel(source)}
    </span>
  )
}

function ReportFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 font-extrabold text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof CheckCircleIcon
  title: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
        <Icon aria-hidden="true" size={21} weight="duotone" />
      </span>
      <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
        {title}
      </h2>
    </div>
  )
}
