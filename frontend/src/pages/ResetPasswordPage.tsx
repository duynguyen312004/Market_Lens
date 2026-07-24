import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CircleNotchIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { getAuthErrorMessage } from '../auth/authErrors'
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '../auth/authSchemas'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { AuthNotice } from '../components/AuthNotice'
import { PasswordInput } from '../components/PasswordInput'
import { PasswordRequirements } from '../components/PasswordRequirements'

const inputClassName =
  'w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]/70 focus:border-[var(--primary)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-60'

export function ResetPasswordPage() {
  const {
    configurationError,
    isPasswordRecovery,
    loading,
    session,
    signOut,
    updatePassword,
  } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const navigate = useNavigate()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      password: '',
      passwordConfirmation: '',
    },
  })
  const password = watch('password')

  const onSubmit = handleSubmit(async ({ password: submittedPassword }) => {
    setSubmitError(null)

    try {
      await updatePassword(submittedPassword)
      await signOut()
      navigate('/login', {
        replace: true,
        state: { passwordReset: true },
      })
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    }
  })

  return (
    <AuthLayout
      description="Tạo mật khẩu mới đủ mạnh cho tài khoản MarketLens của bạn."
      footer={
        <Link
          className="inline-flex items-center gap-2 font-extrabold text-[var(--primary)] hover:underline"
          to="/login"
        >
          <ArrowLeftIcon aria-hidden="true" size={16} weight="bold" />
          Quay lại đăng nhập
        </Link>
      }
      title="Đặt lại mật khẩu"
    >
      {loading && (
        <div
          className="h-32 animate-pulse rounded-2xl bg-[var(--surface-subtle)] motion-reduce:animate-none"
          role="status"
        >
          <span className="sr-only">Đang kiểm tra liên kết khôi phục...</span>
        </div>
      )}

      {!loading && configurationError && (
        <AuthNotice tone="error">{configurationError}</AuthNotice>
      )}

      {!loading &&
        !configurationError &&
        (!session || !isPasswordRecovery) && (
        <AuthNotice tone="info">
          <p>Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
          <Link
            className="mt-2 inline-block font-extrabold text-[var(--primary)] underline underline-offset-4"
            to="/forgot-password"
          >
            Yêu cầu liên kết mới
          </Link>
        </AuthNotice>
      )}

      {!loading && session && isPasswordRecovery && (
        <>
          {submitError && (
            <div className="mb-5">
              <AuthNotice tone="error">{submitError}</AuthNotice>
            </div>
          )}

          <form className="space-y-5" noValidate onSubmit={onSubmit}>
            <div>
              <label
                className="text-sm font-extrabold text-[var(--text-primary)]"
                htmlFor="reset-password"
              >
                Mật khẩu mới
              </label>
              <PasswordInput
                aria-describedby={
                  errors.password ? 'reset-password-error' : undefined
                }
                aria-invalid={Boolean(errors.password)}
                autoComplete="new-password"
                className={inputClassName}
                id="reset-password"
                maxLength={72}
                placeholder="Tạo mật khẩu mới"
                {...register('password')}
              />
              <PasswordRequirements password={password} />
              {errors.password && (
                <p
                  className="mt-2 text-sm font-medium text-[var(--danger)]"
                  id="reset-password-error"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                className="text-sm font-extrabold text-[var(--text-primary)]"
                htmlFor="reset-password-confirmation"
              >
                Nhập lại mật khẩu
              </label>
              <PasswordInput
                aria-describedby={
                  errors.passwordConfirmation
                    ? 'reset-password-confirmation-error'
                    : undefined
                }
                aria-invalid={Boolean(errors.passwordConfirmation)}
                autoComplete="new-password"
                className={inputClassName}
                id="reset-password-confirmation"
                maxLength={72}
                placeholder="Nhập lại mật khẩu"
                {...register('passwordConfirmation')}
              />
              {errors.passwordConfirmation && (
                <p
                  className="mt-2 text-sm font-medium text-[var(--danger)]"
                  id="reset-password-confirmation-error"
                >
                  {errors.passwordConfirmation.message}
                </p>
              )}
            </div>

            <button
              className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isSubmitting}
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
                  Đang cập nhật
                </>
              ) : (
                <>
                  <CheckCircleIcon aria-hidden="true" size={18} weight="bold" />
                  Cập nhật mật khẩu
                </>
              )}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
