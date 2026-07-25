import {
  ChartBarIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  CloudArrowUpIcon,
  FileTextIcon,
  FilesIcon,
  GaugeIcon,
  GlobeIcon,
  SignOutIcon,
  TrendUpIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import {
  useCallback,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { NavLink, Outlet } from 'react-router'

import { getAuthErrorMessage } from '../auth/authErrors'
import { useAuth } from '../auth/useAuth'
import {
  ActiveAnalysisProvider,
} from '../features/analysis/ActiveAnalysisContext'
import { useCurrentAnalysis } from '../features/analysis/analysisQueries'
import {
  getAnalysisFileLabel,
  getAnalysisSourceNames,
} from '../features/analysis/presentation'
import { useLanguage } from '../i18n/LanguageContext'
import { formatInteger } from '../utils/formatters'
import { AnalysisSelectorDialog } from './AnalysisSelectorDialog'
import { LogoutConfirmDialog } from './LogoutConfirmDialog'

const navigationConfig = [
  { translationKey: 'nav.dashboard', path: '/dashboard', icon: GaugeIcon },
  { translationKey: 'nav.upload', path: '/upload', icon: CloudArrowUpIcon },
  { translationKey: 'nav.sales', path: '/sales', icon: ChartBarIcon },
  { translationKey: 'nav.customers', path: '/customers', icon: UsersThreeIcon },
  { translationKey: 'nav.forecast', path: '/forecast', icon: TrendUpIcon },
  { translationKey: 'nav.report', path: '/report', icon: FileTextIcon },
  { translationKey: 'nav.history', path: '/history', icon: ClockCounterClockwiseIcon },
  { translationKey: 'nav.profile', path: '/profile', icon: UserCircleIcon },
]

export function AppShell() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <ActiveAnalysisProvider userId={user.id}>
      <AppShellContent />
    </ActiveAnalysisProvider>
  )
}

function AppShellContent() {
  const { signOut, user } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { analysis } = useCurrentAnalysis()

  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const selectorTriggerRef = useRef<HTMLButtonElement | null>(null)

  const displayName =
    typeof user?.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : t('shell.shopOwner')

  async function handleSignOut() {
    setIsLoggingOut(true)
    setLogoutError(null)

    try {
      await signOut()
    } catch (error) {
      setLogoutError(getAuthErrorMessage(error, language))
      setIsLoggingOut(false)
      setIsLogoutDialogOpen(false)
    }
  }

  function openSelector(event: MouseEvent<HTMLButtonElement>) {
    selectorTriggerRef.current = event.currentTarget
    setIsSelectorOpen(true)
  }

  const closeSelector = useCallback(() => {
    setIsSelectorOpen(false)
    queueMicrotask(() => selectorTriggerRef.current?.focus())
  }, [])

  return (
    <div className="min-h-[100dvh] bg-[var(--page)] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="app-sidebar app-sidebar-surface hidden text-white lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:flex-col">
        {/* Brand Header */}
        <div className="flex h-[68px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-[#2f74e8] text-white">
              <ChartLineUpIcon aria-hidden="true" size={20} weight="bold" />
            </span>
            <span className="text-lg font-extrabold tracking-[-0.025em] text-white">
              Market<span className="text-[#7eb0ff]">Lens</span>
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label={t('common.primaryNavigation')} className="flex-1 overflow-y-auto px-3 py-5">
          <ul className="space-y-1">
            {navigationConfig.map(({ icon: Icon, path, translationKey }) => (
              <li key={path}>
                <NavLink
                  className={({ isActive }) =>
                    [
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors',
                      isActive
                        ? 'bg-[#2368d7] text-white'
                        : 'text-slate-300 hover:bg-white/7 hover:text-white',
                    ].join(' ')
                  }
                  to={path}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        aria-hidden="true"
                        className={
                          isActive
                            ? 'text-white'
                            : 'text-slate-500 group-hover:text-slate-200'
                        }
                        size={18}
                        weight={isActive ? 'bold' : 'regular'}
                      />
                      {t(translationKey)}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Active File Pill & Language Switcher & Profile Footer */}
        <div className="space-y-3 border-t border-white/10 p-4">
          {/* Active File Pill */}
          {analysis && (
            <button
              className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-100 transition hover:border-white/20 hover:bg-white/10"
              onClick={openSelector}
              type="button"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
              <div className="min-w-0 flex-1">
                <p
                  className="break-all font-semibold leading-5"
                  title={getAnalysisSourceNames(analysis)}
                >
                  {getAnalysisFileLabel(analysis, language)}
                </p>
                <p className="break-words text-[11px] leading-4 text-slate-400">
                  {t('shell.fileRows', {
                    count: formatInteger(analysis.row_count, language),
                  })}
                </p>
              </div>
              <FilesIcon
                aria-hidden="true"
                className="shrink-0 text-slate-400"
                size={17}
              />
            </button>
          )}

          {/* Language Switcher Button */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-1 text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 px-2 py-1 text-slate-400">
              <GlobeIcon size={15} weight="bold" />
              {t('common.language')}:
            </span>
            <div className="flex items-center gap-1">
              <button
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  language === 'en'
                    ? 'bg-white/12 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setLanguage('en')}
                type="button"
              >
                EN
              </button>
              <button
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  language === 'vi'
                    ? 'bg-white/12 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setLanguage('vi')}
                type="button"
              >
                VI
              </button>
            </div>
          </div>

          {/* Profile & Signout */}
          <div className="flex items-center justify-between pt-1">
            <div className="min-w-0 pr-2">
              <p className="break-words text-sm font-bold leading-5 text-white">{displayName}</p>
              <p className="break-all text-xs leading-4 text-slate-400">{user?.email}</p>
              {logoutError && (
                <p className="break-words text-xs font-semibold leading-4 text-rose-600">{logoutError}</p>
              )}
            </div>
            <button
              aria-label={t('nav.signOut')}
              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/8 hover:text-white"
              disabled={isLoggingOut}
              onClick={() => setIsLogoutDialogOpen(true)}
              type="button"
            >
              <SignOutIcon aria-hidden="true" size={19} weight="bold" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-content min-w-0">
        {/* Mobile Header */}
        <header className="app-mobile-header sticky top-0 z-30 border-b border-slate-800 bg-[#101a2b] text-white lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2.5 text-lg font-extrabold text-white">
              <span className="grid size-8 place-items-center rounded-lg bg-[#2f74e8] text-white">
                <ChartLineUpIcon aria-hidden="true" size={18} weight="bold" />
              </span>
              <span>Market<span className="text-[#7eb0ff]">Lens</span></span>
            </div>

            {/* Mobile Language Switcher & Logout */}
            <div className="flex items-center gap-2">
              {analysis && (
                <button
                  aria-label={t('selector.open')}
                  className="grid size-8 place-items-center rounded-md border border-white/15 bg-white/7 text-slate-200"
                  onClick={openSelector}
                  type="button"
                >
                  <FilesIcon size={16} weight="bold" />
                </button>
              )}
              <button
                className="flex items-center gap-1 rounded-md border border-white/15 bg-white/7 px-2.5 py-1.5 text-xs font-bold text-slate-200"
                onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
                type="button"
              >
                <GlobeIcon size={14} />
                {language.toUpperCase()}
              </button>
              <button
                aria-label={t('nav.signOut')}
                className="rounded-md border border-white/15 p-2 text-slate-300"
                disabled={isLoggingOut}
                onClick={() => setIsLogoutDialogOpen(true)}
                type="button"
              >
                <SignOutIcon aria-hidden="true" size={18} />
              </button>
            </div>
          </div>

          {/* Mobile Navigation Horizontal Scroll Bar */}
          <nav aria-label={t('common.mobileNavigation')} className="overflow-x-auto px-3 pb-3">
            <ul className="flex min-w-max gap-1.5">
              {navigationConfig.map(({ path, translationKey }) => (
                <li key={path}>
                  <NavLink
                    className={({ isActive }) =>
                      [
                        'block rounded-md px-3 py-1.5 text-xs font-bold transition-colors',
                        isActive
                          ? 'bg-[#2368d7] text-white'
                          : 'bg-white/7 text-slate-300 hover:bg-white/12',
                      ].join(' ')
                    }
                    to={path}
                  >
                    {t(translationKey)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        {/* Dynamic Page Router Outlet */}
        <Outlet />
      </div>

      {/* Logout Confirmation Dialog */}
      {isLogoutDialogOpen && (
        <LogoutConfirmDialog
          isLoggingOut={isLoggingOut}
          onCancel={() => setIsLogoutDialogOpen(false)}
          onConfirm={() => void handleSignOut()}
        />
      )}
      {isSelectorOpen && (
        <AnalysisSelectorDialog
          onClose={closeSelector}
        />
      )}
    </div>
  )
}
