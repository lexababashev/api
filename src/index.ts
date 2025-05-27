import { Hono } from 'hono'
import { signupRoute } from './routes/authRoutes'
import { utilRoutes } from './routes/utilRoutes'
import { eventRoutes } from './routes/eventsRoutes'
import { errorHandlingStrategy } from './utils/http/errorHandler'
import { forgotPasswordRoutes } from './routes/forgotPasswordRoutes'
import { cors } from 'hono/cors'

const app = new Hono()
app.onError(errorHandlingStrategy)

app.use(
  '/*',
  cors({
    origin: 'http://localhost:3000',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
)

signupRoute(app)
eventRoutes(app)
forgotPasswordRoutes(app)
utilRoutes(app)

const port = 8080

Bun.serve({
  port: port,
  fetch: app.fetch,
  maxRequestBodySize: 1000 * 1024 * 1024 // 1 GB
})

console.log(`Server is running on http://localhost:${port}`)
