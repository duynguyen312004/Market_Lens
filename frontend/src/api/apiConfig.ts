type ApiEnvironment = {
  VITE_API_BASE_URL?: string
  VITE_API_ORIGIN?: string
}

type ApiResolutionOptions = {
  production?: boolean
}

export function resolveApiBaseUrl(
  environment: ApiEnvironment,
  options: ApiResolutionOptions = {},
) {
  const explicitBaseUrl = environment.VITE_API_BASE_URL?.trim()
  if (explicitBaseUrl) {
    return validateResolvedUrl(
      explicitBaseUrl.replace(/\/+$/, ''),
      options.production,
    )
  }

  const apiOrigin = environment.VITE_API_ORIGIN?.trim()
  if (apiOrigin) {
    return validateResolvedUrl(
      `${apiOrigin.replace(/\/+$/, '')}/api/v1`,
      options.production,
    )
  }

  if (options.production) {
    throw new Error(
      'VITE_API_BASE_URL or VITE_API_ORIGIN is required in production.',
    )
  }
  return 'http://localhost:8000/api/v1'
}

function validateResolvedUrl(value: string, production = false) {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('The configured API URL is invalid.')
  }
  if (
    production &&
    (parsed.protocol !== 'https:' ||
      ['localhost', '127.0.0.1'].includes(parsed.hostname))
  ) {
    throw new Error('The production API URL must use public HTTPS.')
  }
  return value
}
