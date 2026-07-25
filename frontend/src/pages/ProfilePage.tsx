import { zodResolver } from '@hookform/resolvers/zod'
import {
  CircleNotchIcon,
  EnvelopeSimpleIcon,
  IdentificationCardIcon,
  LockKeyIcon,
  SignOutIcon,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { getAuthErrorMessage } from '../auth/authErrors'
import {
  createChangePasswordSchema,
  createProfileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from '../auth/authSchemas'
import { useAuth } from '../auth/useAuth'
import { AuthNotice } from '../components/AuthNotice'
import { LogoutConfirmDialog } from '../components/LogoutConfirmDialog'
import { PasswordInput } from '../components/PasswordInput'
import { PasswordRequirements } from '../components/PasswordRequirements'
import { useLanguage } from '../i18n/LanguageContext'

const inputClassName =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60'

function getDisplayName(
  metadata: Record<string, unknown> | undefined,
  fallback: string,
) {
  const value = metadata?.display_name
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : fallback
}

function getInitials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toLocaleUpperCase('en-US'))
    .join('')
}

export function ProfilePage() {
  const { language, t } = useLanguage()
  const {
    configurationError,
    signOut,
    updateDisplayName,
    updatePassword,
    user,
  } = useAuth()

  const currentDisplayName = getDisplayName(
    user?.user_metadata,
    t('profile.defaultOwner'),
  )
  const profileSchema = useMemo(
    () => createProfileSchema(language),
    [language],
  )
  const changePasswordSchema = useMemo(
    () => createChangePasswordSchema(language),
    [language],
  )
  const [profileNotice, setProfileNotice] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)
  const [passwordNotice, setPasswordNotice] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { displayName: currentDisplayName },
  })

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      currentPassword: '',
      password: '',
      passwordConfirmation: '',
    },
  })
  const newPassword = passwordForm.watch('password')

  useEffect(() => {
    if (!profileForm.formState.isDirty) {
      profileForm.reset({ displayName: currentDisplayName })
    }
  }, [currentDisplayName, profileForm])

  const initials = useMemo(
    () => getInitials(currentDisplayName),
    [currentDisplayName],
  )

  const submitProfile = profileForm.handleSubmit(async ({ displayName }) => {
    setProfileNotice(null)
    try {
      await updateDisplayName(displayName)
      profileForm.reset({ displayName })
      setProfileNotice({
        tone: 'success',
        message: t('profile.saved'),
      })
    } catch (error) {
      setProfileNotice({
        tone: 'error',
        message: getAuthErrorMessage(error, language),
      })
    }
  })

  const submitPassword = passwordForm.handleSubmit(
    async ({ currentPassword, password }) => {
      setPasswordNotice(null)
      try {
        await updatePassword(password, currentPassword)
        passwordForm.reset()
        setPasswordNotice({
          tone: 'success',
          message: t('profile.passwordChanged'),
        })
      } catch (error) {
        setPasswordNotice({
          tone: 'error',
          message: getAuthErrorMessage(error, language),
        })
      }
    },
  )

  async function handleSignOut() {
    setLogoutError(null)
    setIsLoggingOut(true)
    try {
      await signOut()
    } catch (error) {
      setLogoutError(getAuthErrorMessage(error, language))
      setIsLoggingOut(false)
      setIsLogoutDialogOpen(false)
    }
  }

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="border-b border-slate-200/80 pb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {t('nav.profile')}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {t('profile.title')}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t('profile.desc')}
          </p>
        </header>

        {configurationError && (
          <AuthNotice tone="error">{configurationError}</AuthNotice>
        )}
        {logoutError && (
          <AuthNotice tone="error">{logoutError}</AuthNotice>
        )}

        {/* Profile Card Summary */}
        <section className="data-panel flex flex-col gap-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-xl bg-[var(--primary)] text-xl font-extrabold text-white">
              {initials || 'SO'}
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900">{currentDisplayName}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <EnvelopeSimpleIcon size={16} />
                {user?.email}
              </p>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-2xs hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
            disabled={isLoggingOut}
            onClick={() => setIsLogoutDialogOpen(true)}
            type="button"
          >
            <SignOutIcon size={16} weight="bold" />
            {t('nav.signOut')}
          </button>
        </section>

        {/* Profile Details Form */}
        <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <IdentificationCardIcon className="text-indigo-600" size={22} weight="duotone" />
            <h2 className="text-lg font-black text-slate-900">{t('profile.information')}</h2>
          </div>

          <form className="mt-6 space-y-5" onSubmit={(e) => void submitProfile(e)}>
            <div>
              <label className="text-xs font-extrabold text-slate-700" htmlFor="displayName">
                {t('profile.displayName')}
              </label>
              <input
                className={inputClassName}
                id="displayName"
                {...profileForm.register('displayName')}
              />
              {profileForm.formState.errors.displayName?.message && (
                <p className="mt-1.5 text-xs font-bold text-rose-600">
                  {profileForm.formState.errors.displayName.message}
                </p>
              )}
            </div>

            {profileNotice && (
              <AuthNotice tone={profileNotice.tone === 'success' ? 'success' : 'error'}>
                {profileNotice.message}
              </AuthNotice>
            )}

            <button
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition disabled:opacity-55"
              disabled={profileForm.formState.isSubmitting || !profileForm.formState.isDirty}
              type="submit"
            >
              {profileForm.formState.isSubmitting && (
                <CircleNotchIcon className="animate-spin" size={16} />
              )}
              {t('profile.saveChanges')}
            </button>
          </form>
        </section>

        {/* Change Password Form */}
        <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <LockKeyIcon className="text-indigo-600" size={22} weight="duotone" />
            <h2 className="text-lg font-black text-slate-900">{t('profile.changePassword')}</h2>
          </div>

          <form className="mt-6 space-y-5" onSubmit={(e) => void submitPassword(e)}>
            <div>
              <label className="text-xs font-extrabold text-slate-700" htmlFor="currentPassword">
                {t('profile.currentPassword')}
              </label>
              <PasswordInput
                className={inputClassName}
                id="currentPassword"
                {...passwordForm.register('currentPassword')}
              />
              {passwordForm.formState.errors.currentPassword?.message && (
                <p className="mt-1.5 text-xs font-bold text-rose-600">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700" htmlFor="password">
                {t('auth.newPassword')}
              </label>
              <PasswordInput
                className={inputClassName}
                id="password"
                {...passwordForm.register('password')}
              />
              {passwordForm.formState.errors.password?.message && (
                <p className="mt-1.5 text-xs font-bold text-rose-600">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <PasswordRequirements password={newPassword} />

            <div>
              <label className="text-xs font-extrabold text-slate-700" htmlFor="passwordConfirmation">
                {t('auth.confirmNewPassword')}
              </label>
              <PasswordInput
                className={inputClassName}
                id="passwordConfirmation"
                {...passwordForm.register('passwordConfirmation')}
              />
              {passwordForm.formState.errors.passwordConfirmation?.message && (
                <p className="mt-1.5 text-xs font-bold text-rose-600">
                  {passwordForm.formState.errors.passwordConfirmation.message}
                </p>
              )}
            </div>

            {passwordNotice && (
              <AuthNotice tone={passwordNotice.tone === 'success' ? 'success' : 'error'}>
                {passwordNotice.message}
              </AuthNotice>
            )}

            <button
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition disabled:opacity-55"
              disabled={passwordForm.formState.isSubmitting}
              type="submit"
            >
              {passwordForm.formState.isSubmitting && (
                <CircleNotchIcon className="animate-spin" size={16} />
              )}
              {t('auth.updatePassword')}
            </button>
          </form>
        </section>
      </div>

      {isLogoutDialogOpen && (
        <LogoutConfirmDialog
          isLoggingOut={isLoggingOut}
          onCancel={() => setIsLogoutDialogOpen(false)}
          onConfirm={() => void handleSignOut()}
        />
      )}
    </main>
  )
}
