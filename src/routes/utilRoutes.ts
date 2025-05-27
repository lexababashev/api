import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { generateOpenApiJson } from '../openAPI'

export const utilRoutes = (app: Hono) => {
  app.get('/ping', async (c) => {
    return c.json({ message: 'pong' }, 200)
  })

  app.get('/swagger.json', (c) => c.json(generateOpenApiJson()))
  app.get('/swagger', swaggerUI({ url: '/swagger.json' }))
}
