import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { getAuthErrorMessage } from '../auth/authErrors'
import {
  getSafeReturnPath,
  RETURN_PATH_QUERY_KEY,
  SESSION_EXPIRED_QUERY_KEY,
} from '../auth/authNavigation'
import {
  loginSchema,
  type LoginValues,
} from '../auth/authSchemas'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { AuthNotice } from '../components/AuthNotice'
import { PasswordInput } from '../components/PasswordInput'

type LoginLocationState = {
  from?: {
    pathname?: string
  }
  passwordReset?: boolean
}

const inputClassName =
  'w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]/70 focus:border-[var(--primary)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-60'

export function LoginPage() {
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
      setSubmitError(getAuthErrorMessage(error))
    }
  })

  return (
    <AuthLayout
      description="Đăng nhập để tiếp tục xem dữ liệu và các lần phân tích của shop."
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link
            className="font-extrabold text-[var(--primary)] hover:underline"
            to="/register"
          >
            Đăng ký miễn phí
          </Link>
        </>
      }
      title="Chào mừng trở lại"
    >
      <div className="space-y-4">
        {state?.passwordReset && (
          <AuthNotice tone="success">
            Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.
          </AuthNotice>
        )}

        {sessionExpired && (
          <AuthNotice tone="info">
            Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.
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
            className="text-sm font-extrabold text-[var(--text-primary)]"
            htmlFor="login-email"
          >
            Email
          </label>
          <input
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            aria-invalid={Boolean(errors.email)}
            autoCapitalize="none"
            autoComplete="email"
            className={`${inputClassName} mt-2`}
            id="login-email"
            inputMode="email"
            placeholder="ban@cuahang.vn"
            type="email"
            {...register('email')}
          />
          {errors.email && (
            <p
              className="mt-2 text-sm font-medium text-[var(--danger)]"
              id="login-email-error"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label
              className="text-sm font-extrabold text-[var(--text-primary)]"
              htmlFor="login-password"
            >
              Mật khẩu
            </label>
            <Link
              className="shrink-0 whitespace-nowrap text-sm font-bold text-[var(--primary)] hover:underline"
              to="/forgot-password"
            >
              Quên mật khẩu?
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
            placeholder="Nhập mật khẩu"
            {...register('password')}
          />
          {errors.password && (
            <p
              className="mt-2 text-sm font-medium text-[var(--danger)]"
              id="login-password-error"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={Boolean(configurationError) || isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <CircleNotchIcon
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
                size={18}
                weight="bold"
              />
              Đang đăng nhập
            </>
          ) : (
            <>
              Đăng nhập
              <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
