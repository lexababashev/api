import { Context } from 'hono'
import { AppError } from '../types/results'
import { HTTPException } from 'hono/http-exception'
import { ContentfulStatusCode } from 'hono/utils/http-status'

export const handleError = (error: AppError) => {
  throw new HTTPException(error.code as ContentfulStatusCode, {
    message: error.message
  })
}

export const errorHandlingStrategy = (error: Error, c: Context) => {
  if (error instanceof HTTPException) {
    const { status, message } = error
    return c.json({ message: message }, status)
  }
  console.error('Unhandled Exception:', error)
  return c.json({ error: 'Internal Server Error' }, 500)
}
