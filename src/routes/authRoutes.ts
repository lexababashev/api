import { Hono } from 'hono'
import { reqValidator } from '../models/validators/validationMiddleware'
import {
  LoginModel,
  SignUpModel,
  loginValidationSchema,
  signUpValidationSchema,
  tokenResponseSchema
} from '../models/authRequests'
import UserService from '../services/userService'
import { jwt as jwtHono } from 'hono/jwt'
import { handleError } from '../utils/http/errorHandler'
import { AppError, ErrorType } from '../utils/types/results'
import { registry } from '../openAPI'
import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { errorResponseSchema } from '../models/commonModels'

const jwtMiddleware = jwtHono({ secret: String(process.env.JWT_SECRET) })

extendZodWithOpenApi(z)

registry.register('SignUpModel', signUpValidationSchema)
registry.register('LoginModel', loginValidationSchema)

registry.register('TokenResponse', tokenResponseSchema)
registry.register('ErrorResponse', errorResponseSchema)

registry.registerPath({
  method: 'post',
  path: '/signup',
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/SignUpModel'
          }
        }
      }
    }
  },
  responses: {
    201: {
      description: 'User successfully created',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              token: { type: 'string' }
            }
          }
        }
      }
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      }
    },
    409: {
      description: 'Username or email already exists',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      }
    }
  }
})

registry.registerPath({
  method: 'post',
  path: '/login',
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginValidationSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/TokenResponse'
          }
        }
      }
    },
    400: {
      description: 'Invalid credentials or validation error',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse'
          }
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse'
          }
        }
      }
    }
  }
})

registry.registerPath({
  method: 'get',
  path: '/me',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User profile retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              username: { type: 'string' },
              email: { type: 'string' },
              iss: { type: 'string' }
            }
          }
        }
      }
    },
    401: {
      description: 'Unauthorized - Invalid or missing token',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      }
    }
  }
})

registry.registerPath({
  method: 'post',
  path: '/logout',
  security: [{ bearerAuth: [] }],
  responses: {
    204: {
      description: 'Successfully logged out'
    },
    401: {
      description: 'Unauthorized - Invalid or missing token',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      }
    }
  }
})

export const signupRoute = (app: Hono) => {
  app.post(
    '/signup',
    reqValidator('json', signUpValidationSchema),
    async (c) => {
      const signUpData = c.get('validatedBody') as SignUpModel
      const isUserExistResult = await UserService.isUsernameEmailInUse(
        signUpData.username,
        signUpData.email
      )
      if (isUserExistResult.isSuccess) {
        const isUserExist = isUserExistResult.value
        if (isUserExist) {
          handleError(
            new AppError(
              ErrorType.Conflict,
              'The username or email is already in use',
              409
            )
          )
        } else {
          const addUserResult = await UserService.addNewUser(
            signUpData.username,
            signUpData.email,
            signUpData.password
          )
          if (addUserResult.isSuccess) {
            const userId = addUserResult.value
            const token = UserService.generateJWT(
              userId,
              signUpData.username,
              signUpData.email
            )
            return c.json({ token: token }, 201)
          } else {
            handleError(addUserResult.error)
          }
        }
      } else {
        handleError(isUserExistResult.error)
      }
    }
  )

  app.post('/login', reqValidator('json', loginValidationSchema), async (c) => {
    const loginReq = c.get('validatedBody') as LoginModel

    const queryResult = await UserService.getCredentials(loginReq.login)
    if (queryResult.isSuccess) {
      const isMatched = await UserService.comparePasswords(
        loginReq.password,
        queryResult.value.passwordHash
      )
      if (isMatched) {
        const token = UserService.generateJWT(
          queryResult.value.id,
          queryResult.value.username,
          queryResult.value.email
        )
        return c.json({ token: token }, 200)
      } else {
        handleError(
          new AppError(ErrorType.BadRequest, 'Invalid login or password', 400)
        )
      }
    } else {
      handleError(queryResult.error)
    }
  })

  app.get('/me', jwtMiddleware, async (c) => {
    const payload = c.get('jwtPayload')
    return c.json(payload)
  })

  app.post('/logout', jwtMiddleware, async (c) => {
    return c.body(null, 204)
  })
}
