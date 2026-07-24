import {
  ChartBarIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  CloudArrowUpIcon,
  FileTextIcon,
  GaugeIcon,
  SignOutIcon,
  TrendUpIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { getAuthErrorMessage } from '../auth/authErrors'
import { useAuth } from '../auth/useAuth'

const navigation = [
  { label: 'Dashboard', path: '/dashboard', icon: GaugeIcon },
  { label: 'Upload dữ liệu', path: '/upload', icon: CloudArrowUpIcon },
  { label: 'Sales Analytics', path: '/sales', icon: ChartBarIcon },
  { label: 'Customer Analytics', path: '/customers', icon: UsersThreeIcon },
  { label: 'Forecast', path: '/forecast', icon: TrendUpIcon },
  { label: 'Báo cáo', path: '/report', icon: FileTextIcon },
  { label: 'Lịch sử', path: '/history', icon: ClockCounterClockwiseIcon },
  { label: 'Hồ sơ', path: '/profile', icon: UserCircleIcon },
]

export function AppShell() {
  const { signOut, user } = useAuth()
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const displayName =
    typeof user?.user_metadata.display_name === 'string'
      ? user.user_metadata.display_name
      : 'Chủ shop'

  async function handleSignOut() {
    setIsLoggingOut(true)
    setLogoutError(null)

    try {
      await signOut()
    } catch (error) {
      setLogoutError(getAuthErrorMessage(error))
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--page)] lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="app-sidebar hidden border-r border-white/8 bg-[#102b61] text-white lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-white/8 px-6">
          <span className="grid size-10 place-items-center rounded-xl bg-white/12">
            <ChartLineUpIcon aria-hidden="true" size={23} weight="bold" />
          </span>
          <span className="text-lg font-bold tracking-[-0.025em]">
            MarketLens
          </span>
        </div>

        <nav aria-label="Điều hướng chính" className="flex-1 px-3 py-6">
          <ul className="space-y-1">
            {navigation.map(({ icon: Icon, label, path }) => (
              <li key={path}>
                <NavLink
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                      isActive
                        ? 'bg-white text-[#102b61]'
                        : 'text-blue-100/78 hover:bg-white/8 hover:text-white',
                    ].join(' ')
                  }
                  to={path}
                >
                  <Icon aria-hidden="true" size={20} weight="duotone" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/8 p-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-bold">{displayName}</p>
            <p className="mt-1 truncate text-xs text-blue-200/70">
              {user?.email}
            </p>
          </div>
          {logoutError && (
            <p className="mb-3 px-2 text-xs leading-5 text-red-200" role="alert">
              {logoutError}
            </p>
          )}
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-100/78 transition hover:bg-white/8 hover:text-white disabled:opacity-55"
            disabled={isLoggingOut}
            onClick={handleSignOut}
            type="button"
          >
            <SignOutIcon aria-hidden="true" size={20} />
            {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>
      </aside>

      <div className="app-content min-w-0">
        <header className="app-mobile-header border-b border-[var(--border)] bg-[var(--surface)] lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <ChartLineUpIcon
                aria-hidden="true"
                className="text-[var(--primary)]"
                size={24}
                weight="bold"
              />
              MarketLens
            </div>
            <button
              aria-label="Đăng xuất"
              className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-muted)]"
              disabled={isLoggingOut}
              onClick={handleSignOut}
              type="button"
            >
              <SignOutIcon aria-hidden="true" size={20} />
            </button>
          </div>
          <nav
            aria-label="Điều hướng chính trên di động"
            className="overflow-x-auto px-3 pb-3"
          >
            <ul className="flex min-w-max gap-2">
              {navigation.map(({ label, path }) => (
                <li key={path}>
                  <NavLink
                    className={({ isActive }) =>
                      [
                        'block rounded-lg px-3 py-2 text-sm font-semibold',
                        isActive
                          ? 'bg-[var(--primary)] text-[var(--primary-contrast)]'
                          : 'bg-[var(--page)] text-[var(--text-muted)]',
                      ].join(' ')
                    }
                    to={path}
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          {logoutError && (
            <p
              className="mx-4 mb-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--danger)]"
              role="alert"
            >
              {logoutError}
            </p>
          )}
        </header>

        <Outlet />
      </div>
    </div>
  )
}
