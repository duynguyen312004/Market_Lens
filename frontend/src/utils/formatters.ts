import type { Language } from '../i18n/LanguageContext'

function localeFor(language: Language) {
  return language === 'vi' ? 'vi-VN' : 'en-US'
}

function parseDateValue(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatVnd(value: number, language: Language = 'vi') {
  return new Intl.NumberFormat(localeFor(language), {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatInteger(value: number, language: Language = 'vi') {
  return new Intl.NumberFormat(localeFor(language), {
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDecimal(
  value: number,
  maximumFractionDigits = 2,
  language: Language = 'vi',
) {
  return new Intl.NumberFormat(localeFor(language), {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatDate(value: string, language: Language = 'vi') {
  const date = parseDateValue(value)
  if (!date) return value
  return new Intl.DateTimeFormat(localeFor(language), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatWeekday(value: string, language: Language = 'vi') {
  const date = parseDateValue(value)
  if (!date) return value
  return new Intl.DateTimeFormat(localeFor(language), {
    weekday: 'long',
  }).format(date)
}

export function formatDateTime(value: string, language: Language = 'vi') {
  const date = parseDateValue(value)
  if (!date) return value
  return new Intl.DateTimeFormat(localeFor(language), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatShortDate(value: string, language: Language = 'vi') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = parseDateValue(value)
    if (!date) return value
    return new Intl.DateTimeFormat(localeFor(language), {
      day: '2-digit',
      month: '2-digit',
    }).format(date)
  }
  if (language === 'vi') {
    const [, month, day] = value.split('-')
    return `${day}/${month}`
  }
  return new Intl.DateTimeFormat(localeFor(language), {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${value}T00:00:00`))
}

export function formatMonth(value: string, language: Language = 'vi') {
  const [year, month] = value.split('-')
  if (!year || !month || !Number.isFinite(Number(month))) return value
  if (language === 'vi') return `T${Number(month)}/${year}`
  return new Intl.DateTimeFormat(localeFor(language), {
    month: 'short',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, 1))
}

export function formatPercent(
  value: number,
  maximumFractionDigits = 1,
  showSign = false,
  language: Language = 'vi',
) {
  return new Intl.NumberFormat(localeFor(language), {
    maximumFractionDigits,
    minimumFractionDigits: 0,
    signDisplay: showSign ? 'exceptZero' : 'auto',
  }).format(value)
}

export function formatCompactVnd(value: number, language: Language = 'vi') {
  return new Intl.NumberFormat(localeFor(language), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatFileSize(bytes: number, language: Language = 'vi') {
  const format = (value: number) =>
    new Intl.NumberFormat(localeFor(language), {
      maximumFractionDigits: 1,
    }).format(value)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${format(bytes / 1024)} KB`
  return `${format(bytes / (1024 * 1024))} MB`
}
