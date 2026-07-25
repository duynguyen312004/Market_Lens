import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'

import { getAuthErrorMessage } from '../auth/authErrors'
import {
  getSafeReturnPath,
  RETURN_PATH_QUERY_KEY,
  SESSION_EXPIRED_QUERY_KEY,
} from '../auth/authNavigation'
import {
  createLoginSchema,
  type LoginValues,
} from '../auth/authSchemas'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { AuthNotice } from '../components/AuthNotice'
import { PasswordInput } from '../components/PasswordInput'
import { useLanguage } from '../i18n/LanguageContext'

type LoginLocationState = {
  from?: {
    pathname?: string
  }
  passwordReset?: boolean
}

const inputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60'

export function LoginPage() {
  const { language, t } = useLanguage()
  const loginSchema = useMemo(() => createLoginSchema(language), [language])
  const { configurationError, signIn } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LoginLocationState | null
  const searchParams = new URLSearchParams(location.search)
  const sessionExpired =
    searchParams.get(SESSION_EXPIRED_QUERY_KEY) === '1'
  const returnPath = getSafeReturnPath(
    searchParams.get(RETURN_PATH_QUERY_KEY),
  )
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setSubmitError(null)

    try {
      await signIn(email.trim().toLowerCase(), password)
      navigate(state?.from?.pathname ?? returnPath ?? '/dashboard', {
        replace: true,
      })
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error, language))
    }
  })

  return (
    <AuthLayout
      description={t('auth.loginDesc')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link
            className="font-black text-indigo-600 hover:underline"
            to="/register"
          >
            {t('auth.createOne')}
          </Link>
        </>
      }
      title={t('auth.loginTitle')}
    >
      <div className="space-y-4">
        {state?.passwordReset && (
          <AuthNotice tone="success">
            {t('auth.passwordUpdated')}
          </AuthNotice>
        )}

        {sessionExpired && (
          <AuthNotice tone="info">
            {t('auth.sessionExpired')}
          </AuthNotice>
        )}

        {configurationError && (
          <AuthNotice tone="error">{configurationError}</AuthNotice>
        )}

        {submitError && <AuthNotice tone="error">{submitError}</AuthNotice>}
      </div>

      <form className="mt-5 space-y-5" noValidate onSubmit={onSubmit}>
        <div>
          <label
            className="text-xs font-black text-slate-800"
            htmlFor="login-email"
          >
            {t('auth.emailLabel')}
          </label>
          <input
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            aria-invalid={Boolean(errors.email)}
            autoCapitalize="none"
            autoComplete="email"
            className={`${inputClassName} mt-2`}
            id="login-email"
            inputMode="email"
            placeholder={t('auth.emailPlaceholder')}
            type="email"
            {...register('email')}
          />
          {errors.email && (
            <p
              className="mt-2 text-xs font-bold text-rose-600"
              id="login-email-error"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label
              className="text-xs font-black text-slate-800"
              htmlFor="login-password"
            >
              {t('auth.passwordLabel')}
            </label>
            <Link
              className="shrink-0 whitespace-nowrap text-xs font-bold text-indigo-600 hover:underline"
              to="/forgot-password"
            >
              {t('auth.forgotPasswordLink')}
            </Link>
          </div>
          <PasswordInput
            aria-describedby={
              errors.password ? 'login-password-error' : undefined
            }
            aria-invalid={Boolean(errors.password)}
            autoComplete="current-password"
            className={inputClassName}
            id="login-password"
            placeholder={t('auth.passwordPlaceholder')}
            {...register('password')}
          />
          {errors.password && (
            <p
              className="mt-2 text-xs font-bold text-rose-600"
              id="login-password-error"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <CircleNotchIcon
                aria-hidden="true"
                className="animate-spin"
                size={18}
              />
              <span>{t('auth.processing')}</span>
            </>
          ) : (
            <>
              <span>{t('auth.signInButton')}</span>
              <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
