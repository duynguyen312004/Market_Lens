import { Navigate, Outlet, useLocation } from 'react-router'

import { getSafeReturnPath } from './authNavigation'
import { useAuth } from './useAuth'
import { useLanguage } from '../i18n/LanguageContext'

function AuthLoadingScreen() {
  const { t } = useLanguage()
  return (
    <main
      className="grid min-h-[100dvh] place-items-center px-5"
      role="status"
    >
      <div className="text-center">
        <div className="mx-auto size-9 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--primary)] motion-reduce:animate-none" />
        <p className="mt-4 text-sm font-medium text-[var(--text-muted)]">
          {t('common.checkingSession')}
        </p>
      </div>
    </main>
  )
}

export function ProtectedRoute() {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) return <AuthLoadingScreen />

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { loading, user } = useAuth()
  const location = useLocation()
  const state = location.state as {
    from?: {
      pathname?: string
    }
  } | null

  if (loading) return <AuthLoadingScreen />
  if (user) {
    const returnPath = getSafeReturnPath(
      state?.from?.pathname ?? null,
    )
    return <Navigate replace to={returnPath ?? '/dashboard'} />
  }

  return <Outlet />
}
