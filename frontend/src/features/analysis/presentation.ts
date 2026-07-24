export function formatAnalysisWarning(warning: string) {
  const labels: Record<string, string> = {
    INSUFFICIENT_HISTORY:
      'Dữ liệu dưới 14 ngày nên chưa đủ điều kiện tạo dự báo.',
    NO_COMPARABLE_PREVIOUS_REVENUE:
      'Không có doanh thu ở 7 ngày trước để tính tỷ lệ tăng trưởng.',
  }
  return labels[warning] ?? warning
}

export function getSegmentLabel(segment: 'new' | 'returning' | 'vip') {
  const labels = {
    new: 'Khách một đơn',
    returning: 'Quay lại',
    vip: 'VIP',
  }
  return labels[segment]
}
