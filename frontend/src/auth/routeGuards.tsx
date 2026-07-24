import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './useAuth'

function AuthLoadingScreen() {
  return (
    <main
      className="grid min-h-[100dvh] place-items-center px-5"
      role="status"
    >
      <div className="text-center">
        <div className="mx-auto size-9 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--primary)] motion-reduce:animate-none" />
        <p className="mt-4 text-sm font-medium text-[var(--text-muted)]">
          Đang kiểm tra phiên đăng nhập...
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

  if (loading) return <AuthLoadingScreen />
  if (user) return <Navigate replace to="/dashboard" />

  return <Outlet />
}
