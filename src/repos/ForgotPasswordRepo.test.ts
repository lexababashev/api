import { beforeEach, afterEach, expect, jest, spyOn, test } from 'bun:test'
import { ForgotPasswordRepo, CodeEntity } from './ForgotPasswordRepo'
import * as postgres from '../db/postgres/postgres'
import { AppError, ErrorType, Failure, Success } from '../utils/types/results'

beforeEach(() => {
  console.error = jest.fn()
  console.log = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

const userId = '99vMKx8fBg'
const code = 'test_code'

test('insertCode must successfully insert code and return it', async () => {
  const result = await ForgotPasswordRepo.insertCode(userId, code)

  expect(result.isSuccess).toBe(true)
  const successfulResult = result as Success<string>
  expect(successfulResult.value).toBe(code)
})

test('insertCode must fail when the insertion does not happen because of invalid user id', async () => {
  const result = await ForgotPasswordRepo.insertCode('invalid_user_id', code)

  expect(result.isFailure).toBe(true)
  const failedResult = result as Failure<AppError>
  expect(failedResult.error.code).toBe(500)
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBeString()
})

test('insertCode must fail when database error occurs', async () => {
  spyOn(postgres, 'query').mockRejectedValue(new Error('DB connection error'))
  const result = await ForgotPasswordRepo.insertCode(userId, code)

  expect(result.isFailure).toBe(true)
  const failedResult = result as Failure<AppError>
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.code).toBe(500)
  expect(failedResult.error.message).toBe('DB connection error')
})

test('getCode must successfully retrieve code entity', async () => {
  const result = await ForgotPasswordRepo.getCode(code)

  expect(result.isSuccess).toBe(true)
  const successfulResult = result as Success<CodeEntity>
  expect(successfulResult.value).toBeInstanceOf(CodeEntity)
})

test('getCode must fail when the code does not exist', async () => {
  const result = await ForgotPasswordRepo.getCode('invalid_code')

  expect(result.isFailure).toBe(true)
  const failedResult = result as Failure<AppError>
  expect(failedResult.error.code).toBe(404)
  expect(failedResult.error.type).toBe(ErrorType.NotFound)
  expect(failedResult.error.message).toBe('Code not found')
})

test('getCode must fail when database error occurs', async () => {
  spyOn(postgres, 'query').mockRejectedValue(new Error('DB connection error'))
  const result = await ForgotPasswordRepo.getCode(code)

  expect(result.isFailure).toBe(true)
  const failedResult = result as Failure<AppError>
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.code).toBe(500)
  expect(failedResult.error.message).toBe('DB connection error')
})

test('updateUsedAtProperty must successfully update used_at property', async () => {
  const result = await ForgotPasswordRepo.updateUsedAtProperty(
    code,
    '2000-01-01T00:00:00.000Z'
  )

  expect(result.isSuccess).toBe(true)
  const successfulResult = result as Success<string>
  expect(successfulResult.value).toBe(code)
})

test('updateUsedAtProperty must fail when the code does not exist', async () => {
  const result = await ForgotPasswordRepo.updateUsedAtProperty(
    'invalid_code',
    '2000-01-01T00:00:00.000Z'
  )

  expect(result.isFailure).toBe(true)
  const failedResult = result as Failure<AppError>
  expect(failedResult.error.code).toBe(404)
  expect(failedResult.error.type).toBe(ErrorType.NotFound)
  expect(failedResult.error.message).toBe('Code not found')
})

test('updateUsedAtProperty must fail when database error occurs', async () => {
  spyOn(postgres, 'query').mockRejectedValue(new Error('DB connection error'))
  const result = await ForgotPasswordRepo.updateUsedAtProperty(
    code,
    '2000-01-01T00:00:00.000Z'
  )
  expect(result.isFailure).toBe(true)
  const failedResult = result as Failure<AppError>
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.code).toBe(500)
  expect(failedResult.error.message).toBe('DB connection error')
})
