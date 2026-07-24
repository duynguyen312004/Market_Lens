type ApiEnvironment = {
  VITE_API_BASE_URL?: string
  VITE_API_ORIGIN?: string
}

export function resolveApiBaseUrl(environment: ApiEnvironment) {
  const explicitBaseUrl = environment.VITE_API_BASE_URL?.trim()
  if (explicitBaseUrl) return explicitBaseUrl.replace(/\/+$/, '')

  const apiOrigin = environment.VITE_API_ORIGIN?.trim()
  if (apiOrigin) return `${apiOrigin.replace(/\/+$/, '')}/api/v1`

  return 'http://localhost:8000/api/v1'
}
