import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'

type AuthNoticeProps = {
  children: ReactNode
  tone: 'error' | 'success' | 'info'
}

const toneStyles = {
  error: {
    container:
      'border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]',
    icon: WarningCircleIcon,
  },
  success: {
    container:
      'border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] text-[var(--success)]',
    icon: CheckCircleIcon,
  },
  info: {
    container:
      'border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[var(--primary-soft)] text-[var(--text-primary)]',
    icon: InfoIcon,
  },
}

export function AuthNotice({ children, tone }: AuthNoticeProps) {
  const { container, icon: Icon } = toneStyles[tone]

  return (
    <div
      className={`flex gap-3 rounded-xl border p-4 text-sm leading-6 ${container}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon
        aria-hidden="true"
        className="mt-0.5 shrink-0"
        size={20}
        weight="fill"
      />
      <div>{children}</div>
    </div>
  )
}
