import type { ReactNode } from 'react'

import type { AnalysisDetail } from '../../api/analysesApi'
import { useLanguage, type Language } from '../../i18n/LanguageContext'
import {
  formatCompactVnd,
  formatShortDate,
} from '../../utils/formatters'

type ReportChartsProps = {
  analysis: AnalysisDetail
}

type ChartPoint = {
  date: string
  value: number
}

type ForecastChartPoint = {
  actual: number | null
  date: string
  lower: number | null
  predicted: number | null
  upper: number | null
}

const CHART = {
  bottom: 28,
  height: 240,
  left: 54,
  right: 12,
  top: 12,
  width: 520,
} as const

export function ReportCharts({ analysis }: ReportChartsProps) {
  const { language, t } = useLanguage()
  const forecast =
    analysis.forecast.horizons.find(
      (item) => item.horizon_days === 30 && item.available,
    ) ??
    analysis.forecast.horizons.find(
      (item) => item.horizon_days === 7,
    )
  const revenuePoints = analysis.revenue_by_date.slice(-30).map((point) => ({
    date: point.date,
    value: point.revenue,
  }))
  const actualPoints: ForecastChartPoint[] = analysis.revenue_by_date
    .slice(-7)
    .map((point) => ({
      actual: point.revenue,
      date: point.date,
      lower: null,
      predicted: null,
      upper: null,
    }))
  const forecastPoints: ForecastChartPoint[] =
    forecast?.points.map((point) => ({
      actual: null,
      date: point.date,
      lower: point.lower_bound,
      predicted: point.predicted_revenue,
      upper: point.upper_bound,
    })) ?? []
  const forecastSeries = [...actualPoints, ...forecastPoints]

  return (
    <section className="report-print-section border-b border-slate-100 p-6 sm:p-9">
      <div>
        <h3 className="text-lg font-black tracking-tight text-slate-900">
          {t('report.chartsTitle')}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {t('report.chartsDesc')}
        </p>
      </div>
      <div className="report-print-chart-grid mt-5 grid gap-5 xl:grid-cols-2">
        <figure className="report-print-break-avoid rounded-2xl border border-slate-200 bg-white p-4">
          <figcaption>
            <p className="text-sm font-black text-slate-900">
              {t('report.revenueChartTitle')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {t('report.revenueChartDesc')}
            </p>
          </figcaption>
          <div className="report-chart-canvas mt-4 aspect-[13/6] min-w-0">
            <RevenueSvgChart
              ariaLabel={t('report.revenueChartTitle')}
              language={language}
              points={revenuePoints}
            />
          </div>
        </figure>

        <figure className="report-print-break-avoid rounded-2xl border border-slate-200 bg-white p-4">
          <figcaption>
            <p className="text-sm font-black text-slate-900">
              {t('report.forecastChartTitle', {
                count: forecast?.horizon_days ?? 7,
              })}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {forecast?.available
                ? t('report.forecastChartDesc', {
                    count: forecast.horizon_days,
                  })
                : t('report.forecastChartUnavailable')}
            </p>
          </figcaption>
          {forecast?.available ? (
            <>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold text-slate-500">
                <ChartLegend
                  color="#0f172a"
                  label={t('report.actualRevenue')}
                />
                <ChartLegend
                  color="#2563eb"
                  dashed
                  label={t('report.predictedRevenue')}
                />
                {forecast.uncertainty.available && (
                  <ChartLegend
                    color="#bfdbfe"
                    label={t('report.forecastInterval')}
                    wide
                  />
                )}
              </div>
              <div className="report-chart-canvas mt-2 aspect-[13/6] min-w-0">
                <ForecastSvgChart
                  ariaLabel={t('report.forecastChartTitle', {
                    count: forecast.horizon_days,
                  })}
                  language={language}
                  points={forecastSeries}
                />
              </div>
            </>
          ) : (
            <div className="mt-4 grid aspect-[13/6] place-items-center rounded-xl bg-slate-50 px-6 text-center text-sm font-semibold text-slate-600">
              {t('report.forecastChartUnavailable')}
            </div>
          )}
        </figure>
      </div>
    </section>
  )
}

function RevenueSvgChart({
  ariaLabel,
  language,
  points,
}: {
  ariaLabel: string
  language: Language
  points: ChartPoint[]
}) {
  const maximum = niceMaximum(points.map((point) => point.value))
  const path = linePath(
    points.map((point, index) => ({ index, value: point.value })),
    points.length,
    maximum,
  )

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      dates={points.map((point) => point.date)}
      language={language}
      maximum={maximum}
    >
      <path
        d={path}
        data-chart-series="actual-revenue"
        fill="none"
        stroke="#2563eb"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </ChartFrame>
  )
}

function ForecastSvgChart({
  ariaLabel,
  language,
  points,
}: {
  ariaLabel: string
  language: Language
  points: ForecastChartPoint[]
}) {
  const values = points.flatMap((point) =>
    [point.actual, point.predicted, point.upper].filter(
      (value): value is number => value !== null,
    ),
  )
  const maximum = niceMaximum(values)
  const actualPath = linePath(
    points.flatMap((point, index) =>
      point.actual === null ? [] : [{ index, value: point.actual }],
    ),
    points.length,
    maximum,
  )
  const predictedPath = linePath(
    points.flatMap((point, index) =>
      point.predicted === null
        ? []
        : [{ index, value: point.predicted }],
    ),
    points.length,
    maximum,
  )
  const intervalPath = areaPath(points, maximum)

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      dates={points.map((point) => point.date)}
      language={language}
      maximum={maximum}
    >
      {intervalPath && (
        <path
          d={intervalPath}
          data-chart-series="forecast-interval"
          fill="#bfdbfe"
          fillOpacity="0.75"
          stroke="none"
        />
      )}
      <path
        d={actualPath}
        data-chart-series="actual-revenue"
        fill="none"
        stroke="#0f172a"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.75"
      />
      <path
        d={predictedPath}
        data-chart-series="predicted-revenue"
        fill="none"
        stroke="#2563eb"
        strokeDasharray="7 5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </ChartFrame>
  )
}

function ChartFrame({
  ariaLabel,
  children,
  dates,
  language,
  maximum,
}: {
  ariaLabel: string
  children: ReactNode
  dates: string[]
  language: Language
  maximum: number
}) {
  const horizontalTicks = tickIndices(dates.length, 7)
  const verticalTicks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <svg
      aria-label={ariaLabel}
      className="report-chart-svg h-full w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
    >
      <title>{ariaLabel}</title>
      {verticalTicks.map((ratio) => {
        const value = maximum * ratio
        const y = yPosition(value, maximum)
        return (
          <g key={ratio}>
            <line
              stroke="#e2e8f0"
              strokeDasharray="3 4"
              x1={CHART.left}
              x2={CHART.width - CHART.right}
              y1={y}
              y2={y}
            />
            <text
              fill="#64748b"
              fontSize="10"
              textAnchor="end"
              x={CHART.left - 8}
              y={y + 3.5}
            >
              {formatCompactVnd(value, language)}
            </text>
          </g>
        )
      })}
      {horizontalTicks.map((index) => (
        <text
          fill="#64748b"
          fontSize="10"
          key={`${dates[index]}-${index}`}
          textAnchor={
            index === 0
              ? 'start'
              : index === dates.length - 1
                ? 'end'
                : 'middle'
          }
          x={xPosition(index, dates.length)}
          y={CHART.height - 7}
        >
          {formatShortDate(dates[index], language)}
        </text>
      ))}
      <g>{children}</g>
    </svg>
  )
}

function ChartLegend({
  color,
  dashed = false,
  label,
  wide = false,
}: {
  color: string
  dashed?: boolean
  label: string
  wide?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg
        aria-hidden="true"
        className={wide ? 'h-2.5 w-5' : 'h-2.5 w-4'}
        viewBox="0 0 20 10"
      >
        {wide ? (
          <rect fill={color} height="8" rx="2" width="20" y="1" />
        ) : (
          <line
            stroke={color}
            strokeDasharray={dashed ? '4 3' : undefined}
            strokeWidth="2.5"
            x1="0"
            x2="20"
            y1="5"
            y2="5"
          />
        )}
      </svg>
      {label}
    </span>
  )
}

function linePath(
  points: Array<{ index: number; value: number }>,
  pointCount: number,
  maximum: number,
) {
  return points
    .map(
      (point, position) =>
        `${position === 0 ? 'M' : 'L'} ${xPosition(
          point.index,
          pointCount,
        )} ${yPosition(point.value, maximum)}`,
    )
    .join(' ')
}

function areaPath(points: ForecastChartPoint[], maximum: number) {
  const bounds = points.flatMap((point, index) =>
    point.lower === null || point.upper === null
      ? []
      : [{ index, lower: point.lower, upper: point.upper }],
  )
  if (!bounds.length) return ''

  const upper = bounds.map(
    (point, index) =>
      `${index === 0 ? 'M' : 'L'} ${xPosition(
        point.index,
        points.length,
      )} ${yPosition(point.upper, maximum)}`,
  )
  const lower = [...bounds].reverse().map(
    (point) =>
      `L ${xPosition(point.index, points.length)} ${yPosition(
        point.lower,
        maximum,
      )}`,
  )
  return [...upper, ...lower, 'Z'].join(' ')
}

function xPosition(index: number, pointCount: number) {
  const width = CHART.width - CHART.left - CHART.right
  if (pointCount <= 1) return CHART.left + width / 2
  return CHART.left + (index / (pointCount - 1)) * width
}

function yPosition(value: number, maximum: number) {
  const height = CHART.height - CHART.top - CHART.bottom
  return CHART.top + (1 - value / maximum) * height
}

function niceMaximum(values: number[]) {
  const maximum = Math.max(...values, 1)
  const magnitude = 10 ** Math.floor(Math.log10(maximum))
  const normalized = maximum / magnitude
  const step =
    normalized <= 2
      ? magnitude * 0.5
      : normalized <= 5
        ? magnitude
        : magnitude * 2
  return Math.ceil(maximum / step) * step
}

function tickIndices(pointCount: number, maximumTicks: number) {
  if (pointCount <= 0) return []
  if (pointCount <= maximumTicks) {
    return Array.from({ length: pointCount }, (_, index) => index)
  }
  return Array.from(
    new Set(
      Array.from({ length: maximumTicks }, (_, index) =>
        Math.round((index * (pointCount - 1)) / (maximumTicks - 1)),
      ),
    ),
  )
}
