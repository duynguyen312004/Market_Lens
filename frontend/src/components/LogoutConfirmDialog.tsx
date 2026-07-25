import {
  CircleNotchIcon,
  SignOutIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'

import { useLanguage } from '../i18n/LanguageContext'

type LogoutConfirmDialogProps = {
  isLoggingOut: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function LogoutConfirmDialog({
  isLoggingOut,
  onCancel,
  onConfirm,
}: LogoutConfirmDialogProps) {
  const { t } = useLanguage()
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    confirmButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLoggingOut) {
        onCancel()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled)',
        ),
      )
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [isLoggingOut, onCancel])

  return (
    <div
      aria-labelledby="logout-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#0b1f3a]/38 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoggingOut) onCancel()
      }}
      role="dialog"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_24px_80px_rgba(15,55,105,0.18)] sm:p-7"
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <SignOutIcon aria-hidden="true" size={24} weight="duotone" />
          </span>
          <button
            aria-label={t('common.close')}
            className="grid size-9 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
            disabled={isLoggingOut}
            onClick={onCancel}
            type="button"
          >
            <XIcon aria-hidden="true" size={19} weight="bold" />
          </button>
        </div>

        <h2
          className="mt-6 text-2xl font-extrabold tracking-[-0.035em] text-[var(--text-primary)]"
          id="logout-dialog-title"
        >
          {t('shell.signOutTitle')}
        </h2>
        <p className="mt-3 leading-7 text-[var(--text-muted)]">
          {t('shell.signOutDesc')}
        </p>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-[var(--border-strong)] px-5 py-3 text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-55"
            disabled={isLoggingOut}
            onClick={onCancel}
            type="button"
          >
            {t('common.cancel')}
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-55"
            disabled={isLoggingOut}
            onClick={onConfirm}
            ref={confirmButtonRef}
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
            {isLoggingOut ? t('shell.signingOut') : t('nav.signOut')}
          </button>
        </div>
      </div>
    </div>
  )
}
