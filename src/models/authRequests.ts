import { z } from 'zod'

export interface SignUpModel {
  email: string
  username: string
  password: string
}

export const signUpValidationSchema = z.object({
  email: z.string().email('Required valid email'),
  username: z
    .string()
    .min(2, 'Required length between 2 and 32')
    .max(32, 'Required length between 2 and 32'),
  password: z
    .string()
    .min(6, 'Required length between 6 and 32')
    .max(32, 'Required length between 6 and 32')
})

export interface LoginModel {
  login: string
  password: string
}

export const loginValidationSchema = z.object({
  login: z
    .string()
    .min(2, 'Required length between 2 and 32')
    .max(32, 'Required length between 2 and 32'),
  password: z
    .string()
    .min(6, 'Required length between 6 and 32')
    .max(32, 'Required length between 6 and 32')
})

export const tokenResponseSchema = z.object({
  token: z.string()
})
