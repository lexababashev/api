import { jest, expect, spyOn, beforeEach, afterEach, test } from 'bun:test'
import PasswordService from '../services/ForgotPasswordService'
import { AppError, ErrorType, failure, success } from '../utils/types/results'
import { Hono } from 'hono'
import { errorHandlingStrategy } from '../utils/http/errorHandler'
import { forgotPasswordRoutes } from './forgotPasswordRoutes'

const app = new Hono()
app.onError(errorHandlingStrategy)
forgotPasswordRoutes(app)

beforeEach(() => {
  console.error = jest.fn()
  console.log = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('/forgot-password must return 200 if email exist', async () => {
  spyOn(PasswordService, 'isEmailExist').mockResolvedValue(success(true))
  spyOn(PasswordService, 'sendCode').mockResolvedValue(
    success('email sent to user with userId: 99vMKx8fBg')
  )

  const response = await app.request('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email: 'alex@gmail.com'
    })
  })

  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ message: expect.any(String) })
})

test('/forgot-password must return 200 if email does not exist, method sendCode should not been called', async () => {
  spyOn(PasswordService, 'isEmailExist').mockResolvedValue(success(false))
  const sendCodeSpy = spyOn(PasswordService, 'sendCode').mockResolvedValue(
    success('email sent to user with userId: 99vMKx8fBg')
  )

  const response = await app.request('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email: 'alex@gmail.com'
    })
  })

  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ message: expect.any(String) })

  expect(sendCodeSpy).not.toHaveBeenCalled()
})

test('/reset-password must return 200 if code is valid', async () => {
  spyOn(PasswordService, 'isCodeValid').mockResolvedValue(success(true))

  const response = await app.request('/reset-password?code=1234', {
    method: 'GET'
  })

  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ message: expect.any(String) })
})

test('/reset-password must fail if code is already used', async () => {
  spyOn(PasswordService, 'isCodeValid').mockResolvedValue(
    failure(
      new AppError(ErrorType.BadRequest, 'Code has already been used', 400)
    )
  )

  const response = await app.request('/reset-password?code=1234', {
    method: 'GET'
  })

  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({
    message: expect.any(String)
  })
})

test('POST /reset-password must return 201 and token when password changed', async () => {
  spyOn(PasswordService, 'resetPassword').mockResolvedValue(
    success({
      id: '99vMKx8fBg',
      username: 'alex',
      email: 'alex@gmail.com'
    })
  )

  const response = await app.request('/reset-password?code=1234', {
    method: 'POST',
    body: JSON.stringify({
      password: 'newPassword'
    })
  })

  expect(response.status).toBe(201)
  expect(await response.json()).toMatchObject({ token: expect.any(String) })
})

test('POST /reset-password must fail when password is not valid', async () => {
  const resetPassword = spyOn(
    PasswordService,
    'resetPassword'
  ).mockResolvedValue(
    success({
      id: '99vMKx8fBg',
      username: 'alex',
      email: 'alex@gmail.com'
    })
  )

  const response = await app.request('/reset-password?code=1234', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: 'n'
    })
  })

  expect(response.status).toBe(400)
  expect(resetPassword).not.toHaveBeenCalled()
  const responseBody = await response.json()
  expect(responseBody).toMatchObject({
    errors: {
      password: ['Required length between 6 and 32']
    }
  })
})

test('POST /reset-password must fail when user was not found in UserRepo.updateUserPassword', async () => {
  spyOn(PasswordService, 'resetPassword').mockResolvedValue(
    failure(new AppError(ErrorType.NotFound, 'user was not found', 404))
  )

  const response = await app.request('/reset-password?code=1234', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: '77777777'
    })
  })

  expect(response.status).toBe(404)
  const responseBody = await response.json()
  expect(responseBody).toMatchObject({
    message: expect.any(String)
  })
})
