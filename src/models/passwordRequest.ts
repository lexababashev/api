import { z } from 'zod'

export interface ForgotPasswordReq {
  email: string
}

export interface ResetPasswordReq {
  password: string
}

export const forgotPasswordValidationSchema = z.object({
  email: z.string().email('Required valid email')
})

export const resetPasswordValidationSchema = z.object({
  password: z
    .string()
    .min(6, 'Required length between 6 and 32')
    .max(32, 'Required length between 6 and 32')
})
