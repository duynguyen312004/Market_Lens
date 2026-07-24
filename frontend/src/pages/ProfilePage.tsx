import { zodResolver } from '@hookform/resolvers/zod'
import {
  CheckCircleIcon,
  CircleNotchIcon,
  EnvelopeSimpleIcon,
  IdentificationCardIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  SignOutIcon,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { getAuthErrorMessage } from '../auth/authErrors'
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from '../auth/authSchemas'
import { useAuth } from '../auth/useAuth'
import { AuthNotice } from '../components/AuthNotice'
import { PasswordInput } from '../components/PasswordInput'
import { PasswordRequirements } from '../components/PasswordRequirements'

const inputClassName =
  'mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]/75 focus:border-[var(--primary)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-60'

function getDisplayName(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.display_name
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : 'Chủ shop'
}

function getInitials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toLocaleUpperCase('vi-VN'))
    .join('')
}

export function ProfilePage() {
  const {
    configurationError,
    signOut,
    updateDisplayName,
    updatePassword,
    user,
  } = useAuth()
  const currentDisplayName = getDisplayName(user?.user_metadata)
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
        message: 'Tên hiển thị đã được cập nhật.',
      })
    } catch (error) {
      setProfileNotice({
        tone: 'error',
        message: getAuthErrorMessage(error),
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
          message: 'Mật khẩu đã được đổi thành công.',
        })
      } catch (error) {
        setPasswordNotice({
          tone: 'error',
          message: getAuthErrorMessage(error),
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
      setLogoutError(getAuthErrorMessage(error))
      setIsLoggingOut(false)
    }
  }

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="text-sm font-extrabold text-[var(--primary)]">
            Tài khoản
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
            Hồ sơ của bạn
          </h1>
          <p className="mt-3 leading-7 text-[var(--text-muted)]">
            Cập nhật tên hiển thị, bảo vệ mật khẩu và quản lý phiên đăng nhập.
          </p>
        </header>

        {configurationError && (
          <div className="mt-6">
            <AuthNotice tone="error">{configurationError}</AuthNotice>
          </div>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
          <aside className="self-start overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="bg-[#102b61] px-6 py-7 text-white">
              <span
                aria-hidden="true"
                className="grid size-16 place-items-center rounded-2xl bg-white/12 text-xl font-extrabold"
              >
                {initials || 'ML'}
              </span>
              <h2 className="mt-5 text-xl font-extrabold">
                {currentDisplayName}
              </h2>
              <p className="mt-1 break-all text-sm text-blue-100/75">
                {user?.email}
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex gap-3">
                <EnvelopeSimpleIcon
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[var(--primary)]"
                  size={20}
                  weight="duotone"
                />
                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)]">
                    Email đăng nhập
                  </p>
                  <p className="mt-1 break-all text-sm font-extrabold text-[var(--text-primary)]">
                    {user?.email ?? 'Chưa có email'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <ShieldCheckIcon
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[var(--success)]"
                  size={20}
                  weight="duotone"
                />
                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)]">
                    Trạng thái
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-[var(--text-primary)]">
                    Phiên đăng nhập đang hoạt động
                  </p>
                </div>
              </div>

              {logoutError && (
                <AuthNotice tone="error">{logoutError}</AuthNotice>
              )}

              <button
                className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border-strong)] px-4 py-3 text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isLoggingOut}
                onClick={handleSignOut}
                type="button"
              >
                {isLoggingOut ? (
                  <CircleNotchIcon
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                    size={18}
                    weight="bold"
                  />
                ) : (
                  <SignOutIcon aria-hidden="true" size={18} weight="bold" />
                )}
                {isLoggingOut ? 'Đang đăng xuất' : 'Đăng xuất'}
              </button>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                  <IdentificationCardIcon
                    aria-hidden="true"
                    size={24}
                    weight="duotone"
                  />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
                    Thông tin cá nhân
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                    Tên này xuất hiện trong thanh điều hướng của MarketLens.
                  </p>
                </div>
              </div>

              {profileNotice && (
                <div className="mt-5" aria-live="polite">
                  <AuthNotice tone={profileNotice.tone}>
                    {profileNotice.message}
                  </AuthNotice>
                </div>
              )}

              <form
                className="mt-6"
                noValidate
                onSubmit={submitProfile}
              >
                <label
                  className="text-sm font-extrabold text-[var(--text-primary)]"
                  htmlFor="profile-display-name"
                >
                  Tên hiển thị
                </label>
                <input
                  aria-describedby={
                    profileForm.formState.errors.displayName
                      ? 'profile-display-name-error'
                      : 'profile-display-name-helper'
                  }
                  aria-invalid={Boolean(
                    profileForm.formState.errors.displayName,
                  )}
                  autoComplete="name"
                  className={inputClassName}
                  disabled={
                    Boolean(configurationError) ||
                    profileForm.formState.isSubmitting
                  }
                  id="profile-display-name"
                  maxLength={50}
                  {...profileForm.register('displayName')}
                />
                {profileForm.formState.errors.displayName ? (
                  <p
                    className="mt-2 text-sm font-medium text-[var(--danger)]"
                    id="profile-display-name-error"
                  >
                    {profileForm.formState.errors.displayName.message}
                  </p>
                ) : (
                  <p
                    className="mt-2 text-sm text-[var(--text-muted)]"
                    id="profile-display-name-helper"
                  >
                    Từ 2 đến 50 ký tự.
                  </p>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                    disabled={
                      Boolean(configurationError) ||
                      profileForm.formState.isSubmitting ||
                      !profileForm.formState.isDirty
                    }
                    type="submit"
                  >
                    {profileForm.formState.isSubmitting ? (
                      <CircleNotchIcon
                        aria-hidden="true"
                        className="animate-spin motion-reduce:animate-none"
                        size={18}
                        weight="bold"
                      />
                    ) : (
                      <CheckCircleIcon
                        aria-hidden="true"
                        size={18}
                        weight="bold"
                      />
                    )}
                    {profileForm.formState.isSubmitting
                      ? 'Đang lưu'
                      : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                  <LockKeyIcon
                    aria-hidden="true"
                    size={24}
                    weight="duotone"
                  />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
                    Đổi mật khẩu
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                    Xác nhận mật khẩu hiện tại trước khi tạo mật khẩu mới.
                  </p>
                </div>
              </div>

              {passwordNotice && (
                <div className="mt-5" aria-live="polite">
                  <AuthNotice tone={passwordNotice.tone}>
                    {passwordNotice.message}
                  </AuthNotice>
                </div>
              )}

              <form
                className="mt-6 space-y-5"
                noValidate
                onSubmit={submitPassword}
              >
                <div>
                  <label
                    className="text-sm font-extrabold text-[var(--text-primary)]"
                    htmlFor="profile-current-password"
                  >
                    Mật khẩu hiện tại
                  </label>
                  <PasswordInput
                    aria-describedby={
                      passwordForm.formState.errors.currentPassword
                        ? 'profile-current-password-error'
                        : undefined
                    }
                    aria-invalid={Boolean(
                      passwordForm.formState.errors.currentPassword,
                    )}
                    autoComplete="current-password"
                    className={inputClassName}
                    disabled={
                      Boolean(configurationError) ||
                      passwordForm.formState.isSubmitting
                    }
                    id="profile-current-password"
                    maxLength={72}
                    {...passwordForm.register('currentPassword')}
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p
                      className="mt-2 text-sm font-medium text-[var(--danger)]"
                      id="profile-current-password-error"
                    >
                      {
                        passwordForm.formState.errors.currentPassword
                          .message
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="text-sm font-extrabold text-[var(--text-primary)]"
                    htmlFor="profile-new-password"
                  >
                    Mật khẩu mới
                  </label>
                  <PasswordInput
                    aria-describedby={
                      passwordForm.formState.errors.password
                        ? 'profile-new-password-error'
                        : undefined
                    }
                    aria-invalid={Boolean(
                      passwordForm.formState.errors.password,
                    )}
                    autoComplete="new-password"
                    className={inputClassName}
                    disabled={
                      Boolean(configurationError) ||
                      passwordForm.formState.isSubmitting
                    }
                    id="profile-new-password"
                    maxLength={72}
                    {...passwordForm.register('password')}
                  />
                  <PasswordRequirements password={newPassword} />
                  {passwordForm.formState.errors.password && (
                    <p
                      className="mt-2 text-sm font-medium text-[var(--danger)]"
                      id="profile-new-password-error"
                    >
                      {passwordForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="text-sm font-extrabold text-[var(--text-primary)]"
                    htmlFor="profile-password-confirmation"
                  >
                    Nhập lại mật khẩu mới
                  </label>
                  <PasswordInput
                    aria-describedby={
                      passwordForm.formState.errors.passwordConfirmation
                        ? 'profile-password-confirmation-error'
                        : undefined
                    }
                    aria-invalid={Boolean(
                      passwordForm.formState.errors.passwordConfirmation,
                    )}
                    autoComplete="new-password"
                    className={inputClassName}
                    disabled={
                      Boolean(configurationError) ||
                      passwordForm.formState.isSubmitting
                    }
                    id="profile-password-confirmation"
                    maxLength={72}
                    {...passwordForm.register('passwordConfirmation')}
                  />
                  {passwordForm.formState.errors.passwordConfirmation && (
                    <p
                      className="mt-2 text-sm font-medium text-[var(--danger)]"
                      id="profile-password-confirmation-error"
                    >
                      {
                        passwordForm.formState.errors.passwordConfirmation
                          .message
                      }
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                    disabled={
                      Boolean(configurationError) ||
                      passwordForm.formState.isSubmitting
                    }
                    type="submit"
                  >
                    {passwordForm.formState.isSubmitting ? (
                      <CircleNotchIcon
                        aria-hidden="true"
                        className="animate-spin motion-reduce:animate-none"
                        size={18}
                        weight="bold"
                      />
                    ) : (
                      <ShieldCheckIcon
                        aria-hidden="true"
                        size={18}
                        weight="bold"
                      />
                    )}
                    {passwordForm.formState.isSubmitting
                      ? 'Đang cập nhật'
                      : 'Đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
