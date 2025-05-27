import { jest, expect, spyOn, beforeEach, afterEach, test } from 'bun:test'
import UserRepo from '../repos/userRepo'
import {
  AppError,
  ErrorType,
  Failure,
  Success,
  success
} from '../utils/types/results'
import { brevoClient } from '../utils/email/brevoClient'
import UserService from './userService'
import { ForgotPasswordRepo } from '../repos/ForgotPasswordRepo'
import PasswordService, { UserInfoDTO } from './ForgotPasswordService'

beforeEach(() => {
  console.error = jest.fn()
  console.log = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('isEmailExist must return true if email exists', async () => {
  spyOn(UserRepo, 'isUserExistByEmail').mockResolvedValue(success(true))

  const result = await PasswordService.isEmailExist('alex@gmail.com')
  expect(result.isSuccess).toBe(true)
  expect((result as Success<boolean>).value).toBe(true)
})

test('isEmailExist must return false if email does not exist', async () => {
  spyOn(UserRepo, 'isUserExistByEmail').mockResolvedValue(success(false))

  const result = await PasswordService.isEmailExist('alex@gmail.com')
  expect(result.isSuccess).toBe(true)
  expect((result as Success<boolean>).value).toBe(false)
})

test('isEmailExist must return failure in case of unexpected issues', async () => {
  spyOn(UserRepo, 'isUserExistByEmail').mockImplementation(async () => {
    throw new Error('DB connection error')
  })

  const result = await PasswordService.isEmailExist('alex@gmail.com')
  expect(result.isFailure).toBe(true)
  expect((result as Failure<AppError>).error).toMatchObject({
    type: ErrorType.DatabaseError,
    message: expect.any(String),
    code: 500
  })
})

const UserDTOMock = {
  id: 'user_id',
  username: 'username',
  email: 'user@gmail.com',
  passwordHash: 'passwordHash'
}

const mockResponse = new Response(JSON.stringify({ message: 'email sent' }), {
  status: 201,
  headers: { 'Content-Type': 'application/json' }
})

test('sendCode must return success if code is sent successfully', async () => {
  spyOn(UserService, 'getCredentials').mockResolvedValue(success(UserDTOMock))

  spyOn(ForgotPasswordRepo, 'insertCode').mockResolvedValue(success('code'))

  spyOn(brevoClient, 'sendEmail').mockResolvedValue(mockResponse)

  const result = await PasswordService.sendCode('alex@gmail.com')
  expect(result.isSuccess).toBe(true)
  expect((result as Success<string>).value).toBeString()
})

const mockFailedResponse = new Response(
  JSON.stringify({ message: 'email not sent' }),
  {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  }
)

test('sendCode must fail if code was not sent', async () => {
  spyOn(UserService, 'getCredentials').mockResolvedValue(success(UserDTOMock))

  spyOn(ForgotPasswordRepo, 'insertCode').mockResolvedValue(success('code'))

  spyOn(brevoClient, 'sendEmail').mockResolvedValue(mockFailedResponse)

  const result = await PasswordService.sendCode('alex@gmail.com')

  expect(result.isSuccess).toBe(false)
  const failedResult = result as Failure<AppError>
  expect(failedResult.error).toMatchObject({
    type: ErrorType.InternalServerError,
    message: expect.any(String),
    code: 500
  })
})

const mockCodeEntity = {
  id: 'code_id',
  userId: 'user_id',
  code: 'code',
  usedAt: null,
  createdAt: new Date()
}

test('isCodeValid must return true if code is valid', async () => {
  spyOn(ForgotPasswordRepo, 'getCode').mockResolvedValue(
    success(mockCodeEntity)
  )

  const result = await PasswordService.isCodeValid('code')
  expect(result.isSuccess).toBe(true)
  expect((result as Success<boolean>).value).toBe(true)
})

const mockFaileTimeCodeEntity = {
  id: 'code_id',
  userId: 'user_id',
  code: 'code',
  usedAt: null,
  createdAt: new Date(new Date().getTime() - 16 * 60 * 1000)
}

test('isCodeValid must return true if code is valid', async () => {
  spyOn(ForgotPasswordRepo, 'getCode').mockResolvedValue(
    success(mockFaileTimeCodeEntity)
  )

  const result = await PasswordService.isCodeValid('code')
  expect(result.isSuccess).toBe(false)
  expect((result as Failure<AppError>).error).toMatchObject({
    type: ErrorType.BadRequest,
    message: expect.any(String),
    code: 400
  })
})

const mockUserEntity = {
  id: 'user_id',
  username: 'alex',
  email: 'alex@gmail.com',
  passwordHash: 'passwordHash',
  createdAt: new Date()
}

test('resetPassword must return userInfoDTO if password is reset successfully', async () => {
  spyOn(ForgotPasswordRepo, 'getCode').mockResolvedValue(
    success(mockCodeEntity)
  )

  spyOn(ForgotPasswordRepo, 'updateUsedAtProperty').mockResolvedValue(
    success('code')
  )

  spyOn(UserRepo, 'updateUserPassword').mockResolvedValue(success('code'))

  spyOn(UserRepo, 'getUserById').mockResolvedValue(success(mockUserEntity))

  const result = await PasswordService.resetPassword('code', 'newPassword')
  expect(result.isSuccess).toBe(true)
  expect((result as Success<UserInfoDTO>).value).toMatchObject({
    id: 'user_id',
    username: 'alex',
    email: 'alex@gmail.com'
  })
})
