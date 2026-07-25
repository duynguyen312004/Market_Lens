import axios from 'axios'

import {
  translate,
  translations,
  type Language,
} from '../i18n/LanguageContext'

export type ApiErrorDetails = {
  errors?: Array<{
    row?: number
    column?: string
    reason: string
    identifier?: string
    file_name?: string
    files?: string[]
  }>
  total_error_count?: number
  [key: string]: unknown
}

export type ParsedApiError = {
  code: string
  message: string
  details: ApiErrorDetails | null
  requestId: string | null
}

function localizedApiMessage(
  code: string,
  fallback: string,
  language: Language,
) {
  const key = `api.${code}`
  return translations[key]
    ? translate(language, key)
    : language === 'en'
      ? fallback
      : translate(language, 'api.UNKNOWN_ERROR')
}

export function parseApiError(
  error: unknown,
  language: Language = 'en',
): ParsedApiError {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data?.error
    const responseRequestId = error.response?.headers?.['x-request-id']
    const requestId =
      typeof responseRequestId === 'string' ? responseRequestId : null
    if (apiError?.code && apiError?.message) {
      return {
        code: apiError.code,
        message: localizedApiMessage(
          apiError.code,
          apiError.message,
          language,
        ),
        details: apiError.details ?? null,
        requestId,
      }
    }

    if (error.code === 'ECONNABORTED') {
      return {
        code: 'REQUEST_TIMEOUT',
        message: translate(language, 'api.REQUEST_TIMEOUT'),
        details: null,
        requestId,
      }
    }

    if (!error.response) {
      return {
        code: 'NETWORK_ERROR',
        message: translate(language, 'api.NETWORK_ERROR'),
        details: null,
        requestId: null,
      }
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: translate(language, 'api.UNKNOWN_ERROR'),
    details: null,
    requestId: null,
  }
}
