import { test, afterEach, expect, jest, spyOn } from 'bun:test'
import { signupRoute } from './authRoutes'
import { Hono } from 'hono'
import UserService from '../services/userService'
import { success } from '../utils/types/results'
import { errorHandlingStrategy } from '../utils/http/errorHandler'
import UserRepo from '../repos/userRepo'

const app = new Hono()
app.onError(errorHandlingStrategy)
signupRoute(app)

afterEach(() => {
  jest.restoreAllMocks()
})

test('Positive `/signup` flow with the follow up `/me` and `/logout`', async () => {
  spyOn(UserService, 'isUsernameEmailInUse').mockResolvedValue(success(false))
  spyOn(UserService, 'addNewUser').mockResolvedValue(success('unique_id'))

  const signupResponse = await app.request('/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: 'new_user@gmail.com',
      username: 'new_user',
      password: 'password123'
    })
  })

  expect(signupResponse.status).toBe(201)
  const signupRespBody = await signupResponse.json()
  const token = signupRespBody.token

  const meResponse = await app.request('/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })

  expect(meResponse.status).toBe(200)
  const meResponseBody = await meResponse.json()

  expect(meResponseBody.username).toBe('new_user')
  expect(meResponseBody.email).toBe('new_user@gmail.com')
  expect(meResponseBody.iss).toBe('unique_id')

  const resLogout = await app.request('/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(resLogout.status).toBe(204)
})

test('`/signup` validation flow', async () => {
  const response = await app.request('/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: '',
      username: '',
      password: ''
    })
  })
  expect(response.status).toBe(400)
  const responseBody = await response.json()

  expect(responseBody).toEqual({
    errors: {
      email: ['Required valid email'],
      username: ['Required length between 2 and 32'],
      password: ['Required length between 6 and 32']
    }
  })
})

test('/signup with already existing credentials', async () => {
  spyOn(UserService, 'isUsernameEmailInUse').mockResolvedValue(success(true))

  const response = await app.request('/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123'
    })
  })

  expect(response.status).toBe(409)
  const responseBody = await response.json()
  expect(responseBody).toEqual({
    message: 'The username or email is already in use'
  })
})

const userEntityMock = {
  id: 'unique_id',
  email: 'new_user@gmail.com',
  username: 'new_user',
  passwordHash: '$2b$12$FAIxbpOwMFYjh2YrsL5aG.WMWYipyr6s76zTrJ0mbQh0w3i4bEha6',
  createdAt: new Date('2024-01-01')
}

test('Positive /login flow with username', async () => {
  spyOn(UserRepo, 'getCredentialsByUsername').mockResolvedValue(
    success(userEntityMock)
  )

  const loginResponse = await app.request('/login', {
    method: 'POST',
    body: JSON.stringify({ login: 'new_user', password: '111111' })
  })

  expect(loginResponse.status).toBe(200)
  const loginRespBody = await loginResponse.json()
  const token = loginRespBody.token

  const meResponse = await app.request('/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })

  expect(meResponse.status).toBe(200)
})

test('Positive /login flow with email', async () => {
  spyOn(UserRepo, 'getCredentialsByEmail').mockResolvedValue(
    success(userEntityMock)
  )

  const loginResponse = await app.request('/login', {
    method: 'POST',
    body: JSON.stringify({ login: 'new_user@gmail.com', password: '111111' })
  })

  expect(loginResponse.status).toBe(200)
  const loginRespBody = await loginResponse.json()
  const token = loginRespBody.token

  const meResponse = await app.request('/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })

  expect(meResponse.status).toBe(200)
})

test('`/login` flow when password does not match with email', async () => {
  spyOn(UserRepo, 'getCredentialsByEmail').mockResolvedValue(
    success(userEntityMock)
  )

  const loginResponse = await app.request('/login', {
    method: 'POST',
    body: JSON.stringify({ login: 'new_user@gmail.com', password: '222222' })
  })

  expect(loginResponse.status).toBe(400)
  const loginRespBody = await loginResponse.json()
  expect(loginRespBody).toEqual({ message: 'Invalid login or password' })
})

test('`/login` flow when password does not match with username', async () => {
  spyOn(UserRepo, 'getCredentialsByUsername').mockResolvedValue(
    success(userEntityMock)
  )

  const loginResponse = await app.request('/login', {
    method: 'POST',
    body: JSON.stringify({ login: 'new_user', password: '222222' })
  })

  expect(loginResponse.status).toBe(400)
  const loginRespBody = await loginResponse.json()
  expect(loginRespBody).toEqual({ message: 'Invalid login or password' })
})

test('`/login` validation flow', async () => {
  const loginResponse = await app.request('/login', {
    method: 'POST',
    body: JSON.stringify({ login: '', password: '' })
  })
  expect(loginResponse.status).toBe(400)
  const loginRespBody = await loginResponse.json()

  expect(loginRespBody).toEqual({
    errors: {
      login: ['Required length between 2 and 32'],
      password: ['Required length between 6 and 32']
    }
  })
})
