export const SESSION_EXPIRED_QUERY_KEY = 'sessionExpired'
export const RETURN_PATH_QUERY_KEY = 'from'

export function getSafeReturnPath(value: string | null) {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    value.startsWith('/login')
  ) {
    return null
  }
  return value
}

export function buildSessionExpiredLoginUrl(
  pathname: string,
  search: string,
) {
  const params = new URLSearchParams({
    [SESSION_EXPIRED_QUERY_KEY]: '1',
  })
  const returnPath = getSafeReturnPath(`${pathname}${search}`)
  if (returnPath) params.set(RETURN_PATH_QUERY_KEY, returnPath)
  return `/login?${params.toString()}`
}
