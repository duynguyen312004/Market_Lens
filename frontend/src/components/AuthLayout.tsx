import {
  ChartLineUpIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type AuthLayoutProps = PropsWithChildren<{
  description: string
  footer: ReactNode
  title: string
}>

export function AuthLayout({
  children,
  description,
  footer,
  title,
}: AuthLayoutProps) {
  return (
    <main className="grid min-h-[100dvh] bg-[var(--page)] lg:grid-cols-[minmax(0,1.08fr)_minmax(29rem,0.92fr)]">
      <section className="relative hidden min-h-[100dvh] overflow-hidden bg-[#0c285c] text-white lg:flex lg:flex-col">
        <img
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover opacity-48"
          height="1024"
          src="/images/marketlens-report.webp"
          width="1536"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071a3b]/55 via-[#071a3b]/72 to-[#071a3b]/96" />

        <div className="relative flex h-full min-h-[100dvh] flex-col px-10 py-9 xl:px-14">
          <Link
            className="flex w-fit items-center gap-2.5 rounded-lg text-lg font-extrabold tracking-[-0.035em] text-white"
            to="/"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-white/12 text-blue-100">
              <ChartLineUpIcon aria-hidden="true" size={23} weight="bold" />
            </span>
            MarketLens
          </Link>

          <div className="my-auto max-w-xl py-16">
            <h2 className="max-w-[12ch] text-5xl font-extrabold leading-[1.07] tracking-[-0.05em] xl:text-6xl">
              Mỗi con số đều có điều cần nói.
            </h2>
            <p className="mt-6 max-w-[48ch] text-lg leading-8 text-blue-100/78">
              MarketLens giúp bạn đọc doanh thu, sản phẩm và khách hàng bằng một
              góc nhìn thống nhất.
            </p>

            <div className="mt-10 grid gap-3 text-sm font-semibold text-blue-50">
              {[
                'Xác thực và phân quyền bằng Supabase',
                'KPI được tính tại backend từ dữ liệu thật',
                'AI chỉ diễn giải số liệu đã được kiểm chứng',
              ].map((item) => (
                <div className="flex items-center gap-3" key={item}>
                  <CheckCircleIcon
                    aria-hidden="true"
                    className="shrink-0 text-blue-300"
                    size={19}
                    weight="fill"
                  />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-blue-200/72">
            <ShieldCheckIcon aria-hidden="true" size={18} weight="duotone" />
            Phiên đăng nhập được bảo vệ và có thể thu hồi.
          </div>
        </div>
      </section>

      <section className="flex min-h-[100dvh] min-w-0 items-center justify-center overflow-x-hidden px-5 py-10 sm:px-10 lg:px-12">
        <div className="min-w-0 w-full max-w-[29rem]">
          <Link
            className="mb-10 flex w-fit items-center gap-2.5 font-extrabold tracking-[-0.03em] text-[var(--text-primary)] lg:hidden"
            to="/"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)]">
              <ChartLineUpIcon aria-hidden="true" size={20} weight="bold" />
            </span>
            MarketLens
          </Link>

          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-[52ch] leading-7 text-[var(--text-muted)]">
            {description}
          </p>

          <div className="mt-8">{children}</div>
          <div className="mt-7 break-words text-center text-sm leading-6 text-[var(--text-muted)]">
            {footer}
          </div>

          <p className="mt-10 text-center text-xs leading-5 text-[var(--text-muted)]">
            Bằng việc tiếp tục, bạn xác nhận chỉ tải lên dữ liệu mà mình có
            quyền sử dụng.
          </p>
        </div>
      </section>
    </main>
  )
}
