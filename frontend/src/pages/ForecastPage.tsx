import {
  CalendarDotsIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  CloudArrowUpIcon,
  InfoIcon,
  SigmaIcon,
  TrendDownIcon,
  TrendUpIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import {
  AnalysisEmptyState,
  AnalysisErrorState,
  AnalysisLoadingState,
} from '../components/analytics/AnalysisStates'
import { ForecastRevenueChart } from '../components/analytics/Charts'
import { MetricCard } from '../components/analytics/MetricCard'
import { useCurrentAnalysis } from '../features/analysis/analysisQueries'
import {
  buildForecastChartData,
  getForecastChangeTone,
  getForecastMethodLabel,
} from '../features/forecast/forecastPresentation'
import {
  formatDate,
  formatInteger,
  formatPercent,
  formatVnd,
} from '../utils/formatters'

export function ForecastPage() {
  const { analysis, error, isEmpty, isLoading, retry } = useCurrentAnalysis()

  if (isLoading) return <AnalysisLoadingState />
  if (error) return <AnalysisErrorState error={error} onRetry={retry} />
  if (isEmpty || !analysis) {
    return <AnalysisEmptyState title="Chưa có dữ liệu để dự báo" />
  }

  const { forecast } = analysis

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <AnalysisHeader
          analysis={analysis}
          description="Ước lượng doanh thu 7 ngày tiếp theo bằng phương pháp thống kê từ dữ liệu completed."
          title="Dự báo doanh thu"
        />

        {!forecast.available ? (
          <UnavailableForecast
            disclaimer={forecast.disclaimer}
            historyDays={forecast.history_days}
          />
        ) : (
          <AvailableForecast
            analysis={analysis}
          />
        )}
      </div>
    </main>
  )
}

function UnavailableForecast({
  disclaimer,
  historyDays,
}: {
  disclaimer: string
  historyDays: number
}) {
  const missingDays = Math.max(0, 14 - historyDays)

  return (
    <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
        <span className="grid size-14 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <ClockCounterClockwiseIcon
            aria-hidden="true"
            size={29}
            weight="duotone"
          />
        </span>
        <p className="mt-7 text-sm font-extrabold text-[var(--primary)]">
          {formatInteger(historyDays)} / 14 ngày lịch sử
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] sm:text-3xl">
          Chưa đủ dữ liệu để tạo dự báo
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--text-muted)]">
          MarketLens cần tối thiểu 14 ngày liên tục từ đơn completed. File hiện
          tại còn thiếu {formatInteger(missingDays)} ngày để áp dụng phương pháp
          trung bình trượt 7 ngày.
        </p>
        <Link
          className="mt-7 inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
          to="/upload"
        >
          <CloudArrowUpIcon aria-hidden="true" size={19} weight="bold" />
          Upload dữ liệu dài hơn
        </Link>
      </section>

      <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-extrabold text-[var(--text-primary)]">
          Quy tắc Forecast
        </h2>
        <dl className="mt-5 space-y-5">
          <ForecastRule
            description="Không tạo dự báo để tránh hiển thị kết quả thiếu cơ sở."
            label="Dưới 14 ngày"
          />
          <ForecastRule
            description="Dùng trung bình doanh thu của 7 ngày gần nhất."
            label="Từ 14 đến 29 ngày"
          />
          <ForecastRule
            description="Dùng xu hướng tuyến tính trên tối đa 30 ngày gần nhất."
            label="Từ 30 ngày"
          />
        </dl>
        <p className="mt-6 flex gap-2 rounded-xl bg-[var(--surface-subtle)] p-4 text-xs leading-5 text-[var(--text-muted)]">
          <InfoIcon
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[var(--primary)]"
            size={17}
            weight="fill"
          />
          {disclaimer}
        </p>
      </aside>
    </div>
  )
}

function ForecastRule({
  description,
  label,
}: {
  description: string
  label: string
}) {
  return (
    <div>
      <dt className="text-sm font-extrabold text-[var(--text-primary)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
        {description}
      </dd>
    </div>
  )
}

function AvailableForecast({
  analysis,
}: {
  analysis: NonNullable<ReturnType<typeof useCurrentAnalysis>['analysis']>
}) {
  const { forecast } = analysis
  const change = forecast.change_vs_last_7_days_percent
  const changeTone = getForecastChangeTone(change)
  const changeLabel =
    change === null
      ? 'Không có mốc so sánh'
      : `${formatPercent(change, 1, true)}% so với 7 ngày thực tế gần nhất`
  const chartData = buildForecastChartData(
    analysis.revenue_by_date,
    forecast,
  )

  return (
    <>
      <section
        aria-label="Tóm tắt dự báo"
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          change={{ label: changeLabel, tone: changeTone }}
          icon={change !== null && change < 0 ? TrendDownIcon : TrendUpIcon}
          label="Doanh thu dự báo 7 ngày"
          value={formatVnd(forecast.forecast_total ?? 0)}
        />
        <MetricCard
          helper="Số ngày liên tục trong kỳ completed."
          icon={CalendarDotsIcon}
          label="Lịch sử sử dụng"
          value={`${formatInteger(forecast.history_days)} ngày`}
        />
        <MetricCard
          helper="Do backend lựa chọn theo độ dài dữ liệu."
          icon={SigmaIcon}
          label="Phương pháp"
          value={getForecastMethodLabel(forecast.method)}
        />
        <MetricCard
          helper="Mỗi điểm là doanh thu dự báo cho một ngày."
          icon={ChartLineUpIcon}
          label="Khoảng dự báo"
          value={`${formatInteger(forecast.forecast_days)} ngày`}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
              Thực tế và dự báo
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
              Hiển thị tối đa 30 ngày thực tế gần nhất và 7 ngày dự báo.
            </p>
          </div>
          <div
            aria-label="Chú thích biểu đồ"
            className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-[var(--text-muted)]"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-0.5 w-7 bg-[var(--primary)]"
              />
              Thực tế
            </span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-7 border-t-2 border-dashed border-[var(--forecast)]"
              />
              Dự báo
            </span>
          </div>
        </div>
        <div className="mt-5">
          <ForecastRevenueChart data={chartData} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)]">
        <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
            Chi tiết 7 ngày dự báo
          </h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="text-[var(--text-muted)]">
                <tr>
                  <th className="pb-3 pr-4 font-bold">Ngày</th>
                  <th className="pb-3 text-right font-bold">
                    Doanh thu dự báo
                  </th>
                </tr>
              </thead>
              <tbody>
                {forecast.points.map((point) => (
                  <tr
                    className="border-t border-[var(--border)]"
                    key={point.date}
                  >
                    <td className="py-3.5 pr-4 font-bold text-[var(--text-muted)]">
                      {formatDate(point.date)}
                    </td>
                    <td className="py-3.5 text-right font-extrabold text-[var(--text-primary)]">
                      {formatVnd(point.predicted_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--border-strong)]">
                  <th className="pt-4 font-extrabold text-[var(--text-primary)]">
                    Tổng 7 ngày
                  </th>
                  <td className="pt-4 text-right font-extrabold text-[var(--primary)]">
                    {formatVnd(forecast.forecast_total ?? 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <aside className="rounded-2xl bg-[#102b61] p-6 text-white">
          <SigmaIcon aria-hidden="true" size={28} weight="duotone" />
          <h2 className="mt-5 text-lg font-extrabold">
            {getForecastMethodLabel(forecast.method)}
          </h2>
          <p className="mt-3 text-sm leading-6 text-blue-100/78">
            {forecast.method === 'linear_trend_30_days'
              ? 'Backend khớp một đường xu hướng trên tối đa 30 ngày gần nhất, sau đó clip mọi giá trị âm về 0.'
              : 'Backend lấy trung bình doanh thu của 7 ngày gần nhất và dùng giá trị đó cho 7 ngày tiếp theo.'}
          </p>
          <p className="mt-6 border-t border-white/12 pt-5 text-xs leading-5 text-blue-100/72">
            {forecast.disclaimer}
          </p>
        </aside>
      </div>
    </>
  )
}
