import {
  Result,
  ErrorType,
  success,
  failure,
  AppError
} from '../utils/types/results'
import { ForgotPasswordRepo } from '../repos/ForgotPasswordRepo'
import UserRepo from '../repos/userRepo'
import { brevoClient } from '../utils/email/brevoClient'
import UserService from './userService'
import bcrypt from 'bcryptjs'

export interface UserInfoDTO {
  id: string
  username: string
  email: string
}

const trimAndLowerCase = (str: string): string => str.trim().toLowerCase()

const generateCode = (length = 6): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const charsLength = chars.length
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * charsLength)]
  ).join('')
}

const millisecondsToDate = (milliseconds: number): string => {
  const date = new Date(milliseconds)
  return date.toISOString().replace('T', ' ').slice(0, 23)
}

export const ForgotPasswordService = {
  async isEmailExist(email: string): Promise<Result<AppError, boolean>> {
    try {
      const cleanEmail = trimAndLowerCase(email)
      const result = await UserRepo.isUserExistByEmail(cleanEmail)
      if (result.isFailure) {
        return failure(result.error)
      }
      return result
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async sendCode(email: string): Promise<Result<AppError, string>> {
    try {
      const code = generateCode()
      const cleanEmail = trimAndLowerCase(email)
      const getUserByEmailResult = await UserService.getCredentials(cleanEmail)

      if (getUserByEmailResult.isFailure) {
        return failure(getUserByEmailResult.error)
      }

      const userId = getUserByEmailResult.value.id

      const insertCodeResult = await ForgotPasswordRepo.insertCode(userId, code)
      if (insertCodeResult.isFailure) {
        return failure(insertCodeResult.error)
      }

      const response = await brevoClient.sendEmail(cleanEmail, 2, {
        code: code
      })

      if (response.status === 201) {
        const responseJson = await response.json()
        console.log(`email sent to ${email}: \n`, responseJson)
        return success('email sent to user with userId: ' + userId)
      } else {
        console.error('Brevo API error:', response.status, response.statusText)
        console.error('email not sent', response)
        return failure(
          new AppError(ErrorType.InternalServerError, 'email not sent', 500)
        )
      }
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },
  async isCodeValid(code: string): Promise<Result<AppError, boolean>> {
    try {
      const getCodeResult = await ForgotPasswordRepo.getCode(code)
      if (getCodeResult.isFailure) {
        return failure(getCodeResult.error)
      }
      const codeEntity = getCodeResult.value

      if (codeEntity.usedAt !== null) {
        return failure(
          new AppError(ErrorType.BadRequest, 'Code has already been used', 400)
        )
      }

      if (codeEntity.createdAt.getTime() + 900000 < new Date().getTime()) {
        return failure(
          new AppError(ErrorType.BadRequest, 'Code has expired', 400)
        )
      }

      return success(true)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },
  async resetPassword(
    code: string,
    password: string
  ): Promise<Result<AppError, UserInfoDTO>> {
    try {
      const getCodeResult = await ForgotPasswordRepo.getCode(code)
      if (getCodeResult.isFailure) {
        return failure(getCodeResult.error)
      }

      const formattedUsedAtTime = millisecondsToDate(new Date().getTime())
      const updateUsedAtPropertyResult =
        await ForgotPasswordRepo.updateUsedAtProperty(code, formattedUsedAtTime)
      if (updateUsedAtPropertyResult.isFailure) {
        return failure(updateUsedAtPropertyResult.error)
      }

      const userId = getCodeResult.value.userId
      const passwordHash = await bcrypt.hash(password, 12)
      const updateUserPasswordResult = await UserRepo.updateUserPassword(
        userId,
        passwordHash
      )
      if (updateUserPasswordResult.isFailure) {
        return failure(updateUserPasswordResult.error)
      }

      const getUserByIdResult = await UserRepo.getUserById(userId)

      if (getUserByIdResult.isFailure) {
        return failure(getUserByIdResult.error)
      }

      const { id, email, username } = getUserByIdResult.value

      const userInfo: UserInfoDTO = { id, email, username }
      return success(userInfo)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  }
}

export default ForgotPasswordService
