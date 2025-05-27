import { Context, Next, ValidationTargets } from 'hono'
import { MiddlewareHandler } from 'hono'
import { z } from 'zod'

type AccumulatedErrors = Record<string, string[]>

declare module 'hono' {
  interface ContextVariableMap {
    validatedBody: unknown
  }
}

export const reqValidator = (
  target: keyof ValidationTargets,
  schema: z.ZodType<unknown, z.ZodTypeDef>
): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    try {
      let data
      switch (target) {
        case 'json':
          data = await c.req.json()
          break
        case 'form':
          data = await c.req.parseBody()
          break
        case 'query':
          data = c.req.query()
          break
        default:
          throw new Error('Unsupported validation target')
      }

      await schema.parseAsync(data)
      c.set('validatedBody', data)
      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const accumulatedErrors: AccumulatedErrors = {}

        error.errors.forEach((err: z.ZodIssue) => {
          if (err.path) {
            if (!accumulatedErrors[err.path[0]]) {
              accumulatedErrors[err.path[0]] = []
            }
            accumulatedErrors[err.path[0]].push(err.message)
          }
        })

        return c.json({ errors: accumulatedErrors }, 400)
      }

      return c.json({ message: 'An unexpected error occurred' }, 500)
    }
  }
}
