import {
  ArrowRightIcon,
  BrainIcon,
  ChartBarIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  FileCsvIcon,
  FileMagnifyingGlassIcon,
  ListIcon,
  LockKeyIcon,
  SparkleIcon,
  TrendUpIcon,
  UsersThreeIcon,
  XIcon,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const audiences = [
  'Chủ shop Shopee',
  'TikTok Shop',
  'Cửa hàng bán lẻ',
  'Doanh nghiệp vừa và nhỏ',
]

const workflow = [
  {
    title: 'Tải dữ liệu lên',
    description: 'Chọn file CSV hoặc XLSX từ hệ thống bán hàng của bạn.',
    icon: FileCsvIcon,
  },
  {
    title: 'MarketLens phân tích',
    description: 'Dữ liệu được kiểm tra, chuẩn hóa và tính toán tự động.',
    icon: FileMagnifyingGlassIcon,
  },
  {
    title: 'Nhận góc nhìn rõ ràng',
    description: 'Xem dashboard, dự báo và báo cáo có thể hành động.',
    icon: TrendUpIcon,
  },
]

export function FoundationPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const },
      }

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[var(--page)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)]/80 bg-[color-mix(in_srgb,var(--page)_88%,transparent)] backdrop-blur-xl">
        <nav
          aria-label="Điều hướng trang chủ"
          className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <Link
            aria-label="MarketLens, trang chủ"
            className="flex items-center gap-2.5 rounded-lg text-lg font-extrabold tracking-[-0.035em]"
            to="/"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)] shadow-[0_8px_24px_color-mix(in_srgb,var(--primary)_24%,transparent)]">
              <ChartLineUpIcon aria-hidden="true" size={21} weight="bold" />
            </span>
            <span>
              Market<span className="text-[var(--primary)]">Lens</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            <a
              className="text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              href="#tinh-nang"
            >
              Tính năng
            </a>
            <a
              className="text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              href="#cach-hoat-dong"
            >
              Cách hoạt động
            </a>
            <a
              className="text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              href="#bao-mat"
            >
              Bảo mật
            </a>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)] active:scale-[0.98]"
              to="/login"
            >
              Đăng nhập
            </Link>
            <Link
              className="whitespace-nowrap rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary-contrast)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
              to="/register"
            >
              Bắt đầu miễn phí
            </Link>
          </div>

          <button
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
            className="grid size-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--text-primary)] lg:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            {isMenuOpen ? (
              <XIcon aria-hidden="true" size={21} weight="bold" />
            ) : (
              <ListIcon aria-hidden="true" size={23} weight="bold" />
            )}
          </button>
        </nav>

        {isMenuOpen && (
          <div
            className="border-t border-[var(--border)] bg-[var(--page)] px-5 py-5 lg:hidden"
            id="mobile-navigation"
          >
            <div className="mx-auto grid max-w-7xl gap-2">
              {[
                ['Tính năng', '#tinh-nang'],
                ['Cách hoạt động', '#cach-hoat-dong'],
                ['Bảo mật', '#bao-mat'],
              ].map(([label, href]) => (
                <a
                  className="rounded-xl px-3 py-3 font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]"
                  href={href}
                  key={href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link
                  className="rounded-xl border border-[var(--border-strong)] px-4 py-3 text-center text-sm font-bold"
                  onClick={() => setIsMenuOpen(false)}
                  to="/login"
                >
                  Đăng nhập
                </Link>
                <Link
                  className="rounded-xl bg-[var(--primary)] px-4 py-3 text-center text-sm font-bold text-[var(--primary-contrast)]"
                  onClick={() => setIsMenuOpen(false)}
                  to="/register"
                >
                  Bắt đầu miễn phí
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative">
          <div className="mx-auto grid min-h-[calc(100dvh-72px)] max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
            <motion.div
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              initial={reduceMotion ? undefined : { opacity: 0, y: 22 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-7 flex w-fit items-center gap-2 text-sm font-bold text-[var(--primary)]">
                <SparkleIcon aria-hidden="true" size={18} weight="fill" />
                Phân tích bán hàng cho shop online
              </div>
              <h1 className="max-w-[13ch] text-5xl font-extrabold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-[4.35rem]">
                Hiểu dữ liệu. Tăng doanh thu.
              </h1>
              <p className="mt-6 max-w-[52ch] text-lg leading-8 text-[var(--text-muted)]">
                Biến file bán hàng thành dashboard, dự báo và khuyến nghị rõ
                ràng chỉ trong vài phút.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-6 py-3.5 text-sm font-bold text-[var(--primary-contrast)] shadow-[0_14px_36px_color-mix(in_srgb,var(--primary)_22%,transparent)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
                  to="/register"
                >
                  Bắt đầu miễn phí
                  <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
                </Link>
                <a
                  className="flex items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-3.5 text-sm font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-[0.98]"
                  href="#cach-hoat-dong"
                >
                  Xem cách hoạt động
                </a>
              </div>
            </motion.div>

            <motion.figure
              animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
              className="relative lg:ml-5"
              initial={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
              transition={{
                duration: 0.85,
                delay: 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-[var(--primary-soft)] blur-2xl" />
              <img
                alt="Báo cáo bán hàng với biểu đồ tăng trưởng được trực quan hóa"
                className="aspect-[3/2] w-full rounded-2xl object-cover shadow-[0_30px_90px_color-mix(in_srgb,var(--primary)_18%,transparent)]"
                fetchPriority="high"
                height="1024"
                src="/images/marketlens-hero.webp"
                width="1536"
              />
              <figcaption className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
                Từ dữ liệu rời rạc đến một góc nhìn kinh doanh thống nhất.
              </figcaption>
            </motion.figure>
          </div>
        </section>

        <section
          aria-label="Đối tượng sử dụng"
          className="border-y border-[var(--border)] bg-[var(--surface)]"
        >
          <div className="mx-auto grid max-w-7xl gap-5 px-5 py-7 sm:px-8 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-12">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Xây cho người trực tiếp vận hành bán hàng
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
              {audiences.map((audience) => (
                <div
                  className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]"
                  key={audience}
                >
                  <CheckCircleIcon
                    aria-hidden="true"
                    className="shrink-0 text-[var(--primary)]"
                    size={17}
                    weight="fill"
                  />
                  {audience}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32"
          id="cach-hoat-dong"
        >
          <motion.div className="mx-auto max-w-7xl" {...reveal}>
            <div className="max-w-2xl">
              <h2 className="text-4xl font-extrabold leading-tight tracking-[-0.045em] sm:text-5xl">
                Một file. Ba chuyển động rõ ràng.
              </h2>
              <p className="mt-5 max-w-[58ch] text-lg leading-8 text-[var(--text-muted)]">
                Không cần nối nhiều công cụ hoặc tự dựng công thức Excel phức
                tạp.
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
              <img
                alt="Dữ liệu bảng tính được sắp xếp thành các nhóm báo cáo rõ ràng"
                className="aspect-[8/5] w-full rounded-2xl object-cover shadow-[0_24px_70px_color-mix(in_srgb,var(--primary)_13%,transparent)]"
                height="1024"
                loading="lazy"
                src="/images/marketlens-workflow.webp"
                width="1536"
              />
              <ol className="grid gap-3">
                {workflow.map(({ description, icon: Icon, title }) => (
                  <li
                    className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--border-strong)]"
                    key={title}
                  >
                    <span className="grid size-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Icon aria-hidden="true" size={23} weight="duotone" />
                    </span>
                    <div>
                      <h3 className="font-extrabold">{title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        </section>

        <section
          className="scroll-mt-24 bg-[var(--surface-subtle)] px-5 py-24 sm:px-8 lg:py-32"
          id="tinh-nang"
        >
          <motion.div className="mx-auto max-w-7xl" {...reveal}>
            <div className="max-w-2xl">
              <h2 className="text-4xl font-extrabold leading-tight tracking-[-0.045em] sm:text-5xl">
                Đủ góc nhìn để ra quyết định.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">
                Số liệu được tính một lần ở backend và dùng thống nhất trên mọi
                màn hình.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
              <article className="rounded-2xl bg-[#102b61] p-7 text-blue-50 lg:col-span-7 lg:min-h-72">
                <ChartBarIcon
                  aria-hidden="true"
                  className="text-blue-200"
                  size={30}
                  weight="duotone"
                />
                <h3 className="mt-12 text-2xl font-extrabold tracking-[-0.03em]">
                  Dashboard thống nhất
                </h3>
                <p className="mt-3 max-w-[48ch] leading-7 text-blue-100/75">
                  Theo dõi doanh thu, đơn hàng, sản phẩm và khách hàng trong
                  cùng một khoảng thời gian.
                </p>
              </article>

              <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 lg:col-span-5">
                <UsersThreeIcon
                  aria-hidden="true"
                  className="text-[var(--primary)]"
                  size={30}
                  weight="duotone"
                />
                <h3 className="mt-12 text-2xl font-extrabold tracking-[-0.03em]">
                  Hiểu khách hàng
                </h3>
                <p className="mt-3 leading-7 text-[var(--text-muted)]">
                  Phân biệt khách mới, quay lại, VIP và nhóm tiềm năng để chăm
                  sóc đúng người.
                </p>
              </article>

              <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 lg:col-span-4">
                <TrendUpIcon
                  aria-hidden="true"
                  className="text-[var(--success)]"
                  size={30}
                  weight="duotone"
                />
                <h3 className="mt-10 text-xl font-extrabold">
                  Dự báo có giải thích
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  So sánh doanh thu thực tế và xu hướng dự kiến, kèm giới hạn
                  rõ ràng của dữ liệu.
                </p>
              </article>

              <article className="relative overflow-hidden rounded-2xl lg:col-span-8">
                <img
                  alt="Báo cáo kinh doanh cùng các khuyến nghị được chọn lọc"
                  className="absolute inset-0 size-full object-cover"
                  height="1024"
                  loading="lazy"
                  src="/images/marketlens-report.webp"
                  width="1536"
                />
                <div className="relative min-h-80 bg-gradient-to-r from-[#071a3b]/95 via-[#071a3b]/72 to-transparent p-7 text-white">
                  <BrainIcon
                    aria-hidden="true"
                    className="text-blue-200"
                    size={30}
                    weight="duotone"
                  />
                  <h3 className="mt-28 max-w-sm text-2xl font-extrabold tracking-[-0.03em]">
                    Báo cáo AI dựa trên số liệu đã tính
                  </h3>
                  <p className="mt-3 max-w-sm leading-7 text-blue-100/80">
                    AI diễn giải xu hướng và khuyến nghị. KPI gốc luôn do hệ
                    thống tính toán.
                  </p>
                </div>
              </article>
            </div>
          </motion.div>
        </section>

        <section
          className="scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32"
          id="bao-mat"
        >
          <motion.div
            className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center"
            {...reveal}
          >
            <div>
              <LockKeyIcon
                aria-hidden="true"
                className="text-[var(--primary)]"
                size={34}
                weight="duotone"
              />
              <h2 className="mt-6 text-4xl font-extrabold leading-tight tracking-[-0.045em] sm:text-5xl">
                Dữ liệu của shop chỉ thuộc về shop.
              </h2>
              <p className="mt-5 max-w-[58ch] text-lg leading-8 text-[var(--text-muted)]">
                Mỗi tài khoản có vùng dữ liệu riêng. Backend xác minh danh tính
                trước mọi thao tác.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: 'Không lưu mật khẩu',
                  text: 'Supabase Auth quản lý thông tin đăng nhập và session.',
                },
                {
                  title: 'Phân quyền theo tài khoản',
                  text: 'Row Level Security ngăn truy cập analysis của người khác.',
                },
                {
                  title: 'AI không nhận dữ liệu thô',
                  text: 'Chỉ aggregate đã loại bỏ định danh mới được gửi tới AI API.',
                },
                {
                  title: 'Secret chỉ ở backend',
                  text: 'Khóa server không xuất hiện trong bundle trình duyệt.',
                },
              ].map(({ text, title }) => (
                <article
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
                  key={title}
                >
                  <CheckCircleIcon
                    aria-hidden="true"
                    className="text-[var(--success)]"
                    size={22}
                    weight="fill"
                  />
                  <h3 className="mt-5 font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="px-5 pb-24 sm:px-8 lg:pb-32">
          <motion.div
            className="mx-auto grid max-w-7xl gap-8 rounded-2xl bg-[#102b61] px-7 py-12 text-white sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14 lg:py-14"
            {...reveal}
          >
            <div>
              <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                Bắt đầu với dữ liệu bạn đang có.
              </h2>
              <p className="mt-4 max-w-[54ch] leading-7 text-blue-100/78">
                Tạo tài khoản, tải file mẫu và kiểm tra toàn bộ luồng phân tích
                của MarketLens.
              </p>
            </div>
            <Link
              className="flex w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-blue-50 px-6 py-3.5 text-sm font-extrabold text-[#102b61] transition hover:bg-white active:scale-[0.98]"
              to="/register"
            >
              Bắt đầu miễn phí
              <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto_auto]">
          <div>
            <div className="flex items-center gap-2.5 font-extrabold tracking-[-0.03em]">
              <span className="grid size-8 place-items-center rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)]">
                <ChartLineUpIcon aria-hidden="true" size={18} weight="bold" />
              </span>
              MarketLens
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
              Phân tích dữ liệu bán hàng dành cho shop online và doanh nghiệp
              nhỏ.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-extrabold">Sản phẩm</h2>
            <div className="mt-4 grid gap-3 text-sm text-[var(--text-muted)]">
              <a href="#tinh-nang">Tính năng</a>
              <a href="#cach-hoat-dong">Cách hoạt động</a>
              <a href="/sample_sales_template.csv">File dữ liệu mẫu</a>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-extrabold">Tài khoản</h2>
            <div className="mt-4 grid gap-3 text-sm text-[var(--text-muted)]">
              <Link to="/login">Đăng nhập</Link>
              <Link to="/register">Đăng ký</Link>
              <Link to="/forgot-password">Quên mật khẩu</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border)]">
          <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-[var(--text-muted)] sm:px-8">
            © 2026 MarketLens. Dữ liệu rõ ràng, quyết định vững vàng.
          </p>
        </div>
      </footer>
    </div>
  )
}
