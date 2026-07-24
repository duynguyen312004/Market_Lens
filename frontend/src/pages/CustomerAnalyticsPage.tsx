import {
  CrownIcon,
  SparkleIcon,
  UserPlusIcon,
  UsersThreeIcon,
  UserSwitchIcon,
} from '@phosphor-icons/react'

import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import {
  AnalysisEmptyState,
  AnalysisErrorState,
  AnalysisLoadingState,
} from '../components/analytics/AnalysisStates'
import { CustomerSegmentChart } from '../components/analytics/Charts'
import { MetricCard } from '../components/analytics/MetricCard'
import { useCurrentAnalysis } from '../features/analysis/analysisQueries'
import { getSegmentLabel } from '../features/analysis/presentation'
import {
  formatDate,
  formatInteger,
  formatVnd,
} from '../utils/formatters'

export function CustomerAnalyticsPage() {
  const { analysis, error, isEmpty, isLoading, retry } = useCurrentAnalysis()

  if (isLoading) return <AnalysisLoadingState />
  if (error) return <AnalysisErrorState error={error} onRetry={retry} />
  if (isEmpty || !analysis) {
    return <AnalysisEmptyState title="Chưa có dữ liệu khách hàng" />
  }

  const { customers, summary } = analysis

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <AnalysisHeader
          analysis={analysis}
          description="Nhận diện nhóm khách hàng theo doanh thu và tần suất mua trong kỳ dữ liệu."
          title="Customer Analytics"
        />

        <section
          aria-label="Tóm tắt khách hàng"
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            icon={UsersThreeIcon}
            label="Tổng khách hàng"
            value={formatInteger(summary.total_customers)}
          />
          <MetricCard
            helper="Có đúng một đơn completed trong kỳ."
            icon={UserPlusIcon}
            label="Khách một đơn trong kỳ"
            value={formatInteger(customers.segments.new)}
          />
          <MetricCard
            helper="Không thuộc VIP và có từ hai đơn trở lên."
            icon={UserSwitchIcon}
            label="Khách quay lại"
            value={formatInteger(customers.segments.returning)}
          />
          <MetricCard
            helper="Top 10% khách hàng theo doanh thu trong kỳ."
            icon={CrownIcon}
            label="Khách VIP"
            value={formatInteger(customers.segments.vip)}
          />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(22rem,0.85fr)_minmax(0,1.15fr)]">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
              Cơ cấu khách hàng
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
              VIP được gán trước, sau đó mới phân loại quay lại và một đơn.
            </p>
            <div className="mt-3">
              <CustomerSegmentChart segments={customers.segments} />
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-start gap-3 bg-[var(--primary-soft)] p-5 sm:p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--primary)]">
                <SparkleIcon aria-hidden="true" size={23} weight="duotone" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
                    Khách hàng tiềm năng
                  </h2>
                  <span className="rounded-lg bg-[var(--surface)] px-2.5 py-1 text-xs font-extrabold text-[var(--primary)]">
                    {formatInteger(customers.potential_count)} khách
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  Tiềm năng theo doanh thu và tần suất trong kỳ. Danh sách không
                  phải dự báo hành vi mua tương lai.
                </p>
              </div>
            </div>
            {customers.potential_customers.length > 0 ? (
              <div className="overflow-x-auto p-5 sm:p-6">
                <table className="w-full min-w-[42rem] text-left text-sm">
                  <thead className="text-[var(--text-muted)]">
                    <tr>
                      <th className="pb-3 pr-4 font-bold">Khách hàng</th>
                      <th className="pb-3 pr-4 text-right font-bold">Số đơn</th>
                      <th className="pb-3 pr-4 text-right font-bold">
                        Mua gần nhất
                      </th>
                      <th className="pb-3 text-right font-bold">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.potential_customers.map((customer) => (
                      <tr
                        className="border-t border-[var(--border)]"
                        key={customer.customer_id}
                      >
                        <td className="py-3.5 pr-4">
                          <p className="font-extrabold text-[var(--text-primary)]">
                            {customer.customer_name}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                            {formatInteger(customer.quantity)} sản phẩm
                          </p>
                        </td>
                        <td className="py-3.5 pr-4 text-right font-bold text-[var(--text-muted)]">
                          {formatInteger(customer.order_count)}
                        </td>
                        <td className="py-3.5 pr-4 text-right text-[var(--text-muted)]">
                          {formatDate(customer.last_order_date)}
                        </td>
                        <td className="py-3.5 text-right font-extrabold text-[var(--text-primary)]">
                          {formatVnd(customer.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-10 text-center sm:px-6">
                <p className="font-extrabold text-[var(--text-primary)]">
                  Chưa có khách hàng phù hợp rule tiềm năng
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Cần khách không thuộc VIP và có ít nhất hai đơn completed.
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
            Top khách hàng theo doanh thu
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            Số đơn, số lượng đã mua và tổng chi tiêu từ completed orders.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[50rem] text-left text-sm">
              <thead className="text-[var(--text-muted)]">
                <tr>
                  <th className="pb-3 pr-4 font-bold">Khách hàng</th>
                  <th className="pb-3 pr-4 font-bold">Phân loại</th>
                  <th className="pb-3 pr-4 text-right font-bold">Số đơn</th>
                  <th className="pb-3 pr-4 text-right font-bold">Số lượng</th>
                  <th className="pb-3 pr-4 text-right font-bold">
                    Đơn gần nhất
                  </th>
                  <th className="pb-3 text-right font-bold">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {customers.top_customers.map((customer) => (
                  <tr
                    className="border-t border-[var(--border)]"
                    key={customer.customer_id}
                  >
                    <td className="py-3.5 pr-4 font-extrabold text-[var(--text-primary)]">
                      {customer.customer_name}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-extrabold ${getSegmentClass(customer.segment)}`}
                      >
                        {getSegmentLabel(customer.segment)}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right text-[var(--text-muted)]">
                      {formatInteger(customer.order_count)}
                    </td>
                    <td className="py-3.5 pr-4 text-right text-[var(--text-muted)]">
                      {formatInteger(customer.quantity)}
                    </td>
                    <td className="py-3.5 pr-4 text-right text-[var(--text-muted)]">
                      {formatDate(customer.last_order_date)}
                    </td>
                    <td className="py-3.5 text-right font-extrabold text-[var(--text-primary)]">
                      {formatVnd(customer.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function getSegmentClass(segment: 'new' | 'returning' | 'vip') {
  if (segment === 'vip') {
    return 'bg-[var(--primary)] text-[var(--primary-contrast)]'
  }
  if (segment === 'returning') {
    return 'bg-[var(--primary-soft)] text-[var(--primary)]'
  }
  return 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'
}
