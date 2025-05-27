import {
  Result,
  ErrorType,
  success,
  failure,
  AppError
} from '../../src/utils/types/results'
import UserRepo from '../repos/userRepo'
import bcrypt from 'bcryptjs'
import jwtLib from 'jsonwebtoken'

export interface UserDTO {
  id: string
  username: string
  email: string
  passwordHash: string
}

const isEmail = (login: string): boolean =>
  /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(login)

const trimAndLowerCase = (str: string): string => str.trim().toLowerCase()

export const UserService = {
  async isUsernameEmailInUse(
    username: string,
    email: string
  ): Promise<Result<AppError, boolean>> {
    try {
      const cleanUsername = trimAndLowerCase(username)
      const cleanEmail = trimAndLowerCase(email)
      const result = await UserRepo.isUserExist(cleanUsername, cleanEmail)
      return result
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },
  async addNewUser(
    username: string,
    email: string,
    password: string
  ): Promise<Result<AppError, string>> {
    try {
      const cleanUsername = trimAndLowerCase(username)
      const cleanEmail = trimAndLowerCase(email)
      const passwordHash = await bcrypt.hash(password, 12)
      const result = await UserRepo.insertNewUser(
        cleanUsername,
        cleanEmail,
        passwordHash
      )
      return result
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },
  /**
   *
   * @param login — username or email that user provides during login
   * @returns Promise<Result<AppError, UserDTO>>
   */
  async getCredentials(login: string): Promise<Result<AppError, UserDTO>> {
    try {
      const result = isEmail(login)
        ? await UserRepo.getCredentialsByEmail(login)
        : await UserRepo.getCredentialsByUsername(login)
      if (result.isSuccess) {
        const userEntity = result.value
        const { id, username, email, passwordHash } = userEntity
        const userDTO: UserDTO = { id, username, email, passwordHash }
        return success(userDTO)
      } else {
        return failure(result.error)
      }
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },
  generateJWT(userId: string, username: string, email: string): string {
    return jwtLib.sign(
      { username: username, email: email },
      String(process.env.JWT_SECRET),
      { issuer: userId, expiresIn: process.env.JWT_EXP }
    )
  },
  async comparePasswords(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    const isMatched = await bcrypt.compare(password, hashedPassword)
    return isMatched
  }
}

export default UserService
