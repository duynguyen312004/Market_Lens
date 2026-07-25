import { z } from 'zod'

import {
  translate,
  type Language,
} from '../i18n/LanguageContext'

export function createEmailSchema(language: Language) {
  return z
    .string()
    .trim()
    .min(1, translate(language, 'validation.emailRequired'))
    .email(translate(language, 'validation.emailInvalid'))
    .max(254, translate(language, 'validation.emailTooLong'))
}

export function createStrongPasswordSchema(language: Language) {
  return z
    .string()
    .min(8, translate(language, 'validation.passwordMin'))
    .max(72, translate(language, 'validation.passwordMax'))
    .regex(/[a-z]/, translate(language, 'validation.passwordLowercase'))
    .regex(/[A-Z]/, translate(language, 'validation.passwordUppercase'))
    .regex(/[0-9]/, translate(language, 'validation.passwordNumber'))
    .regex(/^\S+$/, translate(language, 'validation.passwordNoSpaces'))
}

export function createDisplayNameSchema(language: Language) {
  return z
    .string()
    .trim()
    .min(2, translate(language, 'validation.displayNameMin'))
    .max(50, translate(language, 'validation.displayNameMax'))
    .regex(
      /^[\p{L}\p{M}\s.'-]+$/u,
      translate(language, 'validation.displayNameCharacters'),
    )
}

export function createLoginSchema(language: Language) {
  return z.object({
    email: createEmailSchema(language),
    password: z
      .string()
      .min(1, translate(language, 'validation.passwordRequired'))
      .max(72, translate(language, 'validation.passwordMax')),
  })
}

export function createRegisterSchema(language: Language) {
  return z
    .object({
      displayName: createDisplayNameSchema(language),
      email: createEmailSchema(language),
      password: createStrongPasswordSchema(language),
      passwordConfirmation: z
        .string()
        .min(1, translate(language, 'validation.confirmPassword')),
      acceptTerms: z.boolean().refine((accepted) => accepted, {
        message: translate(language, 'validation.authorizedData'),
      }),
    })
    .refine((values) => values.password === values.passwordConfirmation, {
      message: translate(language, 'validation.passwordMismatch'),
      path: ['passwordConfirmation'],
    })
}

export function createForgotPasswordSchema(language: Language) {
  return z.object({ email: createEmailSchema(language) })
}

export function createResetPasswordSchema(language: Language) {
  return z
    .object({
      password: createStrongPasswordSchema(language),
      passwordConfirmation: z
        .string()
        .min(1, translate(language, 'validation.confirmPassword')),
    })
    .refine((values) => values.password === values.passwordConfirmation, {
      message: translate(language, 'validation.passwordMismatch'),
      path: ['passwordConfirmation'],
    })
}

export function createProfileSchema(language: Language) {
  return z.object({ displayName: createDisplayNameSchema(language) })
}

export function createChangePasswordSchema(language: Language) {
  return z
    .object({
      currentPassword: z
        .string()
        .min(1, translate(language, 'validation.currentPassword'))
        .max(72, translate(language, 'validation.passwordMax')),
      password: createStrongPasswordSchema(language),
      passwordConfirmation: z
        .string()
        .min(1, translate(language, 'validation.confirmNewPassword')),
    })
    .refine((values) => values.password !== values.currentPassword, {
      message: translate(language, 'auth.errorSamePassword'),
      path: ['password'],
    })
    .refine((values) => values.password === values.passwordConfirmation, {
      message: translate(language, 'validation.passwordMismatch'),
      path: ['passwordConfirmation'],
    })
}

// English defaults keep the public module contract stable for existing callers.
export const emailSchema = createEmailSchema('en')
export const strongPasswordSchema = createStrongPasswordSchema('en')
export const loginSchema = createLoginSchema('en')
export const registerSchema = createRegisterSchema('en')
export const forgotPasswordSchema = createForgotPasswordSchema('en')
export const resetPasswordSchema = createResetPasswordSchema('en')
export const profileSchema = createProfileSchema('en')
export const changePasswordSchema = createChangePasswordSchema('en')

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
export type ProfileValues = z.infer<typeof profileSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
