import { Hono } from 'hono'
import { describe, it, expect } from 'bun:test'
import { utilRoutes } from './utilRoutes'

const app = new Hono()
utilRoutes(app)

describe('/ping test', () => {
  it('should return 200 and message "pong"', async () => {
    const res = await app.request('/ping')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('pong')
  })
})
