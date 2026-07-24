export function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatShortDate(value: string) {
  const [, month, day] = value.split('-')
  return `${day}/${month}`
}

export function formatMonth(value: string) {
  const [year, month] = value.split('-')
  return `T${Number(month)}/${year}`
}

export function formatPercent(
  value: number,
  maximumFractionDigits = 1,
  showSign = false,
) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
    signDisplay: showSign ? 'exceptZero' : 'auto',
  }).format(value)
}

export function formatCompactVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
