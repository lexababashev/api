import { test, beforeEach, afterEach, expect, jest, spyOn } from 'bun:test'
import UserService, { UserDTO } from './userService'
import {
  AppError,
  ErrorType,
  Failure,
  Success,
  success
} from '../utils/types/results'
import UserRepo, { UserEntity } from '../repos/userRepo'

beforeEach(() => {
  console.error = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('isUsernameEmailInUse must return `true` if the repository returns `true`', async () => {
  spyOn(UserRepo, 'isUserExist').mockResolvedValue(success(true))

  const result = await UserService.isUsernameEmailInUse(
    'alex',
    'alex@gmail.com'
  )
  expect(result.isSuccess).toBe(true)
  expect((result as Success<boolean>).value).toBe(true)
})

test('isUsernameEmailInUse must return `false` if the repository returns `false`', async () => {
  spyOn(UserRepo, 'isUserExist').mockResolvedValue(success(false))

  const result = await UserService.isUsernameEmailInUse(
    'alex',
    'alex@gmail.com'
  )
  expect(result.isSuccess).toBe(true)
  expect((result as Success<boolean>).value).toBe(false)
})

test('isUsernameEmailInUse must return failure in case of unexpected issues', async () => {
  spyOn(UserRepo, 'isUserExist').mockImplementation(async () => {
    throw new Error('DB connection error')
  })

  const result = await UserService.isUsernameEmailInUse(
    'alex',
    'alex@gmail.com'
  )
  expect(result.isFailure).toBe(true)

  const failedResult = result as Failure<AppError>
  expect(failedResult.error).toMatchObject({
    type: ErrorType.DatabaseError,
    message: 'DB connection error',
    code: 500
  })
})

test('addNewUser must return the id of the new user', async () => {
  spyOn(UserRepo, 'insertNewUser').mockResolvedValue(success('unique_id'))

  const result = await UserService.addNewUser(
    'alex',
    'alex@gmail.com',
    'hashed_password'
  )
  expect(result.isSuccess).toBe(true)
  expect((result as Success<string>).value).toBe('unique_id')
})

test('addNewUser must return failure in case of unexpected issues', async () => {
  spyOn(UserRepo, 'insertNewUser').mockImplementation(async () => {
    throw new Error('DB connection error')
  })

  const result = await UserService.addNewUser(
    'alex',
    'alex@gmail.com',
    'hashed_password'
  )
  expect(result.isFailure).toBe(true)

  const failedResult = result as Failure<AppError>
  expect(failedResult.error).toMatchObject({
    type: ErrorType.DatabaseError,
    message: 'DB connection error',
    code: 500
  })
})

const userEntityMock: UserEntity = {
  id: 'unique_id',
  username: 'alex',
  email: 'alex@gmail.com',
  passwordHash: 'hashed_password',
  createdAt: new Date('2024-01-01')
}

test('getCredentials must return UserDTO in case given email exists', async () => {
  spyOn(UserRepo, 'getCredentialsByEmail').mockResolvedValue(
    success(userEntityMock)
  )

  const result = await UserService.getCredentials('alex@gmail.com')
  expect(result.isSuccess).toBe(true)

  const userDTO = (result as Success<UserDTO>).value
  expect(userDTO).toMatchObject({
    id: 'unique_id',
    username: 'alex',
    email: 'alex@gmail.com',
    passwordHash: 'hashed_password'
  })
})

test('getCredentials must return UserDTO in case given username exists', async () => {
  spyOn(UserRepo, 'getCredentialsByUsername').mockResolvedValue(
    success(userEntityMock)
  )

  const result = await UserService.getCredentials('alex')
  expect(result.isSuccess).toBe(true)

  const userDTO = (result as Success<UserDTO>).value
  expect(userDTO).toMatchObject({
    id: 'unique_id',
    username: 'alex',
    email: 'alex@gmail.com',
    passwordHash: 'hashed_password'
  })
})
