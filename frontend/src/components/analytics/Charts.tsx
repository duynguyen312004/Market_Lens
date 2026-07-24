import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type {
  CategoryMetric,
  ProductMetric,
} from '../../api/analysesApi'
import type { ForecastChartPoint } from '../../features/forecast/forecastPresentation'
import {
  formatCompactVnd,
  formatInteger,
  formatMonth,
  formatPercent,
  formatShortDate,
  formatVnd,
} from '../../utils/formatters'

const tooltipStyle = {
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: '0 14px 34px rgb(15 35 70 / 0.12)',
  color: 'var(--text-primary)',
  fontSize: '13px',
}

const axisTick = {
  fill: 'var(--text-muted)',
  fontSize: 12,
  fontWeight: 600,
}

export function RevenueLineChart({
  data,
}: {
  data: Array<{ date: string; revenue: number }>
}) {
  return (
    <div
      aria-label="Biểu đồ doanh thu theo ngày"
      className="h-80 w-full"
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ bottom: 4, left: 0, right: 8, top: 10 }}
        >
          <CartesianGrid
            stroke="var(--chart-grid)"
            strokeDasharray="3 5"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={28}
            tick={axisTick}
            tickFormatter={formatShortDate}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={axisTick}
            tickFormatter={formatCompactVnd}
            tickLine={false}
            width={62}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 4' }}
            formatter={(value) => [formatVnd(Number(value)), 'Doanh thu']}
            labelFormatter={(label) => `Ngày ${formatShortDate(String(label))}`}
          />
          <Line
            activeDot={{
              fill: 'var(--surface)',
              r: 5,
              stroke: 'var(--primary)',
              strokeWidth: 3,
            }}
            dataKey="revenue"
            dot={false}
            name="Doanh thu"
            stroke="var(--primary)"
            strokeWidth={3}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MonthlyRevenueChart({
  data,
}: {
  data: Array<{ month: string; revenue: number }>
}) {
  return (
    <div
      aria-label="Biểu đồ doanh thu theo tháng"
      className="h-72 w-full"
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ bottom: 4, left: 0, right: 8, top: 10 }}
        >
          <CartesianGrid
            stroke="var(--chart-grid)"
            strokeDasharray="3 5"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="month"
            tick={axisTick}
            tickFormatter={formatMonth}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={axisTick}
            tickFormatter={formatCompactVnd}
            tickLine={false}
            width={62}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: 'var(--primary-soft)' }}
            formatter={(value) => [formatVnd(Number(value)), 'Doanh thu']}
            labelFormatter={(label) => formatMonth(String(label))}
          />
          <Bar
            dataKey="revenue"
            fill="var(--primary)"
            name="Doanh thu"
            radius={[7, 7, 2, 2]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryRevenueChart({
  data,
}: {
  data: CategoryMetric[]
}) {
  return (
    <div
      aria-label="Biểu đồ doanh thu theo danh mục"
      className="h-80 w-full"
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ bottom: 4, left: 8, right: 14, top: 4 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--chart-grid)"
            strokeDasharray="3 5"
          />
          <XAxis
            axisLine={false}
            tick={axisTick}
            tickFormatter={formatCompactVnd}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="category"
            tick={axisTick}
            tickLine={false}
            type="category"
            width={105}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: 'var(--primary-soft)' }}
            formatter={(value) => [formatVnd(Number(value)), 'Doanh thu']}
          />
          <Bar
            dataKey="revenue"
            fill="var(--primary)"
            name="Doanh thu"
            radius={[2, 7, 7, 2]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProductRevenueChart({
  data,
}: {
  data: ProductMetric[]
}) {
  return (
    <div
      aria-label="Biểu đồ doanh thu theo sản phẩm"
      className="h-80 w-full"
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ bottom: 4, left: 8, right: 14, top: 4 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--chart-grid)"
            strokeDasharray="3 5"
          />
          <XAxis
            axisLine={false}
            tick={axisTick}
            tickFormatter={formatCompactVnd}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="product_name"
            tick={axisTick}
            tickLine={false}
            type="category"
            width={118}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: 'var(--primary-soft)' }}
            formatter={(value) => [formatVnd(Number(value)), 'Doanh thu']}
          />
          <Bar
            dataKey="revenue"
            fill="var(--chart-2)"
            name="Doanh thu"
            radius={[2, 7, 7, 2]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ForecastRevenueChart({
  data,
}: {
  data: ForecastChartPoint[]
}) {
  return (
    <div
      aria-label="Biểu đồ doanh thu thực tế và dự báo"
      className="h-96 w-full"
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ bottom: 4, left: 0, right: 8, top: 10 }}
        >
          <CartesianGrid
            stroke="var(--chart-grid)"
            strokeDasharray="3 5"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={28}
            tick={axisTick}
            tickFormatter={formatShortDate}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={axisTick}
            tickFormatter={formatCompactVnd}
            tickLine={false}
            width={62}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 4' }}
            formatter={(value, name) => [
              formatVnd(Number(value)),
              name === 'actual' ? 'Thực tế' : 'Dự báo',
            ]}
            labelFormatter={(label) => `Ngày ${formatShortDate(String(label))}`}
          />
          <Line
            activeDot={{
              fill: 'var(--surface)',
              r: 5,
              stroke: 'var(--primary)',
              strokeWidth: 3,
            }}
            connectNulls={false}
            dataKey="actual"
            dot={false}
            name="actual"
            stroke="var(--primary)"
            strokeWidth={3}
            type="monotone"
          />
          <Line
            activeDot={{
              fill: 'var(--surface)',
              r: 5,
              stroke: 'var(--forecast)',
              strokeWidth: 3,
            }}
            connectNulls={false}
            dataKey="predicted"
            dot={{ fill: 'var(--surface)', r: 3, strokeWidth: 2 }}
            name="predicted"
            stroke="var(--forecast)"
            strokeDasharray="7 6"
            strokeWidth={3}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const segmentMeta = {
  new: {
    label: 'Khách một đơn trong kỳ',
    color: 'var(--chart-3)',
  },
  returning: {
    label: 'Khách quay lại',
    color: 'var(--chart-2)',
  },
  vip: {
    label: 'Khách VIP',
    color: 'var(--primary)',
  },
}

export function CustomerSegmentChart({
  segments,
}: {
  segments: { new: number; returning: number; vip: number }
}) {
  const data = (Object.keys(segmentMeta) as Array<keyof typeof segmentMeta>).map(
    (key) => ({
      key,
      name: segmentMeta[key].label,
      value: segments[key],
      color: segmentMeta[key].color,
    }),
  )
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[minmax(13rem,0.8fr)_minmax(14rem,1.2fr)]">
      <div
        aria-label="Biểu đồ phân loại khách hàng"
        className="relative h-56"
        role="img"
      >
        <ResponsiveContainer height="100%" width="100%">
          <PieChart accessibilityLayer>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [
                `${formatInteger(Number(value))} khách`,
                'Số lượng',
              ]}
            />
            <Pie
              cx="50%"
              cy="50%"
              data={data}
              dataKey="value"
              innerRadius={65}
              nameKey="name"
              outerRadius={90}
              paddingAngle={3}
              stroke="var(--surface)"
              strokeWidth={3}
            >
              {data.map((item) => (
                <Cell fill={item.color} key={item.key} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">
              {formatInteger(total)}
            </p>
            <p className="text-xs font-bold text-[var(--text-muted)]">
              khách hàng
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-3">
        {data.map((item) => (
          <li
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"
            key={item.key}
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-sm font-bold text-[var(--text-muted)]">
              {item.name}
            </span>
            <span className="text-right">
              <strong className="block text-sm text-[var(--text-primary)]">
                {formatInteger(item.value)}
              </strong>
              <span className="text-xs text-[var(--text-muted)]">
                {total > 0
                  ? `${formatPercent((item.value / total) * 100)}%`
                  : '0%'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
