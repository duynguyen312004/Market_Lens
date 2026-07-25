import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'

import { getAuthErrorMessage } from '../auth/authErrors'
import {
  createRegisterSchema,
  type RegisterValues,
} from '../auth/authSchemas'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { AuthNotice } from '../components/AuthNotice'
import { PasswordInput } from '../components/PasswordInput'
import { PasswordRequirements } from '../components/PasswordRequirements'
import { useLanguage } from '../i18n/LanguageContext'

const inputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60'

export function RegisterPage() {
  const { language, t } = useLanguage()
  const registerSchema = useMemo(
    () => createRegisterSchema(language),
    [language],
  )
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
            ? t('auth.accountConfirmEmail')
            : t('auth.accountReady'),
        )
      } catch (error) {
        setSubmitError(getAuthErrorMessage(error, language))
      }
    },
  )

  return (
    <AuthLayout
      description={t('auth.registerDesc')}
      footer={
        <>
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            className="font-black text-indigo-600 hover:underline"
            to="/login"
          >
            {t('auth.signInLink')}
          </Link>
        </>
      }
      title={t('auth.registerTitle')}
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
              className="mt-2 inline-block font-bold underline underline-offset-4"
              to="/login"
            >
              {t('auth.goToSignIn')}
            </Link>
          </AuthNotice>
        )}
      </div>

      <form className="mt-5 space-y-5" noValidate onSubmit={onSubmit}>
        <div>
          <label
            className="text-xs font-black text-slate-800"
            htmlFor="register-name"
          >
            {t('auth.displayNameLabel')}
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
            placeholder={t('auth.displayNamePlaceholder')}
            type="text"
            {...register('displayName')}
          />
          {errors.displayName && (
            <p
              className="mt-2 text-xs font-bold text-rose-600"
              id="register-name-error"
            >
              {errors.displayName.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="text-xs font-black text-slate-800"
            htmlFor="register-email"
          >
            {t('auth.emailLabel')}
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
            placeholder={t('auth.emailPlaceholder')}
            type="email"
            {...register('email')}
          />
          {errors.email && (
            <p
              className="mt-2 text-xs font-bold text-rose-600"
              id="register-email-error"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="text-xs font-black text-slate-800"
            htmlFor="register-password"
          >
            {t('auth.passwordLabel')}
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
            placeholder={t('auth.passwordPlaceholder')}
            {...register('password')}
          />
          <PasswordRequirements password={password} />
          {errors.password && (
            <p
              className="mt-2 text-xs font-bold text-rose-600"
              id="register-password-error"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="text-xs font-black text-slate-800"
            htmlFor="register-password-confirmation"
          >
            {t('auth.confirmPasswordLabel')}
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
            placeholder={t('auth.passwordPlaceholder')}
            {...register('passwordConfirmation')}
          />
          {errors.passwordConfirmation && (
            <p
              className="mt-2 text-xs font-bold text-rose-600"
              id="register-password-confirmation-error"
            >
              {errors.passwordConfirmation.message}
            </p>
          )}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-600 font-medium">
            <input
              aria-describedby={
                errors.acceptTerms ? 'register-terms-error' : undefined
              }
              aria-invalid={Boolean(errors.acceptTerms)}
              className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              type="checkbox"
              {...register('acceptTerms')}
            />
            <span>
              {t('auth.dataAuthorization')}
            </span>
          </label>
          {errors.acceptTerms && (
            <p
              className="mt-2 text-xs font-bold text-rose-600"
              id="register-terms-error"
            >
              {errors.acceptTerms.message}
            </p>
          )}
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={Boolean(configurationError) || isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <CircleNotchIcon
                aria-hidden="true"
                className="animate-spin"
                size={18}
                weight="bold"
              />
              <span>{t('auth.creatingAccount')}</span>
            </>
          ) : (
            <>
              <span>{t('auth.createAccountButton')}</span>
              <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
