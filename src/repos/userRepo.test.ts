import { test, beforeEach, afterEach, expect, jest, spyOn } from 'bun:test'
import UserRepo, { UserEntity } from './userRepo'
import { AppError, ErrorType, Failure, Success } from '../utils/types/results'
import * as postgres from '../db/postgres/postgres'

beforeEach(() => {
  console.error = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('insertNewUser must fail for attempt to insert existing email', async () => {
  const queryResult = await UserRepo.insertNewUser(
    'unique',
    'alex@gmail.com',
    'passwordHash'
  )
  expect(queryResult.isFailure).toBe(true)

  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBe(
    'duplicate key value violates unique constraint "users_email_key"'
  )
  expect(failedResult.error.code).toBe(500)

  expect(console.error).toHaveBeenCalledWith(
    'duplicate key value violates unique constraint "users_email_key"'
  )
})

test('insertNewUser must fail for attempt to insert existing username', async () => {
  const queryResult = await UserRepo.insertNewUser(
    'alex',
    'unique@gmail.com',
    'passwordHash'
  )
  expect(queryResult.isFailure).toBe(true)

  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBe(
    'duplicate key value violates unique constraint "users_username_key"'
  )
  expect(failedResult.error.code).toBe(500)

  expect(console.error).toHaveBeenCalledWith(
    'duplicate key value violates unique constraint "users_username_key"'
  )
})

test('insertNewUser must fail when the insertion does not happen', async () => {
  spyOn(UserRepo, 'insertNewUser').mockResolvedValue(
    new Failure(
      new AppError(
        ErrorType.DatabaseError,
        'error during insertion of the new user',
        500
      )
    )
  )

  const queryResult = await UserRepo.insertNewUser(
    'unique',
    'unique@gmail.com',
    'passwordHash'
  )
  const failedResult = queryResult as Failure<AppError>

  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBe(
    'error during insertion of the new user'
  )
  expect(failedResult.error.code).toBe(500)
})

test('insertNewUser must be successful for unique user credentials', async () => {
  const uniqueUser = Math.random().toString(36).substring(2, 15)
  const queryResult = await UserRepo.insertNewUser(
    uniqueUser,
    `${uniqueUser}@gmail.com`,
    'passwordHash'
  )
  expect(queryResult.isSuccess).toBe(true)

  const successfulResult = queryResult as Success<string>
  expect(successfulResult.value).toHaveLength(10)
})

test('getCredentialsByUsername should return credentials for existing username', async () => {
  const queryResult = await UserRepo.getCredentialsByUsername('alex')
  expect(queryResult.isSuccess).toBe(true)
  const userEntity = queryResult as Success<UserEntity>

  expect(userEntity.value).toMatchObject({
    id: '99vMKx8fBg',
    username: 'alex',
    email: 'alex@gmail.com',
    passwordHash: expect.any(String)
  })
})

test('getCredentialsByUsername should return credentials for existing email', async () => {
  const queryResult = await UserRepo.getCredentialsByEmail('alex@gmail.com')
  expect(queryResult.isSuccess).toBe(true)
  const userEntity = queryResult as Success<UserEntity>

  expect(userEntity.value).toMatchObject({
    id: '99vMKx8fBg',
    username: 'alex',
    email: 'alex@gmail.com',
    passwordHash: expect.any(String)
  })
})

test('getCredentialsByUsername should return 404 for non-existing username', async () => {
  const queryResult = await UserRepo.getCredentialsByUsername('non_existing')
  expect(queryResult.isFailure).toBe(true)

  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.type).toBe(ErrorType.NotFound)
  expect(failedResult.error.message).toBe(`account was not found: non_existing`)
  expect(failedResult.error.code).toBe(404)
})

test('getCredentialsByEmail should return 404 for non-existing email', async () => {
  const queryResult = await UserRepo.getCredentialsByEmail(
    'non_existing@gmail.com'
  )
  expect(queryResult.isFailure).toBe(true)

  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.type).toBe(ErrorType.NotFound)
  expect(failedResult.error.message).toBe(
    `Account was not found: non_existing@gmail.com`
  )
  expect(failedResult.error.code).toBe(404)
})

test('getUserById should return userEntity for existing user id', async () => {
  const queryResult = await UserRepo.getUserById('99vMKx8fBg')

  expect(queryResult.isSuccess).toBe(true)
  expect((queryResult as Success<UserEntity>).value).toMatchObject({
    id: '99vMKx8fBg',
    username: 'alex',
    email: 'alex@gmail.com',
    passwordHash: expect.any(String),
    createdAt: expect.any(Date)
  })
})

test('imitate DB error while using UserRepo', async () => {
  spyOn(postgres, 'query').mockRejectedValue(new Error('DB connection error'))

  const queryResult = await UserRepo.isUserExist('alex', 'alex@gmail.com')
  expect(queryResult.isFailure).toBe(true)

  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBe('DB connection error')
  expect(failedResult.error.code).toBe(500)
})

test('updateUserPassword must return user id when password updated succesfully', async () => {
  const result = await UserRepo.updateUserPassword(
    '99vMKx8fBg',
    'newPasswordHash'
  )
  expect(result.isSuccess).toBe(true)
  const successfulResult = result as Success<string>
  expect(successfulResult.value).toBeString()
})

test('updateUserPassword must fail when user does not exist', async () => {
  const result = await UserRepo.updateUserPassword(
    'invalid_user_id',
    'newPasswordHash'
  )
  expect(result.isFailure).toBe(true)
  const failedResult = result as Failure<AppError>
  expect(failedResult.error.code).toBe(404)
  expect(failedResult.error.type).toBe(ErrorType.NotFound)
  expect(failedResult.error.message).toContain('User was not found')
})
