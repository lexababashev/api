import { Hono } from 'hono'
import {
  ForgotPasswordReq,
  forgotPasswordValidationSchema,
  ResetPasswordReq,
  resetPasswordValidationSchema
} from '../models/passwordRequest'
import { reqValidator } from '../models/validators/validationMiddleware'
import { ForgotPasswordService } from '../services/ForgotPasswordService'
import { handleError } from '../utils/http/errorHandler'
import { AppError, ErrorType, Success } from '../utils/types/results'
import UserService from '../services/userService'

export const forgotPasswordRoutes = (app: Hono) => {
  app.post(
    '/forgot-password',
    reqValidator('json', forgotPasswordValidationSchema),
    async (c) => {
      const forgotPasswordData = c.get('validatedBody') as ForgotPasswordReq
      const email = forgotPasswordData.email
      const isEmailExistResult = await ForgotPasswordService.isEmailExist(email)

      if (isEmailExistResult.isFailure) {
        handleError(isEmailExistResult.error)
      }
      const isEmailExist = (isEmailExistResult as Success<boolean>).value

      if (!isEmailExist) {
        return c.json(
          { message: 'If email exists, you will receive a code.' },
          200
        )
      }

      const sendCodeResult = await ForgotPasswordService.sendCode(email)

      if (sendCodeResult.isFailure) {
        handleError(sendCodeResult.error)
      }

      return c.json(
        { message: 'If email exists, you will receive a code.' },
        200
      )
    }
  )

  app.get('/reset-password', async (c) => {
    const code = c.req.query('code')
    if (!code) {
      handleError(new AppError(ErrorType.BadRequest, 'Invalid code', 400))
    }

    const isCodeValidResult = await ForgotPasswordService.isCodeValid(
      code as string
    )
    if (isCodeValidResult.isFailure) {
      handleError(isCodeValidResult.error)
    }
    return c.json(
      { message: 'Code is valid/ redirecting to reset password page' },
      200
    )
  })

  app.post(
    '/reset-password',
    reqValidator('json', resetPasswordValidationSchema),
    async (c) => {
      const code = c.req.query('code')
      if (!code) {
        handleError(new AppError(ErrorType.BadRequest, 'Invalid code', 400))
      }

      const resetPasswordData = c.get('validatedBody') as ResetPasswordReq
      const password = resetPasswordData.password

      const resetPasswordResult = await ForgotPasswordService.resetPassword(
        code as string,
        password
      )
      if (resetPasswordResult.isSuccess) {
        const userInfo = resetPasswordResult.value
        const token = UserService.generateJWT(
          userInfo.id,
          userInfo.username,
          userInfo.email
        )
        return c.json({ token: token }, 201)
      } else {
        handleError(resetPasswordResult.error)
      }
    }
  )
}
