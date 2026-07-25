import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleNotchIcon,
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'

import { getAuthErrorMessage } from '../auth/authErrors'
import {
  createForgotPasswordSchema,
  type ForgotPasswordValues,
} from '../auth/authSchemas'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { AuthNotice } from '../components/AuthNotice'
import { useLanguage } from '../i18n/LanguageContext'

const inputClassName =
  'mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]/70 focus:border-[var(--primary)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-60'

export function ForgotPasswordPage() {
  const { language, t } = useLanguage()
  const forgotPasswordSchema = useMemo(
    () => createForgotPasswordSchema(language),
    [language],
  )
  const { configurationError, requestPasswordReset } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = handleSubmit(async ({ email }) => {
    const normalizedEmail = email.trim().toLowerCase()
    setSubmitError(null)

    try {
      await requestPasswordReset(normalizedEmail)
      setSubmittedEmail(normalizedEmail)
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error, language))
    }
  })

  return (
    <AuthLayout
      description={t('auth.forgotDesc')}
      footer={
        <Link
          className="inline-flex items-center gap-2 font-extrabold text-[var(--primary)] hover:underline"
          to="/login"
        >
          <ArrowLeftIcon aria-hidden="true" size={16} weight="bold" />
          {t('auth.backToSignIn')}
        </Link>
      }
      title={t('auth.forgotTitle')}
    >
      <div className="space-y-4">
        {configurationError && (
          <AuthNotice tone="error">{configurationError}</AuthNotice>
        )}
        {submitError && <AuthNotice tone="error">{submitError}</AuthNotice>}
        {submittedEmail && (
          <AuthNotice tone="success">
            {t('auth.resetEmailSent', { email: submittedEmail })}
          </AuthNotice>
        )}
      </div>

      {!submittedEmail && (
        <form className="mt-5 space-y-5" noValidate onSubmit={onSubmit}>
          <div>
            <label
              className="text-sm font-extrabold text-[var(--text-primary)]"
              htmlFor="forgot-email"
            >
              {t('auth.emailLabel')}
            </label>
            <input
              aria-describedby={
                errors.email ? 'forgot-email-error' : 'forgot-email-helper'
              }
              aria-invalid={Boolean(errors.email)}
              autoCapitalize="none"
              autoComplete="email"
              className={inputClassName}
              id="forgot-email"
              inputMode="email"
              maxLength={254}
              placeholder={t('auth.emailPlaceholder')}
              type="email"
              {...register('email')}
            />
            {errors.email ? (
              <p
                className="mt-2 text-sm font-medium text-[var(--danger)]"
                id="forgot-email-error"
              >
                {errors.email.message}
              </p>
            ) : (
              <p
                className="mt-2 text-sm leading-6 text-[var(--text-muted)]"
                id="forgot-email-helper"
              >
                {t('auth.resetLinkLifetime')}
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
                {t('auth.sendingResetLink')}
              </>
            ) : (
              <>
                {t('auth.sendResetLink')}
                <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
              </>
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
