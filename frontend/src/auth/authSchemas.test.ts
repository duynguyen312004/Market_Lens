import { describe, expect, it } from 'vitest'

import {
  changePasswordSchema,
  createRegisterSchema,
  emailSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  strongPasswordSchema,
} from './authSchemas'

describe('emailSchema', () => {
  it('accepts and trims a valid email', () => {
    expect(emailSchema.parse('  shop@example.com  ')).toBe('shop@example.com')
  })

  it('rejects malformed email addresses', () => {
    expect(emailSchema.safeParse('shop@').success).toBe(false)
    expect(emailSchema.safeParse('').success).toBe(false)
  })
})

describe('strongPasswordSchema', () => {
  it('accepts a password with all required character groups', () => {
    expect(strongPasswordSchema.safeParse('Market123').success).toBe(true)
  })

  it('rejects weak passwords and whitespace', () => {
    expect(strongPasswordSchema.safeParse('marketlens').success).toBe(false)
    expect(strongPasswordSchema.safeParse('Market Lens1').success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('does not impose new signup rules on an existing password', () => {
    expect(
      loginSchema.safeParse({
        email: 'shop@example.com',
        password: 'existing-password',
      }).success,
    ).toBe(true)
  })
})

describe('registerSchema', () => {
  const validRegistration = {
    displayName: 'Nguyễn Minh Anh',
    email: 'shop@example.com',
    password: 'Market123',
    passwordConfirmation: 'Market123',
    acceptTerms: true,
  }

  it('accepts Vietnamese display names and a complete registration', () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true)
  })

  it('rejects mismatched password confirmation', () => {
    expect(
      registerSchema.safeParse({
        ...validRegistration,
        passwordConfirmation: 'Market456',
      }).success,
    ).toBe(false)
  })

  it('requires the data-use confirmation', () => {
    expect(
      registerSchema.safeParse({
        ...validRegistration,
        acceptTerms: false,
      }).success,
    ).toBe(false)
  })

  it('rejects display names containing digits', () => {
    expect(
      registerSchema.safeParse({
        ...validRegistration,
        displayName: 'Shop 123',
      }).success,
    ).toBe(false)
  })

  it('returns Vietnamese validation messages for the Vietnamese schema', () => {
    const result = createRegisterSchema('vi').safeParse({
      ...validRegistration,
      email: 'khong-hop-le',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Vui lòng nhập địa chỉ email hợp lệ.',
      )
    }
  })
})

describe('resetPasswordSchema', () => {
  it('requires a strong matching password pair', () => {
    expect(
      resetPasswordSchema.safeParse({
        password: 'Market123',
        passwordConfirmation: 'Market123',
      }).success,
    ).toBe(true)

    expect(
      resetPasswordSchema.safeParse({
        password: 'Market123',
        passwordConfirmation: 'Market456',
      }).success,
    ).toBe(false)
  })
})

describe('profileSchema', () => {
  it('chấp nhận tên tiếng Việt và loại bỏ khoảng trắng ngoài', () => {
    expect(
      profileSchema.parse({ displayName: '  Nguyễn Minh Anh  ' }),
    ).toEqual({ displayName: 'Nguyễn Minh Anh' })
  })

  it('từ chối tên có chữ số hoặc quá ngắn', () => {
    expect(
      profileSchema.safeParse({ displayName: 'Shop 123' }).success,
    ).toBe(false)
    expect(profileSchema.safeParse({ displayName: 'A' }).success).toBe(false)
  })
})

describe('changePasswordSchema', () => {
  const validChange = {
    currentPassword: 'Current123',
    password: 'Market456',
    passwordConfirmation: 'Market456',
  }

  it('yêu cầu mật khẩu hiện tại và cặp mật khẩu mới hợp lệ', () => {
    expect(changePasswordSchema.safeParse(validChange).success).toBe(true)
    expect(
      changePasswordSchema.safeParse({
        ...validChange,
        currentPassword: '',
      }).success,
    ).toBe(false)
  })

  it('từ chối mật khẩu mới trùng mật khẩu hiện tại hoặc nhập lại sai', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'Market456',
        password: 'Market456',
        passwordConfirmation: 'Market456',
      }).success,
    ).toBe(false)
    expect(
      changePasswordSchema.safeParse({
        ...validChange,
        passwordConfirmation: 'Market789',
      }).success,
    ).toBe(false)
  })
})
