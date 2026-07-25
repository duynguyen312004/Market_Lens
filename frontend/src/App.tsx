import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { ProtectedRoute, PublicOnlyRoute } from './auth/routeGuards'
import { useLanguage } from './i18n/LanguageContext'

const AppShell = lazy(() =>
  import('./components/AppShell').then((module) => ({
    default: module.AppShell,
  })),
)
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)
const UploadPage = lazy(() =>
  import('./pages/UploadPage').then((module) => ({
    default: module.UploadPage,
  })),
)
const FoundationPage = lazy(() =>
  import('./pages/FoundationPage').then((module) => ({
    default: module.FoundationPage,
  })),
)
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
)
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  })),
)
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
)
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  })),
)
const SalesAnalyticsPage = lazy(() =>
  import('./pages/SalesAnalyticsPage').then((module) => ({
    default: module.SalesAnalyticsPage,
  })),
)
const CustomerAnalyticsPage = lazy(() =>
  import('./pages/CustomerAnalyticsPage').then((module) => ({
    default: module.CustomerAnalyticsPage,
  })),
)
const ForecastPage = lazy(() =>
  import('./pages/ForecastPage').then((module) => ({
    default: module.ForecastPage,
  })),
)
const ReportPage = lazy(() =>
  import('./pages/ReportPage').then((module) => ({
    default: module.ReportPage,
  })),
)
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((module) => ({
    default: module.HistoryPage,
  })),
)
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
)

function RouteLoadingScreen() {
  const { t } = useLanguage()
  return (
    <main
      className="grid min-h-[100dvh] place-items-center px-5"
      role="status"
    >
      <div className="size-9 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--primary)] motion-reduce:animate-none" />
      <span className="sr-only">{t('common.loadingPage')}</span>
    </main>
  )
}

function App() {
  return (
    <Suspense fallback={<RouteLoadingScreen />}>
      <Routes>
        <Route element={<FoundationPage />} path="/" />
        <Route element={<PublicOnlyRoute />}>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<RegisterPage />} path="/register" />
          <Route
            element={<ForgotPasswordPage />}
            path="/forgot-password"
          />
        </Route>
        <Route element={<ResetPasswordPage />} path="/reset-password" />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route element={<DashboardPage />} path="/dashboard" />
            <Route element={<UploadPage />} path="/upload" />
            <Route element={<SalesAnalyticsPage />} path="/sales" />
            <Route element={<CustomerAnalyticsPage />} path="/customers" />
            <Route element={<ForecastPage />} path="/forecast" />
            <Route element={<ReportPage />} path="/report" />
            <Route element={<HistoryPage />} path="/history" />
            <Route element={<ProfilePage />} path="/profile" />
          </Route>
        </Route>

        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </Suspense>
  )
}

export default App
