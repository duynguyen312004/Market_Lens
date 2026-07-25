import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
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
  WeekdayRevenueMetric,
} from '../../api/analysesApi'
import type { ForecastChartPoint } from '../../features/forecast/forecastPresentation'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  formatCompactVnd,
  formatInteger,
  formatMonth,
  formatPercent,
  formatShortDate,
  formatVnd,
} from '../../utils/formatters'

const darkTooltipStyle = {
  background: 'rgba(15, 23, 42, 0.92)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '12px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
  color: '#ffffff',
  fontSize: '13px',
  padding: '10px 14px',
}

const axisTick = {
  fill: '#64748b',
  fontSize: 12,
  fontWeight: 600,
}

export function RevenueLineChart({
  data,
}: {
  data: Array<{ date: string; revenue: number }>
}) {
  const { language, t } = useLanguage()

  return (
    <div aria-label={t('analysis.dailyChart')} className="h-80 w-full" role="img">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart
          accessibilityLayer
          data={data}
          margin={{ bottom: 4, left: 0, right: 12, top: 12 }}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 4" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={28}
            tick={axisTick}
            tickFormatter={(value) => formatShortDate(value, language)}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={axisTick}
            tickFormatter={(value) => formatCompactVnd(value, language)}
            tickLine={false}
            width={62}
          />
          <Tooltip
            contentStyle={darkTooltipStyle}
            cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
            formatter={(value) => [formatVnd(Number(value), language), t('dashboard.totalRevenue')]}
            labelFormatter={(label) => `${t('common.date')}: ${formatShortDate(String(label), language)}`}
          />
          <Area
            activeDot={{
              fill: '#ffffff',
              r: 6,
              stroke: '#4f46e5',
              strokeWidth: 3,
            }}
            dataKey="revenue"
            fill="url(#revenueGradient)"
            isAnimationActive={false}
            name={t('dashboard.totalRevenue')}
            stroke="#4f46e5"
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MonthlyRevenueChart({
  data,
}: {
  data: Array<{ month: string; revenue: number }>
}) {
  const { language, t } = useLanguage()

  return (
    <div aria-label={t('analysis.monthlyChart')} className="h-72 w-full" role="img">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ bottom: 4, left: 0, right: 12, top: 12 }}
        >
          <defs>
            <linearGradient id="monthlyGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 4" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="month"
            minTickGap={28}
            tick={axisTick}
            tickFormatter={(value) => formatMonth(value, language)}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={axisTick}
            tickFormatter={(value) => formatCompactVnd(value, language)}
            tickLine={false}
            width={62}
          />
          <Tooltip
            contentStyle={darkTooltipStyle}
            cursor={{ fill: 'rgba(238, 242, 255, 0.6)' }}
            formatter={(value) => [formatVnd(Number(value), language), t('dashboard.totalRevenue')]}
            labelFormatter={(label) => formatMonth(String(label), language)}
          />
          <Bar
            dataKey="revenue"
            fill="url(#monthlyGradient)"
            isAnimationActive={false}
            name={t('dashboard.totalRevenue')}
            radius={[8, 8, 2, 2]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function WeekdayRevenueChart({
  data,
}: {
  data: WeekdayRevenueMetric[]
}) {
  const { language, t } = useLanguage()

  return (
    <div
      aria-label={t('sales.weekdayRevenue')}
      className="h-72 w-full"
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ bottom: 4, left: 0, right: 12, top: 12 }}
        >
          <CartesianGrid
            stroke="#f1f5f9"
            strokeDasharray="3 4"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="weekday"
            tick={axisTick}
            tickFormatter={(value) => t(`weekday.${value}`)}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={axisTick}
            tickFormatter={(value) => formatCompactVnd(value, language)}
            tickLine={false}
            width={62}
          />
          <Tooltip
            contentStyle={darkTooltipStyle}
            cursor={{ fill: 'rgba(238, 242, 255, 0.6)' }}
            formatter={(value) => [
              formatVnd(Number(value), language),
              t('dashboard.totalRevenue'),
            ]}
            labelFormatter={(label) => t(`weekday.${String(label)}`)}
          />
          <Bar
            dataKey="revenue"
            fill="#1f64d8"
            isAnimationActive={false}
            name={t('dashboard.totalRevenue')}
            radius={[8, 8, 2, 2]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryRevenueChart({ data }: { data: CategoryMetric[] }) {
  const { language, t } = useLanguage()

  return (
    <div aria-label={t('analysis.categoryChart')} className="h-80 w-full" role="img">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ bottom: 4, left: 8, right: 16, top: 4 }}
        >
          <defs>
            <linearGradient id="categoryGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <CartesianGrid horizontal={false} stroke="#f1f5f9" strokeDasharray="3 4" />
          <XAxis
            axisLine={false}
            tick={axisTick}
            tickFormatter={(value) => formatCompactVnd(value, language)}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="category"
            tick={axisTick}
            tickLine={false}
            type="category"
            width={110}
          />
          <Tooltip
            contentStyle={darkTooltipStyle}
            cursor={{ fill: 'rgba(238, 242, 255, 0.6)' }}
            formatter={(value) => [formatVnd(Number(value), language), t('dashboard.totalRevenue')]}
          />
          <Bar
            dataKey="revenue"
            fill="url(#categoryGradient)"
            isAnimationActive={false}
            name={t('dashboard.totalRevenue')}
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProductRevenueChart({ data }: { data: ProductMetric[] }) {
  const { language, t } = useLanguage()

  return (
    <div aria-label={t('analysis.productChart')} className="h-80 w-full" role="img">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ bottom: 4, left: 8, right: 16, top: 4 }}
        >
          <defs>
            <linearGradient id="productGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <CartesianGrid horizontal={false} stroke="#f1f5f9" strokeDasharray="3 4" />
          <XAxis
            axisLine={false}
            tick={axisTick}
            tickFormatter={(value) => formatCompactVnd(value, language)}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="product_name"
            tick={axisTick}
            tickLine={false}
            type="category"
            width={125}
          />
          <Tooltip
            contentStyle={darkTooltipStyle}
            cursor={{ fill: 'rgba(238, 242, 255, 0.6)' }}
            formatter={(value) => [formatVnd(Number(value), language), t('dashboard.totalRevenue')]}
          />
          <Bar
            dataKey="revenue"
            fill="url(#productGradient)"
            isAnimationActive={false}
            name={t('dashboard.totalRevenue')}
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ForecastRevenueChart({ data }: { data: ForecastChartPoint[] }) {
  const { language, t } = useLanguage()
  return (
    <div aria-label={t('analysis.forecastChart')} className="h-96 w-full" role="img">
      <ResponsiveContainer height="100%" width="100%">
        <ComposedChart
          accessibilityLayer
          data={data}
          margin={{ bottom: 4, left: 0, right: 12, top: 12 }}
        >
          <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 4" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={28}
            tick={axisTick}
            tickFormatter={(value) => formatShortDate(value, language)}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={axisTick}
            tickFormatter={(value) => formatCompactVnd(value, language)}
            tickLine={false}
            width={62}
          />
          <Tooltip
            contentStyle={darkTooltipStyle}
            cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
            formatter={(value, name) => {
              if (name === 'interval' && Array.isArray(value)) {
                return [
                  `${formatVnd(Number(value[0]), language)} – ${formatVnd(
                    Number(value[1]),
                    language,
                  )}`,
                  t('forecast.empiricalInterval'),
                ]
              }
              return [
                formatVnd(Number(value), language),
                name === 'actual'
                  ? t('common.actual')
                  : t('common.predicted'),
              ]
            }}
            labelFormatter={(label) => `${t('common.date')}: ${formatShortDate(String(label), language)}`}
          />
          <Area
            connectNulls={false}
            dataKey="interval"
            fill="#fef3c7"
            fillOpacity={0.65}
            isAnimationActive={false}
            name="interval"
            stroke="#fcd34d"
            strokeWidth={1}
            type="monotone"
          />
          <Line
            activeDot={{
              fill: '#ffffff',
              r: 6,
              stroke: '#4f46e5',
              strokeWidth: 3,
            }}
            connectNulls={false}
            dataKey="actual"
            dot={false}
            isAnimationActive={false}
            name="actual"
            stroke="#4f46e5"
            strokeWidth={3}
            type="monotone"
          />
          <Line
            activeDot={{
              fill: '#ffffff',
              r: 6,
              stroke: '#f59e0b',
              strokeWidth: 3,
            }}
            connectNulls={false}
            dataKey="predicted"
            dot={{ fill: '#ffffff', r: 4, stroke: '#f59e0b', strokeWidth: 2 }}
            isAnimationActive={false}
            name="predicted"
            stroke="#f59e0b"
            strokeDasharray="6 6"
            strokeWidth={3}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CustomerSegmentChart({
  segments,
}: {
  segments: { new: number; returning: number; vip: number }
}) {
  const { language, t } = useLanguage()

  const segmentMeta = {
    new: {
      label: t('customers.new'),
      color: '#10b981',
    },
    returning: {
      label: t('customers.returning'),
      color: '#06b6d4',
    },
    vip: {
      label: t('customers.vip'),
      color: '#4f46e5',
    },
  }

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
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(13rem,0.8fr)_minmax(14rem,1.2fr)]">
      <div aria-label={t('analysis.segmentChart')} className="relative h-56" role="img">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart accessibilityLayer>
            <Tooltip
              contentStyle={darkTooltipStyle}
              formatter={(value) => [`${formatInteger(Number(value), language)}`, t('dashboard.totalCustomers')]}
            />
            <Pie
              cx="50%"
              cy="50%"
              data={data}
              dataKey="value"
              innerRadius={65}
              isAnimationActive={false}
              nameKey="name"
              outerRadius={92}
              paddingAngle={4}
              stroke="#ffffff"
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
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatInteger(total, language)}
            </p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('dashboard.totalCustomers')}
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-3">
        {data.map((item) => (
          <li
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-2 hover:bg-slate-50 transition"
            key={item.key}
          >
            <span
              aria-hidden="true"
              className="size-3 rounded-full shadow-xs"
              style={{ background: item.color }}
            />
            <span className="break-words text-sm font-semibold text-slate-700">
              {item.name}
            </span>
            <span className="text-right">
              <strong className="block text-sm font-extrabold text-slate-900">
                {formatInteger(item.value, language)}
              </strong>
              <span className="text-xs font-semibold text-slate-500">
                {total > 0
                  ? `${formatPercent((item.value / total) * 100, 1, false, language)}%`
                  : '0%'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
