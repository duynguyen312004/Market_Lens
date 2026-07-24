import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { getAuthErrorMessage } from '../auth/authErrors'
import {
  registerSchema,
  type RegisterValues,
} from '../auth/authSchemas'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { AuthNotice } from '../components/AuthNotice'
import { PasswordInput } from '../components/PasswordInput'
import { PasswordRequirements } from '../components/PasswordRequirements'

const inputClassName =
  'w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]/70 focus:border-[var(--primary)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-60'

export function RegisterPage() {
  const { configurationError, signUp } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      acceptTerms: false,
    },
  })
  const password = watch('password')

  const onSubmit = handleSubmit(
    async ({ displayName, email, password: submittedPassword }) => {
      setSubmitError(null)
      setSuccessMessage(null)

      try {
        const result = await signUp(
          email.trim().toLowerCase(),
          submittedPassword,
          displayName.trim(),
        )
        setSuccessMessage(
          result.requiresEmailConfirmation
            ? 'Tài khoản đã được tạo. Hãy mở email xác nhận rồi quay lại đăng nhập.'
            : 'Tài khoản đã được tạo. MarketLens đang mở dashboard cho bạn.',
        )
      } catch (error) {
        setSubmitError(getAuthErrorMessage(error))
      }
    },
  )

  return (
    <AuthLayout
      description="Bắt đầu với một tài khoản riêng cho dữ liệu và lịch sử phân tích của bạn."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link
            className="font-extrabold text-[var(--primary)] hover:underline"
            to="/login"
          >
            Đăng nhập
          </Link>
        </>
      }
      title="Tạo tài khoản MarketLens"
    >
      <div className="space-y-4">
        {configurationError && (
          <AuthNotice tone="error">{configurationError}</AuthNotice>
        )}
        {submitError && <AuthNotice tone="error">{submitError}</AuthNotice>}
        {successMessage && (
          <AuthNotice tone="success">
            <p>{successMessage}</p>
            <Link
              className="mt-2 inline-block font-extrabold underline underline-offset-4"
              to="/login"
            >
              Đi tới đăng nhập
            </Link>
          </AuthNotice>
        )}
      </div>

      <form className="mt-5 space-y-5" noValidate onSubmit={onSubmit}>
        <div>
          <label
            className="text-sm font-extrabold text-[var(--text-primary)]"
            htmlFor="register-name"
          >
            Tên hiển thị
          </label>
          <input
            aria-describedby={
              errors.displayName ? 'register-name-error' : undefined
            }
            aria-invalid={Boolean(errors.displayName)}
            autoComplete="name"
            className={`${inputClassName} mt-2`}
            id="register-name"
            maxLength={50}
            placeholder="Nguyễn Minh Anh"
            type="text"
            {...register('displayName')}
          />
          {errors.displayName && (
            <p
              className="mt-2 text-sm font-medium text-[var(--danger)]"
              id="register-name-error"
            >
              {errors.displayName.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="text-sm font-extrabold text-[var(--text-primary)]"
            htmlFor="register-email"
          >
            Email
          </label>
          <input
            aria-describedby={
              errors.email ? 'register-email-error' : undefined
            }
            aria-invalid={Boolean(errors.email)}
            autoCapitalize="none"
            autoComplete="email"
            className={`${inputClassName} mt-2`}
            id="register-email"
            inputMode="email"
            maxLength={254}
            placeholder="ban@cuahang.vn"
            type="email"
            {...register('email')}
          />
          {errors.email && (
            <p
              className="mt-2 text-sm font-medium text-[var(--danger)]"
              id="register-email-error"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="text-sm font-extrabold text-[var(--text-primary)]"
            htmlFor="register-password"
          >
            Mật khẩu
          </label>
          <PasswordInput
            aria-describedby={
              errors.password ? 'register-password-error' : undefined
            }
            aria-invalid={Boolean(errors.password)}
            autoComplete="new-password"
            className={inputClassName}
            id="register-password"
            maxLength={72}
            placeholder="Tạo mật khẩu mạnh"
            {...register('password')}
          />
          <PasswordRequirements password={password} />
          {errors.password && (
            <p
              className="mt-2 text-sm font-medium text-[var(--danger)]"
              id="register-password-error"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="text-sm font-extrabold text-[var(--text-primary)]"
            htmlFor="register-password-confirmation"
          >
            Nhập lại mật khẩu
          </label>
          <PasswordInput
            aria-describedby={
              errors.passwordConfirmation
                ? 'register-password-confirmation-error'
                : undefined
            }
            aria-invalid={Boolean(errors.passwordConfirmation)}
            autoComplete="new-password"
            className={inputClassName}
            id="register-password-confirmation"
            maxLength={72}
            placeholder="Nhập lại mật khẩu"
            {...register('passwordConfirmation')}
          />
          {errors.passwordConfirmation && (
            <p
              className="mt-2 text-sm font-medium text-[var(--danger)]"
              id="register-password-confirmation-error"
            >
              {errors.passwordConfirmation.message}
            </p>
          )}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--text-muted)]">
            <input
              aria-describedby={
                errors.acceptTerms ? 'register-terms-error' : undefined
              }
              aria-invalid={Boolean(errors.acceptTerms)}
              className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
              type="checkbox"
              {...register('acceptTerms')}
            />
            <span>
              Tôi xác nhận thông tin đăng ký là chính xác và chỉ tải lên dữ liệu
              mình có quyền sử dụng.
            </span>
          </label>
          {errors.acceptTerms && (
            <p
              className="mt-2 text-sm font-medium text-[var(--danger)]"
              id="register-terms-error"
            >
              {errors.acceptTerms.message}
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
              Đang tạo tài khoản
            </>
          ) : (
            <>
              Tạo tài khoản
              <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
