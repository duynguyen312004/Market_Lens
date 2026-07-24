import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Nhập email của bạn.')
  .email('Email chưa đúng định dạng.')
  .max(254, 'Email quá dài.')

export const strongPasswordSchema = z
  .string()
  .min(8, 'Mật khẩu cần ít nhất 8 ký tự.')
  .max(72, 'Mật khẩu không được quá 72 ký tự.')
  .regex(/[a-z]/, 'Mật khẩu cần ít nhất một chữ thường.')
  .regex(/[A-Z]/, 'Mật khẩu cần ít nhất một chữ hoa.')
  .regex(/[0-9]/, 'Mật khẩu cần ít nhất một chữ số.')
  .regex(/^\S+$/, 'Mật khẩu không được chứa khoảng trắng.')

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Nhập mật khẩu.')
    .max(72, 'Mật khẩu không được quá 72 ký tự.'),
})

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Tên hiển thị cần ít nhất 2 ký tự.')
      .max(50, 'Tên hiển thị không được quá 50 ký tự.')
      .regex(
        /^[\p{L}\p{M}\s.'-]+$/u,
        'Tên hiển thị chỉ nên chứa chữ cái và dấu câu cơ bản.',
      ),
    email: emailSchema,
    password: strongPasswordSchema,
    passwordConfirmation: z.string().min(1, 'Nhập lại mật khẩu.'),
    acceptTerms: z.boolean().refine((accepted) => accepted, {
      message: 'Bạn cần xác nhận quyền sử dụng dữ liệu.',
    }),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Mật khẩu nhập lại chưa khớp.',
    path: ['passwordConfirmation'],
  })

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    passwordConfirmation: z.string().min(1, 'Nhập lại mật khẩu.'),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Mật khẩu nhập lại chưa khớp.',
    path: ['passwordConfirmation'],
  })

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Tên hiển thị cần ít nhất 2 ký tự.')
  .max(50, 'Tên hiển thị không được quá 50 ký tự.')
  .regex(
    /^[\p{L}\p{M}\s.'-]+$/u,
    'Tên hiển thị chỉ nên chứa chữ cái và dấu câu cơ bản.',
  )

export const profileSchema = z.object({
  displayName: displayNameSchema,
})

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Nhập mật khẩu hiện tại.')
      .max(72, 'Mật khẩu không được quá 72 ký tự.'),
    password: strongPasswordSchema,
    passwordConfirmation: z.string().min(1, 'Nhập lại mật khẩu mới.'),
  })
  .refine((values) => values.password !== values.currentPassword, {
    message: 'Mật khẩu mới cần khác mật khẩu hiện tại.',
    path: ['password'],
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Mật khẩu nhập lại chưa khớp.',
    path: ['passwordConfirmation'],
  })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
export type ProfileValues = z.infer<typeof profileSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
