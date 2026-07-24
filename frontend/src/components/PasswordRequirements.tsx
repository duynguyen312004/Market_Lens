import { CheckCircleIcon, CircleIcon } from '@phosphor-icons/react'

const requirements = [
  { label: 'Ít nhất 8 ký tự', test: (password: string) => password.length >= 8 },
  { label: 'Một chữ hoa', test: (password: string) => /[A-Z]/.test(password) },
  {
    label: 'Một chữ thường',
    test: (password: string) => /[a-z]/.test(password),
  },
  { label: 'Một chữ số', test: (password: string) => /[0-9]/.test(password) },
  {
    label: 'Không có khoảng trắng',
    test: (password: string) => password.length > 0 && /^\S+$/.test(password),
  },
]

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul
      aria-label="Yêu cầu mật khẩu"
      className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3"
    >
      {requirements.map(({ label, test }) => {
        const isMet = test(password)

        return (
          <li
            className={`flex items-center gap-1.5 ${
              isMet ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
            }`}
            key={label}
          >
            {isMet ? (
              <CheckCircleIcon aria-hidden="true" size={14} weight="fill" />
            ) : (
              <CircleIcon aria-hidden="true" size={14} />
            )}
            {label}
          </li>
        )
      })}
    </ul>
  )
}
